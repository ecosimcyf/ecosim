'use client';
// Los textos llegan ya traducidos (prop "textos"); los errores los
// traduce la acción del servidor.
import { useActionState } from 'react';
import { cambiarContrasena } from '@/app/actions/auth';

export default function CambiarClaveForm({ textos: t }) {
  const [state, formAction, pending] = useActionState(cambiarContrasena, {});
  return (
    <form className="login-box" action={formAction}>
      <div className="login-t">{t.titulo}</div>
      <input name="actual" type="password" placeholder={t.actual} autoComplete="current-password" required autoFocus />
      <input name="nueva" type="password" placeholder={t.nueva} autoComplete="new-password" minLength={8} required />
      <input name="repetir" type="password" placeholder={t.repetir} autoComplete="new-password" minLength={8} required />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? t.guardando : t.guardar}
      </button>
      {state?.error && (
        <div className="msg msg-error">{state.error}</div>
      )}
      {state?.ok && (
        <div className="msg msg-ok">{t.ok}</div>
      )}
      <a className="btn-link" href="/admin">{t.volver}</a>
    </form>
  );
}
