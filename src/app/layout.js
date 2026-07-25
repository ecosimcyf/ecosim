import './globals.css';

export const metadata = {
  title: 'Caninos y felinos — Simulador de ecografía',
  description: 'Simulador de ecografía veterinaria para clase',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
