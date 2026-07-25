// Cliente de Supabase para el NAVEGADOR (clave pública "anon").
// Se usa para: leer datos públicos, escuchar cambios en tiempo real y
// subir videos con una URL firmada. Nunca puede escribir en las tablas.
import { createBrowserClient } from '@supabase/ssr';

export function crearClienteNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
