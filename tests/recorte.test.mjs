// Pruebas de la lógica pura del recorte de vídeo (src/lib/recorte-video.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatearTiempo, acotarRecorte, necesitaRecorte, argsRecorte, construirArgsFFmpeg } from '../src/lib/recorte-video.js';

test('formatearTiempo: mm:ss y décimas', () => {
  assert.equal(formatearTiempo(0), '0:00');
  assert.equal(formatearTiempo(75.4), '1:15');
  assert.equal(formatearTiempo(59.99), '0:59');
  assert.equal(formatearTiempo(600), '10:00');
  assert.equal(formatearTiempo(75.46, true), '1:15.5');
  assert.equal(formatearTiempo(-3), '0:00');
  assert.equal(formatearTiempo(NaN), '0:00');
});

test('acotarRecorte: el tramo cabe siempre dentro del vídeo', () => {
  assert.deepEqual(acotarRecorte({ inicio: 10, largo: 30, duracion: 120, max: 30 }), { inicio: 10, largo: 30, fin: 40 });
  // inicio demasiado grande -> se pega al final
  assert.deepEqual(acotarRecorte({ inicio: 500, largo: 30, duracion: 120, max: 30 }), { inicio: 90, largo: 30, fin: 120 });
  // inicio negativo
  assert.equal(acotarRecorte({ inicio: -5, largo: 30, duracion: 120, max: 30 }).inicio, 0);
  // largo mayor que el máximo -> se acota al máximo
  assert.equal(acotarRecorte({ inicio: 0, largo: 99, duracion: 120, max: 30 }).largo, 30);
  // vídeo más corto que el máximo
  assert.deepEqual(acotarRecorte({ inicio: 3, largo: 30, duracion: 20, max: 30 }), { inicio: 0, largo: 20, fin: 20 });
  // largo mínimo de 1 s
  assert.equal(acotarRecorte({ inicio: 0, largo: 0, duracion: 120, max: 30 }).largo, 1);
  // al subir el largo cerca del final, el inicio retrocede
  assert.deepEqual(acotarRecorte({ inicio: 100, largo: 30, duracion: 110, max: 30 }), { inicio: 80, largo: 30, fin: 110 });
  // valores no numéricos
  assert.deepEqual(acotarRecorte({ inicio: NaN, largo: undefined, duracion: 60, max: 30 }), { inicio: 0, largo: 30, fin: 30 });
});

test('necesitaRecorte: margen de 0,5 s', () => {
  assert.equal(necesitaRecorte(30.4, 30), false);
  assert.equal(necesitaRecorte(31, 30), true);
  assert.equal(necesitaRecorte(null, 30), false);
});

test('argsRecorte / construirArgsFFmpeg', () => {
  assert.deepEqual(argsRecorte(null), { antes: [], salida: [] });
  assert.deepEqual(argsRecorte({ inicio: 12.34, largo: 30 }), { antes: ['-ss', '12.3'], salida: ['-t', '30'] });
  const con = construirArgsFFmpeg({ inicio: 5, largo: 30 });
  assert.deepEqual(con.slice(0, 5), ['-ss', '5', '-i', 'entrada', '-t']);
  assert.equal(con[5], '30');
  assert.ok(con.indexOf('-ss') < con.indexOf('-i'), '-ss va antes de -i');
  assert.ok(con.includes('libx264') && con.includes('-an') && con.at(-1) === 'salida.mp4');
  // sin recorte: igual que antes
  const sin = construirArgsFFmpeg(null);
  assert.deepEqual(sin.slice(0, 2), ['-i', 'entrada']);
  assert.ok(!sin.includes('-ss') && !sin.includes('-t'));
});
