// Pruebas de los mensajes de error para el usuario (src/lib/mensaje-error.js)
// y de que no queden diálogos nativos del navegador (alert/confirm/prompt).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { claveError, mensajeError, CLAVE_INESPERADO } from '../src/lib/mensaje-error.js';
import { crearT } from '../src/lib/i18n/config.js';
import { PANEL } from '../src/lib/i18n/textos/panel.js';

const TECNICOS = [
  'Failed to fetch', 'fetch failed', 'TypeError', '23503', '42501', 'PGRST116', 'violates foreign key',
  'JWT expired', 'stack', 'undefined', 'Unexpected token', 'ECONNRESET',
];

for (const idioma of ['es', 'pt', 'en']) {
  const t = crearT(PANEL, idioma);

  test(`mensajeError (${idioma}): clave err.* conocida devuelve su texto`, () => {
    assert.equal(mensajeError(new Error('err.sesion'), t), t('err.sesion'));
    assert.equal(mensajeError('err.limitePuntos', t), t('err.limitePuntos'));
  });

  test(`mensajeError (${idioma}): red, tamaño, tiempo y sesión`, () => {
    assert.equal(mensajeError(new TypeError('Failed to fetch'), t), t('err.sinConexion'));
    assert.equal(mensajeError(new Error('fetch failed'), t), t('err.sinConexion'));
    assert.equal(mensajeError({ message: 'The object exceeded the maximum allowed size', statusCode: '413' }, t), t('err.muyGrande'));
    assert.equal(mensajeError(Object.assign(new Error('x'), { name: 'AbortError' }), t), t('err.tiempo'));
    assert.equal(mensajeError({ message: 'JWT expired', status: 401 }, t), t('err.sesionExpirada'));
  });

  test(`mensajeError (${idioma}): lo desconocido da el genérico y nunca el texto técnico`, () => {
    const generico = t('err.inesperado');
    for (const crudo of [
      new Error('duplicate key value violates unique constraint 23505'),
      { code: '42501', message: 'new row violates row-level security policy' },
      { code: 'PGRST116', details: 'The result contains 0 rows' },
      'algo raro', null, undefined, 42,
    ]) {
      const m = mensajeError(crudo, t);
      assert.equal(m, generico);
      for (const x of TECNICOS) assert.ok(!m.includes(x), `"${m}" contiene "${x}"`);
    }
  });

  test(`mensajeError (${idioma}): clave err.* inexistente cae al genérico; porDefecto solo para lo desconocido`, () => {
    assert.equal(mensajeError(new Error('err.noExiste'), t), t('err.inesperado'));
    assert.equal(mensajeError(new Error('boom'), t, { porDefecto: 'ed.noSubir' }), t('ed.noSubir'));
    assert.equal(mensajeError(new TypeError('Failed to fetch'), t, { porDefecto: 'ed.noSubir' }), t('err.sinConexion'));
  });

  test(`textos (${idioma}): los mensajes de error no interpolan errores técnicos`, () => {
    assert.ok(!t('videos.procesar').includes('{error}'));
    assert.ok(!t('ed.noSubir').includes('{error}'));
  });
}

test('claveError: sin coincidencia es el genérico', () => {
  assert.equal(claveError(new Error('cualquier cosa')), CLAVE_INESPERADO);
});

test('el código de src/ no usa alert(), confirm() ni prompt() nativos', async () => {
  const raiz = fileURLToPath(new URL('../src/', import.meta.url));
  const malos = [];
  async function recorrer(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      const ruta = join(dir, e.name);
      if (e.isDirectory()) { await recorrer(ruta); continue; }
      if (!/\.(js|jsx|mjs)$/.test(e.name) || ruta.includes(join('i18n', 'textos'))) continue;
      const lineas = (await readFile(ruta, 'utf8')).split('\n');
      lineas.forEach((l, i) => {
        const sinComentario = l.replace(/\/\/.*$/, '');
        if (/(^|[^\w.$])(window\.)?(alert|confirm|prompt)\s*\(/.test(sinComentario) && !/\b(avisar|useAvisos)\b/.test(sinComentario)) malos.push(`${ruta}:${i + 1}`);
      });
    }
  }
  await recorrer(raiz);
  assert.deepEqual(malos, []);
});
