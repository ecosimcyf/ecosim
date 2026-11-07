'use client';
// ============================================================
// Primer paso de la vista del estudiante, ya en su navegador.
//
// La página llega desde la caché del CDN con los datos fijos de la cuenta
// (nombre, idioma, si pide código). Lo que depende de CADA estudiante se
// resuelve aquí:
//   · su idioma (el que eligió con el selector, o el de la cuenta);
//   · si este dispositivo ya escribió el código (cookie de acceso);
//   · la lista de casos activos (de la base, al momento).
// Mientras tanto se ve solo el logo, sin textos: así nadie ve un idioma y
// luego otro, ni el menú un instante antes de la pantalla del código.
//
// Si la caché no pudo traer la cuenta (Supabase caído justo al generarla),
// se pide aquí mismo.
// ============================================================
import { useCallback, useEffect, useState } from 'react';
import { crearClienteNavegador } from '@/lib/supabase/client';
import { resolverCuenta, listarCasosActivos, SIN_ACCESO } from '@/lib/datos';
import { tokenAccesoNavegador } from '@/lib/acceso';
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
  const [sinAcceso, setSinAcceso] = useState(false);

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
    // Siempre se pregunta a la base (no a la copia en caché de la cuenta):
    // si el profesor acaba de poner o quitar el código, la base ya lo sabe.
    // Sin código válido responde SIN_ACCESO y se muestra la pantalla del código.
    const lista = await listarCasosActivos(supabase, c.id, tokenAccesoNavegador(c.id));
    setSinAcceso(lista === SIN_ACCESO);
    // null = la consulta falló: el menú arranca vacío y el sondeo de
    // VistaPrincipal lo vuelve a intentar a los pocos segundos.
    setCasos(Array.isArray(lista) ? lista : []);
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
          cuentaId={cuenta.id} slug={slug} sinAccesoInicial={sinAcceso}
        />
      )}
    </IdiomaEnNavegador>
  );
}
