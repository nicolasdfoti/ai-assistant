import type { ConfigTeclas } from '../config';
import type { Bus } from '../core/eventos';
import { alternarPantallaCompleta } from '../ui/pantallaCompleta';

/**
 * Traduce el teclado a eventos del bus. Un botón físico que emule una tecla
 * (o cualquier otra fuente que emita `ptt:*`) funciona sin tocar el resto.
 */
export class Controles {
  private readonly bus: Bus;
  private readonly teclas: ConfigTeclas;
  private pttActivo = false;

  constructor(bus: Bus, teclas: ConfigTeclas) {
    this.bus = bus;
    this.teclas = teclas;
    window.addEventListener('keydown', (e) => this.alPresionar(e));
    window.addEventListener('keyup', (e) => this.alSoltar(e));
    // Si la ventana pierde el foco con la barra apretada, que no quede escuchando para siempre.
    window.addEventListener('blur', () => this.soltarPtt());
  }

  private alPresionar(e: KeyboardEvent): void {
    if (e.code === this.teclas.pushToTalk) {
      e.preventDefault();
      if (!this.pttActivo) {
        this.pttActivo = true;
        this.bus.emit('ptt:presionado');
      }
      return;
    }
    if (e.repeat) return;

    const estado = this.teclas.debugEstados[e.code];
    if (estado) this.bus.emit('debug:estado', estado);
    else if (e.code === this.teclas.cerrarJuego) this.bus.emit('juego:cerrar');
    else if (e.code === this.teclas.juegoRespaldo) this.bus.emit('juego:pedirRespaldo');
    else if (e.code === this.teclas.hud) this.bus.emit('debug:hud');
    else if (e.code === this.teclas.pantallaCompleta) alternarPantallaCompleta();
  }

  private alSoltar(e: KeyboardEvent): void {
    if (e.code === this.teclas.pushToTalk) this.soltarPtt();
  }

  private soltarPtt(): void {
    if (!this.pttActivo) return;
    this.pttActivo = false;
    this.bus.emit('ptt:soltado');
  }
}
