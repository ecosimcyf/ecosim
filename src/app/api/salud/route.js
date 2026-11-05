// ============================================================
// /api/salud — para un monitor de disponibilidad (UptimeRobot, Better
// Stack…): responde 200 si la web Y la base de datos contestan, y 503 si
// no. Configúralo para que lo consulte cada 1–5 minutos y te avise por
// correo/WhatsApp si falla (ver docs/checklist-produccion.md).
//
// Pública y barata: una sola consulta mínima con la clave pública, sin
// datos de nadie en la respuesta.
// ============================================================
import { crearClienteServidor } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const LIMITE_MS = 5000;

export async function GET() {
  const inicio = Date.now();
  let ok = false;
  try {
    const consulta = crearClienteServidor()
      .rpc('cuenta_por_slug_v2', { p_slug: '__salud__' })
      .abortSignal(AbortSignal.timeout(LIMITE_MS));
    const { error } = await consulta;
    ok = !error;
  } catch {
    ok = false;
  }
  return Response.json(
    { ok, baseDeDatos: ok ? 'ok' : 'sin respuesta', ms: Date.now() - inicio },
    { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
