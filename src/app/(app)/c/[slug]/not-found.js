// Enlace de una cuenta que no existe o que está desactivada: el mismo
// aviso de siempre, pero con estado 404 (así no lo indexa nadie y los
// monitores lo cuentan como lo que es).
import { crearT } from '@/lib/i18n/config';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';

export default async function CuentaNoDisponible() {
  const t = crearT(ESTUDIANTE, await idiomaVisitante());
  return (
    <div className="espera">
      <div className="marca">ECOSIM</div>
      <div className="txt">{t('noDisponible')}</div>
    </div>
  );
}
