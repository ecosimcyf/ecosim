'use client';
// ============================================================
// Vista del estudiante, dentro de una cuenta (/c/[slug]).
//
// Primero se ve un MENÚ con los casos activos de ESTA cuenta (puede haber
// varios a la vez). Al elegir uno se cargan sus datos y se PRECARGAN todos
// sus videos en memoria, mostrando una barra de progreso — así, al mantener
// presionado un punto, el video ya está listo y se reproduce al instante.
// Los videos de los demás casos activos nunca se descargan.
//
// El <video> se maneja de forma imperativa (poner src, silenciar y
// reproducir por código), igual que en la app de escritorio.
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { listarCasosActivos, cargarDatosDeCaso } from '@/lib/datos';
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

export default function VistaPrincipal({ casosActivosIniciales, cuentaId }) {
  const [casosActivos, setCasosActivos] = useState(casosActivosIniciales);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null); // null => menú
  const [avisoCasoDesactivado, setAvisoCasoDesactivado] = useState(false);
  const [vistaDescripcion, setVistaDescripcion] = useState(null); // {caso, entrarAlCerrar} | null

  const [datos, setDatos] = useState(null); // datos del caso elegido (null en el menú)
  const [vista, setVista] = useState('ventral');
  const [videoUrl, setVideoUrl] = useState(null); // null => reposo
  const [congelado, setCongelado] = useState(false);
  const [ayuda, setAyuda] = useState(false);
  // Pantalla completa: en el móvil no hay tecla F11, así que ofrecemos botón.
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const [soportaPantallaCompleta, setSoportaPantallaCompleta] = useState(false);
  // Estado de la precarga de videos.
  const [precarga, setPrecarga] = useState({ cargando: false, pct: 0 });
  // Falló la carga del caso (red caída): se ofrece reintentar o volver.
  const [errorCarga, setErrorCarga] = useState(false);

  const videoRef = useRef(null);
  const graciaRef = useRef(null);
  const blobsRef = useRef({}); // punto_id -> blob URL (video ya descargado)
  const casoSeleccionadoRef = useRef(null); // espejo de casoSeleccionado para el sondeo
  const cargaIdRef = useRef(0); // descarta respuestas de un caso que ya no es el elegido

  const irAReposo = useCallback(() => setVideoUrl(null), []);

  useEffect(() => {
    casoSeleccionadoRef.current = casoSeleccionado;
  }, [casoSeleccionado]);

  // -------- Elegir un caso del menú / volver al menú --------
  const abrirCaso = useCallback(async (casoId) => {
    const miCarga = ++cargaIdRef.current;
    setAvisoCasoDesactivado(false);
    setErrorCarga(false);
    setCasoSeleccionado(casoId);
    setDatos(null);
    let d;
    try {
      d = await cargarDatosDeCaso(crearClienteNavegador(), casoId, cuentaId);
    } catch {
      d = { casoId: null, error: true };
    }
    // Si mientras tanto el estudiante volvió al menú o eligió otro caso,
    // esta respuesta ya no le corresponde.
    if (miCarga !== cargaIdRef.current) return;
    if (d.error) { setErrorCarga(true); return; }
    if (!d.casoId) {
      // Pudo desactivarse justo entre que se listó y se eligió.
      setAvisoCasoDesactivado(true);
      setCasoSeleccionado(null);
      return;
    }
    setVideoUrl(null);
    setVista('ventral');
    setDatos(d);
    // Precarga las 3 fotos del maniquí de esta especie: así al cambiar de
    // vista la foto ya está y no se ven los puntos flotando sobre un hueco.
    ['ventral', 'izq', 'der'].forEach((v) => {
      const src = MANIQUIES.src(d.especie, v);
      if (src) { const img = new Image(); img.src = src; }
    });
  }, [cuentaId]);

  const volverAlMenu = useCallback(() => {
    cargaIdRef.current++;
    setErrorCarga(false);
    setCasoSeleccionado(null);
    setDatos(null);
    setVideoUrl(null);
  }, []);

  // -------- Descripción del caso: "Ver descripción" desde el menú (se
  // queda en el menú al cerrar) o al tocar la tarjeta para entrar (al
  // cerrar, recién ahí se abre el caso) --------
  function clickCaso(c) {
    if (c.descripcion) setVistaDescripcion({ caso: c, entrarAlCerrar: true });
    else abrirCaso(c.id);
  }
  function verDescripcion(c) {
    setVistaDescripcion({ caso: c, entrarAlCerrar: false });
  }
  function cerrarDescripcion() {
    const v = vistaDescripcion;
    setVistaDescripcion(null);
    if (v?.entrarAlCerrar) abrirCaso(v.caso.id);
  }

  // -------- Pantalla completa --------
  useEffect(() => {
    // Safari en iPhone no permite poner la página a pantalla completa: allí
    // el botón se oculta (para eso está "Añadir a pantalla de inicio").
    setSoportaPantallaCompleta(
      typeof document !== 'undefined' && !!document.documentElement.requestFullscreen
    );
    const alCambiar = () => setPantallaCompleta(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  // -------- Refrescar la lista de casos activos: solo sondeo --------
  // "casos"/"caso_videos" ya no tienen select directo para el rol anónimo
  // (se cerró el hueco que dejaba leer los casos de CUALQUIER cuenta por la
  // REST API; ver migración 2026-10-26 en supabase/schema.sql), así que
  // Supabase Realtime (que necesitaba ese mismo acceso amplio para mandar
  // los "postgres_changes") ya no puede avisar de cambios en esta tabla.
  // El sondeo cada 15s, que antes era solo la red de seguridad para el caso
  // de una desactivación (Realtime no lo notifica por RLS), ahora es el
  // ÚNICO mecanismo: el menú puede tardar hasta 15s en reflejar un cambio.
  useEffect(() => {
    const supabase = crearClienteNavegador();
    const recargarLista = async () => {
      const lista = await listarCasosActivos(supabase, cuentaId);
      // null = la consulta falló (red caída): se conserva lo que había y se
      // reintenta en el siguiente sondeo. NUNCA se interpreta como "el
      // profesor desactivó todo", o un corte de Wi-Fi sacaría a toda la
      // clase de su caso.
      if (!lista) return;
      setCasosActivos(lista);
      const abiertoId = casoSeleccionadoRef.current;
      if (abiertoId && !lista.some((c) => c.id === abiertoId)) {
        setAvisoCasoDesactivado(true);
        setCasoSeleccionado(null);
        setDatos(null);
        setVideoUrl(null);
      }
    };
    const sondeo = setInterval(recargarLista, 15000);
    return () => clearInterval(sondeo);
  }, [cuentaId]);

  // -------- Precarga de todos los videos del caso elegido --------
  useEffect(() => {
    // Soltar los blobs del caso anterior.
    new Set(Object.values(blobsRef.current)).forEach((u) => URL.revokeObjectURL(u));
    blobsRef.current = {};

    if (!datos || !datos.casoId || !hayVideos(datos)) {
      setPrecarga({ cargando: false, pct: 100 });
      return;
    }

    let vigente = true;
    const controladores = [];
    // Varios puntos pueden compartir el mismo archivo: se descarga una sola
    // vez por URL y el blob se reparte entre todos sus puntos.
    const urls = [...new Set(datos.puntos.filter((p) => p.videoUrl).map((p) => p.videoUrl))];
    setPrecarga({ cargando: true, pct: 0 });

    // Progreso por video: hasta conocer el tamaño real de cada uno, cuenta
    // como "una parte" igual que los demás. Así la barra no salta hacia
    // atrás cada vez que llega la cabecera de un video nuevo.
    const progreso = urls.map(() => 0); // 0..1 por video
    let pctMostrado = 0;
    const actualizar = () => {
      if (!vigente) return;
      const pct = Math.min(99, Math.round((progreso.reduce((s, x) => s + x, 0) / urls.length) * 100));
      if (pct > pctMostrado) { pctMostrado = pct; setPrecarga({ cargando: true, pct }); }
    };

    (async () => {
      await Promise.all(urls.map(async (url, i) => {
        const ctrl = new AbortController();
        controladores.push(ctrl);
        // Un video que no termina en 60 s se abandona (se usará la URL
        // directa al tocar el punto): la pantalla de carga nunca se queda
        // pegada por una conexión colgada.
        const limite = setTimeout(() => ctrl.abort(), 60000);
        try {
          const resp = await fetch(url, { signal: ctrl.signal });
          if (!resp.ok || !resp.body) throw new Error('HTTP ' + resp.status);
          const total = Number(resp.headers.get('content-length')) || 0;
          const reader = resp.body.getReader();
          const trozos = [];
          let hechos = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            trozos.push(value);
            hechos += value.length;
            if (total) { progreso[i] = Math.min(1, hechos / total); actualizar(); }
          }
          if (!vigente) return;
          const blob = URL.createObjectURL(new Blob(trozos, { type: 'video/mp4' }));
          datos.puntos.filter((p) => p.videoUrl === url).forEach((p) => { blobsRef.current[p.id] = blob; });
        } catch {
          // Si un video falla al precargar, se usará su URL directa como respaldo.
        } finally {
          clearTimeout(limite);
          progreso[i] = 1;
          actualizar();
        }
      }));
      if (vigente) setPrecarga({ cargando: false, pct: 100 });
    })();

    return () => {
      vigente = false;
      controladores.forEach((c) => { try { c.abort(); } catch {} });
      new Set(Object.values(blobsRef.current)).forEach((u) => URL.revokeObjectURL(u));
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

  // -------- Congelar / descongelar (tecla Espacio o botón en pantalla) --------
  // Mientras está congelado, soltar el punto NO vuelve al reposo: así en el
  // móvil (sin teclado) se puede congelar con el botón y estudiar la imagen
  // con el dedo fuera del maniquí.
  const congeladoRef = useRef(false);
  const presionadoRef = useRef(false); // ¿hay un dedo/clic sobre un punto ahora?
  useEffect(() => { congeladoRef.current = congelado; }, [congelado]);
  const alternarCongelado = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // El ref se actualiza YA (no espera al siguiente render): si el dedo
    // se levanta del punto justo después de tocar «Congelar», soltar()
    // tiene que ver el estado nuevo.
    const nuevo = !congeladoRef.current;
    congeladoRef.current = nuevo;
    setCongelado(nuevo);
    if (nuevo) {
      v.pause();
      if (graciaRef.current) { clearTimeout(graciaRef.current); graciaRef.current = null; }
    } else {
      v.play().catch(() => {});
      // Si ya no hay un dedo sobre el punto, al descongelar se vuelve al
      // reposo con el mismo margen de siempre.
      if (!presionadoRef.current) {
        graciaRef.current = setTimeout(() => { graciaRef.current = null; setVideoUrl(null); }, GRACIA_TACTIL_MS);
      }
    }
  }, []);

  // -------- Atajos de teclado --------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'F1') { e.preventDefault(); setAyuda((a) => !a); return; }
      if (e.key === 'F11') { e.preventDefault(); alternarPantallaCompleta(); return; }
      if (e.key === 'Escape') {
        if (vistaDescripcion) { cerrarDescripcion(); return; }
        if (ayuda) setAyuda(false); else irAReposo();
        return;
      }
      if (e.code === 'Space' && videoUrl) {
        e.preventDefault();
        alternarCongelado();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ayuda, videoUrl, irAReposo, vistaDescripcion, alternarCongelado]);

  // -------- Presionar / soltar un punto --------
  const presionar = (p, e) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    presionadoRef.current = true;
    if (graciaRef.current) { clearTimeout(graciaRef.current); graciaRef.current = null; }
    // Usa el video ya precargado (blob); si no, la URL directa como respaldo.
    setVideoUrl(blobsRef.current[p.id] || p.videoUrl || null);
  };
  const soltar = () => {
    presionadoRef.current = false;
    if (graciaRef.current) clearTimeout(graciaRef.current);
    if (congeladoRef.current) { graciaRef.current = null; return; }
    graciaRef.current = setTimeout(() => { graciaRef.current = null; irAReposo(); }, GRACIA_TACTIL_MS);
  };

  // -------- Menú: todavía no se ha elegido ningún caso --------
  if (!casoSeleccionado) {
    return (
      <div className="menu-casos">
        <div className="marca">ECOSIM</div>
        <p className="menu-casos-sub">Elige un caso para practicar la ecografía</p>
        {avisoCasoDesactivado && (
          <div className="aviso-caso">El profesor desactivó este caso.</div>
        )}
        {casosActivos.length ? (
          <div className="menu-casos-grid">
            {casosActivos.map((c) => (
              <div
                key={c.id} className="caso-card" role="button" tabIndex={0}
                onClick={() => clickCaso(c)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return; // deja que el botón "Ver descripción" maneje su propia tecla
                  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clickCaso(c); }
                }}
              >
                <div className="caso-card-nombre">{c.nombre}</div>
                <div className="caso-card-especie">{MANIQUIES.nombre(c.especie)}</div>
                {c.descripcion && (
                  <button
                    type="button" className="btn small caso-card-ver-desc"
                    onClick={(e) => { e.stopPropagation(); verDescripcion(c); }}
                  >
                    Ver descripción
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="txt">Esperando a que el profesor active un caso…</div>
        )}

        {vistaDescripcion && (
          <div className="overlay" onClick={cerrarDescripcion}>
            <div className="desc-box" onClick={(e) => e.stopPropagation()}>
              <div className="desc-box-eyebrow">Descripción del caso</div>
              <div className="desc-box-nombre">{vistaDescripcion.caso.nombre}</div>
              <div className="desc-box-divider" />
              <div className="desc-box-texto">{vistaDescripcion.caso.descripcion}</div>
              <button className="btn btn-primary" onClick={cerrarDescripcion}>
                {vistaDescripcion.entrarAlCerrar ? 'Continuar' : 'Cerrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------- Caso elegido, pero sus datos todavía no llegaron (o fallaron) --------
  if (!datos) {
    return (
      <div className="espera">
        <div className="marca">ECOSIM</div>
        {errorCarga ? (
          <>
            <div className="txt">No se pudo cargar el caso. Revisa tu conexión a internet.</div>
            <div className="espera-acciones">
              <button className="btn btn-primary" onClick={() => abrirCaso(casoSeleccionado)}>Reintentar</button>
              <button className="btn" onClick={volverAlMenu}>← Volver a los casos</button>
            </div>
          </>
        ) : (
          <>
            <div className="txt">Cargando caso…</div>
            <div className="espera-acciones">
              <button className="btn small" onClick={volverAlMenu}>← Volver a los casos</button>
            </div>
          </>
        )}
      </div>
    );
  }

  const { especie, puntos } = datos;
  const esLado = MANIQUIES.esLado(vista);
  const puntosVista = puntos.filter((p) => (p.vista || 'ventral') === vista);
  const casoActual = casosActivos.find((c) => c.id === casoSeleccionado);

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
            <button className="btn small carga-saltar" onClick={() => setPrecarga({ cargando: false, pct: 100 })}>
              Empezar sin esperar
            </button>
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
        {videoUrl && (
          <button
            type="button"
            className="btn small btn-congelar"
            onClick={alternarCongelado}
            aria-pressed={congelado}
          >
            {congelado ? '▶ Seguir' : '❚❚ Congelar'}
          </button>
        )}
        <div className="esc-hint">Espacio = congelar · F1 = ayuda</div>
      </div>

      {/* Panel del maniquí */}
      <div className={'panel-maniqui' + (esLado ? ' lado' : '')} style={{ '--mq-ratio': MANIQUIES.ratio(especie, vista) }}>
        <div className="tabs">
          <button className="tab" onClick={volverAlMenu} title="Volver al menú de casos">
            ← Casos
          </button>
          {casoActual?.descripcion && (
            <button className="tab" onClick={() => verDescripcion(casoActual)}>
              Descripción
            </button>
          )}
          {VISTAS.map((v) => (
            <button
              key={v.id}
              className={'tab' + (v.id === vista ? ' act' : '')}
              onClick={() => setVista(v.id)}
            >
              {v.label}
            </button>
          ))}
          {soportaPantallaCompleta && (
            <button
              className="tab tab-icono"
              onClick={alternarPantallaCompleta}
              title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
              aria-label={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              <svg viewBox="0 0 20 20" width="13" height="13" fill="none"
                   stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {pantallaCompleta ? (
                  <>
                    <path d="M8 2v6H2" /><path d="M12 18v-6h6" />
                  </>
                ) : (
                  <>
                    <path d="M7 2H2v5" /><path d="M13 18h5v-5" />
                  </>
                )}
              </svg>
            </button>
          )}
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

      {/* Descripción del caso, pedida desde dentro (botón "Descripción" de arriba) */}
      {vistaDescripcion && (
        <div className="overlay" onClick={cerrarDescripcion}>
          <div className="desc-box" onClick={(e) => e.stopPropagation()}>
            <div className="desc-box-eyebrow">Descripción del caso</div>
            <div className="desc-box-nombre">{vistaDescripcion.caso.nombre}</div>
            <div className="desc-box-divider" />
            <div className="desc-box-texto">{vistaDescripcion.caso.descripcion}</div>
            <button className="btn btn-primary" onClick={cerrarDescripcion}>
              {vistaDescripcion.entrarAlCerrar ? 'Continuar' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

async function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
      // En el móvil, ya que estamos a pantalla completa, dejamos fija la
      // orientación horizontal. En ordenador y en iPhone esto no existe:
      // se ignora sin más.
      await screen.orientation?.lock?.('landscape');
    } catch {}
  } else {
    try { screen.orientation?.unlock?.(); } catch {}
    document.exitFullscreen?.();
  }
}
