// ============================================================
// Qué errores del navegador vale la pena guardar (ver
// src/app/actions/errores.js). Sin dependencias, para probarlo con
// `npm test`.
//
// Se descarta el ruido que no es culpa de la app: extensiones del
// navegador, scripts de otros dominios ("Script error."), avisos
// inofensivos de ResizeObserver y descargas que el propio usuario cortó
// al salir de la página.
// ============================================================
const RUIDO = [
  /^script error\.?$/i,
  /resizeobserver loop/i,
  /(chrome|moz|safari)-extension:\/\//i,
  /^AbortError\b/i,
  /the (user|operation) aborted/i,
  /signal is aborted/i,
];

export const MAX_MENSAJE = 500;
export const MAX_DETALLE = 3000;

export function esRuido(mensaje, pila) {
  const m = String(mensaje || '').trim();
  if (!m) return true;
  const p = String(pila || '');
  return RUIDO.some((r) => r.test(m) || r.test(p));
}

// Recorta y deja solo texto: el reporte lo manda cualquiera, no se confía.
export function limpiarReporte(r) {
  // eslint-disable-next-line no-control-regex
  const texto = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').slice(0, max);
  return {
    origen: texto(r?.origen, 40) || 'navegador',
    mensaje: texto(r?.mensaje, MAX_MENSAJE),
    pila: texto(r?.pila, MAX_DETALLE),
    // Solo la ruta (sin ?consulta ni #ancla: podrían llevar datos).
    ruta: texto(String(r?.ruta || '').split(/[?#]/)[0], 200),
    digest: texto(r?.digest, 60),
  };
}
