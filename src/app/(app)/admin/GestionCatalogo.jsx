'use client';
// ============================================================
// Catálogo de la tienda (solo super_admin): publica casos de la cuenta
// «catalogo», con descripción, nivel, etiquetas y precios de REFERENCIA
// (solo los ve el super_admin). Cada acción devuelve el catálogo completo.
// ============================================================
import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n/cliente';
import { PANEL } from '@/lib/i18n/textos/panel';
import { NIVELES } from '@/lib/tienda';
import {
  listarCatalogoAdmin, publicarCaso, actualizarCatalogo, alternarPublicado, quitarDelCatalogo,
} from '@/app/actions/tienda';

const aTexto = (v) => (v == null ? '' : String(v));

function borradorDe(e) {
  return {
    titulo: e.titulo || '', descripcionVenta: e.descripcionVenta || '', nivel: e.nivel || '',
    etiquetas: (e.etiquetas || []).join(', '), orden: aTexto(e.orden ?? 0),
    precioCop: aTexto(e.precioCop), precioBrl: aTexto(e.precioBrl), precioUsd: aTexto(e.precioUsd),
  };
}

function Entrada({ e, ocupado, bloqueoGlobal, onGuardar, onPublicado, onQuitar }) {
  const t = useT(PANEL);
  const [b, setB] = useState(() => borradorDe(e));
  const set = (k) => (ev) => setB((x) => ({ ...x, [k]: ev.target.value }));
  const k = e.contadores || {};
  const conCompras = e.numAdquisiciones > 0;
  const id = 'cat-' + e.id + '-';
  return (
    <div className="cat-entrada">
      <div className="cat-cab">
        <strong>{e.titulo}</strong>
        <span className="chip">{t('especie.' + (e.especie === 'gato' ? 'gato' : 'perro'))}</span>
        <span className={'chip ' + (e.publicado ? 'chip-ok' : '')}>{e.publicado ? t('catalogo.publicado') : t('catalogo.borrador')}</span>
        {conCompras && <span className="chip chip-warn">{t('catalogo.compras', { n: e.numAdquisiciones })}</span>}
      </div>
      <div className="muted cat-contenido">
        {t('catalogo.contenido', { videos: k.videos || 0, lab: (k.laboratorio || 0) + (k.labArchivos || 0), rx: k.rx || 0, vitales: !!k.vitales })}
      </div>
      <div className="cat-form">
        <label className="cat-campo cat-ancho" htmlFor={id + 't'}>{t('catalogo.titulo1')}
          <input id={id + 't'} value={b.titulo} maxLength={120} onChange={set('titulo')} />
        </label>
        <label className="cat-campo cat-ancho" htmlFor={id + 'd'}>{t('catalogo.descripcion')}
          <textarea id={id + 'd'} rows={3} value={b.descripcionVenta} maxLength={2000} onChange={set('descripcionVenta')} />
        </label>
        <label className="cat-campo" htmlFor={id + 'n'}>{t('catalogo.nivel')}
          <select id={id + 'n'} value={b.nivel} onChange={set('nivel')}>
            <option value="">{t('catalogo.sinNivel')}</option>
            {NIVELES.map((n) => <option key={n} value={n}>{t('tienda.nivel.' + n)}</option>)}
          </select>
        </label>
        <label className="cat-campo" htmlFor={id + 'o'}>{t('catalogo.orden')}
          <input id={id + 'o'} type="number" value={b.orden} onChange={set('orden')} />
        </label>
        <label className="cat-campo cat-ancho" htmlFor={id + 'e'}>{t('catalogo.etiquetas')}
          <input id={id + 'e'} value={b.etiquetas} onChange={set('etiquetas')} />
        </label>
        <fieldset className="cat-precios cat-ancho">
          <legend>{t('catalogo.precios')} <span className="muted">· {t('catalogo.preciosSolo')}</span></legend>
          {['precioCop', 'precioBrl', 'precioUsd'].map((c) => (
            <label className="cat-campo" key={c} htmlFor={id + c}>{t('catalogo.' + c)}
              <input id={id + c} inputMode="decimal" value={b[c]} onChange={set(c)} />
            </label>
          ))}
        </fieldset>
      </div>
      <div className="cat-acciones">
        <label className="chk-activo">
          <input type="checkbox" checked={!!e.publicado} disabled={bloqueoGlobal} onChange={() => onPublicado(e)} />
          <span className={e.publicado ? 'accent' : 'muted'}>{t('catalogo.publicado')}</span>
        </label>
        <button className="btn small btn-primary" disabled={bloqueoGlobal} onClick={() => onGuardar(e, b)}>
          {ocupado ? t('catalogo.guardando') : t('catalogo.guardar')}
        </button>
        <button
          className="btn small danger" disabled={bloqueoGlobal || conCompras}
          title={conCompras ? t('catalogo.quitarBloqueado') : undefined}
          onClick={() => onQuitar(e)}
        >
          {t('catalogo.quitar')}
        </button>
        {conCompras && <span className="muted cat-nota">{t('catalogo.quitarBloqueado')}</span>}
      </div>
    </div>
  );
}

