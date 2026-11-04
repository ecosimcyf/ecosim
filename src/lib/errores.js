// ============================================================
// Registro de errores del servidor en la tabla "errores" (la ve el
// super_admin en el panel, pestaña «Errores»). SOLO para el servidor.
//
// Nunca lanza: si no se puede guardar (base caída, migración pendiente),
// queda al menos en el registro de Vercel con console.error.
// ============================================================
import { crearClienteAdmin } from '@/lib/supabase/admin';

const corto = (v, max) => String(v ?? '').slice(0, max);

export async function registrarError(origen, err, extra) {
  const mensaje = corto(err?.message || err?.error || err || 'error desconocido', 500);
  const detalle = corto([
    err?.code && 'código: ' + err.code,
    err?.details && 'detalle: ' + err.details,
    err?.causa && 'causa: ' + (err.causa.message || JSON.stringify(err.causa)),
    extra && 'contexto: ' + (typeof extra === 'string' ? extra : JSON.stringify(extra)),
    err?.stack,
  ].filter(Boolean).join('\n'), 4000);
  console.error('[' + origen + ']', mensaje, detalle ? '\n' + detalle : '');
  try {
    await crearClienteAdmin().from('errores').insert({ origen: corto(origen, 80), mensaje, detalle: detalle || null });
  } catch {
    // Ya quedó en console.error.
  }
}
