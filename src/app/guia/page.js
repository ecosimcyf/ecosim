// Guía de uso pública (/guia): paso a paso para el profesor (preparar los
// casos en el panel) y para el estudiante (practicar). Mismo estilo,
// cabecera y pie que la landing. Los textos, en los tres idiomas, están en
// src/lib/i18n/textos/guia.js.
//
// Las capturas de public/guia/ son de la app real (vista del estudiante).
// Si cambia la interfaz, hay que volver a tomarlas.
import { Fragment } from 'react';
import Image from 'next/image';
import LandingHeader from '../landing/LandingHeader';
import LandingFooter from '../landing/LandingFooter';
import { IconoWhatsApp } from '../landing/BotonWhatsApp';
import { jakarta } from '../landing/fuente';
import { whatsappUrl } from '../landing/contacto';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { GUIA } from '@/lib/i18n/textos/guia';

// Tamaño real de cada captura (para que next/image reserve el espacio).
const CAPTURAS = {
  codigo: { src: '/guia/codigo.webp', ancho: 780, alto: 1120, telefono: true },
  menu: { src: '/guia/menu.webp', ancho: 780, alto: 1120, telefono: true },
  caso: { src: '/guia/caso.webp', ancho: 2560, alto: 1440, telefono: false },
};

export async function generateMetadata() {
  const g = GUIA[await idiomaVisitante()] || GUIA.es;
  return { title: g.meta.titulo, description: g.meta.descripcion };
}

// **negrita** dentro de un texto.
function Rico({ texto }) {
  return texto.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>);
}

function Paso({ paso, n, g }) {
  const cap = paso.captura && CAPTURAS[paso.captura];
  return (
    <li className={'guia-paso' + (cap ? (cap.telefono ? ' con-telefono' : ' con-pantalla') : '')}>
      <span className="guia-paso-num" aria-hidden="true">{n}</span>
      <div className="guia-paso-cuerpo">
        <h3><span className="sr-only">{g.paso} {n}: </span>{paso.titulo}</h3>
        {paso.texto.map((t, i) => <p key={i}><Rico texto={t} /></p>)}
        {paso.tip && (
          <p className="guia-tip"><strong>{g.consejo}:</strong> <Rico texto={paso.tip} /></p>
        )}
      </div>
      {cap && (
        <figure className={'guia-captura' + (cap.telefono ? ' telefono' : '')}>
          <Image
            src={cap.src} width={cap.ancho} height={cap.alto} alt={g.capturas[paso.captura]}
            sizes={cap.telefono ? '240px' : '(max-width: 860px) 100vw, 860px'}
          />
        </figure>
      )}
    </li>
  );
}

function Seccion({ id, s, g }) {
  return (
    <section className="landing-section guia-seccion" id={id}>
      <div className="landing-section-head">
        <p className="landing-eyebrow">{s.eyebrow}</p>
        <h2>{s.titulo}</h2>
        <p className="landing-parrafo">{s.intro}</p>
      </div>
      <ol className="guia-pasos">
        {s.pasos.map((p, i) => <Paso key={p.titulo} paso={p} n={i + 1} g={g} />)}
      </ol>
      {s.cupo && <p className="guia-nota">{s.cupo}</p>}
    </section>
  );
}

export default async function Guia() {
  const g = GUIA[await idiomaVisitante()] || GUIA.es;
  return (
    <div className={'landing ' + jakarta.className}>
      <LandingHeader />
      <main className="guia">
        <section className="landing-hero guia-hero">
          <p className="landing-hero-badge">{g.eyebrow}</p>
          <h1>{g.titulo}</h1>
          <p className="landing-hero-frase">{g.intro}</p>
          <div className="landing-hero-ctas">
            <a className="landing-btn landing-btn-primary" href="#profesor">{g.irProfesor}</a>
            <a className="landing-btn landing-btn-outline" href="#estudiante">{g.irEstudiante}</a>
          </div>
        </section>

        <Seccion id="profesor" s={g.profesor} g={g} />
        <Seccion id="estudiante" s={g.estudiante} g={g} />

        <section className="landing-section" id="problemas">
          <div className="landing-section-head">
            <p className="landing-eyebrow">{g.problemas.eyebrow}</p>
            <h2>{g.problemas.titulo}</h2>
          </div>
          <div className="landing-faq">
            {g.problemas.lista.map((q) => (
              <details className="landing-faq-item" key={q.p}>
                <summary>{q.p}</summary>
                <p><Rico texto={q.r} /></p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing-banner">
          <h2>{g.ayuda.titulo}</h2>
          <p>{g.ayuda.texto}</p>
          <a className="landing-btn landing-btn-whatsapp" href={whatsappUrl(g.ayuda.mensaje)} target="_blank" rel="noopener">
            <IconoWhatsApp /> {g.ayuda.whatsapp}
          </a>
        </section>

        <p className="guia-arriba"><a href="#">{g.volverArriba} ↑</a></p>
      </main>
      <LandingFooter />
    </div>
  );
}
