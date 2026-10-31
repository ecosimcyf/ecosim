// Landing pública de EcoSim ("/"): qué es, cómo funciona, para quién es,
// cómo se arma un plan, preguntas frecuentes y cómo contactar a un asesor
// para abrir una cuenta. Server Component sin llamadas a Supabase (el
// simulador y los casos de cada cliente viven en /c/<slug>); se pinta en
// cada visita solo para salir en el idioma del visitante.
//
// Paleta e tipografía propias (claras), desligadas del tema oscuro/clínico
// del resto de la app — ver tokens --l-* al inicio del bloque LANDING en
// globals.css. Plus Jakarta Sans vía next/font (self-hosted, sin pedirla
// en runtime a Google).
//
// Datos de contacto e interruptores (demo pública, video) en
// landing/contacto.js. Los textos, en los tres idiomas, en
// src/lib/i18n/textos/landing.js.
import Image from 'next/image';
import FormularioContacto from './FormularioContacto';
import ScrollReveal from './landing/ScrollReveal';
import LandingHeader from './landing/LandingHeader';
import LandingFooter from './landing/LandingFooter';
import BotonWhatsApp, { IconoWhatsApp } from './landing/BotonWhatsApp';
import { jakarta } from './landing/fuente';
import { whatsappUrl, WHATSAPP_VISIBLE, CORREO, DEMO_PUBLICA, DEMO_VIDEO } from './landing/contacto';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LANDING } from '@/lib/i18n/textos/landing';

export async function generateMetadata() {
  const t = crearT(LANDING, await idiomaVisitante());
  return { title: t('meta.titulo'), description: t('meta.descripcion') };
}

// Íconos de las tarjetas, en el mismo orden que sus textos.
const ICONOS_FUNCIONES = [
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="8.5" strokeDasharray="2 3.2" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M10 13h5M10 16.5h5M10 9.5h2" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12a8 8 0 0 1 14-5.3L21 9" />
      <path d="M21 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-14 5.3L3 15" />
      <path d="M3 20v-5h5" />
    </svg>
  ),
];

