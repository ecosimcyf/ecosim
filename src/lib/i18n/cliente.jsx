'use client';
// ============================================================
// Idioma en los componentes de navegador.
//
// <Idioma valor="pt"> (lo pone el Server Component de cada página) deja el
// idioma a mano de todo lo que va dentro; cada componente pide sus textos
// con useT(DICCIONARIO) — así cada zona solo trae al navegador los suyos.
// ============================================================
import { createContext, useContext, useEffect, useMemo } from 'react';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, LOCALE, crearT } from './config';

const Contexto = createContext(IDIOMA_DEFECTO);

export function Idioma({ valor, children }) {
  // <html lang> lo pone el layout con el idioma del visitante; en la vista
  // del estudiante y en el panel puede ser otro (el de la cuenta).
  useEffect(() => {
    document.documentElement.lang = LOCALE[valor] || valor;
  }, [valor]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useIdioma() {
  return useContext(Contexto);
}

export function useT(diccionarios) {
  const idioma = useContext(Contexto);
  return useMemo(() => crearT(diccionarios, idioma), [diccionarios, idioma]);
}

// Recuerda el idioma elegido por un año (solo esa preferencia: ningún
// identificador; ver la política de privacidad).
export function guardarIdioma(idioma) {
  document.cookie = COOKIE_IDIOMA + '=' + idioma + '; path=/; max-age=31536000; samesite=lax';
}
