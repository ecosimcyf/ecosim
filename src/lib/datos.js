// ============================================================
// Carga de datos de la VISTA PÚBLICA (el estudiante), siempre dentro de
// una cuenta (ver resolverCuenta): cada cliente solo ve sus propios casos.
//
// Las mismas funciones sirven en el servidor (primer pintado) y en el
// navegador (al recargar por tiempo real). Reciben un cliente de Supabase
// ya creado y devuelven lo que la vista necesita.
//
// Puede haber varios casos activos a la vez: primero se lista cuáles son
// (para el menú) y solo al elegir uno se cargan sus puntos y videos.
//
// La lectura pública de "casos"/"caso_videos" es solo por función RPC
// (casos_activos_de_cuenta / caso_publico / videos_de_caso_publico): esas
// 2 tablas ya no tienen select directo para anon/authenticated, así nadie
// puede pedir por la REST API los casos de otra cuenta (ver migración
// 2026-10-26 en supabase/schema.sql).
// ============================================================

// Resuelve el slug de la URL (/c/[slug]) a su cuenta, por función RPC.
// Antes era un select directo sobre la vista "cuentas_publicas", que
// devolvía TODAS las cuentas (nombre, slug, activa) a cualquiera con la
// clave anon — cómodo para enumerar el listado completo de clientes desde
// afuera. La función cuenta_por_slug solo devuelve la cuenta de ESE slug
// (o ninguna fila si no existe), nunca el listado (ver migración
// "cerrar cuentas_publicas" en supabase/schema.sql).
export async function resolverCuenta(supabase, slug) {
  const { data } = await supabase.rpc('cuenta_por_slug', { p_slug: slug });
  return data?.[0] || null;
}

// Menú: casos activos de ESTA cuenta que el estudiante puede elegir ahora
// mismo.
//
// Devuelve null (no []) si la consulta FALLA (red caída, Supabase lento…):
// así quien llama distingue "no hay casos activos" de "no se pudo
// preguntar". Antes un corte de red se leía como lista vacía y el sondeo
// sacaba al estudiante de su caso con "El profesor desactivó este caso".
export async function listarCasosActivos(supabase, cuentaId) {
  try {
    const { data, error } = await supabase.rpc('casos_activos_de_cuenta', { p_cuenta_id: cuentaId });
    if (error) return null;
    return data || [];
  } catch {
    return null;
  }
}

// Datos completos de UN caso de ESTA cuenta (al elegirlo en el menú).
//
// Equivale a lo que hacía "simulacion-datos" en la app de escritorio
// (main.js:267-283): trae TODOS los puntos de la especie del caso y
// adjunta el video del caso a cada uno (o null si no tiene). Nunca trae
// el NOMBRE del punto (eso sería una pista para el estudiante).
export async function cargarDatosDeCaso(supabase, casoId, cuentaId) {
  if (!casoId) return { casoId: null };

  // 1. Datos del caso (para saber la especie), por función RPC: exige que
  // el caso sea de esta cuenta y que tanto el caso como la cuenta estén
  // activos. Un error de red se devuelve como {error} (no como "caso
  // desactivado"), para que la vista ofrezca reintentar.
  const { data: filas, error: errCaso } = await supabase.rpc('caso_publico', { p_cuenta_id: cuentaId, p_caso_id: casoId });
  if (errCaso) return { casoId: null, error: true };
  const caso = filas?.[0];
  if (!caso) return { casoId: null };

  // 2. Todos los puntos de ESTA cuenta y esa especie (SIN nombre: eso sería
  // una pista), por función RPC — los puntos son propios de cada cuenta,
  // así que no basta con filtrar por especie (ver migración 2026-10-28 en
  // supabase/schema.sql).
  // 3. Los videos que este caso asigna a cada punto, por función RPC.
  const [{ data: puntos, error: errPuntos }, { data: videos, error: errVideos }] = await Promise.all([
    supabase.rpc('puntos_publicos_de_cuenta', { p_cuenta_id: cuentaId, p_especie: caso.especie }),
    supabase.rpc('videos_de_caso_publico', { p_cuenta_id: cuentaId, p_caso_id: casoId }),
  ]);
  if (errPuntos || errVideos) return { casoId: null, error: true };

  const mapa = {};
  (videos || []).forEach((v) => { mapa[v.punto_id] = v.video_url; });

  const lista = (puntos || []).map((p) => ({
    id: p.id,
    vista: p.vista || 'ventral',
    x: p.x,
    y: p.y,
    videoUrl: mapa[p.id] || null,
  }));

  return {
    casoId: caso.id,
    especie: caso.especie === 'gato' ? 'gato' : 'perro',
    casoNombre: caso.nombre,
    puntos: lista,
  };
}
