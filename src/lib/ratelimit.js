// ============================================================
// Límite de intentos (login, cambio de clave, contacto), SOLO para el
// servidor.
//
// El contador vive en la base (tabla "intentos", ver
// supabase/migracion-2026-11-04-revision.sql), así que lo comparten todos
// los servidores de Vercel. Antes vivía en la memoria de cada uno, y un
// atacante que cayera en servidores distintos tenía varios contadores.
//
// consumirIntento() comprueba Y registra en un solo paso atómico
// (función SQL consumir_intento, migracion-2026-11-24-arreglos.sql): antes
// se comprobaba, se intentaba y se registraba después, y 50 peticiones a la
// vez pasaban todas la comprobación. Si esa función aún no existe (migración
// sin ejecutar) se usa el flujo de antes (estaBloqueado + registrarIntento).
//
// Si la base falla: el login "falla cerrado" (se bloquea, mejor que dejar
// pasar adivinanzas de contraseña); los demás usan el contador en memoria.
// ============================================================
import { headers } from 'next/headers';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { registrarError } from '@/lib/errores';
import { faltaMigracion } from '@/lib/limpieza';
import { claveIp } from '@/lib/limites';

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
// pone la propia plataforma (el visitante no los puede falsear). De una IPv6
// solo se usa el prefijo /64 (ver claveIp en src/lib/limites.js).
export async function ipVisitante() {
  const h = await headers();
  return claveIp(h.get('x-real-ip') || (h.get('x-forwarded-for') || '').split(',')[0]);
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

// Cuándo se volverá a probar la función consumir_intento si no existe (así
// no se pierde una consulta por cada intento mientras falte la migración).
let sinFuncionHasta = 0;

// Registra UN intento y dice si ya se pasó del límite. Devuelve:
//   'ok'         → puede seguir
//   'bloqueado'  → demasiados intentos
//   'error'      → la base falló y se pidió fallar cerrado (falloCerrado)
// Con falloCerrado el login se niega si la base no responde; sin él (el
// contacto) se usa el contador en memoria de esta instancia.
export async function consumirIntento(clave, limite = LIMITE_DEFECTO, { falloCerrado = false } = {}) {
  const k = clave.slice(0, 200);
  if (Date.now() >= sinFuncionHasta) {
    try {
      const { data, error } = await crearClienteAdmin().rpc('consumir_intento', {
        p_clave: k, p_max: limite.max, p_ventana_seg: limite.ventanaSeg,
      });
      if (error) throw error;
      return data ? 'bloqueado' : 'ok';
    } catch (err) {
      if (faltaMigracion(err)) {
        sinFuncionHasta = Date.now() + 5 * 60 * 1000; // migración pendiente: flujo de antes
      } else {
        await registrarError('ratelimit', err);
        if (falloCerrado) return 'error';
        const b = bloqueadoEnMemoria(k, limite);
        registrarEnMemoria(k, limite);
        return b ? 'bloqueado' : 'ok';
      }
    }
  }
  // Flujo anterior a la migración: comprobar y luego registrar.
  if (await estaBloqueado(k, limite)) return 'bloqueado';
  await registrarIntento(k, limite);
  return 'ok';
}

export async function limpiarIntentos(clave) {
  memoria.delete(clave);
  try {
    await crearClienteAdmin().from('intentos').delete().eq('clave', clave.slice(0, 200));
  } catch {
    // No pasa nada: el contador caduca solo al terminar la ventana.
  }
}