const ICONOS_PUBLICOS = [
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
      <path d="M7 11.5V16c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4.5" />
      <path d="M21 9.5V14" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V9l8-5 8 5v11" />
      <path d="M10 20v-5h4v5" />
      <path d="M12 8.5v3M10.5 10h3" />
    </svg>
  ),
  (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="2.5" />
      <path d="M8 9h8M8 12.5h8M8 16h5" />
    </svg>
  ),
];

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function Home() {
  const idioma = await idiomaVisitante();
  const t = crearT(LANDING, idioma);
  const whatsapp = whatsappUrl(t('whatsapp.mensaje'));
  // Al formulario (componente de navegador) solo le van sus etiquetas: los
  // errores los traduce la acción del servidor.
  const { errores: _errores, campos: _campos, ...textosFormulario } = t('form');
  return (
    <div className={'landing ' + jakarta.className}>
      <ScrollReveal />

      <LandingHeader />

      <section className="landing-hero">
        <span className="landing-hero-badge">{t('hero.badge')}</span>
        <h1>{t('hero.tituloAntes')}<span>{t('hero.tituloResaltado')}</span>{t('hero.tituloDespues')}</h1>
        <p className="landing-hero-frase">{t('hero.frase')}</p>
        <div className="landing-hero-ctas">
          <a className="landing-btn landing-btn-primary" href="#contacto">{t('nav.asesor')}</a>
          {DEMO_PUBLICA ? (
            <a className="landing-btn landing-btn-outline" href="/c/demo" target="_blank" rel="noopener">{t('hero.probarDemo')}</a>
          ) : (
            <a className="landing-btn landing-btn-outline" href="#como-funciona">{t('hero.verComo')}</a>
          )}
        </div>
        <div className="landing-chips">
          {t('hero.chips').map((c) => (
            <span className="landing-chip" key={c}><IconoCheck />{c}</span>
          ))}
        </div>
      </section>

      <section className="landing-showcase" id="demo" data-reveal>
        <div className="landing-showcase-frame">
          <div className="landing-showcase-dots"><span /><span /><span /></div>
          {DEMO_VIDEO ? (
            <video
              src={DEMO_VIDEO} autoPlay muted loop playsInline preload="metadata"
              poster="/landing/demo-maniqui.png"
              aria-label={t('demo.altVideo')}
            />
          ) : (
            <Image
              src="/landing/demo-maniqui.png"
              width={800}
              height={455}
              alt={t('demo.altImagen')}
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </div>
        <div className="landing-showcase-texto">
          <h2>{t('demo.titulo')}</h2>
          <p>{t('demo.texto')}</p>
          <ul className="landing-showcase-lista">
            {t('demo.puntos').map((p) => (
              <li key={p}><IconoCheck />{p}</li>
            ))}
          </ul>
          {DEMO_PUBLICA && (
            <a className="landing-btn landing-btn-outline landing-showcase-cta" href="/c/demo" target="_blank" rel="noopener">
              {t('demo.probar')}
            </a>
          )}
        </div>
      </section>

      <section className="landing-section" id="como-funciona" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t('pasos.eyebrow')}</p>
          <h2>{t('pasos.titulo')}</h2>
        </div>
        <ol className="landing-pasos">
          {t('pasos.lista').map((paso, i) => (
            <li className="landing-paso" key={paso.titulo}>
              <span className="landing-paso-num" aria-hidden="true">{i + 1}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t('funciones.eyebrow')}</p>
          <h2>{t('funciones.titulo')}</h2>
        </div>
        <div className="landing-features">
          {t('funciones.lista').map((f, i) => (
            <div className="feature-card" key={f.titulo}>
              <div className="feature-card-icono">{ICONOS_FUNCIONES[i]}</div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t('publicos.eyebrow')}</p>
          <h2>{t('publicos.titulo')}</h2>
          <p className="landing-parrafo">{t('publicos.texto')}</p>
        </div>
        <div className="landing-features landing-features-3">
          {t('publicos.lista').map((f, i) => (
            <div className="feature-card" key={f.titulo}>
              <div className="feature-card-icono">{ICONOS_PUBLICOS[i]}</div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="planes" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t('plan.eyebrow')}</p>
          <h2>{t('plan.titulo')}</h2>
          <p className="landing-parrafo">{t('plan.texto')}</p>
        </div>
        <div className="landing-plan">
          {t('plan.lista').map((item) => (
            <div className="landing-plan-item" key={item.titulo}>
              <IconoCheck />
              <div>
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-banner" data-reveal>
        <h2>{t('banner.titulo')}</h2>
        <p>{t('banner.texto')}</p>
        <a className="landing-btn landing-btn-primary" href="#contacto">{t('nav.asesor')}</a>
      </section>

      <section className="landing-section" id="preguntas" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t('faq.eyebrow')}</p>
          <h2>{t('faq.titulo')}</h2>
        </div>
        <div className="landing-faq">
          {t('faq.lista').map((q) => (
            <details className="landing-faq-item" key={q.p}>
              <summary>{q.p}</summary>
              <p>
                {q.r}
                {q.privacidad && <> <a href="/privacidad">{t('faq.verPrivacidad')}</a>.</>}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-section" id="contacto" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">{t('contacto.eyebrow')}</p>
          <h2>{t('contacto.titulo')}</h2>
          <p className="landing-parrafo">{t('contacto.texto')}</p>
        </div>
        <div className="landing-contacto-directo">
          <a className="landing-btn landing-btn-whatsapp" href={whatsapp} target="_blank" rel="noopener">
            <IconoWhatsApp /> {t('whatsapp.escribenos')}
          </a>
          <span className="landing-contacto-alt">
            {WHATSAPP_VISIBLE} · <a href={'mailto:' + CORREO}>{CORREO}</a>
          </span>
          <span className="landing-contacto-o">{t('contacto.o')}</span>
        </div>
        <FormularioContacto textos={textosFormulario} />
      </section>

      <LandingFooter />
      <BotonWhatsApp />
    </div>
  );
}
