/** Toda la música que haya en assets/musica (en la raíz del proyecto). Vite la descubre al compilar. */
const modulos = import.meta.glob<string>('../../../assets/musica/*.{mp3,ogg,wav,m4a}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export const PISTAS: readonly string[] = Object.values(modulos);
