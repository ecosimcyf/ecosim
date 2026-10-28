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
        <div className="msg msg-ok">
          Tu cuenta se borró por completo, como pediste.
        </div>
      )}
      <input name="correo" type="email" placeholder="Correo" autoComplete="username" required autoFocus />
      <input name="password" type="password" placeholder="Contraseña" autoComplete="current-password" required />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </button>
      {state?.error && (
        <div className="msg msg-error">{state.error}</div>
      )}
      {/* No hay recuperación por correo (el alta tampoco usa correo
          saliente): el asesor genera una contraseña temporal nueva desde
          su panel (Cuentas → Restablecer contraseña). */}
      <div className="login-ayuda">
        ¿Olvidaste tu contraseña? Escríbele a tu asesor y te enviará una nueva.
      </div>
      <a className="btn-link" href="/">← Volver al inicio</a>
    </form>
  );
}
