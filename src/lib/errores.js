// ============================================================
// Registro de errores del servidor. SOLO para el servidor.
//
// Quedan en el registro de Vercel (Logs del proyecto) con console.error.
// Nunca lanza.
// ============================================================
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
}