export default function GestionCatalogo({ ejecutar, onIrCuentaCatalogo }) {
  const t = useT(PANEL);
  const [cat, setCat] = useState(null);
  const [ocupado, setOcupado] = useState(null); // id (entrada o caso disponible) en curso

  useEffect(() => {
    let vivo = true;
    ejecutar(() => listarCatalogoAdmin(), { fusionarResultado: false }).then((r) => {
      if (vivo) setCat(r || { tiendaDisponible: false, entradas: [], disponibles: [] });
    });
    return () => { vivo = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ejecuta una acción que devuelve el catálogo completo.
  async function accion(id, fn) {
    if (ocupado) return;
    setOcupado(id);
    const r = await ejecutar(fn, { fusionarResultado: false });
    if (r) setCat(r);
    setOcupado(null);
  }

  if (!cat) return <section className="card"><p className="muted">{t('catalogo.cargando')}</p></section>;

  return (
    <>
      <section className="card">
        <h3>{t('catalogo.titulo')}</h3>
        <p className="muted">{t('catalogo.intro')}</p>
        {cat.tiendaDisponible ? (
          <button className="btn" onClick={() => onIrCuentaCatalogo(cat.cuentaCatalogoId)}>{t('catalogo.irCuenta')}</button>
        ) : <p className="warn">{t('catalogo.noDisponible')}</p>}
      </section>

      {cat.tiendaDisponible && (
        <>
          <section className="card">
            <h3>{t('catalogo.enTienda')}</h3>
            {cat.entradas.length ? cat.entradas.map((e) => (
              <Entrada
                key={e.id} e={e} ocupado={ocupado === e.id} bloqueoGlobal={!!ocupado}
                onGuardar={(en, b) => accion(en.id, () => actualizarCatalogo(en.id, b))}
                onPublicado={(en) => accion(en.id, () => alternarPublicado(en.id, !en.publicado))}
                onQuitar={(en) => {
                  if (window.confirm(t('catalogo.quitarConfirm', { titulo: en.titulo }))) accion(en.id, () => quitarDelCatalogo(en.id));
                }}
              />
            )) : <p className="muted">{t('catalogo.sinEntradas')}</p>}
          </section>

          <section className="card">
            <h3>{t('catalogo.disponibles')}</h3>
            {cat.disponibles.length ? cat.disponibles.map((d) => (
              <div className="item" key={d.id}>
                <div style={{ flex: '1 1 220px', minWidth: 0, overflowWrap: 'anywhere' }}>
                  <strong>{d.nombre}</strong>
                  <span className="muted"> · {t('especie.' + (d.especie === 'gato' ? 'gato' : 'perro'))}</span>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {t('catalogo.contenido', { videos: d.contadores.videos, lab: d.contadores.laboratorio + d.contadores.labArchivos, rx: d.contadores.rx, vitales: !!d.contadores.vitales })}
                  </div>
                </div>
                <button
                  className="btn small btn-primary" disabled={!!ocupado}
                  onClick={() => accion(d.id, () => publicarCaso({ casoId: d.id, descripcionVenta: d.descripcion || '' }))}
                >
                  {ocupado === d.id ? t('catalogo.anadiendo') : t('catalogo.anadir')}
                </button>
              </div>
            )) : <p className="muted">{t('catalogo.disponiblesVacio')}</p>}
          </section>
        </>
      )}
    </>
  );
}
