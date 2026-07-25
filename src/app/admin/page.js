// Panel de administración. El middleware ya garantiza que aquí solo se
// llega con sesión válida. Cargamos los datos en el servidor (con la clave
// service_role) y los pasamos al panel interactivo.
import { leerDatosAdmin } from '@/app/actions/admin';
import { logout } from '@/app/actions/auth';
import AdminPanel from './AdminPanel';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const datos = await leerDatosAdmin();
  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">Administración</span>
        <form action={logout}>
          <button className="btn">Cerrar sesión</button>
        </form>
      </div>
      <AdminPanel inicial={datos} />
    </div>
  );
}
