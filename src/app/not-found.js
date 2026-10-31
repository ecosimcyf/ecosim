import LandingHeader from './landing/LandingHeader';
import LandingFooter from './landing/LandingFooter';
import { jakarta } from './landing/fuente';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LANDING } from '@/lib/i18n/textos/landing';

export async function generateMetadata() {
  const t = crearT(LANDING, await idiomaVisitante());
  return { title: t('error404.titulo'), robots: { index: false, follow: false } };
}

export default async function NoEncontrado() {
  const t = crearT(LANDING, await idiomaVisitante());
  return (
    <div className={'landing ' + jakarta.className}>
      <LandingHeader />
      <main className="error-404">
        <span className="error-404-codigo">404</span>
        <h1>{t('error404.h1')}</h1>
        <p>{t('error404.texto')}</p>
        <a className="btn btn-primary" href="/">{t('error404.volver')}</a>
      </main>
      <LandingFooter />
    </div>
  );
}
