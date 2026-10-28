'use client';
import { useActionState } from 'react';
import { cambiarContrasena } from '@/app/actions/auth';

export default function CambiarClaveForm() {
  const [state, formAction, pending] = useActionState(cambiarContrasena, {});
  return (
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
  );
}
