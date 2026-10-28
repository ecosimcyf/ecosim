// Manifiesto de la app del ESTUDIANTE, uno por cuenta: es lo que permite
// "Añadir a la pantalla de inicio" en el móvil. Al abrirla desde ahí se ve
// SIN las barras del navegador (display: standalone) y, en Android,
// directamente en horizontal.
//
// Antes había un único manifiesto global con start_url '/': quien
// instalaba la app desde /c/su-clinica terminaba abriendo la landing de
// ventas. Ahora cada enlace instala SU propia app, que abre en su menú de
// casos. La landing no tiene manifiesto (no es algo para instalar).
import { crearClienteServidor } from '@/lib/supabase/server';
import { resolverCuenta } from '@/lib/datos';

export async function GET(_request, { params }) {
  const { slug } = await params;
  const cuenta = await resolverCuenta(crearClienteServidor(), slug);
  const nombre = cuenta ? cuenta.nombre + ' — EcoSim' : 'EcoSim';
  const ruta = '/c/' + encodeURIComponent(slug);
  return Response.json({
    name: nombre,
    short_name: 'EcoSim',
    description: 'Simulador de ecografía veterinaria',
    id: ruta,
    start_url: ruta,
    scope: ruta,
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#04060a',
    theme_color: '#04060a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } });
}
