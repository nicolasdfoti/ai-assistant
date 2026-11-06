# Byte 🤖

Byte es el agente de IA del stand de IT: dos ojos grandes en pantalla que escuchan, charlan con humor en rioplatense y, si un chico le pide un juego, lo programan en vivo mientras el código se tipea en VS Code. Es la primera versión de un asistente más grande, así que está armado en piezas chicas y reemplazables.

## Cómo funciona

```
 Chrome (Windows)                                  WSL
┌───────────────────────────────┐   HTTP    ┌──────────────────────────────┐
│ frontend/ (Vite + TS)         │ ────────▶ │ backend/ (FastAPI :8000)     │
│ ojos · voz · música · juegos  │ ◀──────── │ cerebro → Claude             │
└───────────────────────────────┘           │ taller  → juegos/*.html      │
                                            │          → VS Code tipeando  │
                                            └──────────────────────────────┘
```

1. El chico mantiene apretada la barra espaciadora (o el botón) y habla. Chrome lo pasa a texto.
2. El backend le pregunta a Claude (`claude-sonnet-5-5`) con la personalidad de Byte. Si el chico pidió un juego, Claude usa la herramienta `crear_juego`.
3. Byte responde con la voz del navegador, mientras los ojos rebotan y la música baja.
4. Si hay juego, el backend lo pide a Claude en streaming y lo va tipeando en `juegos/juego_<fecha>.html` con VS Code abierto. Cuando termina, aparece en la pantalla de Byte para jugarlo.
5. Si Claude no empieza en 25 s, se traba o falla, Byte tipea uno de los juegos de `juegos_backup/` y pone una excusa graciosa.

## Requisitos

- Windows con WSL2.
- Google Chrome en Windows. El reconocimiento de voz necesita Chrome y **conexión a internet**.
- VS Code en Windows, con el comando `code` disponible desde WSL (viene así si se instaló normalmente).
- Node.js 22 o más nuevo (probado con 24) y Python 3.12 o más nuevo (probado con 3.14), ambos en WSL.
- Una API key de Anthropic.

## Instalación (una sola vez)

```bash
# Backend
cd backend
python3 -m venv venv
venv/bin/pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

Creá un archivo `.env` en la raíz del proyecto con la API key (ya está en el `.gitignore`, nunca lo subas):

```
ANTHROPIC_API_KEY=sk-ant-...
```

**Música (opcional):** poné archivos `.mp3`, `.ogg`, `.wav` o `.m4a` en `assets/musica/`. Si hay varios, se pasan uno tras otro. Después de agregar música hay que reiniciar `npm run dev`.

## Levantar todo

Dos terminales de WSL:

```bash
# Terminal 1: backend
cd backend
venv/bin/uvicorn app.main:app --port 8000

# Terminal 2: frontend
cd frontend
npm run dev
```

Después abrí **http://localhost:5173** en Chrome y aceptá el permiso del micrófono. Byte arranca dormido: cualquier tecla lo despierta, pone pantalla completa y arranca la música.

### Modo stand (kiosco)

Para la feria conviene abrir Chrome en modo kiosco, con un perfil propio. Desde PowerShell:

```powershell
& "C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --user-data-dir=C:\byte-chrome http://localhost:5173
```

- El kiosco no se cierra con Escape; se sale con `Alt+F4`.
- Si no querés que pregunte por el micrófono, agregá `--use-fake-ui-for-media-stream`, que acepta el permiso solo.
- El título de la ventana tiene que empezar con "Byte". El backend lo usa para devolverle el foco después de abrir VS Code.

### Pantallas

Está pensado para **dos pantallas**: Byte a pantalla completa en la TV y VS Code en el monitor de la PC, donde se ve el código tipeándose. Si hay una sola pantalla, poné `DOS_PANTALLAS = False` en `backend/app/config.py`: VS Code queda al frente mientras programa y Byte vuelve cuando el juego está listo.

## Uso en el stand

| Tecla | Qué hace |
|---|---|
| **Espacio** (mantener) | Push-to-talk: hablarle a Byte. Funciona también mientras se juega. |
| **Esc** | Cerrar el juego en pantalla. En pantalla completa, mantenerla apretada para salir. |
| **J** | Para el operador: poner un juego de respaldo sin pasar por Claude (por si se cae internet o la API). |
| **F** | Pantalla completa sí / no. |
| **H** | Mostrar u ocultar el cartelito de ayuda. |
| **0–5** | Forzar estados para probar: durmiendo, idle, escuchando, pensando, hablando, programando. |

Los juegos se juegan con las **flechas** y **Enter**. Un juego se cierra solo después de 3 minutos sin que nadie toque una tecla.

**Botón físico:** cualquier botón que emule la barra espaciadora (un encoder USB de botones arcade, por ejemplo) funciona sin cambiar nada. Para usar otra tecla, cambiá `teclas.pushToTalk` en `frontend/src/config.ts`.

**Byte solo, sin que nadie le hable:**
- Si pasa un rato sin charla, llama la atención o cuenta un chiste.
- Mientras programa, se queja de que lo miran.
- Estas frases no consultan a Claude, así que no gastan API.

## Configuración

Casi todo se ajusta sin tocar código.

**`frontend/src/config.ts`**

| Opción | Para qué |
|---|---|
| `teclas` | Mapa de teclas (push-to-talk, cerrar juego, respaldo, debug). |
| `musica.volumen` / `volumenBajo` | Volumen normal y mientras Byte escucha o habla. |
| `voz.preferida` | Parte del nombre de una voz para forzarla (por ejemplo `"Sabina"`). La lista de voces en español sale en la consola del navegador. |
| `voz.velocidad` / `tono` | Cómo suena Byte. |
| `ocurrencias` | Cada cuánto llama la atención y cuándo se queja mientras programa. |
| `juego.cerrarInactivoMs` | Tiempo sin teclas hasta cerrar el juego. |
| `hudVisible` / `subtitulos` | Cartel de ayuda y subtítulos. |

**`backend/app/config.py`**

| Opción | Para qué |
|---|---|
| `MODELO`, `ESFUERZO`, `ESFUERZO_JUEGO` | Modelo de Claude y cuánto piensa (más esfuerzo = mejor pero más lento). |
| `TIMEOUT_JUEGO_INICIO_S` / `TIMEOUT_JUEGO_PAUSA_S` | Cuándo rendirse con Claude y usar un juego de respaldo (25 s para empezar, 15 s trabado). |
| `TIPEO_CARACTERES` / `TIPEO_INTERVALO_S` | Velocidad del tipeo en VS Code (40 caracteres cada 30 ms). |
| `CONVERSACION_INACTIVA_S` | Después de cuánto silencio Byte asume que llegó otro chico y empieza una charla nueva. |
| `DOS_PANTALLAS`, `DEVOLVER_FOCO_S` | Manejo de ventanas (ver arriba). |

La personalidad de Byte y la herramienta `crear_juego` están en `backend/app/personalidad.py`. Las reglas para los juegos generados están en `backend/app/programador.py`.

## Juegos de respaldo

En `juegos_backup/` hay 5 juegos propios: Lluvia de Estrellas, Cohete Esquivador, El Laberinto del Ratón, Robot Pintor y Pez Burbujero. `catalogo.json` les asigna palabras clave para elegir el que más se parece al pedido (si piden "una nave", sale el cohete).

Para sumar uno: copiá el `.html` a esa carpeta y agregá una entrada al catálogo. Tiene que cumplir las mismas reglas que los generados:
- Un solo archivo, sin nada externo.
- Controles con flechas y Enter (nunca Espacio ni Escape).
- Sin `localStorage`, porque se juega en un iframe aislado.

## Estructura

```
backend/app/
  main.py          API: /hablar, /juegos/{id}, /juegos/{id}/html, /juegos/respaldo
  cerebro.py       Charla con Claude, historial por visitante, herramientas
  personalidad.py  System prompt y herramienta crear_juego
  taller.py        Fabrica juegos de a uno, con respaldo si Claude falla
  programador.py   Pide el juego a Claude en streaming
  tipeo.py         Escribe el archivo de a poquito (efecto VS Code)
  respaldo.py      Elige un juego de juegos_backup/
  ventanas.py      Abre VS Code y devuelve el foco a Byte (Windows)
