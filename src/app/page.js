// Vista principal (pública, sin login). Es un espejo en vivo del caso
// activo. Cargamos los datos en el servidor para el primer pintado y
// luego el componente cliente se encarga del tiempo real y la interacción.
import { crearClienteServidor } from '@/lib/supabase/server';
import { cargarDatosPublicos } from '@/lib/datos';
import VistaPrincipal from './VistaPrincipal';

// Siempre datos frescos (no cachear la página).
export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = crearClienteServidor();
  const inicial = await cargarDatosPublicos(supabase);
  return <VistaPrincipal inicial={inicial} />;
}
