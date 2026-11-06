import { cara, pose, type PoseCara } from '../pose';
import type { Comportamiento, ContextoOjos } from './tipos';

/** Ojos grandes y atentos, mirando fijo a quien habla. */
export class Escuchando implements Comportamiento {
  readonly parpadeo = { min: 3.5, max: 7 };

  actualizar({ t, enEstado }: ContextoOjos): PoseCara {
    const atento = Math.sin(t * 2.2);
    // Un "¡pop!" de sorpresa al empezar a escuchar.
    const pop = Math.exp(-enEstado * 6) * 0.08;
    return cara(
      pose({
        escala: 1.12 + pop + atento * 0.01,
        pupila: 1.3 + atento * 0.04,
        mirarY: -0.08,
        ceno: -3,
      }),
    );
  }
}
