import { cara, pose, type PoseCara } from '../pose';
import type { Comportamiento, ContextoOjos } from './tipos';

/** Los ojos rebotan siguiendo el nivel de la voz. */
export class Hablando implements Comportamiento {
  readonly parpadeo = { min: 2.5, max: 5 };

  actualizar({ t, voz }: ContextoOjos): PoseCara {
    return cara(
      pose({
        dy: -voz * 30,
        escala: 1.02 + voz * 0.06,
        apertura: 0.82 + voz * 0.18,
        pupila: 1.05 + voz * 0.1,
        mirarX: Math.sin(t * 0.7) * 0.18,
        mirarY: Math.sin(t * 0.5) * 0.08 - 0.05,
      }),
    );
  }
}
