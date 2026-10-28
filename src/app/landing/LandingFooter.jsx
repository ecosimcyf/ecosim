import { WHATSAPP_URL, WHATSAPP_VISIBLE, CORREO } from './contacto';

// Pie compartido por todas las páginas públicas livianas.
export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <span>© {new Date().getFullYear()} EcoSim · <a href="/admin/login">Iniciar sesión</a></span>
      <span>
        <a href={WHATSAPP_URL} target="_blank" rel="noopener">WhatsApp {WHATSAPP_VISIBLE}</a>
        {' · '}<a href={'mailto:' + CORREO}>{CORREO}</a>
      </span>
      <span className="landing-footer-legal">
        <a href="/terminos">Términos y condiciones</a> · <a href="/privacidad">Política de privacidad</a>
      </span>
    </footer>
  );
}
