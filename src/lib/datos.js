// ============================================================
// Carga de datos de la VISTA PÚBLICA (el estudiante), siempre dentro de
// una cuenta (ver resolverCuenta): cada cliente solo ve sus propios casos.
//
// Las mismas funciones sirven en el servidor (primer pintado) y en el
// navegador (sondeo). Reciben un cliente de Supabase ya creado.
//
// Todo pasa por funciones RPC "_v2" (supabase/migracion-2026-11-04-revision.sql)
// que exigen el TOKEN de acceso de la cuenta cuando esta tiene código
// (ver src/lib/acceso.js). Sin token válido devuelven el error 28000 y aquí
// se traduce a SIN_ACCESO: la vista pide entonces el código.
// ============================================================
import { esErrorDeCodigo } from './acceso.js';

export const SIN_ACCESO = 'sin-acceso';

// Si el caso pesa hasta esto en total, se descargan todos sus videos al
// entrar (cada punto arranca al instante). Si pesa más, cada video se pide
// al tocar su punto: en un salón con Wi-Fi compartido, 40 estudiantes
// bajando 50 MB cada uno ya son ~2 GB, y más que eso hace esperar mucho
// (y puede dejar sin memoria a un teléfono viejo).
// Medido en nov-2026: un video de 30 s pesa ~2,5 MB; el caso real de cyf
// (14 puntos) suma 34 MB y el de Leão completo (17 puntos) daría ~42 MB.
// 50 MB cubre ambos con margen (~20 videos).
export const PRECARGA_MAX_MB = 50;
// Videos viejos sin tamaño guardado: se suponen de este peso (30 s ≈ 3 MB).
const MB_SUPUESTOS_SIN_TAMANO = 5;

// slug de la URL (/c/[slug]) -> { id, slug, nombre, activa, requiereCodigo, idioma } | null
export async function resolverCuenta(supabase, slug) {
  const { data, error } = await supabase.rpc('cuenta_por_slug_v2', { p_slug: slug });
  if (error) throw error;
  const c = data?.[0];
  return c ? { id: c.id, slug: c.slug, nombre: c.nombre, activa: c.activa, requiereCodigo: c.requiere_codigo, idioma: c.idioma } : null;
}

// Menú: casos activos de ESTA cuenta, cada uno con qué exámenes trae
// ({ id, nombre, descripcion, especie, examenes: { lab, rx, vitales } }).
//
// Devuelve null (no []) si la consulta FALLA (red caída, Supabase lento…):
// así quien llama distingue "no hay casos activos" de "no se pudo
// preguntar". Un corte de red no debe sacar a nadie de su caso.
// Devuelve SIN_ACCESO si falta el código (o el profesor lo cambió).
export async function listarCasosActivos(supabase, cuentaId, token) {
  try {
    const { data, error } = await supabase.rpc('casos_activos_v2', { p_cuenta_id: cuentaId, p_token: token || null });
    if (esErrorDeCodigo(error)) return SIN_ACCESO;
    if (error) return null;
    return (data || []).map((c) => ({
      id: c.id, nombre: c.nombre, descripcion: c.descripcion, especie: c.especie,
      examenes: { lab: !!c.lab, rx: !!c.rx, vitales: !!c.vitales },
    }));
  } catch {
    return null;
  }
}

// Datos completos de UN caso (al elegirlo en el menú): todos los puntos de
// su especie con el video del caso en cada uno (o null), SIN el nombre del
// punto (sería una pista), y sus exámenes complementarios.
//   { casoId: null }                 -> el caso ya no está activo
//   { casoId: null, error: true }    -> falló la red (ofrecer reintentar)
//   { casoId: null, sinAcceso: true }-> falta el código
export async function cargarDatosDeCaso(supabase, casoId, cuentaId, token) {
  if (!casoId) return { casoId: null };
  const { data, error } = await supabase.rpc('datos_caso_v2', {
    p_cuenta_id: cuentaId, p_caso_id: casoId, p_token: token || null,
  });
  if (esErrorDeCodigo(error)) return { casoId: null, sinAcceso: true };
  if (error) return { casoId: null, error: true };
  if (!data?.caso) return { casoId: null };

  const mapa = {};
  (data.videos || []).forEach((v) => { mapa[v.punto_id] = v; });

  const puntos = (data.puntos || []).map((p) => ({
    id: p.id,
    vista: p.vista || 'ventral',
    x: p.x == null ? null : Number(p.x),
    y: p.y == null ? null : Number(p.y),
    videoUrl: mapa[p.id]?.video_url || null,
  }));

  // Peso total de los videos que de verdad se ven (una vez por archivo).
  const porUrl = {};
  puntos.forEach((p) => {
    if (!p.videoUrl) return;
    const b = Number(mapa[p.id].tamano_bytes);
    porUrl[p.videoUrl] = Number.isFinite(b) && b > 0 ? b : MB_SUPUESTOS_SIN_TAMANO * 1024 * 1024;
  });
  const totalMb = Object.values(porUrl).reduce((s, b) => s + b, 0) / (1024 * 1024);

  const ex = data.examenes || {};
  return {
    casoId: data.caso.id,
    especie: data.caso.especie === 'gato' ? 'gato' : 'perro',
    casoNombre: data.caso.nombre,
    puntos,
    precargar: totalMb <= PRECARGA_MAX_MB,
    examenes: {
      laboratorio: Array.isArray(ex.laboratorio) ? ex.laboratorio : [],
      vitales: ex.vitales && typeof ex.vitales === 'object' && !Array.isArray(ex.vitales) ? ex.vitales : {},
      archivos: Array.isArray(ex.archivos) ? ex.archivos : [],
    },
  };
}
