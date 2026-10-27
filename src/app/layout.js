import './globals.css';
import { Fira_Code } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';

// Monoespaciada propia (self-hosted, sin pedirla a Google en runtime) en
// vez de Consolas — que en Mac/Linux ni siquiera existe y cae a Courier
// New. Se expone como variable CSS (--font-mono, ver globals.css) en vez
// de className directo en <body>, así no pisa el font-family propio de la
// landing (Plus Jakarta Sans, en src/app/page.js).
const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata = {
  title: 'Caninos y felinos — Simulador de ecografía',
  description: 'Simulador de ecografía veterinaria para clase',
  // Permite añadirla a la pantalla de inicio del iPhone y abrirla como app.
  appleWebApp: {
    capable: true,
    title: 'EcoSim',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport = {
  themeColor: '#05070c',
  // Que la página ocupe también la zona de la muesca (notch) del móvil.
  viewportFit: 'cover',
  initialScale: 1,
  // NO bloqueamos el zoom: quien necesite ampliar, puede. El zoom accidental
  // por doble toque se evita desde el CSS (touch-action: manipulation).
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={firaCode.variable}>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
