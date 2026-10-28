'use server';
// ============================================================
// Acciones del panel de administración.
//
// TODAS comprueban primero la sesión de admin (requerirAdmin /
// requerirAccesoCuenta) y usan el cliente "service_role", que salta la
// seguridad RLS. Así el navegador (clave anon) nunca escribe directamente
// en las tablas.
//
// Casi todas devuelven el estado COMPLETO y actualizado (leerTodo), igual
// que la app de escritorio devolvía store.getDatos() tras cada cambio.
//
// Multi-cuenta: cada "cliente" pertenece a una cuenta (perfiles.cuenta_id)
// y solo puede ver/tocar los casos y puntos de ESA cuenta. El "super_admin"
// no pertenece a ninguna cuenta: elige con qué cuenta trabajar desde el
// panel (ver elegirCuentaAdmin) y puede tocar cualquier cuenta. Lo único
// que limita a un cliente de verdad es su cupo de storage (cuesta dinero);
// sobre sus propios casos y puntos tiene control total.
//
// ERRORES: toda acción exportada pasa por conErrores(), que devuelve
// {error: 'mensaje'} en vez de lanzar. En producción Next.js reemplaza el
// mensaje de cualquier excepción sin atrapar en una Server Action por un
// texto genérico en inglés, así que un throw() sería indistinguible de
// cualquier otra falla para quien lo ve en pantalla. Y cada consulta a
// Supabase se revisa con exigir(): antes los errores de escritura se
// ignoraban y, por ejemplo, un borrado de cuenta a medias se informaba
// como éxito.
// ============================================================
import { randomUUID, randomBytes } from 'node:crypto';
import { redirect } from 'next/navigation';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { crearClienteServidorAuth } from '@/lib/supabase/server';

const BUCKET = 'videos';
const PREFIJO_PUBLICO = '/storage/v1/object/public/' + BUCKET + '/';
// Debe coincidir con file_size_limit del bucket (supabase/schema.sql).
const MAX_BYTES_VIDEO = 50 * 1024 * 1024;

// ---------- errores ----------

// Error con un mensaje pensado para mostrarse tal cual en el panel.
class ErrorAdmin extends Error {
  constructor(mensaje, codigo) { super(mensaje); this.codigo = codigo; }
}

async function conErrores(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error('[admin]', err);
    if (err instanceof ErrorAdmin) return { error: err.message, codigo: err.codigo };
    return { error: 'Algo falló al guardar. Revisa tu conexión e inténtalo de nuevo.' };
  }
}

// Revisa la respuesta de una consulta de Supabase: si trae error, lo lanza.
function exigir(resultado, que) {
  if (resultado?.error) {
    console.error('[admin] ' + que + ':', resultado.error);
    throw new ErrorAdmin('No se pudo ' + que + '. Inténtalo de nuevo.');
  }
  return resultado;
}

// ---------- sesión y permisos ----------

async function requerirAdmin() {
  const { data: { user } } = await crearClienteServidorAuth().auth.getUser();
  if (!user) throw new ErrorAdmin('Tu sesión se cerró. Vuelve a iniciar sesión.', 'sin-sesion');
  const supabase = crearClienteAdmin();
  const { data: perfil, error } = await supabase
    .from('perfiles').select('rol,cuenta_id').eq('id', user.id).maybeSingle();
  if (error) throw new ErrorAdmin('No se pudo comprobar tu acceso. Revisa tu conexión.', 'error-red');
  if (!perfil) throw new ErrorAdmin('Tu cuenta todavía no está activa. Contacta a tu asesor.', 'sin-perfil');

  if (perfil.rol === 'cliente') {
    if (!perfil.cuenta_id) throw new ErrorAdmin('Tu acceso no está ligado a ninguna cuenta. Contacta a tu asesor.', 'sin-perfil');
    const { data: cuenta, error: errCuenta } = await supabase
      .from('cuentas').select('activa').eq('id', perfil.cuenta_id).maybeSingle();
    if (errCuenta) throw new ErrorAdmin('No se pudo comprobar tu acceso. Revisa tu conexión.', 'error-red');
    if (!cuenta) throw new ErrorAdmin('Tu cuenta ya no existe. Contacta a tu asesor.', 'sin-perfil');
    if (!cuenta.activa) throw new ErrorAdmin('Tu cuenta está desactivada. Contacta a tu asesor.', 'cuenta-inactiva');
  }
  return { rol: perfil.rol, cuentaId: perfil.cuenta_id, userId: user.id };
}

async function requerirSuperAdmin() {
  const r = await requerirAdmin();
  if (r.rol !== 'super_admin') throw new ErrorAdmin('No autorizado.');
  return r;
}

