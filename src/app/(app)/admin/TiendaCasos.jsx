'use client';
// ============================================================
// Tienda de casos vista por la clínica (o por el super_admin dentro de una
// cuenta). NUNCA muestra precios: solo "Consultar con el asesor". Solicitar
// registra la solicitud y abre WhatsApp con el mensaje ya escrito.
// ============================================================
import { useState, useEffect } from 'react';
import { useT } from '@/lib/i18n/cliente';
import { PANEL } from '@/lib/i18n/textos/panel';
import { listarTienda, solicitarCaso } from '@/app/actions/tienda';

const CLASE_ESTADO = {
  solicitada: 'chip-warn', pagada: 'chip-warn', entregando: 'chip-warn',
  entregada: 'chip-ok', fallida: 'chip-danger', cancelada: '',
};

export default function TiendaCasos({ cuentaId, ejecutar }) {
  const t = useT(PANEL);
  const [tienda, setTienda] = useState(null); // { tiendaDisponible, items } | null = cargando
  const [enviando, setEnviando] = useState(null); // id de catálogo en curso
  const [enlaces, setEnlaces] = useState({}); // catalogoId -> whatsappUrl (si el navegador bloqueó la ventana)

  useEffect(() => {
    let vivo = true;
    setTienda(null);
    ejecutar(() => listarTienda(cuentaId), { fusionarResultado: false }).then((r) => {
      if (vivo) setTienda(r || { tiendaDisponible: false, items: [] });
    });
    return () => { vivo = false; };
  }, [cuentaId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function solicitar(item) {
    if (enviando) return;
    setEnviando(item.id);
    const r = await ejecutar(() => solicitarCaso(cuentaId, item.id), { fusionarResultado: false });
    if (r?.adquisicion) {
      setTienda((d) => ({
        ...d,
        items: d.items.map((x) => (x.id === item.id
          ? { ...x, adquisicion: { id: r.adquisicion.id, estado: r.adquisicion.estado || 'solicitada' } } : x)),
      }));
      if (r.whatsappUrl) {
        const w = window.open(r.whatsappUrl, '_blank', 'noopener');
        if (!w) setEnlaces((e) => ({ ...e, [item.id]: r.whatsappUrl }));
      }
    } else if (r === null) {
      // Pudo fallar por "ya existe" u otra causa: se refresca la lista.
      const l = await listarTienda(cuentaId).catch(() => null);
      if (l && !l.error) setTienda(l);
    }
    setEnviando(null);
  }

  if (!tienda) return <section className="card"><p className="muted">{t('tienda.cargando')}</p></section>;

  return (
    <section className="card">
      <h3>{t('tienda.titulo')}</h3>
      <p className="muted">{t('tienda.intro')}</p>
      {!tienda.tiendaDisponible ? (
        <p className="muted">{t('tienda.noDisponible')}</p>
      ) : !tienda.items.length ? (
        <p className="muted">{t('tienda.vacio')}</p>
      ) : (
        <div className="tienda-grid">
          {tienda.items.map((it) => {
            const adq = it.adquisicion;
            const ex = it.examenes || {};
            return (
              <article className="tienda-card" key={it.id}>
                {it.portadaUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="tienda-portada" src={it.portadaUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />
                )}
                <div className="tienda-cuerpo">
                  <h4 className="tienda-titulo">{it.titulo || t('tienda.sinTitulo')}</h4>
                  <div className="tienda-meta">
                    <span className="chip">{t('especie.' + (it.especie === 'gato' ? 'gato' : 'perro'))}</span>
                    {it.nivel && <span className="chip">{t('tienda.nivel.' + it.nivel)}</span>}
                    {(it.etiquetas || []).map((e) => <span className="chip chip-etq" key={e}>{e}</span>)}
                  </div>
                  {it.descripcionVenta && <p className="tienda-desc">{it.descripcionVenta}</p>}
                  <div className="tienda-meta muted">
                    <span>{t('tienda.videos', { n: it.videos })}</span>
                    {ex.lab && <span>· {t('tienda.examenes.lab')}</span>}
                    {ex.rx && <span>· {t('tienda.examenes.rx')}</span>}
                    {ex.vitales && <span>· {t('tienda.examenes.vitales')}</span>}
                  </div>
                  <div className="tienda-pie">
                    <span className="tienda-precio">{t('tienda.consultar')}</span>
                    {adq ? (
                      <span className={'chip ' + (CLASE_ESTADO[adq.estado] || '')} role="status">{t('tienda.estado.' + adq.estado)}</span>
                    ) : (
                      <button className="btn small btn-primary" disabled={!!enviando} onClick={() => solicitar(it)}>
                        {enviando === it.id ? t('tienda.solicitando') : t('tienda.solicitar')}
                      </button>
                    )}
                  </div>
                  {enlaces[it.id] && (
                    <p className="tienda-aviso">
                      {t('tienda.solicitudEnviada')}{' '}
                      <a href={enlaces[it.id]} target="_blank" rel="noopener">{t('tienda.abrirWhatsapp')}</a>
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
