// Cliente de Supabase para el SERVIDOR con la clave pública "anon".
// Se usa para pintar la vista del estudiante ya con datos (más rápido).
// No usamos el login de Supabase, así que no manejamos cookies aquí.
import { createClient } from '@supabase/supabase-js';

export function crearClienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}
