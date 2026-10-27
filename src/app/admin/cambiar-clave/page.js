'use client';
// Cualquier admin con sesión (super_admin o cliente) cambia su propia
// contraseña aquí. Pensada sobre todo para que el cliente reemplace la
// contraseña temporal que le dio el super_admin al crear su cuenta (ver
// crearCuenta en actions/admin.js), pero sirve para cualquier otro admin.
// Ya queda protegida por el middleware existente (su matcher ya cubre
// /admin/:path*): sin sesión, no se llega hasta aquí.
import { useActionState } from 'react';
import { cambiarContrasena } from '@/app/actions/auth';

export default function CambiarClavePage() {
  const [state, formAction, pending] = useActionState(cambiarContrasena, {});
  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">Administración</span>
      </div>
      <div className="admin-login">
        <form className="login-box" action={formAction}>
          <div className="login-t">Cambiar contraseña</div>
          <input name="nueva" type="password" placeholder="Contraseña nueva (mínimo 8 caracteres)" autoFocus />
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar'}
          </button>
          {state?.error && (
            <div className="msg" style={{ color: '#e0a0a0' }}>{state.error}</div>
          )}
          {state?.ok && (
            <div className="msg" style={{ color: '#7fe0a0' }}>Contraseña actualizada.</div>
          )}
        </form>
      </div>
    </div>
  );
}
