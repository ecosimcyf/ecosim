'use client';
// ============================================================
// Exámenes complementarios en la vista del estudiante: botones del visor
// y las tres ventanas (laboratorio, radiografías, monitor de signos
// vitales). Los datos llegan ya cargados con el caso (cargarDatosDeCaso).
// ============================================================
import { useState, useEffect, useRef } from 'react';
// Del archivo "lectura" (no de examenes.js): así no se descargan al teléfono
// del estudiante las plantillas de laboratorio del panel.
import { CAMPOS_VITALES, estadoValor, textoReferencia, aNumero, presionMedia } from '@/lib/examenes-lectura';
import { useIdioma, useT } from '@/lib/i18n/cliente';
import { EXAMENES_TXT } from '@/lib/i18n/textos/examenes';

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

// El nombre de cada uno, en el idioma de la vista: t('ex.' + id).
export const EXAMENES = [
  { id: 'lab', Icono: IconoLab },
  { id: 'rx', Icono: IconoRx },
  { id: 'vitales', Icono: IconoMonitor },
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
  const t = useT(EXAMENES_TXT);
  const lista = examenesDisponibles(examenes);
  if (!lista.length) return null;
  return (
    <div className="examenes-barra">
      {lista.map(({ id, Icono }) => (
        <button key={id} type="button" className="btn small btn-examen" onClick={() => onAbrir(id)} title={t('ex.' + id)}>
          <Icono /><span className="btn-examen-txt">{t('ex.' + id)}</span>
        </button>
      ))}
    </div>
  );
}

