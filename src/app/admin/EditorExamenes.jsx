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
import { MANIQUIES } from '@/lib/maniquies';
import { crearClienteNavegador } from '@/lib/supabase/client';
import {
  PLANTILLAS_LAB, LIMITES, CAMPOS_VITALES,
  panelDesdePlantilla, filaVacia, estadoValor, limpiarLaboratorio, limpiarVitales,
} from '@/lib/examenes';
import { prepararArchivoExamen, tituloDesdeNombre } from '@/lib/preparar-imagen';
import {
  guardarLaboratorio, guardarVitales,
  crearUrlSubidaExamen, guardarArchivoExamen, actualizarArchivoExamen, quitarArchivoExamen,
} from '@/app/actions/admin';
import { IconoLab, IconoRx, IconoMonitor } from '@/app/c/[slug]/Examenes';

const PESTANAS = [
  { id: 'lab', label: 'Laboratorio', Icono: IconoLab },
  { id: 'rx', label: 'Radiografías', Icono: IconoRx },
  { id: 'vitales', label: 'Signos vitales', Icono: IconoMonitor },
];

const igual = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function EditorExamenes({ cuentaId, caso, examenes, ejecutar, onCerrar }) {
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
    if ((labPendiente || vitalesPendientes) && !confirm('Hay cambios sin guardar en los exámenes. ¿Cerrar igual?')) return;
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
      alert('Máximo ' + LIMITES.archivosPorTipo + ' archivos por caso en esta sección.');
      return;
    }
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setSubiendo((files.length > 1 ? `(${i + 1}/${files.length}) ` : '') + 'Preparando ' + f.name + '…');
        if (tipo === 'rx' && (f.type === 'application/pdf' || /\.pdf$/i.test(f.name))) {
          alert('«' + f.name + '»: las radiografías deben ser imágenes (JPG, PNG o WebP).');
          continue;
        }
        let listo;
        try {
          listo = await prepararArchivoExamen(f);
        } catch (err) {
          alert('«' + f.name + '»: ' + err.message);
          continue;
        }
        if (listo.size > LIMITES.mbArchivo * 1024 * 1024) {
          alert('«' + f.name + '» pesa ' + Math.round(listo.size / 1048576) + ' MB; el máximo es ' + LIMITES.mbArchivo + ' MB.');
          continue;
        }
        setSubiendo((files.length > 1 ? `(${i + 1}/${files.length}) ` : '') + 'Subiendo ' + f.name + '…');
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
      alert('No se pudo subir el archivo: ' + (err?.message || err));
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
    if (!confirm('¿Quitar «' + (a.titulo || 'este archivo') + '» del caso?')) return;
    ejecutar(() => quitarArchivoExamen(cuentaId, a.id));
  }

  function listaArchivos(tipo) {
    const lista = archivos.filter((a) => a.tipo === tipo);
    if (!lista.length) return <p className="muted">Todavía no hay archivos.</p>;
    return (
      <div className="ex-archivos">
        {lista.map((a, i) => (
          <div className="ex-archivo" key={a.id}>
            {a.mime === 'application/pdf'
              ? <a className="ex-pdf" href={a.url} target="_blank" rel="noopener">PDF ↗</a>
              // eslint-disable-next-line @next/next/no-img-element
              : <a href={a.url} target="_blank" rel="noopener"><img src={a.url} alt="" /></a>}
            <input defaultValue={a.titulo} maxLength={120} key={a.id + a.titulo}
              placeholder={tipo === 'rx' ? 'Proyección (ej. Tórax LL derecha)' : 'Nombre del reporte'}
              onBlur={(e) => renombrarArchivo(a, e.target.value)} />
            <button className="btn small" disabled={i === 0} onClick={() => moverArchivo(a, -1)} aria-label="Subir">↑</button>
            <button className="btn small" disabled={i === lista.length - 1} onClick={() => moverArchivo(a, 1)} aria-label="Bajar">↓</button>
            <button className="btn small danger" onClick={() => borrarArchivo(a)}>Quitar</button>
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
    if (paneles.length >= LIMITES.paneles) { alert('Máximo ' + LIMITES.paneles + ' tablas por caso.'); return; }
    setPaneles((ps) => [...ps, panelDesdePlantilla(plantilla, caso.especie)]);
  }
  function quitarPanel(i) {
    if (!confirm('¿Quitar la tabla «' + (paneles[i].titulo || 'sin nombre') + '»?')) return;
    setPaneles((ps) => ps.filter((_, k) => k !== i));
  }
  function agregarFila(i) {
    if (paneles[i].filas.length >= LIMITES.filasPorPanel) return;
    setPaneles((ps) => ps.map((p, k) => (k === i ? { ...p, filas: [...p.filas, filaVacia()] } : p)));
  }
  function quitarFila(i, j) {
    setPaneles((ps) => ps.map((p, k) => (k === i ? { ...p, filas: p.filas.filter((_, m) => m !== j) } : p)));
  }

  const nombreEspecie = MANIQUIES.nombre(caso.especie).toLowerCase();

  return (
    <section className="card">
      <div className="editor-head">
        <h3>Exámenes de: <span className="accent">{caso.nombre}</span></h3>
        <button className="btn small" onClick={cerrar}>Cerrar</button>
      </div>
      <p className="muted ex-intro">
        Lo que cargues aquí lo ve el estudiante en botones sobre la ecografía. Las secciones vacías no se muestran.
      </p>

      <div className="tabs">
        {PESTANAS.map(({ id, label, Icono }) => {
          const pendiente = (id === 'lab' && labPendiente) || (id === 'vitales' && vitalesPendientes);
          return (
            <button key={id} className={'tab' + (id === pestana ? ' act' : '')} onClick={() => setPestana(id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Icono size={15} />{label}{pendiente ? ' •' : ''}
            </button>
          );
        })}
      </div>

      {subiendo && <div className="ex-subiendo">{subiendo}</div>}

      {/* -------- Laboratorio -------- */}
      {pestana === 'lab' && (
        <div className="ex-seccion">
          {paneles.map((p, i) => (
            <div className="ex-panel" key={i}>
              <div className="ex-panel-head">
                <input value={p.titulo} maxLength={80} onChange={(e) => cambiarPanel(i, { titulo: e.target.value })}
                  placeholder="Nombre de la tabla (ej. Hemograma)" />
                <button className="btn small danger" onClick={() => quitarPanel(i)}>Quitar tabla</button>
              </div>
              {p.especie && p.especie !== caso.especie && (
                <div className="ex-aviso">
                  Los rangos de esta tabla son de {MANIQUIES.nombre(p.especie).toLowerCase()}, pero el caso ahora es de {nombreEspecie}. Revísalos.
                </div>
              )}
              <div className="ex-tabla-wrap">
                <table className="ex-tabla">
                  <thead>
                    <tr>
                      <th className="col-param">Parámetro</th><th className="col-valor">Resultado</th>
                      <th className="col-unidad">Unidad</th><th className="col-num">Mín.</th><th className="col-num">Máx.</th>
                      <th className="col-ref">Ref. en texto</th><th className="col-x" />
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
                            title={estado === 'alto' ? 'Por encima del rango' : estado === 'bajo' ? 'Por debajo del rango' : ''} /></td>
                          <td><input value={f.unidad} maxLength={20} onChange={(e) => cambiarFila(i, j, 'unidad', e.target.value)} /></td>
                          <td><input value={f.min ?? ''} inputMode="decimal" onChange={(e) => cambiarFila(i, j, 'min', e.target.value)} /></td>
                          <td><input value={f.max ?? ''} inputMode="decimal" onChange={(e) => cambiarFila(i, j, 'max', e.target.value)} /></td>
                          <td><input value={f.ref} maxLength={40} placeholder="ej. Negativo" onChange={(e) => cambiarFila(i, j, 'ref', e.target.value)} /></td>
                          <td><button className="btn small" onClick={() => quitarFila(i, j)} aria-label="Quitar fila" title="Quitar fila">✕</button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ex-acciones" style={{ marginTop: 8 }}>
                <button className="btn small" onClick={() => agregarFila(i)}>+ Fila</button>
              </div>
            </div>
          ))}

          <div className="ex-acciones">
            <select value={plantilla} onChange={(e) => setPlantilla(e.target.value)} aria-label="Plantilla de la tabla">
              {PLANTILLAS_LAB.map((t) => <option key={t.id} value={t.id}>{t.titulo}</option>)}
            </select>
            <button className="btn small" onClick={agregarPanel}>+ Agregar tabla</button>
            <span className="muted" style={{ fontSize: 12.5 }}>
              Las plantillas traen rangos generales de {nombreEspecie}; ajústalos a los de tu laboratorio.
            </span>
          </div>

          <div className="ex-guardar">
            <button className="btn btn-primary" disabled={!labPendiente || guardando} onClick={guardarLab}>
              {guardando ? 'Guardando…' : 'Guardar laboratorio'}
            </button>
            {labPendiente
              ? <span className="muted">Cambios sin guardar.</span>
              : <span className="muted">Todo guardado.</span>}
          </div>

          <h4 style={{ margin: '10px 0 0', fontSize: 14 }}>Reportes adjuntos (foto o PDF)</h4>
          {listaArchivos('lab')}
          <div>
            <input ref={inputLab} type="file" accept="image/*,application/pdf" multiple hidden
              onChange={(e) => { const fs = e.target.files; subir('lab', fs).finally(() => { e.target.value = ''; }); }} />
            <button className="btn small" disabled={!!subiendo} onClick={() => inputLab.current?.click()}>Subir reporte…</button>
            <span className="muted" style={{ fontSize: 12.5, marginLeft: 10 }}>Máximo {LIMITES.mbArchivo} MB por archivo.</span>
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
            <button className="btn small" disabled={!!subiendo} onClick={() => inputRx.current?.click()}>Subir radiografías…</button>
            <span className="muted" style={{ fontSize: 12.5, marginLeft: 10 }}>
              JPG, PNG o WebP (no DICOM). Se reducen solas para que carguen rápido.
            </span>
          </div>
        </div>
      )}

      {/* -------- Signos vitales -------- */}
      {pestana === 'vitales' && (
        <div className="ex-seccion">
          <div className="ex-vitales">
            {CAMPOS_VITALES.map((c) => (
              <label key={c.id} className={c.largo ? 'ex-largo' : ''}>
                {c.etiqueta}
                {c.largo ? (
                  <textarea value={vitales[c.id] || ''} maxLength={300} rows={3}
                    onChange={(e) => setVitales((v) => ({ ...v, [c.id]: e.target.value }))}
                    placeholder="Ej. Pulso femoral débil, jadeo, dolor a la palpación abdominal…" />
                ) : (
                  <span className="ex-campo">
                    <input value={vitales[c.id] || ''} maxLength={30} inputMode={c.numerico ? 'decimal' : 'text'}
                      list={c.sugerencias ? 'sug-' + c.id : undefined}
                      onChange={(e) => setVitales((v) => ({ ...v, [c.id]: e.target.value }))} />
                    {c.unidad && <span className="ex-unidad">{c.unidad}</span>}
                    {c.sugerencias && (
                      <datalist id={'sug-' + c.id}>{c.sugerencias.map((s) => <option key={s} value={s} />)}</datalist>
                    )}
                  </span>
                )}
              </label>
            ))}
          </div>
          <div className="ex-guardar">
            <button className="btn btn-primary" disabled={!vitalesPendientes || guardando} onClick={guardarVit}>
              {guardando ? 'Guardando…' : 'Guardar signos vitales'}
            </button>
            {vitalesPendientes
              ? <span className="muted">Cambios sin guardar.</span>
              : <span className="muted">Todo guardado. La FC marca el ritmo del trazo del monitor.</span>}
          </div>
        </div>
      )}
    </section>
  );
}
