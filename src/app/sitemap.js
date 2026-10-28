// sitemap.xml: solo las páginas públicas (ver robots.js).
import { SITIO_URL } from '@/lib/sitio';

export default function sitemap() {
  return ['', '/terminos', '/privacidad'].map((ruta) => ({
    url: SITIO_URL + ruta,
    changeFrequency: ruta ? 'yearly' : 'monthly',
    priority: ruta ? 0.3 : 1,
  }));
}
