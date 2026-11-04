'use server';
// ============================================================
// Acciones de login / logout del administrador, con Supabase Auth.
// ============================================================
import { redirect } from 'next/navigation';
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { estaBloqueado, registrarIntento, limpiarIntentos, ipVisitante } from '@/lib/ratelimit';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { idiomaPanel } from '@/lib/i18n/panel-servidor';
import { PANEL } from '@/lib/i18n/textos/panel';

export async function login(_prevState, formData) {
  const correo = String(formData.get('correo') || '');
  const password = String(formData.get('password') || '');
  const t = crearT(PANEL, await idiomaVisitante());

  // Identificar el origen para el límite de intentos.
  const ip = await ipVisitante();

  // Prefijo propio: el formulario de contacto de la landing usa el mismo
  // limitador (src/lib/ratelimit.js) pero con su propio prefijo
  // ('contacto:'), así que un ataque contra uno de los dos formularios no
  // agota de paso los intentos del otro para la misma IP.
  if (await estaBloqueado('login:' + ip)) {
    return { error: t('err.intentos') };
  }

  const { error } = await crearClienteServidorAuth().auth.signInWithPassword({
    email: correo,
    password,
  });
  if (error) {
    await registrarIntento('login:' + ip);
    return { error: t('err.credenciales') };
  }

  await limpiarIntentos('login:' + ip);
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
  // Los mensajes salen en el idioma del panel de quien la cambia.
  const t = crearT(PANEL, await idiomaPanel());
  if (!actual) return { error: t('err.faltaActual') };
  if (nueva.length < 8) return { error: t('err.claveCorta') };
  if (nueva !== repetir) return { error: t('err.noCoinciden') };
  if (nueva === actual) return { error: t('err.claveIgual') };

  const supabase = crearClienteServidorAuth();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return { error: t('err.sesion') };

  const ip = await ipVisitante();
  if (await estaBloqueado('clave:' + ip)) {
    return { error: t('err.intentos') };
  }
  const { error: errActual } = await supabase.auth.signInWithPassword({ email: user.email, password: actual });
  if (errActual) {
    await registrarIntento('clave:' + ip);
    return { error: t('err.actualMal') };
  }
  await limpiarIntentos('clave:' + ip);

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    // Supabase responde en inglés; se traduce lo más común.
    const m = error.message || '';
    if (/different from the old/i.test(m)) return { error: t('err.claveIgual') };
    if (/weak|short|characters/i.test(m)) return { error: t('err.claveDebil') };
    return { error: t('err.claveFallo') };
  }
  return { ok: true };
}
