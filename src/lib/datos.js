// ============================================================
// Carga de datos de la VISTA PÚBLICA (el estudiante).
//
// Las mismas funciones sirven en el servidor (primer pintado) y en el
// navegador (al recargar por tiempo real). Reciben un cliente de Supabase
// ya creado y devuelven lo que la vista necesita.
//
// Puede haber varios casos activos a la vez: primero se lista cuáles son
// (para el menú) y solo al elegir uno se cargan sus puntos y videos.
// ============================================================

// Menú: casos que el estudiante puede elegir ahora mismo.
export async function listarCasosActivos(supabase) {
  const { data } = await supabase
    .from('casos').select('id,nombre,descripcion,especie').eq('activo', true).order('nombre');
  return data || [];
}

// Datos completos de UN caso (al elegirlo en el menú).
//
// Equivale a lo que hacía "simulacion-datos" en la app de escritorio
// (main.js:267-283): trae TODOS los puntos de la especie del caso y
// adjunta el video del caso a cada uno (o null si no tiene). Nunca trae
// el NOMBRE del punto (eso sería una pista para el estudiante).
export async function cargarDatosDeCaso(supabase, casoId) {
  if (!casoId) return { casoId: null };

  // 1. Datos del caso (para saber la especie).
  const { data: caso } = await supabase
    .from('casos').select('id,nombre,especie').eq('id', casoId).maybeSingle();
  if (!caso) return { casoId: null };

  // 2. Todos los puntos de esa especie (SIN nombre: vista puntos_publicos).
  const { data: puntos } = await supabase
    .from('puntos_publicos').select('id,especie,vista,x,y').eq('especie', caso.especie);

  // 3. Los videos que este caso asigna a cada punto.
  const { data: videos } = await supabase
    .from('caso_videos').select('punto_id,video_url').eq('caso_id', casoId);

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
