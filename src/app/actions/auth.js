'use server';
// ============================================================
// Acciones de login / logout del administrador, con Supabase Auth.
// ============================================================
import { redirect } from 'next/navigation';
import { crearClienteServidor, crearClienteServidorAuth } from '@/lib/supabase/server';
import { consumirIntento, limpiarIntentos, ipVisitante } from '@/lib/ratelimit';
import { LIMITES, claveLimite } from '@/lib/limites';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { idiomaPanel } from '@/lib/i18n/panel-servidor';
import { PANEL } from '@/lib/i18n/textos/panel';

export async function login(_prevState, formData) {
  const correo = String(formData.get('correo') || '');
  const password = String(formData.get('password') || '');
  const t = crearT(PANEL, await idiomaVisitante());

  // Límite de intentos (ver src/lib/limites.js): por IP + correo, para que
  // los errores de un profesor no bloqueen a los demás del mismo Wi-Fi, y
  // uno más alto por IP sola. Prefijos propios: un ataque contra el login
  // no agota los intentos del formulario de contacto, ni al revés.
  // El intento se REGISTRA ANTES de probar la contraseña (consumirIntento es
  // atómico): si se comprobara primero y se registrara después, muchas
  // peticiones simultáneas pasarían todas la comprobación. Al acertar se
  // limpia el contador del correo. Si la base falla, el login se niega
  // (falla cerrado) en vez de quedar sin límite.
  const ip = await ipVisitante();
  const claveCorreo = claveLimite('login', ip, correo);
  const claveIp = claveLimite('login-ip', ip);
  const porCorreo = await consumirIntento(claveCorreo, LIMITES.loginCorreo, { falloCerrado: true });
  const porIp = await consumirIntento(claveIp, LIMITES.loginIp, { falloCerrado: true });
  if (porCorreo === 'error' || porIp === 'error') return { error: t('err.red') };
  if (porCorreo === 'bloqueado' || porIp === 'bloqueado') return { error: t('err.intentos') };

  const supabase = crearClienteServidorAuth();
  const { error } = await supabase.auth.signInWithPassword({
    email: correo,
    password,
  });
  if (error) return { error: t('err.credenciales') };

  await limpiarIntentos(claveCorreo);
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

  // Por usuario (no por IP): la contraseña que se protege es la suya.
  const claveUsuario = claveLimite('clave', user.id);
  // Se registra el intento ANTES de comprobar la contraseña actual (atómico)
  // y se limpia al acertar.
  const estado = await consumirIntento(claveUsuario, LIMITES.clave, { falloCerrado: true });
  if (estado === 'error') return { error: t('err.red') };
  if (estado === 'bloqueado') return { error: t('err.intentos') };
  // Se comprueba con un cliente APARTE, sin cookies: iniciar sesión con el
  // cliente de la sesión reemplazaría la sesión actual del navegador.
  const { error: errActual } = await crearClienteServidor().auth.signInWithPassword({ email: user.email, password: actual });
  if (errActual) {
    return { error: t('err.actualMal') };
  }
  await limpiarIntentos(claveUsuario);

  const { error } = await supabase.auth.updateUser({ password: nueva });
  if (error) {
    // Supabase responde en inglés; se traduce lo más común.
    const m = error.message || '';
    if (/different from the old/i.test(m)) return { error: t('err.claveIgual') };
    if (/weak|short|characters/i.test(m)) return { error: t('err.claveDebil') };
    return { error: t('err.claveFallo') };
  }
  // Cierra las sesiones abiertas en OTROS dispositivos: si alguien más
  // conocía la contraseña vieja, se queda fuera.
  await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
  return { ok: true };
}
