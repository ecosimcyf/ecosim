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
//
// Pide la contraseña ACTUAL (así una sesión olvidada abierta en un
// computador de la clínica no basta para quitarle la cuenta a su dueño) y
// la nueva dos veces (un error de tipeo dejaría al cliente fuera).
export async function cambiarContrasena(_prevState, formData) {
  const actual = String(formData.get('actual') || '');
  const nueva = String(formData.get('nueva') || '');
  const repetir = String(formData.get('repetir') || '');
  if (!actual) return { error: 'Escribe tu contraseña actual.' };
  if (nueva.length < 8) return { error: 'La contraseña nueva debe tener al menos 8 caracteres.' };
  if (nueva !== repetir) return { error: 'Las dos contraseñas nuevas no coinciden.' };
  if (nueva === actual) return { error: 'La contraseña nueva debe ser distinta de la actual.' };

  const supabase = crearClienteServidorAuth();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'Tu sesión se cerró. Vuelve a iniciar sesión.' };

  const hdrs = await headers();
  const ip = (hdrs.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocido';
  if (estaBloqueado('clave:' + ip)) {
    return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  }
  const { error: errActual } = await supabase.auth.signInWithPassword({ email: user.email, password: actual });
  if (errActual) {
    registrarIntento('clave:' + ip);
    return { error: 'La contraseña actual no es correcta.' };
  }
  limpiarIntentos('clave:' + ip);

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    // Supabase responde en inglés; se traduce lo más común.
    const m = error.message || '';
    if (/different from the old/i.test(m)) return { error: 'La contraseña nueva debe ser distinta de la actual.' };
    if (/weak|short|characters/i.test(m)) return { error: 'La contraseña es demasiado débil: usa más caracteres, mezclando letras y números.' };
    return { error: 'No se pudo cambiar la contraseña. Inténtalo de nuevo.' };
  }
  return { ok: true };
}
