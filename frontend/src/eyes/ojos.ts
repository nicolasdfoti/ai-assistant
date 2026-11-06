import type { Bus, Estado } from '../core/eventos';
import { easeInOutCubic, suavizar } from '../util/matematica';
import { crearComportamientos, type Comportamiento, type ContextoOjos } from './comportamientos';
import { Parpadeo } from './parpadeo';
import { mezclarCara, type PoseCara } from './pose';
import { RendererOjos } from './renderer';

export interface OpcionesOjos {
  transicionMs: number;
  mouseInactivoS: number;
  /** Hacia dónde queda el juego, visto desde los ojos (-1..1). */
  focoJuego: { x: number; y: number };
}

interface Activo {
  comportamiento: Comportamiento;
  desde: number;
}

/**
 * Controlador de los ojos: escucha el bus, elige el comportamiento según el estado,
 * hace el fundido entre estados y le pasa la pose final al renderer.
 */
export class Ojos {
  private readonly renderer: RendererOjos;
  private readonly comportamientos = crearComportamientos();
  private readonly parpadeo = new Parpadeo();
  private readonly opciones: OpcionesOjos;

  private actual: Activo;
  private anterior: Activo | null = null;
  private inicioTransicion = 0;
  private t = 0;
  private voz = 0;
  private vozObjetivo = 0;
  private mouse = { x: 0, y: 0 };
  private ultimoMouse = -Infinity;
  private foco: { x: number; y: number } | null = null;
  /** Última pose calculada (sin parpadeo), para arrancar transiciones desde ahí. */
  private ultimaCara: PoseCara | null = null;

  constructor(contenedor: HTMLElement, bus: Bus, opciones: OpcionesOjos, estadoInicial: Estado = 'idle') {
    this.renderer = new RendererOjos(contenedor);
    this.opciones = opciones;
    this.actual = { comportamiento: this.comportamientos[estadoInicial], desde: 0 };
    this.actual.comportamiento.entrar?.();

    bus.on('estado:cambio', ({ actual }) => this.cambiar(actual));
    bus.on('voz:nivel', (nivel) => {
      this.vozObjetivo = nivel;
    });
    bus.on('juego:abierto', () => {
      this.foco = opciones.focoJuego;
    });
    bus.on('juego:cerrado', () => {
      this.foco = null;
    });
    window.addEventListener('pointermove', (e) => {
      this.mouse = { x: (e.clientX / innerWidth) * 2 - 1, y: (e.clientY / innerHeight) * 2 - 1 };
      this.ultimoMouse = this.t;
    });
  }

  iniciar(): void {
    let previo = performance.now();
    const cuadro = (ahora: number) => {
      const dt = Math.min((ahora - previo) / 1000, 0.1);
      previo = ahora;
      this.t += dt;
      this.renderer.dibujar(this.calcularCara(dt), this.t);
      requestAnimationFrame(cuadro);
    };
    requestAnimationFrame(cuadro);
  }

  private cambiar(estado: Estado): void {
    const siguiente = this.comportamientos[estado];
    if (siguiente === this.actual.comportamiento) return;
    siguiente.entrar?.();
    // Si cambia a mitad de una transición, el fundido sigue desde lo que se ve, sin saltos.
    this.anterior = this.anterior && this.ultimaCara ? congelado(this.ultimaCara, this.t) : this.actual;
    this.actual = { comportamiento: siguiente, desde: this.t };
    this.inicioTransicion = this.t;
  }

  private calcularCara(dt: number): PoseCara {
    // La voz sube rápido y baja más lento, como un vúmetro.
    this.voz = suavizar(this.voz, this.vozObjetivo, this.vozObjetivo > this.voz ? 35 : 12, dt);
    const mouseActivo = this.t - this.ultimoMouse < this.opciones.mouseInactivoS;
    const base = { t: this.t, dt, voz: this.voz, mouse: mouseActivo ? this.mouse : null, foco: this.foco };

    let cara = this.poseDe(this.actual, base);
    if (this.anterior) {
      const k = (this.t - this.inicioTransicion) / (this.opciones.transicionMs / 1000);
      if (k >= 1) {
        this.anterior = null;
      } else {
        cara = mezclarCara(this.poseDe(this.anterior, base), cara, easeInOutCubic(k));
      }
    }

    this.ultimaCara = cara;
    const parpadeo = this.parpadeo.factor(this.t, this.actual.comportamiento.parpadeo);
    return {
      izq: { ...cara.izq, apertura: cara.izq.apertura * parpadeo },
      der: { ...cara.der, apertura: cara.der.apertura * parpadeo },
    };
  }

  private poseDe(activo: Activo, base: Omit<ContextoOjos, 'enEstado'>): PoseCara {
    return activo.comportamiento.actualizar({ ...base, enEstado: this.t - activo.desde });
  }
}

/** Un "comportamiento" quieto en una pose fija: el punto de partida de un fundido interrumpido. */
function congelado(pose: PoseCara, desde: number): Activo {
  return { comportamiento: { parpadeo: null, actualizar: () => pose }, desde };
}
