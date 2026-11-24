'use client';
// Aviso «Este enlace no está disponible» en el idioma del visitante (el que
// eligió con el selector o el de su navegador). Ver not-found.js.
import { useEffect, useState } from 'react';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, LOCALE, crearT, idiomaValido, idiomaDeNavegador } from '@/lib/i18n/config';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';

export default function NoDisponible() {
  // null hasta saber el idioma: no se pinta texto antes, para que no se vea
  // un instante en español y luego en el idioma del visitante.
  const [idioma, setIdioma] = useState(null);
  useEffect(() => {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith(COOKIE_IDIOMA + '='))?.split('=')[1];
    const elegido = idiomaValido(cookie) || idiomaDeNavegador(navigator.languages?.join(',') || navigator.language) || IDIOMA_DEFECTO;
    setIdioma(elegido);
    document.documentElement.lang = LOCALE[elegido];
  }, []);
  return (
    <div className="espera" aria-busy={!idioma}>
      <div className="marca">ECOSIM</div>
      {idioma && <div className="txt" role="status">{crearT(ESTUDIANTE, idioma)('noDisponible')}</div>}
    </div>
  );
}
