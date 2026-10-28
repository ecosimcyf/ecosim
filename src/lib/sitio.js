// Dominio público del sitio, para los enlaces absolutos (vista previa al
// compartir en WhatsApp/redes, sitemap). NEXT_PUBLIC_SITE_URL si está
// definida; si no, el dominio de producción que Vercel inyecta solo.
export const SITIO_URL = process.env.NEXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL : 'http://localhost:3000');
