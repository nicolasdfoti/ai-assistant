import type { Bus, Estado } from './eventos';

/** Fuente única de verdad sobre qué está haciendo Byte. */
export class MaquinaEstados {
  private estado: Estado;
  private readonly bus: Bus;

  constructor(bus: Bus, inicial: Estado = 'idle') {
    this.bus = bus;
    this.estado = inicial;
  }

  get actual(): Estado {
    return this.estado;
  }

  cambiar(nuevo: Estado): void {
    if (nuevo === this.estado) return;
    const anterior = this.estado;
    this.estado = nuevo;
    this.bus.emit('estado:cambio', { anterior, actual: nuevo });
  }
}
