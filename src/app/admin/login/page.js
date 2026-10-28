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
        <LoginForm />
      </div>
    </div>
  );
}
