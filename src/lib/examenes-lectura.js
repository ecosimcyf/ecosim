// ============================================================
// Lo mínimo de los exámenes que necesita la VISTA DEL ESTUDIANTE:
// conversión numérica, rangos del laboratorio y campos de signos vitales.
// (Las plantillas del panel están en examenes-plantillas.js; examenes.js
// re-exporta todo esto para el resto de la app.)
// ============================================================

// "1,5" o "1.5" -> 1.5; vacío o texto -> null.
export function aNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s || !/^[-+]?\d*\.?\d+$/.test(s)) return null;
  return Number(s);
}

// Presión arterial media (PAM) redondeada: (PAS + 2*PAD) / 3. null si falta
// alguna de las dos.
export function presionMedia(pas, pad) {
  const s = aNumero(pas);
  const d = aNumero(pad);
  return s != null && d != null ? Math.round((s + 2 * d) / 3) : null;
}

// 'alto' | 'bajo' | null — solo si el valor y el rango son numéricos.
export function estadoValor(fila) {
  const v = aNumero(fila?.valor);
  if (v == null) return null;
  const min = aNumero(fila.min);
  const max = aNumero(fila.max);
  if (max != null && v > max) return 'alto';
  if (min != null && v < min) return 'bajo';
  return null;
}

// Texto de la columna "Referencia" (coma decimal en español y portugués,
// punto en inglés).
export function textoReferencia(fila, idioma = 'es') {
  const min = aNumero(fila?.min);
  const max = aNumero(fila?.max);
  const n = (x) => (idioma === 'en' ? String(x) : String(x).replace('.', ','));
  if (min != null && max != null) return n(min) + ' – ' + n(max);
  if (max != null) return '≤ ' + n(max);
  if (min != null) return '≥ ' + n(min);
  return fila?.ref || '';
}

// ---------- signos vitales ----------
// Orden en que salen en el formulario y en el monitor. Nombres, siglas,
// unidades y sugerencias, por idioma, en i18n/textos/examenes.js (vit.*).
export const CAMPOS_VITALES = [
  { id: 'fc', numerico: true },
  { id: 'fr', numerico: true },
  { id: 'temp', numerico: true },
  { id: 'spo2', numerico: true },
  { id: 'pas', numerico: true },
  { id: 'pad', numerico: true },
  { id: 'trc', numerico: true },
  { id: 'mucosas', numerico: false, sugerencias: true },
  { id: 'peso', numerico: true },
  { id: 'cc', numerico: true },
  { id: 'deshidratacion', numerico: true },
  { id: 'notas', numerico: false, largo: true },
];
