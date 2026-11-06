export interface OpcionesMusica {
  volumen: number;
  volumenBajo: number;
  fadeMs: number;
}

/** Música de fondo en loop (recorre todas las pistas), con fundidos para bajar el volumen. */
export class Musica {
  private readonly audio = new Audio();
  private readonly pistas: readonly string[];
  private readonly opciones: OpcionesMusica;
  private indice: number;
  private bajada = false;
  private sonando = false;
  private fade = 0;

  constructor(pistas: readonly string[], opciones: OpcionesMusica) {
    this.pistas = pistas;
    this.opciones = opciones;
    this.indice = Math.floor(Math.random() * pistas.length);
    this.audio.loop = pistas.length === 1;
    this.audio.addEventListener('ended', () => this.siguiente());
    this.audio.addEventListener('error', () => {
      console.warn(`[musica] No se pudo reproducir ${this.audio.src}`);
      if (this.pistas.length > 1) this.siguiente();
    });
  }

  get hayPistas(): boolean {
    return this.pistas.length > 0;
  }

  /** Hay que llamarlo después de un gesto del usuario (política de autoplay de Chrome). */
  async iniciar(): Promise<void> {
    if (!this.hayPistas || this.sonando) return;
    this.sonando = true;
    this.audio.volume = 0;
    this.audio.src = this.pistas[this.indice];
    try {
      await this.audio.play();
      this.fundirA(this.volumenObjetivo);
    } catch (error) {
      this.sonando = false;
      console.warn('[musica] El navegador no dejó reproducir:', error);
    }
  }

  bajar(): void {
    this.bajada = true;
    this.fundirA(this.volumenObjetivo);
  }

  subir(): void {
    this.bajada = false;
    this.fundirA(this.volumenObjetivo);
  }

  private get volumenObjetivo(): number {
    return this.bajada ? this.opciones.volumenBajo : this.opciones.volumen;
  }

  private siguiente(): void {
    this.indice = (this.indice + 1) % this.pistas.length;
    this.audio.src = this.pistas[this.indice];
    void this.audio.play().catch(() => {});
  }

  private fundirA(objetivo: number): void {
    if (!this.sonando) return;
    cancelAnimationFrame(this.fade);
    const desde = this.audio.volume;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const k = Math.min((ahora - inicio) / this.opciones.fadeMs, 1);
      this.audio.volume = desde + (objetivo - desde) * k;
      if (k < 1) this.fade = requestAnimationFrame(paso);
    };
    this.fade = requestAnimationFrame(paso);
  }
}
