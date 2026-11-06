type Handler<T> = (payload: T) => void;

/** Eventos sin payload se emiten sin argumentos: `bus.emit('ptt:presionado')`. */
type Argumentos<T> = [T] extends [void] ? [] : [payload: T];

/**
 * Bus de eventos tipado. Los módulos de Byte no se conocen entre sí:
 * solo emiten y escuchan eventos, así cualquier pieza se puede reemplazar.
 */
export class EventBus<E extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof E, Set<Handler<never>>>();

  /** Suscribe un handler. Devuelve la función para desuscribirse. */
  on<K extends keyof E>(evento: K, handler: Handler<E[K]>): () => void {
    const set = this.handlers.get(evento) ?? new Set();
    this.handlers.set(evento, set);
    set.add(handler);
    return () => set.delete(handler);
  }

  emit<K extends keyof E>(evento: K, ...args: Argumentos<E[K]>): void {
    for (const handler of this.handlers.get(evento) ?? []) {
      (handler as Handler<E[K]>)(args[0] as E[K]);
    }
  }
}
