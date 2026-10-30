'use client';
// ============================================================
// Exámenes complementarios en la vista del estudiante: botones del visor
// y las tres ventanas (laboratorio, radiografías, monitor de signos
// vitales). Los datos llegan ya cargados con el caso (cargarDatosDeCaso).
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { CAMPOS_VITALES, estadoValor, textoReferencia, aNumero } from '@/lib/examenes';

// ---------- íconos (dibujados: el emoji 🩻 no existe en Windows ni en
// Android antiguos) ----------
const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };

export function IconoLab({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...trazo}>
      <path d="M8 3h8" /><path d="M9.5 3v13.5a2.5 2.5 0 0 0 5 0V3" /><path d="M9.5 12h5" />
    </svg>
  );
}
export function IconoRx({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...trazo}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M12 6.5v11" />
      <path d="M8 8.5c1.5.9 2.6 1.1 4 1.1s2.5-.2 4-1.1" />
      <path d="M7.5 12c1.6.9 3 1.1 4.5 1.1s2.9-.2 4.5-1.1" />
      <path d="M8 15.5c1.5.8 2.6 1 4 1s2.5-.2 4-1" />
    </svg>
  );
}
export function IconoMonitor({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" {...trazo}>
      <rect x="2.5" y="4" width="19" height="13" rx="2" /><path d="M8 20.5h8" /><path d="M12 17v3.5" />
      <path d="M5.5 11h3l1.5-3 2.5 6 1.5-3h4.5" />
    </svg>
  );
}

export const EXAMENES = [
  { id: 'lab', titulo: 'Laboratorio', Icono: IconoLab },
  { id: 'rx', titulo: 'Radiografías', Icono: IconoRx },
  { id: 'vitales', titulo: 'Signos vitales', Icono: IconoMonitor },
];

// Qué exámenes trae un caso ya cargado.
export function examenesDisponibles(ex) {
  if (!ex) return [];
  const archivos = ex.archivos || [];
  return EXAMENES.filter((e) => {
    if (e.id === 'lab') return (ex.laboratorio || []).length > 0 || archivos.some((a) => a.tipo === 'lab');
    if (e.id === 'rx') return archivos.some((a) => a.tipo === 'rx');
    return Object.keys(ex.vitales || {}).length > 0;
  });
}

