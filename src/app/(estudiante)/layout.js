// Layout raíz de la vista del estudiante (/c/...). ESTÁTICO a propósito:
// así la página de cada cuenta se puede servir desde la caché del CDN (ver
// c/[slug]/page.js). Nada aquí puede leer cookies ni cabeceras. El idioma
// real lo pone el navegador (IdiomaEnNavegador, en src/lib/i18n/cliente.jsx).
import '@/app/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ReporteErrores from '@/lib/ReporteErrores';
import { firaCode, metadatosBase, viewportBase } from '@/app/base';
import { IDIOMA_DEFECTO, LOCALE } from '@/lib/i18n/config';

export const metadata = metadatosBase(IDIOMA_DEFECTO);
export const viewport = viewportBase;

export default function LayoutEstudiante({ children }) {
  return (
    <html lang={LOCALE[IDIOMA_DEFECTO]} className={firaCode.variable}>
      <body>
        {children}
        <ReporteErrores />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
