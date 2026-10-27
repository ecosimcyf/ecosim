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

  const casosActivosIniciales = await listarCasosActivos(supabase, cuenta.id);
  return <VistaPrincipal casosActivosIniciales={casosActivosIniciales} cuentaId={cuenta.id} />;
}
