'use client';
// Aviso «Este enlace no está disponible» en el idioma del visitante (el que
// eligió con el selector o el de su navegador). Ver not-found.js.
import { useEffect, useState } from 'react';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, LOCALE, crearT, idiomaValido, idiomaDeNavegador } from '@/lib/i18n/config';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';

export default function NoDisponible() {
  const [idioma, setIdioma] = useState(IDIOMA_DEFECTO);
  useEffect(() => {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith(COOKIE_IDIOMA + '='))?.split('=')[1];
    const elegido = idiomaValido(cookie) || idiomaDeNavegador(navigator.languages?.join(',') || navigator.language) || IDIOMA_DEFECTO;
    setIdioma(elegido);
    document.documentElement.lang = LOCALE[elegido];
  }, []);
  return (
    <div className="espera">
      <div className="marca">ECOSIM</div>
      <div className="txt">{crearT(ESTUDIANTE, idioma)('noDisponible')}</div>
    </div>
  );
}
