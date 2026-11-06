"""Manejo de ventanas de Windows desde WSL: abrir VS Code y devolverle el foco a Byte."""

import asyncio
import logging
from pathlib import Path

from . import config

log = logging.getLogger("byte.ventanas")


async def _ejecutar(*comando: str, timeout: float = 15.0) -> bool:
    try:
        proceso = await asyncio.create_subprocess_exec(
            *comando, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE
        )
        _, error = await asyncio.wait_for(proceso.communicate(), timeout)
    except (OSError, TimeoutError) as e:
        log.warning("No se pudo ejecutar %s: %s", comando[0], e)
        return False
    if proceso.returncode != 0:
        log.warning("%s falló: %s", comando[0], error.decode(errors="replace").strip())
        return False
    return True


async def abrir_en_editor(archivo: Path) -> bool:
    return await _ejecutar(*config.COMANDO_EDITOR, str(archivo))


async def enfocar_byte() -> bool:
    """Trae al frente la ventana de Chrome cuyo título empieza con el de Byte."""
    titulo = config.TITULO_VENTANA_BYTE.replace("'", "''")
    script = f"(New-Object -ComObject WScript.Shell).AppActivate('{titulo}') | Out-Null"
    return await _ejecutar("powershell.exe", "-NoProfile", "-NonInteractive", "-Command", script)


async def abrir_en_editor_sin_perder_a_byte(archivo: Path) -> None:
    await abrir_en_editor(archivo)
    if not config.DOS_PANTALLAS:
        return
    transcurrido = 0.0
    for momento in config.DEVOLVER_FOCO_S:
        await asyncio.sleep(momento - transcurrido)
        transcurrido = momento
        await enfocar_byte()
