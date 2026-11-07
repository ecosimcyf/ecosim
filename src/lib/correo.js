// ============================================================
// Envío de correos con Resend (https://resend.com). SOLO para el servidor.
// Lo usan el aviso de solicitudes de contacto (actions/contacto.js) y el
// aviso de errores (lib/aviso-errores.js).
//
// Es OPCIONAL: sin RESEND_API_KEY no se envía nada (y no falla nada).
// Remitente: AVISO_REMITENTE (o el antiguo AVISO_SOLICITUDES_DE); si no hay
// ninguno, el de pruebas de Resend, que solo puede escribirle al correo con
// el que se creó la cuenta de Resend — suficiente para avisarte a ti.
//
// Modo prueba: con CORREO_SOLO_REGISTRO=1 no envía; escribe el correo en el
// registro del servidor (para probar sin gastar envíos ni molestar a nadie).
// ============================================================

// Lista de correos de una variable "a@x.com, b@y.com".
export function destinatarios(valor) {
  return String(valor || '').split(',').map((x) => x.trim()).filter(Boolean);
}

// true si se envió; false si no está configurado o falló (nunca lanza).
// Si falla, devuelve también el motivo, para que quien llama lo registre.
export async function enviarCorreo({ para, asunto, texto, responderA }) {
  const clave = process.env.RESEND_API_KEY;
  const lista = Array.isArray(para) ? para : destinatarios(para);
  if (!lista.length) return { enviado: false };
  if (process.env.CORREO_SOLO_REGISTRO === '1') {
    console.log('[correo] (solo registro) para:', lista.join(', '), '| asunto:', asunto, '\n' + texto);
    return { enviado: true, soloRegistro: true };
  }
  if (!clave) return { enviado: false };
  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + clave, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.AVISO_REMITENTE || process.env.AVISO_SOLICITUDES_DE || 'EcoSim <onboarding@resend.dev>',
        to: lista,
        ...(responderA ? { reply_to: responderA } : {}),
        subject: asunto,
        text: texto,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return { enviado: false, motivo: 'HTTP ' + resp.status + ': ' + (await resp.text()).slice(0, 300) };
    return { enviado: true };
  } catch (err) {
    return { enviado: false, motivo: err?.message || String(err) };
  }
}
