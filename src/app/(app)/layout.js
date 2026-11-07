// Layout raíz del panel (/admin): páginas dinámicas, en el idioma del
// visitante (ver src/app/base.js). La vista del estudiante tiene el suyo,
// estático: src/app/(estudiante)/layout.js.
import '@/app/globals.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import ReporteErrores from '@/lib/ReporteErrores';
import { firaCode, metadatosBase, viewportBase } from '@/app/base';
import { LOCALE } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';

export async function generateMetadata() {
  return metadatosBase(await idiomaVisitante());
}

export const viewport = viewportBase;

// <html lang> sale con el idioma del visitante; el panel lo corrige al de
// la cuenta si es otro (ver i18n/cliente.jsx).
export default async function RootLayout({ children }) {
  const idioma = await idiomaVisitante();
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
