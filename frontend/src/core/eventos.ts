import type { EventBus } from './eventBus';

export const ESTADOS = ['durmiendo', 'idle', 'escuchando', 'pensando', 'hablando', 'programando'] as const;
export type Estado = (typeof ESTADOS)[number];

/** Catálogo de todos los eventos que viajan por el bus. */
export type EventosByte = {
  /** La máquina de estados pasó de un estado a otro. */
  'estado:cambio': { anterior: Estado; actual: Estado };
  /** Nivel de la voz de Byte (0..1) para que los ojos reboten al hablar. */
  'voz:nivel': number;
  /** Push-to-talk: se apretó / se soltó el botón. */
  'ptt:presionado': void;
  'ptt:soltado': void;
  /** Lo que el reconocimiento va entendiendo mientras el botón está apretado. */
  'oido:parcial': string;
  /** Texto final del visitante, enviado al cerebro. */
  'visitante:dijo': string;
  /** Lo que Byte está por decir. */
  'byte:dice': string;
  /** El backend terminó de programar un juego. */
  'juego:listo': { id: string; html: string };
  'juego:error': string;
  /** Claude no llegó y el backend está escribiendo un juego de respaldo. */
  'juego:respaldo': { id: string; titulo: string };
  /** El operador pidió un juego de respaldo a mano (tecla J). */
  'juego:pedirRespaldo': void;
  /** Pedido para cerrar el juego en pantalla (tecla Escape). */
  'juego:cerrar': void;
  'juego:abierto': void;
  'juego:cerrado': void;
  /** Atajos de desarrollo. */
  'debug:estado': Estado;
  'debug:hud': void;
};

export type Bus = EventBus<EventosByte>;
