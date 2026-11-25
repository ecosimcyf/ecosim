'use client';
// Editor de recorte: el usuario elige qué tramo (máx. `max` segundos) de un
// vídeo largo se usa. Solo elige el tramo; el corte real lo hace ffmpeg en la
// misma pasada de conversión (ver convertir-video.js).
import { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '@/lib/i18n/cliente';
import { PANEL } from '@/lib/i18n/textos/panel';
import { acotarRecorte, formatearTiempo } from '@/lib/recorte-video';
import { useModal } from './useModal';

export default function RecorteVideo({ file, duracion, max, onUsar, onCancelar }) {
  const t = useT(PANEL);
  const ref = useModal(onCancelar);
  const videoRef = useRef(null);
  const pistaRef = useRef(null);
  const arrastre = useRef(null);
  const [url, setUrl] = useState(null);
  const [errorVista, setErrorVista] = useState(false);
  const [reproduciendo, setReproduciendo] = useState(false);
  const [tramo, setTramo] = useState(() => acotarRecorte({ inicio: 0, largo: max, duracion, max }));

  // URL local del archivo; se revoca al cerrar.
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const cambiar = useCallback((parcial) => {
    setTramo((p) => acotarRecorte({ inicio: p.inicio, largo: p.largo, duracion, max, ...parcial }));
  }, [duracion, max]);

  const parar = useCallback(() => {
    videoRef.current?.pause();
    setReproduciendo(false);
  }, []);

  // Al mover el tramo (sin estar reproduciendo) se hace seek para previsualizar.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || reproduciendo) return;
    try { v.currentTime = tramo.inicio; } catch {}
  }, [tramo.inicio, reproduciendo]);

  // Mientras se reproduce el tramo, se vigila el final con rAF (timeupdate
  // llega solo ~4 veces por segundo y se pasaría del fin).
  useEffect(() => {
    if (!reproduciendo) return undefined;
    const v = videoRef.current;
    let id = 0;
    const vigilar = () => {
      if (!v || v.currentTime >= tramo.fin || v.ended) {
        v?.pause();
        setReproduciendo(false);
        return;
      }
      id = requestAnimationFrame(vigilar);
    };
    id = requestAnimationFrame(vigilar);
    return () => cancelAnimationFrame(id);
  }, [reproduciendo, tramo.fin]);

  function alternarVista() {
    const v = videoRef.current;
    if (!v) return;
    if (reproduciendo) { parar(); return; }
    try { v.currentTime = tramo.inicio; } catch {}
    const p = v.play();
    if (p && p.catch) p.catch(() => { setErrorVista(true); setReproduciendo(false); });
    setReproduciendo(true);
  }

  // Barra visual: la ventana se arrastra (ratón y táctil); un toque fuera de
  // la ventana la centra ahí. Los controles deslizantes dan el equivalente
  // accesible (teclado), por eso la barra va aria-hidden.
  function posicionX(e) {
    const r = pistaRef.current.getBoundingClientRect();
    return ((e.clientX - r.left) / r.width) * duracion;
  }
  function onPistaDown(e) {
    if (e.button != null && e.button !== 0) return;
    const x = posicionX(e);
    const dentro = x >= tramo.inicio && x <= tramo.fin;
    arrastre.current = dentro ? x - tramo.inicio : tramo.largo / 2;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (reproduciendo) parar();
    if (!dentro) cambiar({ inicio: x - tramo.largo / 2 });
  }
  function onPistaMove(e) {
    if (arrastre.current == null) return;
    cambiar({ inicio: posicionX(e) - arrastre.current });
  }
  function onPistaUp() { arrastre.current = null; }

  const pct = (v) => (duracion > 0 ? (v / duracion) * 100 : 0) + '%';
  const maxInicio = Math.max(0, duracion - tramo.largo);
  const maxLargo = Math.min(max, duracion);

  return (
    <div className="overlay overlay-recorte">
      <div className="modal-box recorte-box" role="dialog" aria-modal="true" aria-labelledby="titulo-recorte" ref={ref}>
        <h4 id="titulo-recorte">{t('videos.recorte.titulo')}</h4>
        <p>{t('videos.recorte.intro', { dur: formatearTiempo(duracion), max })}</p>

        <div className="recorte-video">
          {url && (
            <video
              ref={videoRef} src={url} muted playsInline preload="auto"
              onError={() => setErrorVista(true)}
              onLoadedData={() => { try { videoRef.current.currentTime = tramo.inicio; } catch {} }}
            />
          )}
        </div>
        {errorVista && <p className="recorte-aviso" role="status">{t('videos.recorte.sinVista')}</p>}

        <div
          className="recorte-pista" ref={pistaRef} aria-hidden="true"
          onPointerDown={onPistaDown} onPointerMove={onPistaMove}
          onPointerUp={onPistaUp} onPointerCancel={onPistaUp}
        >
          <div className="recorte-ventana" title={t('videos.recorte.ventana')} style={{ left: pct(tramo.inicio), width: pct(tramo.largo) }} />
        </div>

        <div className="recorte-tiempos" aria-live="polite">
          <span><span className="lbl">{t('videos.recorte.inicio')}</span> <strong>{formatearTiempo(tramo.inicio, true)}</strong></span>
          <span><span className="lbl">{t('videos.recorte.fin')}</span> <strong>{formatearTiempo(tramo.fin, true)}</strong></span>
        </div>

        <label className="recorte-campo">
          <span className="lbl">{t('videos.recorte.deslizador')}</span>
          <input
            type="range" min="0" max={maxInicio} step="0.1" value={tramo.inicio}
            disabled={maxInicio <= 0}
            onChange={(e) => { if (reproduciendo) parar(); cambiar({ inicio: Number(e.target.value) }); }}
            aria-valuetext={formatearTiempo(tramo.inicio, true) + ' – ' + formatearTiempo(tramo.fin, true)}
          />
        </label>
        <label className="recorte-campo">
          <span className="lbl">{t('videos.recorte.largo')}: {Math.round(tramo.largo * 10) / 10} s</span>
          <input
            type="range" min="1" max={maxLargo} step="0.5" value={tramo.largo}
            onChange={(e) => { if (reproduciendo) parar(); cambiar({ largo: Number(e.target.value) }); }}
          />
        </label>

        <p className="recorte-nota">{t('videos.recorte.nota')}</p>
        <div className="modal-acciones recorte-acciones">
          <button className="btn" onClick={alternarVista}>
            {reproduciendo ? t('videos.recorte.detener') : t('videos.recorte.verTramo')}
          </button>
          <button className="btn" onClick={onCancelar}>{t('videos.recorte.cancelar')}</button>
          <button className="btn btn-primary" onClick={() => onUsar({ inicio: tramo.inicio, largo: tramo.largo })}>
            {t('videos.recorte.usar')}
          </button>
        </div>
      </div>
    </div>
  );
}
