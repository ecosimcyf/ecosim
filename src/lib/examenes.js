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
// referencia cuando el resultado es cualitativo. Los textos van en los
// tres idiomas (N(es, pt, en)): la tabla se crea en el idioma del panel y
// después es texto libre del profesor, como el resto del caso.
const N = (es, pt, en) => ({ es, pt, en });
const NEGATIVO = N('Negativo', 'Negativo', 'Negative');
const NEG_TRAZAS = N('Negativo / trazas', 'Negativo / traços', 'Negative / trace');
const AUSENTES = N('Ausentes', 'Ausentes', 'None seen');
const POR_CAMPO = N('/campo', '/campo', '/hpf');

const HEMOGRAMA = [
  [N('Hematocrito', 'Hematócrito', 'Hematocrit (PCV)'), '%', [37, 55], [30, 45]],
  [N('Hemoglobina', 'Hemoglobina', 'Hemoglobin'), 'g/dL', [12, 18], [9, 15]],
  [N('Eritrocitos', 'Hemácias', 'RBC'), '×10⁶/µL', [5.5, 8.5], [5, 10]],
  [N('VCM', 'VCM', 'MCV'), 'fL', [60, 77], [39, 55]],
  [N('CHCM', 'CHCM', 'MCHC'), 'g/dL', [32, 36], [30, 36]],
  [N('Leucocitos', 'Leucócitos', 'WBC'), '×10³/µL', [6, 17], [5.5, 19.5]],
  [N('Neutrófilos', 'Neutrófilos', 'Neutrophils'), '×10³/µL', [3, 11.5], [2.5, 12.5]],
  [N('Linfocitos', 'Linfócitos', 'Lymphocytes'), '×10³/µL', [1, 4.8], [1.5, 7]],
  [N('Monocitos', 'Monócitos', 'Monocytes'), '×10³/µL', [0.15, 1.35], [0, 0.85]],
  [N('Eosinófilos', 'Eosinófilos', 'Eosinophils'), '×10³/µL', [0.1, 1.25], [0, 1.5]],
  [N('Plaquetas', 'Plaquetas', 'Platelets'), '×10³/µL', [200, 500], [300, 800]],
];

const QUIMICA = [
  [N('Glucosa', 'Glicose', 'Glucose'), 'mg/dL', [70, 143], [74, 159]],
  [N('BUN (nitrógeno ureico)', 'BUN (nitrogênio ureico)', 'BUN (blood urea nitrogen)'), 'mg/dL', [7, 27], [16, 36]],
  [N('Creatinina', 'Creatinina', 'Creatinine'), 'mg/dL', [0.5, 1.8], [0.8, 2.4]],
  [N('ALT', 'ALT', 'ALT'), 'U/L', [10, 125], [12, 130]],
  [N('Fosfatasa alcalina', 'Fosfatase alcalina', 'Alkaline phosphatase (ALP)'), 'U/L', [23, 212], [14, 111]],
  [N('Proteínas totales', 'Proteínas totais', 'Total protein'), 'g/dL', [5.2, 8.2], [5.7, 8.9]],
  [N('Albúmina', 'Albumina', 'Albumin'), 'g/dL', [2.3, 4.0], [2.2, 4.0]],
  [N('Bilirrubina total', 'Bilirrubina total', 'Total bilirubin'), 'mg/dL', [0, 0.9], [0, 0.9]],
  [N('Colesterol', 'Colesterol', 'Cholesterol'), 'mg/dL', [110, 320], [65, 225]],
  [N('Calcio', 'Cálcio', 'Calcium'), 'mg/dL', [7.9, 12], [7.8, 11.3]],
  [N('Fósforo', 'Fósforo', 'Phosphorus'), 'mg/dL', [2.5, 6.8], [3.1, 7.5]],
];

const UROANALISIS = [
  [N('Densidad urinaria', 'Densidade urinária', 'Urine specific gravity'), '', [1.015, 1.045], [1.035, 1.06]],
  [N('pH', 'pH', 'pH'), '', [5.5, 7.5], [5.5, 7.5]],
  [N('Proteínas', 'Proteínas', 'Protein'), '', NEG_TRAZAS, NEG_TRAZAS],
  [N('Glucosa', 'Glicose', 'Glucose'), '', NEGATIVO, NEGATIVO],
  [N('Cetonas', 'Corpos cetônicos', 'Ketones'), '', NEGATIVO, NEGATIVO],
  [N('Sangre', 'Sangue oculto', 'Blood'), '', NEGATIVO, NEGATIVO],
  [N('Bilirrubina', 'Bilirrubina', 'Bilirubin'), '', NEG_TRAZAS, NEGATIVO],
  [N('Eritrocitos (sedimento)', 'Hemácias (sedimento)', 'RBC (sediment)'), POR_CAMPO, [0, 5], [0, 5]],
  [N('Leucocitos (sedimento)', 'Leucócitos (sedimento)', 'WBC (sediment)'), POR_CAMPO, [0, 5], [0, 5]],
  [N('Cristales', 'Cristais', 'Crystals'), '', AUSENTES, AUSENTES],
  [N('Bacterias', 'Bactérias', 'Bacteria'), '', AUSENTES, AUSENTES],
];

