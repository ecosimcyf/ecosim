// Panel de administración. El middleware ya garantiza que aquí solo se
// llega con sesión válida. Cargamos los datos en el servidor (con la clave
// service_role) y los pasamos al panel interactivo.
//
// Idioma: el de la cuenta para el admin de un cliente (lo cambia con el
// selector de la barra, y es también el de sus estudiantes); el suyo
// propio (cookie) para el super_admin.
import { leerDatosAdmin } from '@/app/actions/admin';
import { logout } from '@/app/actions/auth';
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { idiomaPanel } from '@/lib/i18n/panel-servidor';
import { Idioma } from '@/lib/i18n/cliente';
import SelectorIdioma from '@/lib/i18n/SelectorIdioma';
import { PANEL } from '@/lib/i18n/textos/panel';
import AdminPanel from './AdminPanel';
import SelectorIdiomaCuenta from './SelectorIdiomaCuenta';

export const dynamic = 'force-dynamic';
// Las Server Actions del panel corren en la función de esta página.
// Borrar una cuenta con muchos videos encadena bastantes llamadas a
// Supabase: 60 s de margen en vez de los 10 s que pueden tocar por defecto.
export const maxDuration = 60;

export async function generateMetadata() {
  const t = crearT(PANEL, await idiomaPanel());
  return { title: t('meta.panel'), robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  // leerDatosAdmin() lanza un error con "codigo" cuando no se puede entrar
  // (sin perfil, cuenta desactivada o borrada, sesión cerrada) y su
  // mensaje es una clave de texto (err.*) lista para traducir. Cualquier
  // otro error (Supabase caído, red) NO es culpa de la cuenta: se dice
  // eso, en vez del engañoso "tu cuenta no está activa" de antes.
  let datos = null;
  let errorCuenta = null;
  try {
    datos = await leerDatosAdmin();
  } catch (err) {
    console.error('[admin] no se pudo cargar el panel:', err);
    errorCuenta = err?.codigo ? err.message : 'errorCarga';
  }

  const deCuenta = datos?.rol === 'cliente' && datos.idiomasDisponibles;
  const idioma = deCuenta ? datos.cuentaIdioma : await idiomaVisitante();
  const t = crearT(PANEL, idioma);

  return (
    <Idioma valor={idioma}>
      <div className="admin">
        <div className="admin-bar">
          <span className="admin-title">{t('bar.titulo')}</span>
          <div className="admin-bar-acciones">
            {deCuenta
              ? <SelectorIdiomaCuenta cuentaId={datos.cuentaId} />
              : <SelectorIdioma idioma={idioma} etiqueta={t('bar.idioma')} titulo={t('bar.idioma')} />}
            <a className="btn" href="/admin/cambiar-clave">{t('bar.cambiarClave')}</a>
            <form action={logout}>
              <button className="btn">{t('bar.cerrarSesion')}</button>
            </form>
          </div>
        </div>
        {errorCuenta ? (
          <p className="muted" style={{ padding: 24, textAlign: 'center' }}>{t(errorCuenta)}</p>
        ) : (
          <AdminPanel inicial={datos} />
        )}
      </div>
    </Idioma>
  );
}
