// Cabecera compartida por todas las páginas públicas livianas (landing,
// términos, privacidad, 404): mismo logo y mismos links en todas partes.
// Los enlaces a secciones van con "/#..." para que funcionen también
// desde términos, privacidad o la 404.
//
// Tres zonas: logo a la izquierda, navegación por la página en el
// CENTRO (texto simple) y, a la derecha, las dos ACCIONES como botones
// («Iniciar sesión» con borde, «Hablar con un asesor» relleno).
export default function LandingHeader() {
  return (
    <header className="landing-bar">
      <a className="landing-marca" href="/">ECOSIM</a>
      <nav className="landing-nav-secciones" aria-label="Secciones de la página">
        <a className="landing-nav-seccion" href="/#como-funciona">Cómo funciona</a>
        <a className="landing-nav-seccion" href="/#planes">Planes</a>
        <a className="landing-nav-seccion" href="/#preguntas">Preguntas</a>
      </nav>
      <div className="landing-nav-acciones">
        <a className="landing-login" href="/admin/login">Iniciar sesión</a>
        <a className="landing-cta-nav" href="/#contacto">Hablar con un asesor</a>
      </div>
    </header>
  );
}
