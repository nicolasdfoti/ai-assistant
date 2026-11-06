/** Reconocimiento de voz con push-to-talk. */
export interface Oido {
  /** Empieza a escuchar (se apretó el botón). */
  empezar(): void;
  /** Deja de escuchar y devuelve lo que entendió ('' si no entendió nada). */
  terminar(): Promise<string>;
}

/** Voz de Byte. Implementaciones: navegador hoy, ElevenLabs más adelante. */
export interface Voz {
  /** Dice el texto y resuelve cuando termina (o cuando lo interrumpen). */
  decir(texto: string): Promise<void>;
  /** Corta lo que esté diciendo. */
  callar(): void;
}
