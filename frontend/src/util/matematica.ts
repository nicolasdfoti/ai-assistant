export const azar = (min: number, max: number): number => min + Math.random() * (max - min);

export const limitar = (v: number, min: number, max: number): number => Math.min(Math.max(v, min), max);

/**
 * Acerca `actual` a `objetivo` de forma exponencial e independiente de los FPS.
 * `velocidad` alta = movimiento rápido (≈ 1/velocidad segundos para llegar al 63%).
 */
export const suavizar = (actual: number, objetivo: number, velocidad: number, dt: number): number =>
  actual + (objetivo - actual) * (1 - Math.exp(-velocidad * dt));

export const easeInOutCubic = (k: number): number =>
  k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
