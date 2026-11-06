import { azar, suavizar } from '../../util/matematica';
import { cara, pose, type PoseCara } from '../pose';
import type { Comportamiento, ContextoOjos } from './tipos';

/** Ojos cerrados respirando lento. Cada tanto espía con un ojo, a ver si viene alguien. */
export class Durmiendo implements Comportamiento {
  readonly parpadeo = null;

  private proximoVistazo = 0;
  private vistazoHasta = 0;
  private espia = 0;

  entrar(): void {
    this.proximoVistazo = azar(5, 10);
    this.vistazoHasta = 0;
  }

  actualizar({ t, dt, enEstado }: ContextoOjos): PoseCara {
    if (enEstado >= this.proximoVistazo) {
      this.vistazoHasta = enEstado + 1.4;
      this.proximoVistazo = enEstado + azar(8, 15);
    }
    this.espia = suavizar(this.espia, enEstado < this.vistazoHasta ? 1 : 0, 8, dt);

    const respiro = Math.sin(t * 1.2);
    // Párpados casi juntos y el iris "para arriba", escondido: queda una línea fina.
    const dormido = pose({ apertura: 0.012, mirarY: -1, escala: 0.96 + respiro * 0.02, dy: 12 + respiro * 6 });
    const espiando = { ...dormido, apertura: 0.012 + this.espia * 0.35, mirarX: -0.6 * this.espia, mirarY: -1 + this.espia };
    return cara(dormido, espiando);
  }
}
