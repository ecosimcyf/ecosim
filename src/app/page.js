// Landing pública de EcoSim ("/"): qué es, cómo funciona, para quién es,
// cómo se arma un plan, preguntas frecuentes y cómo contactar a un asesor
// para abrir una cuenta. Server Component ESTÁTICO — sin llamadas a
// Supabase: el simulador y los casos de cada cliente viven en /c/<slug>.
//
// Paleta e tipografía propias (claras), desligadas del tema oscuro/clínico
// del resto de la app — ver tokens --l-* al inicio del bloque LANDING en
// globals.css. Plus Jakarta Sans vía next/font (self-hosted, sin pedirla
// en runtime a Google).
//
// Datos de contacto e interruptores (demo pública, video) en
// landing/contacto.js.
import Image from 'next/image';
import FormularioContacto from './FormularioContacto';
import ScrollReveal from './landing/ScrollReveal';
import LandingHeader from './landing/LandingHeader';
import LandingFooter from './landing/LandingFooter';
import BotonWhatsApp, { IconoWhatsApp } from './landing/BotonWhatsApp';
import { jakarta } from './landing/fuente';
import { WHATSAPP_URL, WHATSAPP_VISIBLE, CORREO, DEMO_PUBLICA, DEMO_VIDEO } from './landing/contacto';

export const metadata = {
  title: 'EcoSim — Simulador de ecografía veterinaria para enseñar sin depender de pacientes',
  description:
    'Tus estudiantes practican ecografía en un maniquí interactivo con casos reales grabados en pacientes de verdad. Cada cuenta, sus propios casos — funciona en cualquier dispositivo, sin instalar nada.',
};

const PASOS = [
  {
    titulo: 'Cargas tus casos',
    texto: 'Desde tu panel creas cada caso, le escribes el motivo de consulta y asignas un video de ecografía a cada punto del maniquí. También podemos dejarte casos precargados.',
  },
  {
    titulo: 'Compartes un enlace',
    texto: 'Tu cuenta tiene su propio enlace. Se lo pasas a tus estudiantes: no necesitan instalar nada ni crear usuario.',
  },
  {
    titulo: 'Tus estudiantes practican',
    texto: 'Eligen un caso, apoyan el transductor en el maniquí y ven la ecografía al instante, desde el celular, la tablet o el computador.',
  },
];

const FUNCIONALIDADES = [
  {
    titulo: 'Maniquí interactivo',
    texto:
      'Un maniquí de perro o gato en pantalla, visto por debajo y por ambos lados, con puntos táctiles sobre cada zona de interés: el estudiante elige dónde apoyar el transductor, igual que lo haría sobre un paciente real.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <circle cx="12" cy="12" r="8.5" strokeDasharray="2 3.2" />
      </svg>
    ),
  },
  {
    titulo: 'Casos clínicos reales',
    texto:
      'Cada caso trae su propia descripción y sus propios videos de ecografía, grabados sobre pacientes reales. El diagnóstico nunca se muestra: el estudiante tiene que llegar a él por su cuenta.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3h7l4 4v14H7z" />
        <path d="M14 3v4h4" />
        <path d="M10 13h5M10 16.5h5M10 9.5h2" />
      </svg>
    ),
  },
  {
    titulo: 'Varios casos a la vez',
    texto:
      'El profesor puede dejar activos varios casos al mismo tiempo. Los estudiantes ven un menú y eligen cuál quieren practicar.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    titulo: 'Siempre al día',
    texto:
      'Cuando el profesor activa o desactiva un caso, el menú de los estudiantes se actualiza solo en unos segundos: nadie tiene que recargar la página.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12a8 8 0 0 1 14-5.3L21 9" />
        <path d="M21 4v5h-5" />
        <path d="M20 12a8 8 0 0 1-14 5.3L3 15" />
        <path d="M3 20v-5h5" />
      </svg>
    ),
  },
];

const PUBLICOS = [
  {
    titulo: 'Universidades',
    texto: 'Para que toda la cohorte practique la interpretación antes de las rotaciones, con los mismos casos y al ritmo de cada uno.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5 12 5l9 4.5-9 4.5z" />
        <path d="M7 11.5V16c0 1.2 2.2 2.5 5 2.5s5-1.3 5-2.5v-4.5" />
        <path d="M21 9.5V14" />
      </svg>
    ),
  },
  {
    titulo: 'Clínicas veterinarias',
    texto: 'Para formar al equipo nuevo con los casos que ustedes mismos atienden, sin ocupar el ecógrafo ni molestar a un paciente.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M10 20v-5h4v5" />
        <path d="M12 8.5v3M10.5 10h3" />
      </svg>
    ),
  },
  {
    titulo: 'Programas de formación',
    texto: 'Técnicos, diplomados y cursos de educación continua: casos listos para cada módulo, que se activan cuando toca verlos.',
    icono: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8 9h8M8 12.5h8M8 16h5" />
      </svg>
    ),
  },
];

