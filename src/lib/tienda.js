// ============================================================
// Tienda de casos: lógica PURA (sin Next.js ni Supabase), para poder
// probarla con `npm test`. Las usan src/app/actions/tienda.js (acciones),
// src/lib/entrega.js (entrega y borrado seguro) y las pantallas.
//
// Resumen del modelo (ver supabase/migracion-2026-11-25-tienda.sql):
//  · El super_admin crea los casos a vender en la cuenta técnica «catalogo»
//    y los publica en catalogo_casos con un precio de REFERENCIA por moneda
//    que solo él ve. La clínica nunca ve precios.
//  · La clínica solicita; el super_admin cobra por fuera, marca «pagada» y
//    «entrega»: se crean filas nuevas (caso, videos, archivos) que APUNTAN a
//    los mismos objetos de Storage del catálogo. Nada se copia en Storage.
// ============================================================
import { PANEL } from './i18n/textos/panel.js';
import { whatsappUrl } from '../app/landing/contacto.js';

// Slug y id de la cuenta técnica que guarda los casos del catálogo. El código
// la localiza SIEMPRE por id; el slug está reservado (ninguna otra cuenta
// puede llamarse así).
export const SLUG_CATALOGO = 'catalogo';
export const CUENTA_CATALOGO_ID = 'cuenta-catalogo';

// ---------- monedas ----------

export const MONEDAS = ['COP', 'BRL', 'USD'];
const MONEDA_DE_IDIOMA = { es: 'COP', pt: 'BRL', en: 'USD' };
const COLUMNA_PRECIO = { COP: 'precio_cop', BRL: 'precio_brl', USD: 'precio_usd' };

// Moneda que aplica a una cuenta según su idioma (cuentas.idioma).
export function monedaDeIdioma(idioma) {
  return Object.hasOwn(MONEDA_DE_IDIOMA, idioma) ? MONEDA_DE_IDIOMA[idioma] : 'COP';
}

// Columna de catalogo_casos con el precio de esa moneda.
export function columnaPrecio(moneda) {
  return Object.hasOwn(COLUMNA_PRECIO, moneda) ? COLUMNA_PRECIO[moneda] : COLUMNA_PRECIO.COP;
}

// ---------- errores ----------

// Error de validación/lógica con una clave err.* (el panel la traduce). Lo
// usan los módulos sin dependencias de Next; las acciones lo convierten en
// su ErrorAdmin.
export class ErrorTienda extends Error {
  constructor(clave, { vars, causa } = {}) { super(clave); this.vars = vars; this.causa = causa; }
}

// ---------- estados de una adquisición ----------

export const ESTADOS = ['solicitada', 'pagada', 'entregando', 'entregada', 'cancelada', 'fallida'];
// «Viva»: ocupa el cupo único (cuenta, catálogo) del índice parcial de la base.
export const ESTADOS_VIVOS = ['solicitada', 'pagada', 'entregando', 'entregada'];

// Transiciones que pueden pedir las ACCIONES. 'entregando' → entregada/fallida
// las hace el propio proceso de entrega (no se piden desde fuera). Entregar
// exige el pago marcado: solicitada solo puede pasar a pagada o cancelada.
const TRANSICIONES = {
  solicitada: ['pagada', 'cancelada'],
  pagada: ['cancelada', 'entregando'],
  fallida: ['cancelada', 'entregando'],
  entregando: ['entregada', 'fallida'],
  entregada: [],
  cancelada: [],
};

// "casoBorrado": la adquisición está entregada pero la clínica borró el caso
// (caso_entregado_id nulo): en ese único caso se puede volver a entregar.
export function transicionValida(desde, hasta, { casoBorrado = false } = {}) {
  if (desde === 'entregada' && hasta === 'entregando') return !!casoBorrado;
  return Object.hasOwn(TRANSICIONES, desde) && TRANSICIONES[desde].includes(hasta);
}

// ¿Esta adquisición se puede (re)entregar ahora? pagada, fallida, o entregada
// cuyo caso la clínica borró. (La 'entregando' atascada la reclama el SQL.)
export function puedeEntregarse({ estado, casoEntregadoId }) {
  return transicionValida(estado, 'entregando', { casoBorrado: estado === 'entregada' && !casoEntregadoId });
}

// ---------- validación de datos del catálogo ----------

export const NIVELES = ['basico', 'intermedio', 'avanzado'];
const corto = (v, max) => String(v ?? '').trim().slice(0, max);

// Precio de referencia: null/'' = sin precio. Número >= 0 con 2 decimales.
export function limpiarPrecio(v) {
  if (v == null || (typeof v === 'string' && v.trim() === '')) return null;
  if (typeof v === 'boolean') throw new ErrorTienda('err.precio');
  const n = Number(typeof v === 'string' ? v.replace(',', '.') : v);
  if (!Number.isFinite(n) || n < 0 || n > 999999999999) throw new ErrorTienda('err.precio');
  return Math.round(n * 100) / 100;
}

