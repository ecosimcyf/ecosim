// Pruebas de la lógica pura de la vista del estudiante (sin navegador):
// cadencia del sondeo y cuentas del monitor de signos vitales.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { esperaInicial, siguienteIntervalo, SONDEO_BASE_MS, SONDEO_MAX_MS } from '../src/lib/sondeo.js';
import { presionMedia, estadoValor, aNumero } from '../src/lib/examenes-lectura.js';
import * as examenes from '../src/lib/examenes.js';

test('sondeo: el primer sondeo lleva un desfase de 0 a 5 s sobre los 15 s', () => {
  assert.equal(esperaInicial(0), 15000);
  assert.equal(esperaInicial(1), 20000);
  assert.equal(esperaInicial(0.5), 17500);
  // Valores fuera de rango o basura no rompen la cadencia.
  assert.equal(esperaInicial(7), 20000);
  assert.equal(esperaInicial(-1), 15000);
  assert.equal(esperaInicial(NaN), 15000);
});

test('sondeo: el intervalo se duplica tras un fallo (máx. 60 s) y se recupera con un éxito', () => {
  let i = SONDEO_BASE_MS;
  i = siguienteIntervalo(i, false); assert.equal(i, 30000);
  i = siguienteIntervalo(i, false); assert.equal(i, 60000);
  i = siguienteIntervalo(i, false); assert.equal(i, SONDEO_MAX_MS);
  assert.equal(siguienteIntervalo(i, true), SONDEO_BASE_MS);
  assert.equal(siguienteIntervalo(1000, false), 30000); // nunca por debajo de la base
});

test('monitor: PAM = (PAS + 2·PAD) / 3 redondeada; sin una de las dos, nada', () => {
  assert.equal(presionMedia('120', '80'), 93);
  assert.equal(presionMedia('120,5', 80), 94);
  assert.equal(presionMedia('120', ''), null);
  assert.equal(presionMedia(undefined, '80'), null);
  assert.equal(presionMedia('abc', '80'), null);
});

test('examenes.js sigue exportando lo de las plantillas y lo de la vista (re-exportado)', () => {
  assert.equal(examenes.aNumero, aNumero);
  assert.equal(examenes.estadoValor, estadoValor);
  assert.ok(Array.isArray(examenes.PLANTILLAS_LAB) && examenes.PLANTILLAS_LAB.length > 0);
  assert.equal(typeof examenes.panelDesdePlantilla, 'function');
  assert.equal(typeof examenes.enIdioma, 'function');
  assert.equal(typeof examenes.filaVacia, 'function');
  assert.ok(examenes.CAMPOS_VITALES.some((c) => c.id === 'fc'));
});