// Cualquier admin, pero solo sobre SU cuenta (el super_admin, sobre
// cualquiera que exista).
async function requerirAccesoCuenta(cuentaId) {
  const r = await requerirAdmin();
  if (typeof cuentaId !== 'string' || !cuentaId) throw new ErrorAdmin('Elige una cuenta primero.');
  if (r.rol === 'cliente' && cuentaId !== r.cuentaId) throw new ErrorAdmin('No autorizado.');
  return r;
}

// ---------- validación ----------

function especieOk(e) { return e === 'gato' ? 'gato' : 'perro'; }
function vistaOk(v) { return v === 'izq' || v === 'der' ? v : 'ventral'; }
function texto(v, max) { return String(v ?? '').trim().slice(0, max); }

// "Clínica Norte" -> "clinica-norte". Solo minúsculas, números y guiones:
// es lo que va en el enlace de los estudiantes (/c/<slug>).
function normalizarSlug(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-').replace(/^-|-$/g, '');
}
function slugValido(s) { return /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(s); }

function cupo(v, nombre) {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 1000000) {
    throw new ErrorAdmin('El ' + nombre + ' debe ser un número entero de 0 en adelante.');
  }
  return n;
}

function correoValido(c) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c); }

// 12 caracteres sin letras confundibles (0/O, 1/l/I) para dictarla sin errores.
function claveTemporal() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(randomBytes(12), (b) => abc[b % abc.length]).join('');
}

// ---------- helpers de datos (no exportados) ----------

// Pide TODAS las filas de una consulta en tandas de 1000 (el máximo que
// devuelve la API de Supabase por petición; sin esto, una cuenta con más
// de 1000 videos sumaría mal su uso de storage).
async function todasLasFilas(consulta, que) {
  const filas = [];
  for (let desde = 0; ; desde += 1000) {
    const { data } = exigir(await consulta().range(desde, desde + 999), que);
    filas.push(...(data || []));
    if (!data || data.length < 1000) return filas;
  }
}

// Borra de Storage los archivos de una lista de URLs públicas.
async function borrarVideosStorage(supabase, urls) {
  const paths = (urls || [])
    .map((u) => (u || '').split(PREFIJO_PUBLICO)[1])
    .filter(Boolean);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(BUCKET).remove(paths.slice(i, i + 100));
    // No se corta la acción por esto: lo peor que deja es un archivo
    // huérfano, que "Limpiar videos huérfanos" recoge después.
    if (error) console.error('[admin] no se pudieron borrar videos de Storage:', error);
  }
}

// Cuántos casos tiene YA una cuenta (para comparar contra su cupo).
async function contarCasosDeCuenta(supabase, cuentaId) {
  const { count } = exigir(await supabase
    .from('casos').select('id', { count: 'exact', head: true }).eq('cuenta_id', cuentaId), 'contar los casos');
  return count || 0;
}

// Cuántos bytes de video tiene YA una cuenta (para comparar contra su cupo
// de storage). caso_videos no tiene cuenta_id propio, así que filtramos por
// la cuenta de SU caso vía el embed "casos!inner(cuenta_id)".
async function usoStorageBytes(supabase, cuentaId) {
  const filas = await todasLasFilas(() => supabase
    .from('caso_videos')
    .select('tamano_bytes, casos!inner(cuenta_id)')
    .eq('casos.cuenta_id', cuentaId), 'calcular el uso de almacenamiento');
  return filas.reduce((s, r) => s + (r.tamano_bytes || 0), 0);
}

const aMb = (bytes) => Math.round(bytes / (1024 * 1024));

// Lista de cuentas para el selector del super_admin — con cuánto ha
// usado cada una (casos y storage), para ver de un vistazo quién se
// acerca a su cupo sin tener que entrar cuenta por cuenta. 2 consultas
// extra por cuenta: a la escala de un negocio con un puñado de clientes
// no es problema; si algún día hay cientos de cuentas, convendría una
// sola consulta agregada en vez de este Promise.all.
async function listarCuentasInterno(supabase) {
  const { data } = exigir(await supabase
    .from('cuentas').select('id,slug,nombre,activa,cupo_casos_propios,cupo_storage_mb').order('nombre'),
  'leer las cuentas');
  return Promise.all((data || []).map(async (c) => ({
    ...c,
    casosUsados: await contarCasosDeCuenta(supabase, c.id),
    usoStorageMb: aMb(await usoStorageBytes(supabase, c.id)),
  })));
}

