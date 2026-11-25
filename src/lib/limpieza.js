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

// Tope de seguridad: si "huerfanos" son más del 20 % de los archivos del
// bucket (y más de 10), algo anda mal —p. ej. una consulta que devolvió
// filas de menos— y borrar sería un desastre. Función pura, probada en
// tests/servidor.test.mjs.
export function excedeTopeHuerfanos(huerfanos, total) {
  return huerfanos > 10 && huerfanos > total * 0.2;
}

// Escapa \ % y _ para usar un texto literal dentro de un "like".
export function paraLike(t) { return t.replace(/[\\%_]/g, (c) => '\\' + c); }

// OJO (tienda de casos): "usados" se lee de TODAS las cuentas a la vez, y los casos
// comprados apuntan a los mismos objetos que el catálogo; por eso un objeto
// compartido nunca parece huérfano mientras alguna fila lo referencie.
// Borra los archivos de "bucket" que no estén en "usados" (paths) y tengan
// más de 24 h. Revisa la raíz y un nivel de carpetas (como las crea el panel).
// "sigueEnUso(ruta)" vuelve a preguntarle a la base justo antes de borrar:
// "usados" se leyó hace rato y un caso pudo guardar el archivo entretanto.
async function limpiarBucket(supabase, bucket, usados, sigueEnUso) {
  const limite = Date.now() - DIA_MS;
  const huerfanos = [];
  let total = 0;
  let bytes = 0;
  const revisar = (ruta, item) => {
    total++;
    const fecha = Date.parse(item.created_at || item.updated_at || '');
    if (!usados.has(ruta) && Number.isFinite(fecha) && fecha < limite) {
      huerfanos.push({ ruta, tamano: Number(item.metadata?.size) || 0 });
    }
  };
  for (const item of await listar(supabase, bucket, '')) {
    if (item.id) revisar(item.name, item); // archivo suelto en la raíz (videos viejos)
    else for (const sub of await listar(supabase, bucket, item.name)) if (sub.id) revisar(item.name + '/' + sub.name, sub);
  }
  if (excedeTopeHuerfanos(huerfanos.length, total)) {
    throw new Error('Limpieza de "' + bucket + '" cancelada: ' + huerfanos.length + ' de ' + total
      + ' archivos parecen huérfanos (más del 20 %). No se borró nada; revisa a mano.');
  }
  const aBorrar = [];
  for (const h of huerfanos) {
    if (await sigueEnUso(h.ruta)) continue;
    aBorrar.push(h);
    bytes += h.tamano;
  }
  for (let i = 0; i < aBorrar.length; i += 100) {
    const { error } = await supabase.storage.from(bucket).remove(aBorrar.slice(i, i + 100).map((h) => h.ruta));
    if (error) throw error;
  }
  return { borrados: aBorrar.length, bytes };
}

export async function limpiezaCompleta(supabase) {
  let borrados = 0;
  let bytes = 0;
  const fallos = []; // un bucket que falla no impide limpiar el resto

  // Se pagina con orden estable (clave primaria): sin .order(), Postgres
  // puede repetir u omitir filas entre páginas y algo en uso parecería huérfano.
  const usadosVideos = new Set((await todas(() => supabase.from('caso_videos').select('video_url')
    .order('caso_id').order('punto_id')))
    .map((r) => (r.video_url || '').split(PREFIJO_PUBLICO('videos'))[1]).filter(Boolean));
  try {
    const r1 = await limpiarBucket(supabase, 'videos', usadosVideos, async (ruta) => {
      const { count, error } = await supabase.from('caso_videos').select('caso_id', { count: 'exact', head: true })
        .like('video_url', '%' + paraLike(PREFIJO_PUBLICO('videos') + ruta));
      return !!error || count > 0; // ante la duda, se conserva
    });
    borrados += r1.borrados; bytes += r1.bytes;
  } catch (err) { fallos.push(err); }

  // Bucket de exámenes: solo si su tabla existe (si no, todo parecería huérfano).
  let usadosExamenes = null;
  try {
    usadosExamenes = new Set((await todas(() => supabase.from('caso_archivos').select('path').order('id'))).map((r) => r.path));
  } catch (err) {
    if (!faltaMigracion(err)) throw err;
  }
  if (usadosExamenes) {
    try {
      const r2 = await limpiarBucket(supabase, 'examenes', usadosExamenes, async (ruta) => {
        const { count, error } = await supabase.from('caso_archivos').select('id', { count: 'exact', head: true }).eq('path', ruta);
        return !!error || count > 0;
      });
      borrados += r2.borrados; bytes += r2.bytes;
    } catch (err) { fallos.push(err); }
  }

  // Tablas de la migración 2026-11-04 (si aún no existen, se omite).
  const haceUnDia = new Date(Date.now() - DIA_MS).toISOString();
  const haceUnMes = new Date(Date.now() - 30 * DIA_MS).toISOString();
  for (const [tabla, col, antes] of [
    ['subidas_pendientes', 'creada_en', haceUnDia],
    ['intentos', 'desde', haceUnDia],
    // Tabla de una versión anterior (registro de errores): se vacía sola.
    ['errores', 'creado_en', haceUnMes],
  ]) {
    const { error } = await supabase.from(tabla).delete().lt(col, antes);
    if (error && !faltaMigracion(error)) throw error;
  }

  if (fallos.length) throw fallos[0]; // ya se limpió lo demás; el error queda registrado
  return { borrados, liberadosMb: Math.round(bytes / (1024 * 1024)) };
}
