'use server';
// ============================================================
// Acciones de login / logout del administrador.
// ============================================================
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { crearToken, COOKIE_SESION } from '@/lib/session';
import { estaBloqueado, registrarIntento, limpiarIntentos } from '@/lib/ratelimit';

export async function login(_prevState, formData) {
  const pass = String(formData.get('password') || '');

  // Identificar el origen para el límite de intentos.
  const hdrs = await headers();
  const ip = (hdrs.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocido';

  if (estaBloqueado(ip)) {
    return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  }

  // El hash se guarda en base64 para que los signos "$" del hash bcrypt no
  // se rompan al leer el archivo .env (Next.js interpreta "$" como variable).
  // Si llegara el hash crudo ($2a$...) —p. ej. puesto a mano en Vercel—
  // también se acepta tal cual.
  let hash = process.env.ADMIN_PASSWORD_HASH || '';
  if (hash && !hash.startsWith('$2')) {
    try { hash = Buffer.from(hash, 'base64').toString('utf8'); } catch {}
  }
  const ok = hash && bcrypt.compareSync(pass, hash);
  if (!ok) {
    registrarIntento(ip);
    return { error: 'Contraseña incorrecta.' };
  }

  limpiarIntentos(ip);
  const token = await crearToken(process.env.ADMIN_SESSION_SECRET);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_SESION, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60, // 8 horas
  });
  redirect('/admin');
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_SESION);
  redirect('/admin/login');
}
