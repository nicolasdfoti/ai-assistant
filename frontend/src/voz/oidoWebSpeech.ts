import type { Bus } from '../core/eventos';
import type { Oido } from './tipos';

/** Lo mínimo que usamos de SpeechRecognition (TypeScript no la declara). */
interface Reconocedor {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type ConstructorReconocedor = new () => Reconocedor;

export interface OpcionesOido {
  idioma: string;
  /** Cuánto esperar el resultado final después de soltar el botón. */
  esperaFinalMs: number;
}

/**
 * Reconocimiento con la Web Speech API de Chrome (necesita internet).
 * Mientras el botón está apretado acumula texto; si Chrome corta la sesión
 * sola (silencios largos), la vuelve a abrir.
 */
export class OidoWebSpeech implements Oido {
  private readonly bus: Bus;
  private readonly opciones: OpcionesOido;
  private readonly reconocedor: Reconocedor | null;
  private botonApretado = false;
  private corriendo = false;
  /** Texto de sesiones anteriores (si Chrome cortó y se reabrió). */
  private acumulado = '';
  private sesion = '';
  private alTerminar: (() => void) | null = null;

  constructor(bus: Bus, opciones: OpcionesOido) {
    this.bus = bus;
    this.opciones = opciones;
    const ventana = window as unknown as Record<string, ConstructorReconocedor | undefined>;
    const Constructor = ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition;
    this.reconocedor = Constructor ? this.crear(Constructor) : null;
    if (!this.reconocedor) console.warn('[oido] Este navegador no soporta reconocimiento de voz. Usá Chrome.');
  }

  private get texto(): string {
    return `${this.acumulado} ${this.sesion}`.trim();
  }

  empezar(): void {
    if (!this.reconocedor || this.botonApretado) return;
    this.botonApretado = true;
    this.acumulado = '';
    this.sesion = '';
    // Si la sesión anterior todavía está cerrando, se reabre sola en `onend`.
    if (!this.corriendo) this.arrancar();
  }

  terminar(): Promise<string> {
    this.botonApretado = false;
    if (!this.reconocedor || !this.corriendo) return Promise.resolve(this.texto);

    return new Promise((resolve) => {
      const listo = () => {
        clearTimeout(limite);
        this.alTerminar = null;
        resolve(this.texto);
      };
      // Si Chrome no entrega el resultado final a tiempo, se usa lo que haya.
      const limite = setTimeout(() => {
        this.reconocedor?.abort();
        listo();
      }, this.opciones.esperaFinalMs);
      this.alTerminar = listo;
      this.reconocedor?.stop();
    });
  }

  private crear(Constructor: ConstructorReconocedor): Reconocedor {
    const r = new Constructor();
    r.lang = this.opciones.idioma;
    r.continuous = true;
    r.interimResults = true;

    r.onresult = (e) => {
      this.sesion = Array.from(e.results, (resultado) => resultado[0].transcript).join(' ').trim();
      this.bus.emit('oido:parcial', this.texto);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed') console.error('[oido] Chrome no tiene permiso para usar el micrófono.');
      else if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('[oido] Error:', e.error);
    };
    r.onend = () => {
      this.corriendo = false;
      this.acumulado = this.texto;
      this.sesion = '';
      if (this.botonApretado) this.arrancar();
      else this.alTerminar?.();
    };
    return r;
  }

  private arrancar(): void {
    try {
      this.reconocedor?.start();
      this.corriendo = true;
    } catch (error) {
      console.warn('[oido] No se pudo arrancar el reconocimiento:', error);
    }
  }
}
