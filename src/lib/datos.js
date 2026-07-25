// ============================================================
// Carga de datos de la VISTA PÚBLICA (el estudiante).
//
// La misma función sirve en el servidor (primer pintado) y en el
// navegador (al recargar por tiempo real). Recibe un cliente de Supabase
// ya creado y devuelve todo lo que la vista necesita.
//
// Equivale a lo que hacía "simulacion-datos" en la app de escritorio
// (main.js:267-283): trae TODOS los puntos de la especie del caso activo
// y adjunta el video del caso a cada uno (o null si no tiene). Nunca
// trae el NOMBRE del punto (eso sería una pista para el estudiante).
// ============================================================

export async function cargarDatosPublicos(supabase) {
  // 1. ¿Cuál es el caso activo?
  const { data: cfg } = await supabase
    .from('config').select('caso_activo_id').eq('id', 1).maybeSingle();
  const casoActivoId = cfg?.caso_activo_id || null;
  if (!casoActivoId) return { casoActivoId: null };

  // 2. Datos del caso (para saber la especie).
  const { data: caso } = await supabase
    .from('casos').select('id,nombre,especie').eq('id', casoActivoId).maybeSingle();
  if (!caso) return { casoActivoId: null };

  // 3. Todos los puntos de esa especie (SIN nombre: vista puntos_publicos).
  const { data: puntos } = await supabase
    .from('puntos_publicos').select('id,especie,vista,x,y').eq('especie', caso.especie);

  // 4. Los videos que este caso asigna a cada punto.
  const { data: videos } = await supabase
    .from('caso_videos').select('punto_id,video_url').eq('caso_id', casoActivoId);

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
    casoActivoId,
    especie: caso.especie === 'gato' ? 'gato' : 'perro',
    casoNombre: caso.nombre,
    puntos: lista,
  };
}
