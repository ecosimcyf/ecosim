'use client';
// Selector de idioma (ES · PT · EN). Por defecto guarda la elección en la
// cookie y vuelve a pintar la página en el servidor (router.refresh: no se
// pierde lo que había en pantalla). En el panel del cliente, "alCambiar"
// guarda además el idioma de la cuenta.
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { IDIOMAS, NOMBRES_IDIOMA } from './config';
import { guardarIdioma } from './cliente';

export default function SelectorIdioma({ idioma, etiqueta, titulo, alCambiar, className = '' }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [guardando, setGuardando] = useState(false);

  async function cambiar(nuevo) {
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

  return (
    <label className={'selector-idioma ' + className} title={titulo}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" />
      </svg>
      {/* Se ve solo el código ("PT"); el <select> real va encima,
          transparente, y abre la lista con los nombres completos. */}
      <span className="selector-idioma-codigo" aria-hidden="true">{idioma.toUpperCase()}</span>
      <svg className="selector-idioma-flecha" viewBox="0 0 12 12" width="9" height="9" aria-hidden="true">
        <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <select value={idioma} disabled={pendiente || guardando} onChange={(e) => cambiar(e.target.value)}
        aria-label={etiqueta}>
        {IDIOMAS.map((id) => (
          <option key={id} value={id} lang={id}>{NOMBRES_IDIOMA[id]}</option>
        ))}
      </select>
    </label>
  );
}