// Botones sobre el visor (arriba a la derecha).
export function BotonesExamenes({ examenes, onAbrir }) {
  const lista = examenesDisponibles(examenes);
  if (!lista.length) return null;
  return (
    <div className="examenes-barra">
      {lista.map(({ id, titulo, Icono }) => (
        <button key={id} type="button" className="btn small btn-examen" onClick={() => onAbrir(id)} title={titulo}>
          <Icono /><span className="btn-examen-txt">{titulo}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- ventana contenedora ----------
export function VentanaExamen({ tipo, examenes, casoNombre, onCerrar }) {
  const def = EXAMENES.find((e) => e.id === tipo);
  const cerrarRef = useRef(null);
  useEffect(() => { cerrarRef.current?.focus(); }, []);
  if (!def) return null;
  const { Icono } = def;
  return (
    <div className="overlay overlay-examen" onClick={onCerrar}>
      <div className={'examen-box examen-' + tipo} role="dialog" aria-modal="true" aria-label={def.titulo}
        onClick={(e) => e.stopPropagation()}>
        <div className="examen-head">
          <Icono size={20} />
          <div className="examen-head-txt">
            <div className="examen-eyebrow">{casoNombre}</div>
            <div className="examen-titulo">{def.titulo}</div>
          </div>
          <button ref={cerrarRef} type="button" className="btn small examen-cerrar" onClick={onCerrar}
            aria-label="Cerrar">✕</button>
        </div>
        <div className="examen-cuerpo">
          {tipo === 'lab' && <Laboratorio paneles={examenes.laboratorio || []}
            adjuntos={(examenes.archivos || []).filter((a) => a.tipo === 'lab')} />}
          {tipo === 'rx' && <VisorImagenes imagenes={(examenes.archivos || []).filter((a) => a.tipo === 'rx')} />}
          {tipo === 'vitales' && <MonitorVitales vitales={examenes.vitales || {}} />}
        </div>
      </div>
    </div>
  );
}

// ---------- laboratorio ----------
// Lo primero es el REPORTE que subió el profesor (foto/PDF), tal cual; las
// tablas de valores, si las hay, van después como pestañas.
function Laboratorio({ paneles, adjuntos }) {
  const imagenes = adjuntos.filter((a) => a.mime !== 'application/pdf');
  const pdfs = adjuntos.filter((a) => a.mime === 'application/pdf');
  const hayReporte = adjuntos.length > 0;
  // Pestañas: 'reporte' (si hay) y luego el índice de cada tabla.
  const pestanas = [...(hayReporte ? ['reporte'] : []), ...paneles.map((_, i) => i)];
  const [sel, setSel] = useState(pestanas[0]);
  const actual = pestanas.includes(sel) ? sel : pestanas[0];
  const panel = typeof actual === 'number' ? paneles[actual] : null;

  return (
    <div className="lab">
      {pestanas.length > 1 && (
        <div className="tabs lab-tabs">
          {pestanas.map((p) => (
            <button key={p} type="button" className={'tab' + (p === actual ? ' act' : '')} onClick={() => setSel(p)}>
              {p === 'reporte' ? 'Reporte' : paneles[p].titulo}
            </button>
          ))}
        </div>
      )}

      {actual === 'reporte' && (
        <div className="lab-adjunto">
          {imagenes.length > 0 && <VisorImagenes imagenes={imagenes} />}
          {pdfs.length > 0 && (
            <div className="lab-adjuntos-lista">
              {pdfs.map((a) => (
                <a key={a.id} className="btn small" href={a.url} target="_blank" rel="noopener">
                  Abrir {a.titulo || 'reporte'} (PDF) ↗
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {panel && (
        <div className="lab-tabla-wrap">
          {pestanas.length === 1 && <div className="lab-panel-titulo">{panel.titulo}</div>}
          <table className="lab-tabla">
            <thead>
              <tr><th>Parámetro</th><th>Resultado</th><th>Unidad</th><th>Referencia</th></tr>
            </thead>
            <tbody>
              {panel.filas.map((f, i) => {
                const estado = estadoValor(f);
                return (
                  <tr key={i} className={estado ? 'fuera-' + estado : ''}>
                    <td>{f.parametro}</td>
                    <td className="lab-valor">
                      {f.valor || '—'}
                      {estado === 'alto' && <span className="lab-marca" title="Por encima del rango"> ↑</span>}
                      {estado === 'bajo' && <span className="lab-marca" title="Por debajo del rango"> ↓</span>}
                    </td>
                    <td className="lab-unidad">{f.unidad}</td>
                    <td className="lab-ref">{textoReferencia(f)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ---------- visor de imágenes (radiografías y reportes) ----------
const ZOOM_MAX = 6;
const limitar = (min, max, v) => Math.max(min, Math.min(max, v));

function VisorImagenes({ imagenes, inicial = 0 }) {
  const [idx, setIdx] = useState(Math.max(0, inicial));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [invertir, setInvertir] = useState(false);
  const punteros = useRef(new Map());
  const gesto = useRef(null);

  const img = imagenes[Math.min(idx, imagenes.length - 1)];

  function reiniciar() { setZoom(1); setPan({ x: 0, y: 0 }); }
  function ajustes() { setBrillo(100); setContraste(100); setInvertir(false); }
  useEffect(() => { reiniciar(); }, [idx]);

  function zoomA(z) {
    const nuevo = limitar(1, ZOOM_MAX, z);
    setZoom(nuevo);
    if (nuevo === 1) setPan({ x: 0, y: 0 });
  }

  // Arrastrar con un dedo/ratón mueve la imagen; con dos dedos, zoom.
  function abajo(e) {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    iniciarGesto();
  }
  function iniciarGesto() {
    const ps = [...punteros.current.values()];
    if (ps.length >= 2) {
      gesto.current = { tipo: 'pinza', dist: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), zoom };
    } else if (ps.length === 1) {
      gesto.current = { tipo: 'mover', x: ps[0].x, y: ps[0].y, pan };
    } else {
      gesto.current = null;
    }
  }
  function mover(e) {
    if (!punteros.current.has(e.pointerId)) return;
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gesto.current;
    if (!g) return;
    const ps = [...punteros.current.values()];
    if (g.tipo === 'pinza' && ps.length >= 2) {
      const d = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y);
      if (g.dist > 0) zoomA(g.zoom * (d / g.dist));
    } else if (g.tipo === 'mover' && zoom > 1) {
      setPan({ x: g.pan.x + (ps[0].x - g.x), y: g.pan.y + (ps[0].y - g.y) });
    }
  }
  function arriba(e) {
    punteros.current.delete(e.pointerId);
    iniciarGesto();
  }
  function rueda(e) {
    zoomA(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15));
  }

  if (!img) return <p className="muted">No hay imágenes.</p>;

  return (
    <div className="visor-img">
      <div
        className="visor-img-escena"
        onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
        onWheel={rueda}
        onDoubleClick={() => (zoom > 1 ? reiniciar() : zoomA(2.5))}
        style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img.url} alt={img.titulo || 'Imagen del examen'} draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            filter: `brightness(${brillo}%) contrast(${contraste}%)${invertir ? ' invert(1)' : ''}`,
          }}
        />
        {img.titulo && <div className="visor-img-titulo">{img.titulo}</div>}
      </div>

      <div className="visor-img-controles">
        <div className="visor-img-grupo">
          <button type="button" className="btn small" onClick={() => zoomA(zoom / 1.4)} disabled={zoom <= 1} aria-label="Alejar">−</button>
          <span className="visor-img-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn small" onClick={() => zoomA(zoom * 1.4)} disabled={zoom >= ZOOM_MAX} aria-label="Acercar">+</button>
          <button type="button" className="btn small" onClick={reiniciar} disabled={zoom === 1}>Ajustar</button>
        </div>
        <label className="visor-img-slider">
          <span>Brillo</span>
          <input type="range" min="40" max="200" value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} />
        </label>
        <label className="visor-img-slider">
          <span>Contraste</span>
          <input type="range" min="40" max="250" value={contraste} onChange={(e) => setContraste(Number(e.target.value))} />
        </label>
        <div className="visor-img-grupo">
          <button type="button" className={'btn small' + (invertir ? ' btn-primary' : '')} aria-pressed={invertir}
            onClick={() => setInvertir((v) => !v)}>Invertir</button>
          <button type="button" className="btn small" onClick={ajustes}
            disabled={brillo === 100 && contraste === 100 && !invertir}>Restablecer</button>
        </div>
      </div>

      {imagenes.length > 1 && (
        <div className="visor-img-miniaturas">
          {imagenes.map((m, i) => (
            <button key={m.id} type="button" className={'visor-img-mini' + (i === idx ? ' act' : '')}
              onClick={() => setIdx(i)} title={m.titulo || 'Imagen ' + (i + 1)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" draggable={false} />
              <span>{m.titulo || 'Imagen ' + (i + 1)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- monitor de signos vitales ----------
const PRINCIPALES = ['fc', 'spo2', 'pa', 'fr', 'temp'];

function MonitorVitales({ vitales }) {
  const v = vitales || {};
  const pas = aNumero(v.pas);
  const pad = aNumero(v.pad);
  const pam = pas != null && pad != null ? Math.round((pas + 2 * pad) / 3) : null;
  const campo = (id) => CAMPOS_VITALES.find((c) => c.id === id);
  const secundarios = CAMPOS_VITALES.filter((c) => !['fc', 'spo2', 'pas', 'pad', 'fr', 'temp', 'notas'].includes(c.id) && v[c.id]);

  const numero = (id, clase) => {
    if (id === 'pa') {
      if (!v.pas && !v.pad) return null;
      return (
        <div key="pa" className={'mon-num ' + clase}>
          <div className="mon-num-etq">PA <span>mmHg</span></div>
          <div className="mon-num-valor mon-pa">{(v.pas || '—') + '/' + (v.pad || '—')}</div>
          {pam != null && <div className="mon-num-sub">({pam})</div>}
        </div>
      );
    }
    if (!v[id]) return null;
    const c = campo(id);
    return (
      <div key={id} className={'mon-num ' + clase}>
        <div className="mon-num-etq">{c.corta} <span>{c.unidad}</span></div>
        <div className="mon-num-valor">{v[id]}</div>
      </div>
    );
  };

  return (
    <div className="monitor">
      <div className="monitor-pantalla">
        <div className="monitor-ondas">
          <Ondas fc={aNumero(v.fc)} conPleth={!!v.spo2} />
        </div>
        <div className="monitor-numeros">
          {PRINCIPALES.map((id) => numero(id, 'mon-' + id))}
        </div>
      </div>
      {(secundarios.length > 0 || v.notas) && (
        <div className="monitor-extra">
          {secundarios.map((c) => (
            <div key={c.id} className="monitor-extra-item">
              <span className="monitor-extra-etq">{c.etiqueta}</span>
              <span className="monitor-extra-valor">{v[c.id]}{c.unidad ? (c.unidad.startsWith('/') ? '' : ' ') + c.unidad : ''}</span>
            </div>
          ))}
          {v.notas && <div className="monitor-notas">{v.notas}</div>}
        </div>
      )}
    </div>
  );
}

// Curva de un latido (ECG): suma de campanas para P, Q, R, S y T.
// t en segundos desde el inicio del latido; "esc" la acorta con FC alta.
function ecg(t, esc) {
  const g = (c, a, w) => a * Math.exp(-((t - c * esc) ** 2) / (2 * (w * esc) ** 2));
  return g(0.08, 0.12, 0.02) + g(0.165, -0.12, 0.008) + g(0.185, 1, 0.01) + g(0.205, -0.28, 0.01) + g(0.38, 0.26, 0.04);
}
// Onda de pulso (pletismografía): subida rápida, muesca dícrota, bajada.
function pleth(t, periodo) {
  const f = (t / periodo) % 1;
  const g = (c, a, w) => a * Math.exp(-((f - c) ** 2) / (2 * w ** 2));
  return g(0.22, 1, 0.08) + g(0.48, 0.35, 0.07);
}

// Barrido como en un monitor real: la línea avanza de izquierda a derecha
// y borra lo viejo justo delante. Con FC vacía queda una línea plana.
function Ondas({ fc, conPleth }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const periodo = fc && fc > 0 ? 60 / limitar(10, 400, fc) : null;
    const esc = periodo ? Math.min(1, periodo / 0.6) : 1;
    const VEL = 140; // px por segundo
    let ancho = 0, alto = 0, x = 0, t = 0, ultimo = null, previo = null, raf = 0;

    const canales = () => {
      const filas = conPleth ? 2 : 1;
      const h = alto / filas;
      const lista = [{ base: h * 0.62, amp: h * 0.42, color: '#37d39a', valor: (tt) => (periodo ? ecg(tt % periodo, esc) : 0) }];
      if (conPleth) {
        lista.push({ base: h + h * 0.78, amp: h * 0.5, color: '#3fc6cf', valor: (tt) => (periodo ? pleth(tt, periodo) : 0.3) });
      }
      return lista;
    };

    function medir() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      ancho = r.width; alto = r.height;
      canvas.width = Math.max(1, Math.round(ancho * dpr));
      canvas.height = Math.max(1, Math.round(alto * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      x = 0; previo = null;
      if (reducido) dibujarEstatico();
    }

    function dibujarEstatico() {
      for (const c of canales()) {
        ctx.strokeStyle = c.color; ctx.lineWidth = 2; ctx.beginPath();
        for (let px = 0; px <= ancho; px += 1) {
          const y = c.base - c.valor(px / VEL) * c.amp;
          if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }
    }

    function paso(ahora) {
      const dt = ultimo == null ? 0 : Math.min(0.1, (ahora - ultimo) / 1000);
      ultimo = ahora;
      const pasos = Math.max(1, Math.round(dt * VEL));
      const lista = canales();
      for (let i = 0; i < pasos; i++) {
        t += 1 / VEL;
        x += 1;
        if (x > ancho) { x = 0; previo = null; }
        ctx.clearRect(x, 0, 14, alto);
        const ys = lista.map((c) => c.base - c.valor(t) * c.amp);
        if (previo) {
          lista.forEach((c, k) => {
            ctx.strokeStyle = c.color; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(x - 1, previo[k]); ctx.lineTo(x, ys[k]); ctx.stroke();
          });
        }
        previo = ys;
      }
      raf = requestAnimationFrame(paso);
    }

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);
    if (!reducido) raf = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [fc, conPleth]);

  return <canvas ref={ref} className="monitor-canvas" aria-label="Trazo del monitor" role="img" />;
}
