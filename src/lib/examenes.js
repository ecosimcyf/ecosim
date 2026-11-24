// ============================================================
// Exámenes complementarios de un caso: laboratorio, radiografías y
// signos vitales. Lo comparten el panel (editor), el servidor (validación
// en actions/admin.js) y la vista del estudiante.
//
// Laboratorio: lista de "paneles" (Hemograma, Química…), cada uno con
// filas { parametro, valor, unidad, min, max, ref }. min/max numéricos
// marcan ↑/↓ cuando el valor se sale; "ref" es la referencia en texto
// para lo cualitativo (ej. "Negativo").
//
// Los rangos de las plantillas son valores de referencia GENERALES de la
// literatura veterinaria: cada laboratorio tiene los suyos, por eso el
// profesor los puede editar en cada caso.
// ============================================================

export const LIMITES = {
  paneles: 10,
  filasPorPanel: 60,
  archivosPorTipo: 20,
  mbArchivo: 10,
};

// Tipos de archivo que acepta el bucket "examenes" (debe coincidir con
// allowed_mime_types en supabase/schema.sql).
export const MIME_EXTENSION = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

// Lo de la vista del estudiante y las plantillas del panel viven en sus
// propios archivos (para no cargar las plantillas en el teléfono del
// estudiante); aquí se re-exportan para el resto de la app.
import { aNumero, CAMPOS_VITALES } from './examenes-lectura.js';
export { aNumero, presionMedia, estadoValor, textoReferencia, CAMPOS_VITALES } from './examenes-lectura.js';
export { PLANTILLAS_LAB, enIdioma, panelDesdePlantilla, filaVacia } from './examenes-plantillas.js';

// ---------- validación (la usa el servidor; también limpia en el panel) ----------

const corto = (v, max) => String(v ?? '').trim().slice(0, max);

export function limpiarLaboratorio(paneles) {
  if (!Array.isArray(paneles)) return [];
  return paneles.slice(0, LIMITES.paneles).map((p) => ({
    // Sin título, la vista del estudiante muestra «Laboratorio» en su idioma.
    titulo: corto(p?.titulo, 80),
    especie: p?.especie === 'gato' ? 'gato' : 'perro',
    filas: (Array.isArray(p?.filas) ? p.filas : [])
      .slice(0, LIMITES.filasPorPanel)
      .map((f) => ({
        parametro: corto(f?.parametro, 60),
        valor: corto(f?.valor, 40),
        unidad: corto(f?.unidad, 20),
        min: aNumero(f?.min),
        max: aNumero(f?.max),
        ref: corto(f?.ref, 40),
      }))
      // Una fila sin nombre ni valor es una fila vacía del formulario.
      .filter((f) => f.parametro || f.valor),
  })).filter((p) => p.filas.length);
}

export function limpiarVitales(v) {
  const r = {};
  if (!v || typeof v !== 'object') return r;
  for (const c of CAMPOS_VITALES) {
    const s = corto(v[c.id], c.largo ? 300 : 30);
    if (s) r[c.id] = s;
  }
  return r;
}

export function tieneVitales(v) {
  return !!v && typeof v === 'object' && Object.keys(v).length > 0;
}
