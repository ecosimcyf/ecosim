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
//
// Multi-cuenta: cada "cliente" pertenece a una cuenta (perfiles.cuenta_id)
// y solo puede ver/tocar los casos de ESA cuenta. El "super_admin" no
// pertenece a ninguna cuenta: elige con qué cuenta trabajar desde el panel
// (ver elegirCuentaAdmin) y es el único que puede tocar el catálogo global
// de puntos del maniquí.
// ============================================================
import { randomUUID } from 'node:crypto';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { crearClienteServidorAuth } from '@/lib/supabase/server';

const BUCKET = 'videos';
const PREFIJO_PUBLICO = '/storage/v1/object/public/' + BUCKET + '/';

// ---------- helpers (no exportados) ----------

async function requerirAdmin() {
  const { data: { user } } = await crearClienteServidorAuth().auth.getUser();
  if (!user) throw new Error('No autorizado');
  const { data: perfil } = await crearClienteAdmin()
    .from('perfiles').select('rol,cuenta_id').eq('id', user.id).maybeSingle();
  if (!perfil) throw new Error('No autorizado');
  return { rol: perfil.rol, cuentaId: perfil.cuenta_id };
}

async function requerirSuperAdmin() {
  const r = await requerirAdmin();
  if (r.rol !== 'super_admin') throw new Error('No autorizado');
  return r;
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

// Cuántos casos tiene YA una cuenta (para comparar contra su cupo).
async function contarCasosDeCuenta(supabase, cuentaId) {
  const { count } = await supabase
    .from('casos').select('id', { count: 'exact', head: true }).eq('cuenta_id', cuentaId);
  return count || 0;
}

// Cuántos bytes de video tiene YA una cuenta (para comparar contra su cupo
// de storage). caso_videos no tiene cuenta_id propio, así que filtramos por
// la cuenta de SU caso vía el embed "casos!inner(cuenta_id)".
async function usoStorageBytes(supabase, cuentaId) {
  const { data } = await supabase
    .from('caso_videos')
    .select('tamano_bytes, casos!inner(cuenta_id)')
    .eq('casos.cuenta_id', cuentaId);
  return (data || []).reduce((s, r) => s + (r.tamano_bytes || 0), 0);
}

// Lista de cuentas para el selector del super_admin.
async function listarCuentasInterno(supabase) {
  const { data } = await supabase
    .from('cuentas').select('id,slug,nombre,activa,cupo_casos_propios,cupo_storage_mb').order('nombre');
  return data || [];
}

// Solicitudes de la landing (formulario de contacto), las más nuevas primero.
// Sin chequeo de permiso (como leerTodo): lo llaman las acciones exportadas
// tras requerirSuperAdmin(), o leerDatosAdmin tras comprobar el rol.
async function listarSolicitudesInterno(supabase) {
  const { data } = await supabase
    .from('solicitudes_contacto').select('*').order('creada_en', { ascending: false });
  return data || [];
}

// Lee TODO el estado que necesita el panel para UNA cuenta.
//
// cuentaId es obligatorio para quien llama a leerTodo con intención de
// mostrar los casos de una cuenta concreta (cliente, o super_admin que ya
// eligió una). Si se omite (lo hacen addPunto/actualizarPunto/eliminarPunto,
// que no reciben cuentaId — ver Paso 8), devolvemos "casos: []" y
// "videosPorCaso: {}" en vez de TODOS los casos/videos de TODAS las
// cuentas: así una función que no conoce la cuenta nunca reenvía por error
// datos ajenos al navegador.
//
// caso_videos no tiene su propia columna cuenta_id (igual que en
// usoStorageBytes, arriba), así que para filtrarla por cuenta usamos el
// mismo embed "casos!inner(cuenta_id)" + .eq('casos.cuenta_id', cuentaId):
// sin esto, videosPorCaso traería el video_url de TODAS las cuentas en
// cada respuesta (el bucket "videos" es público, así que un video_url
// ajeno equivale a poder ver el video clínico de otro cliente).
async function leerTodo(supabase, cuentaId) {
  const [puntosR, casosR, cvR] = await Promise.all([
    supabase.from('puntos').select('id,especie,vista,nombre,x,y'),
    cuentaId
      ? supabase.from('casos').select('id,nombre,descripcion,especie,activo').eq('cuenta_id', cuentaId).order('nombre')
      : { data: [] },
    cuentaId
      ? supabase.from('caso_videos').select('caso_id,punto_id,video_url,casos!inner(cuenta_id)').eq('casos.cuenta_id', cuentaId)
      : { data: [] },
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
    puntos: puntosR.data || [],
    casos,
    videosPorCaso,
  };
}

// ---------- lectura inicial ----------

export async function leerDatosAdmin() {
  const { rol, cuentaId } = await requerirAdmin();
  const supabase = crearClienteAdmin();
  if (rol === 'super_admin') {
    const cuentas = await listarCuentasInterno(supabase);
    return {
      rol, cuentaId: null, cuentas,
      cupoCasosPropios: null, cupoStorageMb: null, usoStorageMb: null,
      puntos: [], casos: [], videosPorCaso: {},
      solicitudes: await listarSolicitudesInterno(supabase),
    };
  }
  const { data: cuenta } = await supabase.from('cuentas').select('cupo_casos_propios,cupo_storage_mb').eq('id', cuentaId).single();
  const datos = await leerTodo(supabase, cuentaId);
  const usoBytes = await usoStorageBytes(supabase, cuentaId);
  return {
    rol, cuentaId, cuentas: null,
    cupoCasosPropios: cuenta.cupo_casos_propios,
    cupoStorageMb: cuenta.cupo_storage_mb,
    usoStorageMb: Math.round(usoBytes / (1024 * 1024)),
    ...datos,
  };
}

// El super_admin cambia de cuenta sin recargar la página.
export async function elegirCuentaAdmin(cuentaId) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const { data: cuenta } = await supabase.from('cuentas').select('cupo_casos_propios,cupo_storage_mb').eq('id', cuentaId).single();
  const datos = await leerTodo(supabase, cuentaId);
  const usoBytes = await usoStorageBytes(supabase, cuentaId);
  return {
    cuentaId,
    cupoCasosPropios: cuenta.cupo_casos_propios,
    cupoStorageMb: cuenta.cupo_storage_mb,
    usoStorageMb: Math.round(usoBytes / (1024 * 1024)),
    ...datos,
  };
}

// Alta de una cuenta de cliente nueva: crea el usuario de Auth con una
// contraseña temporal, la fila en "cuentas" y su perfil 'cliente' ligado a
// esa cuenta. Solo el super_admin puede hacerlo.
//
// Antes se usaba inviteUserByEmail (manda un correo con un enlace mágico),
// pero ese flujo no es compatible con el cliente de navegador (configurado
// para PKCE): ningún cliente invitado podía llegar a iniciar sesión (ver
// revisión final de rama). Por eso ahora se crea el usuario con una
// contraseña temporal de un solo uso, que el super_admin copia y le pasa
// al cliente por fuera — sin depender de correo saliente ni de SMTP.
//
// El orden importa: el usuario de Auth se crea PRIMERO. Si algo falla
// después (slug duplicado, error de red…), lo único que puede quedar a
// medias es un usuario de Auth sin cuenta/perfil — nunca una cuenta o un
// perfil apuntando a un usuario que no llegó a existir.
export async function crearCuenta({ slug, nombre, cupoCasosPropios, cupoStorageMb, correo }) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();

  const slugLimpio = (slug || '').trim();
  const nombreLimpio = (nombre || '').trim();
  const correoLimpio = (correo || '').trim();
  if (!slugLimpio || !nombreLimpio || !correoLimpio) {
    return { error: 'Completa slug, nombre y correo para crear la cuenta.' };
  }

  // 1. Contraseña temporal para el primer ingreso del cliente.
  const tempPassword = randomUUID().replace(/-/g, '').slice(0, 12);

  // 2. El usuario de Auth, PRIMERO.
  const usuario = await supabase.auth.admin.createUser({
    email: correoLimpio,
    password: tempPassword,
    email_confirm: true,
  });
  if (usuario.error) {
    return { error: 'No se pudo crear el usuario: ' + usuario.error.message };
  }

  // 3. La cuenta (cliente/clínica), solo si el usuario se creó bien.
  const { data: nuevaCuenta, error } = await supabase
    .from('cuentas')
    .insert({
      slug: slugLimpio,
      nombre: nombreLimpio,
      cupo_casos_propios: Number(cupoCasosPropios) || 0,
      cupo_storage_mb: Number(cupoStorageMb) || 0,
    })
    .select('id').single();
  if (error) {
    const detalle = error.code === '23505' ? 'ya existe una cuenta con ese slug.' : error.message + '.';
    return {
      error: 'El usuario ya se creó con el correo ' + correoLimpio + '; bórralo desde Supabase ' +
        '(Authentication → Users) si no vas a reintentar. No se pudo crear la cuenta: ' + detalle,
    };
  }

  // 4. El perfil 'cliente', solo si la cuenta se creó bien.
  const { error: errorPerfil } = await supabase
    .from('perfiles')
    .insert({ id: usuario.data.user.id, rol: 'cliente', cuenta_id: nuevaCuenta.id });
  if (errorPerfil) {
    return {
      error: 'El usuario ya se creó con el correo ' + correoLimpio + ' y la cuenta "' + nombreLimpio +
        '" también; bórralos desde Supabase (Authentication → Users y la tabla cuentas) si no vas a ' +
        'reintentar. No se pudo crear el perfil: ' + errorPerfil.message,
    };
  }

  return { cuentas: await listarCuentasInterno(supabase), claveTemporal: tempPassword };
}

