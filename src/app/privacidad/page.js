// Política de privacidad. El texto (en los tres idiomas) está en
// src/lib/i18n/textos/legal.js.
import TextoLegal from '../landing/TextoLegal';
import { idiomaVisitante } from '@/lib/i18n/servidor';
import { LEGAL } from '@/lib/i18n/textos/legal';

export async function generateMetadata() {
  const doc = LEGAL[await idiomaVisitante()].privacidad;
  return { title: doc.metaTitulo, description: doc.metaDescripcion };
}

export default async function Privacidad() {
  return <TextoLegal idioma={await idiomaVisitante()} documento="privacidad" />;
}