frontend/src/
  main.ts          Arma las piezas y las conecta (nada de lógica acá)
  config.ts        Toda la configuración
  core/            Bus de eventos tipado y máquina de estados
  eyes/            Ojos: un archivo por estado en comportamientos/, renderer SVG
  voz/             Reconocimiento (Web Speech) y voz (speechSynthesis)
  conversacion.ts  Flujo escuchar → pensar → hablar → programar
  ocurrencias.ts   Lo que Byte dice por su cuenta
  juego/           Seguimiento del juego en el backend y panel donde se juega
  audio/           Música de fondo con fundidos
juegos/            Juegos generados (no se suben al repo)
juegos_backup/     Juegos de respaldo + catalogo.json
```

Los módulos del frontend no se llaman entre sí: emiten y escuchan eventos en el bus (`core/eventos.ts` tiene el catálogo completo). Para extender Byte:

- **ElevenLabs u otra voz:** implementá la interfaz `Voz` de `voz/tipos.ts` y pasala en `main.ts`. Para que los ojos sigan la voz real, emití `voz:nivel` con el volumen medido con un `AnalyserNode`, en vez de usar `EnvolventeSintetica`.
- **Otro reconocimiento de voz** (por ejemplo, uno offline): implementá `Oido`.
- **Un estado nuevo de los ojos:** sumalo a `ESTADOS` y creá su archivo en `eyes/comportamientos/`.
- **Una herramienta nueva para Claude:** definila en `personalidad.py` y ejecutala en `Cerebro._ejecutar_herramientas`.

## Costos aproximados

Con `claude-sonnet-5-5`:
- **Cada respuesta de charla:** cuesta menos de un centavo de dólar.
- **Cada juego:** sale unos 4.500 tokens, unos 5 centavos de dólar.
- **Gratis:** las frases propias de Byte y los juegos de respaldo no consultan a Claude.

## Problemas comunes

| Síntoma | Qué revisar |
|---|---|
| Byte no escucha | Permiso del micrófono en Chrome (candado en la barra de direcciones) y conexión a internet. En la consola aparece `[oido]` con el error. |
| Habla con acento raro o en inglés | No hay voces en español instaladas en Windows. Configuración → Hora e idioma → Voz, o elegí otra con `voz.preferida`. |
| "Se me desconectó el cerebro" | Mirá el log del backend: API key inválida, sin conexión o límite de uso. |
| VS Code no se abre | Probá `code .` en la terminal de WSL donde corre el backend. |
| Después de abrir VS Code, la barra escribe espacios en el archivo | Byte no recuperó el foco. Revisá que el título de su ventana empiece con "Byte" o subí los tiempos de `DEVOLVER_FOCO_S`. |
| El código nuevo queda fuera de la pantalla en VS Code | VS Code recarga el archivo pero no siempre baja hasta el final. |
| Error de CORS en la consola | El frontend corre en otra dirección o puerto. Agregalo en la variable `BYTE_ORIGENES` (separada por comas) al levantar el backend. |
| "Address already in use" | Ya hay un backend o un Vite corriendo en ese puerto. |
| No hay música | Faltan archivos en `assets/musica/`, o no se reinició `npm run dev`. |
