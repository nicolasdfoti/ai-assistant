"""Juegos de respaldo: se usan cuando Claude no puede programar uno a tiempo."""

import json
import logging
import random
import unicodedata
from dataclasses import dataclass
from pathlib import Path

log = logging.getLogger("byte.respaldo")


@dataclass(frozen=True)
class JuegoRespaldo:
    archivo: Path
    titulo: str
    palabras: tuple[str, ...]


def normalizar(texto: str) -> str:
    """Minúsculas y sin tildes, para comparar palabras sin vueltas."""
    sin_tildes = unicodedata.normalize("NFD", texto.lower())
    return "".join(c for c in sin_tildes if unicodedata.category(c) != "Mn")


class Repertorio:
    """Lee juegos_backup/catalogo.json y elige el juego que más se parece al pedido."""

    def __init__(self, carpeta: Path) -> None:
        try:
            datos = json.loads((carpeta / "catalogo.json").read_text(encoding="utf-8"))
        except (OSError, ValueError):
            log.exception("No se pudo leer el catálogo de juegos de respaldo")
            datos = []
        self._juegos = [
            JuegoRespaldo(carpeta / d["archivo"], d["titulo"], tuple(normalizar(p) for p in d["palabras"]))
            for d in datos
        ]
        self._ultimo: JuegoRespaldo | None = None

    def elegir(self, pedido: str) -> JuegoRespaldo:
        if not self._juegos:
            raise LookupError("No hay juegos de respaldo en el catálogo")
        texto = normalizar(pedido)
        coincidencias = {j: sum(p in texto for p in j.palabras) for j in self._juegos}
        mejor = max(coincidencias.values())
        candidatos = [j for j, n in coincidencias.items() if n == mejor]
        # Si ninguno coincide, que no salga dos veces seguidas el mismo.
        if mejor == 0 and len(candidatos) > 1 and self._ultimo in candidatos:
            candidatos.remove(self._ultimo)
        self._ultimo = random.choice(candidatos)
        return self._ultimo
