import type { Estado } from '../../core/eventos';
import { Durmiendo } from './durmiendo';
import { Escuchando } from './escuchando';
import { Hablando } from './hablando';
import { Idle } from './idle';
import { Pensando } from './pensando';
import { Programando } from './programando';
import type { Comportamiento } from './tipos';

export function crearComportamientos(): Record<Estado, Comportamiento> {
  return {
    durmiendo: new Durmiendo(),
    idle: new Idle(),
    escuchando: new Escuchando(),
    pensando: new Pensando(),
    hablando: new Hablando(),
    programando: new Programando(),
  };
}

export type { Comportamiento, ContextoOjos } from './tipos';
