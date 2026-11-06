/**
 * Muestra "tocá cualquier tecla" y resuelve con el primer gesto del usuario.
 * Chrome exige un gesto antes de reproducir audio o pasar a pantalla completa.
 * Esa primera tecla se consume acá para que no dispare otra acción.
 */
export function esperarDespertar(contenedor: HTMLElement): Promise<void> {
  const pantalla = document.createElement('div');
  pantalla.className = 'despertar';
  pantalla.innerHTML = '<p>Tocá cualquier tecla para despertar a <strong>Byte</strong></p>';
  contenedor.appendChild(pantalla);

  return new Promise((resolve) => {
    const alDespertar = (e: Event) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      window.removeEventListener('keydown', alDespertar, true);
      window.removeEventListener('pointerdown', alDespertar, true);
      pantalla.classList.add('oculta');
      pantalla.addEventListener('transitionend', () => pantalla.remove(), { once: true });
      resolve();
    };
    window.addEventListener('keydown', alDespertar, true);
    window.addEventListener('pointerdown', alDespertar, true);
  });
}
