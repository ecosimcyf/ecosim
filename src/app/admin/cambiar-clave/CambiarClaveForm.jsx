'use client';
import { useActionState } from 'react';
import { cambiarContrasena } from '@/app/actions/auth';

export default function CambiarClaveForm() {
  const [state, formAction, pending] = useActionState(cambiarContrasena, {});
  return (
    <form className="login-box" action={formAction}>
      <div className="login-t">Cambiar contraseña</div>
      <input name="actual" type="password" placeholder="Contraseña actual" autoComplete="current-password" required autoFocus />
      <input name="nueva" type="password" placeholder="Contraseña nueva (mínimo 8 caracteres)" autoComplete="new-password" minLength={8} required />
      <input name="repetir" type="password" placeholder="Repite la contraseña nueva" autoComplete="new-password" minLength={8} required />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar'}
      </button>
      {state?.error && (
        <div className="msg msg-error">{state.error}</div>
      )}
      {state?.ok && (
        <div className="msg msg-ok">Contraseña actualizada.</div>
      )}
      <a className="btn-link" href="/admin">← Volver al panel</a>
    </form>
  );
}
