// ============================================================
// Páginas públicas (landing, guía, términos, privacidad) — una versión
// ESTÁTICA por idioma, generada al compilar: /es, /pt, /en (+ /guia, etc.).
//
// Así las sirve el CDN de Vercel sin ejecutar código en cada visita: si
// 500 personas escanean el QR de una conferencia a la vez, nadie espera a
// que un servidor se despierte.
//
// El visitante sigue viendo las direcciones de siempre ("/", "/guia"…):
// el middleware (src/middleware.js) las reescribe por dentro a la versión
// de su idioma (el que eligió con el selector o, si nunca eligió, el de
// su navegador). Las direcciones con idioma (/pt/guia) también funcionan
// y son las que ven los buscadores (hreflang).
// ============================================================
import { IDIOMAS, IDIOMA_DEFECTO, idiomaValido } from './config.js';

// Rutas públicas que existen en los tres idiomas (sin el prefijo).
export const RUTAS_PUBLICAS = ['', '/guia', '/terminos', '/privacidad'];

export function parametrosIdioma() {
  return IDIOMAS.map((idioma) => ({ idioma }));
}

// params de Next ({ idioma }) -> 'es' | 'pt' | 'en'
export async function idiomaDeParams(params) {
  const { idioma } = await params;
  return idiomaValido(idioma) || IDIOMA_DEFECTO;
}

// Enlaces canónicos y alternativos de una ruta pública ('' o '/guia'…).
export function alternativas(ruta, idioma) {
  const languages = Object.fromEntries(IDIOMAS.map((i) => [i, '/' + i + ruta]));
  languages['x-default'] = ruta || '/';
  return { canonical: '/' + idioma + ruta, languages };
}
