// Cabecera compartida por todas las páginas públicas livianas (landing,
// términos, privacidad, 404): mismo logo y mismos links en todas partes.
// Los enlaces a secciones van con "/#..." para que funcionen también
// desde términos, privacidad o la 404.
//
// Tres zonas: logo a la izquierda, navegación por la página en el
// CENTRO (texto simple) y, a la derecha, el idioma y las dos ACCIONES
// como botones («Iniciar sesión» y «Hablar con un asesor» relleno).
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LANDING } from '@/lib/i18n/textos/landing';
import SelectorIdioma from '@/lib/i18n/SelectorIdioma';

export default async function LandingHeader() {
  const idioma = await idiomaVisitante();
  const t = crearT(LANDING, idioma);
  return (
    <header className="landing-bar">
      <a className="landing-marca" href="/">ECOSIM</a>
      <nav className="landing-nav-secciones" aria-label={t('nav.secciones')}>
        <a className="landing-nav-seccion" href="/#como-funciona">{t('nav.comoFunciona')}</a>
        <a className="landing-nav-seccion" href="/#planes">{t('nav.planes')}</a>
        <a className="landing-nav-seccion" href="/#preguntas">{t('nav.preguntas')}</a>
      </nav>
      <div className="landing-nav-acciones">
        <SelectorIdioma idioma={idioma} etiqueta={t('nav.idioma')} titulo={t('nav.idioma')} className="selector-idioma-claro" />
        <a className="landing-login" href="/admin/login">{t('nav.iniciarSesion')}</a>
        <a className="landing-cta-nav" href="/#contacto">{t('nav.asesor')}</a>
      </div>
    </header>
  );
}
