// Cualquier admin con sesión (super_admin o cliente) cambia su propia
// contraseña aquí. Pensada sobre todo para que el cliente reemplace la
// contraseña temporal que le dio el super_admin al crear su cuenta (ver
// crearCuenta en actions/admin.js), pero sirve para cualquier otro admin.
// Ya queda protegida por el middleware existente (su matcher ya cubre
// /admin/:path*): sin sesión, no se llega hasta aquí.
import CambiarClaveForm from './CambiarClaveForm';

export const metadata = {
  title: 'Cambiar contraseña — EcoSim',
  robots: { index: false, follow: false },
};

export default function CambiarClavePage() {
  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">Administración</span>
      </div>
      <div className="admin-login">
        <CambiarClaveForm />
      </div>
    </div>
  );
}
