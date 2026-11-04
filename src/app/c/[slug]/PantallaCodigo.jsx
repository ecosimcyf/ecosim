'use client';
// Pantalla para escribir el código de acceso de la cuenta (lo da el
// profesor). Se ve antes del menú de casos cuando la cuenta tiene código y
// este navegador aún no lo escribió, o cuando el profesor lo cambió.
import { useState } from 'react';
import { entrarConCodigo } from '@/app/actions/estudiante';
import { useT, useIdioma } from '@/lib/i18n/cliente';
import SelectorIdioma from '@/lib/i18n/SelectorIdioma';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';

export default function PantallaCodigo({ slug, onEntrar }) {
  const t = useT(ESTUDIANTE);
  const idioma = useIdioma();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!codigo.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    let r;
    try {
      r = await entrarConCodigo(slug, codigo);
    } catch {
      r = { error: 'codigo.fallo' };
    }
    if (r?.ok) {
      await onEntrar();
    } else {
      setError(r?.error || 'codigo.fallo');
    }
    setEnviando(false);
  }

  return (
    <div className="menu-casos">
      <SelectorIdioma idioma={idioma} etiqueta={t('idioma')} titulo={t('idioma')} className="menu-casos-idioma" />
      <div className="marca">ECOSIM</div>
      <form className="codigo-acceso" onSubmit={enviar}>
        <label htmlFor="codigo-acceso" className="menu-casos-sub">{t('codigo.titulo')}</label>
        <input
          id="codigo-acceso" value={codigo} onChange={(e) => setCodigo(e.target.value)}
          autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={40} autoFocus
          aria-invalid={!!error} aria-describedby={error ? 'codigo-error' : undefined}
        />
        <button className="btn btn-primary" disabled={enviando || !codigo.trim()}>
          {enviando ? t('codigo.entrando') : t('codigo.entrar')}
        </button>
        {error && <div id="codigo-error" className="aviso-caso" role="alert">{t(error)}</div>}
        <p className="codigo-ayuda">{t('codigo.ayuda')}</p>
      </form>
    </div>
  );
}
