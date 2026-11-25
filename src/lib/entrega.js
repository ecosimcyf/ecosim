// ============================================================
// Tienda de casos, parte de SERVIDOR sin dependencias de Next.js (recibe el
// cliente de Supabase como argumento y solo importa módulos relativos), para
// poder probarla con `npm test` usando un Supabase falso.
//
//  · borrarObjetosSeguros: ÚNICA vía para borrar objetos de Storage. Un
//    objeto solo se borra si es del prefijo de la cuenta y ya nadie más lo
//    referencia (los casos comprados apuntan a objetos del catálogo).
//  · entregarAdquisicion: crea en la cuenta de la clínica las filas del caso
//    comprado (caso, puntos, videos, archivos) SIN copiar nada en Storage, y
//    si falla a mitad deshace lo creado.
//  · crearSolicitud / cambiarEstado / contadoresDeCasos.
// ============================================================
import { randomBytes } from 'node:crypto';
import {
  ErrorTienda, ESTADOS_VIVOS, planificarMapeoPuntos, pathDeUrlPublica, pathEsDeCuenta,
  puedeBorrarObjeto, monedaDeIdioma, columnaPrecio, transicionValida, urlWhatsappSolicitud,
} from './tienda.js';
import { faltaMigracion, paraLike } from './limpieza.js';
import { registrarError } from './errores.js';

// Tope de puntos por cuenta (cada punto es una fila que lee el estudiante).
export const MAX_PUNTOS_POR_CUENTA = 300;

const BUCKET_VIDEOS = 'videos';
const BUCKET_EXAMENES = 'examenes';
const PREFIJO_PUBLICO_VIDEOS = '/storage/v1/object/public/' + BUCKET_VIDEOS + '/';

// Mismo formato de id que addPunto (el valor por defecto de la base:
// 'punto-' + 8 caracteres hexadecimales).
export function idPunto() { return 'punto-' + randomBytes(4).toString('hex'); }

// ---------- utilidades ----------

function exigirSb(resultado, que) {
  if (resultado?.error) {
    console.error('[tienda] ' + que + ':', resultado.error);
    throw new ErrorTienda('err.operacion', { causa: resultado.error });
  }
  return resultado;
}

// Como exigirSb, pero una tabla/función que aún no existe es "la tienda no
// está habilitada" (migración sin ejecutar).
function exigirTienda(resultado, que) {
  if (faltaMigracion(resultado?.error)) throw new ErrorTienda('err.tiendaMigracion');
  return exigirSb(resultado, que);
}

async function todas(consulta, que) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = exigirSb(await consulta().range(desde, desde + 999), que);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

// ---------- borrado seguro de Storage ----------

// Cuántas filas (de CUALQUIER cuenta) referencian el objeto, o null si no se
// pudo comprobar. Se llama DESPUÉS de borrar la fila del que borra.
async function contarReferencias(supabase, bucket, path) {
  if (bucket === BUCKET_VIDEOS) {
    const { count, error } = await supabase.from('caso_videos').select('caso_id', { count: 'exact', head: true })
      .like('video_url', '%' + paraLike(PREFIJO_PUBLICO_VIDEOS + path));
    return error ? null : (count ?? null);
  }
  const { count, error } = await supabase.from('caso_archivos').select('id', { count: 'exact', head: true })
    .eq('path', path);
  if (error) return faltaMigracion(error) ? 0 : null; // sin la tabla no hay filas
  return count ?? null;
}

