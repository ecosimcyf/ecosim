import LandingHeader from '../landing/LandingHeader';
import LandingFooter from '../landing/LandingFooter';
import { jakarta } from '../landing/fuente';

export const metadata = {
  title: 'Política de privacidad — EcoSim',
  description: 'Cómo EcoSim recopila, usa y protege los datos personales de quienes visitan el sitio y de las cuentas de clientes.',
};

export default function Privacidad() {
  return (
    <div className={'landing ' + jakarta.className}>
      <LandingHeader />
      <main className="legal-page">
        <h1>Política de privacidad</h1>
        <p className="legal-fecha">Última actualización: 28 de octubre de 2026</p>

        <p>
          Esta política explica qué datos personales recoge EcoSim, para qué
          los usa y qué derechos tienes sobre ellos, de acuerdo con la
          normativa de protección de datos vigente en Colombia (Ley 1581 de
          2012 y sus decretos reglamentarios).
        </p>

        <h2>1. Responsable del tratamiento</h2>
        <p>
          Pablo Suaza, persona natural, domiciliado en Colombia, correo de
          contacto <a href="mailto:pablosuaza4@gmail.com">pablosuaza4@gmail.com</a>.
        </p>

        <h2>2. Qué datos recogemos</h2>
        <p>Depende de cómo uses EcoSim:</p>
        <ul>
          <li><strong>Si escribes el formulario de contacto de la página principal:</strong> nombre, clínica o institución, correo, teléfono (opcional) y el mensaje que escribas.</li>
          <li><strong>Si eres administrador de una cuenta cliente:</strong> tu correo y contraseña (guardada de forma cifrada, nunca en texto plano), para darte acceso al panel.</li>
          <li><strong>Si eres estudiante y practicas un caso por el enlace de tu institución:</strong> ningún dato personal. No pedimos usuario, no usamos cookies ni guardamos nada en tu navegador — lo verificamos directamente y no se guarda ningún identificador tuyo.</li>
        </ul>

        <h2>3. Para qué usamos tus datos</h2>
        <ul>
          <li>Responder a tu solicitud de contacto y, si se concreta, gestionar la cuenta de tu institución.</li>
          <li>Darte acceso al panel de administración si eres cliente.</li>
          <li>Dar soporte cuando lo necesites.</li>
        </ul>
        <p>No vendemos ni compartimos tus datos con terceros para fines publicitarios.</p>

        <h2>4. Con quién se comparten</h2>
        <p>
          Los datos se alojan en la infraestructura de nuestros proveedores
          de tecnología, que actúan como encargados del tratamiento (no usan
          tus datos para fines propios):
        </p>
        <ul>
          <li><strong>Supabase</strong> — base de datos, autenticación y almacenamiento de archivos.</li>
          <li><strong>Vercel</strong> — alojamiento del sitio web.</li>
        </ul>

        <h2>5. Cookies</h2>
        <p>
          La parte del sitio que usan los estudiantes no utiliza cookies ni
          almacenamiento alguno en el navegador. El panel de administración sí
          usa una cookie técnica, estrictamente necesaria para mantener la
          sesión iniciada — sin ella no podrías permanecer conectado. Esa
          cookie no se usa para rastrearte ni con fines publicitarios.
        </p>
        <p>
          Usamos además Vercel Analytics y Speed Insights para entender el
          uso general del sitio (qué páginas se visitan, tiempos de carga).
          Según la documentación de Vercel, estas herramientas no usan
          cookies y los datos que recogen son anónimos: no identifican a
          ninguna persona ni permiten reconstruir su navegación.
        </p>

        <h2>6. Tus derechos</h2>
        <p>
          Si tus datos están en nuestras bases (por ejemplo, porque
          escribiste el formulario de contacto o administras una cuenta),
          puedes en cualquier momento:
        </p>
        <ul>
          <li>Conocer qué datos tuyos tenemos.</li>
          <li>Pedir que los actualicemos o corrijamos.</li>
          <li>Pedir que los eliminemos.</li>
          <li>Revocar la autorización para seguir tratándolos.</li>
        </ul>
        <p>
          Para ejercer cualquiera de estos derechos, escribe a{' '}
          <a href="mailto:pablosuaza4@gmail.com">pablosuaza4@gmail.com</a>.
          Responderemos en los plazos que establece la ley.
        </p>

        <h2>7. Seguridad</h2>
        <p>
          Protegemos tus datos con medidas razonables: las contraseñas se
          guardan cifradas, el acceso de administrador requiere inicio de
          sesión, y las escrituras a la base de datos solo las hace nuestro
          servidor, nunca el navegador directamente.
        </p>

        <h2>8. Cambios a esta política</h2>
        <p>
          Si hacemos cambios importantes a esta política, lo avisaremos a los
          clientes activos por correo.
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
