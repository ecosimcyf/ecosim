// Botón flotante de WhatsApp (abajo a la derecha) de las páginas públicas.
// En Colombia mucha gente prefiere escribir por WhatsApp antes que llenar
// un formulario.
import { WHATSAPP_URL } from './contacto';

// Burbuja de chat con un teléfono (dibujo propio, sencillo).
export function IconoWhatsApp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.5L3.5 20.5l1.4-4.2a8.5 8.5 0 1 1 15.6-4.7z" />
      <path d="M9.2 8.6c.2-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c-.1.1-.1.3 0 .5.6 1.1 1.5 2 2.6 2.6.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.3.3.5v.5c0 .3-.1.6-.5.8-.6.3-1.4.5-2.4.1-2-.7-3.9-2.6-4.6-4.6-.4-1-.2-1.8.1-2.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function BotonWhatsApp() {
  return (
    <a
      className="whatsapp-flotante"
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener"
      aria-label="Escríbenos por WhatsApp"
      title="Escríbenos por WhatsApp"
    >
      <IconoWhatsApp />
    </a>
  );
}
