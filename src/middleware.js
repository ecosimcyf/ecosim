// ============================================================
// Middleware: protege el panel de administración.
// Si alguien entra a /admin sin una cookie de sesión válida, lo mandamos
// a /admin/login. (La propia /admin/login se deja pasar siempre.)
// ============================================================
import { NextResponse } from 'next/server';
import { verificarToken, COOKIE_SESION } from '@/lib/session';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // La pantalla de login es pública.
  if (pathname.startsWith('/admin/login')) return NextResponse.next();

  const token = request.cookies.get(COOKIE_SESION)?.value;
  const ok = await verificarToken(token, process.env.ADMIN_SESSION_SECRET);
  if (!ok) {
    const url = request.nextUrl.clone();
    url.pathname = '/admin/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Solo se ejecuta en /admin y sus subrutas.
export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
