// Cualquier admin con sesión (super_admin o cliente) cambia su propia
// contraseña aquí. Pensada sobre todo para que el cliente reemplace la
// contraseña temporal que le dio el super_admin al crear su cuenta (ver
// crearCuenta en actions/admin.js), pero sirve para cualquier otro admin.
// Ya queda protegida por el middleware existente (su matcher ya cubre
// /admin/:path*): sin sesión, no se llega hasta aquí.
import CambiarClaveForm from './CambiarClaveForm';
import DosPasos from './DosPasos';
import { crearClienteServidorAuth } from '@/lib/supabase/server';
import { factorActivo } from '@/lib/mfa';
import { crearT } from '@/lib/i18n/config';
import { idiomaPanel } from '@/lib/i18n/panel-servidor';
import { PANEL } from '@/lib/i18n/textos/panel';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = crearT(PANEL, await idiomaPanel());
  return { title: t('meta.clave'), robots: { index: false, follow: false } };
}

export default async function CambiarClavePage() {
  const t = crearT(PANEL, await idiomaPanel());
  // ¿Ya tiene la verificación en dos pasos? (si falla la consulta, se
  // muestra como desactivada: activarla de nuevo avisa si ya lo estaba).
  const activa = !!(await factorActivo(crearClienteServidorAuth()).catch(() => null));
  return (
    <div className="admin">
      <div className="admin-bar">
        <h1 className="admin-title">{t('bar.titulo')}</h1>
      </div>
      <div className="admin-login admin-seguridad">
        <CambiarClaveForm textos={t('clave')} />
        <DosPasos textos={t('mfa')} activaInicial={activa} />
      </div>
    </div>
  );
}
