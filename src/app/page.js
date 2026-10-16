// Vista principal (pública, sin login). Muestra un menú con los casos
// activos; el estudiante elige cuál simular. Cargamos el menú en el
// servidor para el primer pintado y luego el componente cliente se
// encarga del tiempo real y la interacción.
import { crearClienteServidor } from '@/lib/supabase/server';
import { listarCasosActivos } from '@/lib/datos';
import VistaPrincipal from './VistaPrincipal';

// Siempre datos frescos (no cachear la página).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = crearClienteServidor();
  const casosActivosIniciales = await listarCasosActivos(supabase);
  return <VistaPrincipal casosActivosIniciales={casosActivosIniciales} />;
}
