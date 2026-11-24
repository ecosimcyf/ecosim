'use client';
// ============================================================
// Vista del estudiante, dentro de una cuenta (/c/[slug]).
//
// Primero se ve un MENÚ con los casos activos de ESTA cuenta (puede haber
// varios a la vez). Al elegir uno se cargan sus datos. Si sus videos suman
// poco (PRECARGA_MAX_MB, en src/lib/datos.js) se PRECARGAN todos en
// memoria con una barra de progreso, y cada punto arranca al instante. Si
// suman más, cada video se pide al tocar su punto (el navegador lo guarda
// en caché para la siguiente vez). Los videos de los demás casos nunca se
// descargan.
//
// El <video> se maneja de forma imperativa (poner src, silenciar y
// reproducir por código), igual que en la app de escritorio.
// ============================================================
import { useState, useEffect, useRef, useCallback } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { listarCasosActivos, cargarDatosDeCaso } from '@/lib/datos';
import { MANIQUIES } from '@/lib/maniquies';
import { BotonesExamenes, VentanaExamen, EXAMENES } from './Examenes';
import { unir } from '@/lib/i18n/config';
import { useIdioma, useT } from '@/lib/i18n/cliente';
import SelectorIdioma from '@/lib/i18n/SelectorIdioma';
import { SONDEO_BASE_MS, esperaInicial, siguienteIntervalo } from '@/lib/sondeo';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';
import { EXAMENES_TXT } from '@/lib/i18n/textos/examenes';

const TEXTOS = unir(ESTUDIANTE, EXAMENES_TXT);
const GRACIA_TACTIL_MS = 1500; // mismo valor que la app de escritorio
const VISTAS = ['ventral', 'izq', 'der'];
// Precarga: una descarga se abandona si pasa este tiempo SIN recibir datos
// (no importa cuánto dure en total), y como mucho hay 4 a la vez para no
// ahogar una conexión móvil.
const PRECARGA_INACTIVIDAD_MS = 20000;
const PRECARGA_SIMULTANEAS = 4;
// Un video que se queda sin datos tanto tiempo se da por caído (se ofrece
// reintentar).
const VIDEO_ATASCADO_MS = 10000;

// Al abrir un diálogo el foco entra en él, y al cerrarlo vuelve a donde
// estaba (lector de pantalla y teclado).
function useFocoDialogo() {
  const ref = useRef(null);
  useEffect(() => {
    const previo = document.activeElement;
    ref.current?.focus();
    return () => { try { previo?.focus?.(); } catch {} };
  }, []);
  return ref;
}

// Descripción del caso (la usan el menú y la vista dentro del caso).
function DialogoDescripcion({ vista, t, onCerrar, onContinuar }) {
  const ref = useFocoDialogo();
  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="desc-box" ref={ref} tabIndex={-1} role="dialog" aria-modal="true"
        aria-labelledby="desc-nombre" onClick={(e) => e.stopPropagation()}>
        <div className="desc-box-eyebrow">{t('desc.eyebrow')}</div>
        <div className="desc-box-nombre" id="desc-nombre">{vista.caso.nombre}</div>
        <div className="desc-box-divider" />
        <div className="desc-box-texto">{vista.caso.descripcion}</div>
        <button type="button" className="btn btn-primary" onClick={onContinuar}>
          {vista.entrarAlCerrar ? t('desc.continuar') : t('desc.cerrar')}
        </button>
      </div>
    </div>
  );
}