// ---------- solicitudes de contacto (solo super_admin) ----------

export async function listarSolicitudes() {
  await requerirSuperAdmin();
  return listarSolicitudesInterno(crearClienteAdmin());
}

export async function actualizarEstadoSolicitud(id, estado) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const valores = ['nueva', 'contactada', 'convertida', 'descartada'];
  if (!valores.includes(estado)) throw new Error('Estado inválido');
  await supabase.from('solicitudes_contacto').update({ estado }).eq('id', id);
  return { solicitudes: await listarSolicitudesInterno(supabase) };
}

// ---------- casos activos ----------

// Enciende o apaga el interruptor de UN caso, sin tocar los demás: puede
// haber varios casos activos (en el menú del estudiante) a la vez.
export async function alternarCasoActivo(cuentaId, casoId, activo) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();
  await supabase.from('casos').update({ activo: !!activo }).eq('id', casoId).eq('cuenta_id', cuentaId);
  return leerTodo(supabase, cuentaId);
}

// ---------- casos ----------

export async function crearCaso(cuentaId, nombre, especie) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();

  // El cupo es TOTAL: cuenta todos los casos que tenga la cuenta, sin
  // importar quién los creó (los que añade el cliente + los que el equipo
  // precarga) — contarCasosDeCuenta no filtra por autor. Lo que distingue
  // el rol es solo que este chequeo BLOQUEA al cliente; el super_admin
  // puede seguir precargando casos sin que este if lo detenga (esos casos
  // precargados sí cuentan para el total que ve el cliente después).
  if (rol === 'cliente') {
    const { data: cuenta } = await supabase.from('cuentas').select('cupo_casos_propios').eq('id', cuentaId).single();
    const n = await contarCasosDeCuenta(supabase, cuentaId);
    if (n >= cuenta.cupo_casos_propios) {
      return { error: 'Llegaste al límite de casos de tu plan. Contacta a tu asesor para ampliarlo.' };
    }
  }

  const { data: nuevo } = await supabase
    .from('casos')
    .insert({ nombre: (nombre || '').trim() || 'Caso nuevo', especie: especieOk(especie), cuenta_id: cuentaId })
    .select('id').single();

  // Si no había ningún caso activo EN ESTA CUENTA, activamos este (cada
  // cuenta prende su propio primer caso; no depende de otras cuentas).
  const { data: casos } = await supabase.from('casos').select('activo').eq('cuenta_id', cuentaId);
  if (!(casos || []).some((c) => c.activo) && nuevo?.id) {
    await supabase.from('casos').update({ activo: true }).eq('id', nuevo.id);
  }
  return leerTodo(supabase, cuentaId);
}