// ---------- ventana contenedora ----------
export function VentanaExamen({ tipo, examenes, casoNombre, onCerrar }) {
  const t = useT(EXAMENES_TXT);
  const def = EXAMENES.find((e) => e.id === tipo);
  const cerrarRef = useRef(null);
  // Foco al abrir en el botón de cerrar; al cerrar, de vuelta a donde estaba.
  useEffect(() => {
    const previo = document.activeElement;
    cerrarRef.current?.focus();
    return () => { try { previo?.focus?.(); } catch {} };
  }, []);
  if (!def) return null;
  const { Icono } = def;
  return (
    <div className="overlay overlay-examen" onClick={onCerrar}>
      <div className={'examen-box examen-' + tipo} role="dialog" aria-modal="true" aria-label={t('ex.' + tipo)}
        onClick={(e) => e.stopPropagation()}>
        <div className="examen-head">
          <Icono size={20} />
          <div className="examen-head-txt">
            <div className="examen-eyebrow">{casoNombre}</div>
            <div className="examen-titulo">{t('ex.' + tipo)}</div>
          </div>
          <button ref={cerrarRef} type="button" className="btn small examen-cerrar" onClick={onCerrar}
            aria-label={t('ex.cerrar')}>✕</button>
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
  const t = useT(EXAMENES_TXT);
  const idioma = useIdioma();
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
              {p === 'reporte' ? t('ex.reporte') : (paneles[p].titulo || t('ex.lab'))}
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
                  {t('ex.abrirPdf', { titulo: a.titulo })}
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {panel && (
        <div className="lab-tabla-wrap">
          {pestanas.length === 1 && <div className="lab-panel-titulo">{panel.titulo || t('ex.lab')}</div>}
          <table className="lab-tabla">
            <thead>
              <tr><th>{t('ex.parametro')}</th><th>{t('ex.resultado')}</th><th>{t('ex.unidad')}</th><th>{t('ex.referencia')}</th></tr>
            </thead>
            <tbody>
              {panel.filas.map((f, i) => {
                const estado = estadoValor(f);
                return (
                  <tr key={i} className={estado ? 'fuera-' + estado : ''}>
                    <td>{f.parametro}</td>
                    <td className="lab-valor">
                      {f.valor || '—'}
                      {estado === 'alto' && <span className="lab-marca" title={t('ex.alto')}> ↑</span>}
                      {estado === 'bajo' && <span className="lab-marca" title={t('ex.bajo')}> ↓</span>}
                    </td>
                    <td className="lab-unidad">{f.unidad}</td>
                    <td className="lab-ref">{textoReferencia(f, idioma)}</td>
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
  const t = useT(EXAMENES_TXT);
  const [idx, setIdx] = useState(Math.max(0, inicial));
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [brillo, setBrillo] = useState(100);
  const [contraste, setContraste] = useState(100);
  const [invertir, setInvertir] = useState(false);
  const punteros = useRef(new Map());
  const gesto = useRef(null);
  const escenaRef = useRef(null);
  const imgRef = useRef(null);
  // Espejos de zoom/pan para los manejadores nativos (la rueda), que no ven
  // el estado más reciente de React.
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  zoomRef.current = zoom;
  panRef.current = pan;

  const img = imagenes[Math.min(idx, imagenes.length - 1)];

  // El desplazamiento máximo es el que deja el borde de la imagen ampliada
  // justo en el borde de la escena: la imagen nunca se pierde de vista. Si en
  // un eje la imagen cabe entera, ahí no se desplaza.
  function fijarPan(p, z) {
    const e = escenaRef.current;
    const im = imgRef.current;
    if (!e || !im) return p;
    const mx = Math.max(0, (im.offsetWidth * z - e.clientWidth) / 2);
    const my = Math.max(0, (im.offsetHeight * z - e.clientHeight) / 2);
    return { x: limitar(-mx, mx, p.x), y: limitar(-my, my, p.y) };
  }

  function reiniciar() { zoomRef.current = 1; setZoom(1); setPan({ x: 0, y: 0 }); }
  function ajustes() { setBrillo(100); setContraste(100); setInvertir(false); }
  useEffect(() => { reiniciar(); }, [idx]);

  function zoomA(z) {
    const nuevo = limitar(1, ZOOM_MAX, z);
    zoomRef.current = nuevo;
    setZoom(nuevo);
    setPan((p) => (nuevo === 1 ? { x: 0, y: 0 } : fijarPan(p, nuevo)));
  }

  // Rueda del ratón / pellizco del trackpad (que llega como ctrl+rueda):
  // zoom en la imagen. Tiene que ser un oyente NATIVO no pasivo: el de React
  // es pasivo y no deja impedir que el navegador amplíe toda la página.
  const hayImagen = !!img;
  useEffect(() => {
    const el = escenaRef.current;
    if (!el) return undefined;
    const alRodar = (e) => {
      e.preventDefault();
      const factor = e.ctrlKey ? Math.exp(-e.deltaY * 0.01) : (e.deltaY < 0 ? 1.15 : 1 / 1.15);
      zoomA(zoomRef.current * factor);
    };
    el.addEventListener('wheel', alRodar, { passive: false });
    return () => el.removeEventListener('wheel', alRodar);
  }, [hayImagen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrastrar con un dedo/ratón mueve la imagen; con dos dedos, zoom.
  function abajo(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    punteros.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    iniciarGesto();
  }
  function iniciarGesto() {
    const ps = [...punteros.current.values()];
    if (ps.length >= 2) {
      gesto.current = { tipo: 'pinza', dist: Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y), zoom: zoomRef.current };
    } else if (ps.length === 1) {
      gesto.current = { tipo: 'mover', x: ps[0].x, y: ps[0].y, pan: panRef.current };
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
    } else if (g.tipo === 'mover' && zoomRef.current > 1) {
      setPan(fijarPan({ x: g.pan.x + (ps[0].x - g.x), y: g.pan.y + (ps[0].y - g.y) }, zoomRef.current));
    }
  }
  function arriba(e) {
    punteros.current.delete(e.pointerId);
    iniciarGesto();
  }

  if (!img) return <p className="muted">{t('ex.sinImagenes')}</p>;

  return (
    <div className="visor-img">
      <div
        ref={escenaRef}
        className="visor-img-escena"
        onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba}
        onDoubleClick={() => (zoom > 1 ? reiniciar() : zoomA(2.5))}
        style={{ cursor: zoom > 1 ? 'grab' : 'zoom-in' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={img.url} alt={img.titulo || t('ex.altImagen')} draggable={false}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            filter: `brightness(${brillo}%) contrast(${contraste}%)${invertir ? ' invert(1)' : ''}`,
          }}
        />
        {img.titulo && <div className="visor-img-titulo">{img.titulo}</div>}
      </div>

      <div className="visor-img-controles">
        <div className="visor-img-grupo">
          <button type="button" className="btn small" onClick={() => zoomA(zoom / 1.4)} disabled={zoom <= 1} aria-label={t('ex.alejar')}>−</button>
          <span className="visor-img-zoom">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn small" onClick={() => zoomA(zoom * 1.4)} disabled={zoom >= ZOOM_MAX} aria-label={t('ex.acercar')}>+</button>
          <button type="button" className="btn small" onClick={reiniciar} disabled={zoom === 1}>{t('ex.ajustar')}</button>
        </div>
        <label className="visor-img-slider">
          <span>{t('ex.brillo')}</span>
          <input type="range" min="40" max="200" value={brillo} onChange={(e) => setBrillo(Number(e.target.value))} />
        </label>
        <label className="visor-img-slider">
          <span>{t('ex.contraste')}</span>
          <input type="range" min="40" max="250" value={contraste} onChange={(e) => setContraste(Number(e.target.value))} />
        </label>
        <div className="visor-img-grupo">
          <button type="button" className={'btn small' + (invertir ? ' btn-primary' : '')} aria-pressed={invertir}
            onClick={() => setInvertir((v) => !v)}>{t('ex.invertir')}</button>
          <button type="button" className="btn small" onClick={ajustes}
            disabled={brillo === 100 && contraste === 100 && !invertir}>{t('ex.restablecer')}</button>
        </div>
      </div>

      {imagenes.length > 1 && (
        <div className="visor-img-miniaturas">
          {imagenes.map((m, i) => (
            <button key={m.id} type="button" className={'visor-img-mini' + (i === idx ? ' act' : '')}
              onClick={() => setIdx(i)} title={m.titulo || t('ex.imagenN', { n: i + 1 })}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" draggable={false} />
              <span>{m.titulo || t('ex.imagenN', { n: i + 1 })}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- monitor de signos vitales ----------
// Como un monitor real: cada onda va en su propia fila con SU número al
// frente (FC con el ECG, SpO₂ con la pletismografía), y debajo, en una
// franja, la presión, la FR y la temperatura. Cada fila es un grid
// (traza | número): así el número queda siempre a la altura de su onda.
// Ambas ondas comparten el reloj (el mismo "origen"), así que laten juntas.

function MonitorVitales({ vitales }) {
  const t = useT(EXAMENES_TXT);
  const v = vitales || {};
  const pam = presionMedia(v.pas, v.pad);
  const hayPa = !!(v.pas || v.pad);
  const secundarios = CAMPOS_VITALES.filter((c) => !['fc', 'spo2', 'pas', 'pad', 'fr', 'temp', 'notas'].includes(c.id) && v[c.id]);
  const fc = aNumero(v.fc);
  // Un solo reloj para las dos ondas (se fija al abrir el monitor).
  const origen = useRef(null);
  if (origen.current == null) origen.current = typeof performance !== 'undefined' ? performance.now() : 0;

  const canal = (id, clase, tipo) => (
    <div className={'mon-canal ' + clase}>
      <div className="mon-traza">
        <OndaCanal tipo={tipo} fc={fc} origen={origen} etiqueta={t('ex.trazo') + ' — ' + t('vit.' + id + '.corta')} />
      </div>
      <div className="mon-num">
        <div className="mon-num-etq">{t('vit.' + id + '.corta')} <span>{t('vit.' + id + '.unidad')}</span></div>
        <div className="mon-num-valor">{v[id] || '—'}</div>
      </div>
    </div>
  );
  const dato = (id, clase) => (
    <div key={id} className={'mon-dato ' + clase}>
      <div className="mon-num-etq">{t('vit.' + id + '.corta')} <span>{t('vit.' + id + '.unidad')}</span></div>
      <div className="mon-num-valor">{v[id]}</div>
    </div>
  );

  return (
    <div className="monitor">
      <div className="monitor-pantalla">
        {canal('fc', 'mon-fc', 'ecg')}
        {v.spo2 && canal('spo2', 'mon-spo2', 'pleth')}
        {(hayPa || v.fr || v.temp) && (
          <div className="mon-franja">
            {hayPa && (
              <div className="mon-dato mon-pa">
                <div className="mon-num-etq">{t('ex.pa')} <span>mmHg</span></div>
                <div className="mon-num-valor">
                  {(v.pas || '—') + '/' + (v.pad || '—')}
                  {pam != null && <span className="mon-num-sub"> ({pam})</span>}
                </div>
              </div>
            )}
            {v.fr && dato('fr', 'mon-fr')}
            {v.temp && dato('temp', 'mon-temp')}
          </div>
        )}
      </div>
      {(secundarios.length > 0 || v.notas) && (
        <div className="monitor-extra">
          {secundarios.map((c) => {
            const unidad = t('vit.' + c.id + '.unidad');
            return (
              <div key={c.id} className="monitor-extra-item">
                <span className="monitor-extra-etq">{t('vit.' + c.id + '.etiqueta')}</span>
                <span className="monitor-extra-valor">{v[c.id]}{unidad ? (unidad.startsWith('/') ? '' : ' ') + unidad : ''}</span>
              </div>
            );
          })}
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
// y borra lo viejo justo delante. Un canvas por onda; la posición del trazo
// y el instante de la onda salen del reloj compartido ("origen"), por eso el
// ECG y la pletismografía van sincronizados. Con FC vacía queda una línea
// plana. El color del trazo es el `color` CSS de la fila (mon-fc, mon-spo2).
function OndaCanal({ tipo, fc, origen, etiqueta }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    const reducido = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const periodo = fc && fc > 0 ? 60 / limitar(10, 400, fc) : null;
    const esc = periodo ? Math.min(1, periodo / 0.6) : 1;
    const VEL = 140; // px por segundo
    const esEcg = tipo === 'ecg';
    let ancho = 0, alto = 0, ultimoK = 0, previo = null, raf = 0, color = '#37d39a';

    const valor = (tt) => {
      if (!periodo) return esEcg ? 0 : 0.3; // sin FC: línea plana
      return esEcg ? ecg(tt % periodo, esc) : pleth(tt, periodo);
    };
    // Línea base y amplitud según el alto de la fila.
    const yDe = (tt) => {
      const base = alto * (esEcg ? 0.68 : 0.84);
      const amp = alto * (esEcg ? 0.5 : 0.64);
      return base - valor(tt) * amp;
    };
    const ahoraK = () => Math.floor(((performance.now() - origen.current) / 1000) * VEL);

    function medir() {
      const r = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      ancho = r.width; alto = r.height;
      canvas.width = Math.max(1, Math.round(ancho * dpr));
      canvas.height = Math.max(1, Math.round(alto * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, ancho, alto);
      color = getComputedStyle(canvas).color || color;
      previo = null;
      ultimoK = ahoraK();
      if (reducido) dibujarEstatico();
    }

    function dibujarEstatico() {
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.beginPath();
      for (let px = 0; px <= ancho; px += 1) {
        const y = yDe(px / VEL);
        if (px === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
      }
      ctx.stroke();
    }

    function paso() {
      const anchoPx = Math.max(1, Math.floor(ancho));
      const k = ahoraK();
      // Pestaña dormida: no se recupera todo el tiempo perdido de golpe.
      if (k - ultimoK > VEL * 0.25) ultimoK = k - Math.round(VEL * 0.25);
      ctx.strokeStyle = color; ctx.lineWidth = 2;
      while (ultimoK < k) {
        ultimoK += 1;
        const x = ultimoK % anchoPx;
        if (x === 0) previo = null;
        ctx.clearRect(x, 0, 14, alto);
        // Cerca del borde derecho, lo de delante sigue al otro lado.
        if (x + 14 > anchoPx) ctx.clearRect(0, 0, x + 14 - anchoPx, alto);
        const y = yDe(ultimoK / VEL);
        if (previo != null) {
          ctx.beginPath(); ctx.moveTo(x - 1, previo); ctx.lineTo(x, y); ctx.stroke();
        }
        previo = y;
      }
      raf = requestAnimationFrame(paso);
    }

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(canvas);
    if (!reducido) raf = requestAnimationFrame(paso);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [fc, tipo, origen]);

  return <canvas ref={ref} className="monitor-canvas" aria-label={etiqueta} role="img" />;
}
