// Cliente de Supabase con TODOS los permisos (clave "service_role").
// ⚠️  SOLO en el servidor y SIEMPRE detrás del check de sesión de admin.
// Esta clave nunca debe llegar al navegador.
import { createClient } from '@supabase/supabase-js';

export function crearClienteAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
