'use client';
// ============================================================
// Panel de administración interactivo.
//
// Cada acción llama a una Server Action (que valida la sesión y escribe
// en Supabase) y devuelve el estado actualizado, que FUSIONAMOS sobre
// "datos" (no lo reemplazamos entero): casi ninguna acción vuelve a mandar
// rol/cuentaId/cuentas/cupoCasosPropios, así que un reemplazo completo los
// borraría del estado tras el primer clic.
// ============================================================
import { useState, useEffect, useRef } from 'react';
import { MANIQUIES } from '@/lib/maniquies';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { puedeReproducir, convertirAH264, duracionDe } from '@/lib/convertir-video';
import {
  elegirCuentaAdmin, crearCuenta, eliminarCuenta, actualizarEstadoSolicitud,
  alternarCasoActivo, crearCaso, renombrarCaso, describirCaso, cambiarEspecieCaso, eliminarCaso,
  addPunto, actualizarPunto, eliminarPunto,
  crearUrlSubidaVideo, guardarVideoCaso, quitarVideoCaso,
} from '@/app/actions/admin';

// Tope de duración por video: clips cortos alcanzan igual para mostrar un
// punto de ecografía, y mantienen el storage (y el costo) bajo control.
const DURACION_MAX_SEG = 10;

const VISTAS = [
  { id: 'ventral', label: 'Por debajo' },
  { id: 'izq', label: 'Lado izquierdo' },
  { id: 'der', label: 'Lado derecho' },
];

const clamp = (min, max, v) => Math.max(min, Math.min(max, v));

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

