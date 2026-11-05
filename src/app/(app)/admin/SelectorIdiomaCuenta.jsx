'use client';
// Selector de idioma del admin de un cliente: cambia el idioma de SU
// CUENTA (el del panel y con el que abre la vista de sus estudiantes) y,
// de paso, su propia preferencia (cookie), para que el login y las demás
// páginas también le salgan en ese idioma.
import { cambiarIdiomaCuenta } from '@/app/actions/admin';
import { useIdioma, useT } from '@/lib/i18n/cliente';
import SelectorIdioma from '@/lib/i18n/SelectorIdioma';
import { PANEL } from '@/lib/i18n/textos/panel';

export default function SelectorIdiomaCuenta({ cuentaId }) {
  const idioma = useIdioma();
  const t = useT(PANEL);

  async function alCambiar(nuevo) {
    try {
      const r = await cambiarIdiomaCuenta(cuentaId, nuevo);
      if (r?.error) { alert(t(r.error, r.vars)); return false; }
      return true;
    } catch {
      alert(t('comun.errorRed'));
      return false;
    }
  }

  return <SelectorIdioma idioma={idioma} etiqueta={t('bar.idioma')} titulo={t('bar.idiomaCuenta')} alCambiar={alCambiar} />;
}
