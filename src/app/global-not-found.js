// Página 404 de TODA la app (dirección que no existe). Como la app tiene
// dos layouts raíz (ver src/app/base.js), Next.js no sabría con cuál
// pintarla: esta página trae su propio <html> (opción globalNotFound en
// next.config.mjs).
import '@/app/globals.css';
import LandingHeader from '@/app/landing/LandingHeader';
import LandingFooter from '@/app/landing/LandingFooter';
import { jakarta } from '@/app/landing/fuente';
import { firaCode } from '@/app/base';
import { crearT, LOCALE } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LANDING } from '@/lib/i18n/textos/landing';

export async function generateMetadata() {
  const t = crearT(LANDING, await idiomaVisitante());
  return { title: t('error404.titulo'), robots: { index: false, follow: false } };
}

export default async function NoEncontrado() {
  const idioma = await idiomaVisitante();
  const t = crearT(LANDING, idioma);
  return (
    <html lang={LOCALE[idioma]} className={firaCode.variable}>
      <body>
        <div className={'landing ' + jakarta.className}>
          <LandingHeader idioma={idioma} />
          <main className="error-404">
            <span className="error-404-codigo">404</span>
            <h1>{t('error404.h1')}</h1>
            <p>{t('error404.texto')}</p>
            <a className="btn btn-primary" href="/">{t('error404.volver')}</a>
          </main>
          <LandingFooter idioma={idioma} />
        </div>
      </body>
    </html>
  );
}
