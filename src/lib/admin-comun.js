// ============================================================
// Piezas comunes de las Server Actions del panel (admin.js, tienda.js):
// errores con clave traducible, conErrores, exigir y las comprobaciones de
// sesión y permisos. Separado de los archivos 'use server' porque estos solo
// pueden exportar funciones asíncronas. SOLO para el servidor.
// ============================================================
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { registrarError } from '@/lib/errores';
import { ErrorTienda } from '@/lib/tienda';

export function texto(v, max) { return String(v ?? '').trim().slice(0, max); }

// ---------- errores ----------

// Error para mostrar en el panel: "clave" es una clave de err.* (el panel
// la traduce), con sus variables ({ vars }) y un "codigo" opcional que
// el panel usa para decidir qué hacer (p. ej. 'sin-sesion' → al login).
export class ErrorAdmin extends Error {
  constructor(clave, { vars, codigo } = {}) { super(clave); this.vars = vars; this.codigo = codigo; }
}

export async function conErrores(fn) {
  try {
    return await fn();
  } catch (e) {
    // ErrorTienda (src/lib/tienda.js, sin Next) se trata como ErrorAdmin.
    let err = e;
    if (e instanceof ErrorTienda) { err = new ErrorAdmin(e.message, { vars: e.vars }); err.causa = e.causa; }
    // Los avisos de validación (ErrorAdmin sin causa: "nombre vacío", "sin
    // cupo"…) no son fallas; todo lo demás queda en el registro de Vercel.
    if (!(err instanceof ErrorAdmin) || err.causa) await registrarError('admin', err);
    if (err instanceof ErrorAdmin) return { error: err.message, vars: err.vars, codigo: err.codigo };
    return { error: 'err.generico' };
  }
}

// Revisa la respuesta de una consulta de Supabase: si trae error, lo lanza.
export function exigir(resultado, que) {
  if (resultado?.error) {
    console.error('[admin] ' + que + ':', resultado.error);
    // "que" (p. ej. 'leer los casos') queda en el registro del servidor;
    // al panel le llega un aviso general.
    const err = new ErrorAdmin('err.operacion');
    err.causa = resultado.error;
    throw err;
  }
  return resultado;
}

// ---------- sesión y permisos ----------

export async function requerirAdmin() {
  const auth = crearClienteServidorAuth();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) throw new ErrorAdmin('err.sesion', { codigo: 'sin-sesion' });
  const supabase = crearClienteAdmin();
  const { data: perfil, error } = await supabase
    .from('perfiles').select('rol,cuenta_id').eq('id', user.id).maybeSingle();
  if (error) throw new ErrorAdmin('err.red', { codigo: 'error-red' });
  if (!perfil) throw new ErrorAdmin('err.sinPerfil', { codigo: 'sin-perfil' });

  if (perfil.rol === 'cliente') {
    if (!perfil.cuenta_id) throw new ErrorAdmin('err.sinCuenta', { codigo: 'sin-perfil' });
    const { data: cuenta, error: errCuenta } = await supabase
      .from('cuentas').select('activa').eq('id', perfil.cuenta_id).maybeSingle();
    if (errCuenta) throw new ErrorAdmin('err.red', { codigo: 'error-red' });
    if (!cuenta) throw new ErrorAdmin('err.cuentaNoExiste', { codigo: 'sin-perfil' });
    if (!cuenta.activa) throw new ErrorAdmin('err.desactivada', { codigo: 'cuenta-inactiva' });
  }
  return { rol: perfil.rol, cuentaId: perfil.cuenta_id, userId: user.id };
}

export async function requerirSuperAdmin() {
  const r = await requerirAdmin();
  if (r.rol !== 'super_admin') throw new ErrorAdmin('err.noAutorizado');
  return r;
}

// Cualquier admin, pero solo sobre SU cuenta (el super_admin, sobre
// cualquiera que exista).
export async function requerirAccesoCuenta(cuentaId) {
  const r = await requerirAdmin();
  if (typeof cuentaId !== 'string' || !cuentaId) throw new ErrorAdmin('err.eligeCuenta');
  if (r.rol === 'cliente' && cuentaId !== r.cuentaId) throw new ErrorAdmin('err.noAutorizado');
  return r;
}
