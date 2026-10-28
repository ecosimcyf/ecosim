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
      <div className="campo-flotante">
        <input id="ctc-nombre" name="nombre" placeholder=" " autoComplete="name" required maxLength={100} />
        <label htmlFor="ctc-nombre">Nombre</label>
      </div>
      <div className="campo-flotante">
        <input id="ctc-clinica" name="clinica" placeholder=" " autoComplete="organization" maxLength={150} />
        <label htmlFor="ctc-clinica">Clínica o institución (opcional)</label>
      </div>
      <div className="campo-flotante">
        <input id="ctc-correo" name="correo" type="email" placeholder=" " autoComplete="email" required maxLength={200} />
        <label htmlFor="ctc-correo">Correo</label>
      </div>
      <div className="campo-flotante">
        <input id="ctc-telefono" name="telefono" type="tel" placeholder=" " autoComplete="tel" maxLength={40} />
        <label htmlFor="ctc-telefono">Teléfono (opcional)</label>
      </div>
      <div className="campo-flotante">
        <textarea id="ctc-mensaje" name="mensaje" placeholder=" " rows={4} maxLength={2000} />
        <label htmlFor="ctc-mensaje">¿En qué podemos ayudarte? (opcional)</label>
      </div>
      {/* Trampa para bots: invisible para personas (y fuera del orden de tabulación). */}
      <div className="campo-trampa" aria-hidden="true">
        <label htmlFor="ctc-sitio">No llenar</label>
        <input id="ctc-sitio" name="sitio_web" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="contacto-autorizo">
        <input type="checkbox" name="autorizo" value="si" required />
        <span>
          Autorizo a EcoSim a tratar mis datos para responder esta solicitud, según la{' '}
          <a href="/privacidad" target="_blank" rel="noopener">política de privacidad</a>.
        </span>
      </label>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </button>
      {state?.error && (
        <div className="landing-form-error" role="alert">{state.error}</div>
      )}
    </form>
  );
}
