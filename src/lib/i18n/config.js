// ============================================================
// Idiomas de la app: español (por defecto), portugués (Brasil) e inglés.
//
// Los textos viven en src/lib/i18n/textos/, un archivo por zona (landing,
// textos legales, vista del estudiante, exámenes, panel), cada uno con las
// tres versiones { es, pt, en }. Así el navegador del estudiante solo
// descarga los textos de su vista, no los del panel.
//
// Qué idioma se usa en cada sitio:
//   · Landing, legales, login: el que eligió el visitante (cookie
//     "idioma") o, si nunca eligió, el de su navegador.
//   · Vista del estudiante: el que eligió (cookie) o el de la cuenta.
//   · Panel: el de la cuenta (lo cambia su admin); el super_admin, el suyo.
//
// Este archivo no importa nada de servidor ni de navegador: lo usan los dos.
// ============================================================

export const IDIOMAS = ['es', 'pt', 'en'];
export const IDIOMA_DEFECTO = 'es';
export const COOKIE_IDIOMA = 'idioma';

// Nombre de cada idioma en su propio idioma (así lo reconoce quien no
// entiende los otros dos).
export const NOMBRES_IDIOMA = { es: 'Español', pt: 'Português', en: 'English' };

// Para fechas y números (Intl) y para <html lang>.
export const LOCALE = { es: 'es-CO', pt: 'pt-BR', en: 'en-US' };
export const LOCALE_OG = { es: 'es_CO', pt: 'pt_BR', en: 'en_US' };

export function idiomaValido(v) {
  return IDIOMAS.includes(v) ? v : null;
}

// Cabecera Accept-Language del navegador ("pt-BR,pt;q=0.9,en;q=0.8") →
// el primero de nuestros idiomas que aparezca, respetando las preferencias.
export function idiomaDeNavegador(cabecera) {
  const pedidos = String(cabecera || '')
    .split(',')
    .map((parte) => {
      const [etiqueta, ...params] = parte.trim().split(';');
      const q = params.find((p) => p.trim().startsWith('q='));
      return { base: etiqueta.trim().slice(0, 2).toLowerCase(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((p) => p.base && p.q > 0)
    .sort((a, b) => b.q - a.q);
  for (const p of pedidos) {
    if (IDIOMAS.includes(p.base)) return p.base;
  }
  return null;
}

// t('grupo.clave', { n: 3 }) sobre un diccionario { es, pt, en }.
//   · Un texto con {variables} se rellena con vars.
//   · Una función (para plurales y frases que cambian según el dato) se
//     llama con vars.
//   · Si la clave no existe en el idioma, se usa la del español; si
//     tampoco, se devuelve tal cual (así un texto que no es una clave —
//     p. ej. un error de Supabase— se muestra sin romper nada).
export function crearT(diccionarios, idioma) {
  const dic = diccionarios[idiomaValido(idioma) || IDIOMA_DEFECTO];
  const base = diccionarios[IDIOMA_DEFECTO];
  return function t(clave, vars) {
    if (typeof clave !== 'string') return clave;
    let v = buscar(dic, clave);
    if (v === undefined) v = buscar(base, clave);
    if (v === undefined) return clave;
    if (typeof v === 'function') return v(vars || {});
    if (typeof v === 'string' && vars) return rellenar(v, vars);
    return v;
  };
}

// Junta varios diccionarios { es, pt, en } en uno solo.
export function unir(...lista) {
  const r = {};
  for (const id of IDIOMAS) r[id] = Object.assign({}, ...lista.map((d) => d[id] || {}));
  return r;
}

function buscar(obj, clave) {
  let v = obj;
  for (const parte of clave.split('.')) {
    if (v == null || typeof v !== 'object') return undefined;
    v = v[parte];
  }
  return v;
}

function rellenar(texto, vars) {
  return texto.replace(/\{(\w+)\}/g, (m, k) => (vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : m));
}
