import { Suspense } from 'react';
import LoginForm from './LoginForm';

export const metadata = {
  title: 'Iniciar sesión — EcoSim',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="admin">
      <div className="admin-bar">
        <span className="admin-title">Administración</span>
      </div>
      <div className="admin-login">
        {/* useSearchParams (para el aviso de cuenta borrada) exige un
            límite de Suspense para no bloquear el prerenderizado estático
            de toda la página. */}
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
