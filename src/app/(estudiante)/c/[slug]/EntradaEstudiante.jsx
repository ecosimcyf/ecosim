'use client';
// ============================================================
// Primer paso de la vista del estudiante, ya en su navegador.
//
// La página llega desde la caché del CDN con los datos fijos de la cuenta
// (nombre, idioma). Lo que depende de CADA estudiante se resuelve aquí:
//   · su idioma (el que eligió con el selector, o el de la cuenta);
//   · la lista de casos activos (de la base, al momento).
// Mientras tanto se ve solo el logo, sin textos: así nadie ve un idioma y
// luego otro.
//
// Si la caché no pudo traer la cuenta (Supabase caído justo al generarla),
// se pide aquí mismo.
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { resolverCuenta, listarCasosActivos } from '@/lib/datos';
import { IdiomaEnNavegador, useT } from '@/lib/i18n/cliente';
import { ESTUDIANTE } from '@/lib/i18n/textos/estudiante';
import VistaPrincipal from './VistaPrincipal';

function Logo() {
  return (
    <div className="espera" aria-busy="true">
      <div className="marca">ECOSIM</div>
    </div>
  );
}

function Aviso({ clave, reintentar }) {
  const t = useT(ESTUDIANTE);
  return (
    <div className="espera" role="alert">
      <div className="marca">ECOSIM</div>
      <div className="txt">{t(clave)}</div>
      {reintentar && (
        <div className="espera-acciones">
          <button type="button" className="btn btn-primary" onClick={reintentar}>{t('carga.reintentar')}</button>
        </div>
      )}
    </div>
  );
}

export default function EntradaEstudiante({ slug, cuentaInicial }) {
  const [cuenta, setCuenta] = useState(cuentaInicial);
  // 'cargando' | 'listo' | 'sinConexion' | 'noDisponible'
  const [fase, setFase] = useState('cargando');
  const [casos, setCasos] = useState([]);

  const preparar = useCallback(async () => {
    setFase('cargando');
    const supabase = crearClienteNavegador();
    let c = cuenta;
    if (!c) {
      try {
        c = await resolverCuenta(supabase, slug);
      } catch {
        setFase('sinConexion');
        return;
      }
      if (!c || !c.activa) { setFase('noDisponible'); return; }
      setCuenta(c);
    }
    const lista = await listarCasosActivos(supabase, c.id);
    // null = la consulta falló (red caída): se avisa de que no hay conexión
    // y se ofrece reintentar. Mostrar el menú vacío diría "Esperando al
    // profesor", que no es verdad.
    if (!Array.isArray(lista)) { setFase('sinConexion'); return; }
    setCasos(lista);
    setFase('listo');
  }, [cuenta, slug]);

  useEffect(() => { preparar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <IdiomaEnNavegador porDefecto={cuenta?.idioma} espera={<Logo />}>
      {fase === 'cargando' && <Logo />}
      {fase === 'sinConexion' && <Aviso clave="sinConexion" reintentar={preparar} />}
      {fase === 'noDisponible' && <Aviso clave="noDisponible" />}
      {fase === 'listo' && (
        <VistaPrincipal
          casosActivosIniciales={casos}
          cuentaId={cuenta.id}
        />
      )}
    </IdiomaEnNavegador>
  );
}
