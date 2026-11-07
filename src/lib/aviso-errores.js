// ============================================================
// Aviso por CORREO cuando la app registra errores (src/lib/errores.js),
// para enterarse en el momento y no solo al abrir la pestaña «Errores».
// SOLO para el servidor.
//
// Configuración (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY   clave de resend.com (la misma del aviso de contacto)
//   AVISO_ERRORES_A  correo(s) que reciben el aviso, separados por comas
//                    (si no está, se usa AVISO_SOLICITUDES_A)
// Sin ellas no se envía nada.
//
// Para no inundar el correo:
//   · como mucho UN aviso cada PAUSA_MIN minutos (el contador vive en la
//     base, así que lo comparten todos los servidores de Vercel);
//   · los errores del NAVEGADOR solo avisan si se repiten
//     (MIN_NAVEGADOR en VENTANA_NAVEGADOR_MIN minutos): un teléfono raro no
//     es una emergencia, diez fallando en una clase sí;
//   · el aviso trae un RESUMEN de todo lo ocurrido en ese rato.
// Si la propia base no responde (justo cuando más importa avisar), se
// envía igual, con una pausa por servidor en memoria.
// ============================================================
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { enviarCorreo, destinatarios } from './correo';
import { SITIO_URL } from './sitio';
import { resumenErrores, PAUSA_MIN, MIN_NAVEGADOR, VENTANA_NAVEGADOR_MIN } from './resumen-errores';

const CLAVE = 'aviso-errores';
// Errores del propio sistema de avisos: avisar de ellos por correo sería
// un bucle (si el correo falla, el aviso también fallaría).
const SIN_AVISO = ['contacto-correo', 'aviso-errores'];
let ultimoAviso = 0; // respaldo en memoria si la base no responde

function configurado() {
  return destinatarios(process.env.AVISO_ERRORES_A || process.env.AVISO_SOLICITUDES_A).length > 0
    && (!!process.env.RESEND_API_KEY || process.env.CORREO_SOLO_REGISTRO === '1');
}

const haceMin = (min) => new Date(Date.now() - min * 60 * 1000).toISOString();

// Nunca lanza. Lo llama registrarError() después de guardar cada error.
export async function quizasAvisar(origen, mensaje) {
  try {
    if (!configurado() || SIN_AVISO.includes(origen)) return;
    if (Date.now() - ultimoAviso < PAUSA_MIN * 60 * 1000) return; // este servidor ya avisó hace poco
    const supabase = crearClienteAdmin();

    let filas = null; // null = la base no respondió
    try {
      if (origen.startsWith('navegador:')) {
        const { count, error } = await supabase.from('errores').select('id', { count: 'exact', head: true })
          .like('origen', 'navegador:%').gte('creado_en', haceMin(VENTANA_NAVEGADOR_MIN));
        if (error) throw error;
        if ((count || 0) < MIN_NAVEGADOR) return;
      }
      const { data: bloqueado, error: e1 } = await supabase.rpc('intento_bloqueado', {
        p_clave: CLAVE, p_max: 1, p_ventana_seg: PAUSA_MIN * 60,
      });
      if (e1) throw e1;
      if (bloqueado) return; // otro servidor ya avisó en este rato
      await supabase.rpc('registrar_intento', { p_clave: CLAVE, p_ventana_seg: PAUSA_MIN * 60 });
      const { data, error: e2 } = await supabase.from('errores').select('origen,mensaje,creado_en')
        .gte('creado_en', haceMin(PAUSA_MIN)).order('creado_en', { ascending: false }).limit(200);
      if (e2) throw e2;
      filas = data || [];
    } catch {
      filas = null;
    }

    ultimoAviso = Date.now();
    const { asunto, texto } = resumenErrores(filas, { sitio: SITIO_URL, origen, mensaje });
    const r = await enviarCorreo({ para: process.env.AVISO_ERRORES_A || process.env.AVISO_SOLICITUDES_A, asunto, texto });
    if (r.motivo) console.error('[aviso-errores] no se pudo enviar el correo:', r.motivo);
  } catch (err) {
    console.error('[aviso-errores]', err?.message || err);
  }
}