// Borra de Storage los "paths" que cumplan a la vez: (a) empiezan por
// "<cuentaId>/" y (b) ninguna fila los referencia ya. Ante cualquier duda
// (error de consulta) se CONSERVA el objeto; lo peor que pasa es un archivo
// huérfano, que la limpieza diaria recoge. Nunca lanza. Devuelve los paths
// que se mandaron borrar.
export async function borrarObjetosSeguros(supabase, { bucket, cuentaId, paths }) {
  const propios = [...new Set((paths || []).filter(Boolean))].filter((p) => pathEsDeCuenta(p, cuentaId));
  const aBorrar = [];
  try {
    for (let i = 0; i < propios.length; i += 10) {
      await Promise.all(propios.slice(i, i + 10).map(async (path) => {
        const referenciasRestantes = await contarReferencias(supabase, bucket, path);
        if (puedeBorrarObjeto({ path, cuentaId, referenciasRestantes })) aBorrar.push(path);
      }));
    }
    for (let i = 0; i < aBorrar.length; i += 100) {
      const { error } = await supabase.storage.from(bucket).remove(aBorrar.slice(i, i + 100));
      if (error) console.error('[tienda] no se pudieron borrar objetos de Storage:', error);
    }
  } catch (err) {
    console.error('[tienda] borrado seguro interrumpido:', err);
  }
  return aBorrar;
}

// Atajos para los dos buckets (videos se guardan como URL pública; los
// exámenes, como path).
export function borrarVideosSeguros(supabase, cuentaId, urls) {
  const paths = (urls || []).map((u) => pathDeUrlPublica(u, BUCKET_VIDEOS)).filter(Boolean);
  return borrarObjetosSeguros(supabase, { bucket: BUCKET_VIDEOS, cuentaId, paths });
}
export function borrarExamenesSeguros(supabase, cuentaId, paths) {
  return borrarObjetosSeguros(supabase, { bucket: BUCKET_EXAMENES, cuentaId, paths });
}

// ---------- catálogo: ¿este caso está en el catálogo? ----------

// id de catalogo_casos del caso, o null (también null si la tabla no existe).
export async function catalogoDeCaso(supabase, casoId) {
  const { data, error } = await supabase.from('catalogo_casos').select('id').eq('caso_origen_id', casoId).maybeSingle();
  if (error) {
    if (faltaMigracion(error)) return null;
    exigirSb({ error }, 'leer el catálogo');
  }
  return data?.id || null;
}

// ---------- contadores de un caso ----------

// { casoId: { videos, laboratorio, labArchivos, rx, vitales } } para los
// casos dados (laboratorio = paneles; rx = imágenes; vitales = booleano).
export async function contadoresDeCasos(supabase, casoIds) {
  const r = {};
  (casoIds || []).forEach((id) => { r[id] = { videos: 0, laboratorio: 0, labArchivos: 0, rx: 0, vitales: false }; });
  const ids = Object.keys(r);
  for (let i = 0; i < ids.length; i += 100) {
    const lote = ids.slice(i, i + 100);
    const videos = await todas(() => supabase.from('caso_videos').select('caso_id,punto_id').in('caso_id', lote)
      .order('caso_id').order('punto_id'), 'contar los videos');
    videos.forEach((v) => { r[v.caso_id].videos++; });
    try {
      const archivos = await todas(() => supabase.from('caso_archivos').select('id,caso_id,tipo').in('caso_id', lote)
        .order('id'), 'contar los archivos');
      archivos.forEach((a) => { r[a.caso_id][a.tipo === 'rx' ? 'rx' : 'labArchivos']++; });
      const casos = await todas(() => supabase.from('casos').select('id,laboratorio,vitales').in('id', lote)
        .order('id'), 'contar los exámenes');
      casos.forEach((c) => {
        r[c.id].laboratorio = Array.isArray(c.laboratorio) ? c.laboratorio.length : 0;
        r[c.id].vitales = !!c.vitales && Object.keys(c.vitales).length > 0;
      });
    } catch (err) {
      if (!faltaMigracion(err.causa)) throw err; // sin la migración de exámenes: solo videos
    }
  }
  return r;
}

// ---------- solicitud (cliente) ----------