// Gases sanguíneos: como en el reporte de un analizador de gases, traen
// también electrolitos, lactato y glucosa. Los gases cambian según la
// muestra (arterial o venosa) y sus rangos son a nivel del mar. El exceso
// de base va sin rango: que lo ponga cada laboratorio.
const BASE_Y_QUIMICA_GASES = [
  [N('Exceso de base (BE)', 'Excesso de base (BE)', 'Base excess (BE)'), 'mmol/L', [null, null], [null, null]],
  [N('Sodio (Na⁺)', 'Sódio (Na⁺)', 'Sodium (Na⁺)'), 'mmol/L', [144, 160], [150, 165]],
  [N('Potasio (K⁺)', 'Potássio (K⁺)', 'Potassium (K⁺)'), 'mmol/L', [3.5, 5.8], [3.5, 5.8]],
  [N('Cloro (Cl⁻)', 'Cloreto (Cl⁻)', 'Chloride (Cl⁻)'), 'mmol/L', [109, 122], [112, 129]],
  [N('Calcio iónico (iCa)', 'Cálcio ionizado (iCa)', 'Ionized calcium (iCa)'), 'mmol/L', [1.16, 1.4], [1.0, 1.4]],
  [N('Brecha aniónica', 'Ânion gap', 'Anion gap'), 'mmol/L', [12, 24], [13, 27]],
  [N('Lactato', 'Lactato', 'Lactate'), 'mmol/L', [null, 2.5], [null, 2.5]],
  [N('Glucosa', 'Glicose', 'Glucose'), 'mg/dL', [70, 143], [74, 159]],
];

const GASES_ARTERIALES = [
  [N('pH', 'pH', 'pH'), '', [7.35, 7.46], [7.31, 7.46]],
  [N('PaCO₂', 'PaCO₂', 'PaCO₂'), 'mmHg', [31, 43], [25, 37]],
  [N('PaO₂', 'PaO₂', 'PaO₂'), 'mmHg', [81, 103], [95, 118]],
  [N('Bicarbonato (HCO₃⁻)', 'Bicarbonato (HCO₃⁻)', 'Bicarbonate (HCO₃⁻)'), 'mmol/L', [19, 26], [14, 22]],
  [N('Saturación de O₂ (SaO₂)', 'Saturação de O₂ (SaO₂)', 'O₂ saturation (SaO₂)'), '%', [95, 100], [95, 100]],
  ...BASE_Y_QUIMICA_GASES,
];

const GASES_VENOSOS = [
  [N('pH', 'pH', 'pH'), '', [7.35, 7.44], [7.28, 7.41]],
  [N('PvCO₂', 'PvCO₂', 'PvCO₂'), 'mmHg', [33, 42], [33, 45]],
  [N('PvO₂', 'PvO₂', 'PvO₂'), 'mmHg', [48, 56], [28, 49]],
  [N('Bicarbonato (HCO₃⁻)', 'Bicarbonato (HCO₃⁻)', 'Bicarbonate (HCO₃⁻)'), 'mmol/L', [21, 24], [18, 23]],
  ...BASE_Y_QUIMICA_GASES,
];

export const PLANTILLAS_LAB = [
  { id: 'hemograma', titulo: N('Hemograma', 'Hemograma', 'Complete blood count'), filas: HEMOGRAMA },
  { id: 'quimica', titulo: N('Química sanguínea', 'Bioquímica sérica', 'Serum chemistry'), filas: QUIMICA },
  { id: 'uroanalisis', titulo: N('Uroanálisis', 'Urinálise', 'Urinalysis'), filas: UROANALISIS },
  { id: 'gases-venosos', titulo: N('Gases sanguíneos (venosos)', 'Hemogasometria venosa', 'Blood gas (venous)'), filas: GASES_VENOSOS },
  { id: 'gases-arteriales', titulo: N('Gases sanguíneos (arteriales)', 'Hemogasometria arterial', 'Blood gas (arterial)'), filas: GASES_ARTERIALES },
  { id: 'vacio', titulo: N('Panel personalizado', 'Tabela personalizada', 'Custom table'), filas: [] },
];

// Texto de una plantilla en un idioma (o tal cual si no es traducible).
export function enIdioma(v, idioma) {
  if (v && typeof v === 'object' && !Array.isArray(v)) return v[idioma] ?? v.es;
  return v;
}

// Panel nuevo a partir de una plantilla, con los rangos de la especie y
// los nombres en el idioma del panel.
export function panelDesdePlantilla(plantillaId, especie, idioma = 'es') {
  const p = PLANTILLAS_LAB.find((x) => x.id === plantillaId) || PLANTILLAS_LAB.find((x) => x.id === 'vacio');
  const i = especie === 'gato' ? 3 : 2;
  return {
    titulo: enIdioma(p.titulo, idioma),
    especie: especie === 'gato' ? 'gato' : 'perro',
    filas: p.filas.length
      ? p.filas.map((f) => {
          const r = f[i];
          const base = { parametro: enIdioma(f[0], idioma), valor: '', unidad: enIdioma(f[1], idioma) };
          return Array.isArray(r)
            ? { ...base, min: r[0], max: r[1], ref: '' }
            : { ...base, min: null, max: null, ref: enIdioma(r, idioma) };
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
