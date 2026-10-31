import { Suspense } from 'react';
import LoginForm from './LoginForm';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { PANEL } from '@/lib/i18n/textos/panel';
import SelectorIdioma from '@/lib/i18n/SelectorIdioma';

export async function generateMetadata() {
  const t = crearT(PANEL, await idiomaVisitante());
  return { title: t('meta.login'), robots: { index: false, follow: false } };
}

export default async function LoginPage() {
  const idioma = await idiomaVisitante();
  const t = crearT(PANEL, idioma);
  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">{t('bar.titulo')}</span>
        <SelectorIdioma idioma={idioma} etiqueta={t('bar.idioma')} titulo={t('bar.idioma')} />
      </div>
      <div className="admin-login">
        {/* useSearchParams (para el aviso de cuenta borrada) exige un
            límite de Suspense para no bloquear el pintado de toda la
            página. */}
        <Suspense>
          <LoginForm textos={t('login')} />
        </Suspense>
      </div>
    </div>
  );
}