export async function renombrarCaso(cuentaId, casoId, nombre) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();
  await supabase.from('casos').update({ nombre: (nombre || '').trim() || 'Caso' }).eq('id', casoId).eq('cuenta_id', cuentaId);
  return leerTodo(supabase, cuentaId);
}

export async function describirCaso(cuentaId, casoId, descripcion) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();
  await supabase.from('casos').update({ descripcion: (descripcion || '').trim() }).eq('id', casoId).eq('cuenta_id', cuentaId);
  return leerTodo(supabase, cuentaId);
}

export async function cambiarEspecieCaso(cuentaId, casoId, especie) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();
  await supabase.from('casos').update({ especie: especieOk(especie) }).eq('id', casoId).eq('cuenta_id', cuentaId);
  return leerTodo(supabase, cuentaId);
}

export async function eliminarCaso(cuentaId, casoId) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();

  // Confirmamos que el caso sea DE ESTA cuenta antes de tocar Storage: así
  // un casoId ajeno (de otra cuenta) no borra videos de nadie — ni siquiera
  // de paso — aunque el chequeo de arriba tuviera un error.
  const { data: propio } = await supabase
    .from('casos').select('id').eq('id', casoId).eq('cuenta_id', cuentaId).maybeSingle();
  if (!propio) return leerTodo(supabase, cuentaId);

  const { data: vids } = await supabase.from('caso_videos').select('video_url').eq('caso_id', casoId);
  await borrarVideosStorage(supabase, (vids || []).map((v) => v.video_url));
  // Al borrar el caso, sus caso_videos se borran solos (cascade).
  await supabase.from('casos').delete().eq('id', casoId).eq('cuenta_id', cuentaId);
  return leerTodo(supabase, cuentaId);
}

