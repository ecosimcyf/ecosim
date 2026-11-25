'use server';
// ============================================================
// Acciones de la TIENDA DE CASOS (ver src/lib/tienda.js para el modelo).
//
// Mismas reglas que admin.js: cada acción pasa por conErrores() (devuelve
// {error: 'err.clave', vars} en vez de lanzar), comprueba sesión y permisos
// primero y usa el cliente service_role. El cliente NUNCA envía precio,
// moneda ni estado: solo cuentaId + catalogoId; el servidor decide el resto.
//
//   super_admin: listarCatalogoAdmin, publicarCaso, actualizarCatalogo,
//     alternarPublicado, despublicarCaso, quitarDelCatalogo,
//     listarAdquisiciones, marcarPagada, entregarAdquisicion,
//     cancelarAdquisicion
//   clínica (o super_admin sobre una cuenta): listarTienda, solicitarCaso
//
// Si la migración 2026-11-25 aún no se ejecutó, las lecturas devuelven
// {tiendaDisponible: false} (el panel oculta la tienda) y las escrituras
// {error: 'err.tiendaMigracion'}.
// ============================================================
import { revalidatePath } from 'next/cache';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { faltaMigracion } from '@/lib/limpieza';
import { consumirIntento, ipVisitante } from '@/lib/ratelimit';
import {
  conErrores, exigir, requerirSuperAdmin, requerirAccesoCuenta, ErrorAdmin,
} from '@/lib/admin-comun';
import { CUENTA_CATALOGO_ID, limpiarDatosCatalogo } from '@/lib/tienda';
import {
  contadoresDeCasos, crearSolicitud, cambiarEstado, entregarAdquisicion as entregar, leerTiendaDeCuenta,
} from '@/lib/entrega';

// Cuántas solicitudes puede mandar una cuenta por hora (frena el abuso).
const LIMITE_SOLICITUDES = { max: 10, ventanaSeg: 60 * 60 };

// ---------- lecturas internas ----------

// Cuenta técnica del catálogo (se busca por su id fijo, nunca por slug), o
// null si no existe todavía.
async function cuentaCatalogo(supabase) {
  const { data, error } = await supabase.from('cuentas').select('id,slug').eq('id', CUENTA_CATALOGO_ID).maybeSingle();
  exigir({ error }, 'leer la cuenta del catálogo');
  return data || null;
}

// Convierte una fila de catalogo_casos al formato del panel (camelCase).
function entradaAdmin(c, contadores, numAdquisiciones) {
  const k = contadores || { videos: 0, laboratorio: 0, labArchivos: 0, rx: 0, vitales: false };
  return {
    id: c.id, casoOrigenId: c.caso_origen_id, titulo: c.titulo, descripcionVenta: c.descripcion_venta,
    especie: c.especie, precioCop: c.precio_cop, precioBrl: c.precio_brl, precioUsd: c.precio_usd,
    portadaUrl: c.portada_url, nivel: c.nivel, etiquetas: c.etiquetas || [], publicado: c.publicado,
    orden: c.orden, numAdquisiciones: numAdquisiciones || 0,
    contadores: { videos: k.videos, puntos: k.videos, laboratorio: k.laboratorio, labArchivos: k.labArchivos, rx: k.rx, vitales: k.vitales },
  };
}

// Todo lo que ve el super_admin del catálogo.
async function leerCatalogoAdmin(supabase) {
  const vacio = { tiendaDisponible: false, entradas: [], disponibles: [], cuentaCatalogoId: null };
  let cuenta;
  try { cuenta = await cuentaCatalogo(supabase); } catch (err) {
    if (faltaMigracion(err.causa)) return vacio;
    throw err;
  }
  if (!cuenta) return vacio;
  const { data: filas, error } = await supabase.from('catalogo_casos').select('*').order('orden').order('creado_en');
  if (error) {
    if (faltaMigracion(error)) return vacio;
    exigir({ error }, 'leer el catálogo');
  }
  const { data: adqs } = exigir(await supabase.from('adquisiciones').select('catalogo_id'), 'contar las adquisiciones');
  const porCatalogo = {};
  (adqs || []).forEach((a) => { porCatalogo[a.catalogo_id] = (porCatalogo[a.catalogo_id] || 0) + 1; });

  const { data: casos } = exigir(await supabase.from('casos').select('id,nombre,descripcion,especie')
    .eq('cuenta_id', cuenta.id).order('nombre'), 'leer los casos del catálogo');
  const contadores = await contadoresDeCasos(supabase, (casos || []).map((c) => c.id));
  const enCatalogo = new Set((filas || []).map((f) => f.caso_origen_id));
  return {
    tiendaDisponible: true,
    cuentaCatalogoId: cuenta.id,
    entradas: (filas || []).map((f) => entradaAdmin(f, contadores[f.caso_origen_id], porCatalogo[f.id])),
    disponibles: (casos || []).filter((c) => !enCatalogo.has(c.id)).map((c) => ({
      id: c.id, nombre: c.nombre, descripcion: c.descripcion, especie: c.especie,
      contadores: { videos: contadores[c.id].videos, puntos: contadores[c.id].videos, laboratorio: contadores[c.id].laboratorio,
        labArchivos: contadores[c.id].labArchivos, rx: contadores[c.id].rx, vitales: contadores[c.id].vitales },
    })),
  };
}

