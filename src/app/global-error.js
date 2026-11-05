'use client';
// Último recurso: falló el propio layout raíz. Reemplaza TODA la página,
// así que trae su <html> y sus estilos (ver src/lib/PantallaError.jsx).
import '@/app/globals.css';
import PantallaError from '@/lib/PantallaError';

export default function ErrorGlobal({ error, reset }) {
  return (
    <html lang="es">
      <body>
        <PantallaError error={error} reset={reset} origen="global" />
      </body>
    </html>
  );
}
