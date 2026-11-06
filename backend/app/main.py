"""API HTTP de Byte. Levantar con: uvicorn app.main:app --port 8000 (desde backend/)."""

import logging
from contextlib import asynccontextmanager
from typing import Literal

import anthropic
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel, Field

from . import config
from .cerebro import Cerebro
from .programador import Programador
from .respaldo import Repertorio
from .taller import EstadoJuego, Taller, Trabajo

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("byte")


@asynccontextmanager
async def ciclo_de_vida(app: FastAPI):
    cliente = anthropic.AsyncAnthropic()
    app.state.taller = Taller(Programador(cliente), Repertorio(config.CARPETA_RESPALDO), config.CARPETA_JUEGOS)
    app.state.cerebro = Cerebro(cliente, app.state.taller)
    yield
    await cliente.close()


app = FastAPI(title="Byte", lifespan=ciclo_de_vida)
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ORIGENES_PERMITIDOS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


class PedidoHablar(BaseModel):
    texto: str = Field(min_length=1, max_length=500)


class RespuestaHablar(BaseModel):
    respuesta: str
    crear_juego: bool
    descripcion_juego: str | None
    # Para seguir el juego con GET /juegos/{juego_id}.
    juego_id: str | None
    origen: Literal["claude", "respaldo"]


class EstadoDeJuego(BaseModel):
    id: str
    estado: EstadoJuego
    descripcion: str
    # Título del juego de respaldo, si Claude no llegó y se usó uno guardado.
    respaldo: str | None

    @classmethod
    def de(cls, trabajo: Trabajo) -> "EstadoDeJuego":
        return cls(id=trabajo.id, estado=trabajo.estado, descripcion=trabajo.descripcion, respaldo=trabajo.respaldo)


@app.get("/salud")
async def salud() -> dict[str, str]:
    return {"estado": "ok", "modelo": config.MODELO}


@app.post("/hablar")
async def hablar(pedido: PedidoHablar) -> RespuestaHablar:
    log.info("Visitante: %s", pedido.texto)
    respuesta = await app.state.cerebro.responder(pedido.texto)
    log.info("Byte (%s): %s | juego: %s", respuesta.origen, respuesta.texto, respuesta.juego_id)
    return RespuestaHablar(
        respuesta=respuesta.texto,
        crear_juego=respuesta.juego_id is not None,
        descripcion_juego=respuesta.descripcion_juego,
        juego_id=respuesta.juego_id,
        origen=respuesta.origen,
    )


def _trabajo(juego_id: str) -> Trabajo:
    trabajo = app.state.taller.obtener(juego_id)
    if trabajo is None:
        raise HTTPException(404, "No existe ese juego")
    return trabajo


@app.post("/juegos/respaldo", status_code=201)
async def juego_de_respaldo() -> EstadoDeJuego:
    """Para el operador del stand: pone un juego de respaldo sin pasar por Claude."""
    trabajo = app.state.taller.encargar("", solo_respaldo=True)
    if trabajo is None:
        raise HTTPException(409, "Ya hay un juego programándose")
    return EstadoDeJuego.de(trabajo)


@app.get("/juegos/{juego_id}")
async def estado_juego(juego_id: str) -> EstadoDeJuego:
    return EstadoDeJuego.de(_trabajo(juego_id))


@app.get("/juegos/{juego_id}/html", response_class=HTMLResponse)
async def html_juego(juego_id: str) -> str:
    return _trabajo(juego_id).archivo.read_text(encoding="utf-8")