// Adquisiciones con el nombre de la cuenta y el título del caso.
async function leerAdquisiciones(supabase) {
  const { data: filas, error } = await supabase.from('adquisiciones').select('*')
    .order('solicitada_en', { ascending: false }).limit(500);
  if (error) {
    if (faltaMigracion(error)) return { tiendaDisponible: false, adquisiciones: [] };
    exigir({ error }, 'leer las adquisiciones');
  }
  const { data: cuentas } = exigir(await supabase.from('cuentas').select('id,nombre,slug'), 'leer las cuentas');
  const { data: cat } = exigir(await supabase.from('catalogo_casos').select('id,titulo'), 'leer el catálogo');
  const nombreCuenta = Object.fromEntries((cuentas || []).map((c) => [c.id, c]));
  const titulo = Object.fromEntries((cat || []).map((c) => [c.id, c.titulo]));
  return {
    tiendaDisponible: true,
    adquisiciones: (filas || []).map((a) => ({
      id: a.id, cuentaId: a.cuenta_id, cuentaNombre: nombreCuenta[a.cuenta_id]?.nombre || '',
      cuentaSlug: nombreCuenta[a.cuenta_id]?.slug || '', catalogoId: a.catalogo_id, titulo: titulo[a.catalogo_id] || '',
      estado: a.estado, moneda: a.moneda, precioReferencia: a.precio_referencia,
      casoEntregadoId: a.caso_entregado_id, nota: a.nota, pasarela: a.pasarela, referenciaPago: a.referencia_pago,
      solicitadaEn: a.solicitada_en, pagadaEn: a.pagada_en, entregadaEn: a.entregada_en, actualizadaEn: a.actualizada_en,
    })),
  };
}

function refrescar() { revalidatePath('/admin'); }

// ---------- super_admin: catálogo ----------

// { tiendaDisponible, cuentaCatalogoId, entradas: [...], disponibles: [...] }
// "disponibles" = casos de la cuenta «catalogo» que aún no se han publicado.
export async function listarCatalogoAdmin() {
  return conErrores(async () => {
    await requerirSuperAdmin();
    return leerCatalogoAdmin(crearClienteAdmin());
  });
}

// datos: { casoId (obligatorio, de la cuenta catalogo), titulo, descripcionVenta,
//   precioCop, precioBrl, precioUsd, portadaUrl, nivel, etiquetas, orden, publicado }
// Devuelve lo mismo que listarCatalogoAdmin (+ nuevoId).
export async function publicarCaso(datos) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    const cuenta = await cuentaCatalogo(supabase);
    if (!cuenta) throw new ErrorAdmin('err.tiendaMigracion');
    const casoId = String(datos?.casoId ?? '');
    const { data: caso } = exigir(await supabase.from('casos').select('id,nombre,especie')
      .eq('id', casoId).eq('cuenta_id', cuenta.id).maybeSingle(), 'leer el caso');
    if (!caso) throw new ErrorAdmin('err.casoNoCatalogo');
    const limpio = limpiarDatosCatalogo({ titulo: caso.nombre, ...datos, publicado: datos?.publicado ?? false });
    const { data: nuevo, error } = await supabase.from('catalogo_casos')
      .insert({ ...limpio, caso_origen_id: caso.id, especie: caso.especie }).select('id').single();
    if (error?.code === '23505') throw new ErrorAdmin('err.casoYaPublicado');
    if (faltaMigracion(error)) throw new ErrorAdmin('err.tiendaMigracion');
    exigir({ error }, 'publicar el caso');
    refrescar();
    return { ...(await leerCatalogoAdmin(supabase)), nuevoId: nuevo.id };
  });
}

// Cambia los campos que vengan en "datos" (los mismos de publicarCaso, sin
// casoId). Los que no vengan se dejan como están.
export async function actualizarCatalogo(id, datos) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    const limpio = limpiarDatosCatalogo(datos, { parcial: true });
    if (Object.keys(limpio).length) {
      const { data, error } = await supabase.from('catalogo_casos')
        .update({ ...limpio, actualizado_en: new Date().toISOString() }).eq('id', id).select('id');
      if (faltaMigracion(error)) throw new ErrorAdmin('err.tiendaMigracion');
      exigir({ error }, 'guardar el catálogo');
      if (!data?.length) throw new ErrorAdmin('err.catalogoNoExiste');
    }
    refrescar();
    return leerCatalogoAdmin(supabase);
  });
}

