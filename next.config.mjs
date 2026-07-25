import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Esta app vive en la subcarpeta web/ junto a la app de escritorio.
  // Fijamos aquí la raíz para que Next no se confunda con el otro
  // package-lock.json de la carpeta de arriba.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
