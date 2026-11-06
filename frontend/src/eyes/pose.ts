/** Descripción completa de un ojo en un instante. Todo es numérico para poder interpolar. */
export interface PoseOjo {
  /** Párpados: 0 cerrado, 1 abierto del todo. */
  apertura: number;
  /** Tamaño global del ojo (1 = normal). */
  escala: number;
  /** Hacia dónde mira, -1..1 en cada eje (y positivo = abajo). */
  mirarX: number;
  mirarY: number;
  /** Tamaño del iris (1 = normal). */
  pupila: number;
  /** Inclinación del párpado en grados. Positivo = ceño fruncido, negativo = preocupado. */
  ceno: number;
  /** Opacidad del espiral hipnótico, 0..1. */
  espiral: number;
  /** Desplazamiento en unidades del viewBox (rebotes, temblores). */
  dx: number;
  dy: number;
}

export interface PoseCara {
  izq: PoseOjo;
  der: PoseOjo;
}

const POSE_BASE: Readonly<PoseOjo> = {
  apertura: 1,
  escala: 1,
  mirarX: 0,
  mirarY: 0,
  pupila: 1,
  ceno: 0,
  espiral: 0,
  dx: 0,
  dy: 0,
};

export const pose = (cambios: Partial<PoseOjo> = {}): PoseOjo => ({ ...POSE_BASE, ...cambios });

/** Arma una cara; si no se pasa el ojo derecho, es una copia del izquierdo. */
export const cara = (izq: PoseOjo, der: PoseOjo = izq): PoseCara => ({ izq: { ...izq }, der: { ...der } });

export function mezclarOjo(a: PoseOjo, b: PoseOjo, k: number): PoseOjo {
  const r = { ...a };
  for (const clave of Object.keys(r) as (keyof PoseOjo)[]) {
    r[clave] = a[clave] + (b[clave] - a[clave]) * k;
  }
  return r;
}

export const mezclarCara = (a: PoseCara, b: PoseCara, k: number): PoseCara => ({
  izq: mezclarOjo(a.izq, b.izq, k),
  der: mezclarOjo(a.der, b.der, k),
});
