// Panel de administración. El middleware ya garantiza que aquí solo se
// llega con sesión válida. Cargamos los datos en el servidor (con la clave
// service_role) y los pasamos al panel interactivo.
import { leerDatosAdmin } from '@/app/actions/admin';
import { logout } from '@/app/actions/auth';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Panel de administración — EcoSim',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  // leerDatosAdmin() lanza un error con "codigo" cuando no se puede entrar
  // (sin perfil, cuenta desactivada o borrada, sesión cerrada) y su mensaje
  // ya viene listo para mostrarse. Cualquier otro error (Supabase caído,
  // red) NO es culpa de la cuenta: se dice eso, en vez del engañoso
  // "tu cuenta no está activa" de antes.
  let datos = null;
  let errorCuenta = null;
  try {
    datos = await leerDatosAdmin();
  } catch (err) {
    console.error('[admin] no se pudo cargar el panel:', err);
    errorCuenta = err?.codigo
      ? err.message
      : 'No se pudo cargar el panel. Revisa tu conexión y recarga la página en unos segundos.';
  }

  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">Administración</span>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a className="btn" href="/admin/cambiar-clave">Cambiar contraseña</a>
          <form action={logout}>
            <button className="btn">Cerrar sesión</button>
          </form>
        </div>
      </div>
      {errorCuenta ? (
        <p className="muted" style={{ padding: 24, textAlign: 'center' }}>{errorCuenta}</p>
      ) : (
        <AdminPanel inicial={datos} />
      )}
    </div>
  );
}
