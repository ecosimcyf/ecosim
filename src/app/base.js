// ============================================================
// Lo que comparten los dos layouts raíz de la app:
//   · (publico)/[idioma]/layout.js — landing, guía y legales, ESTÁTICOS
//     por idioma (ver src/lib/i18n/publico.js).
//   · (app)/layout.js — vista del estudiante y panel, dinámicos.
// Dos layouts raíz porque <html lang> sale del idioma: en las páginas
// públicas viene en la URL (se conoce al compilar) y en el resto, de la
// cookie del visitante (se conoce solo al recibir la visita).
// ============================================================
import { Fira_Code } from 'next/font/google';
import { SITIO_URL } from '@/lib/sitio';
import { crearT, IDIOMAS, LOCALE_OG } from '@/lib/i18n/config';
import { alternativas } from '@/lib/i18n/publico';
import { LANDING } from '@/lib/i18n/textos/landing';

// Monoespaciada propia (self-hosted, sin pedirla a Google en runtime) en
// vez de Consolas — que en Mac/Linux ni siquiera existe y cae a Courier
// New. Se expone como variable CSS (--font-mono, ver globals.css) en vez
// de className directo en <body>, así no pisa el font-family propio de la
// landing (Plus Jakarta Sans, en landing/fuente.js).
export const firaCode = Fira_Code({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

// Título, descripción y vista previa al compartir el enlace (WhatsApp,
// redes, correo), en el idioma dado.
export function metadatosBase(idioma) {
  const t = crearT(LANDING, idioma);
  return {
    metadataBase: new URL(SITIO_URL),
    title: t('meta.tituloCorto'),
    description: t('meta.descripcionCorta'),
    openGraph: {
      type: 'website',
      locale: LOCALE_OG[idioma],
      siteName: 'EcoSim',
      title: t('meta.tituloCorto'),
      description: t('meta.descripcionCorta'),
      images: [{ url: '/landing/demo-maniqui.png', width: 800, height: 455, alt: t('meta.altMuestra') }],
    },
    twitter: { card: 'summary_large_image' },
    // Permite añadirla a la pantalla de inicio del iPhone y abrirla como app.
    appleWebApp: {
      capable: true,
      title: 'EcoSim',
      statusBarStyle: 'black-translucent',
    },
  };
}

// Metadatos de UNA página pública (landing, guía, términos, privacidad): su
// propio título, descripción y dirección al compartir el enlace. Hay que
// repetir type/locale/imagen aquí porque Next.js reemplaza el bloque
// openGraph completo del layout (no lo mezcla campo a campo).
export function metadatosPagina({ idioma, ruta, titulo, descripcion }) {
  const t = crearT(LANDING, idioma);
  const imagenes = [{ url: '/landing/demo-maniqui.png', width: 800, height: 455, alt: t('meta.altMuestra') }];
  return {
    title: titulo,
    description: descripcion,
    alternates: alternativas(ruta, idioma),
    openGraph: {
      type: 'website',
      locale: LOCALE_OG[idioma],
      alternateLocale: IDIOMAS.filter((i) => i !== idioma).map((i) => LOCALE_OG[i]),
      siteName: 'EcoSim',
      title: titulo,
      description: descripcion,
      url: '/' + idioma + ruta,
      images: imagenes,
    },
    twitter: { card: 'summary_large_image', title: titulo, description: descripcion, images: imagenes.map((i) => i.url) },
  };
}

export const viewportBase = {
  themeColor: '#05070c',
  // Que la página ocupe también la zona de la muesca (notch) del móvil.
  viewportFit: 'cover',
  initialScale: 1,
  // NO bloqueamos el zoom: quien necesite ampliar, puede. El zoom accidental
  // por doble toque se evita desde el CSS (touch-action: manipulation).
};
