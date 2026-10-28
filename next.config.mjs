import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Origen de Supabase (API, Storage con los videos).
const SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const CSP_APLICADA = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

const CSP_COMPLETA = [
  "default-src 'self'",
  // Next.js mete scripts en línea para hidratar; ffmpeg.wasm necesita
  // blob: (carga su núcleo como blob) y 'wasm-unsafe-eval'.
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:",
  "worker-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: " + SUPABASE,
  "media-src 'self' blob: " + SUPABASE,
  "connect-src 'self' blob: " + SUPABASE + ' ' + SUPABASE.replace('https://', 'wss://'),
  "font-src 'self'",
  CSP_APLICADA,
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

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
        // CSP en dos partes:
        //  - Content-Security-Policy (se APLICA): solo directivas que no
        //    pueden romper nada de la app — nadie puede incrustarla en un
        //    iframe, ni cargar plugins, ni cambiar la base de los enlaces,
        //    ni mandar formularios a otro dominio.
        //  - ...-Report-Only (solo AVISA en la consola, no bloquea): la
        //    política completa. Cuando se confirme en producción que la
        //    consola no muestra avisos (sobre todo al convertir un video con
        //    ffmpeg.wasm en el panel), se puede pasar a la cabecera de arriba.
        { key: 'Content-Security-Policy', value: CSP_APLICADA },
        { key: 'Content-Security-Policy-Report-Only', value: CSP_COMPLETA },
      ],
    }];
  },
};

export default nextConfig;
