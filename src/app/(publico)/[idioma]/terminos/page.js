// Términos y condiciones. El texto (en los tres idiomas) está en
// src/lib/i18n/textos/legal.js.
import TextoLegal from '@/app/landing/TextoLegal';
import { idiomaDeParams, alternativas } from '@/lib/i18n/publico';
import { idiomaONoEncontrado } from '@/lib/i18n/publico-servidor';
import { LEGAL } from '@/lib/i18n/textos/legal';

export async function generateMetadata({ params }) {
  const idioma = await idiomaDeParams(params);
  const doc = LEGAL[idioma].terminos;
  return { title: doc.metaTitulo, description: doc.metaDescripcion, alternates: alternativas('/terminos', idioma) };
}

export default async function Terminos({ params }) {
  return <TextoLegal idioma={await idiomaONoEncontrado(params)} documento="terminos" />;
}
