import LandingHeader from './landing/LandingHeader';
import LandingFooter from './landing/LandingFooter';
import { jakarta } from './landing/fuente';

export const metadata = {
  title: 'Página no encontrada — EcoSim',
  robots: { index: false, follow: false },
};

export default function NoEncontrado() {
  return (
    <div className={'landing ' + jakarta.className}>
      <LandingHeader />
      <main className="error-404">
        <span className="error-404-codigo">404</span>
        <h1>No encontramos esta página</h1>
        <p>El enlace puede estar mal escrito o la página ya no existe.</p>
        <a className="btn btn-primary" href="/">Volver al inicio</a>
      </main>
      <LandingFooter />
    </div>
  );
}
