// ============================================================
// Copia el núcleo de ffmpeg.wasm desde node_modules a public/ffmpeg/,
// para servirlo desde nuestro propio dominio (más fiable que un CDN
// externo, sobre todo en redes de centros educativos que bloquean CDNs).
//
// Se ejecuta solo en "postinstall" (tras cada npm install), también en
// Vercel. Los archivos NO se guardan en git (ver .gitignore): se copian
// aquí en cada instalación.
// ============================================================
import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');
const origen = join(raiz, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const destino = join(raiz, 'public', 'ffmpeg');
const archivos = ['ffmpeg-core.js', 'ffmpeg-core.wasm'];

try {
  if (!existsSync(join(origen, archivos[0]))) {
    console.warn('[ffmpeg] núcleo no encontrado en node_modules; se omite la copia.');
    process.exit(0);
  }
  mkdirSync(destino, { recursive: true });
  for (const f of archivos) copyFileSync(join(origen, f), join(destino, f));
  console.log('[ffmpeg] núcleo copiado a public/ffmpeg/');
} catch (e) {
  console.warn('[ffmpeg] no se pudo copiar el núcleo:', e.message);
  process.exit(0); // nunca romper la instalación por esto
}
