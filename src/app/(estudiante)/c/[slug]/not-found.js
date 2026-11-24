// Enlace de una cuenta que no existe o que está desactivada: aviso con
// estado 404 (así no lo indexa nadie y los monitores lo cuentan como lo que
// es). Debe ser estática (la página se sirve desde la caché), así que el
// idioma lo elige el navegador (NoDisponible.jsx).
import NoDisponible from './NoDisponible';

export const metadata = { title: 'EcoSim', robots: { index: false, follow: false } };

export default function CuentaNoDisponible() {
  return <NoDisponible />;
}
