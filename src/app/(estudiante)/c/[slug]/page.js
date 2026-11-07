// Vista principal (pública, sin login) de UNA cuenta, identificada por su
// slug en la URL.
//
// Se sirve desde la CACHÉ del CDN (ISR): la página de cada cuenta se genera
// la primera vez que alguien la visita y se renueva como mucho cada
// `revalidate` segundos (abajo). Así, aunque cientos de estudiantes escaneen el QR
// a la vez, la página llega al instante y sin ejecutar código en el
// servidor. Por eso aquí NO se leen cookies: lo que depende de cada
// estudiante (su idioma, si ya escribió el código, los casos activos) lo
// resuelve su navegador en EntradaEstudiante.jsx.
//
// Consecuencia: un cambio en la CUENTA (desactivarla, renombrarla, cambiar
// su idioma) tarda hasta `revalidate` segundos en verse para quien
// entra de nuevo. Los cambios en los CASOS no: esos se consultan en vivo.
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { crearClienteServidor } from '@/lib/supabase/server';
import { resolverCuenta } from '@/lib/datos';
import EntradaEstudiante from './EntradaEstudiante';

export const revalidate = 60;

// Ninguna cuenta se genera al compilar: cada una, en su primera visita.
export function generateStaticParams() {
  return [];
}

// generateMetadata y la página piden la misma cuenta: cache() hace que en
// una misma generación se consulte una sola vez.
//   cuenta -> existe · null -> no existe · FALLO_CONEXION -> no se pudo
//   preguntar (entonces el navegador la pide por su cuenta).
const FALLO_CONEXION = 'fallo-conexion';
const cuentaDe = cache(async (slug) => {
  try {
    return await resolverCuenta(crearClienteServidor(), slug);
  } catch (err) {
    console.error('[estudiante] no se pudo resolver la cuenta:', err?.message || err);
    return FALLO_CONEXION;
  }
});

// Enlace privado de cada cuenta: no debe indexarse ni salir en buscadores.
// El título sí usa el nombre real de la cuenta, para que la pestaña del
// navegador diga algo útil mientras el estudiante practica.
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const c = await cuentaDe(slug);
  const cuenta = c === FALLO_CONEXION ? null : c;
  return {
    title: cuenta ? `${cuenta.nombre} — EcoSim` : 'EcoSim',
    robots: { index: false, follow: false },
    // Manifiesto propio de esta cuenta (ver manifest.webmanifest/route.js).
    manifest: `/c/${encodeURIComponent(slug)}/manifest.webmanifest`,
  };
}

export default async function PaginaCuenta({ params }) {
  const { slug } = await params;
  const c = await cuentaDe(slug);
  // Cuenta que no existe o desactivada: 404 de verdad (not-found.js).
  if (c !== FALLO_CONEXION && (!c || !c.activa)) notFound();
  // Solo lo que es igual para todos los estudiantes (nada secreto: lo mismo
  // que entrega la función pública cuenta_por_slug_v2).
  const cuenta = c === FALLO_CONEXION ? null : {
    id: c.id, nombre: c.nombre, idioma: c.idioma, activa: c.activa,
  };
  return <EntradaEstudiante slug={slug} cuentaInicial={cuenta} />;
}

