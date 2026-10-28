import LandingHeader from '../landing/LandingHeader';
import LandingFooter from '../landing/LandingFooter';
import { jakarta } from '../landing/fuente';

export const metadata = {
  title: 'Términos y condiciones — EcoSim',
  description: 'Condiciones de uso del servicio EcoSim, simulador de ecografía veterinaria para instituciones educativas y clínicas.',
};

export default function Terminos() {
  return (
    <div className={'landing ' + jakarta.className}>
      <LandingHeader />
      <main className="legal-page">
        <h1>Términos y condiciones</h1>
        <p className="legal-fecha">Última actualización: 28 de octubre de 2026</p>

        <p>
          Estos términos regulan el uso de EcoSim, un simulador web de ecografía
          veterinaria dirigido a clínicas e instituciones educativas (en
          adelante, el &ldquo;cliente&rdquo;). El servicio es prestado por Pablo
          Suaza, persona natural, con domicilio en Colombia (en adelante,
          &ldquo;EcoSim&rdquo;). Al contratar o usar el servicio, el cliente acepta
          estos términos.
        </p>

        <h2>1. Qué es el servicio</h2>
        <p>
          EcoSim es una plataforma web que permite a una institución cargar
          casos clínicos (videos de ecografía veterinaria asociados a puntos
          de un maniquí de perro o gato) para que sus estudiantes practiquen
          la interpretación de ecografías. Los estudiantes acceden mediante un
          enlace propio de cada cuenta, sin necesidad de crear usuario ni
          contraseña.
        </p>

        <h2>2. Contratación</h2>
        <p>
          Por ahora las cuentas no se crean de forma automática: se habilitan
          después de que un asesor de EcoSim conversa con el interesado y
          acuerdan el plan (cupo de casos y de almacenamiento). EcoSim puede
          ofrecer otras formas de contratación en el futuro, lo que no
          modifica lo ya acordado con clientes existentes.
        </p>

        <h2>3. Cuenta y acceso de administrador</h2>
        <ul>
          <li>El cliente recibe un usuario y contraseña para administrar sus propios casos, videos y los puntos del maniquí de su cuenta.</li>
          <li>El cliente es responsable de mantener esas credenciales en secreto y de todo lo que ocurra con su cuenta mientras estén activas.</li>
          <li>El enlace que ven los estudiantes (<code>/c/su-cuenta</code>) no pide usuario ni contraseña: cualquier persona con el enlace puede practicar los casos activos. El cliente decide a quién se lo comparte.</li>
        </ul>

        <h2>4. Contenido que el cliente carga</h2>
        <p>
          Los videos y la información de cada caso son responsabilidad del
          cliente: debe tener derecho a usarlos y a mostrarlos a sus
          estudiantes. EcoSim solo los aloja para prestar el servicio y no los
          usa con otro fin. El cliente puede borrar sus propios casos y
          videos cuando quiera desde el panel de administración.
        </p>

        <h2>5. Cupos y uso aceptable</h2>
        <p>
          Cada cuenta tiene un cupo de casos propios y de almacenamiento de
          video, acordado al contratar. EcoSim puede avisar y pausar la carga
          de contenido nuevo si se supera el cupo, sin afectar los casos ya
          activos. El cliente se compromete a no usar la plataforma para
          fines distintos a la enseñanza, ni a intentar vulnerar su
          seguridad.
        </p>

        <h2>6. Disponibilidad del servicio</h2>
        <p>
          EcoSim hace un esfuerzo razonable para mantener el servicio
          disponible, pero no garantiza que esté libre de interrupciones o
          errores. El servicio se presta &ldquo;tal cual&rdquo;, apoyado en
          infraestructura de terceros (Supabase para base de datos y
          almacenamiento, Vercel para el alojamiento web).
        </p>

        <h2>7. Propiedad intelectual</h2>
        <p>
          El software, diseño y funcionamiento de EcoSim son de Pablo Suaza.
          El contenido que cada cliente carga (sus videos y casos) sigue
          siendo de su propiedad; EcoSim no reclama derechos sobre él.
        </p>

        <h2>8. Terminación</h2>
        <p>
          El cliente puede dejar de usar el servicio cuando quiera. Si una
          cuenta se cancela, EcoSim puede eliminar su contenido (casos y
          videos) después de un tiempo razonable de aviso. EcoSim puede
          suspender una cuenta que incumpla estos términos.
        </p>

        <h2>9. Cambios a estos términos</h2>
        <p>
          EcoSim puede actualizar estos términos; los cambios importantes se
          avisan a los clientes activos por correo. Seguir usando el
          servicio después de un cambio implica aceptarlo.
        </p>

        <h2>10. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de Colombia.
        </p>

        <h2>11. Contacto</h2>
        <p>
          Para cualquier duda sobre estos términos, escribe a{' '}
          <a href="mailto:pablosuaza4@gmail.com">pablosuaza4@gmail.com</a>.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
