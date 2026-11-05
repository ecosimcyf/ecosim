import { crearT } from '@/lib/i18n/config';
import { LANDING } from '@/lib/i18n/textos/landing';
import { whatsappUrl, WHATSAPP_VISIBLE, CORREO } from './contacto';

// Pie compartido por todas las páginas públicas livianas.
export default function LandingFooter({ idioma }) {
  const t = crearT(LANDING, idioma);
  return (
    <footer className="landing-footer">
      <span>© {new Date().getFullYear()} EcoSim · <a href="/admin/login">{t('pie.iniciarSesion')}</a></span>
      <span>
        <a href={whatsappUrl(t('whatsapp.mensaje'))} target="_blank" rel="noopener">WhatsApp {WHATSAPP_VISIBLE}</a>
        {' · '}<a href={'mailto:' + CORREO}>{CORREO}</a>
      </span>
      <span className="landing-footer-legal">
        <a href="/guia">{t('pie.guia')}</a> · <a href="/terminos">{t('pie.terminos')}</a> · <a href="/privacidad">{t('pie.privacidad')}</a>
      </span>
    </footer>
  );
}
