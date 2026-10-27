'use client';
import { useActionState } from 'react';
import { enviarSolicitudContacto } from '@/app/actions/contacto';

export default function FormularioContacto() {
  const [state, formAction, pending] = useActionState(enviarSolicitudContacto, {});

  if (state?.ok) {
    return (
      <div className="contacto-ok">
        <div className="contacto-ok-titulo">Solicitud enviada</div>
        <p>Gracias por escribirnos. Un asesor revisará tu mensaje y te contactará pronto.</p>
      </div>
    );
  }

  return (
    <form className="contacto-form" action={formAction}>
      <input name="nombre" placeholder="Nombre" autoComplete="name" />
      <input name="clinica" placeholder="Clínica o institución" autoComplete="organization" />
      <input name="correo" type="email" placeholder="Correo" autoComplete="email" />
      <input name="telefono" type="tel" placeholder="Teléfono (opcional)" autoComplete="tel" />
      <textarea name="mensaje" placeholder="¿En qué podemos ayudarte? (opcional)" rows={4} />
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
      {state?.error && (
        <div className="landing-form-error">{state.error}</div>
      )}
    </form>
  );
}
