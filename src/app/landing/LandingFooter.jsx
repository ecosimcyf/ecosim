import { crearT } from '@/lib/i18n/config';
import { LANDING } from '@/lib/i18n/textos/landing';
import AnioActual from './AnioActual';
import { whatsappUrl, WHATSAPP_VISIBLE, CORREO } from './contacto';

// Pie compartido por todas las páginas públicas livianas.
export default function LandingFooter({ idioma }) {
  const t = crearT(LANDING, idioma);
  const base = '/' + idioma;
  return (
    <footer className="landing-footer">
      <span>©<AnioActual /> EcoSim · <a href="/admin/login">{t('pie.iniciarSesion')}</a></span>
      <span>
        <a href={whatsappUrl(t('whatsapp.mensaje'))} target="_blank" rel="noopener">WhatsApp {WHATSAPP_VISIBLE}</a>
        {' · '}<a href={'mailto:' + CORREO}>{CORREO}</a>
      </span>
      <span className="landing-footer-legal">
        <a href={base + '/guia'}>{t('pie.guia')}</a> · <a href={base + '/terminos'}>{t('pie.terminos')}</a> · <a href={base + '/privacidad'}>{t('pie.privacidad')}</a>
      </span>
    </footer>
  );
}
