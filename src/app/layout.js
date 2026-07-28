import './globals.css';

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
  themeColor: '#04060a',
  // Que la página ocupe también la zona de la muesca (notch) del móvil.
  viewportFit: 'cover',
  initialScale: 1,
  // NO bloqueamos el zoom: quien necesite ampliar, puede. El zoom accidental
  // por doble toque se evita desde el CSS (touch-action: manipulation).
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
