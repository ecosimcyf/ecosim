'use client';
// Algo falló al pintar una página pública: pantalla propia con
// «Reintentar», con el estilo claro de la landing.
import PantallaError from '@/lib/PantallaError';

export default function ErrorPublico({ error, reset }) {
  return <div className="landing"><PantallaError error={error} reset={reset} origen="publico" estilo="claro" /></div>;
}
