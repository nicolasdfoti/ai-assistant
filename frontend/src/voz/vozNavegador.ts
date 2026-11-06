import type { EnvolventeSintetica } from './envolventeSintetica';
import type { Voz } from './tipos';

export interface OpcionesVoz {
  idioma: string;
  velocidad: number;
  tono: number;
  /** Parte del nombre de una voz para forzarla (ej. "Sabina"). Vacío = elegir sola. */
  preferida: string;
}

/** Idiomas aceptables, del más parecido al rioplatense al menos. */
const CERCANIA = ['es-AR', 'es-419', 'es-UY', 'es-US', 'es-MX'];

/** Voz con speechSynthesis del navegador. */
export class VozNavegador implements Voz {
  private readonly envolvente: EnvolventeSintetica;
  private readonly opciones: OpcionesVoz;
  private voz: SpeechSynthesisVoice | null = null;
  // Chrome a veces no dispara `end` si el utterance se recolecta: hay que guardarlo.
  private actual: SpeechSynthesisUtterance | null = null;

  constructor(envolvente: EnvolventeSintetica, opciones: OpcionesVoz) {
    this.envolvente = envolvente;
    this.opciones = opciones;
    this.elegirVoz();
    speechSynthesis.addEventListener('voiceschanged', () => this.elegirVoz());
  }

  decir(texto: string): Promise<void> {
    this.callar();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(texto);
      u.lang = this.voz?.lang ?? this.opciones.idioma;
      u.voice = this.voz;
      u.rate = this.opciones.velocidad;
      u.pitch = this.opciones.tono;

      const fin = () => {
        clearTimeout(limite);
        if (this.actual === u) this.actual = null;
        this.envolvente.detener();
        resolve();
      };
      // Red de seguridad por si Chrome nunca avisa que terminó.
      const limite = setTimeout(fin, 4000 + texto.length * 120);
      u.onstart = () => this.envolvente.iniciar();
      u.onend = fin;
      u.onerror = fin;

      this.actual = u;
      speechSynthesis.speak(u);
    });
  }

  callar(): void {
    if (speechSynthesis.speaking || speechSynthesis.pending) speechSynthesis.cancel();
  }

  private elegirVoz(): void {
    const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
    if (!voces.length) return;
    const { preferida } = this.opciones;
    const porNombre = preferida && voces.find((v) => v.name.toLowerCase().includes(preferida.toLowerCase()));
    const porIdioma = CERCANIA.map((idioma) => voces.find((v) => v.lang === idioma)).find(Boolean);
    this.voz = porNombre || porIdioma || voces[0];
    console.info(
      `[voz] Usando "${this.voz.name}" (${this.voz.lang}). Disponibles:`,
      voces.map((v) => `${v.name} (${v.lang})`),
    );
  }
}
