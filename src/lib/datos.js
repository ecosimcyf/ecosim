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

// Resuelve el slug de la URL (/c/[slug]) a su cuenta. Sigue siendo select
// directo sobre la vista pública: no expone cupos ni nada sensible por
// cuenta, así que no hace falta pasarla por una función RPC.
export async function resolverCuenta(supabase, slug) {
  const { data } = await supabase
    .from('cuentas_publicas').select('id,slug,nombre,activa').eq('slug', slug).maybeSingle();
  return data || null;
}

// Menú: casos activos de ESTA cuenta que el estudiante puede elegir ahora
// mismo.
export async function listarCasosActivos(supabase, cuentaId) {
  const { data } = await supabase.rpc('casos_activos_de_cuenta', { p_cuenta_id: cuentaId });
  return data || [];
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
  // activos.
  const { data: filas } = await supabase.rpc('caso_publico', { p_cuenta_id: cuentaId, p_caso_id: casoId });
  const caso = filas?.[0];
  if (!caso) return { casoId: null };

  // 2. Todos los puntos de esa especie (SIN nombre: vista puntos_publicos).
  const { data: puntos } = await supabase
    .from('puntos_publicos').select('id,especie,vista,x,y').eq('especie', caso.especie);

  // 3. Los videos que este caso asigna a cada punto, por función RPC.
  const { data: videos } = await supabase.rpc('videos_de_caso_publico', { p_cuenta_id: cuentaId, p_caso_id: casoId });

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
