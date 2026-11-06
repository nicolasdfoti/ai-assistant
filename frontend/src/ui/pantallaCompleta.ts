/** API de Chrome para que Escape no saque de pantalla completa (TypeScript no la declara). */
type NavegadorConTeclado = Navigator & { keyboard?: { lock(teclas: string[]): Promise<void> } };

export function entrarPantallaCompleta(): void {
  if (document.fullscreenElement) return;
  document.documentElement
    .requestFullscreen()
    // Escape se usa para cerrar juegos; para salir de pantalla completa hay que mantenerlo apretado.
    .then(() => (navigator as NavegadorConTeclado).keyboard?.lock(['Escape']))
    .catch(() => {
      // Sin gesto del usuario Chrome lo rechaza; no es grave.
    });
}

export function alternarPantallaCompleta(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else entrarPantallaCompleta();
}
