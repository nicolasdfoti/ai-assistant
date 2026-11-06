import { azar } from '../util/matematica';
import type { IntervaloParpadeo } from './comportamientos/tipos';

const DURACION_S = 0.15;
const SEPARACION_DOBLE_S = 0.22;
const PROBABILIDAD_DOBLE = 0.2;

/** Parpadeo automático. Devuelve un multiplicador para la apertura de los párpados. */
export class Parpadeo {
  private inicio = -Infinity;
  private proximo = 0;
  private doble = false;

  factor(t: number, intervalo: IntervaloParpadeo | null): number {
    if (!intervalo) return 1;

    if (t >= this.proximo) {
      this.inicio = t;
      this.proximo = t + azar(intervalo.min, intervalo.max);
      this.doble = Math.random() < PROBABILIDAD_DOBLE;
    }

    const transcurrido = t - this.inicio;
    const segundo = this.doble ? curva(transcurrido - SEPARACION_DOBLE_S) : 1;
    return Math.min(curva(transcurrido), segundo);
  }
}

/** Cierra y abre: 1 → 0 → 1 a lo largo de DURACION_S. */
function curva(e: number): number {
  return e >= 0 && e <= DURACION_S ? 1 - Math.sin((Math.PI * e) / DURACION_S) : 1;
}
