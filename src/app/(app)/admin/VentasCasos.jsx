'use client';
// ============================================================
// Ventas de la tienda (solo super_admin): solicitudes de las clínicas y
// acciones según estado. El cobro es externo; aquí se marca el pago y se
// entrega el caso. Un solo clic a la vez (evita dobles envíos).
// ============================================================
import { useState, useEffect } from 'react';
import { useIdioma, useT } from '@/lib/i18n/cliente';
import { LOCALE } from '@/lib/i18n/config';
import { PANEL } from '@/lib/i18n/textos/panel';
import { useAvisos } from './Avisos';
import { ESTADOS, puedeEntregarse } from '@/lib/tienda';
import {
  listarAdquisiciones, marcarPagada, entregarAdquisicion, cancelarAdquisicion,
} from '@/app/actions/tienda';

const CLASE_ESTADO = {
  solicitada: 'chip-warn', pagada: 'chip-warn', entregando: 'chip-warn',
  entregada: 'chip-ok', fallida: 'chip-danger', cancelada: '',
};

function dinero(valor, moneda, locale) {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: moneda, maximumFractionDigits: 2 }).format(valor);
  } catch { return valor + ' ' + moneda; }
}

export default function VentasCasos({ ejecutar, adquisiciones, onCambio }) {
  const t = useT(PANEL);
  const { confirmar, pedirTexto } = useAvisos();
  const idioma = useIdioma();
  const locale = LOCALE[idioma];
  const [disponible, setDisponible] = useState(true);
  const [cargado, setCargado] = useState(false);
  const [enCurso, setEnCurso] = useState(null); // id de la adquisición
  const [estado, setEstado] = useState('');
  const [texto, setTexto] = useState('');

  async function cargar() {
    const r = await ejecutar(() => listarAdquisiciones(), { fusionarResultado: false });
    if (r) { setDisponible(r.tiendaDisponible !== false); onCambio(r.adquisiciones || []); }
    setCargado(true);
  }
  useEffect(() => { cargar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function correr(a, fn) {
    if (enCurso) return;
    setEnCurso(a.id);
    const r = await ejecutar(fn, { fusionarResultado: false });
    if (r) onCambio(r.adquisiciones || []);
    else await cargar(); // si falló, el estado pudo cambiar (p. ej. a 'fallida')
    setEnCurso(null);
  }

  const q = texto.trim().toLowerCase();
  const lista = (adquisiciones || []).filter((a) => (!estado || a.estado === estado)
    && (!q || (a.cuentaNombre + ' ' + a.cuentaSlug + ' ' + a.titulo).toLowerCase().includes(q)));
  const fecha = (iso) => (iso ? new Date(iso).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' }) : '');

  return (
    <section className="card">
      <h3>{t('ventas.titulo')}</h3>
      <p className="muted">{t('ventas.intro')}</p>
      {!cargado ? <p className="muted">{t('ventas.cargando')}</p> : !disponible ? (
        <p className="warn">{t('ventas.noDisponible')}</p>
      ) : (
        <>
          <div className="ventas-filtros">
            <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label={t('ventas.todos')}>
              <option value="">{t('ventas.todos')}</option>
              {ESTADOS.map((e) => <option key={e} value={e}>{t('tienda.estado.' + e)}</option>)}
            </select>
            <input
              type="search" value={texto} onChange={(e) => setTexto(e.target.value)}
              placeholder={t('ventas.buscar')} aria-label={t('ventas.buscar')} style={{ flex: '1 1 200px' }}
            />
            <button className="btn small" disabled={!!enCurso} onClick={cargar}>{t('ventas.actualizar')}</button>
          </div>
          {lista.length ? lista.map((a) => {
            const bloqueado = !!enCurso;
            // Entregar exige el pago marcado: pagada, fallida, o entregada cuyo caso
            // la clínica borró (reentrega). En solicitada solo "Marcar pagada" y "Cancelar".
            const casoBorrado = a.estado === 'entregada' && !a.casoEntregadoId;
            // 'entregando' que lleva >10 min sin avanzar: el servidor murió a mitad y se puede reclamar.
            const atascada = a.estado === 'entregando' && Date.now() - new Date(a.actualizadaEn || 0).getTime() > 10 * 60 * 1000;
            const puedeEntregar = puedeEntregarse(a) || atascada;
            const puedeCancelar = ['solicitada', 'pagada', 'fallida'].includes(a.estado);
            return (
              <div className="item venta" key={a.id}>
                <div className="venta-info">
                  <div>
                    <strong>{a.titulo || '—'}</strong>{' '}
                    <span className={'chip ' + (CLASE_ESTADO[a.estado] || '')}>{t('tienda.estado.' + a.estado)}</span>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {a.cuentaNombre} ({a.cuentaSlug}) · {fecha(a.solicitadaEn)}
                  </div>
                  <div style={{ fontSize: 13 }}>
                    {t('ventas.referencia')}: {a.precioReferencia != null
                      ? <strong>{dinero(a.precioReferencia, a.moneda, locale)}</strong> : <span className="muted">{t('ventas.sinPrecio')}</span>}
                    {a.pagadaEn && <span className="muted"> · {t('ventas.pagada')}: {fecha(a.pagadaEn)}</span>}
                    {a.entregadaEn && <span className="muted"> · {t('ventas.entregada')}: {fecha(a.entregadaEn)}</span>}
                  </div>
                  {a.nota && <div className="venta-nota">{t('ventas.nota')}: {a.nota}</div>}
                  {casoBorrado && <div className="venta-nota">{t('ventas.casoBorrado')}</div>}
                </div>
                <div className="venta-acciones">
                  {a.estado === 'solicitada' && (
                    <button className="btn small" disabled={bloqueado} onClick={() => correr(a, () => marcarPagada(a.id))}>{t('ventas.marcarPagada')}</button>
                  )}
                  {puedeEntregar && (
                    <button
                      className="btn small btn-primary" disabled={bloqueado}
                      onClick={async () => {
                        const ok = await confirmar({ titulo: t('avisos.confirmar'), mensaje: t('ventas.confirmEntregar', { titulo: a.titulo, cuenta: a.cuentaNombre }) });
                        if (ok) correr(a, () => entregarAdquisicion(a.id));
                      }}
                    >
                      {casoBorrado ? t('ventas.reentregar') : a.estado === 'fallida' ? t('ventas.reintentar') : t('ventas.entregar')}
                    </button>
                  )}
                  {puedeCancelar && (
                    <button
                      className="btn small danger" disabled={bloqueado}
                      onClick={async () => {
                        const nota = await pedirTexto({ titulo: t('ventas.cancelar'), mensaje: t('ventas.pedirNota'), peligro: true });
                        if (nota !== null) correr(a, () => cancelarAdquisicion(a.id, nota));
                      }}
                    >
                      {t('ventas.cancelar')}
                    </button>
                  )}
                </div>
              </div>
            );
          }) : <p className="muted">{t('ventas.vacio')}</p>}
        </>
      )}
    </section>
  );
}