// Fecha y hora en la zona del navegador del admin. Se pinta solo tras montar:
// el servidor no conoce esa zona, y un HTML inicial distinto del que calcula
// el navegador provocaría un error de hidratación de React.
function FechaLocal({ iso }) {
  const [texto, setTexto] = useState('');
  useEffect(() => {
    setTexto(new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' }));
  }, [iso]);
  return <span>{texto}</span>;
}

// Cupo como barra: más fácil de leer de un vistazo que solo el número.
// Cambia de color cuando se acerca o llega al tope (mismo lenguaje que
// los 3 estados del token del maniquí: cian / amarillo / rojo).
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

export default function AdminPanel({ inicial }) {
  const [datos, setDatos] = useState(inicial);

  // Qué sección se ve (solo aplica si hay más de una, es decir
  // super_admin: cliente no tiene ni Cuentas ni Solicitudes). Arranca en
  // "cuentas" solo si todavía no hay ninguna elegida.
  const [seccion, setSeccion] = useState(
    () => (inicial.rol === 'super_admin' && !inicial.cuentaId) ? 'cuentas' : 'simulador'
  );

  // Selector / alta de cuentas (solo super_admin)
  const [cambiandoCuenta, setCambiandoCuenta] = useState(false);
  const [nuevaCuentaSlug, setNuevaCuentaSlug] = useState('');
  const [nuevaCuentaNombre, setNuevaCuentaNombre] = useState('');
  const [nuevaCuentaCupoCasos, setNuevaCuentaCupoCasos] = useState('');
  const [nuevaCuentaCupoStorage, setNuevaCuentaCupoStorage] = useState('');
  const [nuevaCuentaCorreo, setNuevaCuentaCorreo] = useState('');
  const [creandoCuenta, setCreandoCuenta] = useState(false);

  // Borrar cuenta (zona de peligro)
  const [confirmBorrarCuenta, setConfirmBorrarCuenta] = useState('');
  const [borrandoCuenta, setBorrandoCuenta] = useState(false);

  // Editor de puntos (maniquí global)
  const [especiePuntos, setEspeciePuntos] = useState('perro');
  const [vistaPuntos, setVistaPuntos] = useState('ventral');
  const [guias, setGuias] = useState(true);
  const [puntoSel, setPuntoSel] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');

  // Editor de videos del caso
  const [casoEnEdicion, setCasoEnEdicion] = useState(null);
  const [vistaCaso, setVistaCaso] = useState('ventral');
  const [casoPuntoSel, setCasoPuntoSel] = useState(null);

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

  const puntosDe = (especie, vista) =>
    (datos.puntos || []).filter((p) => p.especie === especie && (p.vista || 'ventral') === vista);

  const caso = (datos.casos || []).find((c) => c.id === casoEnEdicion) || null;
  const casosActivosCount = (datos.casos || []).filter((c) => c.activo).length;

  // Sincronizar el nombre en edición al abrir el popup de un punto.
  useEffect(() => {
    if (!puntoSel) return;
    const p = (datos.puntos || []).find((x) => x.id === puntoSel);
    setNombreEdit(p ? p.nombre : '');
  }, [puntoSel, datos]);

  // ---------------- Cuentas (solo super_admin) ----------------
  async function elegirCuenta(cuentaId) {
    if (!cuentaId) return;
    setCambiandoCuenta(true);
    try {
      fusionar(await elegirCuentaAdmin(cuentaId));
      setPuntoSel(null);
      setCasoEnEdicion(null);
    } catch (err) {
      alert(err?.message || 'No se pudo cambiar de cuenta.');
    } finally {
      setCambiandoCuenta(false);
    }
  }

  async function crearCuentaNueva() {
    if (!nuevaCuentaSlug.trim() || !nuevaCuentaNombre.trim() || !nuevaCuentaCorreo.trim()) {
      alert('Completa slug, nombre y correo para crear la cuenta.');
      return;
    }
    setCreandoCuenta(true);
    try {
      const r = await crearCuenta({
        slug: nuevaCuentaSlug,
        nombre: nuevaCuentaNombre,
        cupoCasosPropios: Number(nuevaCuentaCupoCasos) || 0,
        cupoStorageMb: Number(nuevaCuentaCupoStorage) || 0,
        correo: nuevaCuentaCorreo,
      });
      if (r.error) { alert(r.error); return; }
      // La clave temporal se muestra UNA sola vez, antes de fusionar el
      // resto del resultado al estado: no se vuelve a guardar en ningún
      // lado, así que si se pierde este alert hay que resetear la
      // contraseña del cliente a mano desde Supabase.
      alert(
        'Cuenta creada. Contraseña temporal para ' + nuevaCuentaCorreo + ': ' + r.claveTemporal +
          ' — cópiala y pásasela al cliente, no se vuelve a mostrar.'
      );
      fusionar(r);
      setNuevaCuentaSlug('');
      setNuevaCuentaNombre('');
      setNuevaCuentaCupoCasos('');
      setNuevaCuentaCupoStorage('');
      setNuevaCuentaCorreo('');
    } catch (err) {
      alert(err?.message || 'No se pudo crear la cuenta.');
    } finally {
      setCreandoCuenta(false);
    }
  }

  // El cliente borra SU PROPIA cuenta. Si tiene éxito, la Server Action
  // cierra su sesión y lo redirige a /admin/login — por eso aquí no hace
  // falta fusionar nada en caso de éxito, esta función de hecho no
  // vuelve a ejecutarse (la página cambia).
  async function borrarCuentaPropia() {
    if (confirmBorrarCuenta.trim() !== (datos.cuentaNombre || '')) return;
    setBorrandoCuenta(true);
    try {
      const r = await eliminarCuenta(datos.cuentaId);
      if (r?.error) { alert(r.error); setBorrandoCuenta(false); }
    } catch (err) {
      alert(err?.message || 'No se pudo borrar la cuenta.');
      setBorrandoCuenta(false);
    }
  }

  // El super_admin borra la cuenta que tiene elegida en el selector.
  async function borrarCuentaElegida() {
    const cuenta = (datos.cuentas || []).find((c) => c.id === datos.cuentaId);
    if (!cuenta) return;
    const escrito = prompt(
      'Esto borra TODO de "' + cuenta.nombre + '": sus casos, videos y el acceso de su administrador, ' +
        'sin reversa. Escribe el nombre exacto de la cuenta para confirmar:'
    );
    if (escrito === null) return;
    if (escrito.trim() !== cuenta.nombre) { alert('El nombre no coincide. No se borró nada.'); return; }
    try {
      const r = await eliminarCuenta(cuenta.id);
      if (r.error) { alert(r.error); return; }
      fusionar(r);
    } catch (err) {
      alert(err?.message || 'No se pudo borrar la cuenta.');
    }
  }

  // ---------------- Solicitudes de contacto (solo super_admin) ----------------
  async function cambiarEstadoSolicitud(id, estado) {
    try {
      fusionar(await actualizarEstadoSolicitud(id, estado));
    } catch (err) {
      alert(err?.message || 'No se pudo cambiar el estado de la solicitud.');
    }
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
      sx: e.clientX, sy: e.clientY, moved: false, x: pos.x, y: pos.y,
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
      try {
        const r = await actualizarPunto(datos.cuentaId, d.id, { x: Math.round(d.x * 10) / 10, y: Math.round(d.y * 10) / 10 });
        if (r.error) { alert(r.error); return; }
        fusionar(r);
      } catch (err) {
        alert(err?.message || 'No se pudo mover el punto.');
      }
    } else {
      setPuntoSel(d.id);
    }
  }

  async function nuevoPunto() {
    try {
      const r = await addPunto(datos.cuentaId, { especie: especiePuntos, vista: vistaPuntos });
      if (r.error) { alert(r.error); return; }
      fusionar(r);
      if (r.nuevoPuntoId) setPuntoSel(r.nuevoPuntoId);
    } catch (err) {
      alert(err?.message || 'No se pudo crear el punto.');
    }
  }
  async function guardarNombrePunto() {
    if (!puntoSel) return;
    try {
      const r = await actualizarPunto(datos.cuentaId, puntoSel, { nombre: nombreEdit });
      if (r.error) { alert(r.error); return; }
      fusionar(r);
    } catch (err) {
      alert(err?.message || 'No se pudo guardar el nombre.');
    }
  }
  async function borrarPunto() {
    if (!puntoSel) return;
    if (!confirm('¿Borrar este punto del cuerpo?\nTodos los casos perderán el video asignado a este punto.')) return;
    const id = puntoSel;
    setPuntoSel(null);
    try {
      const r = await eliminarPunto(datos.cuentaId, id);
      if (r.error) { alert(r.error); return; }
      fusionar(r);
    } catch (err) {
      alert(err?.message || 'No se pudo borrar el punto.');
    }
  }

  // ---------------- Casos ----------------
  async function crear() {
    if (!nuevoNombre.trim()) { alert('Escribe un nombre para el caso.'); return; }
    try {
      const r = await crearCaso(datos.cuentaId, nuevoNombre, nuevaEspecie);
      if (r.error) { alert(r.error); return; }
      fusionar(r);
      setNuevoNombre('');
    } catch (err) {
      alert(err?.message || 'No se pudo crear el caso.');
    }
  }
  async function activar(c) { fusionar(await alternarCasoActivo(datos.cuentaId, c.id, !c.activo)); }
  async function renombrar(id, nombre) { fusionar(await renombrarCaso(datos.cuentaId, id, nombre)); }
  async function describir(id, descripcion) { fusionar(await describirCaso(datos.cuentaId, id, descripcion)); }
  async function cambiarEspecie(id, especie) { fusionar(await cambiarEspecieCaso(datos.cuentaId, id, especie)); }
  async function borrarCaso(id) {
    if (!confirm('¿Borrar este caso y todos sus videos?')) return;
    const nuevos = await eliminarCaso(datos.cuentaId, id);
    if (casoEnEdicion === id) setCasoEnEdicion(null);
    fusionar(nuevos);
  }
  function editarVideos(id) {
    setCasoPuntoSel(null);
    setVistaCaso('ventral');
    setCasoEnEdicion(id);
  }

  // ---------------- Videos del caso ----------------
  function elegirVideo() { fileInputRef.current?.click(); }
  async function onFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!casoEnEdicion || !casoPuntoSel) return;
    setSubiendo(true);
    setConvProgreso(null);
    try {
      // Rechazar clips largos ANTES de convertir/subir nada (la conversión
      // es lo más lento del proceso). Si la duración no se pudo leer
      // (navegador raro, archivo corrupto), se deja pasar: ya fallará más
      // adelante con un error más claro al intentar reproducirlo/convertirlo.
      const duracion = await duracionDe(file);
      if (duracion != null && duracion > DURACION_MAX_SEG) {
        alert(
          'Este video dura ' + Math.round(duracion) + ' segundos. El máximo permitido es ' +
            DURACION_MAX_SEG + ' segundos — recórtalo y vuelve a intentar.'
        );
        return;
      }

      // Si el navegador NO puede reproducir el video (p. ej. MPEG-4 Parte 2
      // de los ecógrafos), lo convertimos a H.264 aquí mismo antes de subir.
      let aSubir = file;
      const reproducible = await puedeReproducir(file);
      if (!reproducible) {
        setConvProgreso(0);
        const blob = await convertirAH264(file, (p) => setConvProgreso(p));
        aSubir = new File([blob], 'video.mp4', { type: 'video/mp4' });
        setConvProgreso(null);
      }
      const subida = await crearUrlSubidaVideo(datos.cuentaId, aSubir.size);
      if (subida.error) { alert(subida.error); return; }
      const { path, token } = subida;
      const supabase = crearClienteNavegador();
      // Cada path es un UUID nuevo que nunca se reescribe (un reemplazo sube
      // a un path distinto), así que el archivo es inmutable: puede cachear
      // casi para siempre en vez del valor por defecto de Supabase (1 hora).
      const { error } = await supabase.storage.from('videos')
        .uploadToSignedUrl(path, token, aSubir, { cacheControl: '31536000' });
      if (error) throw error;
      const guardado = await guardarVideoCaso(datos.cuentaId, casoEnEdicion, casoPuntoSel, path, aSubir.size);
      if (guardado.error) { alert(guardado.error); return; }
      fusionar(guardado);
    } catch (err) {
      alert('No se pudo procesar el video: ' + (err?.message || err));
    } finally {
      setSubiendo(false);
      setConvProgreso(null);
    }
  }
  async function quitarVideo() {
    if (!casoEnEdicion || !casoPuntoSel) return;
    if (!confirm('¿Quitar el video de este punto en este caso?')) return;
    fusionar(await quitarVideoCaso(datos.cuentaId, casoEnEdicion, casoPuntoSel));
  }
  function verVideo() {
    const url = datos.videosPorCaso?.[casoEnEdicion]?.[casoPuntoSel];
    if (!url) { alert('Este punto aún no tiene video en este caso.'); return; }
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

  return (
    <div className="admin-panel">
      <input
        ref={fileInputRef} type="file" accept="video/*"
        style={{ display: 'none' }} onChange={onFileChange}
      />

      {/* -------- Nav entre secciones (solo tiene sentido con más de una,
          es decir, para super_admin) -------- */}
      {esSuperAdmin && (
        <nav className="admin-nav">
          <button
            className={'admin-nav-tab' + (seccion === 'cuentas' ? ' act' : '')}
            onClick={() => setSeccion('cuentas')}
          >
            Cuentas
          </button>
          <button
            className={'admin-nav-tab' + (seccion === 'solicitudes' ? ' act' : '')}
            onClick={() => setSeccion('solicitudes')}
          >
            Solicitudes
            {solicitudesNuevas > 0 && <span className="admin-nav-badge">{solicitudesNuevas}</span>}
          </button>
          <button
            className={'admin-nav-tab' + (seccion === 'simulador' ? ' act' : '')}
            onClick={() => setSeccion('simulador')}
          >
            Simulador
          </button>
        </nav>
      )}

      {/* -------- Cuentas de clientes (solo super_admin) -------- */}
      {esSuperAdmin && seccion === 'cuentas' && (
        <section className="card">
          <h3>Cuentas de clientes</h3>
          <p className="muted">
            Elige con qué cuenta quieres trabajar abajo, o crea una cuenta
            nueva para un cliente.
          </p>
          <div className="row">
            <label className="lbl" htmlFor="selector-cuenta">Cuenta activa:</label>
            <select
              id="selector-cuenta"
              value={datos.cuentaId || ''}
              disabled={cambiandoCuenta}
              onChange={(e) => elegirCuenta(e.target.value)}
            >
              <option value="">— Elige una cuenta —</option>
              {(datos.cuentas || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}{c.activa ? '' : ' (inactiva)'}
                </option>
              ))}
            </select>
            {datos.cuentaId && (
              <button className="btn small danger" onClick={borrarCuentaElegida}>
                Borrar esta cuenta
              </button>
            )}
          </div>

          {/* Resumen de uso: para ver de un vistazo quién se acerca a su
              cupo, sin entrar cuenta por cuenta. */}
          {(datos.cuentas || []).length > 0 && (
            <table className="tabla-cuentas">
              <thead>
                <tr><th>Cuenta</th><th>Casos</th><th>Storage</th></tr>
              </thead>
              <tbody>
                {(datos.cuentas || []).map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}{c.activa ? '' : ' (inactiva)'}</td>
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

          <p className="muted" style={{ marginTop: 14 }}>Crear una cuenta nueva:</p>
          <div className="row">
            <input
              value={nuevaCuentaSlug}
              onChange={(e) => setNuevaCuentaSlug(e.target.value)}
              placeholder="slug (ej. clinica-norte)"
            />
            <input
              value={nuevaCuentaNombre}
              onChange={(e) => setNuevaCuentaNombre(e.target.value)}
              placeholder="Nombre de la clínica"
            />
          </div>
          <div className="row">
            <input
              value={nuevaCuentaCupoCasos}
              onChange={(e) => setNuevaCuentaCupoCasos(e.target.value)}
              placeholder="Cupo de casos propios"
              type="number" min="0"
            />
            <input
              value={nuevaCuentaCupoStorage}
              onChange={(e) => setNuevaCuentaCupoStorage(e.target.value)}
              placeholder="Cupo de almacenamiento (MB)"
              type="number" min="0"
            />
          </div>
          <div className="row">
            <input
              value={nuevaCuentaCorreo}
              onChange={(e) => setNuevaCuentaCorreo(e.target.value)}
              placeholder="Correo del cliente"
              type="email"
            />
            <button className="btn btn-primary" disabled={creandoCuenta} onClick={crearCuentaNueva}>
              {creandoCuenta ? 'Creando…' : 'Crear cuenta e invitar'}
            </button>
          </div>
        </section>
      )}

      {/* -------- Solicitudes de contacto (solo super_admin) -------- */}
      {esSuperAdmin && seccion === 'solicitudes' && (
        <section className="card">
          <h3>Solicitudes</h3>
          <p className="muted">
            Personas que llenaron el formulario de la landing. Cambia el estado
            de cada una conforme las vayas contactando.
          </p>
          {(datos.solicitudes || []).length ? (datos.solicitudes).map((s) => (
            <div className="item" key={s.id}>
              <div style={{ flex: '1 1 260px', minWidth: 0, overflowWrap: 'anywhere' }}>
                <strong>{s.nombre}</strong>
                {s.clinica && <span className="muted"> · {s.clinica}</span>}
                <div className="muted" style={{ fontSize: 13 }}>
                  {s.correo}{s.telefono && ' · ' + s.telefono} · <FechaLocal iso={s.creada_en} />
                </div>
                {s.mensaje && (
                  <div style={{ fontSize: 14, marginTop: 4, whiteSpace: 'pre-wrap' }}>{s.mensaje}</div>
                )}
              </div>
              <select
                value={s.estado}
                onChange={(e) => cambiarEstadoSolicitud(s.id, e.target.value)}
                title="Estado de la solicitud"
              >
                <option value="nueva">Nueva</option>
                <option value="contactada">Contactada</option>
                <option value="convertida">Convertida</option>
                <option value="descartada">Descartada</option>
              </select>
            </div>
          )) : <p className="muted">Todavía no hay solicitudes de contacto.</p>}
        </section>
      )}

      {(!esSuperAdmin || seccion === 'simulador') && <>
      {/* -------- Casos activos -------- */}
      <section className="card">
        <h3>Casos activos</h3>
        <p className="muted">
          Los estudiantes ven un menú con los casos activos y eligen cuál
          simular. Enciende o apaga cada uno abajo, en «Casos» — puede haber
          varios encendidos a la vez.
        </p>
        <div style={{ fontSize: 15, marginTop: 4 }}>
          {casosActivosCount
            ? <>Casos activos ahora: <span className="accent">{casosActivosCount}</span></>
            : <span className="warn">Ningún caso activo — los estudiantes ven el menú vacío</span>}
        </div>
        {datos.cupoCasosPropios != null && (
          <BarraCupo etiqueta="Casos propios" usado={(datos.casos || []).length} tope={datos.cupoCasosPropios} />
        )}
        {datos.cupoStorageMb != null && (
          <BarraCupo etiqueta="Storage" usado={datos.usoStorageMb ?? 0} tope={datos.cupoStorageMb} unidad=" MB" />
        )}
      </section>

      {/* -------- Maniquí: puntos del cuerpo (propios de esta cuenta) -------- */}
      {hayCuenta && (
      <section className="card">
        <div className="editor-head">
          <h3>Maniquí — puntos del cuerpo</h3>
          <div className="editor-tools">
            <label className="tool-lbl">Especie
              <select value={especiePuntos} onChange={(e) => { setPuntoSel(null); setEspeciePuntos(e.target.value); }}>
                <option value="perro">Perro</option>
                <option value="gato">Gato</option>
              </select>
            </label>
            <button className="btn small" onClick={() => setGuias((g) => !g)}>
              {guias ? 'Ocultar guías' : 'Mostrar guías'}
            </button>
            <button className="btn small btn-primary" onClick={nuevoPunto}>+ Añadir punto</button>
          </div>
        </div>
        <p className="muted">
          Define una sola vez las partes del cuerpo (su posición). Todos tus
          casos usan estos mismos puntos: lo único que cambia en cada caso es
          el video de cada punto.
        </p>

        <div className="tabs">
          {VISTAS.map((v) => (
            <button key={v.id}
              className={'tab' + (v.id === vistaPuntos ? ' act' : '')}
              onClick={() => { setPuntoSel(null); setVistaPuntos(v.id); }}>
              {v.label}
            </button>
          ))}
        </div>
        <div className="mq-leyenda">
          <span className="muted">Arrastra cada punto a su lugar · clic para renombrar o borrar</span>
        </div>

        <div className="mq-stage">
          <div
            ref={canvasPuntosRef}
            className={'mq-canvas' + (esLadoPuntos ? ' lado' : '') + (guias ? '' : ' guias-ocultas')}
            style={{ '--mq-ratio': MANIQUIES.ratio(especiePuntos, vistaPuntos) }}
            onPointerDown={(e) => {
              if (!e.target.closest('.mq-token') && !e.target.closest('.mq-pop')) setPuntoSel(null);
            }}
          >
            <div className="mq-arte" dangerouslySetInnerHTML={{ __html: MANIQUIES.svg(especiePuntos, vistaPuntos) }} />
            {listaPuntos.map((p, i) => {
              const pos = posToken(p, i);
              return (
                <div key={p.id}
                  className={'mq-token config' + (p.id === puntoSel ? ' sel' : '')}
                  style={{ left: pos.x + '%', top: pos.y + '%' }}
                  onPointerDown={(e) => puntoPointerDown(e, p, i)}
                  onPointerMove={puntoPointerMove}
                  onPointerUp={puntoPointerUp}
                >
                  <span>{i + 1}</span>
                  <div className="mq-token-lbl">{p.nombre}</div>
                </div>
              );
            })}

            {puntoSelObj && (
              <div className="mq-pop" style={popStyle(posToken(puntoSelObj, listaPuntos.indexOf(puntoSelObj)))}>
                <label>Nombre de la parte del cuerpo</label>
                <input
                  value={nombreEdit}
                  autoFocus
                  onChange={(e) => setNombreEdit(e.target.value)}
                  onBlur={guardarNombrePunto}
                  placeholder="Ej. Corazón"
                />
                <div className="mq-pop-foot">
                  <button className="btn small danger" onClick={borrarPunto}>Borrar</button>
                  <button className="btn small btn-primary" onClick={async () => { await guardarNombrePunto(); setPuntoSel(null); }}>Listo</button>
                </div>
              </div>
            )}
          </div>
          {!listaPuntos.length && <p className="muted mq-vacio">No hay puntos en esta vista. Pulsa «+ Añadir punto».</p>}
        </div>
      </section>
      )}

      {/* -------- Casos -------- */}
      {hayCuenta && (
      <section className="card">
        <h3>Casos</h3>
        {(datos.casos || []).length ? (datos.casos).map((c) => (
          <div className="item" key={c.id}>
            <input className="nombre-caso" defaultValue={c.nombre} onBlur={(e) => renombrar(c.id, e.target.value)} />
            <select value={c.especie} onChange={(e) => cambiarEspecie(c.id, e.target.value)} title="Especie del maniquí">
              <option value="perro">Perro</option>
              <option value="gato">Gato</option>
            </select>
            <span className="muted">{c.numVideos} video(s)</span>
            <label className="chk-activo" title="Visible en el menú del estudiante">
              <input type="checkbox" checked={!!c.activo} onChange={() => activar(c)} />
              <span className={c.activo ? 'accent' : 'muted'}>{c.activo ? '● Activo' : 'Inactivo'}</span>
            </label>
            <button className="btn small" onClick={() => editarVideos(c.id)}>Asignar videos</button>
            <button className="btn small danger" onClick={() => borrarCaso(c.id)}>Borrar</button>
            <textarea
              className="descripcion-caso"
              defaultValue={c.descripcion || ''}
              onBlur={(e) => describir(c.id, e.target.value)}
              placeholder="Descripción para el estudiante (motivo de consulta, síntomas…). Se muestra antes de entrar al caso."
              rows={2}
              maxLength={500}
            />
          </div>
        )) : <p className="muted">No hay casos todavía. Crea el primero abajo.</p>}

        <div className="row">
          <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} placeholder="Nombre del nuevo caso (ej. Embarazo)" />
          <select value={nuevaEspecie} onChange={(e) => setNuevaEspecie(e.target.value)} title="Especie del maniquí">
            <option value="perro">Perro</option>
            <option value="gato">Gato</option>
          </select>
          <button className="btn" onClick={crear}>Crear caso</button>
        </div>
      </section>
      )}

      {/* -------- Videos del caso -------- */}
      {hayCuenta && caso && (
        <section className="card">
          <div className="editor-head">
            <h3>Videos de: <span className="accent">{caso.nombre}</span></h3>
            <button className="btn small" onClick={() => setCasoEnEdicion(null)}>Cerrar</button>
          </div>
          <p className="muted">Toca un punto del cuerpo para asignarle el video de ESTE caso.</p>

          <div className="tabs">
            {VISTAS.map((v) => (
              <button key={v.id}
                className={'tab' + (v.id === vistaCaso ? ' act' : '')}
                onClick={() => { setCasoPuntoSel(null); setVistaCaso(v.id); }}>
                {v.label}
              </button>
            ))}
          </div>
          <div className="mq-leyenda">
            <span><i className="dotleg config" />Con video</span>
            <span><i className="dotleg sinvid" />Sin video</span>
          </div>

          <div className="mq-stage">
            <div
              className={'mq-canvas' + (esLadoCaso ? ' lado' : '') + (guias ? '' : ' guias-ocultas')}
              style={{ '--mq-ratio': MANIQUIES.ratio(especieCaso, vistaCaso) }}
              onPointerDown={(e) => {
                if (!e.target.closest('.mq-token') && !e.target.closest('.mq-pop')) setCasoPuntoSel(null);
              }}
            >
              <div className="mq-arte" dangerouslySetInnerHTML={{ __html: MANIQUIES.svg(especieCaso, vistaCaso) }} />
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
                  <div style={{ fontSize: 12, marginBottom: 6, color: videosDelCaso[casoPuntoObj.id] ? '#37d39a' : '#8b949c' }}>
                    {subiendo
                      ? (convProgreso !== null ? `convirtiendo a H.264… ${convProgreso}%` : 'subiendo video…')
                      : (videosDelCaso[casoPuntoObj.id] ? 'video ✓' : 'sin video')}
                  </div>
                  {subiendo && convProgreso !== null && (
                    <div style={{ fontSize: 11, color: '#8b949c', marginBottom: 6 }}>
                      (puede tardar 1-3 min; no cierres esta ventana)
                    </div>
                  )}
                  {!subiendo && (
                    <div style={{ fontSize: 11, color: '#8b949c', marginBottom: 6 }}>
                      Máximo {DURACION_MAX_SEG} segundos por video.
                    </div>
                  )}
                  <div className="row" style={{ margin: 0 }}>
                    <button className="btn small" disabled={subiendo} onClick={elegirVideo}>Elegir video…</button>
                    <button className="btn small" onClick={verVideo} title="Ver el video asignado">▶</button>
                  </div>
                  <div className="mq-pop-foot">
                    <button className="btn small danger" onClick={quitarVideo}>Quitar video</button>
                    <button className="btn small btn-primary" onClick={() => setCasoPuntoSel(null)}>Listo</button>
                  </div>
                </div>
              )}
            </div>
            {!listaCaso.length && <p className="muted mq-vacio">Esta especie aún no tiene puntos en esta vista. Créalos arriba, en «Maniquí».</p>}
          </div>
        </section>
      )}

      {/* -------- Zona de peligro: borrar la cuenta propia (no aplica
          al super_admin, que borra cuentas desde la pestaña «Cuentas») -------- */}
      {!esSuperAdmin && (
        <section className="card card-peligro">
          <h3>Zona de peligro</h3>
          <p className="muted">
            Esto borra tu cuenta por completo: todos tus casos, videos y tu
            acceso de administrador. No se puede deshacer.
          </p>
          <div className="row">
            <input
              value={confirmBorrarCuenta}
              onChange={(e) => setConfirmBorrarCuenta(e.target.value)}
              placeholder={'Escribe "' + (datos.cuentaNombre || '') + '" para confirmar'}
            />
            <button
              className="btn danger"
              disabled={borrandoCuenta || confirmBorrarCuenta.trim() !== (datos.cuentaNombre || '')}
              onClick={borrarCuentaPropia}
            >
              {borrandoCuenta ? 'Borrando…' : 'Borrar mi cuenta para siempre'}
            </button>
          </div>
        </section>
      )}
      </>}

      {/* -------- Vista previa de video -------- */}
      {previewUrl && (
        <div className="overlay" onClick={() => setPreviewUrl(null)}>
          <video src={previewUrl} controls autoPlay onClick={(e) => e.stopPropagation()} />
          <button className="btn small" onClick={() => setPreviewUrl(null)}>Cerrar</button>
        </div>
      )}
    </div>
  );
}
