/** Esconde el cursor del mouse si no se mueve por un rato (en el stand molesta). */
export function esconderCursorInactivo(segundos: number): void {
  let espera = 0;
  const mostrar = () => {
    document.body.classList.remove('sin-cursor');
    clearTimeout(espera);
    espera = window.setTimeout(() => document.body.classList.add('sin-cursor'), segundos * 1000);
  };
  window.addEventListener('pointermove', mostrar);
  mostrar();
}
