import { azar, suavizar } from '../../util/matematica';
import { cara, pose, type PoseCara } from '../pose';
import type { Comportamiento, ContextoOjos } from './tipos';

/** Segundos que tarda en "leer" una línea de código. */
const BARRIDO_S = 1.1;
/** Parte del barrido que se usa para leer; el resto es el salto a la línea siguiente. */
const LECTURA = 0.85;

/**
 * Achinados y nerviosos: leen código de izquierda a derecha, tiemblan,
 * y cada tanto miran al público como diciendo "¿qué mirás?".
 */
export class Programando implements Comportamiento {
  readonly parpadeo = { min: 0.7, max: 2 };

  private proximoVistazo = 0;
  private vistazoHasta = 0;
  private x = 0;
  private y = 0;
  private apertura = 0.42;

  entrar(): void {
    this.proximoVistazo = azar(2.5, 4);
    this.vistazoHasta = 0;
  }

  actualizar({ t, dt, enEstado }: ContextoOjos): PoseCara {
    if (enEstado >= this.proximoVistazo) {
      this.vistazoHasta = enEstado + 0.7;
      this.proximoVistazo = enEstado + azar(3, 6);
    }

    const vistazo = enEstado < this.vistazoHasta;
    const fase = (enEstado % BARRIDO_S) / BARRIDO_S;
    const lectura = fase < LECTURA ? fase / LECTURA : 1 - (fase - LECTURA) / (1 - LECTURA);

    this.x = suavizar(this.x, vistazo ? 0 : -0.7 + 1.4 * lectura, 25, dt);
    this.y = suavizar(this.y, vistazo ? -0.1 : 0.5, 18, dt);
    this.apertura = suavizar(this.apertura, vistazo ? 0.75 : 0.42, 12, dt);

    const temblorX = Math.sin(t * 53) * 1.6 + Math.sin(t * 37) * 1.2;
    const temblorY = Math.cos(t * 47) * 1.4 + Math.sin(t * 29) * 1;
    const base = pose({ mirarX: this.x, mirarY: this.y, apertura: this.apertura, dx: temblorX, dy: temblorY });

    // Cejas asimétricas: un ojo preocupado y el otro concentrado.
    return cara({ ...base, ceno: -8 }, { ...base, ceno: 5, dx: temblorY, dy: temblorX });
  }
}
