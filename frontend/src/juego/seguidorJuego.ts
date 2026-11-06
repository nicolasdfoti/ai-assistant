import type { ClienteByte } from '../cerebro/clienteByte';
import type { Bus } from '../core/eventos';

/** Consultas fallidas seguidas antes de dar el juego por perdido. */
const FALLOS_MAXIMOS = 5;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Pregunta al backend cómo va el juego en curso y avisa por el bus cuando termina. */
export class SeguidorJuego {
  private readonly bus: Bus;
  private readonly cliente: ClienteByte;
  private readonly consultaMs: number;
  private actual: string | null = null;

  constructor(bus: Bus, cliente: ClienteByte, opciones: { consultaMs: number }) {
    this.bus = bus;
    this.cliente = cliente;
    this.consultaMs = opciones.consultaMs;
  }

  /** Hay un juego programándose. */
  get ocupado(): boolean {
    return this.actual !== null;
  }

  seguir(id: string): void {
    this.actual = id;
    void this.consultar(id);
  }

  private async consultar(id: string): Promise<void> {
    let fallos = 0;
    let avisoRespaldo = false;
    while (this.actual === id) {
      await esperar(this.consultaMs);
      try {
        const { estado, respaldo } = await this.cliente.estadoJuego(id);
        fallos = 0;
        if (respaldo && !avisoRespaldo) {
          avisoRespaldo = true;
          this.bus.emit('juego:respaldo', { id, titulo: respaldo });
        }
        if (estado === 'listo') {
          const html = await this.cliente.htmlJuego(id);
          this.terminar(id, () => this.bus.emit('juego:listo', { id, html }));
        } else if (estado === 'error') {
          this.terminar(id, () => this.bus.emit('juego:error', id));
        }
      } catch (error) {
        console.warn('[juego] No se pudo consultar el estado:', error);
        if (++fallos >= FALLOS_MAXIMOS) this.terminar(id, () => this.bus.emit('juego:error', id));
      }
    }
  }

  private terminar(id: string, avisar: () => void): void {
    if (this.actual !== id) return;
    this.actual = null;
    avisar();
  }
}
