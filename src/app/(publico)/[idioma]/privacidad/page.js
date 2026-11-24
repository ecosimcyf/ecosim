// Política de privacidad. El texto (en los tres idiomas) está en
// src/lib/i18n/textos/legal.js.
import TextoLegal from '@/app/landing/TextoLegal';
import { metadatosPagina } from '@/app/base';
import { idiomaDeParams } from '@/lib/i18n/publico';
import { idiomaONoEncontrado } from '@/lib/i18n/publico-servidor';
import { LEGAL } from '@/lib/i18n/textos/legal';

export async function generateMetadata({ params }) {
  const idioma = await idiomaDeParams(params);
  const doc = LEGAL[idioma].privacidad;
  return metadatosPagina({ idioma, ruta: '/privacidad', titulo: doc.metaTitulo, descripcion: doc.metaDescripcion });
}

export default async function Privacidad({ params }) {
  return <TextoLegal idioma={await idiomaONoEncontrado(params)} documento="privacidad" />;
}
