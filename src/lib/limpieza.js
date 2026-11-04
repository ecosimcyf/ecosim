// ============================================================
// Limpieza de mantenimiento, SOLO para el servidor. La usan el botón
// «Limpiar archivos huérfanos» del panel (super_admin) y la tarea diaria
// automática (src/app/api/cron/limpieza/route.js).
//
//  1. Borra de Storage los archivos que ya no usa ningún caso: subidas
//     abandonadas (pestaña cerrada a media subida, o URL firmada pedida y
//     nunca guardada), restos de borrados que fallaron a medias… Solo toca
//     archivos con más de 24 h, para no pisar una subida en curso.
//  2. Quita las reservas de subida vencidas (más de 24 h).
//  3. Borra contadores de intentos viejos y errores de más de 30 días.
// ============================================================
const PREFIJO_PUBLICO = (bucket) => '/storage/v1/object/public/' + bucket + '/';
const DIA_MS = 24 * 60 * 60 * 1000;

// Error de "falta la migración" (tabla o función inexistente).
export function faltaMigracion(error) {
  return ['42703', '42P01', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(error?.code);
}

async function todas(consulta) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta().range(desde, desde + 999);
    if (error) throw error;
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

async function listar(supabase, bucket, prefijo) {
  const items = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.storage.from(bucket).list(prefijo, { limit: 1000, offset });
    if (error) throw error;
    items.push(...(data || []));
    if (!data || data.length < 1000) return items;
  }
}

// Borra los archivos de "bucket" que no estén en "usados" (paths) y tengan
// más de 24 h. Revisa la raíz y un nivel de carpetas (como las crea el panel).
async function limpiarBucket(supabase, bucket, usados) {
  const limite = Date.now() - DIA_MS;
  const huerfanos = [];
  let bytes = 0;
  const revisar = (ruta, item) => {
    const fecha = Date.parse(item.created_at || item.updated_at || '');
    if (!usados.has(ruta) && Number.isFinite(fecha) && fecha < limite) {
      huerfanos.push(ruta);
      bytes += Number(item.metadata?.size) || 0;
    }
  };
  for (const item of await listar(supabase, bucket, '')) {
    if (item.id) revisar(item.name, item); // archivo suelto en la raíz (videos viejos)
    else for (const sub of await listar(supabase, bucket, item.name)) if (sub.id) revisar(item.name + '/' + sub.name, sub);
  }
  for (let i = 0; i < huerfanos.length; i += 100) {
    const { error } = await supabase.storage.from(bucket).remove(huerfanos.slice(i, i + 100));
    if (error) throw error;
  }
  return { borrados: huerfanos.length, bytes };
}

export async function limpiezaCompleta(supabase) {
  let borrados = 0;
  let bytes = 0;

  const usadosVideos = new Set((await todas(() => supabase.from('caso_videos').select('video_url')))
    .map((r) => (r.video_url || '').split(PREFIJO_PUBLICO('videos'))[1]).filter(Boolean));
  const r1 = await limpiarBucket(supabase, 'videos', usadosVideos);
  borrados += r1.borrados; bytes += r1.bytes;

  // Bucket de exámenes: solo si su tabla existe (si no, todo parecería huérfano).
  let usadosExamenes = null;
  try {
    usadosExamenes = new Set((await todas(() => supabase.from('caso_archivos').select('path'))).map((r) => r.path));
  } catch (err) {
    if (!faltaMigracion(err)) throw err;
  }
  if (usadosExamenes) {
    const r2 = await limpiarBucket(supabase, 'examenes', usadosExamenes);
    borrados += r2.borrados; bytes += r2.bytes;
  }

  // Tablas de la migración 2026-11-04 (si aún no existen, se omite).
  const haceUnDia = new Date(Date.now() - DIA_MS).toISOString();
  const haceUnMes = new Date(Date.now() - 30 * DIA_MS).toISOString();
  for (const [tabla, col, antes] of [
    ['subidas_pendientes', 'creada_en', haceUnDia],
    ['intentos', 'desde', haceUnDia],
    ['errores', 'creado_en', haceUnMes],
  ]) {
    const { error } = await supabase.from(tabla).delete().lt(col, antes);
    if (error && !faltaMigracion(error)) throw error;
  }

  return { borrados, liberadosMb: Math.round(bytes / (1024 * 1024)) };
}
