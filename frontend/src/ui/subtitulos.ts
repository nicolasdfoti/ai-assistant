import type { Bus } from '../core/eventos';

/** Segundos que queda el último subtítulo después de que Byte vuelve a idle. */
const PERMANENCIA_MS = 2500;

/**
 * Subtítulos abajo de los ojos: lo que Byte va entendiendo y lo que responde.
 * En un stand ruidoso ayudan a seguir la charla.
 */
export class Subtitulos {
  private readonly el: HTMLElement;
  private ocultar = 0;

  constructor(contenedor: HTMLElement, bus: Bus) {
    this.el = document.createElement('div');
    this.el.className = 'subtitulos';
    contenedor.appendChild(this.el);

    bus.on('oido:parcial', (texto) => this.mostrar(texto, 'visitante'));
    bus.on('visitante:dijo', (texto) => this.mostrar(texto, 'visitante'));
    bus.on('byte:dice', (texto) => this.mostrar(texto, 'byte'));
    bus.on('estado:cambio', ({ actual }) => {
      if (actual === 'escuchando') this.mostrar('', 'visitante');
      if (actual === 'idle') this.ocultar = window.setTimeout(() => this.mostrar('', 'byte'), PERMANENCIA_MS);
    });
  }

  private mostrar(texto: string, quien: 'visitante' | 'byte'): void {
    clearTimeout(this.ocultar);
    this.el.textContent = texto;
    this.el.dataset.quien = quien;
    this.el.classList.toggle('visible', texto.length > 0);
  }
}
