import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esta app vive en la subcarpeta web/ junto a la app de escritorio.
  // Fijamos aquí la raíz para que Next no se confunda con el otro
  // package-lock.json de la carpeta de arriba.
  outputFileTracingRoot: __dirname,

  // No anunciar el framework usado.
  poweredByHeader: false,

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};

export default nextConfig;
