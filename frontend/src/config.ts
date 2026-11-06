import type { Estado } from './core/eventos';

/** Teclas de debug para forzar estados (códigos de `KeyboardEvent.code`). */
const debugEstados: Readonly<Record<string, Estado>> = {
  Digit0: 'durmiendo',
  Digit1: 'idle',
  Digit2: 'escuchando',
  Digit3: 'pensando',
  Digit4: 'hablando',
  Digit5: 'programando',
};

export const CONFIG = {
  teclas: {
    /** Push-to-talk. Para el botón físico alcanza con que mande esta tecla. */
    pushToTalk: 'Space',
    cerrarJuego: 'Escape',
    /** Para el operador: pone un juego de respaldo sin pasar por Claude. */
    juegoRespaldo: 'KeyJ',
    pantallaCompleta: 'KeyF',
    hud: 'KeyH',
    debugEstados,
  },
  musica: {
    volumen: 0.5,
    /** Volumen mientras Byte escucha o habla. */
    volumenBajo: 0.1,
    fadeMs: 600,
    /** Se baja en `escuchando` también, para que el micrófono no capte la música. */
    bajarEn: ['escuchando', 'hablando'] as readonly Estado[],
  },
  ojos: {
    transicionMs: 350,
    /** Segundos sin mover el mouse para que Byte deje de seguirlo. */
    mouseInactivoS: 2.5,
    /** Hacia dónde mirar cuando hay un juego abierto (queda a la izquierda y abajo de los ojos). */
    focoJuego: { x: -0.85, y: 0.4 },
  },
  ocurrencias: {
    /** Rango de segundos sin charla (y sin juego abierto) antes de que Byte llame la atención. */
    llamarAtencionS: [40, 80],
    /** Segundos desde que arranca a programar en que se queja de que lo miran. */
    quejasProgramandoS: [8, 18],
  },
  /** Segundos sin mover el mouse para esconder el cursor. */
  cursorInactivoS: 3,
  backend: {
    url: 'http://localhost:8000',
    /** El backend ya corta a los 15 s con una excusa; esto es por si ni contesta. */
    timeoutMs: 20000,
  },
  juego: {
    /** Cada cuánto se pregunta al backend si el juego ya está. */
    consultaMs: 700,
    /** Si nadie toca una tecla del juego en este tiempo, se cierra solo. */
    cerrarInactivoMs: 3 * 60 * 1000,
  },
  oido: {
    idioma: 'es-AR',
    esperaFinalMs: 2000,
  },
  voz: {
    idioma: 'es-AR',
    velocidad: 1.05,
    tono: 1.15,
    /** Parte del nombre de una voz para forzarla; la lista sale en la consola. */
    preferida: '',
  },
  pantallaCompletaAlDespertar: true,
  hudVisible: true,
  subtitulos: true,
} as const;

export type ConfigTeclas = typeof CONFIG.teclas;
export type ConfigOcurrencias = typeof CONFIG.ocurrencias;
