'use client';
// Selector de idioma (ES · PT · EN): un botón con el código y un menú
// propio debajo (no la lista nativa del navegador, que no se puede
// estilizar). Toma el aspecto de donde esté: oscuro como el simulador por
// defecto, claro como la landing con className="selector-idioma-claro".
//
// Por defecto guarda la elección en la cookie y vuelve a pintar la página
// en el servidor (router.refresh: no se pierde lo que había en pantalla).
// En el panel del cliente, "alCambiar" guarda además el idioma de la cuenta.
//
// Teclado: Enter/Espacio/↓ abre, ↑/↓ recorren, Enter elige, Esc cierra.
import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IDIOMAS, NOMBRES_IDIOMA } from './config';
import { guardarIdioma } from './cliente';

export default function SelectorIdioma({ idioma, etiqueta, titulo, alCambiar, className = '' }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(IDIOMAS.indexOf(idioma));
  const raiz = useRef(null);
  const boton = useRef(null);
  const opciones = useRef([]);
  const idMenu = useId();
  const ocupado = pendiente || guardando;

  // Cerrar al tocar fuera.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => { if (!raiz.current?.contains(e.target)) setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  // Al abrir, el foco va a la opción marcada.
  useEffect(() => {
    if (abierto) opciones.current[activo]?.focus();
  }, [abierto, activo]);

  function abrir() {
    setActivo(Math.max(0, IDIOMAS.indexOf(idioma)));
    setAbierto(true);
  }
  function cerrar(devolverFoco = true) {
    setAbierto(false);
    if (devolverFoco) boton.current?.focus();
  }

  async function elegir(nuevo) {
    cerrar();
    if (nuevo === idioma) return;
    if (alCambiar) {
      setGuardando(true);
      const ok = await alCambiar(nuevo);
      setGuardando(false);
      if (!ok) return;
    }
    guardarIdioma(nuevo);
    iniciar(() => router.refresh());
  }

  function teclaBoton(e) {
    if (['ArrowDown', 'ArrowUp'].includes(e.key)) { e.preventDefault(); abrir(); }
  }
  function teclaMenu(e) {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); cerrar(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((i) => (i + 1) % IDIOMAS.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((i) => (i - 1 + IDIOMAS.length) % IDIOMAS.length); }
    else if (e.key === 'Home') { e.preventDefault(); setActivo(0); }
    else if (e.key === 'End') { e.preventDefault(); setActivo(IDIOMAS.length - 1); }
    else if (e.key === 'Tab') cerrar(false);
  }

  return (
    <div ref={raiz} className={'selector-idioma ' + (abierto ? 'abierto ' : '') + className}>
      <button
        ref={boton} type="button" className="selector-idioma-boton"
        aria-haspopup="listbox" aria-expanded={abierto} aria-controls={idMenu}
        aria-label={etiqueta + ': ' + NOMBRES_IDIOMA[idioma]} title={titulo}
        // Mientras cambia de idioma no se desactiva (perdería el foco del
        // teclado): solo ignora los clics y avisa que está ocupado.
        aria-busy={ocupado} data-ocupado={ocupado || undefined}
        onClick={() => { if (!ocupado) (abierto ? cerrar() : abrir()); }} onKeyDown={teclaBoton}
      >
        <svg className="selector-idioma-globo" viewBox="0 0 24 24" width="15" height="15" fill="none"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18" />
          <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
        </svg>
        <span className="selector-idioma-codigo">{idioma.toUpperCase()}</span>
        <svg className="selector-idioma-flecha" viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {abierto && (
        <ul id={idMenu} className="selector-idioma-menu" role="listbox" aria-label={etiqueta} onKeyDown={teclaMenu}>
          {IDIOMAS.map((id, i) => {
            const elegido = id === idioma;
            return (
              <li
                key={id} ref={(el) => { opciones.current[i] = el; }}
                role="option" aria-selected={elegido} lang={id} tabIndex={i === activo ? 0 : -1}
                className={'selector-idioma-opcion' + (elegido ? ' elegido' : '')}
                onClick={() => elegir(id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); elegir(id); } }}
                onMouseEnter={() => setActivo(i)}
              >
                <span className="selector-idioma-sigla">{id.toUpperCase()}</span>
                <span className="selector-idioma-nombre">{NOMBRES_IDIOMA[id]}</span>
                <svg className="selector-idioma-check" viewBox="0 0 24 24" width="15" height="15" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