// Valida y limpia los datos que manda el super_admin. "parcial": en una
// actualización solo se validan las claves presentes. Devuelve columnas de
// catalogo_casos (sin id ni caso_origen_id).
export function limpiarDatosCatalogo(datos, { parcial = false } = {}) {
  const d = datos && typeof datos === 'object' ? datos : {};
  const r = {};
  const tiene = (k) => !parcial || d[k] !== undefined;
  if (tiene('titulo')) {
    r.titulo = corto(d.titulo, 120);
    if (!r.titulo) throw new ErrorTienda('err.tituloCatalogo');
  }
  if (tiene('descripcionVenta')) r.descripcion_venta = corto(d.descripcionVenta, 2000);
  for (const [k, col] of [['precioCop', 'precio_cop'], ['precioBrl', 'precio_brl'], ['precioUsd', 'precio_usd']]) {
    if (tiene(k)) r[col] = limpiarPrecio(d[k]);
  }
  if (tiene('portadaUrl')) {
    const u = corto(d.portadaUrl, 1000);
    if (u && !/^https:\/\/\S+$/i.test(u)) throw new ErrorTienda('err.portada');
    r.portada_url = u || null;
  }
  if (tiene('nivel')) {
    if (d.nivel == null || d.nivel === '') r.nivel = null;
    else if (NIVELES.includes(d.nivel)) r.nivel = d.nivel;
    else throw new ErrorTienda('err.nivel');
  }
  if (tiene('etiquetas')) {
    const lista = Array.isArray(d.etiquetas) ? d.etiquetas : String(d.etiquetas ?? '').split(',');
    r.etiquetas = [...new Set(lista.map((e) => corto(e, 30)).filter(Boolean))].slice(0, 10);
  }
  if (tiene('orden')) {
    const n = Number(d.orden ?? 0);
    r.orden = Number.isInteger(n) && n >= -100000 && n <= 100000 ? n : 0;
  }
  if (tiene('publicado')) r.publicado = !!d.publicado;
  return r;
}

// ---------- puntos del maniquí ----------

// Nombre de punto comparable: sin espacios de más, minúsculas y espacios
// internos colapsados ("  Riñón   Izq " -> "riñón izq").
export function normalizarNombrePunto(nombre) {
  return String(nombre ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

const claveDePunto = (p) => p.especie + '|' + p.vista + '|' + normalizarNombrePunto(p.nombre);

// Decide qué punto de la cuenta destino usa cada punto del caso origen.
//  · puntosOrigen: puntos usados por los videos del caso [{id,especie,vista,nombre,x,y}]
//  · puntosDestino: TODOS los puntos de la cuenta destino (mismo formato)
//  · maxPuntos: tope de puntos por cuenta
//  · nuevoId(): genera el id de un punto nuevo
// Un punto del origen reutiliza uno del destino con la misma (especie, vista,
// nombre normalizado); si no hay, se crea copiando x,y. Dos puntos del origen
// con el mismo nombre NUNCA comparten destino (el caso tiene un video por
// punto y la clave primaria es (caso, punto)).
// Devuelve { mapa: {idOrigen: idDestino}, nuevos: [punto], excede, total }.
export function planificarMapeoPuntos({ puntosOrigen, puntosDestino, maxPuntos, nuevoId }) {
  const libres = new Map(); // clave -> ids de destino aún sin asignar
  for (const p of puntosDestino || []) {
    const k = claveDePunto(p);
    if (!libres.has(k)) libres.set(k, []);
    libres.get(k).push(p.id);
  }
  const mapa = {};
  const nuevos = [];
  const ocupados = new Set((puntosDestino || []).map((p) => p.id));
  for (const o of puntosOrigen || []) {
    const cola = libres.get(claveDePunto(o));
    if (cola?.length) {
      mapa[o.id] = cola.shift();
      continue;
    }
    let id = nuevoId();
    while (ocupados.has(id)) id = nuevoId();
    ocupados.add(id);
    nuevos.push({ id, especie: o.especie, vista: o.vista, nombre: o.nombre, x: o.x, y: o.y });
    mapa[o.id] = id;
  }
  const total = (puntosDestino || []).length + nuevos.length;
  return { mapa, nuevos, total, excede: total > maxPuntos };
}

// ---------- objetos de Storage (borrado seguro) ----------

// De una URL pública de Storage saca el path dentro del bucket, o null.
export function pathDeUrlPublica(url, bucket) {
  const marca = '/storage/v1/object/public/' + bucket + '/';
  const i = String(url ?? '').indexOf(marca);
  if (i < 0) return null;
  let p = String(url).slice(i + marca.length).split(/[?#]/)[0];
  try { p = decodeURIComponent(p); } catch { return null; }
  return p || null;
}

// ¿El path pertenece a esta cuenta? Empieza por "<cuentaId>/" y no trae
// recorridos de carpetas.
export function pathEsDeCuenta(path, cuentaId) {
  if (typeof path !== 'string' || typeof cuentaId !== 'string' || !cuentaId) return false;
  if (!path.startsWith(cuentaId + '/')) return false;
  return !path.split('/').some((parte) => parte === '..' || parte === '.' || parte === '');
}

// Regla de oro del borrado: un objeto solo se borra si (a) es de la cuenta
// que lo borra y (b) ninguna otra fila lo sigue referenciando.
// "referenciasRestantes": cuántas filas (de cualquier cuenta) lo referencian
// DESPUÉS de haber borrado la fila; null/undefined = no se pudo comprobar
// (se conserva: ante la duda, no se borra).
export function puedeBorrarObjeto({ path, cuentaId, referenciasRestantes }) {
  if (!pathEsDeCuenta(path, cuentaId)) return false;
  return Number.isInteger(referenciasRestantes) && referenciasRestantes === 0;
}

// ---------- WhatsApp «Solicitar» ----------

// URL wa.me con el mensaje ya escrito, en el idioma de la cuenta, con el
// nombre de la cuenta y el título del caso. NO incluye precios.
export function urlWhatsappSolicitud({ idioma, cuenta, titulo }) {
  const dic = PANEL[Object.hasOwn(PANEL, idioma) ? idioma : 'es'];
  return whatsappUrl(dic.tienda.whatsapp({ cuenta: corto(cuenta, 120), caso: corto(titulo, 120) }));
}
