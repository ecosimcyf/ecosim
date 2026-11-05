'use client';
// Muestra la versión de la página 404 en el idioma del visitante (el que
// eligió con el selector o, si nunca eligió, el de su navegador).
import { useEffect } from 'react';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, LOCALE, idiomaValido, idiomaDeNavegador } from '@/lib/i18n/config';

export default function ElegirIdioma404() {
  useEffect(() => {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith(COOKIE_IDIOMA + '='))?.split('=')[1];
    const idioma = idiomaValido(cookie) || idiomaDeNavegador(navigator.languages?.join(',') || navigator.language) || IDIOMA_DEFECTO;
    document.querySelectorAll('[data-idioma-404]').forEach((el) => { el.hidden = el.dataset.idioma404 !== idioma; });
    document.documentElement.lang = LOCALE[idioma];
  }, []);
  return null;
}
