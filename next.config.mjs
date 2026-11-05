import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Origen de Supabase (API, Storage con los videos).
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

// Política de seguridad de contenido (CSP), APLICADA: el navegador solo
// carga scripts, estilos, imágenes, videos y conexiones de este sitio y de
// Supabase. Si alguien lograra meter un <script> o un enlace a otro
// dominio, el navegador lo bloquearía.
//   · Next.js mete scripts en línea para hidratar ('unsafe-inline').
//   · ffmpeg.wasm (convertir videos en el panel) carga su núcleo como blob:
//     y necesita 'wasm-unsafe-eval'.
//   · Los videos precargados se reproducen desde blob:.
// Verificada el 2026-11-05 con la landing, la guía, la vista del
// estudiante (precarga y reproducción) y el panel (subida con conversión
// de un video MPEG-4 Parte 2): sin violaciones. Si se añade un servicio
// externo (otro CDN, un widget…), hay que agregarlo aquí o no cargará.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + SUPABASE,
  "media-src 'self' blob: " + SUPABASE,
  "connect-src 'self' blob: " + SUPABASE + ' ' + SUPABASE.replace('https://', 'wss://'),
  "font-src 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esta app vive en la subcarpeta web/ junto a la app de escritorio.
  // Fijamos aquí la raíz para que Next no se confunda con el otro
  // package-lock.json de la carpeta de arriba.
  outputFileTracingRoot: __dirname,

  // No anunciar el framework usado.
  poweredByHeader: false,

  // Ya es el valor por defecto de Next.js, pero lo dejamos explícito: el
  // navegador nunca debe poder reconstruir el código fuente original desde
  // los archivos de producción.
  productionBrowserSourceMaps: false,

  // La app tiene dos layouts raíz (páginas públicas estáticas por idioma y
  // el resto, dinámico — ver src/app/base.js): la página 404 de una
  // dirección inexistente trae su propio <html> (src/app/global-not-found.js).
  experimental: { globalNotFound: true },

  async headers() {
    return [
      // Imágenes fijas de public/ (maniquíes, capturas de la guía, landing,
      // iconos): el navegador y el CDN las guardan una semana y, pasado ese
      // tiempo, siguen usando la copia mientras revisan si cambió. Sin esto
      // cada visita volvía a preguntar por cada imagen.
      ...['/maniquies/:archivo+', '/guia/:archivo+', '/landing/:archivo+', '/icon-:tam.png'].map((source) => ({
        source,
        headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=2592000' }],
      })),
      // Núcleo de ffmpeg.wasm (31 MB, versión fija de package.json): un mes.
      {
        source: '/ffmpeg/:archivo+',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, stale-while-revalidate=2592000' }],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
          { key: 'Content-Security-Policy', value: CSP },
        ],
      },
    ];
  },
};

export default nextConfig;
