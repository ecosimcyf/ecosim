'use client';
// ============================================================
// Panel de administración interactivo.
//
// Cada acción llama a una Server Action (que valida la sesión y escribe
// en Supabase) y devuelve el estado actualizado, que FUSIONAMOS sobre
// "datos" (no lo reemplazamos entero): casi ninguna acción vuelve a mandar
// rol/cuentaId/cuentas/cupoCasosPropios, así que un reemplazo completo los
// borraría del estado tras el primer clic.
//
// Todas las acciones pasan por ejecutar(): las Server Actions devuelven
// {error} en vez de lanzar (ver actions/admin.js), y ejecutar() lo muestra.
// Antes varias acciones no atrapaban nada y, con la sesión caducada, el
// clic simplemente no hacía nada.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { MANIQUIES } from '@/lib/maniquies';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { puedeReproducir, convertirAH264, duracionDe } from '@/lib/convertir-video';
import EditorExamenes from './EditorExamenes';
import { IDIOMAS, LOCALE, NOMBRES_IDIOMA } from '@/lib/i18n/config';
import { useIdioma, useT } from '@/lib/i18n/cliente';
import { PANEL } from '@/lib/i18n/textos/panel';
import {
  elegirCuentaAdmin, crearCuenta, actualizarCuenta, restablecerClaveCuenta, eliminarCuenta,
  limpiarVideosHuerfanos, actualizarEstadoSolicitud,
  alternarCasoActivo, crearCaso, renombrarCaso, describirCaso, cambiarEspecieCaso, eliminarCaso,
  addPunto, actualizarPunto, eliminarPunto,
  crearUrlSubidaVideo, guardarVideoCaso, quitarVideoCaso,
} from '@/app/actions/admin';

// Tope de duración por video: clips cortos alcanzan igual para mostrar un
// punto de ecografía, y mantienen el storage (y el costo) bajo control.
const DURACION_MAX_SEG = 30;
// Debe coincidir con file_size_limit del bucket (supabase/schema.sql).
const MAX_MB_VIDEO = 50;

const VISTAS = ['ventral', 'izq', 'der'];

const clamp = (min, max, v) => Math.max(min, Math.min(max, v));
const especieOk = (e) => (e === 'gato' ? 'gato' : 'perro');

// Color de texto para una celda de uso (casos o storage) según qué tan
// cerca está del cupo — mismo lenguaje de color que BarraCupo.
function colorCupo(usado, tope) {
  const pct = tope > 0 ? (usado / tope) * 100 : (usado > 0 ? 100 : 0);
  if (pct >= 100) return 'var(--danger-text)';
  if (pct >= 80) return 'var(--warn-text)';
  return 'var(--text-soft)';
}

function posToken(p, i) {
  const x = typeof p.x === 'number' ? p.x : 12 + (i % 6) * 13;
  const y = typeof p.y === 'number' ? p.y : 10 + Math.floor(i / 6) * 9;
  return { x, y };
}

function popStyle(pos) {
  return {
    left: clamp(28, 72, pos.x) + '%',
    top: pos.y + '%',
    transform: pos.y > 50 ? 'translate(-50%, calc(-100% - 18px))' : 'translate(-50%, 18px)',
  };
}

async function copiar(textoACopiar) {
  try {
    await navigator.clipboard.writeText(textoACopiar);
    return true;
  } catch {
    return false;
  }
}

// Fecha y hora en la zona del navegador del admin. Se pinta solo tras montar:
// el servidor no conoce esa zona, y un HTML inicial distinto del que calcula
// el navegador provocaría un error de hidratación de React.
function FechaLocal({ iso }) {
  const idioma = useIdioma();
  const [txt, setTxt] = useState('');
  useEffect(() => {
    setTxt(new Date(iso).toLocaleString(LOCALE[idioma], { dateStyle: 'medium', timeStyle: 'short' }));
  }, [iso, idioma]);
  return <span>{txt}</span>;
}

// Cupo como barra: más fácil de leer de un vistazo que solo el número.
function BarraCupo({ etiqueta, usado, tope, unidad = '' }) {
  const pct = tope > 0 ? clamp(0, 100, (usado / tope) * 100) : (usado > 0 ? 100 : 0);
  const clase = pct >= 100 ? 'cupo-lleno' : pct >= 80 ? 'cupo-alto' : '';
  return (
    <div className="cupo">
      <div className="cupo-fila">
        <span>{etiqueta}</span>
        <span><strong>{usado}{unidad}</strong> / {tope}{unidad}</span>
      </div>
      <div className="cupo-barra">
        <div className={'cupo-relleno ' + clase} style={{ width: pct + '%' }} />
      </div>
    </div>
  );
}

// Texto con botón "Copiar" (enlace de estudiantes, contraseña temporal).
function Copiable({ valor }) {
  const t = useT(PANEL);
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="copiable">
      <code>{valor}</code>
      <button
        type="button" className="btn small"
        onClick={async () => { if (await copiar(valor)) { setCopiado(true); setTimeout(() => setCopiado(false), 1800); } }}
      >
        {copiado ? t('comun.copiado') : t('comun.copiar')}
      </button>
    </div>
  );
}

// Enlace que el cliente reparte a sus estudiantes. El dominio se toma del
// navegador tras montar (el servidor no lo sabe con certeza detrás del
// proxy de Vercel, y así no hay error de hidratación).
function EnlaceEstudiantes({ slug }) {
  const t = useT(PANEL);
  const [origen, setOrigen] = useState('');
  useEffect(() => { setOrigen(window.location.origin); }, []);
  if (!slug) return null;
  return (
    <div className="enlace-estudiantes">
      <span className="lbl">{t('comun.enlaceEst')}</span>
      <Copiable valor={(origen || '') + '/c/' + slug} />
    </div>
  );
}

