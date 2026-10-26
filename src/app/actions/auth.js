'use server';
// ============================================================
// Acciones de login / logout del administrador, con Supabase Auth.
// ============================================================
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { estaBloqueado, registrarIntento, limpiarIntentos } from '@/lib/ratelimit';

export async function login(_prevState, formData) {
  const correo = String(formData.get('correo') || '');
  const password = String(formData.get('password') || '');

  // Identificar el origen para el límite de intentos.
  const hdrs = await headers();
  const ip = (hdrs.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocido';

  if (estaBloqueado(ip)) {
    return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  }

  const { error } = await crearClienteServidorAuth().auth.signInWithPassword({
    email: correo,
    password,
  });
  if (error) {
    registrarIntento(ip);
    return { error: 'Correo o contraseña incorrectos.' };
  }

  limpiarIntentos(ip);
  redirect('/admin');
}

export async function logout() {
  await crearClienteServidorAuth().auth.signOut();
  redirect('/admin/login');
}
