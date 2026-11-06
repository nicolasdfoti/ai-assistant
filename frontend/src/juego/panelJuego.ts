import type { Bus } from '../core/eventos';

export interface OpcionesPanel {
  /** Teclas que el juego le reenvía a Byte (push-to-talk, cerrar). */
  teclasDeByte: readonly string[];
  cerrarInactivoMs: number;
}

interface MensajeDelJuego {
  tipo: 'byte:tecla' | 'byte:actividad';
  evento?: 'keydown' | 'keyup';
  code?: string;
  repeat?: boolean;
}

/**
 * Muestra el juego dentro de la página de Byte, en un iframe aislado.
 * Mientras se juega, el foco está en el iframe: un script inyectado le reenvía
 * a Byte sus teclas (como el push-to-talk) para que el botón siga funcionando.
 */
export class PanelJuego {
  private readonly bus: Bus;
  private readonly opciones: OpcionesPanel;
  private panel: HTMLElement | null = null;
  private iframe: HTMLIFrameElement | null = null;
  private inactividad = 0;

  constructor(bus: Bus, opciones: OpcionesPanel) {
    this.bus = bus;
    this.opciones = opciones;
    bus.on('juego:listo', ({ html }) => this.mostrar(html));
    bus.on('juego:cerrar', () => this.cerrar());
    window.addEventListener('message', (e) => this.alRecibir(e));
  }

  mostrar(html: string): void {
    this.cerrar();
    const panel = document.createElement('div');
    panel.className = 'panel-juego';
    const iframe = document.createElement('iframe');
    // Sin allow-same-origin: el código generado no puede tocar la página de Byte.
    iframe.sandbox.add('allow-scripts');
    iframe.title = 'Juego programado por Byte';
    iframe.srcdoc = inyectarPuente(html, this.opciones.teclasDeByte);
    iframe.addEventListener('load', () => iframe.focus());
    panel.appendChild(iframe);
    document.body.appendChild(panel);
    document.body.classList.add('jugando');

    this.panel = panel;
    this.iframe = iframe;
    this.reiniciarInactividad();
    this.bus.emit('juego:abierto');
  }

  cerrar(): void {
    if (!this.panel) return;
    clearTimeout(this.inactividad);
    this.panel.remove();
    this.panel = null;
    this.iframe = null;
    document.body.classList.remove('jugando');
    this.bus.emit('juego:cerrado');
  }

  private alRecibir(e: MessageEvent): void {
    if (!this.iframe || e.source !== this.iframe.contentWindow) return;
    const mensaje = e.data as MensajeDelJuego;
    this.reiniciarInactividad();
    if (mensaje.tipo === 'byte:tecla' && mensaje.evento && mensaje.code) {
      // Se re-emite como si la tecla se hubiera apretado en la página de Byte.
      window.dispatchEvent(new KeyboardEvent(mensaje.evento, { code: mensaje.code, repeat: mensaje.repeat }));
    }
  }

  private reiniciarInactividad(): void {
    clearTimeout(this.inactividad);
    this.inactividad = window.setTimeout(() => this.cerrar(), this.opciones.cerrarInactivoMs);
  }
}

/** Script que va dentro del juego: reenvía las teclas de Byte y avisa que hay actividad. */
function inyectarPuente(html: string, teclas: readonly string[]): string {
  const script = `<script>(() => {
  const deByte = new Set(${JSON.stringify(teclas)});
  for (const evento of ['keydown', 'keyup']) {
    addEventListener(evento, (e) => {
      if (deByte.has(e.code)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        parent.postMessage({ tipo: 'byte:tecla', evento, code: e.code, repeat: e.repeat }, '*');
      } else if (evento === 'keydown') {
        parent.postMessage({ tipo: 'byte:actividad' }, '*');
      }
    }, true);
  }
  // Por si el juego midió la ventana antes de que el panel terminara de acomodarse.
  addEventListener('load', () => setTimeout(() => dispatchEvent(new Event('resize')), 300));
})();</script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, () => `${script}</body>`) : html + script;
}
