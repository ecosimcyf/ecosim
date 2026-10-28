'use client';
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from '@/app/actions/auth';

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, {});
  const cuentaEliminada = useSearchParams().get('cuenta_eliminada') === '1';
  return (
    <form className="login-box" action={formAction}>
      <div className="login-t">Acceso al panel</div>
      {cuentaEliminada && (
        <div className="msg" style={{ color: '#7fe0a0' }}>
          Tu cuenta se borró por completo, como pediste.
        </div>
      )}
      <input name="correo" type="email" placeholder="Correo" autoFocus />
      <input name="password" type="password" placeholder="Contraseña" />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
      {state?.error && (
        <div className="msg" style={{ color: '#e0a0a0' }}>{state.error}</div>
      )}
    </form>
  );
}