// La clínica solicita un caso publicado. Moneda y precio de referencia salen
// del servidor (idioma de la cuenta y precio del catálogo): el cliente solo
// aporta la cuenta y el caso. Devuelve { adquisicion, whatsappUrl } SIN
// precios.
export async function crearSolicitud(supabase, { cuentaId, catalogoId, userId }) {
  const { data: cat, error: errCat } = await supabase.from('catalogo_casos')
    .select('id,titulo,publicado,precio_cop,precio_brl,precio_usd').eq('id', catalogoId).maybeSingle();
  exigirTienda({ error: errCat }, 'leer el catálogo');
  if (!cat || !cat.publicado) throw new ErrorTienda('err.catalogoNoExiste');

  const { data: cuenta } = exigirSb(await supabase.from('cuentas').select('id,nombre')
    .eq('id', cuentaId).maybeSingle(), 'leer la cuenta');
  if (!cuenta) throw new ErrorTienda('err.cuentaYaNoExiste');
  let idioma = 'es';
  const { data: ci, error: errIdioma } = await supabase.from('cuentas').select('idioma').eq('id', cuentaId).maybeSingle();
  if (!errIdioma && ci?.idioma) idioma = ci.idioma;
  else if (errIdioma && !faltaMigracion(errIdioma)) exigirSb({ error: errIdioma }, 'leer el idioma');

  // Viva o fallida (a la espera de que el asesor la revise): no se duplica.
  const { data: previas } = exigirTienda(await supabase.from('adquisiciones').select('id')
    .eq('cuenta_id', cuentaId).eq('catalogo_id', catalogoId).in('estado', [...ESTADOS_VIVOS, 'fallida']), 'leer las solicitudes');
  if (previas?.length) throw new ErrorTienda('err.adqYaExiste');

  const moneda = monedaDeIdioma(idioma);
  const { data: nueva, error } = await supabase.from('adquisiciones').insert({
    cuenta_id: cuentaId, catalogo_id: catalogoId, estado: 'solicitada', moneda,
    precio_referencia: cat[columnaPrecio(moneda)] ?? null, solicitada_por: userId || null,
  }).select('id,estado,solicitada_en').single();
  if (error?.code === '23505') throw new ErrorTienda('err.adqYaExiste');
  exigirTienda({ error }, 'crear la solicitud');

  return {
    adquisicion: { id: nueva.id, estado: nueva.estado, solicitadaEn: nueva.solicitada_en },
    whatsappUrl: urlWhatsappSolicitud({ idioma, cuenta: cuenta.nombre, titulo: cat.titulo }),
  };
}

// ---------- cambios de estado simples (super_admin) ----------

// solicitada -> pagada, o solicitada/pagada/fallida -> cancelada (con nota).
// Se actualiza con la condición "sigue en el estado que leí": si otro cambió
// la fila entretanto, no se pisa.
export async function cambiarEstado(supabase, adqId, hasta, { nota } = {}) {
  if (hasta !== 'pagada' && hasta !== 'cancelada') throw new ErrorTienda('err.adqEstado');
  const { data: adq } = exigirTienda(await supabase.from('adquisiciones').select('id,estado').eq('id', adqId).maybeSingle(),
    'leer la solicitud');
  if (!adq) throw new ErrorTienda('err.adqNoExiste');
  if (!transicionValida(adq.estado, hasta)) throw new ErrorTienda('err.adqEstado');
  const ahora = new Date().toISOString();
  const cambios = { estado: hasta, actualizada_en: ahora };
  if (hasta === 'pagada') cambios.pagada_en = ahora;
  if (typeof nota === 'string' && nota.trim()) cambios.nota = nota.trim().slice(0, 1000);
  const { data: filas } = exigirSb(await supabase.from('adquisiciones').update(cambios)
    .eq('id', adqId).eq('estado', adq.estado).select('id'), 'cambiar el estado');
  if (!filas?.length) throw new ErrorTienda('err.adqEstado');
}

// ---------- entrega ----------

