// 404 dentro de las páginas públicas (/es/no-existe, /favicon.ico…).
// Debe ser ESTÁTICA (si leyera cookies volvería dinámicas todas las páginas
// públicas): trae las tres versiones y ElegirIdioma404 muestra la del
// visitante en su navegador (sin JavaScript se ve la española).
import LandingHeader from '@/app/landing/LandingHeader';
import LandingFooter from '@/app/landing/LandingFooter';
import { jakarta } from '@/app/landing/fuente';
import { crearT, IDIOMAS, IDIOMA_DEFECTO } from '@/lib/i18n/config';
import { LANDING } from '@/lib/i18n/textos/landing';
import ElegirIdioma404 from './ElegirIdioma404';

export const metadata = {
  title: crearT(LANDING, IDIOMA_DEFECTO)('error404.titulo'),
  robots: { index: false, follow: false },
};

export default function NoEncontradoPublico() {
  return (
    <>
      <ElegirIdioma404 />
      {IDIOMAS.map((idioma) => {
        const t = crearT(LANDING, idioma);
        return (
          <div key={idioma} data-idioma-404={idioma} hidden={idioma !== IDIOMA_DEFECTO}
            className={'landing ' + jakarta.className}>
            <LandingHeader idioma={idioma} />
            <main className="error-404">
              <span className="error-404-codigo">404</span>
              <h1>{t('error404.h1')}</h1>
              <p>{t('error404.texto')}</p>
              <a className="btn btn-primary" href="/">{t('error404.volver')}</a>
            </main>
            <LandingFooter idioma={idioma} />
          </div>
        );
      })}
    </>
  );
}
