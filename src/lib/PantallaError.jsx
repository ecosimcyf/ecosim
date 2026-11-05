'use client';
// Pantalla que se ve cuando algo falla al pintar una página (la usan los
// error.js de cada zona). En vez del mensaje genérico de Next.js en
// inglés, explica qué pasó en el idioma de la página y ofrece reintentar
// sin cerrar la pestaña. El error se reporta solo (src/lib/ReporteErrores.jsx).
import { useEffect, useState } from 'react';
import { reportar } from './ReporteErrores';
import { ERRORES, idiomaDelDocumento } from './i18n/textos/errores';

// estilo: 'oscuro' (simulador y panel) o 'claro' (landing).
export default function PantallaError({ error, reset, origen, estudiante = false, estilo = 'oscuro' }) {
  const [idioma, setIdioma] = useState('es');
  useEffect(() => { setIdioma(idiomaDelDocumento()); }, []);
  useEffect(() => { reportar(origen, error, { digest: error?.digest }); }, [error, origen]);
  const t = ERRORES[idioma];

  if (estilo === 'claro') {
    return (
      <main className="error-404" role="alert">
        <h1>{t.titulo}</h1>
        <p>{t.texto}</p>
        <div className="espera-acciones">
          <button type="button" className="landing-btn landing-btn-primary" onClick={() => reset()}>{t.reintentar}</button>
          <a className="landing-btn landing-btn-outline" href="/">{t.inicio}</a>
        </div>
      </main>
    );
  }
  return (
    <div className="espera" role="alert">
      <div className="marca">ECOSIM</div>
      <div className="txt"><strong>{t.titulo}</strong><br />{estudiante ? t.textoEstudiante : t.texto}</div>
      <div className="espera-acciones">
        <button type="button" className="btn btn-primary" onClick={() => reset()}>{t.reintentar}</button>
        <button type="button" className="btn" onClick={() => window.location.reload()}>{t.recargar}</button>
      </div>
    </div>
  );
}
