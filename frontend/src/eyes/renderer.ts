import { limitar } from '../util/matematica';
import type { PoseCara, PoseOjo } from './pose';

const NS = 'http://www.w3.org/2000/svg';

/** Geometría en unidades del viewBox. */
const VISTA = { ancho: 1000, alto: 600 };
const OJO = { rx: 130, ry: 165, separacion: 195, radioIris: 56, radioPupila: 30 };
/** Altura (relativa al centro del ojo) donde se juntan los párpados al cerrarse. */
const CIERRE_Y = 18;
/** Grados por segundo que gira el espiral. */
const GIRO_ESPIRAL = 240;

type Atributos = Record<string, string | number>;

/** Para que varios renderers en la misma página no compartan ids de gradientes y recortes. */
let instancias = 0;

function crear<K extends keyof SVGElementTagNameMap>(
  tag: K,
  atributos: Atributos = {},
  padre?: Element,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(NS, tag);
  for (const [nombre, valor] of Object.entries(atributos)) el.setAttribute(nombre, String(valor));
  padre?.appendChild(el);
  return el;
}

/** Dibuja los ojos en un SVG. No sabe nada de estados: solo pinta poses. */
export class RendererOjos {
  private readonly izq: OjoSvg;
  private readonly der: OjoSvg;

  constructor(contenedor: HTMLElement) {
    const svg = crear('svg', {
      viewBox: `0 0 ${VISTA.ancho} ${VISTA.alto}`,
      class: 'ojos',
      role: 'img',
      'aria-label': 'Ojos de Byte',
    });
    const id = `byte${++instancias}`;
    const defs = crearDefs(svg, id);
    this.izq = new OjoSvg(svg, defs, id, 'izq', 1);
    this.der = new OjoSvg(svg, defs, id, 'der', -1);
    contenedor.appendChild(svg);
  }

  dibujar(cara: PoseCara, t: number): void {
    this.izq.dibujar(cara.izq, t);
    this.der.dibujar(cara.der, t);
  }
}

class OjoSvg {
  private readonly grupo: SVGGElement;
  private readonly recorteParpados: SVGPathElement;
  private readonly iris: SVGGElement;
  private readonly espiral: SVGGElement;
  private readonly centroX: number;
  /** +1 para el ojo izquierdo (en pantalla), -1 para el derecho. Sirve para espejar. */
  private readonly lado: 1 | -1;

  constructor(svg: SVGSVGElement, defs: SVGDefsElement, prefijo: string, nombre: string, lado: 1 | -1) {
    const id = `${prefijo}-${nombre}`;
    this.lado = lado;
    this.centroX = VISTA.ancho / 2 - lado * OJO.separacion;

    const clipForma = crear('clipPath', { id: `${id}-forma` }, defs);
    crear('ellipse', { rx: OJO.rx, ry: OJO.ry }, clipForma);
    const clipParpados = crear('clipPath', { id: `${id}-parpados` }, defs);
    this.recorteParpados = crear('path', {}, clipParpados);

    // El brillo va por fuera de los recortes, así el halo sigue la forma visible del ojo.
    this.grupo = crear('g', {}, svg);
    const brillo = crear('g', { filter: `url(#${prefijo}-brillo)` }, this.grupo);
    const abierto = crear('g', { 'clip-path': `url(#${id}-parpados)` }, brillo);
    const forma = crear('g', { 'clip-path': `url(#${id}-forma)` }, abierto);

    crear('ellipse', { rx: OJO.rx, ry: OJO.ry, fill: `url(#${prefijo}-esclerotica)` }, forma);

    this.iris = crear('g', {}, forma);
    crear('circle', { r: OJO.radioIris, fill: `url(#${prefijo}-iris)` }, this.iris);
    crear('circle', { r: OJO.radioPupila, fill: '#070b18' }, this.iris);
    crear('circle', { r: 11, cx: -19, cy: -21, fill: '#fff' }, this.iris);
    crear('circle', { r: 5, cx: 14, cy: 16, fill: '#fff', opacity: 0.7 }, this.iris);

    this.espiral = crear('g', {}, forma);
    crear(
      'path',
      {
        d: caminoEspiral(OJO.radioIris + 14, 3.5),
        fill: 'none',
        stroke: '#101a3a',
        'stroke-width': 9,
        'stroke-linecap': 'round',
      },
      this.espiral,
    );
  }

