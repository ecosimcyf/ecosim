'use client';
// Los textos llegan ya traducidos (prop "textos"); los errores los
// traduce la acción del servidor.
import { useActionState } from 'react';
import { useSearchParams } from 'next/navigation';
import { login } from '@/app/actions/auth';

export default function LoginForm({ textos: t }) {
  const [state, formAction, pending] = useActionState(login, {});
  const cuentaEliminada = useSearchParams().get('cuenta_eliminada') === '1';
  return (
    <form className="login-box" action={formAction}>
      <div className="login-t">{t.titulo}</div>
      {cuentaEliminada && (
        <div className="msg msg-ok">{t.borrada}</div>
      )}
      <input name="correo" type="email" placeholder={t.correo} autoComplete="username" required autoFocus />
      <input name="password" type="password" placeholder={t.clave} autoComplete="current-password" required />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? t.entrando : t.entrar}
      </button>
      {state?.error && (
        <div className="msg msg-error">{state.error}</div>
      )}
      {/* No hay recuperación por correo (el alta tampoco usa correo
          saliente): el asesor genera una contraseña temporal nueva desde
          su panel (Cuentas → Restablecer contraseña). */}
      <div className="login-ayuda">{t.olvido}</div>
      <a className="btn-link" href="/">{t.volver}</a>
    </form>
  );
}
