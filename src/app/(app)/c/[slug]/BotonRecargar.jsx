'use client';
// Botón «Reintentar» de la pantalla «no se pudo conectar» (page.js).
export default function BotonRecargar({ texto }) {
  return <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>{texto}</button>;
}
