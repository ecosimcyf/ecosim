// Vista principal (pública, sin login) de UNA cuenta, identificada por su
// slug en la URL. Muestra un menú con los casos activos de esa cuenta; el
// estudiante elige cuál simular. Cargamos el menú en el servidor para el
// primer pintado y luego el componente cliente se encarga del sondeo y la
// interacción.
//
// Idioma: el que el estudiante eligió con el selector (cookie) o, si no
// eligió ninguno, el de la cuenta.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { crearClienteServidor } from '@/lib/supabase/server';
import { resolverCuenta, listarCasosActivos, SIN_ACCESO } from '@/lib/datos';
import { nombreCookieAcceso } from '@/lib/acceso';
import { crearT, idiomaValido, IDIOMA_DEFECTO } from '@/lib/i18n/config';
import { idiomaElegido, idiomaVisitante } from '@/lib/i18n/servidor';
import { Idioma } from '@/lib/i18n/cliente';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';
import VistaPrincipal from './VistaPrincipal';

// Siempre datos frescos (no cachear la página).
export const dynamic = 'force-dynamic';

// generateMetadata y la página piden la misma cuenta: cache() hace que en
// una misma petición se consulte una sola vez. null si no existe o si la
// consulta falla (se muestra "no disponible", no un error 500).
const cuentaDe = cache(async (slug) => {
  try {
    return await resolverCuenta(crearClienteServidor(), slug);
  } catch (err) {
    console.error('[estudiante] no se pudo resolver la cuenta:', err?.message || err);
    return null;
  }
});

// Enlace privado de cada cuenta: no debe indexarse ni salir en buscadores.
// El título sí usa el nombre real de la cuenta cuando existe, para que la
// pestaña del navegador diga algo útil mientras el estudiante practica.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cuenta = await cuentaDe(slug);
  return {
    title: cuenta ? `${cuenta.nombre} — EcoSim` : 'EcoSim',
    robots: { index: false, follow: false },
    // Manifiesto propio de esta cuenta (ver manifest.webmanifest/route.js).
    manifest: `/c/${encodeURIComponent(slug)}/manifest.webmanifest`,
  };
}

export default async function PaginaCuenta({ params }) {
  const { slug } = await params;
  const cuenta = await cuentaDe(slug);

  if (!cuenta || !cuenta.activa) {
    const t = crearT(ESTUDIANTE, await idiomaVisitante());
    return (
      <div className="espera">
        <div className="marca">ECOSIM</div>
        <div className="txt">{t('noDisponible')}</div>
      </div>
    );
  }

  // Token de acceso que este navegador guardó al escribir el código (si la
  // cuenta tiene código). Sin él, la base no entrega los casos.
  const token = (await cookies()).get(nombreCookieAcceso(cuenta.id))?.value || null;
  // null = no se pudo consultar; el sondeo del cliente lo vuelve a intentar.
  const [casos, elegido] = await Promise.all([
    listarCasosActivos(crearClienteServidor(), cuenta.id, token),
    idiomaElegido(),
  ]);
  const idioma = elegido || idiomaValido(cuenta.idioma) || IDIOMA_DEFECTO;
  const sinAcceso = casos === SIN_ACCESO;
  return (
    <Idioma valor={idioma}>
      <VistaPrincipal
        casosActivosIniciales={Array.isArray(casos) ? casos : []}
        cuentaId={cuenta.id} slug={slug} sinAccesoInicial={sinAcceso}
      />
    </Idioma>
  );
}
