// Clientes de Supabase para el SERVIDOR con la clave pública "anon".
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Se usa para pintar la vista del estudiante ya con datos (más rápido).
// No usamos el login de Supabase aquí, así que no manejamos cookies.
export function crearClienteServidor() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

// Cliente ligado a las cookies de la petición: este SÍ mantiene la sesión
// de Supabase Auth (login/logout del panel de administración). Lo usan
// las Server Actions de auth.js y requerirAdmin()/requerirSuperAdmin() en
// admin.js para saber quién tiene la sesión abierta.
//
// getAll/setAll pueden ser async (Supabase los espera igual), así que
// aquí dentro usamos `await cookies()` sin obligar a quien llama a esta
// función a hacer `await crearClienteServidorAuth()`.
//
// setAll se envuelve en try/catch: en un Server Component no se pueden
// escribir cookies (Next.js lanza un error) y aquí debe ser un no-op
// silencioso. En una Server Action (login/logout) sí puede escribir, y
// ahí es donde de verdad hace falta.
export function crearClienteServidorAuth() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        async getAll() {
          const cookieStore = await cookies();
          return cookieStore.getAll();
        },
        async setAll(cookiesToSet) {
          try {
            const cookieStore = await cookies();
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Llamado desde un Server Component (p. ej. al renderizar
            // /admin): no se puede escribir. El middleware ya refresca
            // la sesión en cada petición, así que esto es seguro de
            // ignorar.
          }
        },
      },
    }
  );
}