export async function alternarPublicado(id, publicado) {
  return actualizarCatalogo(id, { publicado: !!publicado });
}

export async function despublicarCaso(id) {
  return actualizarCatalogo(id, { publicado: false });
}

// Quita la ficha del catálogo SOLO si nadie lo ha solicitado nunca (la base
// lo impide también: adquisiciones.catalogo_id es on delete restrict). Con
// compras, solo se puede despublicar. El caso de la cuenta «catalogo» no se
// borra.
export async function quitarDelCatalogo(id) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    const { count, error: errCuenta } = await supabase.from('adquisiciones')
      .select('id', { count: 'exact', head: true }).eq('catalogo_id', id);
    if (faltaMigracion(errCuenta)) throw new ErrorAdmin('err.tiendaMigracion');
    exigir({ error: errCuenta }, 'contar las adquisiciones');
    if (count > 0) throw new ErrorAdmin('err.catalogoConCompras');
    const { error } = await supabase.from('catalogo_casos').delete().eq('id', id);
    if (error?.code === '23503') throw new ErrorAdmin('err.catalogoConCompras');
    exigir({ error }, 'quitar del catálogo');
    refrescar();
    return leerCatalogoAdmin(supabase);
  });
}

// ---------- super_admin: adquisiciones ----------

// { tiendaDisponible, adquisiciones: [...] } (las más nuevas primero).
export async function listarAdquisiciones() {
  return conErrores(async () => {
    await requerirSuperAdmin();
    return leerAdquisiciones(crearClienteAdmin());
  });
}

export async function marcarPagada(id) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    await cambiarEstado(supabase, String(id), 'pagada');
    refrescar();
    return leerAdquisiciones(supabase);
  });
}

// Cancela una solicitud (solicitada, pagada o fallida) con una nota.
export async function cancelarAdquisicion(id, nota) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    await cambiarEstado(supabase, String(id), 'cancelada', { nota });
    refrescar();
    return leerAdquisiciones(supabase);
  });
}

// Entrega el caso a la clínica (pagada, fallida, o entregada cuyo caso la
// clínica borró: reentrega). Una solicitada sin pago marcado NO se entrega.
// El caso queda en su cuenta DESACTIVADO. Devuelve { casoId, adquisiciones, tiendaDisponible }.
// Si falla, se deshace lo creado, la adquisición queda 'fallida' con una nota
// y se puede reintentar.
export async function entregarAdquisicion(id) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    let casoId = null;
    try {
      ({ casoId } = await entregar(supabase, String(id)));
    } catch (err) {
      refrescar(); // el estado pudo cambiar a 'fallida'
      throw err;
    }
    refrescar();
    return { casoId, ...(await leerAdquisiciones(supabase)) };
  });
}

// ---------- clínica ----------

// Lo que ve la clínica: casos publicados (más los despublicados para los que
// ya tiene una adquisición viva o fallida, con disponible:false) y SIN
// precios. La lógica (columnas explícitas, sin valores monetarios) está en
// leerTiendaDeCuenta (src/lib/entrega.js, con pruebas).
// { tiendaDisponible, items: [{ id, titulo, descripcionVenta, especie, nivel,
//   etiquetas, portadaUrl, videos, examenes: {lab, rx, vitales}, disponible,
//   adquisicion: null | {id, estado} }] }
export async function listarTienda(cuentaId) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    return leerTiendaDeCuenta(crearClienteAdmin(), cuentaId);
  });
}

// La clínica pulsa «Solicitar». Devuelve { adquisicion: {id, estado,
// solicitadaEn}, whatsappUrl } (mensaje ya escrito, en el idioma de la
// cuenta, sin precios). Errores: err.catalogoNoExiste, err.adqYaExiste,
// err.intentos, err.tiendaMigracion.
export async function solicitarCaso(cuentaId, catalogoId) {
  return conErrores(async () => {
    const { userId } = await requerirAccesoCuenta(cuentaId);
    if (cuentaId === CUENTA_CATALOGO_ID) throw new ErrorAdmin('err.noAutorizado'); // la cuenta técnica no compra
    if (typeof catalogoId !== 'string' || !catalogoId) throw new ErrorAdmin('err.catalogoNoExiste');
    const clave = 'tienda:' + cuentaId + ':' + (await ipVisitante());
    if (await consumirIntento(clave, LIMITE_SOLICITUDES) !== 'ok') throw new ErrorAdmin('err.intentos');
    const r = await crearSolicitud(crearClienteAdmin(), { cuentaId, catalogoId, userId });
    refrescar();
    return r;
  });
}
