'use server';
// ============================================================
// El estudiante escribe el código de acceso de su cuenta.
//
// El código se comprueba AQUÍ (servidor), nunca en el navegador ni en una
// función pública de la base: así se puede limitar cuántas veces se prueba.
// Si es correcto, se guarda en una cookie el token de acceso de la cuenta
// (ver src/lib/acceso.js), que es lo que la base exige después.
//
// Límite: 30 fallos cada 10 minutos por IP y cuenta. Es alto a propósito:
// un salón entero sale a internet con la MISMA IP, y unos cuantos errores
// de tipeo no deben dejar a la clase fuera. Aun así, adivinar un código de
// 6 letras a ese ritmo tomaría años.
// ============================================================
import { cookies } from 'next/headers';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { estaBloqueado, registrarIntento, ipVisitante } from '@/lib/ratelimit';
import { registrarError } from '@/lib/errores';
import { comprobarCodigo, CODIGO_MAX } from '@/lib/codigo-acceso';
import { nombreCookieAcceso, DIAS_ACCESO } from '@/lib/acceso';

const LIMITE_CODIGO = { max: 30, ventanaSeg: 10 * 60 };

// Devuelve { ok: true } o { error: 'codigo.incorrecto' | 'codigo.intentos' | 'codigo.fallo' }
// (claves de los textos del estudiante).
export async function entrarConCodigo(slug, codigo) {
  try {
    if (typeof slug !== 'string' || typeof codigo !== 'string' || codigo.length > CODIGO_MAX * 2) {
      return { error: 'codigo.incorrecto' };
    }
    const supabase = crearClienteAdmin();
    const { data: cuenta, error } = await supabase.from('cuentas')
      .select('id,activa,codigo_hash,token_acceso').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!cuenta || !cuenta.activa) return { error: 'codigo.incorrecto' };
    // La cuenta ya no pide código: no hay nada que comprobar.
    if (!cuenta.token_acceso) return { ok: true };

    const clave = 'codigo:' + (await ipVisitante()) + ':' + cuenta.id;
    if (await estaBloqueado(clave, LIMITE_CODIGO)) return { error: 'codigo.intentos' };
    if (!comprobarCodigo(codigo, cuenta.codigo_hash)) {
      await registrarIntento(clave, LIMITE_CODIGO);
      return { error: 'codigo.incorrecto' };
    }

    (await cookies()).set(nombreCookieAcceso(cuenta.id), cuenta.token_acceso, {
      path: '/',
      maxAge: DIAS_ACCESO * 24 * 60 * 60,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false, // el navegador lo manda a Supabase (ver src/lib/acceso.js)
    });
    return { ok: true };
  } catch (err) {
    await registrarError('codigo-estudiante', err, { slug });
    return { error: 'codigo.fallo' };
  }
}
