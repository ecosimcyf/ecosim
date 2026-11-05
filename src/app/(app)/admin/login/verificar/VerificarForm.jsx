'use client';
// Formulario del código de 6 dígitos (ver page.js). Los errores vuelven
// como claves del grupo "mfa" y se traducen con los textos recibidos.
import { useActionState } from 'react';
import { verificarLogin } from '@/app/actions/mfa';
import { logout } from '@/app/actions/auth';

export default function VerificarForm({ textos: t }) {
  const [state, formAction, pending] = useActionState(verificarLogin, {});
  return (
    <div className="login-box">
      <form action={formAction} className="login-box-form">
        <div className="login-t">{t.loginTitulo}</div>
        <p className="login-ayuda">{t.loginTexto}</p>
        <input
          name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7}
          placeholder={t.codigo} aria-label={t.codigo} required autoFocus
        />
        <button className="btn btn-primary" disabled={pending}>{t.loginEntrar}</button>
        <div className="msg msg-error" role="alert">{state?.error ? t[state.error.split('.')[1]] : ''}</div>
      </form>
      <form action={logout}>
        <button className="btn-link">{t.loginOtra}</button>
      </form>
    </div>
  );
}
