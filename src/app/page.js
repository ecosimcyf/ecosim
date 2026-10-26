// Landing pública de EcoSim ("/"): qué es, qué hace, para quién es, y cómo
// contactar a un asesor para abrir una cuenta. Server Component ESTÁTICO —
// sin llamadas a Supabase: el simulador y los casos de cada cliente viven
// ahora en /c/<slug> (Tarea 5); esta página no conoce ninguna cuenta.
import FormularioContacto from './FormularioContacto';

const FUNCIONALIDADES = [
  {
    titulo: 'Maniquí interactivo',
    texto:
      'Un maniquí de perro o gato dibujado en pantalla, con puntos táctiles sobre cada zona de interés: el estudiante elige dónde apoyar el transductor, igual que lo haría sobre un paciente real.',
  },
  {
    titulo: 'Casos clínicos reales',
    texto:
      'Cada caso trae su propia descripción y sus propios videos de ecografía, grabados sobre pacientes reales. El diagnóstico nunca se muestra: el estudiante tiene que llegar a él por su cuenta.',
  },
  {
    titulo: 'Varios casos a la vez',
    texto:
      'El profesor puede dejar activos varios casos al mismo tiempo. Los estudiantes ven un menú y eligen cuál quieren practicar.',
  },
  {
    titulo: 'Siempre al día',
    texto:
      'Cuando el profesor activa o desactiva un caso, el menú de los estudiantes se actualiza solo, de forma automática: nadie tiene que recargar la página.',
  },
];

export default function Home() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="landing-marca">ECOSIM</span>
        <a className="landing-login" href="/admin/login">Iniciar sesión</a>
      </header>

      <section className="landing-hero">
        <h1>EcoSim</h1>
        <p className="landing-hero-frase">
          El simulador de ecografía donde tus estudiantes de veterinaria aprenden a interpretar, no a memorizar.
        </p>
      </section>

      <section className="landing-section">
        <h2>Qué hace</h2>
        <div className="landing-features">
          {FUNCIONALIDADES.map((f) => (
            <div className="feature-card" key={f.titulo}>
              <h3>{f.titulo}</h3>
              <p>{f.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>Para quién es</h2>
        <p className="landing-parrafo">
          Clínicas veterinarias, universidades y programas de formación que quieren que sus
          estudiantes practiquen ecografía antes de enfrentarse a un paciente real. Cada cuenta
          tiene sus propios casos, sus propios videos y su propio enlace.
        </p>
      </section>

      <section className="landing-section">
        <h2>Hablemos de tu cuenta</h2>
        <p className="landing-parrafo">
          Las cuentas no se crean solas: un asesor conversa contigo para armar el plan que le
          queda bien a tu grupo. Cuéntanos quién eres y te contactamos.
        </p>
        <FormularioContacto />
      </section>
    </div>
  );
}
