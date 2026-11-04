// ============================================================
// Tarea diaria automática (Vercel Cron, ver vercel.json): borra archivos
// huérfanos, reservas de subida vencidas, contadores de intentos viejos y
// errores de más de 30 días (ver src/lib/limpieza.js).
//
// Protegida con CRON_SECRET: Vercel la manda sola en la cabecera
// Authorization cuando la variable está configurada en el proyecto. Sin
// esa variable la ruta no hace nada (nadie de afuera puede dispararla).
// ============================================================
import { timingSafeEqual } from 'node:crypto';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { limpiezaCompleta } from '@/lib/limpieza';
import { registrarError } from '@/lib/errores';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function autorizado(request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const esperado = Buffer.from('Bearer ' + secreto);
  const recibido = Buffer.from(request.headers.get('authorization') || '');
  return recibido.length === esperado.length && timingSafeEqual(recibido, esperado);
}

export async function GET(request) {
  if (!autorizado(request)) return new Response('No autorizado', { status: 401 });
  try {
    const r = await limpiezaCompleta(crearClienteAdmin());
    console.log('[cron] limpieza:', r);
    return Response.json({ ok: true, ...r });
  } catch (err) {
    await registrarError('cron-limpieza', err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
