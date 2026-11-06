import { azar, suavizar } from '../../util/matematica';
import { cara, pose, type PoseCara } from '../pose';
import type { Comportamiento, ContextoOjos } from './tipos';

interface Objetivo {
  x: number;
  y: number;
  apertura: number;
  ceno: number;
}

const MIRAR_AL_FRENTE: Objetivo = { x: 0, y: 0, apertura: 1, ceno: 0 };

/**
 * Mira a los costados (a veces con sospecha), parpadea y sigue al mouse si se mueve.
 * Si hay un foco (el juego en pantalla), lo mira casi siempre.
 */
export class Idle implements Comportamiento {
  readonly parpadeo = { min: 2, max: 5.5 };

  private objetivo = MIRAR_AL_FRENTE;
  private proximoCambio = 0;
  private x = 0;
  private y = 0;
  private apertura = 1;
  private ceno = 0;

  entrar(): void {
    this.proximoCambio = 0;
  }

  actualizar({ t, dt, mouse, foco }: ContextoOjos): PoseCara {
    if (mouse) {
      this.objetivo = { ...MIRAR_AL_FRENTE, x: mouse.x, y: mouse.y };
      // Cuando el mouse se queda quieto, espera un toque antes de volver a curiosear.
      this.proximoCambio = t + 1;
    } else if (t >= this.proximoCambio) {
      this.objetivo = foco && Math.random() < 0.75 ? mirarCerca(foco) : elegirMirada();
      this.proximoCambio = t + azar(1.2, 3.5);
    }

    const velocidad = mouse ? 10 : 14;
    this.x = suavizar(this.x, this.objetivo.x, velocidad, dt);
    this.y = suavizar(this.y, this.objetivo.y, velocidad, dt);
    this.apertura = suavizar(this.apertura, this.objetivo.apertura, 6, dt);
    this.ceno = suavizar(this.ceno, this.objetivo.ceno, 6, dt);

    const respiro = Math.sin(t * 1.4);
    return cara(
      pose({
        mirarX: this.x,
        mirarY: this.y,
        apertura: this.apertura,
        ceno: this.ceno,
        escala: 1 + respiro * 0.012,
        dy: respiro * 4,
      }),
    );
  }
}

function mirarCerca(foco: { x: number; y: number }): Objetivo {
  return { ...MIRAR_AL_FRENTE, x: foco.x + azar(-0.15, 0.15), y: foco.y + azar(-0.15, 0.15) };
}

function elegirMirada(): Objetivo {
  if (Math.random() < 0.7) {
    const lado = Math.random() < 0.5 ? -1 : 1;
    const sospecha = Math.random() < 0.3;
    return {
      x: lado * azar(0.75, 1),
      y: azar(-0.2, 0.2),
      apertura: sospecha ? 0.6 : 1,
      ceno: sospecha ? 9 : 0,
    };
  }
  return { ...MIRAR_AL_FRENTE, x: azar(-0.3, 0.3), y: azar(-0.3, 0.3) };
}
