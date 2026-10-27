// Panel de administración. El middleware ya garantiza que aquí solo se
// llega con sesión válida. Cargamos los datos en el servidor (con la clave
// service_role) y los pasamos al panel interactivo.
import { leerDatosAdmin } from '@/app/actions/admin';
import { logout } from '@/app/actions/auth';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // Si el usuario autenticado no tiene fila en "perfiles" (p. ej. una
  // cuenta a medio crear: el usuario de Auth se creó pero la cuenta o el
  // perfil fallaron después — ver el manejo de errores de crearCuenta en
  // actions/admin.js), requerirAdmin() lanza "No autorizado" y sin este
  // try/catch la página reventaría con un error de servidor sin manejar.
  let datos = null;
  let errorCuenta = null;
  try {
    datos = await leerDatosAdmin();
  } catch {
    errorCuenta = 'Tu cuenta todavía no está activa. Contacta a tu asesor.';
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
