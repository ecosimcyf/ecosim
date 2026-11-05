'use server';
// ============================================================
// Verificación en dos pasos (ver src/lib/mfa.js): activarla, confirmarla,
// quitarla y el segundo paso del login. Todas trabajan sobre la sesión
// del propio admin (cookies), nunca sobre la de otro.
//
// Los errores vuelven como claves de texto del panel (mfa.err*).
// ============================================================
import { redirect } from 'next/navigation';
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { estaBloqueado, registrarIntento, limpiarIntentos } from '@/lib/ratelimit';
import { LIMITES, claveLimite } from '@/lib/limites';
import { registrarError } from '@/lib/errores';
import { factorActivo, codigoTotp } from '@/lib/mfa';

async function usuarioActual(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  return user || null;
}

// Paso 1 de activarla: crea un factor nuevo y devuelve el código QR (SVG)
// y el secreto (por si el teléfono no puede leer el QR).
export async function iniciarDosPasos() {
  try {
    const supabase = crearClienteServidorAuth();
    if (!(await usuarioActual(supabase))) return { error: 'mfa.errSesion' };
    if (await factorActivo(supabase)) return { error: 'mfa.errYaActiva' };
    // Restos de un intento anterior sin terminar (Supabase no deja tener
    // dos factores sin verificar con el mismo nombre).
    const { data: lista } = await supabase.auth.mfa.listFactors();
    for (const f of lista?.all || []) {
      if (f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'EcoSim' });
    if (error) throw error;
    return { factorId: data.id, qr: data.totp.qr_code, secreto: data.totp.secret };
  } catch (err) {
    await registrarError('mfa-iniciar', err);
    return { error: 'mfa.errFallo' };
  }
}

// Comprueba un código contra un factor, con límite de intentos por usuario.
async function verificar(supabase, user, factorId, codigo) {
  const c = codigoTotp(codigo);
  if (!c) return 'mfa.errCodigo';
  const clave = claveLimite('mfa', user.id);
  if (await estaBloqueado(clave, LIMITES.clave)) return 'mfa.errIntentos';
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: c });
  if (error) {
    await registrarIntento(clave, LIMITES.clave);
    return 'mfa.errCodigo';
  }
  await limpiarIntentos(clave);
  return null;
}

// Paso 2 de activarla: el admin escribe el primer código del teléfono.
export async function confirmarDosPasos(factorId, codigo) {
  try {
    const supabase = crearClienteServidorAuth();
    const user = await usuarioActual(supabase);
    if (!user) return { error: 'mfa.errSesion' };
    if (typeof factorId !== 'string') return { error: 'mfa.errFallo' };
    const err = await verificar(supabase, user, factorId, codigo);
    return err ? { error: err } : { ok: true };
  } catch (err) {
    await registrarError('mfa-confirmar', err);
    return { error: 'mfa.errFallo' };
  }
}

// Quitarla: pide un código actual (así una sesión olvidada abierta no basta).
export async function quitarDosPasos(codigo) {
  try {
    const supabase = crearClienteServidorAuth();
    const user = await usuarioActual(supabase);
    if (!user) return { error: 'mfa.errSesion' };
    const factor = await factorActivo(supabase);
    if (!factor) return { ok: true };
    const err = await verificar(supabase, user, factor.id, codigo);
    if (err) return { error: err };
    const { error } = await supabase.auth.mfa.unenroll({ factorId: factor.id });
    if (error) throw error;
    // La sesión sigue en aal2 hasta que se renueve: se refresca ya.
    await supabase.auth.refreshSession();
    return { ok: true };
  } catch (err) {
    await registrarError('mfa-quitar', err);
    return { error: 'mfa.errFallo' };
  }
}

// Segundo paso del login (/admin/login/verificar).
export async function verificarLogin(_prev, formData) {
  const supabase = crearClienteServidorAuth();
  let destino = null;
  try {
    const user = await usuarioActual(supabase);
    if (!user) destino = '/admin/login';
    else {
      const factor = await factorActivo(supabase);
      if (!factor) destino = '/admin';
      else {
        const err = await verificar(supabase, user, factor.id, formData.get('codigo'));
        if (err) return { error: err };
        destino = '/admin';
      }
    }
  } catch (err) {
    await registrarError('mfa-login', err);
    return { error: 'mfa.errFallo' };
  }
  redirect(destino);
}
