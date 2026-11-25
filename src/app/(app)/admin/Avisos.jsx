'use client';
// ============================================================
// Avisos propios de la app (en lugar de alert/confirm/prompt del navegador).
//
//   const { avisar, confirmar, pedirTexto } = useAvisos();
//   avisar.error('mensaje claro', { titulo: 'No se pudo guardar' });
//   avisar.exito('Cambios guardados');   avisar.info('…');
//   if (await confirmar({ titulo, mensaje, aceptar, cancelar, peligro })) …
//   const texto = await pedirTexto({ titulo, mensaje, placeholder, aceptar }); // null = canceló
//
// Los avisos (toasts) no bloquean: los errores se quedan 15 s (o hasta
// cerrarlos), el resto menos. Los diálogos son modales con foco gestionado
// (useModal: foco dentro, Tab no se escapa, Escape cancela).
// ============================================================
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { useT } from '@/lib/i18n/cliente';
import { PANEL } from '@/lib/i18n/textos/panel';
import { useModal } from './useModal';

const Contexto = createContext(null);
const DURACION_MS = { error: 15000, exito: 4500, info: 8000 };
const MAX_AVISOS = 4;
const ICONO = { error: '!', exito: '✓', info: 'i' };

export function AvisosProvider({ children }) {
  const t = useT(PANEL);
  const [avisos, setAvisos] = useState([]);
  const [dialogos, setDialogos] = useState([]);
  const sec = useRef(0);

  const quitar = useCallback((id) => setAvisos((l) => l.filter((a) => a.id !== id)), []);

  const api = useMemo(() => {
    const mostrar = (tipo) => (mensaje, { titulo } = {}) => {
      const id = ++sec.current;
      const texto = String(mensaje ?? '');
      setAvisos((l) => [...l.filter((a) => !(a.tipo === tipo && a.mensaje === texto)), { id, tipo, titulo, mensaje: texto }].slice(-MAX_AVISOS));
      setTimeout(() => quitar(id), DURACION_MS[tipo]);
    };
    const avisar = { error: mostrar('error'), exito: mostrar('exito'), info: mostrar('info') };
    const abrir = (datos) => new Promise((resolver) => {
      setDialogos((l) => [...l, { id: ++sec.current, ...datos, resolver }]);
    });
    return {
      avisar,
      confirmar: (opc = {}) => abrir({ tipo: 'confirmar', ...opc }),
      pedirTexto: (opc = {}) => abrir({ tipo: 'texto', ...opc }),
    };
  }, [quitar]);

  const dialogo = dialogos[0] || null;
  function cerrarDialogo(valor) {
    if (!dialogo) return;
    dialogo.resolver(valor);
    setDialogos((l) => l.slice(1));
  }

  const TITULO = { error: t('avisos.error'), exito: t('avisos.exito'), info: t('avisos.info') };

  return (
    <Contexto.Provider value={api}>
      {children}
      <div className="avisos">
        {avisos.map((a) => (
          <div key={a.id} className={'aviso aviso-' + a.tipo} role={a.tipo === 'error' ? 'alert' : 'status'}>
            <span className="aviso-icono" aria-hidden="true">{ICONO[a.tipo]}</span>
            <div className="aviso-texto">
              <strong>{a.titulo || TITULO[a.tipo]}</strong>
              <p>{a.mensaje}</p>
            </div>
            <button type="button" className="aviso-cerrar" aria-label={t('avisos.cerrar')} onClick={() => quitar(a.id)}>×</button>
          </div>
        ))}
      </div>
      {dialogo && <Dialogo key={dialogo.id} datos={dialogo} t={t} onCerrar={cerrarDialogo} />}
    </Contexto.Provider>
  );
}

function Dialogo({ datos, t, onCerrar }) {
  const esTexto = datos.tipo === 'texto';
  const [valor, setValor] = useState(datos.valorInicial || '');
  const cancelar = () => onCerrar(esTexto ? null : false);
  const ref = useModal(cancelar);
  const idTitulo = 'aviso-titulo-' + datos.id;
  const idMsg = 'aviso-msg-' + datos.id;

  function enviar(e) {
    e.preventDefault();
    onCerrar(esTexto ? valor : true);
  }
  return (
    <div className="overlay aviso-fondo" onMouseDown={(e) => { if (e.target === e.currentTarget) cancelar(); }}>
      <form className="modal-box aviso-dialogo" role={datos.peligro ? 'alertdialog' : 'dialog'} aria-modal="true"
        aria-labelledby={idTitulo} aria-describedby={datos.mensaje ? idMsg : undefined} ref={ref} onSubmit={enviar}>
        <h4 id={idTitulo}>{datos.titulo || t('avisos.confirmar')}</h4>
        {datos.mensaje && <p id={idMsg} className="aviso-dialogo-msg">{datos.mensaje}</p>}
        {esTexto && (
          <input type="text" value={valor} placeholder={datos.placeholder || ''} autoComplete="off"
            aria-label={datos.titulo || t('avisos.escribir')} onChange={(e) => setValor(e.target.value)} />
        )}
        <div className="modal-acciones">
          <button type="button" className="btn" onClick={cancelar}>{datos.cancelar || t('avisos.cancelar')}</button>
          <button type="submit" className={'btn ' + (datos.peligro ? 'danger' : 'btn-primary')}>{datos.aceptar || t('avisos.aceptar')}</button>
        </div>
      </form>
    </div>
  );
}

// Sin proveedor (p. ej. una pantalla fuera del panel) no se rompe nada: el
// detalle va a la consola y confirmar() responde que no.
const SIN_PROVEEDOR = {
  avisar: { error: (m) => console.error('[aviso]', m), exito: () => {}, info: () => {} },
  confirmar: async () => false,
  pedirTexto: async () => null,
};

export function useAvisos() {
  return useContext(Contexto) || SIN_PROVEEDOR;
}
