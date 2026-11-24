// ============================================================
// Validaciones puras del panel (sin Next.js ni Supabase), separadas de
// src/app/actions/admin.js para poder probarlas con `npm test`.
// ============================================================

// "Clínica Norte" -> "clinica-norte". Solo minúsculas, números y guiones:
// es lo que va en el enlace de los estudiantes (/c/<slug>).
export function normalizarSlug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function slugValido(s) { return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s); }

// Un archivo subido debe tener EXACTAMENTE la forma que genera el servidor
// al firmar la subida: "<cuentaId>/<uuid>.<ext>". No basta con startsWith:
// "cuentaId/../../auth/v1/admin/users" también "empieza con cuentaId/", y
// ese path se usa después en peticiones del servidor con la clave
// service_role. También impide tocar el archivo de OTRA cuenta.
// Devuelve la extensión si es válido, o null.
export function extensionDeSubida(cuentaId, path, extensiones) {
  if (typeof cuentaId !== 'string' || !cuentaId || typeof path !== 'string') return null;
  if (!path.startsWith(cuentaId + '/')) return null;
  const m = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.([a-z0-9]+)$/.exec(path.slice(cuentaId.length + 1));
  return m && extensiones.includes(m[1]) ? m[1] : null;
}

// Nombres que se ponen cuando el usuario deja el nombre vacío, en el idioma
// de la cuenta (cuentas.idioma: es/pt/en).
const NOMBRES_DEFECTO = {
  casoNuevo: { es: 'Caso nuevo', pt: 'Novo caso', en: 'New case' },
  caso: { es: 'Caso', pt: 'Caso', en: 'Case' },
  puntoNuevo: { es: 'Punto nuevo', pt: 'Novo ponto', en: 'New point' },
  punto: { es: 'Punto', pt: 'Ponto', en: 'Point' },
};

// clave: 'casoNuevo' | 'caso' | 'puntoNuevo' | 'punto'. Un idioma
// desconocido (o una clave desconocida) cae en español.
export function nombrePorDefecto(clave, idioma) {
  const m = NOMBRES_DEFECTO[clave] || NOMBRES_DEFECTO.caso;
  return Object.hasOwn(m, idioma) ? m[idioma] : m.es;
}
