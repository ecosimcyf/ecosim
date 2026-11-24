'use client';
// Año actual para el pie. Las páginas son estáticas (se generan al
// compilar): si el año se calculara en el servidor quedaría fijo hasta la
// siguiente compilación. Aquí se pone ya en el navegador.
import { useEffect, useState } from 'react';

export default function AnioActual() {
  const [anio, setAnio] = useState('');
  useEffect(() => { setAnio(' ' + new Date().getFullYear()); }, []);
  return anio;
}