// Solicitudes de la landing (formulario de contacto), las más nuevas primero.
// Sin chequeo de permiso (como leerTodo): lo llaman las acciones exportadas
// tras requerirSuperAdmin(), o leerDatosAdmin tras comprobar el rol.
async function listarSolicitudesInterno(supabase) {
  const { data } = exigir(await supabase
    .from('solicitudes_contacto').select('*').order('creada_en', { ascending: false }).limit(500),
  'leer las solicitudes');
  return data || [];
}

// Lee TODO el estado que necesita el panel para UNA cuenta.
//
// caso_videos no tiene su propia columna cuenta_id (igual que en
// usoStorageBytes, arriba), así que para filtrarla por cuenta usamos el
// mismo embed "casos!inner(cuenta_id)" + .eq('casos.cuenta_id', cuentaId):
// sin esto, videosPorCaso traería el video_url de TODAS las cuentas en
// cada respuesta (el bucket "videos" es público, así que un video_url
// ajeno equivale a poder ver el video clínico de otro cliente).
async function leerTodo(supabase, cuentaId) {
  const [puntos, casos, cv] = await Promise.all([
    todasLasFilas(() => supabase.from('puntos').select('id,especie,vista,nombre,x,y')
      .eq('cuenta_id', cuentaId).order('id'), 'leer los puntos'),
    todasLasFilas(() => supabase.from('casos').select('id,nombre,descripcion,especie,activo')
      .eq('cuenta_id', cuentaId).order('nombre'), 'leer los casos'),
    todasLasFilas(() => supabase.from('caso_videos').select('caso_id,punto_id,video_url,casos!inner(cuenta_id)')
      .eq('casos.cuenta_id', cuentaId), 'leer los videos'),
  ]);

  const videosPorCaso = {};
  cv.forEach((r) => {
    if (!videosPorCaso[r.caso_id]) videosPorCaso[r.caso_id] = {};
    videosPorCaso[r.caso_id][r.punto_id] = r.video_url;
  });

  return {
    puntos,
    casos: casos.map((c) => ({ ...c, numVideos: Object.keys(videosPorCaso[c.id] || {}).length })),
    videosPorCaso,
  };
}

// Estado completo de UNA cuenta para el panel, con su cupo y uso.
async function leerCuenta(supabase, cuentaId) {
  const { data: cuenta } = exigir(await supabase.from('cuentas')
    .select('id,slug,nombre,activa,cupo_casos_propios,cupo_storage_mb').eq('id', cuentaId).maybeSingle(),
  'leer la cuenta');
  if (!cuenta) throw new ErrorAdmin('Esa cuenta ya no existe.');
  const datos = await leerTodo(supabase, cuentaId);
  return {
    cuentaId,
    cuentaNombre: cuenta.nombre,
    cuentaSlug: cuenta.slug,
    cupoCasosPropios: cuenta.cupo_casos_propios,
    cupoStorageMb: cuenta.cupo_storage_mb,
    usoStorageMb: aMb(await usoStorageBytes(supabase, cuentaId)),
    ...datos,
  };
}

// Mismo resultado que leerTodo + el uso de storage ya actualizado.
async function leerTodoConUso(supabase, cuentaId) {
  const datos = await leerTodo(supabase, cuentaId);
  return { ...datos, usoStorageMb: aMb(await usoStorageBytes(supabase, cuentaId)) };
}

// El caso debe ser DE ESTA cuenta, verificado a nivel de consulta (no solo
// por el chequeo de permiso): así un casoId ajeno nunca toca nada.
async function casoDeCuenta(supabase, cuentaId, casoId) {
  const { data } = exigir(await supabase.from('casos').select('id,especie')
    .eq('id', casoId).eq('cuenta_id', cuentaId).maybeSingle(), 'leer el caso');
  if (!data) throw new ErrorAdmin('Ese caso ya no existe.');
  return data;
}

// ---------- lectura inicial ----------

// La llama la página /admin (Server Component), que atrapa el error y
// muestra un mensaje según su "codigo" (sin sesión, sin perfil, cuenta
// desactivada, error de red). Por eso esta SÍ lanza, en vez de devolver
// {error}.
export async function leerDatosAdmin() {
  const { rol, cuentaId } = await requerirAdmin();
  const supabase = crearClienteAdmin();
  if (rol === 'super_admin') {
    return {
      rol, cuentaId: null,
      cuentas: await listarCuentasInterno(supabase),
      cupoCasosPropios: null, cupoStorageMb: null, usoStorageMb: null,
      puntos: [], casos: [], videosPorCaso: {},
      solicitudes: await listarSolicitudesInterno(supabase),
    };
  }
  return { rol, cuentas: null, ...(await leerCuenta(supabase, cuentaId)) };
}

// El super_admin cambia de cuenta sin recargar la página.
export async function elegirCuentaAdmin(cuentaId) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    return leerCuenta(crearClienteAdmin(), cuentaId);
  });
}

