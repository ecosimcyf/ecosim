// ============================================================
// Middleware, dos trabajos:
//
// 1. Páginas públicas ("/", "/guia", "/terminos", "/privacidad"): las
//    reescribe por dentro a la versión estática del idioma del visitante
//    (/es, /pt o /en — ver src/lib/i18n/publico.js). La dirección que ve
//    el visitante no cambia. No toca Supabase: es instantáneo.
//
// 2. Panel (/admin): si alguien entra sin sesión de Supabase Auth, lo
//    mandamos a /admin/login (la propia /admin/login se deja pasar
//    siempre). actualizarSesion() refresca la sesión en CADA petición
//    (necesario para que el token no caduque) y dice quién es el usuario.
//    Quien tiene la verificación en dos pasos activada y aún no escribió
//    el código va a /admin/login/verificar (ver src/lib/mfa.js).
// ============================================================
import { NextResponse } from 'next/server';
import { actualizarSesion } from '@/lib/supabase/middleware';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, idiomaValido, idiomaDeNavegador } from '@/lib/i18n/config';
import { RUTAS_PUBLICAS } from '@/lib/i18n/publico';
import { faltaSegundoPaso } from '@/lib/mfa';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  const ruta = pathname === '/' ? '' : pathname;
  if (RUTAS_PUBLICAS.includes(ruta)) {
    const idioma = idiomaValido(request.cookies.get(COOKIE_IDIOMA)?.value)
      || idiomaDeNavegador(request.headers.get('accept-language'))
      || IDIOMA_DEFECTO;
    const url = request.nextUrl.clone();
    url.pathname = '/' + idioma + ruta;
    return NextResponse.rewrite(url);
  }

  const { response, usuario, supabase } = await actualizarSesion(request);
  const esLogin = pathname.startsWith('/admin/login');
  if (esLogin) return response;
  if (!usuario) return NextResponse.redirect(new URL('/admin/login', request.url));
  if (await faltaSegundoPaso(supabase)) {
    return NextResponse.redirect(new URL('/admin/login/verificar', request.url));
  }
  return response;
}

export const config = {
  matcher: ['/', '/guia', '/terminos', '/privacidad', '/admin', '/admin/:path*'],
};
