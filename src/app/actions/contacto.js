'use server';
// ============================================================
// Acción pública del formulario de contacto de la landing ("/").
//
// Cualquiera puede llamarla (no hay sesión de por medio), así que usa el
// mismo limitador que el login (src/lib/ratelimit.js), por correo y por IP
// (ver src/lib/limites.js: tras una charla, muchos asistentes lo llenan
// a la vez desde el mismo Wi-Fi). A diferencia
// del login —que solo penaliza los intentos FALLIDOS y limpia el contador
// al entrar bien—, aquí contamos TODO envío, válido o no: el límite no
// protege una contraseña, protege al formulario en sí de que alguien lo
// use para mandar spam a "solicitudes_contacto" (por eso nunca se llama a
// limpiarIntentos: un envío exitoso no debe reiniciar el contador).
//
// Ley 1581 de 2012 (habeas data): sin la casilla de autorización marcada
// no se guarda nada, y se anota cuándo se autorizó (autorizo_datos_en).
// ============================================================
import { after } from 'next/server';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { consumirIntento, ipVisitante } from '@/lib/ratelimit';
import { LIMITES, LIMITE_CORREO_DIA, claveLimite, sinSaltos } from '@/lib/limites';
import { registrarError } from '@/lib/errores';
import { enviarCorreo } from '@/lib/correo';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LANDING } from '@/lib/i18n/textos/landing';

const LARGOS = { nombre: 100, clinica: 150, correo: 200, telefono: 40, mensaje: 2000 };

export async function enviarSolicitudContacto(_prevState, formData) {
  const campo = (k) => String(formData.get(k) || '').trim();
  const nombre = campo('nombre');
  const clinica = campo('clinica');
  const correo = campo('correo');
  const telefono = campo('telefono');
  const mensaje = campo('mensaje');
  const autoriza = formData.get('autorizo') === 'si';
  // Los errores salen en el idioma en que el visitante ve la landing.
  const t = crearT(LANDING, await idiomaVisitante());

  // Trampa para bots: campo oculto que una persona nunca ve ni llena. Si
  // viene con algo, se finge éxito y no se guarda nada.
  if (campo('sitio_web')) return { ok: true };

  // Prefijo propio ('contacto'): un ataque contra este formulario no
  // agota los intentos del login para la misma IP.
  const claveIp = claveLimite('contacto-ip', await ipVisitante());
  // Por correo solo si viene uno (si no, todos los envíos sin correo
  // compartirían el mismo contador).
  const claveCorreo = correo ? claveLimite('contacto', correo) : null;
  // Comprobar y registrar es un solo paso atómico (ver ratelimit.js). Aquí
  // sí hay respaldo en memoria si la base falla: mejor un formulario con
  // límite imperfecto que uno que no deja escribir.
  const porIp = await consumirIntento(claveIp, LIMITES.contactoIp);
  const porCorreo = claveCorreo ? await consumirIntento(claveCorreo, LIMITES.contactoCorreo) : 'ok';
  if (porIp === 'bloqueado' || porCorreo === 'bloqueado') {
    return { error: t('form.errores.intentos') };
  }

  if (!nombre || !correo) return { error: t('form.errores.faltan') };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return { error: t('form.errores.correo') };
  for (const [k, max] of Object.entries(LARGOS)) {
    if (campo(k).length > max) return { error: t('form.errores.largo', { campo: t('form.campos.' + k), max }) };
  }
  if (!autoriza) {
    return { error: t('form.errores.autoriza') };
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
    await registrarError('contacto', error, 'no se pudo guardar la solicitud');
    return { error: t('form.errores.envio') };
  }

  // El aviso por correo se manda DESPUÉS de responder (after): el visitante
  // no espera a Resend (hasta 8 s). Hay un tope global de avisos al día: si
  // alguien inunda el formulario, las solicitudes se guardan igual pero ya
  // no se envía correo.
  if (await consumirIntento('contacto-correo-dia', LIMITE_CORREO_DIA) === 'ok') {
    after(() => avisarPorCorreo(fila));
  }
  return { ok: true };
}

// Aviso por correo al asesor de que llegó una solicitud nueva (si no, solo
// se ve al entrar al panel). Es OPCIONAL: solo se envía si están
// configuradas RESEND_API_KEY y AVISO_SOLICITUDES_A (ver
// .env.local.example y src/lib/correo.js). Si falla, la solicitud ya quedó
// guardada: no se le muestra ningún error al visitante.
async function avisarPorCorreo(s) {
  const r = await enviarCorreo({
    para: process.env.AVISO_SOLICITUDES_A,
    responderA: sinSaltos(s.correo),
    // sinSaltos: sin saltos de línea en el asunto (inyección de cabeceras de correo).
    asunto: 'Nueva solicitud de EcoSim: ' + sinSaltos(s.nombre) + (s.clinica ? ' (' + sinSaltos(s.clinica) + ')' : ''),
    texto: [
      'Nombre: ' + s.nombre,
      'Clínica: ' + (s.clinica || '—'),
      'Correo: ' + s.correo,
      'Teléfono: ' + (s.telefono || '—'),
      '',
      s.mensaje || '(sin mensaje)',
      '',
      'Gestiónala en el panel: Solicitudes.',
    ].join('\n'),
  });
  if (r.motivo) await registrarError('contacto-correo', r.motivo);
}
