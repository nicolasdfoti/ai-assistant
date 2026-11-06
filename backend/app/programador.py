"""Le pide a Claude el código de un juego y lo devuelve en streaming."""

import asyncio
import logging
from collections.abc import AsyncIterator

import anthropic

from . import config

log = logging.getLogger("byte.programador")

SISTEMA_PROGRAMADOR = """\
Sos un programador de videojuegos para chicos. Escribís juegos completos en un único \
archivo HTML que se juega dentro de un iframe en la pantalla de un stand de feria.

Requisitos del juego:
- Un solo archivo con <canvas>, CSS y JavaScript adentro. Nada externo: ni librerías, \
ni imágenes, ni fuentes, ni sonidos de internet, ni fetch. Tampoco localStorage ni cookies.
- Gráficos dibujados en el canvas con formas y colores vivos (podés usar emojis con fillText).
- El canvas ocupa toda la ventana y se adapta cuando cambia de tamaño.
- Controles: solo flechas y Enter. Nunca uses la barra espaciadora ni Escape.
- Pantalla de inicio con el título y "Presioná Enter para empezar"; al ganar o perder, \
el puntaje y "Enter para jugar de nuevo".
- Textos en español rioplatense, apto para chicos, sin violencia gráfica.
- Simple: se entiende en 10 segundos, es divertido y la dificultad sube de a poco.
- Usá requestAnimationFrame y preventDefault en las flechas.
- Código claro, con comentarios breves en español: chicos lo van a ver mientras se \
escribe. Menos de 250 líneas.

Respondé solo con el HTML, empezando por <!DOCTYPE html>, sin explicaciones ni bloques \
de código markdown.\
"""


class ProgramacionFallida(Exception):
    """Claude no pudo entregar un juego completo."""


class Programador:
    def __init__(self, cliente: anthropic.AsyncAnthropic) -> None:
        self._cliente = cliente

    async def programar(self, descripcion: str) -> AsyncIterator[str]:
        """El HTML del juego, pedazo a pedazo, a medida que Claude lo escribe."""
        fuente = self._pedir(descripcion)
        fuente = _con_timeouts(fuente, config.TIMEOUT_JUEGO_INICIO_S, config.TIMEOUT_JUEGO_PAUSA_S)
        async for pedazo in _solo_html(fuente):
            yield pedazo

    async def _pedir(self, descripcion: str) -> AsyncIterator[str]:
        # Sin `fallbacks`: si otro modelo retomara a mitad de camino, el archivo
        # quedaría con dos juegos mezclados. Un rechazo se trata como falla.
        async with self._cliente.messages.stream(
            model=config.MODELO,
            max_tokens=config.MAX_TOKENS_JUEGO,
            system=SISTEMA_PROGRAMADOR,
            messages=[{"role": "user", "content": f"Programá este juego: {descripcion}"}],
            output_config={"effort": config.ESFUERZO_JUEGO},
        ) as stream:
            async for texto in stream.text_stream:
                yield texto
            final = await stream.get_final_message()

        if final.stop_reason == "refusal":
            raise ProgramacionFallida("Claude rechazó programar el juego")
        if final.stop_reason == "max_tokens":
            raise ProgramacionFallida("El juego quedó cortado (max_tokens)")
        log.info("Juego generado: %s tokens de salida", final.usage.output_tokens)


async def _con_timeouts(
    fuente: AsyncIterator[str], inicio: float, pausa: float
) -> AsyncIterator[str]:
    """Corta con TimeoutError si el primer pedazo tarda más de `inicio` o se traba más de `pausa`."""
    iterador = aiter(fuente)
    espera = inicio
    try:
        while True:
            try:
                pedazo = await asyncio.wait_for(anext(iterador), espera)
            except StopAsyncIteration:
                return
            espera = pausa
            yield pedazo
    finally:
        await iterador.aclose()


# Caracteres que se retienen al final por si el modelo cierra con ``` igual.
_RETENCION = 8


async def _solo_html(fuente: AsyncIterator[str]) -> AsyncIterator[str]:
    """Descarta lo que venga antes del primer '<' y un ``` final, por si el modelo los agrega."""
    previo = ""
    empezado = False
    cola = ""
    async for pedazo in fuente:
        if not empezado:
            previo += pedazo
            indice = previo.find("<")
            if indice < 0:
                continue
            empezado = True
            pedazo = previo[indice:]
        cola += pedazo
        if len(cola) > _RETENCION:
            yield cola[:-_RETENCION]
            cola = cola[-_RETENCION:]

    final = cola.rstrip()
    if final.endswith("```"):
        final = final[:-3].rstrip()
    yield final + "\n"
