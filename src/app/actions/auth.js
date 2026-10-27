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

  // Prefijo propio: el formulario de contacto de la landing usa el mismo
  // limitador (src/lib/ratelimit.js) pero con su propio prefijo
  // ('contacto:'), así que un ataque contra uno de los dos formularios no
  // agota de paso los intentos del otro para la misma IP.
  if (estaBloqueado('login:' + ip)) {
    return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  }

  const { error } = await crearClienteServidorAuth().auth.signInWithPassword({
    email: correo,
    password,
  });
  if (error) {
    registrarIntento('login:' + ip);
    return { error: 'Correo o contraseña incorrectos.' };
  }

  limpiarIntentos('login:' + ip);
  redirect('/admin');
}

export async function logout() {
  await crearClienteServidorAuth().auth.signOut();
  redirect('/admin/login');
}

// Cualquier admin (super_admin o cliente) cambia su propia contraseña —
// pensado sobre todo para que el cliente reemplace la contraseña temporal
// que le dio el super_admin al crear su cuenta (ver crearCuenta en
// actions/admin.js), pero sirve igual para cualquier otra cuenta de admin.
// Protegida por el middleware existente (su matcher ya cubre /admin/:path*).
export async function cambiarContrasena(_prevState, formData) {
  const nueva = String(formData.get('nueva') || '');
  if (nueva.length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' };
  }
  const { error } = await crearClienteServidorAuth().auth.updateUser({ password: nueva });
  if (error) {
    return { error: error.message };
  }
  return { ok: true };
}
