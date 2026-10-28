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
//
// Ley 1581 de 2012 (habeas data): sin la casilla de autorización marcada
// no se guarda nada, y se anota cuándo se autorizó (autorizo_datos_en).
// ============================================================
import { headers } from 'next/headers';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { estaBloqueado, registrarIntento } from '@/lib/ratelimit';

const LIMITES = { nombre: 100, clinica: 150, correo: 200, telefono: 40, mensaje: 2000 };

export async function enviarSolicitudContacto(_prevState, formData) {
  const campo = (k) => String(formData.get(k) || '').trim();
  const nombre = campo('nombre');
  const clinica = campo('clinica');
  const correo = campo('correo');
  const telefono = campo('telefono');
  const mensaje = campo('mensaje');
  const autoriza = formData.get('autorizo') === 'si';

  // Trampa para bots: campo oculto que una persona nunca ve ni llena. Si
  // viene con algo, se finge éxito y no se guarda nada.
  if (campo('sitio_web')) return { ok: true };

  // Identificar el origen para el límite de intentos.
  const hdrs = await headers();
  const ip = (hdrs.get('x-forwarded-for') || '').split(',')[0].trim() || 'desconocido';

  // Prefijo propio ('contacto:'): un ataque contra este formulario no
  // agota los intentos del login para la misma IP.
  if (estaBloqueado('contacto:' + ip)) {
    return { error: 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.' };
  }
  registrarIntento('contacto:' + ip);

  if (!nombre || !correo) return { error: 'Completa nombre y correo.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: 'Revisa el correo: no parece válido.' };
  for (const [k, max] of Object.entries(LIMITES)) {
    if (campo(k).length > max) return { error: 'El campo «' + k + '» es demasiado largo (máximo ' + max + ' caracteres).' };
  }
  if (!autoriza) {
    return { error: 'Para poder contactarte necesitamos tu autorización para tratar tus datos (marca la casilla).' };
  }

  const fila = { nombre, clinica, correo, telefono, mensaje, autorizo_datos_en: new Date().toISOString() };
  const supabase = crearClienteAdmin();
  let { error } = await supabase.from('solicitudes_contacto').insert(fila);
  // Si la base todavía no tiene la columna nueva (migración 2026-10-28 sin
  // ejecutar), se guarda igual sin ella: perder un cliente potencial es
  // peor que perder esa marca de tiempo.
  if (error?.code === 'PGRST204') {
    delete fila.autorizo_datos_en;
    ({ error } = await supabase.from('solicitudes_contacto').insert(fila));
  }
  if (error) {
    console.error('[contacto] no se pudo guardar la solicitud:', error);
    return { error: 'No se pudo enviar la solicitud. Inténtalo de nuevo en unos minutos.' };
  }

  await avisarPorCorreo(fila);
  return { ok: true };
}

// Aviso por correo al asesor de que llegó una solicitud nueva (si no, solo
// se ve al entrar al panel). Es OPCIONAL: solo se envía si están
// configuradas RESEND_API_KEY y AVISO_SOLICITUDES_A (ver
// .env.local.example). Si falla, la solicitud ya quedó guardada: no se le
// muestra ningún error al visitante.
async function avisarPorCorreo(s) {
  const clave = process.env.RESEND_API_KEY;
  const para = process.env.AVISO_SOLICITUDES_A;
  if (!clave || !para) return;
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.AVISO_SOLICITUDES_DE || 'EcoSim <onboarding@resend.dev>',
        to: para.split(',').map((x) => x.trim()).filter(Boolean),
        reply_to: s.correo,
        subject: 'Nueva solicitud de EcoSim: ' + s.nombre + (s.clinica ? ' (' + s.clinica + ')' : ''),
        text: [
          'Nombre: ' + s.nombre,
          'Clínica: ' + (s.clinica || '—'),
          'Correo: ' + s.correo,
          'Teléfono: ' + (s.telefono || '—'),
          '',
          s.mensaje || '(sin mensaje)',
          '',
          'Gestiónala en el panel: Solicitudes.',
        ].join('\n'),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) console.error('[contacto] el aviso por correo falló:', resp.status, await resp.text());
  } catch (err) {
    console.error('[contacto] el aviso por correo falló:', err);
  }
}
