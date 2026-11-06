import type { Bus } from '../core/eventos';

/**
 * Inventa un nivel de voz (sílabas y pausas entre palabras) para que los ojos reboten.
 * Lo usa la voz del navegador, que no expone el audio; con ElevenLabs se puede
 * reemplazar por el nivel real medido con un AnalyserNode.
 */
export class EnvolventeSintetica {
  private readonly bus: Bus;
  private raf = 0;

  constructor(bus: Bus) {
    this.bus = bus;
  }

  iniciar(): void {
    if (this.raf) return;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = (ahora - inicio) / 1000;
      const silaba = Math.max(0, Math.sin(t * Math.PI * 2 * 5));
      const enPalabra = t % 1.6 < 1.2 ? 1 : 0;
      const entonacion = 0.65 + 0.35 * Math.sin(t * 1.7) * Math.sin(t * 3.1);
      this.bus.emit('voz:nivel', silaba * enPalabra * entonacion);
      this.raf = requestAnimationFrame(paso);
    };
    this.raf = requestAnimationFrame(paso);
  }

  detener(): void {
    if (!this.raf) return;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.bus.emit('voz:nivel', 0);
  }
}
