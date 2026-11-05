'use client';
// ============================================================
// Escucha los errores que nadie atrapó en el navegador y los manda al
// servidor (src/app/actions/errores.js). Sin esto, un fallo en el
// teléfono de un estudiante solo se conocía si alguien se quejaba.
//
// Como mucho 5 reportes por página abierta, y el mismo mensaje una sola
// vez: un error dentro de un bucle no debe inundar la tabla.
// ============================================================
import { useEffect } from 'react';
import { reportarErrorNavegador } from '@/app/actions/errores';

const MAX_POR_PAGINA = 5;
const enviados = new Set();

export function reportar(origen, error, extra = {}) {
  try {
    const mensaje = String(error?.message || error || '');
    if (!mensaje || enviados.has(mensaje) || enviados.size >= MAX_POR_PAGINA) return;
    enviados.add(mensaje);
    reportarErrorNavegador({
      origen, mensaje, pila: error?.stack || '', ruta: window.location.pathname, ...extra,
    }).catch(() => {});
  } catch {
    // nada
  }
}

export default function ReporteErrores() {
  useEffect(() => {
    const alError = (e) => reportar('global', e.error || e.message);
    const alRechazo = (e) => reportar('promesa', e.reason);
    window.addEventListener('error', alError);
    window.addEventListener('unhandledrejection', alRechazo);
    return () => {
      window.removeEventListener('error', alError);
      window.removeEventListener('unhandledrejection', alRechazo);
    };
  }, []);
  return null;
}
