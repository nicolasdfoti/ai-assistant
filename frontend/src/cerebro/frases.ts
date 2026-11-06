/** Frases que Byte dice sin consultar al backend. */

/** Saca frases como de un mazo mezclado: no repite hasta haberlas dicho todas. */
function mazo(lista: readonly string[]): () => string {
  let restantes: string[] = [];
  let ultima = '';
  return () => {
    if (!restantes.length) {
      restantes = mezclar(lista);
      // Que la primera del mazo nuevo no sea la última del anterior.
      if (restantes.length > 1 && restantes[0] === ultima) restantes.push(restantes.shift()!);
    }
    ultima = restantes.shift()!;
    return ultima;
  };
}

/** Mezcla de Fisher-Yates. */
function mezclar<T>(lista: readonly T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

const SALUDO = mazo([
  '¡Ah! ¡Me quedé dormido en plena feria! Hola, soy Byte. Apretá el botón y hablame.',
  '¡Uy, perdón, estaba soñando con unos y ceros! Soy Byte. ¿Charlamos? Mantené apretado el botón.',
]);

const NO_TE_ESCUCHE = mazo([
  '¿Eh? No te escuché nada. Mantené apretado el botón mientras me hablás.',
  'Hay tanto ruido que no te entendí. ¿Me lo repetís?',
  '¡No te escuché! Apretá el botón, hablame, y después soltalo.',
]);

const SIN_BACKEND = mazo([
  '¡Uy! Perdí la conexión con mi cerebro. Avisale a alguien del stand, porfa.',
  'Mi cerebro no contesta, debe estar en el recreo. ¿Le avisás a alguien del stand?',
]);

const JUEGO_LISTO = mazo([
  '¡Terminé! Y sin errores... creo. Apretá Enter para empezar y movete con las flechas.',
  '¡Listo el juego! Fue durísimo, casi me derrito. Enter para arrancar, flechas para jugar.',
  '¡Ta-dá! Recién salido del horno. Enter para empezar, ¡y no me lo rompas!',
]);

const JUEGO_FALLO = mazo([
  '¡Ay no, se me mezclaron los cables y el juego no salió! ¿Me pedís otro?',
  'Me trabé programando, qué vergüenza. ¿Probamos con otro juego?',
]);

const EXCUSA_RESPALDO = mazo([
  '¡Ay, se me trabó la inspiración! Pero tengo {titulo} guardado, lo escribo de memoria.',
  '¡Mi cerebro se tildó! Por suerte me sé {titulo} de taquito. ¡Ahí va!',
  'Uh, esto se complicó... ¡Plan B! Les escribo {titulo}, un clásico de mi colección.',
]);

const RESPALDO_MANUAL = mazo([
  '¡Tengo un juego guardado bajo la manga! Lo escribo de memoria.',
  '¡Sorpresa! Les voy a escribir uno de mis juegos favoritos.',
]);

const QUEJA_PROGRAMANDO = mazo([
  '¡No me miren que me pongo nervioso!',
  'Siento tus ojos en la nuca... y eso que no tengo nuca.',
  '¿Nunca vieron a un robot programar? ¡Qué vergüenza!',
  'Shhh, que si me desconcentro le pongo un punto y coma de más.',
  '¡Ya casi! Bueno, ya casi casi. Bueno, falta un poquito.',
  'Si me sale bien, aplausos. Si me sale mal... no vieron nada.',
]);

const LLAMAR_ATENCION = mazo([
  '¡Psst! Vos, sí, vos. ¿Querés que te programe un juego?',
  'Me aburro... ¿Alguien me pide un juego? ¡Mantengan apretado el botón y hablen!',
  '¿Saben por qué la computadora fue al médico? ¡Porque tenía un virus!',
  'Soy Byte y programo juegos en vivo. ¡Pedime el que quieras!',
  '¿Qué le dijo un byte a otro byte? ¡Nos vemos en la memoria!',
  'Acá estoy, mirando gente pasar. ¿Nadie quiere charlar con un robot dramático?',
  '¿Por qué el robot cruzó la calle? Porque lo programaron así. ¡Ja! ¿Me pedís un juego?',
]);

export const frases = {
  saludo: SALUDO,
  noTeEscuche: NO_TE_ESCUCHE,
  sinBackend: SIN_BACKEND,
  juegoListo: JUEGO_LISTO,
  juegoFallo: JUEGO_FALLO,
  excusaRespaldo: (titulo: string) => EXCUSA_RESPALDO().replace('{titulo}', titulo),
  respaldoManual: RESPALDO_MANUAL,
  quejaProgramando: QUEJA_PROGRAMANDO,
  llamarAtencion: LLAMAR_ATENCION,
};
