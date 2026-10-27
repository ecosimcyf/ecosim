// ============================================================
// Refresca la sesión de Supabase Auth en cada petición y dice quién es
// el usuario (si hay alguno). Lo llama src/middleware.js, que decide si
// redirigir a /admin/login según el resultado.
//
// Patrón estándar de @supabase/ssr para middleware de Next.js: hay que
// escribir las cookies nuevas TANTO en `request.cookies` (para que el
// resto de esta misma petición las vea) COMO en `response.cookies` (para
// que el navegador las reciba). Por eso `response` se reconstruye dentro
// de setAll después de tocar request.cookies.
// ============================================================
import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function actualizarSesion(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  return { response, usuario: user ?? null };
}