// Entrega una adquisición: reclama (atómico), crea las filas en la cuenta
// de la clínica y la marca 'entregada'. Si algo falla, deshace las filas
// creadas en ESTE intento y la deja 'fallida' (se puede reintentar).
// Devuelve { casoId }. Lanza ErrorTienda.
export async function entregarAdquisicion(supabase, adqId, { nuevoId = idPunto, maxPuntos = MAX_PUNTOS_POR_CUENTA } = {}) {
  const { data: reclamadas, error } = await supabase.rpc('reclamar_entrega', { p_adq: adqId });
  exigirTienda({ error }, 'reclamar la entrega');
  const adq = Array.isArray(reclamadas) ? reclamadas[0] : reclamadas;
  if (!adq?.id) {
    const { data } = exigirSb(await supabase.from('adquisiciones').select('id').eq('id', adqId).maybeSingle(),
      'leer la solicitud');
    throw new ErrorTienda(data ? 'err.adqEstado' : 'err.adqNoExiste');
  }

  const creado = { casoId: null, puntos: [] };
  try {
    return { casoId: await crearFilasDeEntrega(supabase, adq, creado, { nuevoId, maxPuntos }) };
  } catch (err) {
    const ya = await compensar(supabase, adq, creado, err);
    if (ya) return { casoId: ya };
    if (err instanceof ErrorTienda && !err.causa) throw err; // aviso de validación (p. ej. tope de puntos)
    throw new ErrorTienda('err.entregaFallo');
  }
}

async function crearFilasDeEntrega(supabase, adq, creado, { nuevoId, maxPuntos }) {
  const cuentaId = adq.cuenta_id;
  const { data: cat } = exigirSb(await supabase.from('catalogo_casos').select('id,caso_origen_id')
    .eq('id', adq.catalogo_id).maybeSingle(), 'leer el catálogo');
  if (!cat) throw new ErrorTienda('err.catalogoNoExiste');
  const { data: origen } = exigirSb(await supabase.from('casos').select('*').eq('id', cat.caso_origen_id).maybeSingle(),
    'leer el caso del catálogo');
  if (!origen) throw new ErrorTienda('err.catalogoNoExiste');
  const { data: cuenta } = exigirSb(await supabase.from('cuentas').select('id').eq('id', cuentaId).maybeSingle(),
    'leer la cuenta');
  if (!cuenta) throw new ErrorTienda('err.cuentaYaNoExiste');

  // --- Leer todo ANTES de escribir nada ---
  const videos = await todas(() => supabase.from('caso_videos').select('punto_id,video_url,tamano_bytes')
    .eq('caso_id', origen.id).order('punto_id'), 'leer los videos del caso');
  let archivos = [];
  try {
    archivos = await todas(() => supabase.from('caso_archivos').select('tipo,path,url,titulo,mime,tamano_bytes,orden')
      .eq('caso_id', origen.id).order('id'), 'leer los archivos del caso');
  } catch (err) {
    if (!faltaMigracion(err.causa)) throw err;
  }
  const idsUsados = [...new Set(videos.map((v) => v.punto_id))];
  const puntosOrigen = idsUsados.length
    ? await todas(() => supabase.from('puntos').select('id,especie,vista,nombre,x,y').in('id', idsUsados).order('id'),
      'leer los puntos del caso')
    : [];
  const puntosDestino = await todas(() => supabase.from('puntos').select('id,especie,vista,nombre,x,y')
    .eq('cuenta_id', cuentaId).order('id'), 'leer los puntos de la cuenta');

  const plan = planificarMapeoPuntos({ puntosOrigen, puntosDestino, maxPuntos, nuevoId });
  if (plan.excede) throw new ErrorTienda('err.entregaLimitePuntos'); // aún no se escribió nada

  // Restos de un intento anterior que murió a mitad (la copia que la clínica
  // aún no tiene registrada en ninguna adquisición): se quitan antes.
  const { data: restos } = exigirSb(await supabase.from('casos').select('id')
    .eq('cuenta_id', cuentaId).eq('origen_catalogo_id', cat.id), 'buscar restos de entrega');
  if (restos?.length) {
    const { data: enUso } = exigirSb(await supabase.from('adquisiciones').select('caso_entregado_id')
      .in('caso_entregado_id', restos.map((c) => c.id)), 'leer las entregas');
    if (enUso?.length) throw new ErrorTienda('err.adqEstado'); // la clínica ya tiene este caso
    exigirSb(await supabase.from('casos').delete().in('id', restos.map((c) => c.id)), 'quitar restos de entrega');
  }

  // --- Escribir ---
  if (plan.nuevos.length) {
    creado.puntos = plan.nuevos.map((p) => p.id);
    exigirSb(await supabase.from('puntos').insert(plan.nuevos.map((p) => ({ ...p, cuenta_id: cuentaId }))),
      'crear los puntos');
  }

  const fila = {
    cuenta_id: cuentaId, nombre: origen.nombre, descripcion: origen.descripcion ?? '', especie: origen.especie,
    activo: false, origen_catalogo_id: cat.id,
  };
  if (origen.laboratorio !== undefined) fila.laboratorio = origen.laboratorio;
  if (origen.vitales !== undefined) fila.vitales = origen.vitales;
  const { data: nuevo } = exigirSb(await supabase.from('casos').insert(fila).select('id').single(), 'crear el caso');
  creado.casoId = nuevo.id;

  if (videos.length) {
    exigirSb(await supabase.from('caso_videos').insert(videos.map((v) => ({
      caso_id: nuevo.id, punto_id: plan.mapa[v.punto_id], video_url: v.video_url, tamano_bytes: v.tamano_bytes,
    }))), 'copiar los videos');
  }
  if (archivos.length) {
    exigirSb(await supabase.from('caso_archivos').insert(archivos.map((a) => ({
      caso_id: nuevo.id, tipo: a.tipo, path: a.path, url: a.url, titulo: a.titulo, mime: a.mime,
      tamano_bytes: a.tamano_bytes, orden: a.orden,
    }))), 'copiar los archivos');
  }

  const ahora = new Date().toISOString();
  const { data: fin } = exigirSb(await supabase.from('adquisiciones').update({
    estado: 'entregada', caso_entregado_id: nuevo.id, entregada_en: ahora, actualizada_en: ahora,
  }).eq('id', adq.id).eq('estado', 'entregando').select('id'), 'marcar la entrega');
  if (!fin?.length) throw new ErrorTienda('err.adqEstado');
  return nuevo.id;
}

