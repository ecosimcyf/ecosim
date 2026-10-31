// ============================================================
// Idioma del panel, desde el servidor: el de la cuenta si quien entra es
// el admin de un cliente; si no (super_admin, sin sesión, o la migración
// de idiomas sin ejecutar), el del visitante.
// ============================================================
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { crearClienteAdmin } from '@/lib/supabase/admin';
import { idiomaValido } from './config';
import { idiomaVisitante } from './servidor';

export async function idiomaPanel() {
  // Primero (y fuera del try): leer cookies es lo que le indica a Next.js
  // que la página es dinámica, y esa señal no se debe atrapar.
  const visitante = await idiomaVisitante();
  try {
    const { data: { user } } = await crearClienteServidorAuth().auth.getUser();
    if (user) {
      const supabase = crearClienteAdmin();
      const { data: perfil } = await supabase.from('perfiles').select('rol,cuenta_id').eq('id', user.id).maybeSingle();
      if (perfil?.rol === 'cliente' && perfil.cuenta_id) {
        const { data: cuenta, error } = await supabase.from('cuentas').select('idioma').eq('id', perfil.cuenta_id).maybeSingle();
        const id = !error && idiomaValido(cuenta?.idioma);
        if (id) return id;
      }
    }
  } catch (err) {
    console.error('[i18n] no se pudo leer el idioma del panel:', err);
  }
  return visitante;
}
