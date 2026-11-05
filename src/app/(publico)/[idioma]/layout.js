// Layout raíz de las páginas públicas (landing, guía, términos,
// privacidad): una versión estática por idioma (ver
// src/lib/i18n/publico.js). Nada aquí puede leer cookies ni cabeceras, o
// la página dejaría de ser estática.
import '@/app/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ReporteErrores from '@/lib/ReporteErrores';
import { firaCode, metadatosBase, viewportBase } from '@/app/base';
import { LOCALE } from '@/lib/i18n/config';
import { idiomaDeParams, parametrosIdioma } from '@/lib/i18n/publico';

// /es, /pt y /en se generan al compilar; cualquier otro primer tramo da 404
// (ver idiomaONoEncontrado en src/lib/i18n/publico-servidor.js).
export function generateStaticParams() {
  return parametrosIdioma();
}

export async function generateMetadata({ params }) {
  return metadatosBase(await idiomaDeParams(params));
}

export const viewport = viewportBase;

export default async function LayoutPublico({ children, params }) {
  const idioma = await idiomaDeParams(params);
  return (
    <html lang={LOCALE[idioma]} className={firaCode.variable}>
      <body>
        {children}
        <ReporteErrores />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
