"""El cerebro de Byte: lleva la charla con el visitante y habla con Claude."""

import asyncio
import logging
import re
import time
from collections.abc import Callable
from dataclasses import dataclass
from typing import Literal

import anthropic
from anthropic.types.beta import BetaMessage, BetaMessageParam

from . import config, frases
from .personalidad import HERRAMIENTAS, SISTEMA
from .respaldo import normalizar
from .taller import Taller, Trabajo

log = logging.getLogger("byte.cerebro")

# Si Claude rechaza un pedido por seguridad, la API reintenta sola con otro modelo.
BETAS = ["server-side-fallback-2026-07-01"]

# Lo que Claude "ve" como resultado de crear_juego, según cómo va el juego.
RESULTADOS_JUEGO = {
    "generando": "Todavía lo estás programando; aparece en pantalla cuando esté listo.",
    "listo": "El juego está terminado y en pantalla. Se juega con flechas y Enter; Escape lo cierra.",
    "error": "La programación falló y el juego no se pudo terminar.",
    None: "No se empezó: ya estabas programando otro juego.",
}

# "juego", "jueguito", "jugar", "juguemos"...: para detectar pedidos de juego sin Claude.
PIDE_JUEGO = re.compile(r"\bjue?g")


@dataclass
class Respuesta:
    texto: str
    # Id del juego que se empezó a programar, si hay uno.
    juego_id: str | None = None
    descripcion_juego: str | None = None
    origen: Literal["claude", "respaldo"] = "claude"


class Conversacion:
    """
    Historial de la charla con un visitante. Solo se agregan mensajes al final:
    editar lo anterior invalidaría los bloques de thinking que devuelve el modelo.
    """

    def __init__(self) -> None:
        self.mensajes: list[BetaMessageParam] = []
        self.turnos = 0
        self.ultima_actividad = time.monotonic()
        # Llamadas a crear_juego que esperan su tool_result: (id de la llamada, id del juego).
        self._pendientes: list[tuple[str, str | None]] = []

    def vencida(self) -> bool:
        inactiva = time.monotonic() - self.ultima_actividad > config.CONVERSACION_INACTIVA_S
        return inactiva or self.turnos >= config.CONVERSACION_MAX_TURNOS

    def agregar_usuario(self, texto: str, resultado: Callable[[str | None], str]) -> None:
        contenido: list = [
            {"type": "tool_result", "tool_use_id": llamada, "content": resultado(juego_id)}
            for llamada, juego_id in self._pendientes
        ]
        contenido.append({"type": "text", "text": texto})
        self.mensajes.append({"role": "user", "content": contenido})

    def deshacer_usuario(self) -> None:
        """Saca el último mensaje del usuario cuando no hubo respuesta válida."""
        self.mensajes.pop()

    def agregar_asistente(self, mensaje: BetaMessage, pendientes: list[tuple[str, str | None]]) -> None:
        # Se guarda el contenido completo (thinking, tool_use, fallback) tal cual vino.
        self.mensajes.append({"role": "assistant", "content": mensaje.content})
        self._pendientes = pendientes
        self.turnos += 1
        self.ultima_actividad = time.monotonic()


class Cerebro:
    def __init__(self, cliente: anthropic.AsyncAnthropic, taller: Taller) -> None:
        self._cliente = cliente
        self._taller = taller
        self._conversacion = Conversacion()
        # Un solo stand, una sola charla a la vez.
        self._lock = asyncio.Lock()

    async def responder(self, texto: str) -> Respuesta:
        async with self._lock:
            if self._conversacion.vencida():
                log.info("Conversación nueva")
                self._conversacion = Conversacion()
            conversacion = self._conversacion

            conversacion.agregar_usuario(texto, self._resultado_juego)
            mensaje = await self._pedir(conversacion.mensajes)

            if mensaje is None:
                conversacion.deshacer_usuario()
                return self._responder_sin_claude(texto)
            if mensaje.stop_reason == "refusal":
                log.info("Pedido rechazado (%s)", mensaje.stop_details)
                conversacion.deshacer_usuario()
                return Respuesta(frases.una(frases.REDIRECCION))

            respuesta, pendientes = self._ejecutar_herramientas(mensaje)
            conversacion.agregar_asistente(mensaje, pendientes)
            return respuesta

    def _ejecutar_herramientas(self, mensaje: BetaMessage) -> tuple[Respuesta, list[tuple[str, str | None]]]:
        texto = " ".join(b.text.strip() for b in mensaje.content if b.type == "text").strip()
        respuesta = Respuesta(texto)
        pendientes: list[tuple[str, str | None]] = []

        for bloque in mensaje.content:
            if bloque.type != "tool_use" or bloque.name != "crear_juego":
                continue
            descripcion = bloque.input["descripcion"]
            trabajo = self._taller.encargar(descripcion)
            pendientes.append((bloque.id, trabajo.id if trabajo else None))
            if trabajo:
                respuesta.juego_id = trabajo.id
                respuesta.descripcion_juego = descripcion
            elif not respuesta.juego_id:
                respuesta.texto = frases.una(frases.OCUPADO)

        if not respuesta.texto:
            respuesta.texto = frases.una(frases.ARRANCO_A_PROGRAMAR if respuesta.juego_id else frases.SIN_CEREBRO)
        return respuesta, pendientes

    def _responder_sin_claude(self, texto: str) -> Respuesta:
        """Sin Claude no hay charla, pero si piden un juego se pone uno de respaldo."""
        if not PIDE_JUEGO.search(normalizar(texto)):
            return Respuesta(frases.una(frases.SIN_CEREBRO), origen="respaldo")
        trabajo = self._taller.encargar(texto, solo_respaldo=True)
        if trabajo is None:
            return Respuesta(frases.una(frases.OCUPADO), origen="respaldo")
        return Respuesta(
            frases.una(frases.SIN_CEREBRO_CON_JUEGO), juego_id=trabajo.id, descripcion_juego=texto, origen="respaldo"
        )

    def _resultado_juego(self, juego_id: str | None) -> str:
        trabajo = self._taller.obtener(juego_id) if juego_id else None
        return _describir(trabajo)

    async def _pedir(self, mensajes: list[BetaMessageParam]) -> BetaMessage | None:
        """Llama a Claude. Devuelve None si falló, para que Byte use una excusa."""
        try:
            return await asyncio.wait_for(
                self._cliente.beta.messages.create(
                    model=config.MODELO,
                    max_tokens=config.MAX_TOKENS,
                    system=SISTEMA,
                    tools=HERRAMIENTAS,
                    messages=mensajes,
                    output_config={"effort": config.ESFUERZO},
                    betas=BETAS,
                    fallbacks="default",
                ),
                timeout=config.TIMEOUT_CHARLA_S,
            )
        except anthropic.AuthenticationError:
            log.error("La API key no es válida: revisá ANTHROPIC_API_KEY en el .env")
        except anthropic.RateLimitError:
            log.warning("Límite de uso de la API alcanzado")
        except anthropic.APIStatusError as error:
            log.warning("La API respondió %s: %s", error.status_code, error.message)
        except (anthropic.APIConnectionError, TimeoutError):
            log.warning("Sin conexión con la API o tardó más de %ss", config.TIMEOUT_CHARLA_S)
        return None


def _describir(trabajo: Trabajo | None) -> str:
    resultado = RESULTADOS_JUEGO[trabajo.estado if trabajo else None]
    if trabajo and trabajo.respaldo:
        aviso = f"No llegaste a programarlo a tiempo y pusiste «{trabajo.respaldo}», un juego que tenías guardado. "
        return aviso + resultado
    return resultado
