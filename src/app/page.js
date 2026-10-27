// Landing pública de EcoSim ("/"): qué es, qué hace, para quién es, y cómo
// contactar a un asesor para abrir una cuenta. Server Component ESTÁTICO —
// sin llamadas a Supabase: el simulador y los casos de cada cliente viven
// ahora en /c/<slug> (Tarea 5); esta página no conoce ninguna cuenta.
//
// Paleta e tipografía propias (claras), desligadas del tema oscuro/clínico
// del resto de la app — ver tokens --l-* al inicio del bloque LANDING en
// globals.css. Plus Jakarta Sans vía next/font (self-hosted, sin pedirla
// en runtime a Google).
import Image from 'next/image';
import { Plus_Jakarta_Sans } from 'next/font/google';
import FormularioContacto from './FormularioContacto';
import ScrollReveal from './landing/ScrollReveal';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});

const FUNCIONALIDADES = [
  {
    titulo: 'Maniquí interactivo',
    texto:
      'Un maniquí de perro o gato dibujado en pantalla, con puntos táctiles sobre cada zona de interés: el estudiante elige dónde apoyar el transductor, igual que lo haría sobre un paciente real.',
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
      'Cuando el profesor activa o desactiva un caso, el menú de los estudiantes se actualiza solo, de forma automática: nadie tiene que recargar la página.',
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

      <header className="landing-bar">
        <span className="landing-marca">ECOSIM</span>
        <nav className="landing-nav-links">
          <a className="landing-login" href="/admin/login">Iniciar sesión</a>
          <a className="landing-cta-nav" href="#contacto">Hablar con un asesor</a>
        </nav>
      </header>

      <section className="landing-hero">
        <span className="landing-hero-badge">ECOSIM · SIMULADOR DE ECOGRAFÍA</span>
        <h1>Tus estudiantes aprenden a <span>interpretar</span>, no a memorizar.</h1>
        <p className="landing-hero-frase">
          Un maniquí interactivo con casos reales de ecografía veterinaria, grabados en
          pacientes de verdad — para practicar antes de enfrentarse a uno.
        </p>
        <div className="landing-hero-ctas">
          <a className="landing-btn landing-btn-primary" href="#contacto">Hablar con un asesor</a>
          <a className="landing-btn landing-btn-outline" href="#demo">Ver cómo funciona</a>
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
          <Image
            src="/landing/demo-maniqui.jpg"
            width={800}
            height={500}
            alt="Maniquí interactivo de EcoSim con los puntos de ecografía sobre el cuerpo del paciente"
            style={{ width: '100%', height: 'auto' }}
          />
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
        </div>
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
          <h2>Clínicas, universidades y programas de formación</h2>
        </div>
        <p className="landing-parrafo">
          Para quienes quieren que sus estudiantes practiquen ecografía antes de enfrentarse
          a un paciente real. Cada cuenta tiene sus propios casos, sus propios videos y su
          propio enlace.
        </p>
      </section>

      <section className="landing-banner" data-reveal>
        <h2>¿Listo para llevarlo a tus estudiantes?</h2>
        <p>Hablemos de tu plan: casos precargados, límites de subida y el enlace propio de tu cuenta.</p>
        <a className="landing-btn landing-btn-primary" href="#contacto">Hablar con un asesor</a>
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
        <FormularioContacto />
      </section>

      <footer className="landing-footer">
        © {new Date().getFullYear()} EcoSim · <a href="/admin/login">Iniciar sesión</a>
      </footer>
    </div>
  );
}
