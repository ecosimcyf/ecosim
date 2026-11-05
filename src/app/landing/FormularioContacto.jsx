'use client';
// Los textos llegan ya traducidos desde la landing (prop "textos"): así el
// navegador no descarga los de los tres idiomas. Los errores los traduce
// la propia acción del servidor.
import { useActionState } from 'react';
import { enviarSolicitudContacto } from '@/app/actions/contacto';

export default function FormularioContacto({ textos: t }) {
  const [state, formAction, pending] = useActionState(enviarSolicitudContacto, {});

  if (state?.ok) {
    return (
      <div className="contacto-ok">
        <div className="contacto-ok-titulo">{t.okTitulo}</div>
        <p>{t.okTexto}</p>
      </div>
    );
  }

  return (
    <form className="contacto-form" action={formAction}>
      <div className="campo-flotante">
        <input id="ctc-nombre" name="nombre" placeholder=" " autoComplete="name" required maxLength={100} />
        <label htmlFor="ctc-nombre">{t.nombre}</label>
      </div>
      <div className="campo-flotante">
        <input id="ctc-clinica" name="clinica" placeholder=" " autoComplete="organization" maxLength={150} />
        <label htmlFor="ctc-clinica">{t.clinica}</label>
      </div>
      <div className="campo-flotante">
        <input id="ctc-correo" name="correo" type="email" placeholder=" " autoComplete="email" required maxLength={200} />
        <label htmlFor="ctc-correo">{t.correo}</label>
      </div>
      <div className="campo-flotante">
        <input id="ctc-telefono" name="telefono" type="tel" placeholder=" " autoComplete="tel" maxLength={40} />
        <label htmlFor="ctc-telefono">{t.telefono}</label>
      </div>
      <div className="campo-flotante">
        <textarea id="ctc-mensaje" name="mensaje" placeholder=" " rows={4} maxLength={2000} />
        <label htmlFor="ctc-mensaje">{t.mensaje}</label>
      </div>
      {/* Trampa para bots: invisible para personas (y fuera del orden de tabulación). */}
      <div className="campo-trampa" aria-hidden="true">
        <label htmlFor="ctc-sitio">{t.trampa}</label>
        <input id="ctc-sitio" name="sitio_web" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="contacto-autorizo">
        <input type="checkbox" name="autorizo" value="si" required />
        <span>
          {t.autorizoAntes}
          <a href="/privacidad" target="_blank" rel="noopener">{t.autorizoEnlace}</a>.
        </span>
      </label>
      <button className="btn btn-primary" disabled={pending}>
        {pending ? t.enviando : t.enviar}
      </button>
      {state?.error && (
        <div className="landing-form-error" role="alert">{state.error}</div>
      )}
    </form>
  );
}
