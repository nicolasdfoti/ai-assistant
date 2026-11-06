import { cara, pose, type PoseCara } from '../pose';
import type { Comportamiento, ContextoOjos } from './tipos';

/** Espirales hipnóticos girando, con los ojos dando vueltas hacia arriba. */
export class Pensando implements Comportamiento {
  readonly parpadeo = null;

  actualizar({ t }: ContextoOjos): PoseCara {
    const base = pose({
      espiral: 1,
      pupila: 1.15,
      apertura: 0.88,
      ceno: 3,
      mirarX: Math.cos(t * 0.9) * 0.25,
      mirarY: -0.35 + Math.sin(t * 0.9) * 0.12,
      dy: Math.sin(t * 1.8) * 3,
    });
    // Un ojo un poco más grande que el otro: cara de mareado.
    return cara({ ...base, escala: 1.05 }, { ...base, escala: 0.97 });
  }
}
