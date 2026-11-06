import { fileURLToPath } from 'node:url';
import { defineConfig, searchForWorkspaceRoot } from 'vite';

const RAIZ_FRONTEND = fileURLToPath(new URL('.', import.meta.url));
// La música vive en <proyecto>/assets, fuera de frontend/. Se habilita solo esa carpeta
// (no toda la raíz, donde está el .env).
const ASSETS = fileURLToPath(new URL('../assets', import.meta.url));

export default defineConfig({
  server: {
    port: 5173,
    fs: { allow: [searchForWorkspaceRoot(RAIZ_FRONTEND), ASSETS] },
  },
});
