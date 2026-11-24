// ============================================================
// Cadencia del sondeo de casos activos en la vista del estudiante.
//
// Base: cada 15 s. Dos reglas para no cargar al servidor cuando hay muchos
// estudiantes a la vez:
//   · el PRIMER sondeo lleva un desfase aleatorio (0–5 s), para que los 40
//     teléfonos que entraron juntos no consulten en el mismo segundo;
//   · tras una consulta fallida el intervalo se DUPLICA (máximo 60 s) y
//     vuelve a 15 s con la primera que funciona.
// Funciones puras (sin tiempo ni azar propios) para poder probarlas.
// ============================================================

export const SONDEO_BASE_MS = 15000;
export const SONDEO_MAX_MS = 60000;
export const SONDEO_DESFASE_MS = 5000;

// Espera antes del primer sondeo. `azar` es un número de 0 a 1 (Math.random()).
export function esperaInicial(azar, base = SONDEO_BASE_MS, desfase = SONDEO_DESFASE_MS) {
  const a = Number.isFinite(azar) ? Math.min(1, Math.max(0, azar)) : 0;
  return base + Math.round(a * desfase);
}

// Intervalo del siguiente sondeo, según el actual y si el último funcionó.
export function siguienteIntervalo(actual, ok, base = SONDEO_BASE_MS, max = SONDEO_MAX_MS) {
  if (ok) return base;
  return Math.min(max, Math.max(base, actual) * 2);
}
