'use client';
// Algo falló al pintar el panel: pantalla propia con «Reintentar».
import PantallaError from '@/lib/PantallaError';

export default function ErrorPanel({ error, reset }) {
  return <PantallaError error={error} reset={reset} origen="panel" />;
}
