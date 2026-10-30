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

// ---------- plantillas de laboratorio ----------
// [parámetro, unidad, perro [min, max], gato [min, max]] — o un texto de
// referencia cuando el resultado es cualitativo.
const HEMOGRAMA = [
  ['Hematocrito', '%', [37, 55], [30, 45]],
  ['Hemoglobina', 'g/dL', [12, 18], [9, 15]],
  ['Eritrocitos', '×10⁶/µL', [5.5, 8.5], [5, 10]],
  ['VCM', 'fL', [60, 77], [39, 55]],
  ['CHCM', 'g/dL', [32, 36], [30, 36]],
  ['Leucocitos', '×10³/µL', [6, 17], [5.5, 19.5]],
  ['Neutrófilos', '×10³/µL', [3, 11.5], [2.5, 12.5]],
  ['Linfocitos', '×10³/µL', [1, 4.8], [1.5, 7]],
  ['Monocitos', '×10³/µL', [0.15, 1.35], [0, 0.85]],
  ['Eosinófilos', '×10³/µL', [0.1, 1.25], [0, 1.5]],
  ['Plaquetas', '×10³/µL', [200, 500], [300, 800]],
];

const QUIMICA = [
  ['Glucosa', 'mg/dL', [70, 143], [74, 159]],
  ['BUN (nitrógeno ureico)', 'mg/dL', [7, 27], [16, 36]],
  ['Creatinina', 'mg/dL', [0.5, 1.8], [0.8, 2.4]],
  ['ALT', 'U/L', [10, 125], [12, 130]],
  ['Fosfatasa alcalina', 'U/L', [23, 212], [14, 111]],
  ['Proteínas totales', 'g/dL', [5.2, 8.2], [5.7, 8.9]],
  ['Albúmina', 'g/dL', [2.3, 4.0], [2.2, 4.0]],
  ['Bilirrubina total', 'mg/dL', [0, 0.9], [0, 0.9]],
  ['Colesterol', 'mg/dL', [110, 320], [65, 225]],
  ['Calcio', 'mg/dL', [7.9, 12], [7.8, 11.3]],
  ['Fósforo', 'mg/dL', [2.5, 6.8], [3.1, 7.5]],
];

const UROANALISIS = [
  ['Densidad urinaria', '', [1.015, 1.045], [1.035, 1.06]],
  ['pH', '', [5.5, 7.5], [5.5, 7.5]],
  ['Proteínas', '', 'Negativo / trazas', 'Negativo / trazas'],
  ['Glucosa', '', 'Negativo', 'Negativo'],
  ['Cetonas', '', 'Negativo', 'Negativo'],
  ['Sangre', '', 'Negativo', 'Negativo'],
  ['Bilirrubina', '', 'Negativo / trazas', 'Negativo'],
  ['Eritrocitos (sedimento)', '/campo', [0, 5], [0, 5]],
  ['Leucocitos (sedimento)', '/campo', [0, 5], [0, 5]],
  ['Cristales', '', 'Ausentes', 'Ausentes'],
  ['Bacterias', '', 'Ausentes', 'Ausentes'],
];

export const PLANTILLAS_LAB = [
  { id: 'hemograma', titulo: 'Hemograma', filas: HEMOGRAMA },
  { id: 'quimica', titulo: 'Química sanguínea', filas: QUIMICA },
  { id: 'uroanalisis', titulo: 'Uroanálisis', filas: UROANALISIS },
  { id: 'vacio', titulo: 'Panel personalizado', filas: [] },
];

// Panel nuevo a partir de una plantilla, con los rangos de la especie.
export function panelDesdePlantilla(plantillaId, especie) {
  const p = PLANTILLAS_LAB.find((x) => x.id === plantillaId) || PLANTILLAS_LAB[3];
  const i = especie === 'gato' ? 3 : 2;
  return {
    titulo: p.titulo,
    especie: especie === 'gato' ? 'gato' : 'perro',
    filas: p.filas.length
      ? p.filas.map((f) => {
          const r = f[i];
          return Array.isArray(r)
            ? { parametro: f[0], valor: '', unidad: f[1], min: r[0], max: r[1], ref: '' }
            : { parametro: f[0], valor: '', unidad: f[1], min: null, max: null, ref: r };
        })
      : [filaVacia()],
  };
}

export function filaVacia() {
  return { parametro: '', valor: '', unidad: '', min: null, max: null, ref: '' };
}

// "1,5" o "1.5" -> 1.5; vacío o texto -> null.
export function aNumero(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s || !/^[-+]?\d*\.?\d+$/.test(s)) return null;
  return Number(s);
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

// Texto de la columna "Referencia".
export function textoReferencia(fila) {
  const min = aNumero(fila?.min);
  const max = aNumero(fila?.max);
  const n = (x) => String(x).replace('.', ',');
  if (min != null && max != null) return n(min) + ' – ' + n(max);
  if (max != null) return '≤ ' + n(max);
  if (min != null) return '≥ ' + n(min);
  return fila?.ref || '';
}

// ---------- signos vitales ----------
// Orden en que salen en el formulario y en el monitor.
export const CAMPOS_VITALES = [
  { id: 'fc', etiqueta: 'Frecuencia cardiaca', corta: 'FC', unidad: 'lpm', numerico: true },
  { id: 'fr', etiqueta: 'Frecuencia respiratoria', corta: 'FR', unidad: 'rpm', numerico: true },
  { id: 'temp', etiqueta: 'Temperatura', corta: 'TEMP', unidad: '°C', numerico: true },
  { id: 'spo2', etiqueta: 'Saturación de oxígeno', corta: 'SpO₂', unidad: '%', numerico: true },
  { id: 'pas', etiqueta: 'Presión sistólica', corta: 'PAS', unidad: 'mmHg', numerico: true },
  { id: 'pad', etiqueta: 'Presión diastólica', corta: 'PAD', unidad: 'mmHg', numerico: true },
  { id: 'trc', etiqueta: 'Tiempo de llenado capilar', corta: 'TRC', unidad: 's', numerico: true },
  { id: 'mucosas', etiqueta: 'Mucosas', corta: 'Mucosas', unidad: '', numerico: false,
    sugerencias: ['Rosadas', 'Pálidas', 'Congestivas', 'Ictéricas', 'Cianóticas'] },
  { id: 'peso', etiqueta: 'Peso', corta: 'Peso', unidad: 'kg', numerico: true },
  { id: 'cc', etiqueta: 'Condición corporal', corta: 'CC', unidad: '/9', numerico: true },
  { id: 'deshidratacion', etiqueta: 'Deshidratación', corta: 'Deshidr.', unidad: '%', numerico: true },
  { id: 'notas', etiqueta: 'Observaciones', corta: 'Notas', unidad: '', numerico: false, largo: true },
];

// ---------- validación (la usa el servidor; también limpia en el panel) ----------

const corto = (v, max) => String(v ?? '').trim().slice(0, max);

export function limpiarLaboratorio(paneles) {
  if (!Array.isArray(paneles)) return [];
  return paneles.slice(0, LIMITES.paneles).map((p) => ({
    titulo: corto(p?.titulo, 80) || 'Laboratorio',
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