export default function AdminPanel({ inicial }) {
  const t = useT(PANEL);
  const idioma = useIdioma();
  const [datos, setDatos] = useState(inicial);

  // Qué sección se ve (solo aplica a super_admin: cliente no tiene ni
  // Cuentas ni Solicitudes). Arranca en "cuentas" si no hay ninguna elegida.
  const [seccion, setSeccion] = useState(
    () => (inicial.rol === 'super_admin' && !inicial.cuentaId) ? 'cuentas' : 'simulador'
  );

  // Ventana con una contraseña temporal recién generada (se ve UNA vez).
  const [claveNueva, setClaveNueva] = useState(null); // { titulo, correos, clave, slug } | null

  // Selector / alta de cuentas (solo super_admin)
  const [cambiandoCuenta, setCambiandoCuenta] = useState(false);
  // El idioma de una cuenta nueva arranca en el del panel de quien la crea.
  const cuentaVacia = { slug: '', nombre: '', cupoCasos: '', cupoStorage: '', correo: '', idioma };
  const [nuevaCuenta, setNuevaCuenta] = useState(cuentaVacia);
  const [creandoCuenta, setCreandoCuenta] = useState(false);
  const [edicionCuenta, setEdicionCuenta] = useState(null); // copia editable de la cuenta elegida
  const [limpiando, setLimpiando] = useState(false);

  // Borrar cuenta propia (zona de peligro del cliente)
  const [confirmBorrarCuenta, setConfirmBorrarCuenta] = useState('');
  const [borrandoCuenta, setBorrandoCuenta] = useState(false);

  // Editor de puntos del maniquí
  const [especiePuntos, setEspeciePuntos] = useState('perro');
  const [vistaPuntos, setVistaPuntos] = useState('ventral');
  const [puntoSel, setPuntoSel] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');

  // Editor de videos del caso
  const [casoEnEdicion, setCasoEnEdicion] = useState(null);
  const [vistaCaso, setVistaCaso] = useState('ventral');
  const [casoPuntoSel, setCasoPuntoSel] = useState(null);

  // Editor de exámenes complementarios del caso (laboratorio, rx, vitales)
  const [casoExamenes, setCasoExamenes] = useState(null);

  // Crear caso
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaEspecie, setNuevaEspecie] = useState('perro');

  // Subida / preview de video
  const [subiendo, setSubiendo] = useState(false);
  const [convProgreso, setConvProgreso] = useState(null); // % de conversión (o null)
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const canvasPuntosRef = useRef(null);
  const dragRef = useRef(null);

  // Fusiona el resultado de una Server Action sobre el estado actual, sin
  // perder los campos que esa acción no devuelve (rol, cuentaId, cuentas…).
  function fusionar(resultado) {
    setDatos((d) => ({ ...d, ...resultado }));
  }

  // Corre una Server Action: si devuelve {error} o falla la red, lo
  // muestra y devuelve null; si sale bien, fusiona y devuelve el resultado.
  async function ejecutar(accion, { fusionarResultado = true } = {}) {
    try {
      const r = await accion();
      if (r?.error) {
        // El servidor manda una clave (err.*) que se traduce aquí.
        alert(t(r.error, r.vars));
        if (r.codigo === 'sin-sesion') window.location.href = '/admin/login';
        return null;
      }
      if (fusionarResultado && r) fusionar(r);
      return r || {};
    } catch (err) {
      console.error(err);
      alert(t('comun.errorRed'));
      return null;
    }
  }

  const puntosDe = (especie, vista) =>
    (datos.puntos || []).filter((p) => p.especie === especie && (p.vista || 'ventral') === vista);

  const caso = (datos.casos || []).find((c) => c.id === casoEnEdicion) || null;
  const casoEx = (datos.casos || []).find((c) => c.id === casoExamenes) || null;
  const casosActivosCount = (datos.casos || []).filter((c) => c.activo).length;
  const cuentaElegida = (datos.cuentas || []).find((c) => c.id === datos.cuentaId) || null;

  // Sincronizar el nombre en edición al abrir el popup de un punto.
  useEffect(() => {
    if (!puntoSel) return;
    const p = (datos.puntos || []).find((x) => x.id === puntoSel);
    setNombreEdit(p ? p.nombre : '');
  }, [puntoSel, datos]);

  // Copia editable de la cuenta elegida (super_admin).
  useEffect(() => {
    setEdicionCuenta(cuentaElegida ? {
      nombre: cuentaElegida.nombre,
      cupoCasos: String(cuentaElegida.cupo_casos_propios),
      cupoStorage: String(cuentaElegida.cupo_storage_mb),
      activa: cuentaElegida.activa,
      idioma: cuentaElegida.idioma || 'es',
    } : null);
  }, [cuentaElegida?.id, cuentaElegida?.nombre, cuentaElegida?.cupo_casos_propios,
      cuentaElegida?.cupo_storage_mb, cuentaElegida?.activa, cuentaElegida?.idioma]);

  // ---------------- Cuentas (solo super_admin) ----------------
  async function elegirCuenta(cuentaId) {
    if (!cuentaId) return;
    setCambiandoCuenta(true);
    const r = await ejecutar(() => elegirCuentaAdmin(cuentaId));
    if (r) { setPuntoSel(null); setCasoEnEdicion(null); setCasoExamenes(null); }
    setCambiandoCuenta(false);
  }

  async function crearCuentaNueva() {
    const n = nuevaCuenta;
    if (!n.slug.trim() || !n.nombre.trim() || !n.correo.trim()) {
      alert(t('cuentas.completar'));
      return;
    }
    setCreandoCuenta(true);
    const r = await ejecutar(() => crearCuenta({
      slug: n.slug, nombre: n.nombre, correo: n.correo,
      cupoCasosPropios: n.cupoCasos || 0, cupoStorageMb: n.cupoStorage || 0,
      ...(datos.idiomasDisponibles ? { idioma: n.idioma } : {}),
    }));
    setCreandoCuenta(false);
    if (!r) return;
    // La clave temporal se muestra UNA sola vez: no se guarda en ningún lado.
    setClaveNueva({ titulo: t('cuentas.creada'), correos: [r.correo], clave: r.claveTemporal, slug: r.slug });
    setNuevaCuenta(cuentaVacia);
  }

  async function guardarCuentaElegida() {
    if (!edicionCuenta || !datos.cuentaId) return;
    const r = await ejecutar(() => actualizarCuenta(datos.cuentaId, {
      nombre: edicionCuenta.nombre,
      cupoCasosPropios: edicionCuenta.cupoCasos,
      cupoStorageMb: edicionCuenta.cupoStorage,
      activa: edicionCuenta.activa,
      ...(datos.idiomasDisponibles ? { idioma: edicionCuenta.idioma } : {}),
    }));
    if (r) alert(t('cuentas.guardada'));
  }

  async function restablecerClave() {
    if (!cuentaElegida) return;
    if (!confirm(t('cuentas.confirmRestablecer', { nombre: cuentaElegida.nombre }))) return;
    const r = await ejecutar(() => restablecerClaveCuenta(cuentaElegida.id), { fusionarResultado: false });
    if (r) setClaveNueva({ titulo: t('cuentas.restablecida'), correos: r.correos, clave: r.claveTemporal, slug: null });
  }

  async function limpiarHuerfanos() {
    if (!confirm(t('cuentas.confirmLimpiar'))) return;
    setLimpiando(true);
    const r = await ejecutar(() => limpiarVideosHuerfanos(), { fusionarResultado: false });
    setLimpiando(false);
    if (r) {
      alert(r.borrados
        ? t('cuentas.limpiezaOk', { n: r.borrados, mb: r.liberadosMb })
        : t('cuentas.sinHuerfanos'));
    }
  }

  // El cliente borra SU PROPIA cuenta. Si tiene éxito, la Server Action
  // cierra su sesión y devuelve {cuentaEliminada}; aquí se lleva al login.
  // (No se usa redirect() en la acción: Next.js lo entrega al llamador
  // como una excepción, y ejecutar() lo mostraba como "revisa tu conexión"
  // aunque la cuenta sí se había borrado.)
  async function borrarCuentaPropia() {
    if (confirmBorrarCuenta.trim() !== (datos.cuentaNombre || '')) return;
    setBorrandoCuenta(true);
    const r = await ejecutar(() => eliminarCuenta(datos.cuentaId), { fusionarResultado: false });
    if (r?.cuentaEliminada) { window.location.href = '/admin/login?cuenta_eliminada=1'; return; }
    setBorrandoCuenta(false);
  }

  // El super_admin borra la cuenta que tiene elegida en el selector.
  async function borrarCuentaElegida() {
    if (!cuentaElegida) return;
    const escrito = prompt(t('cuentas.promptBorrar', { nombre: cuentaElegida.nombre }));
    if (escrito === null) return;
    if (escrito.trim() !== cuentaElegida.nombre) { alert(t('cuentas.noCoincide')); return; }
    await ejecutar(() => eliminarCuenta(cuentaElegida.id));
  }

  // ---------------- Solicitudes de contacto (solo super_admin) ----------------
  function cambiarEstadoSolicitud(id, estado) {
    ejecutar(() => actualizarEstadoSolicitud(id, estado));
  }

  // ---------------- Editor de PUNTOS: arrastrar / clic ----------------
  function puntoPointerDown(e, p, i) {
    const rect = canvasPuntosRef.current.getBoundingClientRect();
    const pos = posToken(p, i);
    const cx = (pos.x / 100) * rect.width;
    const cy = (pos.y / 100) * rect.height;
    dragRef.current = {
      id: p.id, el: e.currentTarget, rect,
      ox: e.clientX - rect.left - cx, oy: e.clientY - rect.top - cy,
      sx: e.clientX, sy: e.clientY, moved: false, x: pos.x, y: pos.y, x0: pos.x, y0: pos.y,
    };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  }
  function puntoPointerMove(e) {
    const d = dragRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 4) d.moved = true;
    const nx = clamp(3, 97, ((e.clientX - d.rect.left - d.ox) / d.rect.width) * 100);
    const ny = clamp(3, 97, ((e.clientY - d.rect.top - d.oy) / d.rect.height) * 100);
    d.x = nx; d.y = ny;
    d.el.style.left = nx + '%';
    d.el.style.top = ny + '%';
  }
  async function puntoPointerUp() {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    if (d.moved) {
      const r = await ejecutar(() => actualizarPunto(datos.cuentaId, d.id, { x: d.x, y: d.y }));
      // Si no se pudo guardar, el punto vuelve a donde estaba.
      if (!r) { d.el.style.left = d.x0 + '%'; d.el.style.top = d.y0 + '%'; }
    } else {
      setPuntoSel(d.id);
    }
  }
  // El navegador canceló el gesto (p. ej. lo tomó como scroll): se
  // deshace el arrastre a medias en vez de dejarlo colgado.
  function puntoPointerCancel() {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    d.el.style.left = d.x0 + '%';
    d.el.style.top = d.y0 + '%';
  }

  async function nuevoPunto() {
    const r = await ejecutar(() => addPunto(datos.cuentaId, { especie: especiePuntos, vista: vistaPuntos }));
    if (r?.nuevoPuntoId) setPuntoSel(r.nuevoPuntoId);
  }
  async function guardarNombrePunto() {
    if (!puntoSel) return;
    const actual = (datos.puntos || []).find((p) => p.id === puntoSel);
    if (!actual || actual.nombre === nombreEdit.trim()) return; // nada que guardar
    await ejecutar(() => actualizarPunto(datos.cuentaId, puntoSel, { nombre: nombreEdit }));
  }
  async function borrarPunto() {
    if (!puntoSel) return;
    if (!confirm(t('maniqui.confirmBorrar'))) return;
    const id = puntoSel;
    setPuntoSel(null);
    await ejecutar(() => eliminarPunto(datos.cuentaId, id));
  }

  // ---------------- Casos ----------------
  async function crear() {
    if (!nuevoNombre.trim()) { alert(t('casos.alertNombre')); return; }
    const r = await ejecutar(() => crearCaso(datos.cuentaId, nuevoNombre, nuevaEspecie));
    if (r) setNuevoNombre('');
  }
  function activar(c) { ejecutar(() => alternarCasoActivo(datos.cuentaId, c.id, !c.activo)); }
  function renombrar(c, nombre) {
    if (nombre.trim() === c.nombre) return;
    ejecutar(() => renombrarCaso(datos.cuentaId, c.id, nombre));
  }
  function describir(c, descripcion) {
    if (descripcion.trim() === (c.descripcion || '')) return;
    ejecutar(() => describirCaso(datos.cuentaId, c.id, descripcion));
  }
  async function cambiarEspecie(c, especie, selectEl) {
    if (c.numVideos > 0 && !confirm(t('casos.confirmEspecie', {
      n: c.numVideos, de: t('especieMin.' + especieOk(c.especie)), a: t('especieMin.' + especieOk(especie)),
    }))) {
      selectEl.value = c.especie;
      return;
    }
    if (casoEnEdicion === c.id) setCasoPuntoSel(null);
    const r = await ejecutar(() => cambiarEspecieCaso(datos.cuentaId, c.id, especie));
    if (!r) selectEl.value = c.especie;
  }
  async function borrarCaso(id) {
    if (!confirm(t('casos.confirmBorrar'))) return;
    const r = await ejecutar(() => eliminarCaso(datos.cuentaId, id));
    if (r && casoEnEdicion === id) setCasoEnEdicion(null);
    if (r && casoExamenes === id) setCasoExamenes(null);
  }
  function editarVideos(id) {
    setCasoPuntoSel(null);
    setVistaCaso('ventral');
    setCasoEnEdicion(id);
  }
  function editarExamenes(id) {
    setCasoExamenes(id);
    // Lleva la vista al editor (queda debajo de la lista de casos).
    setTimeout(() => document.getElementById('editor-examenes')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }
  // Cuántos exámenes tiene cargados un caso (para la lista de casos).
  function resumenExamenesCaso(id) {
    const ex = datos.examenesPorCaso?.[id];
    if (!ex) return 0;
    let n = 0;
    if ((ex.laboratorio || []).length || (ex.archivos || []).some((a) => a.tipo === 'lab')) n++;
    if ((ex.archivos || []).some((a) => a.tipo === 'rx')) n++;
    if (Object.keys(ex.vitales || {}).length) n++;
    return n;
  }

  // ---------------- Videos del caso ----------------
  function elegirVideo() { fileInputRef.current?.click(); }
  async function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!casoEnEdicion || !casoPuntoSel) return;
    const casoId = casoEnEdicion;
    const puntoId = casoPuntoSel;
    setSubiendo(true);
    setConvProgreso(null);
    try {
      // Rechazar clips largos ANTES de convertir/subir nada (la conversión
      // es lo más lento del proceso). Si la duración no se pudo leer
      // (navegador raro, archivo corrupto), se deja pasar: ya fallará más
      // adelante con un error más claro al intentar reproducirlo/convertirlo.
      const duracion = await duracionDe(file);
      if (duracion != null && duracion > DURACION_MAX_SEG + 0.5) {
        alert(t('videos.duracion', { seg: Math.round(duracion), max: DURACION_MAX_SEG }));
        return;
      }

      // Todo se guarda como MP4/H.264 (el bucket solo acepta video/mp4): si
      // el archivo no es MP4 o el navegador no puede reproducirlo (p. ej.
      // MPEG-4 Parte 2 de los ecógrafos), se convierte aquí mismo.
      let aSubir = file;
      const esMp4 = file.type === 'video/mp4' || /\.mp4$/i.test(file.name);
      if (!esMp4 || !(await puedeReproducir(file))) {
        setConvProgreso(0);
        const blob = await convertirAH264(file, (p) => setConvProgreso(p));
        aSubir = new File([blob], 'video.mp4', { type: 'video/mp4' });
        setConvProgreso(null);
      }
      if (aSubir.size > MAX_MB_VIDEO * 1024 * 1024) {
        alert(t('videos.pesa', { mb: Math.round(aSubir.size / 1048576), max: MAX_MB_VIDEO }));
        return;
      }

      const subida = await ejecutar(() => crearUrlSubidaVideo(datos.cuentaId, aSubir.size), { fusionarResultado: false });
      if (!subida) return;
      const { error } = await crearClienteNavegador().storage.from('videos')
        // Cada path es un UUID nuevo que nunca se reescribe (un reemplazo
        // sube a un path distinto), así que el archivo es inmutable: puede
        // cachear casi para siempre en vez de 1 hora.
        .uploadToSignedUrl(subida.path, subida.token, aSubir, { cacheControl: '31536000', contentType: 'video/mp4' });
      if (error) throw error;
      await ejecutar(() => guardarVideoCaso(datos.cuentaId, casoId, puntoId, subida.path));
    } catch (err) {
      alert(t('videos.procesar', { error: err?.message || err }));
    } finally {
      setSubiendo(false);
      setConvProgreso(null);
    }
  }
  async function quitarVideo() {
    if (!casoEnEdicion || !casoPuntoSel) return;
    if (!confirm(t('videos.confirmQuitar'))) return;
    await ejecutar(() => quitarVideoCaso(datos.cuentaId, casoEnEdicion, casoPuntoSel));
  }
  function verVideo() {
    const url = datos.videosPorCaso?.[casoEnEdicion]?.[casoPuntoSel];
    if (!url) { alert(t('videos.sinVideoAlert')); return; }
    setPreviewUrl(url);
  }

  // ---------------- Render ----------------
  const listaPuntos = puntosDe(especiePuntos, vistaPuntos);
  const puntoSelObj = listaPuntos.find((p) => p.id === puntoSel);
  const esLadoPuntos = MANIQUIES.esLado(vistaPuntos);

  const especieCaso = caso ? caso.especie : 'perro';
  const listaCaso = caso ? puntosDe(especieCaso, vistaCaso) : [];
  const casoPuntoObj = listaCaso.find((p) => p.id === casoPuntoSel);
  const esLadoCaso = MANIQUIES.esLado(vistaCaso);
  const videosDelCaso = (caso && datos.videosPorCaso?.[caso.id]) || {};

  const hayCuenta = !!datos.cuentaId;
  const esSuperAdmin = datos.rol === 'super_admin';
  const solicitudesNuevas = (datos.solicitudes || []).filter((s) => s.estado === 'nueva').length;
  const slugActual = esSuperAdmin ? cuentaElegida?.slug : datos.cuentaSlug;

  return (
    <div className="admin-panel">
      <input
        ref={fileInputRef} type="file" accept="video/*"
        style={{ display: 'none' }} onChange={onFileChange}
      />

      {/* -------- Nav entre secciones (solo super_admin) -------- */}
      {esSuperAdmin && (
        <nav className="admin-nav">
          <button
            className={'admin-nav-tab' + (seccion === 'cuentas' ? ' act' : '')}
            onClick={() => setSeccion('cuentas')}
          >
            {t('nav.cuentas')}
          </button>
          <button
            className={'admin-nav-tab' + (seccion === 'solicitudes' ? ' act' : '')}
            onClick={() => setSeccion('solicitudes')}
          >
            {t('nav.solicitudes')}
            {solicitudesNuevas > 0 && <span className="admin-nav-badge">{solicitudesNuevas}</span>}
          </button>
          <button
            className={'admin-nav-tab' + (seccion === 'simulador' ? ' act' : '')}
            onClick={() => setSeccion('simulador')}
          >
            {t('nav.simulador')}{cuentaElegida ? ' · ' + cuentaElegida.nombre : ''}
          </button>
        </nav>
      )}

      {/* -------- Cuentas de clientes (solo super_admin) -------- */}
      {esSuperAdmin && seccion === 'cuentas' && (
        <section className="card">
          <h3>{t('cuentas.titulo')}</h3>
          <p className="muted">{t('cuentas.intro')}</p>
          <div className="row">
            <label className="lbl" htmlFor="selector-cuenta">{t('cuentas.activa')}</label>
            <select
              id="selector-cuenta"
              value={datos.cuentaId || ''}
              disabled={cambiandoCuenta}
              onChange={(e) => elegirCuenta(e.target.value)}
            >
              <option value="">{t('cuentas.elige')}</option>
              {(datos.cuentas || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{c.activa ? '' : t('cuentas.inactiva')}
                </option>
              ))}
            </select>
          </div>

          {/* Datos de la cuenta elegida: editar, contraseña, enlace, borrar */}
          {cuentaElegida && edicionCuenta && (
            <div className="editar-cuenta">
              <EnlaceEstudiantes slug={cuentaElegida.slug} />
              <div className="row">
                <label>{t('cuentas.nombre')}
                  <input value={edicionCuenta.nombre} maxLength={120}
                    onChange={(e) => setEdicionCuenta({ ...edicionCuenta, nombre: e.target.value })} />
                </label>
                <label>{t('cuentas.cupoCasos')}
                  <input type="number" min="0" step="1" value={edicionCuenta.cupoCasos}
                    onChange={(e) => setEdicionCuenta({ ...edicionCuenta, cupoCasos: e.target.value })} />
                </label>
                <label>{t('cuentas.cupoStorage')}
                  <input type="number" min="0" step="1" value={edicionCuenta.cupoStorage}
                    onChange={(e) => setEdicionCuenta({ ...edicionCuenta, cupoStorage: e.target.value })} />
                </label>
                {datos.idiomasDisponibles && (
                  <label>{t('cuentas.idioma')}
                    <select value={edicionCuenta.idioma}
                      onChange={(e) => setEdicionCuenta({ ...edicionCuenta, idioma: e.target.value })}>
                      {IDIOMAS.map((id) => <option key={id} value={id}>{NOMBRES_IDIOMA[id]}</option>)}
                    </select>
                  </label>
                )}
              </div>
              <div className="row">
                <label className="chk-activo" title={t('cuentas.activaTitle')}>
                  <input type="checkbox" checked={edicionCuenta.activa}
                    onChange={(e) => setEdicionCuenta({ ...edicionCuenta, activa: e.target.checked })} />
                  <span className={edicionCuenta.activa ? 'accent' : 'warn'}>
                    {edicionCuenta.activa ? t('cuentas.cuentaActiva') : t('cuentas.cuentaDesactivada')}
                  </span>
                </label>
                <button className="btn small btn-primary" onClick={guardarCuentaElegida}>{t('cuentas.guardar')}</button>
                <button className="btn small" onClick={restablecerClave}>{t('cuentas.restablecer')}</button>
                <button className="btn small danger" onClick={borrarCuentaElegida}>{t('cuentas.borrar')}</button>
              </div>
            </div>
          )}

          {/* Resumen de uso: quién se acerca a su cupo, sin entrar cuenta por cuenta. */}
          {(datos.cuentas || []).length > 0 && (
            <table className="tabla-cuentas">
              <thead>
                <tr>
                  <th>{t('cuentas.colCuenta')}</th><th>{t('cuentas.colEnlace')}</th>
                  {datos.idiomasDisponibles && <th>{t('cuentas.colIdioma')}</th>}
                  <th>{t('cuentas.colCasos')}</th><th>{t('cuentas.colStorage')}</th>
                </tr>
              </thead>
              <tbody>
                {(datos.cuentas || []).map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}{c.activa ? '' : t('cuentas.inactiva')}</td>
                    <td className="muted">/c/{c.slug}</td>
                    {datos.idiomasDisponibles && <td className="muted">{(c.idioma || 'es').toUpperCase()}</td>}
                    <td style={{ color: colorCupo(c.casosUsados, c.cupo_casos_propios) }}>
                      {c.casosUsados} / {c.cupo_casos_propios}
                    </td>
                    <td style={{ color: colorCupo(c.usoStorageMb, c.cupo_storage_mb) }}>
                      {c.usoStorageMb} / {c.cupo_storage_mb} MB
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="muted" style={{ marginTop: 14 }}>{t('cuentas.crearTitulo')}</p>
          <div className="row">
            <input
              value={nuevaCuenta.nombre}
              onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, nombre: e.target.value })}
              placeholder={t('cuentas.phNombre')} maxLength={120}
            />
            <input
              value={nuevaCuenta.slug}
              onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, slug: e.target.value })}
              placeholder={t('cuentas.phSlug')} maxLength={40}
              title={t('cuentas.slugTitle')}
            />
          </div>
          <div className="row">
            <input
              value={nuevaCuenta.cupoCasos}
              onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, cupoCasos: e.target.value })}
              placeholder={t('cuentas.phCupoCasos')} type="number" min="0" step="1"
            />
            <input
              value={nuevaCuenta.cupoStorage}
              onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, cupoStorage: e.target.value })}
              placeholder={t('cuentas.phCupoStorage')} type="number" min="0" step="1"
            />
          </div>
          <div className="row">
            <input
              value={nuevaCuenta.correo}
              onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, correo: e.target.value })}
              placeholder={t('cuentas.phCorreo')} type="email" maxLength={200}
            />
            {datos.idiomasDisponibles && (
              <select value={nuevaCuenta.idioma} aria-label={t('cuentas.idioma')} title={t('cuentas.idioma')}
                onChange={(e) => setNuevaCuenta({ ...nuevaCuenta, idioma: e.target.value })}>
                {IDIOMAS.map((id) => <option key={id} value={id}>{NOMBRES_IDIOMA[id]}</option>)}
              </select>
            )}
            <button className="btn btn-primary" disabled={creandoCuenta} onClick={crearCuentaNueva}>
              {creandoCuenta ? t('cuentas.creando') : t('cuentas.crear')}
            </button>
          </div>

          <p className="muted" style={{ marginTop: 18 }}>{t('cuentas.mantenimiento')}</p>
          <button className="btn small" disabled={limpiando} onClick={limpiarHuerfanos}>
            {limpiando ? t('cuentas.limpiando') : t('cuentas.limpiar')}
          </button>
        </section>
      )}

      {/* -------- Solicitudes de contacto (solo super_admin) -------- */}
      {esSuperAdmin && seccion === 'solicitudes' && (
        <section className="card">
          <h3>{t('solicitudes.titulo')}</h3>
          <p className="muted">{t('solicitudes.intro')}</p>
          {(datos.solicitudes || []).length ? (datos.solicitudes).map((s) => (
            <div className="item" key={s.id}>
              <div style={{ flex: '1 1 260px', minWidth: 0, overflowWrap: 'anywhere' }}>
                <strong>{s.nombre}</strong>
                {s.clinica && <span className="muted"> · {s.clinica}</span>}
                <div className="muted" style={{ fontSize: 13 }}>
                  <a href={'mailto:' + s.correo}>{s.correo}</a>{s.telefono && ' · ' + s.telefono} · <FechaLocal iso={s.creada_en} />
                </div>
                {s.mensaje && (
                  <div style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{s.mensaje}</div>
                )}
              </div>
              <select
                value={s.estado}
                onChange={(e) => cambiarEstadoSolicitud(s.id, e.target.value)}
                title={t('solicitudes.estadoTitle')}
              >
                {['nueva', 'contactada', 'convertida', 'descartada'].map((e) => (
                  <option key={e} value={e}>{t('solicitudes.estados.' + e)}</option>
                ))}
              </select>
            </div>
          )) : <p className="muted">{t('solicitudes.vacio')}</p>}
        </section>
      )}

      {/* -------- Super_admin en «Simulador» sin cuenta elegida -------- */}
      {esSuperAdmin && seccion === 'simulador' && !hayCuenta && (
        <section className="card">
          <h3>{t('eligeCuenta.titulo')}</h3>
          <p className="muted">{t('eligeCuenta.texto')}</p>
          <button className="btn btn-primary" onClick={() => setSeccion('cuentas')}>{t('eligeCuenta.ir')}</button>
        </section>
      )}

      {hayCuenta && (!esSuperAdmin || seccion === 'simulador') && <>
      {/* -------- Casos activos -------- */}
      <section className="card">
        <h3>{t('activos.titulo')}</h3>
        <p className="muted">{t('activos.intro')}</p>
        <div style={{ fontSize: 15, marginTop: 4 }}>
          {casosActivosCount
            ? <>{t('activos.ahora')} <span className="accent">{casosActivosCount}</span></>
            : <span className="warn">{t('activos.ninguno')}</span>}
        </div>
        <EnlaceEstudiantes slug={slugActual} />
        {!esSuperAdmin && datos.idiomasDisponibles && (
          <p className="muted nota-idioma">{t('activos.idiomaEst', { idioma: t('idiomas.' + (datos.cuentaIdioma || 'es')) })}</p>
        )}
        {datos.cupoCasosPropios != null && (
          <BarraCupo etiqueta={t('activos.barraCasos')} usado={(datos.casos || []).length} tope={datos.cupoCasosPropios} />
        )}
        {datos.cupoStorageMb != null && (
          <BarraCupo etiqueta={t('activos.barraStorage')} usado={datos.usoStorageMb ?? 0} tope={datos.cupoStorageMb} unidad=" MB" />
        )}
      </section>

      {/* -------- Maniquí: puntos del cuerpo (propios de esta cuenta) -------- */}
      <section className="card">
        <div className="editor-head">
          <h3>{t('maniqui.titulo')}</h3>
          <div className="editor-tools">
            <label className="tool-lbl">{t('comun.especie')}
              <select value={especiePuntos} onChange={(e) => { setPuntoSel(null); setEspeciePuntos(e.target.value); }}>
                <option value="perro">{t('especie.perro')}</option>
                <option value="gato">{t('especie.gato')}</option>
              </select>
            </label>
            <button className="btn small btn-primary" onClick={nuevoPunto}>{t('maniqui.anadir')}</button>
          </div>
        </div>
        <p className="muted">{t('maniqui.intro')}</p>

        <div className="tabs">
          {VISTAS.map((v) => (
            <button key={v}
              className={'tab' + (v === vistaPuntos ? ' act' : '')}
              onClick={() => { setPuntoSel(null); setVistaPuntos(v); }}>
              {t('vistas.' + v)}
            </button>
          ))}
        </div>
        <div className="mq-leyenda">
          <span className="muted">{t('maniqui.leyenda')}</span>
        </div>

        <div className="mq-stage">
          <div
            ref={canvasPuntosRef}
            className={'mq-canvas' + (esLadoPuntos ? ' lado' : '')}
            style={{ '--mq-ratio': MANIQUIES.ratio(especiePuntos, vistaPuntos) }}
            onPointerDown={(e) => {
              if (!e.target.closest('.mq-token') && !e.target.closest('.mq-pop')) setPuntoSel(null);
            }}
          >
            <div className="mq-arte" dangerouslySetInnerHTML={{ __html: MANIQUIES.svg(especiePuntos, vistaPuntos, t('mq.' + vistaPuntos, { especie: especiePuntos })) }} />
            {listaPuntos.map((p, i) => {
              const pos = posToken(p, i);
              return (
                <div key={p.id}
                  className={'mq-token config' + (p.id === puntoSel ? ' sel' : '')}
                  style={{ left: pos.x + '%', top: pos.y + '%' }}
                  onPointerDown={(e) => puntoPointerDown(e, p, i)}
                  onPointerMove={puntoPointerMove}
                  onPointerUp={puntoPointerUp}
                  onPointerCancel={puntoPointerCancel}
                >
                  <span>{i + 1}</span>
                  <div className="mq-token-lbl">{p.nombre}</div>
                </div>
              );
            })}

            {puntoSelObj && (
              <div className="mq-pop" style={popStyle(posToken(puntoSelObj, listaPuntos.indexOf(puntoSelObj)))}>
                <label>{t('maniqui.nombreParte')}</label>
                <input
                  value={nombreEdit}
                  autoFocus
                  maxLength={80}
                  onChange={(e) => setNombreEdit(e.target.value)}
                  onBlur={guardarNombrePunto}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                  placeholder={t('maniqui.phParte')}
                />
                <div className="mq-pop-foot">
                  <button className="btn small danger" onClick={borrarPunto}>{t('comun.borrar')}</button>
                  <button className="btn small btn-primary" onClick={async () => { await guardarNombrePunto(); setPuntoSel(null); }}>{t('comun.listo')}</button>
                </div>
              </div>
            )}
          </div>
          {!listaPuntos.length && <p className="muted mq-vacio">{t('maniqui.vacio')}</p>}
        </div>
      </section>

      {/* -------- Casos -------- */}
      <section className="card">
        <h3>{t('casos.titulo')}</h3>
        {(datos.casos || []).length ? (datos.casos).map((c) => (
          <div className="item" key={c.id}>
            <input className="nombre-caso" defaultValue={c.nombre} maxLength={120}
              onBlur={(e) => renombrar(c, e.target.value)} />
            <select value={c.especie} onChange={(e) => cambiarEspecie(c, e.target.value, e.target)} title={t('comun.especieTitle')}>
              <option value="perro">{t('especie.perro')}</option>
              <option value="gato">{t('especie.gato')}</option>
            </select>
            <span className="muted">{t('casos.videos', { n: c.numVideos })}</span>
            <label className="chk-activo" title={t('casos.activoTitle')}>
              <input type="checkbox" checked={!!c.activo} onChange={() => activar(c)} />
              <span className={c.activo ? 'accent' : 'muted'}>{c.activo ? t('casos.activo') : t('casos.inactivo')}</span>
            </label>
            <button className="btn small" onClick={() => editarVideos(c.id)}>{t('casos.asignar')}</button>
            {datos.examenesDisponibles && (
              <button className="btn small" onClick={() => editarExamenes(c.id)}>
                {t('casos.examenes', { n: resumenExamenesCaso(c.id) })}
              </button>
            )}
            <button className="btn small danger" onClick={() => borrarCaso(c.id)}>{t('comun.borrar')}</button>
            <textarea
              className="descripcion-caso"
              defaultValue={c.descripcion || ''}
              onBlur={(e) => describir(c, e.target.value)}
              placeholder={t('casos.phDescripcion')}
              rows={2}
              maxLength={500}
            />
          </div>
        )) : <p className="muted">{t('casos.vacio')}</p>}

        <div className="row">
          <input value={nuevoNombre} maxLength={120} onChange={(e) => setNuevoNombre(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') crear(); }}
            placeholder={t('casos.phNuevo')} />
          <select value={nuevaEspecie} onChange={(e) => setNuevaEspecie(e.target.value)} title={t('comun.especieTitle')}>
            <option value="perro">{t('especie.perro')}</option>
            <option value="gato">{t('especie.gato')}</option>
          </select>
          <button className="btn" onClick={crear}>{t('casos.crear')}</button>
        </div>
      </section>

      {/* -------- Videos del caso -------- */}
      {caso && (
        <section className="card">
          <div className="editor-head">
            <h3>{t('videos.titulo')} <span className="accent">{caso.nombre}</span></h3>
            <button className="btn small" onClick={() => setCasoEnEdicion(null)}>{t('comun.cerrar')}</button>
          </div>
          <p className="muted">{t('videos.intro')}</p>

          <div className="tabs">
            {VISTAS.map((v) => (
              <button key={v}
                className={'tab' + (v === vistaCaso ? ' act' : '')}
                onClick={() => { setCasoPuntoSel(null); setVistaCaso(v); }}>
                {t('vistas.' + v)}
              </button>
            ))}
          </div>
          <div className="mq-leyenda">
            <span><i className="dotleg config" />{t('videos.conVideo')}</span>
            <span><i className="dotleg sinvid" />{t('videos.sinVideo')}</span>
          </div>

          <div className="mq-stage">
            <div
              className={'mq-canvas' + (esLadoCaso ? ' lado' : '')}
              style={{ '--mq-ratio': MANIQUIES.ratio(especieCaso, vistaCaso) }}
              onPointerDown={(e) => {
                if (!e.target.closest('.mq-token') && !e.target.closest('.mq-pop')) setCasoPuntoSel(null);
              }}
            >
              <div className="mq-arte" dangerouslySetInnerHTML={{ __html: MANIQUIES.svg(especieCaso, vistaCaso, t('mq.' + vistaCaso, { especie: especieCaso })) }} />
              {listaCaso.map((p, i) => {
                const pos = posToken(p, i);
                const clase = videosDelCaso[p.id] ? 'config' : 'sinvid';
                return (
                  <div key={p.id}
                    className={'mq-token ' + clase + (p.id === casoPuntoSel ? ' sel' : '')}
                    style={{ left: pos.x + '%', top: pos.y + '%', cursor: 'pointer' }}
                    onClick={() => setCasoPuntoSel(p.id)}
                  >
                    <span>{i + 1}</span>
                    <div className="mq-token-lbl">{p.nombre}</div>
                  </div>
                );
              })}

              {casoPuntoObj && (
                <div className="mq-pop" style={popStyle(posToken(casoPuntoObj, listaCaso.indexOf(casoPuntoObj)))}>
                  <div className="pop-titulo">{casoPuntoObj.nombre}</div>
                  <div className={'pop-estado' + (videosDelCaso[casoPuntoObj.id] ? ' con-video' : '')}>
                    {subiendo
                      ? (convProgreso !== null ? t('videos.convirtiendo', { pct: convProgreso }) : t('videos.subiendo'))
                      : (videosDelCaso[casoPuntoObj.id] ? t('videos.videoOk') : t('videos.sinVideoMin'))}
                  </div>
                  {subiendo && convProgreso !== null && (
                    <div className="pop-nota">{t('videos.notaConv')}</div>
                  )}
                  {!subiendo && (
                    <div className="pop-nota">{t('videos.notaMax', { seg: DURACION_MAX_SEG, mb: MAX_MB_VIDEO })}</div>
                  )}
                  <div className="row" style={{ margin: 0 }}>
                    <button className="btn small" disabled={subiendo} onClick={elegirVideo}>
                      {videosDelCaso[casoPuntoObj.id] ? t('videos.reemplazar') : t('videos.elegir')}
                    </button>
                    <button className="btn small" disabled={!videosDelCaso[casoPuntoObj.id]} onClick={verVideo}
                      title={t('videos.ver')} aria-label={t('videos.ver')}>▶</button>
                  </div>
                  <div className="mq-pop-foot">
                    <button className="btn small danger" disabled={subiendo || !videosDelCaso[casoPuntoObj.id]}
                      onClick={quitarVideo}>{t('videos.quitar')}</button>
                    <button className="btn small btn-primary" onClick={() => setCasoPuntoSel(null)}>{t('comun.listo')}</button>
                  </div>
                </div>
              )}
            </div>
            {!listaCaso.length && <p className="muted mq-vacio">{t('videos.vacio')}</p>}
          </div>
        </section>
      )}

      {/* -------- Exámenes complementarios del caso -------- */}
      {casoEx && datos.examenesDisponibles && (
        <div id="editor-examenes">
          <EditorExamenes
            key={casoEx.id}
            cuentaId={datos.cuentaId}
            caso={casoEx}
            examenes={datos.examenesPorCaso?.[casoEx.id]}
            ejecutar={ejecutar}
            onCerrar={() => setCasoExamenes(null)}
          />
        </div>
      )}

      {/* -------- Zona de peligro: borrar la cuenta propia (no aplica
          al super_admin, que borra cuentas desde la pestaña «Cuentas») -------- */}
      {!esSuperAdmin && (
        <section className="card card-peligro">
          <h3>{t('peligro.titulo')}</h3>
          <p className="muted">{t('peligro.texto')}</p>
          <div className="row">
            <input
              value={confirmBorrarCuenta}
              onChange={(e) => setConfirmBorrarCuenta(e.target.value)}
              placeholder={t('peligro.ph', { nombre: datos.cuentaNombre || '' })}
            />
            <button
              className="btn danger"
              disabled={borrandoCuenta || confirmBorrarCuenta.trim() !== (datos.cuentaNombre || '')}
              onClick={borrarCuentaPropia}
            >
              {borrandoCuenta ? t('peligro.borrando') : t('peligro.borrar')}
            </button>
          </div>
        </section>
      )}
      </>}

      {/* -------- Contraseña temporal (se muestra una sola vez) -------- */}
      {claveNueva && (
        <div className="overlay">
          <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="titulo-clave">
            <h4 id="titulo-clave">{claveNueva.titulo}</h4>
            <p>{t('claveModal.para', { correos: claveNueva.correos.join(', ') })}</p>
            <Copiable valor={claveNueva.clave} />
            {claveNueva.slug && <EnlaceEstudiantes slug={claveNueva.slug} />}
            <p>
              {t('claveModal.antes')}<strong>{t('claveModal.fuerte')}</strong>{t('claveModal.despues')}
            </p>
            <div className="modal-acciones">
              <button className="btn btn-primary" onClick={() => setClaveNueva(null)}>{t('claveModal.ok')}</button>
            </div>
          </div>
        </div>
      )}

      {/* -------- Vista previa de video -------- */}
      {previewUrl && (
        <div className="overlay" onClick={() => setPreviewUrl(null)}>
          <video src={previewUrl} controls autoPlay muted onClick={(e) => e.stopPropagation()} />
          <button className="btn small" onClick={() => setPreviewUrl(null)}>{t('comun.cerrar')}</button>
        </div>
      )}
    </div>
  );
}
