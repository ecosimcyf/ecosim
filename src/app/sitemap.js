// sitemap.xml: solo las páginas públicas (ver robots.js).
import { SITIO_URL } from '@/lib/sitio';

export default function sitemap() {
  return ['', '/guia', '/terminos', '/privacidad'].map((ruta) => ({
    url: SITIO_URL + ruta,
    changeFrequency: ruta && ruta !== '/guia' ? 'yearly' : 'monthly',
    priority: !ruta ? 1 : ruta === '/guia' ? 0.6 : 0.3,
  }));
}
