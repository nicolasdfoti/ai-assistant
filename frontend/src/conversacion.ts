import type { ClienteByte, RespuestaByte } from './cerebro/clienteByte';
import { frases } from './cerebro/frases';
import type { Bus } from './core/eventos';
import type { MaquinaEstados } from './core/maquinaEstados';
import type { SeguidorJuego } from './juego/seguidorJuego';
import type { Oido, Voz } from './voz/tipos';

export interface DependenciasConversacion {
  bus: Bus;
  estados: MaquinaEstados;
  oido: Oido;
  voz: Voz;
  cliente: ClienteByte;
  seguidor: SeguidorJuego;
}

/**
 * El flujo de una charla: botón apretado → escuchar → pensar → hablar → idle
 * (o `programando`, si quedó un juego en curso).
 * Si aprietan el botón en cualquier momento, Byte se calla y vuelve a escuchar;
 * el juego se sigue programando de fondo.
 */
export class Conversacion {
  private readonly d: DependenciasConversacion;
  /** Cada vez que aprietan el botón empieza un turno nuevo y se descarta lo que estaba en vuelo. */
  private turno = 0;
  /** Juego de respaldo cuya excusa Byte ya dijo (para no repetirla). */
  private excusaDada: string | null = null;

  constructor(dependencias: DependenciasConversacion) {
    this.d = dependencias;
    const { bus } = dependencias;
    bus.on('ptt:presionado', () => this.escuchar());
    bus.on('ptt:soltado', () => void this.responder());
    bus.on('juego:listo', () => this.comentar(frases.juegoListo()));
    bus.on('juego:error', () => this.comentar(frases.juegoFallo()));
    bus.on('juego:respaldo', ({ id, titulo }) => {
      if (id !== this.excusaDada) this.comentar(frases.excusaRespaldo(titulo));
    });
    bus.on('juego:pedirRespaldo', () => void this.ponerRespaldo());
  }

  private escuchar(): void {
    this.turno++;
    this.d.voz.callar();
    this.d.estados.cambiar('escuchando');
    this.d.oido.empezar();
  }

  private async responder(): Promise<void> {
    const turno = this.turno;
    const texto = await this.d.oido.terminar();
    if (turno !== this.turno) return;

    if (!texto) {
      await this.decir(turno, frases.noTeEscuche());
      return;
    }

    this.d.bus.emit('visitante:dijo', texto);
    this.d.estados.cambiar('pensando');
    const respuesta = await this.preguntar(texto);
    if (turno !== this.turno) return;

    if (respuesta.juegoId) {
      this.d.seguidor.seguir(respuesta.juegoId);
      // Sin Claude, la respuesta misma ya es la excusa del juego de respaldo.
      if (respuesta.origen === 'respaldo') this.excusaDada = respuesta.juegoId;
    }
    await this.decir(turno, respuesta.texto);
  }

  /** Tecla del operador: pone un juego de respaldo sin pasar por Claude. */
  private async ponerRespaldo(): Promise<void> {
    if (this.d.seguidor.ocupado) return;
    const turno = ++this.turno;
    try {
      const id = await this.d.cliente.pedirRespaldo();
      this.d.seguidor.seguir(id);
      this.excusaDada = id;
      await this.decir(turno, frases.respaldoManual());
    } catch (error) {
      console.warn('[byte] No se pudo pedir un juego de respaldo:', error);
      await this.decir(turno, frases.sinBackend());
    }
  }

  private async preguntar(texto: string): Promise<RespuestaByte> {
    try {
      return await this.d.cliente.hablar(texto);
    } catch (error) {
      console.warn('[byte] No se pudo hablar con el backend:', error);
      return { texto: frases.sinBackend(), juegoId: null, origen: 'respaldo' };
    }
  }

  /** Saludo al despertarse. */
  saludar(): void {
    void this.decir(this.turno, frases.saludo());
  }

  /** Dice algo por su cuenta, salvo que esté en medio de una charla. */
  comentar(texto: string): void {
    const libre = this.d.estados.actual === 'programando' || this.d.estados.actual === 'idle';
    if (libre) void this.decir(this.turno, texto);
  }

  private async decir(turno: number, texto: string): Promise<void> {
    this.d.estados.cambiar('hablando');
    this.d.bus.emit('byte:dice', texto);
    await this.d.voz.decir(texto);
    if (turno === this.turno) this.d.estados.cambiar(this.d.seguidor.ocupado ? 'programando' : 'idle');
  }
}