function DialogoAyuda({ t, onCerrar }) {
  const ref = useFocoDialogo();
  return (
    <div className="overlay" onClick={onCerrar}>
      <div className="ayuda-box" ref={ref} tabIndex={-1} role="dialog" aria-modal="true"
        aria-labelledby="ayuda-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="titulo" id="ayuda-titulo">{t('ayuda.titulo')}</div>
        <table>
          <tbody>
            <tr><td>{t('ayuda.espacio')}</td><td>{t('ayuda.congelar')}</td></tr>
            <tr><td>Esc</td><td>{t('ayuda.reposo')}</td></tr>
            <tr><td>F11</td><td>{t('ayuda.pantalla')}</td></tr>
            <tr><td>F1</td><td>{t('ayuda.ayuda')}</td></tr>
          </tbody>
        </table>
        <button type="button" className="btn small" onClick={onCerrar}>{t('ayuda.cerrar')}</button>
      </div>
    </div>
  );
}

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
  const t = useT(TEXTOS);
  const idioma = useIdioma();
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
  // Exámenes complementarios: cuál está abierto ('lab' | 'rx' | 'vitales').
  const [examenAbierto, setExamenAbierto] = useState(null);
  // El video del punto tocado se está descargando (modo "bajo demanda").
  const [videoCargando, setVideoCargando] = useState(false);
  // El video falló o se atascó: se muestra "toca para reintentar".
  const [videoError, setVideoError] = useState(false);
  // Punto del maniquí que tiene la sonda ahora (para aria-pressed).
  const [puntoActivo, setPuntoActivo] = useState(null);

  const videoRef = useRef(null);
  const graciaRef = useRef(null);
  const atascoRef = useRef(null); // temporizador de "el video no avanza"
  const abortarPrecargaRef = useRef(null); // corta las descargas pendientes
  // Punteros (dedos o ratón) que ahora mismo sostienen la sonda: con
  // multitoque se suelta solo cuando se levantan TODOS. Con el teclado no
  // existe "mantener": Enter/Espacio dejan la sonda puesta (tecladoRef).
  const punterosRef = useRef(new Set());
  const tecladoRef = useRef(false);
  const blobsRef = useRef({}); // punto_id -> blob URL (video ya descargado)
  const casoSeleccionadoRef = useRef(null); // espejo de casoSeleccionado para el sondeo
  const cargaIdRef = useRef(0); // descarta respuestas de un caso que ya no es el elegido

  const irAReposo = useCallback(() => {
    tecladoRef.current = false;
    setPuntoActivo(null);
    setVideoUrl(null);
  }, []);
  // Suelta la sonda del todo (cambio de vista, volver al menú): los
  // punteros que la sostenían ya no existirán (el punto desaparece de la
  // pantalla y nunca llegará su "pointerup").
  const soltarTodo = useCallback(() => {
    punterosRef.current.clear();
    if (graciaRef.current) { clearTimeout(graciaRef.current); graciaRef.current = null; }
    irAReposo();
  }, [irAReposo]);

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
    soltarTodo();
    setVista('ventral');
    setExamenAbierto(null);
    setDatos(d);
    // Precarga las 3 fotos del maniquí de esta especie: así al cambiar de
    // vista la foto ya está y no se ven los puntos flotando sobre un hueco.
    ['ventral', 'izq', 'der'].forEach((v) => {
      const src = MANIQUIES.src(d.especie, v);
      if (src) { const img = new Image(); img.src = src; }
    });
    // Las imágenes de los exámenes (radiografías, reportes) NO se precargan
    // aquí: se piden al abrir su ventana, para no gastar datos móviles en
    // algo que quizá nadie abra.
  }, [cuentaId, soltarTodo]);

  const volverAlMenu = useCallback(() => {
    cargaIdRef.current++;
    setErrorCarga(false);
    setCasoSeleccionado(null);
    setDatos(null);
    soltarTodo();
    setExamenAbierto(null);
    setAyuda(false);
  }, [soltarTodo]);

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
  // Escape o un clic fuera CIERRAN sin entrar al caso: solo el botón
  // «Continuar» entra.
  function cerrarDescripcion() {
    setVistaDescripcion(null);
  }
  function continuarDescripcion() {
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
  //
  // Con la pestaña oculta (otra app, pantalla apagada) NO se consulta: en
  // un salón de 40 estudiantes eso son muchas consultas que nadie ve. Al
  // volver a la pestaña se consulta en el acto y se reanuda el sondeo.
  // Devuelve true si la consulta funcionó (el sondeo usa eso para espaciarse
  // cuando la red falla; ver src/lib/sondeo.js).
  const recargarLista = useCallback(async () => {
    const lista = await listarCasosActivos(crearClienteNavegador(), cuentaId);
    // null = la consulta falló (red caída): se conserva lo que había y se
    // reintenta en el siguiente sondeo. NUNCA se interpreta como "el
    // profesor desactivó todo", o un corte de Wi-Fi sacaría a toda la
    // clase de su caso.
    if (!lista) return false;
    setCasosActivos(lista);
    const abiertoId = casoSeleccionadoRef.current;
    if (abiertoId && !lista.some((c) => c.id === abiertoId)) {
      setAvisoCasoDesactivado(true);
      setCasoSeleccionado(null);
      setDatos(null);
      soltarTodo();
      setAyuda(false);
    }
    return true;
  }, [cuentaId, soltarTodo]);

  // Sondeo cada 15 s (el primero con un desfase aleatorio de 0–5 s; tras un
  // fallo el intervalo se duplica hasta 60 s). Con la pestaña oculta no se
  // consulta; al volver se consulta en el acto y se reanuda.
  useEffect(() => {
    let temporizador = null;
    let intervalo = SONDEO_BASE_MS;
    let vivo = true;
    let enCurso = false;
    const programar = (ms) => { clearTimeout(temporizador); temporizador = setTimeout(ciclo, ms); };
    async function ciclo() {
      if (!vivo || document.hidden || enCurso) return;
      enCurso = true;
      let ok = false;
      try { ok = await recargarLista(); } finally { enCurso = false; }
      if (!vivo || document.hidden) return;
      intervalo = siguienteIntervalo(intervalo, ok);
      programar(intervalo);
    }
    const alCambiarVisibilidad = () => {
      clearTimeout(temporizador); temporizador = null;
      if (!document.hidden) { intervalo = SONDEO_BASE_MS; ciclo(); }
    };
    if (!document.hidden) programar(esperaInicial(Math.random()));
    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    return () => { vivo = false; clearTimeout(temporizador); document.removeEventListener('visibilitychange', alCambiarVisibilidad); };
  }, [recargarLista]);

  // -------- Precarga de todos los videos del caso elegido --------
  useEffect(() => {
    // Soltar los blobs del caso anterior.
    new Set(Object.values(blobsRef.current)).forEach((u) => URL.revokeObjectURL(u));
    blobsRef.current = {};

    // Caso pesado: nada de precarga, cada video se pide al tocar su punto.
    if (!datos || !datos.casoId || !hayVideos(datos) || !datos.precargar) {
      setPrecarga({ cargando: false, pct: 100 });
      return;
    }

    let vigente = true;
    let omitido = false; // el estudiante tocó «Empezar sin esperar»
    const controladores = new Set();
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
      if (!vigente || omitido) return;
      const pct = Math.min(99, Math.round((progreso.reduce((s, x) => s + x, 0) / urls.length) * 100));
      if (pct > pctMostrado) { pctMostrado = pct; setPrecarga({ cargando: true, pct }); }
    };

    async function descargar(i) {
      const url = urls[i];
      const ctrl = new AbortController();
      controladores.add(ctrl);
      // Una descarga que lleva PRECARGA_INACTIVIDAD_MS sin recibir nada se
      // abandona (se usará la URL directa al tocar el punto): la pantalla
      // de carga nunca se queda pegada por una conexión colgada, pero un
      // video grande que sí avanza puede tardar lo que necesite. El plazo
      // se reinicia con cada trozo recibido.
      let limite = null;
      const vigilar = () => { clearTimeout(limite); limite = setTimeout(() => ctrl.abort(), PRECARGA_INACTIVIDAD_MS); };
      try {
        vigilar();
        const resp = await fetch(url, { signal: ctrl.signal });
        if (!resp.ok || !resp.body) throw new Error('HTTP ' + resp.status);
        const total = Number(resp.headers.get('content-length')) || 0;
        const tipo = resp.headers.get('content-type') || '';
        const reader = resp.body.getReader();
        const trozos = [];
        let hechos = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          vigilar();
          trozos.push(value);
          hechos += value.length;
          if (total) { progreso[i] = Math.min(1, hechos / total); actualizar(); }
        }
        if (!vigente || omitido) return;
        // El tipo real de la respuesta (algunos navegadores lo necesitan
        // para reproducir el blob); mp4 si el servidor no dijo video/*.
        const blob = URL.createObjectURL(new Blob(trozos, { type: tipo.startsWith('video/') ? tipo : 'video/mp4' }));
        datos.puntos.filter((p) => p.videoUrl === url).forEach((p) => { blobsRef.current[p.id] = blob; });
      } catch {
        // Si un video falla al precargar, se usará su URL directa como respaldo.
      } finally {
        clearTimeout(limite);
        controladores.delete(ctrl);
        progreso[i] = 1;
        actualizar();
      }
    }

    // Cola con como mucho PRECARGA_SIMULTANEAS descargas a la vez.
    let siguiente = 0;
    const trabajador = async () => {
      while (vigente && !omitido) {
        const i = siguiente++;
        if (i >= urls.length) return;
        await descargar(i);
      }
    };
    abortarPrecargaRef.current = () => {
      omitido = true;
      controladores.forEach((c) => { try { c.abort(); } catch {} });
    };

    (async () => {
      await Promise.all(Array.from({ length: Math.min(PRECARGA_SIMULTANEAS, urls.length) }, trabajador));
      if (vigente) setPrecarga({ cargando: false, pct: 100 });
    })();

    return () => {
      vigente = false;
      abortarPrecargaRef.current = null;
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
    setVideoCargando(false);
    setVideoError(false);
    limpiarAtasco();
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

  // Al salir del caso se suelta el <video> (si no, el navegador puede
  // seguir con el archivo en memoria o descargándolo).
  useEffect(() => {
    const v = videoRef.current;
    return () => {
      if (!v) return;
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch {}
    };
  }, [datos]);
  useEffect(() => limpiarAtasco, []); // eslint-disable-line react-hooks/exhaustive-deps

  // -------- Congelar / descongelar (tecla Espacio o botón en pantalla) --------
  // Mientras está congelado, soltar el punto NO vuelve al reposo: así en el
  // móvil (sin teclado) se puede congelar con el botón y estudiar la imagen
  // con el dedo fuera del maniquí.
  const congeladoRef = useRef(false);
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
      if (punterosRef.current.size === 0 && !tecladoRef.current) {
        graciaRef.current = setTimeout(() => { graciaRef.current = null; setVideoUrl(null); }, GRACIA_TACTIL_MS);
      }
    }
  }, []);

  // -------- Atajos de teclado --------
  useEffect(() => {
    const onKey = (e) => {
      // F1 sin caso abierto no deja la ayuda "pendiente" para cuando se entre.
      if (e.key === 'F1') { e.preventDefault(); if (datos) setAyuda((a) => !a); return; }
      if (e.key === 'F11') { e.preventDefault(); alternarPantallaCompleta(); return; }
      if (e.key === 'Escape') {
        if (examenAbierto) { setExamenAbierto(null); return; }
        if (vistaDescripcion) { setVistaDescripcion(null); return; }
        if (ayuda) setAyuda(false); else irAReposo();
        return;
      }
      if (e.code === 'Space' && videoUrl && !examenAbierto) {
        // Con el foco en un punto del maniquí, Espacio lo activa a ÉL (ver
        // alternarConTeclado), no congela.
        if (e.target?.closest?.('[data-punto]')) return;
        e.preventDefault();
        // Mantener la tecla pulsada repite el evento: no debe congelar y descongelar.
        if (!e.repeat) alternarCongelado();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ayuda, videoUrl, irAReposo, vistaDescripcion, alternarCongelado, examenAbierto, datos]);

  // -------- Presionar / soltar un punto --------
  const urlDelPunto = (p) => blobsRef.current[p.id] || p.videoUrl || null; // el precargado, o la URL directa
  const presionar = (p, e) => {
    // Con el ratón solo cuenta el botón principal (no el derecho ni el central).
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    punterosRef.current.add(e.pointerId);
    tecladoRef.current = false;
    if (graciaRef.current) { clearTimeout(graciaRef.current); graciaRef.current = null; }
    setPuntoActivo(p.id);
    setVideoUrl(urlDelPunto(p));
  };
  const soltar = (e) => {
    if (!punterosRef.current.delete(e.pointerId)) return; // no lo sostenía
    if (punterosRef.current.size > 0) return; // queda otro dedo puesto
    if (graciaRef.current) clearTimeout(graciaRef.current);
    if (congeladoRef.current) { graciaRef.current = null; return; }
    graciaRef.current = setTimeout(() => { graciaRef.current = null; irAReposo(); }, GRACIA_TACTIL_MS);
  };
  // Con teclado no hay "mantener": Enter o Espacio ponen la sonda en el
  // punto y la dejan; otra vez, la quitan.
  const alternarConTeclado = (p) => {
    if (graciaRef.current) { clearTimeout(graciaRef.current); graciaRef.current = null; }
    const url = urlDelPunto(p);
    if (!url || (tecladoRef.current && puntoActivo === p.id)) { irAReposo(); return; }
    punterosRef.current.clear();
    tecladoRef.current = true;
    setPuntoActivo(p.id);
    setVideoUrl(url);
  };

  // -------- Video: fallos y atascos --------
  function limpiarAtasco() {
    if (atascoRef.current) { clearTimeout(atascoRef.current); atascoRef.current = null; }
  }
  // Se esperan datos: si en VIDEO_ATASCADO_MS no llegan, se ofrece reintentar.
  function armarAtasco() {
    const v = videoRef.current;
    if (!v || !v.getAttribute('src')) return;
    limpiarAtasco();
    atascoRef.current = setTimeout(() => {
      atascoRef.current = null;
      const vv = videoRef.current;
      if (vv && vv.getAttribute('src') && vv.readyState < 3) { setVideoCargando(false); setVideoError(true); }
    }, VIDEO_ATASCADO_MS);
  }
  function alFallarVideo() {
    if (!videoRef.current?.getAttribute('src')) return; // el vaciado de reposo no es un fallo
    limpiarAtasco();
    setVideoCargando(false);
    setVideoError(true);
  }
  function alHaberVideo() {
    limpiarAtasco();
    setVideoCargando(false);
    setVideoError(false);
  }
  function reintentarVideo() {
    const v = videoRef.current;
    if (!v) return;
    setVideoError(false);
    setVideoCargando(true);
    armarAtasco();
    v.load();
    v.play().catch(() => {});
  }

  // -------- Menú: todavía no se ha elegido ningún caso --------
  if (!casoSeleccionado) {
    return (
      <div className="menu-casos">
        {/* Cada estudiante puede verla en otro idioma (solo para sí). */}
        <SelectorIdioma idioma={idioma} etiqueta={t('idioma')} titulo={t('idioma')} className="menu-casos-idioma" />
        <div className="marca">ECOSIM</div>
        <h1 className="menu-casos-sub">{t('menu.titulo')}</h1>
        {avisoCasoDesactivado && (
          <div className="aviso-caso">{t('menu.desactivado')}</div>
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
                <div className="caso-card-especie">{t('especie.' + (c.especie === 'gato' ? 'gato' : 'perro'))}</div>
                {c.examenes && EXAMENES.some((x) => c.examenes[x.id]) && (
                  <div className="caso-card-examenes">
                    {EXAMENES.filter((x) => c.examenes[x.id]).map(({ id, Icono }) => (
                      <span key={id} className="caso-card-examen" title={t('ex.' + id)} aria-label={t('ex.' + id)}><Icono size={15} /></span>
                    ))}
                  </div>
                )}
                {c.descripcion && (
                  <button
                    type="button" className="btn small caso-card-ver-desc"
                    onClick={(e) => { e.stopPropagation(); verDescripcion(c); }}
                  >
                    {t('menu.verDescripcion')}
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="txt">{t('menu.esperando')}</div>
        )}

        {vistaDescripcion && (
          <DialogoDescripcion vista={vistaDescripcion} t={t} onCerrar={cerrarDescripcion} onContinuar={continuarDescripcion} />
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
            <div className="txt">{t('carga.error')}</div>
            <div className="espera-acciones">
              <button className="btn btn-primary" onClick={() => abrirCaso(casoSeleccionado)}>{t('carga.reintentar')}</button>
              <button className="btn" onClick={volverAlMenu}>{t('carga.volver')}</button>
            </div>
          </>
        ) : (
          <>
            <div className="txt" role="status">{t('carga.cargando')}</div>
            <div className="espera-acciones">
              <button className="btn small" onClick={volverAlMenu}>{t('carga.volver')}</button>
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
      {/* Pantalla de carga (precarga de videos al entrar) */}
      {precarga.cargando && (
        <div className="carga-overlay">
          <div className="carga-box">
            <div className="carga-titulo" role="status">{t('precarga.titulo')}</div>
            <div className="carga-barra" role="progressbar" aria-label={t('precarga.titulo')}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={precarga.pct}>
              <div className="carga-relleno" style={{ width: precarga.pct + '%' }} />
            </div>
            <div className="carga-pct" aria-hidden="true">{precarga.pct}%</div>
            <div className="carga-sub">{t('precarga.sub')}</div>
            <button className="btn small carga-saltar" onClick={() => {
              // Corta las descargas pendientes: lo que falte se pedirá al tocar cada punto.
              abortarPrecargaRef.current?.();
              setPrecarga({ cargando: false, pct: 100 });
            }}>
              {t('precarga.saltar')}
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
          onWaiting={() => { setVideoCargando(true); armarAtasco(); }}
          onStalled={armarAtasco}
          onPlaying={alHaberVideo}
          onCanPlay={alHaberVideo}
          onError={alFallarVideo}
        />
        {videoUrl && videoCargando && !videoError && <div className="video-cargando" role="status">{t('visor.cargando')}</div>}
        {videoUrl && videoError && (
          <button type="button" className="video-error" role="alert" onClick={reintentarVideo}>{t('visor.error')}</button>
        )}
        {!videoUrl && (
          <div className="idle-screen">
            <div className="idle-mark">ECOSIM</div>
            <div className="idle-sub">{t('visor.reposo')}</div>
          </div>
        )}
        {videoUrl && congelado && <div className="freeze-tag">{t('visor.congelado')}</div>}
        {videoUrl && (
          <button
            type="button"
            className="btn small btn-congelar"
            onClick={alternarCongelado}
            aria-pressed={congelado}
          >
            {congelado ? t('visor.seguir') : t('visor.congelar')}
          </button>
        )}
        <div className="esc-hint">{t('visor.atajos')}</div>
        <BotonesExamenes examenes={datos.examenes} onAbrir={setExamenAbierto} />
      </div>

      {/* Panel del maniquí */}
      <div className={'panel-maniqui' + (esLado ? ' lado' : '')} style={{ '--mq-ratio': MANIQUIES.ratio(especie, vista) }}>
        <div className="tabs">
          <button className="tab" onClick={volverAlMenu} title={t('tabs.volverMenu')}>
            {t('tabs.casos')}
          </button>
          {casoActual?.descripcion && (
            <button className="tab" onClick={() => verDescripcion(casoActual)}>
              {t('tabs.descripcion')}
            </button>
          )}
          {VISTAS.map((v) => (
            <button
              key={v}
              className={'tab' + (v === vista ? ' act' : '')}
              onClick={() => { soltarTodo(); setVista(v); }}
            >
              {t('tabs.' + v)}
            </button>
          ))}
          {soportaPantallaCompleta && (
            <button
              className="tab tab-icono"
              onClick={alternarPantallaCompleta}
              title={pantallaCompleta ? t('tabs.salirPantalla') : t('tabs.pantallaCompleta')}
              aria-label={pantallaCompleta ? t('tabs.salirPantalla') : t('tabs.pantallaCompleta')}
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
            dangerouslySetInnerHTML={{ __html: MANIQUIES.svg(especie, vista, t('mq.' + vista, { especie })) }}
          />
          {puntosVista.map((p, i) => {
            const pos = posToken(p, i);
            const clase = p.videoUrl ? 'config' : 'sinvid';
            return (
              <div
                key={p.id}
                className={'mq-token ' + clase}
                style={{ left: pos.x + '%', top: pos.y + '%' }}
                data-punto
                role="button"
                tabIndex={0}
                aria-pressed={puntoActivo === p.id}
                aria-label={t('mq.punto', { n: i + 1 })}
                onPointerDown={(e) => presionar(p, e)}
                onPointerUp={soltar}
                onPointerCancel={soltar}
                onContextMenu={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter' && e.key !== ' ') return;
                  e.preventDefault();
                  if (!e.repeat) alternarConTeclado(p);
                }}
              >
                {i + 1}
              </div>
            );
          })}
        </div>
        <div className="panel-hint">{t('hint')}</div>
      </div>

      {/* Ayuda (F1) */}
      {ayuda && <DialogoAyuda t={t} onCerrar={() => setAyuda(false)} />}

      {/* Exámenes complementarios (botones arriba a la derecha del visor) */}
      {examenAbierto && (
        <VentanaExamen
          tipo={examenAbierto} examenes={datos.examenes || {}}
          casoNombre={casoActual?.nombre || datos.casoNombre}
          onCerrar={() => setExamenAbierto(null)}
        />
      )}

      {/* Descripción del caso, pedida desde dentro (botón "Descripción" de arriba) */}
      {vistaDescripcion && (
        <DialogoDescripcion vista={vistaDescripcion} t={t} onCerrar={cerrarDescripcion} onContinuar={continuarDescripcion} />
      )}
    </div>
  );
}

async function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    try {
      await document.documentElement.requestFullscreen();
    } catch {}
  } else {
    document.exitFullscreen?.();
  }
}
