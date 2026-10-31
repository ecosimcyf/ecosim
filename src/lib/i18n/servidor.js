// ============================================================
// Idioma desde el servidor (Server Components, rutas, Server Actions).
// ============================================================
import { cookies, headers } from 'next/headers';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, idiomaValido, idiomaDeNavegador } from './config';

// El que el visitante eligió a mano (cookie), o null si nunca eligió.
export async function idiomaElegido() {
  const jar = await cookies();
  return idiomaValido(jar.get(COOKIE_IDIOMA)?.value);
}

// Páginas públicas: el elegido; si no, el del navegador; si no, español.
export async function idiomaVisitante() {
  const elegido = await idiomaElegido();
  if (elegido) return elegido;
  const hdrs = await headers();
  return idiomaDeNavegador(hdrs.get('accept-language')) || IDIOMA_DEFECTO;
}
