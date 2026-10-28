// Vista principal (pública, sin login) de UNA cuenta, identificada por su
// slug en la URL. Muestra un menú con los casos activos de esa cuenta; el
// estudiante elige cuál simular. Cargamos el menú en el servidor para el
// primer pintado y luego el componente cliente se encarga del sondeo y la
// interacción.
import { crearClienteServidor } from '@/lib/supabase/server';
import { resolverCuenta, listarCasosActivos } from '@/lib/datos';
import VistaPrincipal from './VistaPrincipal';

// Siempre datos frescos (no cachear la página).
export const dynamic = 'force-dynamic';

// Enlace privado de cada cuenta: no debe indexarse ni salir en buscadores.
// El título sí usa el nombre real de la cuenta cuando existe, para que la
// pestaña del navegador diga algo útil mientras el estudiante practica.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cuenta = await resolverCuenta(crearClienteServidor(), slug);
  return {
    title: cuenta ? `${cuenta.nombre} — EcoSim` : 'EcoSim',
    robots: { index: false, follow: false },
    // Manifiesto propio de esta cuenta (ver manifest.webmanifest/route.js).
    manifest: `/c/${encodeURIComponent(slug)}/manifest.webmanifest`,
  };
}

export default async function PaginaCuenta({ params }) {
  const { slug } = await params;
  const supabase = crearClienteServidor();
  const cuenta = await resolverCuenta(supabase, slug);

  if (!cuenta || !cuenta.activa) {
    return (
      <div className="espera">
        <div className="marca">ECOSIM</div>
        <div className="txt">Este enlace no está disponible. Contacta a tu asesor.</div>
      </div>
    );
  }

  // null = no se pudo consultar; el sondeo del cliente lo vuelve a intentar.
  const casosActivosIniciales = (await listarCasosActivos(supabase, cuenta.id)) || [];
  return <VistaPrincipal casosActivosIniciales={casosActivosIniciales} cuentaId={cuenta.id} />;
}
