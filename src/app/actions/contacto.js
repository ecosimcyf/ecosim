'use server';
// ============================================================
// Acción pública del formulario de contacto de la landing ("/").
//
// Cualquiera puede llamarla (no hay sesión de por medio), así que usa el
// mismo limitador por IP que el login (src/lib/ratelimit.js). A diferencia
// del login —que solo penaliza los intentos FALLIDOS y limpia el contador
// al entrar bien—, aquí contamos TODO envío, válido o no: el límite no
// protege una contraseña, protege al formulario en sí de que alguien lo
// use para mandar spam a "solicitudes_contacto" (por eso nunca se llama a
// limpiarIntentos: un envío exitoso no debe reiniciar el contador).
// ============================================================
import { headers } from 'next/headers';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { estaBloqueado, registrarIntento } from '@/lib/ratelimit';

export async function enviarSolicitudContacto(_prevState, formData) {
  const nombre = String(formData.get('nombre') || '').trim();
  const clinica = String(formData.get('clinica') || '').trim();
  const correo = String(formData.get('correo') || '').trim();
  const telefono = String(formData.get('telefono') || '').trim();
  const mensaje = String(formData.get('mensaje') || '').trim();

  // Identificar el origen para el límite de intentos.
  const hdrs = await headers();
  const ip = (hdrs.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocido';

  if (estaBloqueado(ip)) {
    return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  }
  registrarIntento(ip);

  if (!nombre || !correo) {
    return { error: 'Completa nombre y correo.' };
  }

  const { error } = await crearClienteAdmin()
    .from('solicitudes_contacto')
    .insert({ nombre, clinica, correo, telefono, mensaje });
  if (error) {
    return { error: 'No se pudo enviar la solicitud. Inténtalo de nuevo en unos minutos.' };
  }

  return { ok: true };
}
