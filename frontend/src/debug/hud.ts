import type { Bus, Estado } from '../core/eventos';

const AYUDA = '0-5 estados · espacio: hablar · J: juego de respaldo · Esc: cerrar juego · F: pantalla completa · H: ocultar';

/** Cartelito de desarrollo con el estado actual y los atajos. Se oculta con H. */
export class Hud {
  private readonly estado: HTMLElement;

  constructor(
    contenedor: HTMLElement,
    bus: Bus,
    opciones: { visible: boolean; avisos: string[]; estadoInicial: Estado },
  ) {
    const hud = document.createElement('div');
    hud.className = 'hud';
    hud.hidden = !opciones.visible;

    this.estado = document.createElement('strong');
    this.estado.textContent = opciones.estadoInicial;
    const ayuda = document.createElement('span');
    ayuda.textContent = [AYUDA, ...opciones.avisos].join(' · ');
    hud.append(this.estado, ayuda);
    contenedor.appendChild(hud);

    bus.on('estado:cambio', ({ actual }) => {
      this.estado.textContent = actual;
    });
    bus.on('debug:hud', () => {
      hud.hidden = !hud.hidden;
    });
  }
}
