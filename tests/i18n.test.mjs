// Pruebas de textos (npm test): en CADA tabla de src/lib/i18n/textos/*.js
// los tres idiomas (es, pt, en) deben tener exactamente las mismas claves
// y el mismo tipo en cada hoja. Así no se publica un texto que falta en
// un idioma (la app caería al español sin avisar). Sin red.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const IDIOMAS = ['es', 'pt', 'en'];
// Hojas que pueden ser null en un idioma y texto en otro A PROPÓSITO:
// LEGAL.aviso es null en español (original) y lleva el aviso de «traducción
// de cortesía» en pt y en.
const NULO_PERMITIDO = new Set(['LEGAL:aviso']);

const carpeta = fileURLToPath(new URL('../src/lib/i18n/textos/', import.meta.url));

function tipo(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

// Compara recursivamente la rama de referencia (es) con la del otro idioma
// y devuelve la lista de diferencias.
function comparar(ref, otro, ruta, problemas, tabla) {
  const tr = tipo(ref);
  const to = tipo(otro);
  if (tr !== to && !(NULO_PERMITIDO.has(tabla + ':' + ruta) && (tr === 'null' || to === 'null'))) {
    problemas.push(`${ruta || '(raíz)'}: es es ${tr} pero aquí es ${to}`);
    return;
  }
  if (tr === 'array') {
    if (ref.length !== otro.length) problemas.push(`${ruta}: es tiene ${ref.length} elementos y aquí ${otro.length}`);
    for (let i = 0; i < Math.min(ref.length, otro.length); i++) comparar(ref[i], otro[i], `${ruta}[${i}]`, problemas, tabla);
    return;
  }
  if (tr === 'object') {
    const kr = Object.keys(ref);
    const ko = Object.keys(otro);
    for (const k of kr) {
      if (!ko.includes(k)) problemas.push(`${ruta ? ruta + '.' : ''}${k}: falta`);
      else comparar(ref[k], otro[k], `${ruta ? ruta + '.' : ''}${k}`, problemas, tabla);
    }
    for (const k of ko) if (!kr.includes(k)) problemas.push(`${ruta ? ruta + '.' : ''}${k}: sobra (no está en es)`);
  }
}

const archivos = (await readdir(carpeta)).filter((f) => f.endsWith('.js')).sort();

test('hay archivos de textos que revisar', () => {
  assert.ok(archivos.length > 0);
});

for (const archivo of archivos) {
  const modulo = await import(pathToFileURL(join(carpeta, archivo)).href);
  // Las tablas son los exports { es, pt, en }; el resto (funciones
  // auxiliares) se ignora.
  const tablas = Object.entries(modulo).filter(([, v]) => v && typeof v === 'object' && IDIOMAS.some((i) => i in v));
  test(`${archivo}: tiene al menos una tabla de textos`, () => {
    assert.ok(tablas.length > 0, 'no exporta ninguna tabla { es, pt, en }');
  });
  for (const [nombre, tabla] of tablas) {
    test(`${archivo} → ${nombre}: es, pt y en tienen las mismas claves y tipos`, () => {
      for (const id of IDIOMAS) assert.ok(tabla[id], `falta el idioma ${id}`);
      for (const id of IDIOMAS.filter((i) => i !== 'es')) {
        const problemas = [];
        comparar(tabla.es, tabla[id], '', problemas, nombre);
        assert.deepEqual(problemas, [], `${id} no coincide con es:\n  ` + problemas.join('\n  '));
      }
    });
  }
}
