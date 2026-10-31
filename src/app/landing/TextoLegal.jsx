// Pinta un documento legal de src/lib/i18n/textos/legal.js (términos o
// privacidad) en el idioma del visitante, con la misma cabecera y pie de
// la landing.
import { Fragment } from 'react';
import LandingHeader from './LandingHeader';
import LandingFooter from './LandingFooter';
import { jakarta } from './fuente';
import { CORREO } from './contacto';
import { LEGAL } from '@/lib/i18n/textos/legal';

// **negrita**, `código` y {correo} dentro de un texto.
function Rico({ texto }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`|\{correo\})/g);
  return partes.map((p, i) => {
    if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>;
    if (p === '{correo}') return <a key={i} href={'mailto:' + CORREO}>{CORREO}</a>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

function Bloque({ b }) {
  if (typeof b === 'string') return <p><Rico texto={b} /></p>;
  return <ul>{b.ul.map((li, i) => <li key={i}><Rico texto={li} /></li>)}</ul>;
}

export default function TextoLegal({ idioma, documento }) {
  const textos = LEGAL[idioma] || LEGAL.es;
  const doc = textos[documento];
  return (
    <div className={'landing ' + jakarta.className}>
      <LandingHeader />
      <main className="legal-page">
        <h1>{doc.titulo}</h1>
        <p className="legal-fecha">{textos.actualizacion}: {doc.fecha}</p>
        {textos.aviso && <p className="legal-aviso">{textos.aviso}</p>}
        {doc.intro.map((b, i) => <Bloque key={i} b={b} />)}
        {doc.secciones.map((s) => (
          <Fragment key={s.h}>
            <h2>{s.h}</h2>
            {s.bloques.map((b, i) => <Bloque key={i} b={b} />)}
          </Fragment>
        ))}
      </main>
      <LandingFooter />
    </div>
  );
}
