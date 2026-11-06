export interface RespuestaByte {
  texto: string;
  /** Id del juego que se empezó a programar, o null si no hay ninguno. */
  juegoId: string | null;
  origen: 'claude' | 'respaldo';
}

export interface EstadoJuego {
  estado: 'generando' | 'listo' | 'error';
  /** Título del juego de respaldo, si Claude no llegó. */
  respaldo: string | null;
}

/** Lo que devuelve POST /hablar del backend. */
interface RespuestaApi {
  respuesta: string;
  juego_id: string | null;
  origen: 'claude' | 'respaldo';
}

export interface OpcionesCliente {
  url: string;
  timeoutMs: number;
}

/** Cliente HTTP del backend de Byte. */
export class ClienteByte {
  private readonly opciones: OpcionesCliente;

  constructor(opciones: OpcionesCliente) {
    this.opciones = opciones;
  }

  async hablar(texto: string): Promise<RespuestaByte> {
    const datos = await this.pedir<RespuestaApi>('/hablar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto }),
    });
    return { texto: datos.respuesta, juegoId: datos.juego_id, origen: datos.origen };
  }

  estadoJuego(id: string): Promise<EstadoJuego> {
    return this.pedir<EstadoJuego>(`/juegos/${encodeURIComponent(id)}`);
  }

  /** Pide un juego de respaldo sin pasar por Claude. Devuelve su id. */
  async pedirRespaldo(): Promise<string> {
    const datos = await this.pedir<{ id: string }>('/juegos/respaldo', { method: 'POST' });
    return datos.id;
  }

  async htmlJuego(id: string): Promise<string> {
    const respuesta = await this.fetch(`/juegos/${encodeURIComponent(id)}/html`);
    return respuesta.text();
  }

  private async pedir<T>(ruta: string, init?: RequestInit): Promise<T> {
    const respuesta = await this.fetch(ruta, init);
    return (await respuesta.json()) as T;
  }

  private async fetch(ruta: string, init?: RequestInit): Promise<Response> {
    const respuesta = await fetch(`${this.opciones.url}${ruta}`, {
      ...init,
      signal: AbortSignal.timeout(this.opciones.timeoutMs),
    });
    if (!respuesta.ok) throw new Error(`El backend respondió ${respuesta.status} en ${ruta}`);
    return respuesta;
  }
}
