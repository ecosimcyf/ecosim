// ============================================================
// Límite de intentos (login, cambio de clave, contacto, código de
// estudiante), SOLO para el servidor.
//
// El contador vive en la base (tabla "intentos", ver
// supabase/migracion-2026-11-04-revision.sql), así que lo comparten todos
// los servidores de Vercel. Antes vivía en la memoria de cada uno, y un
// atacante que cayera en servidores distintos tenía varios contadores.
//
// Si la base no responde (o la migración aún no se ejecutó) se usa el
// contador en memoria de antes: es mejor un límite imperfecto que dejar
// el login sin límite o, peor, bloquear a todo el mundo.
// ============================================================
import { headers } from 'next/headers';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { registrarError } from '@/lib/errores';

// Ventanas por defecto: 5 intentos en 10 minutos.
export const LIMITE_DEFECTO = { max: 5, ventanaSeg: 10 * 60 };

const memoria = new Map(); // clave -> { count, primero }

function bloqueadoEnMemoria(clave, { max, ventanaSeg }) {
  const reg = memoria.get(clave);
  if (!reg) return false;
  if (Date.now() - reg.primero > ventanaSeg * 1000) { memoria.delete(clave); return false; }
  return reg.count >= max;
}

function registrarEnMemoria(clave, { ventanaSeg }) {
  const reg = memoria.get(clave);
  if (!reg || Date.now() - reg.primero > ventanaSeg * 1000) memoria.set(clave, { count: 1, primero: Date.now() });
  else reg.count++;
}

// IP de quien hace la petición. En Vercel, x-real-ip y x-forwarded-for los
// pone la propia plataforma (el visitante no los puede falsear).
export async function ipVisitante() {
  const h = await headers();
  return (h.get('x-real-ip') || (h.get('x-forwarded-for') || '').split(',')[0]).trim() || 'desconocido';
}

export async function estaBloqueado(clave, limite = LIMITE_DEFECTO) {
  try {
    const { data, error } = await crearClienteAdmin().rpc('intento_bloqueado', {
      p_clave: clave.slice(0, 200), p_max: limite.max, p_ventana_seg: limite.ventanaSeg,
    });
    if (error) throw error;
    return !!data;
  } catch (err) {
    console.error('[ratelimit] usando el contador en memoria:', err?.message || err);
    return bloqueadoEnMemoria(clave, limite);
  }
}

export async function registrarIntento(clave, limite = LIMITE_DEFECTO) {
  registrarEnMemoria(clave, limite); // siempre, por si la base falla después
  try {
    const { error } = await crearClienteAdmin().rpc('registrar_intento', {
      p_clave: clave.slice(0, 200), p_ventana_seg: limite.ventanaSeg,
    });
    if (error) throw error;
  } catch (err) {
    // Sin la tabla (migración pendiente) es esperado; cualquier otra cosa se registra.
    if (err?.code !== 'PGRST202') await registrarError('ratelimit', err);
  }
}

export async function limpiarIntentos(clave) {
  memoria.delete(clave);
  try {
    await crearClienteAdmin().from('intentos').delete().eq('clave', clave.slice(0, 200));
  } catch {
    // No pasa nada: el contador caduca solo al terminar la ventana.
  }
}
