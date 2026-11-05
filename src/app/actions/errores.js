'use server';
// ============================================================
// Errores del NAVEGADOR (teléfono del estudiante, panel, landing): los
// manda src/lib/ReporteErrores.jsx y las pantallas de error. Se guardan en
// la misma tabla "errores" que los del servidor, con origen
// "navegador:<dónde>", y los ve el super_admin en la pestaña «Errores».
//
// Es pública (cualquiera puede llamarla), así que: límite por IP, textos
// recortados y nada de lo que llega se usa para otra cosa que guardarlo.
// ============================================================
import { headers } from 'next/headers';
import { estaBloqueado, registrarIntento, ipVisitante } from '@/lib/ratelimit';
import { registrarError } from '@/lib/errores';
import { LIMITES, claveLimite } from '@/lib/limites';
import { esRuido, limpiarReporte } from '@/lib/filtro-errores';

export async function reportarErrorNavegador(reporte) {
  try {
    const r = limpiarReporte(reporte);
    if (esRuido(r.mensaje, r.pila)) return;
    const clave = claveLimite('errores-nav', await ipVisitante());
    if (await estaBloqueado(clave, LIMITES.erroresNavegador)) return;
    await registrarIntento(clave, LIMITES.erroresNavegador);
    const agente = ((await headers()).get('user-agent') || '').slice(0, 200);
    await registrarError('navegador:' + r.origen, { message: r.mensaje, stack: r.pila },
      { ruta: r.ruta, digest: r.digest || undefined, navegador: agente });
  } catch {
    // Nunca romper la página por no poder reportar.
  }
}