  dibujar(p: PoseOjo, t: number): void {
    const cx = this.centroX + p.dx;
    const cy = VISTA.alto / 2 + p.dy;
    this.grupo.setAttribute('transform', `translate(${cx} ${cy}) scale(${p.escala})`);
    this.recorteParpados.setAttribute('d', caminoParpados(p.apertura, p.ceno * this.lado));

    // La mirada se limita a un círculo para que el iris no se escape en diagonal.
    const largo = Math.max(1, Math.hypot(p.mirarX, p.mirarY));
    const radioIris = OJO.radioIris * p.pupila;
    const px = (p.mirarX / largo) * Math.max(0, OJO.rx - radioIris - 6);
    const py = (p.mirarY / largo) * Math.max(0, OJO.ry - radioIris - 6);

    this.iris.setAttribute('transform', `translate(${px} ${py}) scale(${p.pupila})`);
    this.iris.setAttribute('opacity', String(1 - p.espiral));

    this.espiral.setAttribute('display', p.espiral > 0.01 ? 'inline' : 'none');
    this.espiral.setAttribute('opacity', String(p.espiral));
    this.espiral.setAttribute(
      'transform',
      `translate(${px} ${py}) rotate(${t * GIRO_ESPIRAL * this.lado}) scale(${p.pupila})`,
    );
  }
}

/**
 * Zona visible entre los dos párpados. El superior se inclina según `inclinacion`
 * (grados, ya espejados para cada ojo); ambos se curvan un poco como un ojo real.
 */
function caminoParpados(apertura: number, inclinacion: number): string {
  const a = limitar(apertura, 0, 1);
  const ancho = OJO.rx + 20;
  const alto = OJO.ry + 25;
  // Con el ojo casi cerrado se endereza el párpado, si no queda una cuña rara.
  const m = Math.tan((inclinacion * Math.PI) / 180) * Math.min(1, a / 0.35);
  const arriba = CIERRE_Y - (alto + CIERRE_Y) * a;
  const abajo = CIERRE_Y + (alto - CIERRE_Y) * a;
  // Raíz cuadrada: los ojos entrecerrados mantienen forma de almendra.
  const curva = 42 * Math.sqrt(a);

  return [
    `M${-ancho} ${arriba - m * ancho}`,
    `Q0 ${arriba - 2 * curva} ${ancho} ${arriba + m * ancho}`,
    `L${ancho} ${abajo}`,
    `Q0 ${abajo + 2 * curva} ${-ancho} ${abajo}`,
    'Z',
  ].join(' ');
}

function caminoEspiral(radio: number, vueltas: number): string {
  const pasos = Math.round(vueltas * 40);
  const puntos: string[] = [];
  for (let i = 0; i <= pasos; i++) {
    const k = i / pasos;
    const angulo = k * vueltas * Math.PI * 2;
    puntos.push(`${(Math.cos(angulo) * k * radio).toFixed(1)} ${(Math.sin(angulo) * k * radio).toFixed(1)}`);
  }
  return `M${puntos.join(' L')}`;
}

function crearDefs(svg: SVGSVGElement, prefijo: string): SVGDefsElement {
  const defs = crear('defs', {}, svg);

  const iris = crear('radialGradient', { id: `${prefijo}-iris`, cx: '40%', cy: '35%', r: '70%' }, defs);
  crear('stop', { offset: '0%', 'stop-color': '#8ff6ff' }, iris);
  crear('stop', { offset: '55%', 'stop-color': '#1fb6ff' }, iris);
  crear('stop', { offset: '100%', 'stop-color': '#0a4fd0' }, iris);

  const esclerotica = crear('radialGradient', { id: `${prefijo}-esclerotica`, cx: '50%', cy: '45%', r: '60%' }, defs);
  crear('stop', { offset: '70%', 'stop-color': '#f4f8ff' }, esclerotica);
  crear('stop', { offset: '100%', 'stop-color': '#c4d3f2' }, esclerotica);

  const brillo = crear('filter', { id: `${prefijo}-brillo`, x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
  crear('feGaussianBlur', { in: 'SourceGraphic', stdDeviation: 14, result: 'difuso' }, brillo);
  crear(
    'feColorMatrix',
    {
      in: 'difuso',
      type: 'matrix',
      values: '0 0 0 0 0.35  0 0 0 0 0.8  0 0 0 0 1  0 0 0 0.7 0',
      result: 'halo',
    },
    brillo,
  );
  const mezcla = crear('feMerge', {}, brillo);
  crear('feMergeNode', { in: 'halo' }, mezcla);
  crear('feMergeNode', { in: 'SourceGraphic' }, mezcla);

  return defs;
}