// ---------- cuentas (solo super_admin) ----------

// Alta de una cuenta de cliente nueva: crea el usuario de Auth con una
// contraseña temporal, la fila en "cuentas" y su perfil 'cliente' ligado a
// esa cuenta.
//
// No se usa inviteUserByEmail (manda un enlace mágico): ese flujo no es
// compatible con el cliente de navegador (configurado para PKCE). Por eso
// se crea el usuario con una contraseña temporal, que el super_admin copia
// y le pasa al cliente por fuera — sin depender de correo saliente.
//
// El orden importa: la cuenta se crea PRIMERO (es lo que más falla: slug
// repetido) y el usuario después; si el usuario o el perfil fallan, se
// deshace lo hecho, para no dejar nada a medias.
export async function crearCuenta({ slug, nombre, cupoCasosPropios, cupoStorageMb, correo }) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();

    const slugLimpio = normalizarSlug(slug);
    const nombreLimpio = texto(nombre, 120);
    const correoLimpio = texto(correo, 200).toLowerCase();
    if (!nombreLimpio) throw new ErrorAdmin('Escribe el nombre de la clínica.');
    if (!slugValido(slugLimpio)) {
      throw new ErrorAdmin('El enlace (slug) debe tener entre 3 y 40 letras, números o guiones, p. ej. "clinica-norte".');
    }
    if (!correoValido(correoLimpio)) throw new ErrorAdmin('Escribe un correo válido para el cliente.');
    const cupoCasos = cupo(cupoCasosPropios, 'cupo de casos');
    const cupoStorage = cupo(cupoStorageMb, 'cupo de almacenamiento');

    const { data: nuevaCuenta, error } = await supabase
      .from('cuentas')
      .insert({ slug: slugLimpio, nombre: nombreLimpio, cupo_casos_propios: cupoCasos, cupo_storage_mb: cupoStorage })
      .select('id').single();
    if (error) {
      if (error.code === '23505') throw new ErrorAdmin('Ya existe una cuenta con el enlace "' + slugLimpio + '".');
      exigir({ error }, 'crear la cuenta');
    }

    const clave = claveTemporal();
    const usuario = await supabase.auth.admin.createUser({ email: correoLimpio, password: clave, email_confirm: true });
    if (usuario.error) {
      await supabase.from('cuentas').delete().eq('id', nuevaCuenta.id);
      const yaExiste = /already|registered|exists/i.test(usuario.error.message || '');
      throw new ErrorAdmin(yaExiste
        ? 'Ya hay un usuario con el correo ' + correoLimpio + '. No se creó la cuenta.'
        : 'No se pudo crear el usuario. No se creó la cuenta.');
    }

    const { error: errorPerfil } = await supabase
      .from('perfiles').insert({ id: usuario.data.user.id, rol: 'cliente', cuenta_id: nuevaCuenta.id });
    if (errorPerfil) {
      await supabase.auth.admin.deleteUser(usuario.data.user.id);
      await supabase.from('cuentas').delete().eq('id', nuevaCuenta.id);
      exigir({ error: errorPerfil }, 'crear el acceso del cliente');
    }

    return { cuentas: await listarCuentasInterno(supabase), claveTemporal: clave, correo: correoLimpio, slug: slugLimpio };
  });
}

// Editar nombre, cupos y si está activa (una cuenta desactivada no deja
// entrar a su cliente al panel y su enlace de estudiantes deja de
// funcionar, pero no se borra nada).
export async function actualizarCuenta(cuentaId, { nombre, cupoCasosPropios, cupoStorageMb, activa }) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    const nombreLimpio = texto(nombre, 120);
    if (!nombreLimpio) throw new ErrorAdmin('El nombre no puede quedar vacío.');
    exigir(await supabase.from('cuentas').update({
      nombre: nombreLimpio,
      cupo_casos_propios: cupo(cupoCasosPropios, 'cupo de casos'),
      cupo_storage_mb: cupo(cupoStorageMb, 'cupo de almacenamiento'),
      activa: !!activa,
    }).eq('id', cuentaId), 'guardar la cuenta');
    return { cuentas: await listarCuentasInterno(supabase), ...(await leerCuenta(supabase, cuentaId)) };
  });
}

// El cliente olvidó su contraseña: se le genera otra temporal (se muestra
// una sola vez al super_admin, que se la pasa por fuera).
export async function restablecerClaveCuenta(cuentaId) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    const { data: perfiles } = exigir(await supabase.from('perfiles').select('id').eq('cuenta_id', cuentaId),
      'leer los accesos de la cuenta');
    if (!perfiles?.length) throw new ErrorAdmin('Esta cuenta no tiene ningún acceso de administrador.');
    const clave = claveTemporal();
    const correos = [];
    for (const p of perfiles) {
      const r = await supabase.auth.admin.updateUserById(p.id, { password: clave });
      exigir(r, 'cambiar la contraseña');
      correos.push(r.data.user.email);
    }
    return { claveTemporal: clave, correos };
  });
}

