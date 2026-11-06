import type { PoseCara } from '../pose';

export interface ContextoOjos {
  /** Segundos desde que arrancó la animación. */
  t: number;
  /** Segundos desde el cuadro anterior. */
  dt: number;
  /** Segundos desde que se entró a este comportamiento. */
  enEstado: number;
  /** Mouse normalizado (-1..1), o null si no se movió hace rato. */
  mouse: { x: number; y: number } | null;
  /** Nivel de la voz de Byte, suavizado (0..1). */
  voz: number;
  /** Algo interesante para mirar cuando no hay nada mejor (por ejemplo, el juego), o null. */
  foco: { x: number; y: number } | null;
}

export interface IntervaloParpadeo {
  min: number;
  max: number;
}

/** Cómo se mueven los ojos en un estado. Cada estado vive en su propio archivo. */
export interface Comportamiento {
  /** Cada cuántos segundos parpadea; null = no parpadea. */
  readonly parpadeo: IntervaloParpadeo | null;
  /** Se llama al entrar al estado, para reiniciar lo que haga falta. */
  entrar?(): void;
  actualizar(ctx: ContextoOjos): PoseCara;
}