// ---------- puntos (catálogo global del maniquí) ----------
// Solo el super_admin los toca: son compartidos por TODAS las cuentas.

export async function addPunto(cuentaId, { especie, vista }) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const { data: nuevo } = await supabase
    .from('puntos')
    .insert({ especie: especieOk(especie), vista: vistaOk(vista), nombre: 'Punto nuevo', x: 50, y: 45 })
    .select('id').single();
  const datos = await leerTodo(supabase, cuentaId);
  return { ...datos, nuevoPuntoId: nuevo?.id || null };
}

export async function actualizarPunto(cuentaId, puntoId, campos) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const limpio = {};
  if (typeof campos.nombre === 'string') limpio.nombre = campos.nombre.trim() || 'Punto';
  if (typeof campos.x === 'number') limpio.x = campos.x;
  if (typeof campos.y === 'number') limpio.y = campos.y;
  if (campos.vista) limpio.vista = vistaOk(campos.vista);
  if (campos.especie) limpio.especie = especieOk(campos.especie);
  if (Object.keys(limpio).length) await supabase.from('puntos').update(limpio).eq('id', puntoId);
  return leerTodo(supabase, cuentaId);
}

export async function eliminarPunto(cuentaId, puntoId) {
  await requerirSuperAdmin();
  const supabase = crearClienteAdmin();
  const { data: vids } = await supabase.from('caso_videos').select('video_url').eq('punto_id', puntoId);
  await borrarVideosStorage(supabase, (vids || []).map((v) => v.video_url));
  await supabase.from('puntos').delete().eq('id', puntoId); // cascade borra sus caso_videos
  return leerTodo(supabase, cuentaId);
}

// ---------- videos por caso ----------