// Borra una cuenta COMPLETA y sin reversa: sus videos (Storage), sus
// casos, sus puntos, y el/los acceso(s) de administrador de esa cuenta
// (usuario de Auth — su fila de "perfiles" se va sola por el "on delete
// cascade" de perfiles.id -> auth.users.id). Un cliente solo puede
// borrar la SUYA; el super_admin puede borrar cualquiera.
//
// Si quien borra es el cliente dueño de la cuenta, se está borrando a sí
// mismo: cerramos su sesión y lo mandamos a /admin/login. redirect()
// funciona lanzando una excepción especial, por eso va FUERA de
// conErrores (que la atraparía como un error cualquiera).
export async function eliminarCuenta(cuentaId) {
  const r = await conErrores(async () => {
    const { rol } = await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();

    const { data: cuenta } = exigir(await supabase.from('cuentas').select('id').eq('id', cuentaId).maybeSingle(),
      'leer la cuenta');
    if (!cuenta) throw new ErrorAdmin('Esa cuenta ya no existe.');

    // 1. Videos de Storage de TODOS los casos de esta cuenta.
    const vids = await todasLasFilas(() => supabase
      .from('caso_videos').select('video_url, casos!inner(cuenta_id)').eq('casos.cuenta_id', cuentaId),
    'leer los videos de la cuenta');
    await borrarVideosStorage(supabase, vids.map((v) => v.video_url));

    // 2. Casos (cascade borra sus caso_videos) y puntos.
    exigir(await supabase.from('casos').delete().eq('cuenta_id', cuentaId), 'borrar los casos');
    exigir(await supabase.from('puntos').delete().eq('cuenta_id', cuentaId), 'borrar los puntos');

    // 3. Usuario(s) de Auth de esta cuenta (y su perfil, por cascade).
    const { data: perfilesCuenta } = exigir(await supabase.from('perfiles').select('id').eq('cuenta_id', cuentaId),
      'leer los accesos de la cuenta');
    for (const p of perfilesCuenta || []) {
      exigir(await supabase.auth.admin.deleteUser(p.id), 'borrar el acceso del administrador');
    }

    // 4. La cuenta misma.
    exigir(await supabase.from('cuentas').delete().eq('id', cuentaId), 'borrar la cuenta');

    if (rol === 'cliente') return { cerrarSesion: true };
    return {
      cuentaId: null, cuentas: await listarCuentasInterno(supabase),
      cupoCasosPropios: null, cupoStorageMb: null, usoStorageMb: null,
      puntos: [], casos: [], videosPorCaso: {},
    };
  });

  if (r?.cerrarSesion) {
    await crearClienteServidorAuth().auth.signOut();
    redirect('/admin/login?cuenta_eliminada=1');
  }
  return r;
}

// Borra de Storage los videos que ya no usa ningún caso: subidas que no
// se terminaron de guardar (pestaña cerrada a media subida), restos de
// borrados que fallaron a medias… Ocupan espacio (y cuestan) sin contar
// para el cupo de nadie. Solo toca archivos con más de 24 h, para no
// pisar una subida que esté ocurriendo justo ahora.
export async function limpiarVideosHuerfanos() {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();

    const usados = new Set((await todasLasFilas(() => supabase.from('caso_videos').select('video_url'),
      'leer los videos en uso'))
      .map((r) => (r.video_url || '').split(PREFIJO_PUBLICO)[1]).filter(Boolean));

    // Lista una carpeta entera de Storage (de 1000 en 1000).
    async function listar(prefijo) {
      const items = [];
      for (let offset = 0; ; offset += 1000) {
        const { data } = exigir(await supabase.storage.from(BUCKET)
          .list(prefijo, { limit: 1000, offset }), 'listar los videos');
        items.push(...(data || []));
        if (!data || data.length < 1000) return items;
      }
    }

    const limite = Date.now() - 24 * 60 * 60 * 1000;
    const huerfanos = [];
    let bytes = 0;
    const revisar = (ruta, item) => {
      const fecha = Date.parse(item.created_at || item.updated_at || '');
      if (!usados.has(ruta) && Number.isFinite(fecha) && fecha < limite) {
        huerfanos.push(ruta);
        bytes += Number(item.metadata?.size) || 0;
      }
    };
    for (const item of await listar('')) {
      if (item.id) revisar(item.name, item); // archivo suelto en la raíz (videos viejos)
      else for (const sub of await listar(item.name)) if (sub.id) revisar(item.name + '/' + sub.name, sub);
    }

    for (let i = 0; i < huerfanos.length; i += 100) {
      exigir(await supabase.storage.from(BUCKET).remove(huerfanos.slice(i, i + 100)), 'borrar los videos huérfanos');
    }
    return { borrados: huerfanos.length, liberadosMb: aMb(bytes) };
  });
}

