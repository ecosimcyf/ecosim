// ============================================================
// Convierte CUALQUIER error en la clave de un texto claro para el usuario
// (err.* en src/lib/i18n/textos/panel.js). Función pura: sin React ni red.
//
// Regla de oro: al usuario NUNCA le llega el texto técnico del error
// (mensajes de Supabase, "Failed to fetch", códigos 23503, nombres de
// funciones…). Ese detalle se queda en console.error y en el registro del
// servidor; aquí solo se decide qué frase amable corresponde.
// ============================================================

export const CLAVE_INESPERADO = 'err.inesperado';
const CLAVE_CONOCIDA = /^err\.[A-Za-z0-9]+$/;

function textoDe(err) {
  if (typeof err === 'string') return err;
  return String(err?.message ?? err?.error ?? '');
}

function estadoDe(err) {
  const n = Number(err?.status ?? err?.statusCode ?? err?.code);
  return Number.isInteger(n) ? n : null;
}

// Devuelve la clave de texto (err.*) que describe el error.
export function claveError(err) {
  const msg = textoDe(err);
  if (CLAVE_CONOCIDA.test(msg)) return msg; // clave de las Server Actions o de preparar-imagen
  const estado = estadoDe(err);
  const nombre = String(err?.name || '');

  if (estado === 401 || /jwt|not authenticated|unauthorized|invalid token|session (has )?expired/i.test(msg)) return 'err.sesionExpirada';
  if (estado === 413 || /too large|exceeded the maximum|payload|body (size|exceeded)|entity too large/i.test(msg)) return 'err.muyGrande';
  if (estado === 408 || estado === 504 || nombre === 'AbortError' || nombre === 'TimeoutError' || /time ?out|timed out|gateway/i.test(msg)) return 'err.tiempo';
  if (
    (typeof navigator !== 'undefined' && navigator.onLine === false)
    || (err instanceof TypeError && /fetch|network|load failed/i.test(msg))
    || /failed to fetch|fetch failed|network ?error|network request|load failed|econn|enotfound|offline|socket/i.test(msg)
  ) return 'err.sinConexion';
  return CLAVE_INESPERADO;
}

// Texto listo para mostrar. "t" es la función de traducción del panel.
// "porDefecto": clave de un texto más específico del contexto (p. ej.
// 'ed.noSubir') que se usa cuando el error no es de ningún tipo conocido.
export function mensajeError(err, t, { porDefecto, vars } = {}) {
  let clave = claveError(err);
  if (clave === CLAVE_INESPERADO && porDefecto) clave = porDefecto;
  let texto = t(clave, vars);
  // Clave que no existe en el diccionario (t la devuelve igual): genérico.
  if (texto === clave) texto = t(CLAVE_INESPERADO);
  return texto;
}
