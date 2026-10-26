'use client';
import { useActionState } from 'react';
import { login } from '@/app/actions/auth';

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, {});
  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">Administración</span>
      </div>
      <div className="admin-login">
        <form className="login-box" action={formAction}>
          <div className="login-t">Acceso al panel</div>
          <input name="correo" type="email" placeholder="Correo" autoFocus />
          <input name="password" type="password" placeholder="Contraseña" />
          <button className="btn btn-primary" disabled={pending}>
            {pending ? 'Entrando…' : 'Entrar'}
          </button>
          {state?.error && (
            <div className="msg" style={{ color: '#e0a0a0' }}>{state.error}</div>
          )}
        </form>
      </div>
    </div>
  );
}
