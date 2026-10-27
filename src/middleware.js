// ============================================================
// Middleware: protege el panel de administración.
// Si alguien entra a /admin sin sesión de Supabase Auth, lo mandamos a
// /admin/login. (La propia /admin/login se deja pasar siempre.)
//
// actualizarSesion() refresca la sesión en CADA petición (necesario para
// que el token de Supabase no caduque) y de paso dice quién es el
// usuario, si hay alguno.
// ============================================================
import { NextResponse } from 'next/server';
import { actualizarSesion } from '@/lib/supabase/middleware';

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  const { response, usuario } = await actualizarSesion(request);

  const esAdmin = pathname.startsWith('/admin');
  const esLogin = pathname.startsWith('/admin/login');
  if (esAdmin && !esLogin && !usuario) {
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  return response;
}

// Solo se ejecuta en /admin y sus subrutas.
export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