// Deshace lo creado en este intento y deja la adquisición 'fallida'. Nunca
// lanza. Si resulta que la entrega SÍ había quedado hecha (el error fue al
// recibir la respuesta), no toca nada y devuelve el id del caso.
async function compensar(supabase, adq, creado, err) {
  await registrarError('tienda', err?.causa || err, { adquisicion: adq.id });
  try {
    const { data: ahora } = await supabase.from('adquisiciones').select('estado,caso_entregado_id').eq('id', adq.id).maybeSingle();
    if (ahora?.estado === 'entregada' && ahora.caso_entregado_id) return ahora.caso_entregado_id;
  } catch { /* se sigue con la compensación */ }

  const paso = async (que, fn) => {
    try { const { error } = await fn(); if (error) throw error; } catch (e) { await registrarError('tienda', e, { compensacion: que, adquisicion: adq.id }); }
  };
  if (creado.casoId) await paso('borrar el caso', () => supabase.from('casos').delete().eq('id', creado.casoId));
  if (creado.puntos.length) {
    await paso('borrar los puntos', () => supabase.from('puntos').delete().in('id', creado.puntos).eq('cuenta_id', adq.cuenta_id));
  }
  const nota = ('Entrega fallida: ' + (err instanceof ErrorTienda && !err.causa ? err.message
    : (err?.causa?.message || err?.message || 'error'))).slice(0, 900);
  await paso('marcar la entrega como fallida', () => supabase.from('adquisiciones')
    .update({ estado: 'fallida', nota, actualizada_en: new Date().toISOString() })
    .eq('id', adq.id).eq('estado', 'entregando'));
  return null;
}
