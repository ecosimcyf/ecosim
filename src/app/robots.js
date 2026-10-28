// robots.txt: la landing y las páginas legales se pueden indexar; el panel
// y los enlaces de cada cuenta (/c/...) no (son privados de cada cliente).
import { SITIO_URL } from '@/lib/sitio';

export default function robots() {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/c/'] },
    sitemap: SITIO_URL + '/sitemap.xml',
  };
}
