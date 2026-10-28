// Tipografía de todas las páginas públicas livianas (landing, términos,
// privacidad, 404): un solo sitio para no repetir la llamada a next/font
// en cada page.js.
import { Plus_Jakarta_Sans } from 'next/font/google';

export const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  display: 'swap',
});
