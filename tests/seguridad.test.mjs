// Pruebas automáticas (npm test). Usan solo el probador que trae Node
// (node:test), sin dependencias extra. Cubren las reglas de seguridad que
// no se ven a simple vista: nombres de archivo subidos, slugs, el código
// de acceso de los estudiantes y cómo se carga un caso.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarSlug, slugValido, extensionDeSubida } from '../src/lib/validar.js';
import { cifrarCodigo, comprobarCodigo, codigoValido, nuevoTokenAcceso } from '../src/lib/codigo-acceso.js';
import { nombreCookieAcceso, esErrorDeCodigo } from '../src/lib/acceso.js';
import { listarCasosActivos, cargarDatosDeCaso, SIN_ACCESO, PRECARGA_MAX_MB } from '../src/lib/datos.js';

const UUID = '0f8fad5b-d9cb-469f-a165-70867728950e';

test('subidas: solo se acepta la forma exacta cuentaId/uuid.ext', () => {
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-a/${UUID}.mp4`, ['mp4']), 'mp4');
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-a/${UUID}.png`, ['webp', 'jpg', 'png', 'pdf']), 'png');
  // Otra cuenta, recorrido de carpetas, extensión no permitida, basura.
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-b/${UUID}.mp4`, ['mp4']), null);
  assert.equal(extensionDeSubida('cuenta-a', 'cuenta-a/../../auth/v1/admin/users', ['mp4']), null);
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-a/../${UUID}.mp4`, ['mp4']), null);
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-a/${UUID}.html`, ['mp4']), null);
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-a/------------------------------------.mp4`, ['mp4']), null);
  assert.equal(extensionDeSubida('cuenta-a', `cuenta-a/x/${UUID}.mp4`, ['mp4']), null);
  assert.equal(extensionDeSubida('', `/${UUID}.mp4`, ['mp4']), null);
  assert.equal(extensionDeSubida('cuenta-a', null, ['mp4']), null);
});

test('slugs: se normalizan y se validan', () => {
  assert.equal(normalizarSlug('  Clínica Norte_2 '), 'clinica-norte-2');
  assert.equal(normalizarSlug('São João!!'), 'sao-joao');
  assert.ok(slugValido('cyf'));
  assert.ok(!slugValido('a'));
  assert.ok(!slugValido('-abc'));
  assert.ok(!slugValido('a'.repeat(41)));
});

test('código de acceso: se cifra, se comprueba y no distingue mayúsculas', () => {
  const guardado = cifrarCodigo('Perro2026');
  assert.match(guardado, /^scrypt\$/);
  assert.ok(!guardado.includes('perro2026'));
  assert.ok(comprobarCodigo('perro2026', guardado));
  assert.ok(comprobarCodigo('  PERRO2026 ', guardado));
  assert.ok(!comprobarCodigo('perro2027', guardado));
  assert.ok(!comprobarCodigo('perro2026', 'basura'));
  assert.ok(!comprobarCodigo('perro2026', null));
  // Dos cifrados del mismo código son distintos (sal aleatoria).
  assert.notEqual(cifrarCodigo('abcd'), cifrarCodigo('abcd'));
  assert.ok(codigoValido('perro1'));
  assert.ok(!codigoValido('perro'));
  assert.ok(!codigoValido('x'.repeat(41)));
  assert.ok(nuevoTokenAcceso().length >= 32);
  assert.notEqual(nuevoTokenAcceso(), nuevoTokenAcceso());
});

test('cookie de acceso: un nombre seguro por cuenta', () => {
  assert.equal(nombreCookieAcceso('cuenta-demo'), 'acceso_cuenta-demo');
  assert.equal(nombreCookieAcceso('a;b=c'), 'acceso_abc');
  assert.ok(esErrorDeCodigo({ code: '28000' }));
  assert.ok(!esErrorDeCodigo({ code: '42501' }));
});

// Cliente de Supabase falso: devuelve lo que se le indique por función.
function falso(respuestas) {
  return { rpc: async (fn, args) => ({ ...(respuestas[fn] ? respuestas[fn](args) : { data: null }) }) };
}

test('menú: distingue "sin código", "falló la red" y la lista', async () => {
  assert.equal(await listarCasosActivos(falso({ casos_activos_v2: () => ({ error: { code: '28000' } }) }), 'c', null), SIN_ACCESO);
  assert.equal(await listarCasosActivos(falso({ casos_activos_v2: () => ({ error: { code: '500' } }) }), 'c', null), null);
  const lista = await listarCasosActivos(falso({
    casos_activos_v2: (a) => ({ data: [{ id: 'k', nombre: 'N', descripcion: '', especie: 'perro', lab: true, rx: false, vitales: null, _t: a.p_token }] }),
  }), 'c', 'tok');
  assert.deepEqual(lista, [{ id: 'k', nombre: 'N', descripcion: '', especie: 'perro', examenes: { lab: true, rx: false, vitales: false } }]);
});

function caso(videos) {
  return falso({
    datos_caso_v2: () => ({
      data: {
        caso: { id: 'k', nombre: 'N', especie: 'perro' },
        puntos: videos.map((_, i) => ({ id: 'p' + i, vista: 'ventral', x: 10, y: 20 })),
        videos: videos.map((mb, i) => ({ punto_id: 'p' + i, video_url: 'u' + i, tamano_bytes: mb == null ? null : mb * 1024 * 1024 })),
        examenes: { laboratorio: [], vitales: {}, archivos: [] },
      },
    }),
  });
}

test('precarga: casos livianos se precargan, los pesados no', async () => {
  // El caso real de cyf: 14 videos de ~2,4 MB (34 MB).
  const cyf = await cargarDatosDeCaso(caso(Array(14).fill(2.43)), 'k', 'c', null);
  assert.equal(cyf.precargar, true);
  assert.equal(cyf.puntos.length, 14);
  assert.equal(cyf.puntos[0].videoUrl, 'u0');
  // Por encima del límite.
  const pesado = await cargarDatosDeCaso(caso(Array(30).fill(2.5)), 'k', 'c', null);
  assert.equal(pesado.precargar, false);
  // Videos viejos sin tamaño cuentan como 5 MB cada uno.
  const viejos = await cargarDatosDeCaso(caso(Array(Math.floor(PRECARGA_MAX_MB / 5) + 1).fill(null)), 'k', 'c', null);
  assert.equal(viejos.precargar, false);
});

test('caso: sin código, red caída o desactivado', async () => {
  assert.deepEqual(await cargarDatosDeCaso(falso({ datos_caso_v2: () => ({ error: { code: '28000' } }) }), 'k', 'c', null),
    { casoId: null, sinAcceso: true });
  assert.deepEqual(await cargarDatosDeCaso(falso({ datos_caso_v2: () => ({ error: { code: 'x' } }) }), 'k', 'c', null),
    { casoId: null, error: true });
  assert.deepEqual(await cargarDatosDeCaso(falso({ datos_caso_v2: () => ({ data: null }) }), 'k', 'c', null),
    { casoId: null });
});
