'use client';
// Algo falló al pintar la vista del estudiante: pantalla propia con
// «Reintentar» (ver src/lib/PantallaError.jsx).
import PantallaError from '@/lib/PantallaError';

export default function ErrorEstudiante({ error, reset }) {
  return <PantallaError error={error} reset={reset} origen="estudiante" estudiante />;
}
