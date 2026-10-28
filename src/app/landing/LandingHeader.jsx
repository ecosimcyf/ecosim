// Cabecera compartida por todas las páginas públicas livianas (landing,
// términos, privacidad, 404): mismo logo y mismos links en todas partes.
// Los enlaces a secciones van con "/#..." para que funcionen también
// desde términos, privacidad o la 404.
export default function LandingHeader() {
  return (
    <header className="landing-bar">
      <a className="landing-marca" href="/">ECOSIM</a>
      <nav className="landing-nav-links">
        <a className="landing-nav-seccion" href="/#como-funciona">Cómo funciona</a>
        <a className="landing-nav-seccion" href="/#planes">Planes</a>
        <a className="landing-nav-seccion" href="/#preguntas">Preguntas</a>
        <a className="landing-login" href="/admin/login">Iniciar sesión</a>
        <a className="landing-cta-nav" href="/#contacto">Hablar con un asesor</a>
      </nav>
    </header>
  );
}
