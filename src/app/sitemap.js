// sitemap.xml: solo las páginas públicas (ver robots.js), en sus tres
// idiomas (/es, /pt, /en — ver src/lib/i18n/publico.js), cada una con sus
// versiones alternativas para que el buscador muestre la de cada persona.
import { SITIO_URL } from '@/lib/sitio';
import { IDIOMAS } from '@/lib/i18n/config';
import { RUTAS_PUBLICAS } from '@/lib/i18n/publico';

// Última revisión de los textos públicos (se sube a mano al cambiarlos).
const ULTIMA_REVISION = new Date('2026-11-24');

export default function sitemap() {
  return RUTAS_PUBLICAS.flatMap((ruta) => IDIOMAS.map((idioma) => ({
    url: SITIO_URL + '/' + idioma + ruta,
    changeFrequency: ruta && ruta !== '/guia' ? 'yearly' : 'monthly',
    priority: !ruta ? 1 : ruta === '/guia' ? 0.6 : 0.3,
    lastModified: ULTIMA_REVISION,
    alternates: {
      languages: {
        ...Object.fromEntries(IDIOMAS.map((i) => [i, SITIO_URL + '/' + i + ruta])),
        // Sin idioma elegido, la dirección corta (el middleware la reescribe).
        'x-default': SITIO_URL + (ruta || '/'),
      },
    },
  })));
}