// Paso 1: el servidor genera una URL firmada para que el navegador suba
// el archivo directamente a Storage (sin pasar el video por nuestra
// función, que tiene límite de tamaño).
export async function crearUrlSubidaVideo(cuentaId, tamanoBytes) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();

  // El cupo de storage solo limita al CLIENTE (igual que el cupo de casos:
  // el super_admin precarga sin tope). Se revisa ANTES de firmar la URL de
  // subida —con el tamaño que el navegador ya conoce, sin haber mandado
  // ni un byte— así un video que por sí solo ya excede lo que queda del
  // cupo se bloquea de entrada, nunca a mitad de la subida.
  if (rol === 'cliente') {
    const { data: cuenta } = await supabase.from('cuentas').select('cupo_storage_mb').eq('id', cuentaId).single();
    const usoActual = await usoStorageBytes(supabase, cuentaId);
    if (usoActual + tamanoBytes > cuenta.cupo_storage_mb * 1024 * 1024) {
      return { error: 'Llegaste al límite de almacenamiento de tu plan. Contacta a tu asesor para ampliarlo.' };
    }
  }

  // El path empieza con la cuenta dueña: guardarVideoCaso lo exige antes de
  // aceptar cualquier subida/reemplazo (ver Paso 1 de la revisión final —
  // antes un path sin prefijo dejaba a un cliente apuntar al video de OTRA
  // cuenta y, de paso, borrarlo).
  const path = cuentaId + '/' + randomUUID() + '.mp4';
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw new Error('No se pudo preparar la subida: ' + error.message);
  return { path: data.path, token: data.token };
}

// Paso 2: tras subir, guardamos la URL pública en caso_videos.
export async function guardarVideoCaso(cuentaId, casoId, puntoId, path, tamanoBytes) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();

  // Confirmamos que el caso sea DE ESTA cuenta antes de escribir: así un
  // casoId ajeno (de otra cuenta) no puede registrarse como video de esta
  // cuenta ni sumarse a su cupo de storage, al nivel de la consulta misma
  // (no solo por el chequeo de permiso de arriba).
  const { data: propio } = await supabase
    .from('casos').select('id').eq('id', casoId).eq('cuenta_id', cuentaId).maybeSingle();
  if (!propio) throw new Error('No autorizado');

  // El path TAMBIÉN debe ser de esta cuenta, y con la forma EXACTA que
  // genera crearUrlSubidaVideo: "cuentaId/" + un uuid + ".mp4" (36 + 4
  // caracteres). No basta con mirar el prefijo con startsWith: un path
  // como "cuentaId/../../../../auth/v1/admin/users" TAMBIÉN "empieza con
  // cuentaId/" como string, y más abajo se lo pasamos tal cual a
  // supabase.storage.info(path) —una petición que hace el SERVIDOR con la
  // clave service_role—, así que un path raro ahí podía forjar una
  // petición privilegiada contra otra ruta de la API, no solo leer/
  // escribir Storage. Los videos públicos delatan su path en la URL, así
  // que sin validar esto a fondo un cliente también podía mandar el path
  // real de OTRA cuenta junto a un casoId suyo y lograr que lo
  // "reasignáramos" — y, de paso, que el bloque de abajo borre el video
  // anterior en ESE path, que es de otra cuenta. Un path viejo (subido
  // antes de este fix, sin el prefijo de cuenta) sigue funcionando para
  // LEER: esto solo bloquea escribir/reemplazar con un path que no tenga
  // esta forma exacta.
  if (!path.startsWith(cuentaId + '/') || !/^[0-9a-f-]{36}\.mp4$/.test(path.slice(cuentaId.length + 1))) {
    throw new Error('No autorizado');
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  const url = data.publicUrl;

  // Tamaño REAL del archivo ya subido a Storage — no el tamanoBytes que
  // mandó el navegador, que un cliente podría falsear para saltarse el
  // cupo. Fallamos CERRADO si Storage no puede confirmar un tamaño de
  // verdad (error, o info.size que no es un número finito >= 0 — p. ej.
  // un path que nunca se llegó a subir): borramos lo que haya en ese path
  // y rechazamos, en vez de caer de vuelta a tamanoBytes. Caer a
  // tamanoBytes era el hueco: un cliente podía mandar el path de un
  // archivo inexistente junto con un tamanoBytes negativo enorme —
  // info.size salía undefined, el cupo se "verificaba" contra ese
  // negativo (nunca lo supera) y ese número quedaba guardado en
  // tamano_bytes, dejando el cupo de storage de esa cuenta roto para
  // siempre (usoStorageBytes suma esa fila negativa en cada chequeo
  // futuro, así que ya nunca vuelve a bloquear nada).
  const { data: info, error: errorInfo } = await supabase.storage.from(BUCKET).info(path);
  if (errorInfo || typeof info?.size !== 'number' || !Number.isFinite(info.size) || info.size < 0) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { error: 'No se pudo verificar el video subido. Intenta de nuevo.' };
  }
  const tamanoReal = info.size;

  // Mismo cálculo que ya hace crearUrlSubidaVideo, pero con el tamaño de
  // verdad: si de todos modos se pasa del cupo, borramos lo que se acaba
  // de subir y no guardamos la fila.
  if (rol === 'cliente') {
    const { data: cuenta } = await supabase.from('cuentas').select('cupo_storage_mb').eq('id', cuentaId).single();
    const usoActual = await usoStorageBytes(supabase, cuentaId);
    if (usoActual + tamanoReal > cuenta.cupo_storage_mb * 1024 * 1024) {
      await borrarVideosStorage(supabase, [url]);
      return { error: 'Llegaste al límite de almacenamiento de tu plan. Contacta a tu asesor para ampliarlo.' };
    }
  }

  // Si ya había un video en este punto/caso, borrar el archivo anterior.
  const { data: prev } = await supabase
    .from('caso_videos').select('video_url')
    .eq('caso_id', casoId).eq('punto_id', puntoId).maybeSingle();
  if (prev?.video_url && prev.video_url !== url) {
    await borrarVideosStorage(supabase, [prev.video_url]);
  }

  await supabase.from('caso_videos').upsert({ caso_id: casoId, punto_id: puntoId, video_url: url, tamano_bytes: tamanoReal });

  // Devolvemos también el uso de storage ya actualizado: así el contador
  // del panel sube de inmediato tras la subida, sin recargar ni volver a
  // elegir la cuenta (igual que el resto del panel, que vive de fusionar
  // la respuesta de cada acción sobre el estado actual).
  const datos = await leerTodo(supabase, cuentaId);
  const usoBytes = await usoStorageBytes(supabase, cuentaId);
  return { ...datos, usoStorageMb: Math.round(usoBytes / (1024 * 1024)) };
}

