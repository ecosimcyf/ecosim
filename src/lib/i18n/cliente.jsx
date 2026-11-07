'use client';
// ============================================================
// Idioma en los componentes de navegador.
//
// <Idioma valor="pt"> (lo pone el Server Component de cada página) deja el
// idioma a mano de todo lo que va dentro; cada componente pide sus textos
// con useT(DICCIONARIO) — así cada zona solo trae al navegador los suyos.
// ============================================================
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { COOKIE_IDIOMA, IDIOMA_DEFECTO, LOCALE, crearT, idiomaValido } from './config';

const Contexto = createContext(IDIOMA_DEFECTO);
// Solo dentro de <IdiomaEnNavegador>: función para cambiar el idioma sin
// volver a pedir la página al servidor (ver SelectorIdioma).
const CambiarContexto = createContext(null);

export function Idioma({ valor, children }) {
  // <html lang> lo pone el layout con el idioma del visitante; en la vista
  // del estudiante y en el panel puede ser otro (el de la cuenta).
  useEffect(() => {
    document.documentElement.lang = LOCALE[valor] || valor;
  }, [valor]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

// Variante para páginas que se sirven desde la caché (la vista del
// estudiante): el servidor no puede leer la cookie del visitante, así que
// el idioma se decide AQUÍ, en el navegador — el que eligió con el selector
// o, si nunca eligió, el de la cuenta. Hasta saberlo se muestra "espera"
// (sin textos, para que no se vea un idioma y luego otro).
export function IdiomaEnNavegador({ porDefecto, espera = null, children }) {
  const [idioma, setIdioma] = useState(null);
  useEffect(() => {
    setIdioma(idiomaValido(leerCookieIdioma()) || idiomaValido(porDefecto) || IDIOMA_DEFECTO);
  }, [porDefecto]);
  useEffect(() => {
    if (idioma) document.documentElement.lang = LOCALE[idioma];
  }, [idioma]);
  if (!idioma) return espera;
  return (
    <CambiarContexto.Provider value={setIdioma}>
      <Contexto.Provider value={idioma}>{children}</Contexto.Provider>
    </CambiarContexto.Provider>
  );
}

export function useCambiarIdioma() {
  return useContext(CambiarContexto);
}

function leerCookieIdioma() {
  const par = document.cookie.split('; ').find((c) => c.startsWith(COOKIE_IDIOMA + '='));
  return par ? par.slice(COOKIE_IDIOMA.length + 1) : null;
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