// ---------- solicitudes de contacto (solo super_admin) ----------

export async function listarSolicitudes() {
  return conErrores(async () => {
    await requerirSuperAdmin();
    return { solicitudes: await listarSolicitudesInterno(crearClienteAdmin()) };
  });
}

export async function actualizarEstadoSolicitud(id, estado) {
  return conErrores(async () => {
    await requerirSuperAdmin();
    const supabase = crearClienteAdmin();
    if (!['nueva', 'contactada', 'convertida', 'descartada'].includes(estado)) throw new ErrorAdmin('Estado inválido.');
    exigir(await supabase.from('solicitudes_contacto').update({ estado }).eq('id', id), 'cambiar el estado');
    return { solicitudes: await listarSolicitudesInterno(supabase) };
  });
}

// ---------- casos ----------

// Enciende o apaga el interruptor de UN caso, sin tocar los demás: puede
// haber varios casos activos (en el menú del estudiante) a la vez.
export async function alternarCasoActivo(cuentaId, casoId, activo) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    exigir(await supabase.from('casos').update({ activo: !!activo }).eq('id', casoId).eq('cuenta_id', cuentaId),
      'cambiar el caso');
    return leerTodo(supabase, cuentaId);
  });
}

export async function crearCaso(cuentaId, nombre, especie) {
  return conErrores(async () => {
    const { rol } = await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();

    // El cupo es TOTAL: cuenta todos los casos que tenga la cuenta, sin
    // importar quién los creó. Lo que distingue el rol es solo que este
    // chequeo BLOQUEA al cliente; el super_admin puede seguir precargando
    // casos (que sí cuentan para el total que ve el cliente después).
    if (rol === 'cliente') {
      const { data: cuenta } = exigir(await supabase.from('cuentas').select('cupo_casos_propios')
        .eq('id', cuentaId).single(), 'leer el cupo');
      if (await contarCasosDeCuenta(supabase, cuentaId) >= cuenta.cupo_casos_propios) {
        throw new ErrorAdmin('Llegaste al límite de casos de tu plan. Contacta a tu asesor para ampliarlo.');
      }
    }

    // Si no había ningún caso activo EN ESTA CUENTA, este nace activo.
    const { count: activos } = exigir(await supabase.from('casos').select('id', { count: 'exact', head: true })
      .eq('cuenta_id', cuentaId).eq('activo', true), 'leer los casos');
    exigir(await supabase.from('casos').insert({
      nombre: texto(nombre, 120) || 'Caso nuevo', especie: especieOk(especie), cuenta_id: cuentaId, activo: !activos,
    }), 'crear el caso');
    return leerTodo(supabase, cuentaId);
  });
}

export async function renombrarCaso(cuentaId, casoId, nombre) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    exigir(await supabase.from('casos').update({ nombre: texto(nombre, 120) || 'Caso' })
      .eq('id', casoId).eq('cuenta_id', cuentaId), 'renombrar el caso');
    return leerTodo(supabase, cuentaId);
  });
}

export async function describirCaso(cuentaId, casoId, descripcion) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    exigir(await supabase.from('casos').update({ descripcion: texto(descripcion, 500) })
      .eq('id', casoId).eq('cuenta_id', cuentaId), 'guardar la descripción');
    return leerTodo(supabase, cuentaId);
  });
}

// Cambiar la especie deja inservibles los videos asignados a puntos de la
// especie anterior (el estudiante ya no vería esos puntos): se borran, para
// no seguir ocupando cupo de storage a escondidas. El panel lo avisa antes.
export async function cambiarEspecieCaso(cuentaId, casoId, especie) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    const caso = await casoDeCuenta(supabase, cuentaId, casoId);
    const nueva = especieOk(especie);
    if (caso.especie !== nueva) {
      const { data: vids } = exigir(await supabase.from('caso_videos')
        .select('punto_id, video_url, puntos!inner(especie)').eq('caso_id', casoId).neq('puntos.especie', nueva),
      'leer los videos del caso');
      if (vids?.length) {
        await borrarVideosStorage(supabase, vids.map((v) => v.video_url));
        exigir(await supabase.from('caso_videos').delete().eq('caso_id', casoId)
          .in('punto_id', vids.map((v) => v.punto_id)), 'quitar los videos del caso');
      }
      exigir(await supabase.from('casos').update({ especie: nueva }).eq('id', casoId).eq('cuenta_id', cuentaId),
        'cambiar la especie');
    }
    return leerTodoConUso(supabase, cuentaId);
  });
}