const PLAN = [
  {
    titulo: 'Casos propios',
    texto: 'Cuántos casos puede tener tu cuenta, para que crees los tuyos desde el panel.',
  },
  {
    titulo: 'Almacenamiento de video',
    texto: 'El espacio para los videos de tus casos. Cada video dura hasta 30 segundos.',
  },
  {
    titulo: 'Casos precargados (opcional)',
    texto: 'Si quieres empezar ya, te dejamos casos listos en tu cuenta para que solo tengas que activarlos.',
  },
];

const PREGUNTAS = [
  {
    p: '¿Qué necesitan mis estudiantes para usarlo?',
    r: 'Solo el enlace de tu cuenta y un navegador: funciona en celular, tablet o computador. No instalan nada ni crean usuario ni contraseña.',
  },
  {
    p: '¿Necesita internet?',
    r: 'Sí. Al entrar a un caso, sus videos se descargan una sola vez; a partir de ahí responden al instante, aunque la conexión del salón no sea la mejor.',
  },
  {
    p: '¿Puedo subir mis propios videos?',
    r: 'Sí, desde tu panel, con los videos de tu ecógrafo (hasta 30 segundos cada uno). Si el formato no se puede ver en el navegador —pasa con muchos ecógrafos—, el panel lo convierte solo antes de subirlo.',
  },
  {
    p: '¿Se le muestra el diagnóstico al estudiante?',
    r: 'No. El estudiante solo ve el maniquí y los videos, nunca el nombre de la estructura ni el diagnóstico. Tú decides si cada caso lleva una descripción previa (motivo de consulta, síntomas).',
  },
  {
    p: '¿Cuántos estudiantes pueden usar el mismo enlace?',
    r: 'Todos los de tu grupo usan el mismo enlace, cada uno desde su propio dispositivo. No tienes que crear un usuario por estudiante.',
  },
  {
    p: '¿Cuánto cuesta?',
    r: 'Depende del plan: cuántos casos propios necesitas, cuánto almacenamiento de video y si quieres casos precargados. Escríbenos y un asesor te arma una propuesta para tu grupo.',
  },
  {
    p: '¿Qué pasa con mis videos y mis datos?',
    r: 'Tus casos y videos son tuyos: solo los usamos para prestarte el servicio y puedes borrarlos cuando quieras desde el panel.',
    enlace: { href: '/privacidad', texto: 'Ver la política de privacidad' },
  },
  {
    p: '¿Cómo empiezo?',
    r: 'Escríbenos por el formulario o por WhatsApp. Un asesor conversa contigo, crea tu cuenta y te entrega el acceso a tu panel y el enlace para tus estudiantes.',
  },
];

const CHIPS = [
  'Cada cuenta, sus propios casos',
  'Funciona en cualquier dispositivo',
  'Sin instalar nada',
];

const PUNTOS_DEMO = [
  'El estudiante elige dónde apoyar el transductor, igual que con un paciente real.',
  'Mantiene presionado un punto y el video de ecografía se reproduce al instante — ya está precargado.',
  'El diagnóstico nunca se muestra: tiene que llegar a él por su cuenta, como en la clínica.',
];

function IconoCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className={'landing ' + jakarta.className}>
      <ScrollReveal />

      <LandingHeader />

      <section className="landing-hero">
        <span className="landing-hero-badge">ECOSIM · SIMULADOR DE ECOGRAFÍA</span>
        <h1>Tus estudiantes aprenden a <span>interpretar</span>, no a memorizar.</h1>
        <p className="landing-hero-frase">
          Un maniquí interactivo con casos reales de ecografía veterinaria, grabados en
          pacientes de verdad — para practicar antes de enfrentarse a uno.
        </p>
        <div className="landing-hero-ctas">
          <a className="landing-btn landing-btn-primary" href="#contacto">Hablar con un asesor</a>
          {DEMO_PUBLICA ? (
            <a className="landing-btn landing-btn-outline" href="/c/demo" target="_blank" rel="noopener">Probar la demo</a>
          ) : (
            <a className="landing-btn landing-btn-outline" href="#como-funciona">Ver cómo funciona</a>
          )}
        </div>
        <div className="landing-chips">
          {CHIPS.map((c) => (
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
              aria-label="EcoSim en uso: al tocar un punto del maniquí aparece la ecografía"
            />
          ) : (
            <Image
              src="/landing/demo-maniqui.png"
              width={800}
              height={455}
              alt="Maniquí interactivo de EcoSim con los puntos de ecografía sobre el cuerpo del paciente"
              style={{ width: '100%', height: 'auto' }}
            />
          )}
        </div>
        <div className="landing-showcase-texto">
          <h2>Así lo ven tus estudiantes</h2>
          <p>
            Nada de menús complicados: un maniquí, unos puntos, y el video correcto aparece
            al instante.
          </p>
          <ul className="landing-showcase-lista">
            {PUNTOS_DEMO.map((t) => (
              <li key={t}><IconoCheck />{t}</li>
            ))}
          </ul>
          {DEMO_PUBLICA && (
            <a className="landing-btn landing-btn-outline landing-showcase-cta" href="/c/demo" target="_blank" rel="noopener">
              Probar la demo →
            </a>
          )}
        </div>
      </section>

      <section className="landing-section" id="como-funciona" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Cómo funciona</p>
          <h2>En clase en tres pasos</h2>
        </div>
        <ol className="landing-pasos">
          {PASOS.map((paso, i) => (
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
          <p className="landing-eyebrow">Qué hace</p>
          <h2>Todo lo que necesita una clase de ecografía</h2>
        </div>
        <div className="landing-features">
          {FUNCIONALIDADES.map((f) => (
            <div className="feature-card" key={f.titulo}>
              <div className="feature-card-icono">{f.icono}</div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Para quién es</p>
          <h2>Para quien enseña ecografía veterinaria</h2>
          <p className="landing-parrafo">
            Cada cuenta tiene sus propios casos, sus propios videos y su propio enlace.
          </p>
        </div>
        <div className="landing-features landing-features-3">
          {PUBLICOS.map((f) => (
            <div className="feature-card" key={f.titulo}>
              <div className="feature-card-icono">{f.icono}</div>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="planes" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Planes</p>
          <h2>Un plan a la medida de tu grupo</h2>
          <p className="landing-parrafo">
            El plan se arma con lo que tu grupo necesita. Un asesor te propone el que
            mejor le queda.
          </p>
        </div>
        <div className="landing-plan">
          {PLAN.map((item) => (
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
        <h2>¿Listo para llevarlo a tus estudiantes?</h2>
        <p>Hablemos de tu plan: casos precargados, almacenamiento y el enlace propio de tu cuenta.</p>
        <a className="landing-btn landing-btn-primary" href="#contacto">Hablar con un asesor</a>
      </section>

      <section className="landing-section" id="preguntas" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Preguntas frecuentes</p>
          <h2>Lo que suelen preguntarnos</h2>
        </div>
        <div className="landing-faq">
          {PREGUNTAS.map((q) => (
            <details className="landing-faq-item" key={q.p}>
              <summary>{q.p}</summary>
              <p>
                {q.r}
                {q.enlace && <> <a href={q.enlace.href}>{q.enlace.texto}</a>.</>}
              </p>
            </details>
          ))}
        </div>
      </section>

      <section className="landing-section" id="contacto" data-reveal>
        <div className="landing-section-head">
          <p className="landing-eyebrow">Contacto</p>
          <h2>Hablemos de tu cuenta</h2>
          <p className="landing-parrafo">
            Las cuentas no se crean solas: un asesor conversa contigo para armar el plan que
            le queda bien a tu grupo. Cuéntanos quién eres y te contactamos.
          </p>
        </div>
        <div className="landing-contacto-directo">
          <a className="landing-btn landing-btn-whatsapp" href={WHATSAPP_URL} target="_blank" rel="noopener">
            <IconoWhatsApp /> Escríbenos por WhatsApp
          </a>
          <span className="landing-contacto-alt">
            {WHATSAPP_VISIBLE} · <a href={'mailto:' + CORREO}>{CORREO}</a>
          </span>
          <span className="landing-contacto-o">o déjanos tus datos:</span>
        </div>
        <FormularioContacto />
      </section>

      <LandingFooter />
      <BotonWhatsApp />
    </div>
  );
}