export async function quitarVideoCaso(cuentaId, casoId, puntoId) {
  const { rol, cuentaId: miCuentaId } = await requerirAdmin();
  if (rol === 'cliente' && cuentaId !== miCuentaId) throw new Error('No autorizado');
  const supabase = crearClienteAdmin();

  // Mismo chequeo que guardarVideoCaso: el caso debe ser DE ESTA cuenta,
  // verificado a nivel de consulta (no solo por el chequeo de permiso de
  // arriba), antes de tocar Storage o la fila de caso_videos.
  const { data: propio } = await supabase
    .from('casos').select('id').eq('id', casoId).eq('cuenta_id', cuentaId).maybeSingle();
  if (!propio) throw new Error('No autorizado');

  const { data: row } = await supabase
    .from('caso_videos').select('video_url')
    .eq('caso_id', casoId).eq('punto_id', puntoId).maybeSingle();
  if (row?.video_url) await borrarVideosStorage(supabase, [row.video_url]);
  await supabase.from('caso_videos').delete().eq('caso_id', casoId).eq('punto_id', puntoId);

  // Mismo motivo que en guardarVideoCaso: refrescamos el uso de storage ya
  // actualizado, así el contador del panel baja de inmediato al quitar un
  // video, sin esperar a la próxima acción con cuenta.
  const datos = await leerTodo(supabase, cuentaId);
  const usoBytes = await usoStorageBytes(supabase, cuentaId);
  return { ...datos, usoStorageMb: Math.round(usoBytes / (1024 * 1024)) };
}
