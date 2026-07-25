'use client';
// ============================================================
// Vista del estudiante.
//
// Al entrar (y al cambiar el caso activo) PRECARGA todos los videos del
// caso en memoria, mostrando una barra de progreso. Así, al mantener
// presionado un punto, el video ya está listo y se reproduce al instante.
//
// El <video> se maneja de forma imperativa (poner src, silenciar y
// reproducir por código), igual que en la app de escritorio.
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { cargarDatosPublicos } from '@/lib/datos';
import { MANIQUIES } from '@/lib/maniquies';

const GRACIA_TACTIL_MS = 1500; // mismo valor que la app de escritorio
const VISTAS = [
  { id: 'ventral', label: 'Abajo' },
  { id: 'izq', label: 'Izq' },
  { id: 'der', label: 'Der' },
];

// Posición del token: usa x/y guardados (en %) o una repartida por defecto.
function posToken(p, i) {
  const x = typeof p.x === 'number' ? p.x : 12 + (i % 6) * 13;
  const y = typeof p.y === 'number' ? p.y : 10 + Math.floor(i / 6) * 9;
  return { x, y };
}

function hayVideos(datos) {
  return !!(datos && datos.puntos && datos.puntos.some((p) => p.videoUrl));
}

export default function VistaPrincipal({ inicial }) {
  const [datos, setDatos] = useState(inicial);
  const [vista, setVista] = useState('ventral');
  const [videoUrl, setVideoUrl] = useState(null); // null => reposo
  const [congelado, setCongelado] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  // Estado de la precarga de videos.
  const [precarga, setPrecarga] = useState(() => ({ cargando: hayVideos(inicial), pct: 0 }));

  const videoRef = useRef(null);
  const graciaRef = useRef(null);
  const blobsRef = useRef({}); // punto_id -> blob URL (video ya descargado)

  const irAReposo = useCallback(() => setVideoUrl(null), []);

  // -------- Tiempo real: recargar al cambiar el caso activo --------
  useEffect(() => {
    const supabase = crearClienteNavegador();
    const recargar = async () => {
      const d = await cargarDatosPublicos(supabase);
      setVideoUrl(null);
      setVista('ventral');
      setDatos(d); // dispara la re-precarga (efecto de abajo)
    };
    const canal = supabase
      .channel('config-cambios')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'config' }, recargar)
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, []);

  // -------- Precarga de todos los videos del caso --------
  useEffect(() => {
    // Soltar los blobs del caso anterior.
    Object.values(blobsRef.current).forEach((u) => URL.revokeObjectURL(u));
    blobsRef.current = {};

    if (!datos || !datos.casoActivoId || !hayVideos(datos)) {
      setPrecarga({ cargando: false, pct: 100 });
      return;
    }

    let vigente = true;
    const controladores = [];
    const conVideo = datos.puntos.filter((p) => p.videoUrl);
    setPrecarga({ cargando: true, pct: 0 });

    let totalBytes = 0;
    let hechosBytes = 0;
    const actualizar = () => {
      if (!vigente) return;
      const pct = totalBytes ? Math.min(99, Math.round((hechosBytes / totalBytes) * 100)) : 0;
      setPrecarga({ cargando: true, pct });
    };

    (async () => {
      await Promise.all(conVideo.map(async (p) => {
        const ctrl = new AbortController();
        controladores.push(ctrl);
        try {
          const resp = await fetch(p.videoUrl, { signal: ctrl.signal });
          totalBytes += Number(resp.headers.get('content-length')) || 0;
          const reader = resp.body.getReader();
          const trozos = [];
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            trozos.push(value);
            hechosBytes += value.length;
            actualizar();
          }
          if (!vigente) return;
          blobsRef.current[p.id] = URL.createObjectURL(new Blob(trozos, { type: 'video/mp4' }));
        } catch {
          // Si un video falla al precargar, se usará su URL directa como respaldo.
        }
      }));
      if (vigente) setPrecarga({ cargando: false, pct: 100 });
    })();

    return () => {
      vigente = false;
      controladores.forEach((c) => { try { c.abort(); } catch {} });
      Object.values(blobsRef.current).forEach((u) => URL.revokeObjectURL(u));
      blobsRef.current = {};
    };
  }, [datos]);

  // -------- Manejo imperativo del <video> al cambiar la fuente --------
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setCongelado(false);
    if (videoUrl) {
      v.muted = true;
      if (v.getAttribute('src') !== videoUrl) v.src = videoUrl;
      v.play().catch(() => {});
    } else {
      v.pause();
      v.removeAttribute('src');
      v.load();
    }
  }, [videoUrl]);

  // -------- Atajos de teclado --------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F1') { e.preventDefault(); setAyuda((a) => !a); return; }
      if (e.key === 'F11') { e.preventDefault(); alternarPantallaCompleta(); return; }
      if (e.key === 'Escape') { if (ayuda) setAyuda(false); else irAReposo(); return; }
      if (e.code === 'Space' && videoUrl) {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        setCongelado((c) => {
          const nuevo = !c;
          if (nuevo) v.pause(); else v.play().catch(() => {});
          return nuevo;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ayuda, videoUrl, irAReposo]);

  // -------- Presionar / soltar un punto --------
  const presionar = (p, e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    if (graciaRef.current) { clearTimeout(graciaRef.current); graciaRef.current = null; }
    // Usa el video ya precargado (blob); si no, la URL directa como respaldo.
    setVideoUrl(blobsRef.current[p.id] || p.videoUrl || null);
  };
  const soltar = () => {
    if (graciaRef.current) clearTimeout(graciaRef.current);
    graciaRef.current = setTimeout(() => { graciaRef.current = null; irAReposo(); }, GRACIA_TACTIL_MS);
  };

  // -------- Sin caso activo --------
  if (!datos || !datos.casoActivoId) {
    return (
      <div className="espera">
        <div className="marca">ECOSIM</div>
        <div className="txt">Esperando a que el profesor active un caso…</div>
      </div>
    );
  }

  const { especie, puntos } = datos;
  const esLado = MANIQUIES.esLado(vista);
  const puntosVista = puntos.filter((p) => (p.vista || 'ventral') === vista);

  return (
    <div className="estudiante">
      {/* Aviso de girar el teléfono (solo se ve en móvil en vertical, por CSS) */}
      <div className="rotar-overlay">
        <svg className="rotar-svg" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <g className="rotar-fono">
            <rect x="37" y="16" width="26" height="52" rx="6" fill="none" stroke="#3fc6cf" strokeWidth="3" />
            <line x1="46" y1="22" x2="54" y2="22" stroke="#3fc6cf" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="62" r="2.4" fill="#3fc6cf" />
          </g>
        </svg>
        <div className="rotar-titulo">Gira tu teléfono</div>
        <div className="rotar-sub">Pon la pantalla en horizontal para ver la ecografía.</div>
      </div>

      {/* Pantalla de carga (precarga de videos al entrar) */}
      {precarga.cargando && (
        <div className="carga-overlay">
          <div className="carga-box">
            <div className="carga-titulo">Preparando las ecografías…</div>
            <div className="carga-barra"><div className="carga-relleno" style={{ width: precarga.pct + '%' }} /></div>
            <div className="carga-pct">{precarga.pct}%</div>
            <div className="carga-sub">Se cargan una sola vez para que luego respondan al instante.</div>
          </div>
        </div>
      )}

      {/* Visor de video */}
      <div className="visor">
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          style={{ display: videoUrl ? 'block' : 'none' }}
        />
        {!videoUrl && (
          <div className="idle-screen">
            <div className="idle-mark">ECOSIM</div>
            <div className="idle-sub">— sonda en reposo —</div>
          </div>
        )}
        {videoUrl && congelado && <div className="freeze-tag">❚❚ Congelado</div>}
        <div className="esc-hint">Espacio = congelar · F1 = ayuda</div>
      </div>

      {/* Panel del maniquí */}
      <div className={'panel-maniqui' + (esLado ? ' lado' : '')}>
        <div className="tabs">
          {VISTAS.map((v) => (
            <button
              key={v.id}
              className={'tab' + (v.id === vista ? ' act' : '')}
              onClick={() => setVista(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>

        <div className={'mq-canvas' + (esLado ? ' lado' : '')}>
          <div
            className="mq-arte"
            dangerouslySetInnerHTML={{ __html: MANIQUIES.svg(especie, vista) }}
          />
          {puntosVista.map((p, i) => {
            const pos = posToken(p, i);
            const clase = p.videoUrl ? 'config' : 'sinvid';
            return (
              <div
                key={p.id}
                className={'mq-token ' + clase}
                style={{ left: pos.x + '%', top: pos.y + '%' }}
                onPointerDown={(e) => presionar(p, e)}
                onPointerUp={soltar}
                onPointerCancel={soltar}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <div className="panel-hint">Mantén presionado un punto del maniquí</div>
      </div>

      {/* Ayuda (F1) */}
      {ayuda && (
        <div className="overlay" onClick={() => setAyuda(false)}>
          <div className="ayuda-box" onClick={(e) => e.stopPropagation()}>
            <div className="titulo">Atajos de teclado</div>
            <table>
              <tbody>
                <tr><td>Espacio</td><td>Congelar / descongelar la imagen</td></tr>
                <tr><td>Esc</td><td>Volver al reposo</td></tr>
                <tr><td>F11</td><td>Pantalla completa / ventana</td></tr>
                <tr><td>F1</td><td>Mostrar u ocultar esta ayuda</td></tr>
              </tbody>
            </table>
            <button className="btn small" onClick={() => setAyuda(false)}>Cerrar (F1)</button>
          </div>
        </div>
      )}
    </div>
  );
}

function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.().catch(() => {});
  } else {
    document.exitFullscreen?.();
  }
}
