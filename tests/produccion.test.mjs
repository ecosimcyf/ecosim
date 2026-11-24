// Pruebas de lo añadido en la revisión de producción (nov-2026): límites
// de intentos pensados para IP compartida, filtro de errores del
// navegador, páginas públicas por idioma y códigos de 2FA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITES, claveLimite } from '../src/lib/limites.js';
import { alternativas, RUTAS_PUBLICAS, parametrosIdioma } from '../src/lib/i18n/publico.js';
import { idiomaDeNavegador } from '../src/lib/i18n/config.js';

test('límites: un auditorio con la misma IP no queda bloqueado por pocos errores', () => {
  // El login se limita por correo (un profesor no bloquea a los demás) y por IP, más alto.
  assert.ok(LIMITES.loginIp.max > LIMITES.loginCorreo.max * 5);
  assert.ok(LIMITES.contactoIp.max >= 20);
});

test('límites: la clave del contador normaliza correo y recorta', () => {
  assert.equal(claveLimite('login', '1.2.3.4', ' Profe@Clinica.CO '), 'login:1.2.3.4:profe@clinica.co');
  assert.equal(claveLimite('x', 'y'.repeat(500)).length, 200);
});

test('páginas públicas: una versión por idioma con enlaces alternativos', () => {
  assert.deepEqual(parametrosIdioma(), [{ idioma: 'es' }, { idioma: 'pt' }, { idioma: 'en' }]);
  assert.ok(RUTAS_PUBLICAS.includes('') && RUTAS_PUBLICAS.includes('/guia'));
  const a = alternativas('/guia', 'pt');
  assert.equal(a.canonical, '/pt/guia');
  assert.equal(a.languages.en, '/en/guia');
  assert.equal(a.languages['x-default'], '/guia');
  assert.equal(alternativas('', 'es').languages['x-default'], '/');
});

test('idioma del navegador: respeta el orden de preferencia', () => {
  assert.equal(idiomaDeNavegador('pt-BR,pt;q=0.9,en;q=0.8'), 'pt');
  assert.equal(idiomaDeNavegador('de-DE,en;q=0.5,es;q=0.9'), 'es');
  assert.equal(idiomaDeNavegador('fr'), null);
  assert.equal(idiomaDeNavegador(''), null);
});

test('correo: lista de destinatarios desde una variable', async () => {
  const { destinatarios } = await import('../src/lib/correo.js');
  assert.deepEqual(destinatarios(' a@x.co, b@y.co ,, '), ['a@x.co', 'b@y.co']);
  assert.deepEqual(destinatarios(undefined), []);
});
