// Parte de servidor de las páginas públicas por idioma (ver publico.js).
import { notFound } from 'next/navigation';
import { idiomaValido } from './config.js';

// /es, /pt o /en; cualquier otro primer tramo ("/favicon.ico", "/wp-login",
// los escaneos de bots…) es un 404 limpio. Se hace aquí y no con
// dynamicParams = false porque esa opción deja un error falso
// ("NoFallbackError") en el registro del servidor por cada dirección así.
export async function idiomaONoEncontrado(params) {
  const { idioma } = await params;
  const valido = idiomaValido(idioma);
  if (!valido) notFound();
  return valido;
}
