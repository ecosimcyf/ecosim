'use client';
// ============================================================
// Editor de exámenes complementarios de UN caso (panel del profesor):
// laboratorio (tablas de valores + reportes adjuntos), radiografías y
// signos vitales. Lo abre el botón «Exámenes» de cada caso.
//
// Laboratorio y vitales se editan en una copia local y se guardan con un
// botón (son formularios largos: guardar en cada tecla sería lento). Los
// archivos se suben y se guardan en el acto, como los videos.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import {
  PLANTILLAS_LAB, LIMITES, CAMPOS_VITALES,
  panelDesdePlantilla, filaVacia, estadoValor, limpiarLaboratorio, limpiarVitales, enIdioma,
} from '@/lib/examenes';
import { unir } from '@/lib/i18n/config';
import { useIdioma, useT } from '@/lib/i18n/cliente';
import { PANEL } from '@/lib/i18n/textos/panel';
import { EXAMENES_TXT } from '@/lib/i18n/textos/examenes';
import { prepararArchivoExamen, tituloDesdeNombre } from '@/lib/preparar-imagen';
import {
  guardarLaboratorio, guardarVitales,
  crearUrlSubidaExamen, guardarArchivoExamen, actualizarArchivoExamen, quitarArchivoExamen,
} from '@/app/actions/admin';
import { IconoLab, IconoRx, IconoMonitor } from '@/app/c/[slug]/Examenes';