export async function eliminarCaso(cuentaId, casoId) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    await casoDeCuenta(supabase, cuentaId, casoId);
    const { data: vids } = exigir(await supabase.from('caso_videos').select('video_url').eq('caso_id', casoId),
      'leer los videos del caso');
    // Primero la fila (cascade borra sus caso_videos) y DESPUÉS los
    // archivos: si el borrado falla, el caso sigue intacto con sus videos.
    exigir(await supabase.from('casos').delete().eq('id', casoId).eq('cuenta_id', cuentaId), 'borrar el caso');
    await borrarVideosStorage(supabase, (vids || []).map((v) => v.video_url));
    return leerTodoConUso(supabase, cuentaId);
  });
}

// ---------- puntos del maniquí (propios de cada cuenta) ----------

export async function addPunto(cuentaId, { especie, vista }) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    const { data: nuevo } = exigir(await supabase
      .from('puntos')
      .insert({ cuenta_id: cuentaId, especie: especieOk(especie), vista: vistaOk(vista), nombre: 'Punto nuevo', x: 50, y: 45 })
      .select('id').single(), 'crear el punto');
    return { ...(await leerTodo(supabase, cuentaId)), nuevoPuntoId: nuevo?.id || null };
  });
}

export async function actualizarPunto(cuentaId, puntoId, campos) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    const limpio = {};
    const coord = (v) => Math.max(0, Math.min(100, Math.round(v * 10) / 10));
    if (typeof campos?.nombre === 'string') limpio.nombre = texto(campos.nombre, 80) || 'Punto';
    if (Number.isFinite(campos?.x)) limpio.x = coord(campos.x);
    if (Number.isFinite(campos?.y)) limpio.y = coord(campos.y);
    if (campos?.vista) limpio.vista = vistaOk(campos.vista);
    if (Object.keys(limpio).length) {
      exigir(await supabase.from('puntos').update(limpio).eq('id', puntoId).eq('cuenta_id', cuentaId),
        'guardar el punto');
    }
    return leerTodo(supabase, cuentaId);
  });
}

export async function eliminarPunto(cuentaId, puntoId) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    // Verifica que el punto sea de ESTA cuenta ANTES de tocar storage.
    const { data: punto } = exigir(await supabase
      .from('puntos').select('id').eq('id', puntoId).eq('cuenta_id', cuentaId).maybeSingle(), 'leer el punto');
    if (!punto) throw new ErrorAdmin('Ese punto ya no existe.');
    const { data: vids } = exigir(await supabase.from('caso_videos').select('video_url').eq('punto_id', puntoId),
      'leer los videos del punto');
    exigir(await supabase.from('puntos').delete().eq('id', puntoId).eq('cuenta_id', cuentaId), 'borrar el punto'); // cascade borra sus caso_videos
    await borrarVideosStorage(supabase, (vids || []).map((v) => v.video_url));
    return leerTodoConUso(supabase, cuentaId);
  });
}

// ---------- videos por caso ----------

// Paso 1: el servidor genera una URL firmada para que el navegador suba
// el archivo directamente a Storage (sin pasar el video por nuestra
// función, que tiene límite de tamaño).
export async function crearUrlSubidaVideo(cuentaId, tamanoBytes) {
  return conErrores(async () => {
    const { rol } = await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    const tamano = Number(tamanoBytes);
    if (!Number.isFinite(tamano) || tamano <= 0) throw new ErrorAdmin('El archivo de video está vacío.');
    if (tamano > MAX_BYTES_VIDEO) {
      throw new ErrorAdmin('El video pesa ' + aMb(tamano) + ' MB; el máximo es ' + aMb(MAX_BYTES_VIDEO) + ' MB por video.');
    }

    // El cupo de storage solo limita al CLIENTE. Se revisa ANTES de firmar
    // la URL (con el tamaño que el navegador ya conoce); guardarVideoCaso
    // lo vuelve a revisar con el tamaño REAL ya subido.
    if (rol === 'cliente') {
      const { data: cuenta } = exigir(await supabase.from('cuentas').select('cupo_storage_mb')
        .eq('id', cuentaId).single(), 'leer el cupo');
      if (await usoStorageBytes(supabase, cuentaId) + tamano > cuenta.cupo_storage_mb * 1024 * 1024) {
        throw new ErrorAdmin('Llegaste al límite de almacenamiento de tu plan. Contacta a tu asesor para ampliarlo.');
      }
    }

    // El path empieza con la cuenta dueña: guardarVideoCaso lo exige.
    const path = cuentaId + '/' + randomUUID() + '.mp4';
    const { data } = exigir(await supabase.storage.from(BUCKET).createSignedUploadUrl(path), 'preparar la subida');
    return { path: data.path, token: data.token };
  });
}

