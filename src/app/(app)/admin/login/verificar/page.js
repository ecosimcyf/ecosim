// Segundo paso del login para quien tiene activada la verificación en dos
// pasos (ver src/lib/mfa.js): ya escribió su contraseña, falta el código
// de su teléfono. El middleware deja pasar esta página (está bajo
// /admin/login) y manda aquí a quien intente entrar al panel sin el código.
import { redirect } from 'next/navigation';
import VerificarForm from './VerificarForm';
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { faltaSegundoPaso } from '@/lib/mfa';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { PANEL } from '@/lib/i18n/textos/panel';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = crearT(PANEL, await idiomaVisitante());
  return { title: t('mfa.loginTitulo') + ' — EcoSim', robots: { index: false, follow: false } };
}

export default async function VerificarPage() {
  const supabase = crearClienteServidorAuth();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');
  if (!(await faltaSegundoPaso(supabase))) redirect('/admin');
  const t = crearT(PANEL, await idiomaVisitante());
  return (
    <div className="admin">
      <div className="admin-bar">
        <h1 className="admin-title">{t('bar.titulo')}</h1>
      </div>
      <div className="admin-login">
        <VerificarForm textos={t('mfa')} />
      </div>
    </div>
  );
}
