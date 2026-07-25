'use server';
// ============================================================
// Acciones del panel de administración.
//
// TODAS comprueban primero la sesión de admin (requerirAdmin) y usan el
// cliente "service_role", que salta la seguridad RLS. Así el navegador
// (clave anon) nunca escribe directamente en las tablas.
//
// Casi todas devuelven el estado COMPLETO y actualizado (leerTodo), igual
// que la app de escritorio devolvía store.getDatos() tras cada cambio.
// ============================================================
import { randomUUID } from 'node:crypto';
import { cookies } from 'next/headers';
import { verificarToken, COOKIE_SESION } from '@/lib/session';
import { crearClienteAdmin } from '@/lib/supabase/admin';

const BUCKET = 'videos';
const PREFIJO_PUBLICO = '/storage/v1/object/public/' + BUCKET + '/';

// ---------- helpers (no exportados) ----------

async function requerirAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESION)?.value;
  const ok = await verificarToken(token, process.env.ADMIN_SESSION_SECRET);
  if (!ok) throw new Error('No autorizado');
}

function especieOk(e) { return e === 'gato' ? 'gato' : 'perro'; }
function vistaOk(v) { return v === 'izq' || v === 'der' ? v : 'ventral'; }

// Borra de Storage los archivos de una lista de URLs públicas.
async function borrarVideosStorage(supabase, urls) {
  const paths = (urls || [])
    .map((u) => (u || '').split(PREFIJO_PUBLICO)[1])
    .filter(Boolean);
  if (paths.length) {
    try { await supabase.storage.from(BUCKET).remove(paths); } catch {}
  }
}

// Lee TODO el estado que necesita el panel.
async function leerTodo(supabase) {
  const [cfgR, puntosR, casosR, cvR] = await Promise.all([
    supabase.from('config').select('caso_activo_id').eq('id', 1).maybeSingle(),
    supabase.from('puntos').select('id,especie,vista,nombre,x,y'),
    supabase.from('casos').select('id,nombre,descripcion,especie').order('nombre'),
    supabase.from('caso_videos').select('caso_id,punto_id,video_url'),
  ]);

  const videosPorCaso = {};
  (cvR.data || []).forEach((r) => {
    if (!videosPorCaso[r.caso_id]) videosPorCaso[r.caso_id] = {};
    videosPorCaso[r.caso_id][r.punto_id] = r.video_url;
  });

  const casos = (casosR.data || []).map((c) => ({
    ...c,
    numVideos: Object.keys(videosPorCaso[c.id] || {}).length,
  }));

  return {
    casoActivoId: cfgR.data?.caso_activo_id || null,
    puntos: puntosR.data || [],
    casos,
    videosPorCaso,
  };
}

// ---------- lectura inicial ----------

export async function leerDatosAdmin() {
  await requerirAdmin();
  return leerTodo(crearClienteAdmin());
}

// ---------- caso activo ----------

export async function setCasoActivo(casoId) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  await supabase.from('config').update({ caso_activo_id: casoId || null }).eq('id', 1);
  return leerTodo(supabase);
}

// ---------- casos ----------

export async function crearCaso(nombre, especie) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const { data: nuevo } = await supabase
    .from('casos')
    .insert({ nombre: (nombre || '').trim() || 'Caso nuevo', especie: especieOk(especie) })
    .select('id').single();

  // Si no había ningún caso activo, activamos este.
  const { data: cfg } = await supabase.from('config').select('caso_activo_id').eq('id', 1).maybeSingle();
  if (!cfg?.caso_activo_id && nuevo?.id) {
    await supabase.from('config').update({ caso_activo_id: nuevo.id }).eq('id', 1);
  }
  return leerTodo(supabase);
}

export async function renombrarCaso(casoId, nombre) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  await supabase.from('casos').update({ nombre: (nombre || '').trim() || 'Caso' }).eq('id', casoId);
  return leerTodo(supabase);
}

export async function cambiarEspecieCaso(casoId, especie) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  await supabase.from('casos').update({ especie: especieOk(especie) }).eq('id', casoId);
  return leerTodo(supabase);
}

export async function eliminarCaso(casoId) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const { data: vids } = await supabase.from('caso_videos').select('video_url').eq('caso_id', casoId);
  await borrarVideosStorage(supabase, (vids || []).map((v) => v.video_url));
  // Al borrar el caso, sus caso_videos se borran solos (cascade) y si era
  // el activo, config.caso_activo_id pasa a null (on delete set null).
  await supabase.from('casos').delete().eq('id', casoId);
  return leerTodo(supabase);
}

// ---------- puntos (catálogo global del maniquí) ----------

export async function addPunto({ especie, vista }) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const { data: nuevo } = await supabase
    .from('puntos')
    .insert({ especie: especieOk(especie), vista: vistaOk(vista), nombre: 'Punto nuevo', x: 50, y: 45 })
    .select('id').single();
  const datos = await leerTodo(supabase);
  return { ...datos, nuevoPuntoId: nuevo?.id || null };
}

export async function actualizarPunto(puntoId, campos) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const limpio = {};
  if (typeof campos.nombre === 'string') limpio.nombre = campos.nombre.trim() || 'Punto';
  if (typeof campos.x === 'number') limpio.x = campos.x;
  if (typeof campos.y === 'number') limpio.y = campos.y;
  if (campos.vista) limpio.vista = vistaOk(campos.vista);
  if (campos.especie) limpio.especie = especieOk(campos.especie);
  if (Object.keys(limpio).length) await supabase.from('puntos').update(limpio).eq('id', puntoId);
  return leerTodo(supabase);
}

export async function eliminarPunto(puntoId) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const { data: vids } = await supabase.from('caso_videos').select('video_url').eq('punto_id', puntoId);
  await borrarVideosStorage(supabase, (vids || []).map((v) => v.video_url));
  await supabase.from('puntos').delete().eq('id', puntoId); // cascade borra sus caso_videos
  return leerTodo(supabase);
}

// ---------- videos por caso ----------

// Paso 1: el servidor genera una URL firmada para que el navegador suba
// el archivo directamente a Storage (sin pasar el video por nuestra
// función, que tiene límite de tamaño).
export async function crearUrlSubidaVideo() {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const path = randomUUID() + '.mp4';
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error('No se pudo preparar la subida: ' + error.message);
  return { path: data.path, token: data.token };
}

// Paso 2: tras subir, guardamos la URL pública en caso_videos.
export async function guardarVideoCaso(casoId, puntoId, path) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = data.publicUrl;

  // Si ya había un video en este punto/caso, borrar el archivo anterior.
  const { data: prev } = await supabase
    .from('caso_videos').select('video_url')
    .eq('caso_id', casoId).eq('punto_id', puntoId).maybeSingle();
  if (prev?.video_url && prev.video_url !== url) {
    await borrarVideosStorage(supabase, [prev.video_url]);
  }

  await supabase.from('caso_videos').upsert({ caso_id: casoId, punto_id: puntoId, video_url: url });
  return leerTodo(supabase);
}

export async function quitarVideoCaso(casoId, puntoId) {
  await requerirAdmin();
  const supabase = crearClienteAdmin();
  const { data: row } = await supabase
    .from('caso_videos').select('video_url')
    .eq('caso_id', casoId).eq('punto_id', puntoId).maybeSingle();
  if (row?.video_url) await borrarVideosStorage(supabase, [row.video_url]);
  await supabase.from('caso_videos').delete().eq('caso_id', casoId).eq('punto_id', puntoId);
  return leerTodo(supabase);
}
