"""Escribir texto en un archivo de a poquito, para que en VS Code se vea tipear."""

import asyncio
from collections.abc import AsyncIterator
from pathlib import Path


async def tipear(
    archivo: Path, fuente: AsyncIterator[str], caracteres: int, intervalo: float
) -> str:
    """
    Agrega a `archivo` lo que va llegando de `fuente`, de a `caracteres` cada
    `intervalo` segundos. Si la fuente es más rápida que el tipeo, se acumula;
    si es más lenta, el tipeo la espera. Devuelve todo lo escrito.
    Si la fuente falla, primero termina de tipear lo recibido y después propaga el error.
    """
    pendiente = ""
    terminada = False

    async def leer() -> None:
        nonlocal pendiente, terminada
        try:
            async for pedazo in fuente:
                pendiente += pedazo
        finally:
            terminada = True

    lector = asyncio.create_task(leer())
    escrito: list[str] = []
    try:
        with archivo.open("a", encoding="utf-8") as f:
            while pendiente or not terminada:
                if pendiente:
                    golpe, pendiente = pendiente[:caracteres], pendiente[caracteres:]
                    f.write(golpe)
                    f.flush()
                    escrito.append(golpe)
                await asyncio.sleep(intervalo)
        await lector
    finally:
        lector.cancel()
    return "".join(escrito)
