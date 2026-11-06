"""Configuración del backend. La API key se lee del .env de la raíz del proyecto."""

import os
from pathlib import Path

from dotenv import load_dotenv

RAIZ_PROYECTO = Path(__file__).resolve().parents[2]
load_dotenv(RAIZ_PROYECTO / ".env")

MODELO = "claude-sonnet-5-5"
# Respuestas cortas de charla: esfuerzo bajo = menos latencia.
ESFUERZO = "low"
MAX_TOKENS = 4000

# Tiempo máximo para una respuesta de charla. Si se pasa, Byte usa una excusa.
TIMEOUT_CHARLA_S = 15.0

# Si nadie habla por este tiempo, se asume que llegó otro chico y se arranca de cero.
CONVERSACION_INACTIVA_S = 90
# Tope de intercambios por conversación (cuida costo y latencia).
CONVERSACION_MAX_TURNOS = 12

# --- Juegos ---
CARPETA_JUEGOS = RAIZ_PROYECTO / "juegos"
CARPETA_RESPALDO = RAIZ_PROYECTO / "juegos_backup"
ESFUERZO_JUEGO = "low"
MAX_TOKENS_JUEGO = 20000
# Si Claude no empieza a escribir el juego en este tiempo, se usa uno de respaldo.
TIMEOUT_JUEGO_INICIO_S = 25.0
# Lo mismo si se traba en el medio (deja de llegar código) por este tiempo.
TIMEOUT_JUEGO_PAUSA_S = 15.0
# Tipeo en VS Code: cuántos caracteres por golpe y cada cuánto.
TIPEO_CARACTERES = 40
TIPEO_INTERVALO_S = 0.03

# --- Ventanas de Windows ---
COMANDO_EDITOR = ["code"]
TITULO_VENTANA_BYTE = "Byte"
# Dos pantallas: VS Code tipea en una y Byte sigue al frente en la otra.
# Una sola: VS Code queda al frente mientras programa y Byte vuelve al terminar.
DOS_PANTALLAS = True
# Abrir VS Code le roba el foco a Byte (y el botón dejaría de llegarle).
# Se le devuelve el foco en estos momentos (segundos) después de abrir el editor.
DEVOLVER_FOCO_S = (1.5, 4.0)

ORIGENES_PERMITIDOS = os.getenv(
    "BYTE_ORIGENES", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")
