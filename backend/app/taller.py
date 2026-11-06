"""El taller donde Byte fabrica juegos: uno a la vez, en segundo plano."""

import asyncio
import logging
from collections.abc import AsyncIterator
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Literal

from . import config, ventanas
from .programador import Programador
from .respaldo import Repertorio
from .tipeo import tipear

log = logging.getLogger("byte.taller")

EstadoJuego = Literal["generando", "listo", "error"]


@dataclass
class Trabajo:
    id: str
    descripcion: str
    archivo: Path
    estado: EstadoJuego = "generando"
    # Título del juego de respaldo, si Claude no llegó y se usó uno guardado.
    respaldo: str | None = None


class Taller:
    def __init__(self, programador: Programador, repertorio: Repertorio, carpeta: Path) -> None:
        self._programador = programador
        self._repertorio = repertorio
        self._carpeta = carpeta
        self._trabajos: dict[str, Trabajo] = {}
        self._actual: Trabajo | None = None
        # Referencias a las tareas para que el recolector no las mate a mitad de camino.
        self._tareas: set[asyncio.Task] = set()

    @property
    def ocupado(self) -> bool:
        return self._actual is not None and self._actual.estado == "generando"

    def obtener(self, id_: str) -> Trabajo | None:
        return self._trabajos.get(id_)

    def encargar(self, descripcion: str, *, solo_respaldo: bool = False) -> Trabajo | None:
        """
        Empieza a programar un juego. Con `solo_respaldo` ni intenta con Claude
        (por ejemplo, si la API ya está caída). Devuelve None si ya hay uno en curso.
        """
        if self.ocupado:
            return None
        id_ = datetime.now().strftime("%Y%m%d-%H%M%S")
        trabajo = Trabajo(id_, descripcion, self._carpeta / f"juego_{id_}.html")
        self._trabajos[id_] = trabajo
        self._actual = trabajo
        self._en_segundo_plano(self._fabricar(trabajo, solo_respaldo))
        return trabajo

    async def _fabricar(self, trabajo: Trabajo, solo_respaldo: bool) -> None:
        log.info("Programando %s: %s", trabajo.archivo.name, trabajo.descripcion or "(respaldo)")
        try:
            self._carpeta.mkdir(parents=True, exist_ok=True)
            trabajo.archivo.write_text("", encoding="utf-8")
            self._en_segundo_plano(ventanas.abrir_en_editor_sin_perder_a_byte(trabajo.archivo))
            if solo_respaldo or not await self._programar_con_claude(trabajo):
                await self._escribir_respaldo(trabajo)
            trabajo.estado = "listo"
            log.info("Juego listo: %s", trabajo.archivo.name)
        except Exception:
            trabajo.estado = "error"
            log.exception("Falló la programación de %s", trabajo.archivo.name)
        finally:
            if not config.DOS_PANTALLAS:
                await ventanas.enfocar_byte()

    async def _programar_con_claude(self, trabajo: Trabajo) -> bool:
        try:
            await self._tipear(trabajo, self._programador.programar(trabajo.descripcion))
            return True
        except Exception as error:
            # Timeout, API caída, rechazo o juego cortado: cualquier falla lleva al respaldo.
            log.warning("Claude no pudo programar el juego (%r); uso uno de respaldo", error)
            return False

    async def _escribir_respaldo(self, trabajo: Trabajo) -> None:
        juego = self._repertorio.elegir(trabajo.descripcion)
        trabajo.respaldo = juego.titulo
        log.info("Juego de respaldo: %s", juego.titulo)
        # Borra lo que Claude haya llegado a escribir y lo tipea "de memoria".
        trabajo.archivo.write_text("", encoding="utf-8")
        await self._tipear(trabajo, _de_una(juego.archivo.read_text(encoding="utf-8")))

    @staticmethod
    async def _tipear(trabajo: Trabajo, fuente: AsyncIterator[str]) -> None:
        await tipear(trabajo.archivo, fuente, config.TIPEO_CARACTERES, config.TIPEO_INTERVALO_S)

    def _en_segundo_plano(self, corrutina) -> None:
        tarea = asyncio.create_task(corrutina)
        self._tareas.add(tarea)
        tarea.add_done_callback(self._tareas.discard)


async def _de_una(texto: str) -> AsyncIterator[str]:
    yield texto