// Paso 2: tras subir, guardamos la URL pública en caso_videos.
export async function guardarVideoCaso(cuentaId, casoId, puntoId, path) {
  return conErrores(async () => {
    const { rol } = await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    const caso = await casoDeCuenta(supabase, cuentaId, casoId);

    // El path debe ser de esta cuenta y con la forma EXACTA que genera
    // crearUrlSubidaVideo: "cuentaId/" + un uuid + ".mp4". No basta con
    // startsWith: "cuentaId/../../auth/v1/admin/users" también "empieza
    // con cuentaId/", y más abajo se lo pasamos a supabase.storage.info()
    // —una petición del SERVIDOR con la clave service_role—. También
    // impide "reasignar" (y luego borrar) el video de OTRA cuenta.
    if (typeof path !== 'string' || !path.startsWith(cuentaId + '/') ||
        !/^[0-9a-f-]{36}\.mp4$/.test(path.slice(cuentaId.length + 1))) {
      throw new ErrorAdmin('No autorizado.');
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = data.publicUrl;
    const quitarSubida = () => supabase.storage.from(BUCKET).remove([path]);

    // El punto también debe ser de esta cuenta y de la especie del caso:
    // si no, el video quedaría colgado de un punto que el estudiante de
    // este caso nunca ve (o de un punto de otra clínica).
    const { data: punto } = exigir(await supabase.from('puntos').select('especie')
      .eq('id', puntoId).eq('cuenta_id', cuentaId).maybeSingle(), 'leer el punto');
    if (!punto || punto.especie !== caso.especie) {
      await quitarSubida();
      throw new ErrorAdmin('Ese punto ya no existe en el maniquí de este caso.');
    }

    // Tamaño REAL del archivo ya subido a Storage — nunca uno que mande el
    // navegador, que se podría falsear para saltarse el cupo. Si Storage no
    // puede confirmarlo, se rechaza (fallar CERRADO).
    const { data: info, error: errorInfo } = await supabase.storage.from(BUCKET).info(path);
    if (errorInfo || typeof info?.size !== 'number' || !Number.isFinite(info.size) || info.size < 0) {
      await quitarSubida();
      throw new ErrorAdmin('No se pudo verificar el video subido. Intenta de nuevo.');
    }
    const tamanoReal = info.size;

    if (rol === 'cliente') {
      const { data: cuenta } = exigir(await supabase.from('cuentas').select('cupo_storage_mb')
        .eq('id', cuentaId).single(), 'leer el cupo');
      if (await usoStorageBytes(supabase, cuentaId) + tamanoReal > cuenta.cupo_storage_mb * 1024 * 1024) {
        await quitarSubida();
        throw new ErrorAdmin('Llegaste al límite de almacenamiento de tu plan. Contacta a tu asesor para ampliarlo.');
      }
    }

    const { data: prev } = exigir(await supabase
      .from('caso_videos').select('video_url')
      .eq('caso_id', casoId).eq('punto_id', puntoId).maybeSingle(), 'leer el video anterior');

    const { error: errGuardar } = await supabase.from('caso_videos')
      .upsert({ caso_id: casoId, punto_id: puntoId, video_url: url, tamano_bytes: tamanoReal });
    if (errGuardar) {
      await quitarSubida();
      exigir({ error: errGuardar }, 'guardar el video');
    }
    // Solo cuando el nuevo ya quedó guardado se borra el archivo anterior.
    if (prev?.video_url && prev.video_url !== url) await borrarVideosStorage(supabase, [prev.video_url]);

    return leerTodoConUso(supabase, cuentaId);
  });
}

export async function quitarVideoCaso(cuentaId, casoId, puntoId) {
  return conErrores(async () => {
    await requerirAccesoCuenta(cuentaId);
    const supabase = crearClienteAdmin();
    await casoDeCuenta(supabase, cuentaId, casoId);
    const { data: row } = exigir(await supabase
      .from('caso_videos').select('video_url')
      .eq('caso_id', casoId).eq('punto_id', puntoId).maybeSingle(), 'leer el video');
    exigir(await supabase.from('caso_videos').delete().eq('caso_id', casoId).eq('punto_id', puntoId),
      'quitar el video');
    if (row?.video_url) await borrarVideosStorage(supabase, [row.video_url]);
    return leerTodoConUso(supabase, cuentaId);
  });
}
