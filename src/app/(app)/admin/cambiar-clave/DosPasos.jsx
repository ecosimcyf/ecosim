'use client';
// Activar o quitar la verificación en dos pasos (ver src/lib/mfa.js).
// Los textos llegan ya traducidos (prop "textos", grupo "mfa" del panel).
import { useState } from 'react';
import { iniciarDosPasos, confirmarDosPasos, quitarDosPasos } from '@/app/actions/mfa';

export default function DosPasos({ textos: t, activaInicial }) {
  const [activa, setActiva] = useState(activaInicial);
  const [alta, setAlta] = useState(null); // { factorId, qr, secreto } mientras se activa
  const [codigo, setCodigo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState(null); // { tipo: 'error' | 'ok', texto }

  async function correr(fn) {
    setOcupado(true);
    setMsg(null);
    try {
      return await fn();
    } catch {
      setMsg({ tipo: 'error', texto: t.errFallo });
      return null;
    } finally {
      setOcupado(false);
    }
  }

  async function empezar() {
    const r = await correr(() => iniciarDosPasos());
    if (!r) return;
    if (r.error) { setMsg({ tipo: 'error', texto: t[r.error.split('.')[1]] }); return; }
    setCodigo('');
    setAlta(r);
  }

  async function confirmar(e) {
    e.preventDefault();
    const r = await correr(() => confirmarDosPasos(alta.factorId, codigo));
    if (!r) return;
    if (r.error) { setMsg({ tipo: 'error', texto: t[r.error.split('.')[1]] }); return; }
    setAlta(null);
    setCodigo('');
    setActiva(true);
    setMsg({ tipo: 'ok', texto: t.activada });
  }

  async function quitar(e) {
    e.preventDefault();
    const r = await correr(() => quitarDosPasos(codigo));
    if (!r) return;
    if (r.error) { setMsg({ tipo: 'error', texto: t[r.error.split('.')[1]] }); return; }
    setCodigo('');
    setActiva(false);
    setMsg({ tipo: 'ok', texto: t.quitada });
  }

  const campoCodigo = (
    <input
      name="codigo" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7}
      placeholder={t.codigo} aria-label={t.codigo} required
      value={codigo} onChange={(e) => setCodigo(e.target.value)}
    />
  );

  return (
    <section className="login-box dos-pasos" id="dos-pasos" aria-labelledby="dos-pasos-titulo">
      <div className="login-t" id="dos-pasos-titulo">{t.titulo}</div>
      <p className="login-ayuda">{t.intro}</p>
      <p className={activa ? 'msg-ok' : 'muted'}>{activa ? '● ' + t.activa : t.inactiva}</p>

      {!activa && !alta && (
        <button type="button" className="btn btn-primary" onClick={empezar} disabled={ocupado}>{t.activar}</button>
      )}

      {alta && (
        <form onSubmit={confirmar} className="dos-pasos-alta">
          <p>{t.paso1}</p>
          {/* QR que genera Supabase (imagen SVG en data:). */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dos-pasos-qr" src={alta.qr} alt={t.paso1} width={180} height={180} />
          <p className="login-ayuda">{t.noQr} <code className="dos-pasos-secreto">{alta.secreto}</code></p>
          <p>{t.paso2}</p>
          {campoCodigo}
          <div className="espera-acciones">
            <button className="btn btn-primary" disabled={ocupado}>{t.confirmar}</button>
            <button type="button" className="btn" onClick={() => { setAlta(null); setMsg(null); }} disabled={ocupado}>{t.cancelar}</button>
          </div>
        </form>
      )}

      {activa && (
        <form onSubmit={quitar}>
          <p className="login-ayuda">{t.quitarTexto}</p>
          {campoCodigo}
          <button className="btn danger" disabled={ocupado}>{t.quitar}</button>
        </form>
      )}

      <div className={'msg ' + (msg?.tipo === 'error' ? 'msg-error' : 'msg-ok')} role="status" aria-live="polite">{msg?.texto}</div>
      <p className="login-ayuda">{t.perdida}</p>
    </section>
  );
}