const TEXTOS = unir(PANEL, EXAMENES_TXT);
// El nombre de cada pestaña: t('ex.' + id).
const PESTANAS = [
  { id: 'lab', Icono: IconoLab },
  { id: 'rx', Icono: IconoRx },
  { id: 'vitales', Icono: IconoMonitor },
];

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function EditorExamenes({ cuentaId, caso, examenes, ejecutar, onCerrar }) {
  const t = useT(TEXTOS);
  const idioma = useIdioma();
  const [pestana, setPestana] = useState('lab');
  const guardados = {
    laboratorio: examenes?.laboratorio || [],
    vitales: examenes?.vitales || {},
  };
  const archivos = examenes?.archivos || [];

  // Copias locales en edición (se reinician al cambiar de caso).
  const [paneles, setPaneles] = useState(guardados.laboratorio);
  const [vitales, setVitales] = useState(guardados.vitales);
  useEffect(() => {
    setPaneles(examenes?.laboratorio || []);
    setVitales(examenes?.vitales || {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caso.id]);

  const labPendiente = !igual(limpiarLaboratorio(paneles), limpiarLaboratorio(guardados.laboratorio));
  const vitalesPendientes = !igual(limpiarVitales(vitales), limpiarVitales(guardados.vitales));
  const [guardando, setGuardando] = useState(false);

  // Avisar antes de salir con cambios sin guardar.
  useEffect(() => {
    if (!labPendiente && !vitalesPendientes) return;
    const aviso = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [labPendiente, vitalesPendientes]);

  function cerrar() {
    if ((labPendiente || vitalesPendientes) && !confirm(t('ed.confirmCerrar'))) return;
    onCerrar();
  }

  async function guardarLab() {
    setGuardando(true);
    const r = await ejecutar(() => guardarLaboratorio(cuentaId, caso.id, paneles));
    if (r?.examenesPorCaso) setPaneles(r.examenesPorCaso[caso.id]?.laboratorio || []);
    setGuardando(false);
  }
  async function guardarVit() {
    setGuardando(true);
    const r = await ejecutar(() => guardarVitales(cuentaId, caso.id, vitales));
    if (r?.examenesPorCaso) setVitales(r.examenesPorCaso[caso.id]?.vitales || {});
    setGuardando(false);
  }

  // ---------- archivos ----------
  const [subiendo, setSubiendo] = useState(null); // texto de progreso o null
  const inputRx = useRef(null);
  const inputLab = useRef(null);

  async function subir(tipo, lista) {
    const files = [...(lista || [])];
    if (!files.length) return;
    const yaHay = archivos.filter((a) => a.tipo === tipo).length;
    if (yaHay + files.length > LIMITES.archivosPorTipo) {
      alert(t('ed.maxArchivos', { n: LIMITES.archivosPorTipo }));
      return;
    }
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const cuenta = files.length > 1 ? `(${i + 1}/${files.length}) ` : '';
        setSubiendo(cuenta + t('ed.preparando', { nombre: f.name }));
        if (tipo === 'rx' && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) {
          alert(t('ed.rxSoloImg', { nombre: f.name }));
          continue;
        }
        let listo;
        try {
          listo = await prepararArchivoExamen(f);
        } catch (err) {
          // prepararArchivoExamen lanza claves de err.* (ver preparar-imagen.js).
          alert(t('ed.errorArchivo', { nombre: f.name, error: t(err.message) }));
          continue;
        }
        if (listo.size > LIMITES.mbArchivo * 1024 * 1024) {
          alert(t('ed.pesa', { nombre: f.name, mb: Math.round(listo.size / 1048576), max: LIMITES.mbArchivo }));
          continue;
        }
        setSubiendo(cuenta + t('ed.subiendo', { nombre: f.name }));
        const subida = await ejecutar(() => crearUrlSubidaExamen(cuentaId, listo.size, listo.type), { fusionarResultado: false });
        if (!subida) return;
        const { error } = await crearClienteNavegador().storage.from('examenes')
          // Cada archivo va a un path nuevo que nunca se reescribe: puede cachear "para siempre".
          .uploadToSignedUrl(subida.path, subida.token, listo, { cacheControl: '31536000', contentType: listo.type });
        if (error) throw error;
        const ok = await ejecutar(() => guardarArchivoExamen(cuentaId, caso.id, tipo, subida.path, tituloDesdeNombre(f.name)));
        if (!ok) return;
      }
    } catch (err) {
      alert(t('ed.noSubir', { error: err?.message || err }));
    } finally {
      setSubiendo(null);
    }
  }

  function renombrarArchivo(a, titulo) {
    if (titulo.trim() === (a.titulo || '')) return;
    ejecutar(() => actualizarArchivoExamen(cuentaId, a.id, { titulo }));
  }
  function moverArchivo(a, mover) {
    ejecutar(() => actualizarArchivoExamen(cuentaId, a.id, { mover }));
  }
  function borrarArchivo(a) {
    if (!confirm(t('ed.confirmQuitarArch', { titulo: a.titulo }))) return;
    ejecutar(() => quitarArchivoExamen(cuentaId, a.id));
  }

  function listaArchivos(tipo) {
    const lista = archivos.filter((a) => a.tipo === tipo);
    if (!lista.length) return <p className="muted">{t('ed.sinArchivos')}</p>;
    return (
      <div className="ex-archivos">
        {lista.map((a, i) => (
          <div className="ex-archivo" key={a.id}>
            {a.mime === 'application/pdf'
              ? <a className="ex-pdf" href={a.url} target="_blank" rel="noopener">PDF ↗</a>
              // eslint-disable-next-line @next/next/no-img-element
              : <a href={a.url} target="_blank" rel="noopener"><img src={a.url} alt="" /></a>}
            <input defaultValue={a.titulo} maxLength={120} key={a.id + a.titulo}
              placeholder={tipo === 'rx' ? t('ed.phRx') : t('ed.phReporte')}
              onBlur={(e) => renombrarArchivo(a, e.target.value)} />
            <button className="btn small" disabled={i === 0} onClick={() => moverArchivo(a, -1)}
              aria-label={t('ed.subir')} title={t('ed.subir')}>↑</button>
            <button className="btn small" disabled={i === lista.length - 1} onClick={() => moverArchivo(a, 1)}
              aria-label={t('ed.bajar')} title={t('ed.bajar')}>↓</button>
            <button className="btn small danger" onClick={() => borrarArchivo(a)}>{t('ed.quitar')}</button>
          </div>
        ))}
      </div>
    );
  }

  // ---------- laboratorio: edición local ----------
  const [plantilla, setPlantilla] = useState('hemograma');
  function cambiarPanel(i, cambio) {
    setPaneles((ps) => ps.map((p, k) => (k === i ? { ...p, ...cambio } : p)));
  }
  function cambiarFila(i, j, campo, valor) {
    setPaneles((ps) => ps.map((p, k) => (k !== i ? p : {
      ...p, filas: p.filas.map((f, m) => (m === j ? { ...f, [campo]: valor } : f)),
    })));
  }
  function agregarPanel() {
    if (paneles.length >= LIMITES.paneles) { alert(t('ed.maxTablas', { n: LIMITES.paneles })); return; }
    setPaneles((ps) => [...ps, panelDesdePlantilla(plantilla, caso.especie, idioma)]);
  }
  function quitarPanel(i) {
    if (!confirm(t('ed.confirmQuitarTabla', { titulo: paneles[i].titulo }))) return;
    setPaneles((ps) => ps.filter((_, k) => k !== i));
  }
  function agregarFila(i) {
    if (paneles[i].filas.length >= LIMITES.filasPorPanel) return;
    setPaneles((ps) => ps.map((p, k) => (k === i ? { ...p, filas: [...p.filas, filaVacia()] } : p)));
  }
  function quitarFila(i, j) {
    setPaneles((ps) => ps.map((p, k) => (k === i ? { ...p, filas: p.filas.filter((_, m) => m !== j) } : p)));
  }

  const especieMin = (e) => t('especieMin.' + (e === 'gato' ? 'gato' : 'perro'));
  const nombreEspecie = especieMin(caso.especie);

  return (
    <section className="card">
      <div className="editor-head">
        <h3>{t('ed.titulo')} <span className="accent">{caso.nombre}</span></h3>
        <button className="btn small" onClick={cerrar}>{t('comun.cerrar')}</button>
      </div>
      <p className="muted ex-intro">{t('ed.intro')}</p>

      <div className="tabs">
        {PESTANAS.map(({ id, Icono }) => {
          const pendiente = (id === 'lab' && labPendiente) || (id === 'vitales' && vitalesPendientes);
          return (
            <button key={id} className={'tab' + (id === pestana ? ' act' : '')} onClick={() => setPestana(id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icono size={15} />{t('ex.' + id)}{pendiente ? ' •' : ''}
            </button>
          );
        })}
      </div>

      {subiendo && <div className="ex-subiendo">{subiendo}</div>}

      {/* -------- Laboratorio -------- */}
      {pestana === 'lab' && (
        <div className="ex-seccion">
          {/* Lo principal: subir el reporte tal cual (foto o PDF). */}
          <div className="ex-bloque">
            <h4 className="ex-subtitulo">{t('ed.reporteTitulo')}</h4>
            <p className="muted ex-nota">{t('ed.reporteNota')}</p>
            {listaArchivos('lab')}
            <div className="ex-acciones">
              <input ref={inputLab} type="file" accept="image/*,application/pdf" multiple hidden
                onChange={(e) => { const fs = e.target.files; subir('lab', fs).finally(() => { e.target.value = ''; }); }} />
              <button className="btn btn-primary" disabled={!!subiendo} onClick={() => inputLab.current?.click()}>
                {t('ed.subirReporte')}
              </button>
              <span className="muted" style={{ fontSize: 12.5 }}>{t('ed.maxMb', { mb: LIMITES.mbArchivo })}</span>
            </div>
          </div>

          {/* Opcional: escribir los valores en una tabla. */}
          <div className="ex-bloque ex-bloque-secundario">
            <h4 className="ex-subtitulo">{t('ed.tablasTitulo')} <span className="muted">{t('ed.opcional')}</span></h4>
            <p className="muted ex-nota">{t('ed.tablasNota')}</p>
          {paneles.map((p, i) => (
            <div className="ex-panel" key={i}>
              <div className="ex-panel-head">
                <input value={p.titulo} maxLength={80} onChange={(e) => cambiarPanel(i, { titulo: e.target.value })}
                  placeholder={t('ed.phTabla')} />
                <button className="btn small danger" onClick={() => quitarPanel(i)}>{t('ed.quitarTabla')}</button>
              </div>
              {p.especie && p.especie !== caso.especie && (
                <div className="ex-aviso">{t('ed.avisoEspecie', { de: especieMin(p.especie), a: nombreEspecie })}</div>
              )}
              <div className="ex-tabla-wrap">
                <table className="ex-tabla">
                  <thead>
                    <tr>
                      <th className="col-param">{t('ex.parametro')}</th><th className="col-valor">{t('ex.resultado')}</th>
                      <th className="col-unidad">{t('ex.unidad')}</th><th className="col-num">{t('ed.min')}</th><th className="col-num">{t('ed.max')}</th>
                      <th className="col-ref">{t('ed.refTexto')}</th><th className="col-x" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.filas.map((f, j) => {
                      const estado = estadoValor(f);
                      return (
                        <tr key={j} className={estado ? 'fuera-' + estado : ''}>
                          <td><input value={f.parametro} maxLength={60} onChange={(e) => cambiarFila(i, j, 'parametro', e.target.value)} /></td>
                          <td><input className="in-valor" value={f.valor} maxLength={40} inputMode="decimal"
                            onChange={(e) => cambiarFila(i, j, 'valor', e.target.value)}
                            title={estado === 'alto' ? t('ex.alto') : estado === 'bajo' ? t('ex.bajo') : ''} /></td>
                          <td><input value={f.unidad} maxLength={20} onChange={(e) => cambiarFila(i, j, 'unidad', e.target.value)} /></td>
                          <td><input value={f.min ?? ''} inputMode="decimal" onChange={(e) => cambiarFila(i, j, 'min', e.target.value)} /></td>
                          <td><input value={f.max ?? ''} inputMode="decimal" onChange={(e) => cambiarFila(i, j, 'max', e.target.value)} /></td>
                          <td><input value={f.ref} maxLength={40} placeholder={t('ed.phRef')} onChange={(e) => cambiarFila(i, j, 'ref', e.target.value)} /></td>
                          <td><button className="btn small" onClick={() => quitarFila(i, j)} aria-label={t('ed.quitarFila')} title={t('ed.quitarFila')}>✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ex-acciones" style={{ marginTop: 8 }}>
                <button className="btn small" onClick={() => agregarFila(i)}>{t('ed.fila')}</button>
              </div>
            </div>
          ))}

          <div className="ex-acciones">
            <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)} aria-label={t('ed.plantilla')}>
              {PLANTILLAS_LAB.map((p) => <option key={p.id} value={p.id}>{enIdioma(p.titulo, idioma)}</option>)}
            </select>
            <button className="btn small" onClick={agregarPanel}>{t('ed.agregarTabla')}</button>
            <span className="muted" style={{ fontSize: 12.5 }}>{t('ed.plantillasNota', { especie: nombreEspecie })}</span>
          </div>

          {(paneles.length > 0 || labPendiente) && (
            <div className="ex-guardar">
              <button className="btn btn-primary" disabled={!labPendiente || guardando} onClick={guardarLab}>
                {guardando ? t('ed.guardando') : t('ed.guardarTablas')}
              </button>
              {labPendiente
                ? <span className="muted">{t('ed.sinGuardar')}</span>
                : <span className="muted">{t('ed.guardado')}</span>}
            </div>
          )}
          </div>
        </div>
      )}

      {/* -------- Radiografías -------- */}
      {pestana === 'rx' && (
        <div className="ex-seccion">
          {listaArchivos('rx')}
          <div>
            <input ref={inputRx} type="file" accept="image/*" multiple hidden
              onChange={(e) => { const fs = e.target.files; subir('rx', fs).finally(() => { e.target.value = ''; }); }} />
            <button className="btn small" disabled={!!subiendo} onClick={() => inputRx.current?.click()}>{t('ed.subirRx')}</button>
            <span className="muted" style={{ fontSize: 12.5, marginLeft: 10 }}>{t('ed.rxNota')}</span>
          </div>
        </div>
      )}

      {/* -------- Signos vitales -------- */}
      {pestana === 'vitales' && (
        <div className="ex-seccion">
          <div className="ex-vitales">
            {CAMPOS_VITALES.map((c) => {
              const unidad = t('vit.' + c.id + '.unidad');
              return (
                <label key={c.id} className={c.largo ? 'ex-largo' : ''}>
                  {t('vit.' + c.id + '.etiqueta')}
                  {c.largo ? (
                    <textarea value={vitales[c.id] || ''} maxLength={300} rows={3}
                      onChange={(e) => setVitales((v) => ({ ...v, [c.id]: e.target.value }))}
                      placeholder={t('ed.phNotas')} />
                  ) : (
                    <span className="ex-campo">
                      <input value={vitales[c.id] || ''} maxLength={30} inputMode={c.numerico ? 'decimal' : 'text'}
                        list={c.sugerencias ? 'sug-' + c.id : undefined}
                        onChange={(e) => setVitales((v) => ({ ...v, [c.id]: e.target.value }))} />
                      {unidad && <span className="ex-unidad">{unidad}</span>}
                      {c.sugerencias && (
                        <datalist id={'sug-' + c.id}>
                          {t('vit.' + c.id + '.sugerencias').map((s) => <option key={s} value={s} />)}
                        </datalist>
                      )}
                    </span>
                  )}
                </label>
              );
            })}
          </div>
          <div className="ex-guardar">
            <button className="btn btn-primary" disabled={!vitalesPendientes || guardando} onClick={guardarVit}>
              {guardando ? t('ed.guardando') : t('ed.guardarVitales')}
            </button>
            {vitalesPendientes
              ? <span className="muted">{t('ed.sinGuardar')}</span>
              : <span className="muted">{t('ed.guardadoVit')}</span>}
          </div>
        </div>
      )}
    </section>
  );
}
