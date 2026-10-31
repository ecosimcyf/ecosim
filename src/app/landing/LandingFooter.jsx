import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LANDING } from '@/lib/i18n/textos/landing';
import { whatsappUrl, WHATSAPP_VISIBLE, CORREO } from './contacto';

// Pie compartido por todas las páginas públicas livianas.
export default async function LandingFooter() {
  const t = crearT(LANDING, await idiomaVisitante());
  return (
    <footer className="landing-footer">
      <span>© {new Date().getFullYear()} EcoSim · <a href="/admin/login">{t('pie.iniciarSesion')}</a></span>
      <span>
        <a href={whatsappUrl(t('whatsapp.mensaje'))} target="_blank" rel="noopener">WhatsApp {WHATSAPP_VISIBLE}</a>
        {' · '}<a href={'mailto:' + CORREO}>{CORREO}</a>
      </span>
      <span className="landing-footer-legal">
        <a href="/terminos">{t('pie.terminos')}</a> · <a href="/privacidad">{t('pie.privacidad')}</a>
      </span>
    </footer>
  );
}
