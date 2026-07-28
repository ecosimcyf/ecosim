// Manifiesto de la app: es lo que permite "Añadir a la pantalla de inicio"
// en el móvil. Al abrirla desde ahí se ve SIN las barras del navegador
// (display: standalone) y, en Android, directamente en horizontal.
export default function manifest() {
  return {
    name: 'Caninos y felinos — Simulador de ecografía',
    short_name: 'EcoSim',
    description: 'Simulador de ecografía veterinaria para clase',
    start_url: '/',
    display: 'standalone',
    orientation: 'landscape',
    background_color: '#04060a',
    theme_color: '#04060a',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    ],
  };
}
