import type { ConfigOcurrencias } from './config';
import type { Bus } from './core/eventos';
import { frases } from './cerebro/frases';
import { azar } from './util/matematica';

/**
 * Cosas que Byte dice por su cuenta, sin gastar API:
 * llama la atención si nadie le habla y se queja de que lo miran mientras programa.
 */
export class Ocurrencias {
  private readonly opciones: ConfigOcurrencias;
  private readonly comentar: (texto: string) => void;
  private llamado = 0;
  private quejas: number[] = [];
  private programando = false;
  private jugando = false;

  constructor(bus: Bus, comentar: (texto: string) => void, opciones: ConfigOcurrencias) {
    this.comentar = comentar;
    this.opciones = opciones;

    bus.on('estado:cambio', ({ actual }) => {
      clearTimeout(this.llamado);
      if (actual === 'idle') this.programarLlamado();
      if (actual === 'programando' && !this.programando) this.empezarQuejas();
    });
    bus.on('juego:abierto', () => {
      this.jugando = true;
    });
    bus.on('juego:cerrado', () => {
      this.jugando = false;
    });
    // Un juego terminado cierra la "sesión de programación" y sus quejas pendientes.
    const terminarProgramacion = () => {
      this.programando = false;
      this.quejas.forEach(clearTimeout);
      this.quejas = [];
    };
    bus.on('juego:listo', terminarProgramacion);
    bus.on('juego:error', terminarProgramacion);
  }

  private programarLlamado(): void {
    const [min, max] = this.opciones.llamarAtencionS;
    this.llamado = window.setTimeout(() => {
      // Si están jugando, mejor no interrumpir: se vuelve a probar más tarde.
      if (this.jugando) this.programarLlamado();
      else this.comentar(frases.llamarAtencion());
    }, azar(min, max) * 1000);
  }

  private empezarQuejas(): void {
    this.programando = true;
    this.quejas = this.opciones.quejasProgramandoS.map((segundos) =>
      window.setTimeout(() => this.comentar(frases.quejaProgramando()), segundos * 1000),
    );
  }
}
