// Cabecera compartida por todas las páginas públicas livianas (landing,
// términos, privacidad, 404): mismo logo y mismos links en todas partes.
export default function LandingHeader() {
  return (
    <header className="landing-bar">
      <a className="landing-marca" href="/">ECOSIM</a>
      <nav className="landing-nav-links">
        <a className="landing-login" href="/admin/login">Iniciar sesión</a>
        <a className="landing-cta-nav" href="/#contacto">Hablar con un asesor</a>
      </nav>
    </header>
  );
}
