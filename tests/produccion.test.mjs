// Pruebas de lo añadido en la revisión de producción (nov-2026): límites
// de intentos pensados para IP compartida, filtro de errores del
// navegador, páginas públicas por idioma y códigos de 2FA.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITES, claveLimite } from '../src/lib/limites.js';
import { esRuido, limpiarReporte, MAX_MENSAJE } from '../src/lib/filtro-errores.js';
import { alternativas, RUTAS_PUBLICAS, parametrosIdioma } from '../src/lib/i18n/publico.js';
import { idiomaDeNavegador } from '../src/lib/i18n/config.js';
import { codigoTotp } from '../src/lib/mfa.js';
import { codigoValido, CODIGO_MIN } from '../src/lib/codigo-acceso.js';

test('límites: un auditorio con la misma IP no queda bloqueado por pocos errores', () => {
  // Cientos de estudiantes detrás de una IP: el tope del código es alto…
  assert.ok(LIMITES.codigo.max >= 100);
  // …pero adivinar un código nuevo (mínimo 6, letras y números) sigue siendo inviable:
  const combinaciones = 36 ** CODIGO_MIN;
  const intentosPorAnio = LIMITES.codigo.max * (365 * 24 * 3600 / LIMITES.codigo.ventanaSeg);
  assert.ok(combinaciones / 2 / intentosPorAnio > 100, 'menos de 100 años en promedio');
  // El login se limita por correo (un profesor no bloquea a los demás) y por IP, más alto.
  assert.ok(LIMITES.loginIp.max > LIMITES.loginCorreo.max * 5);
  assert.ok(LIMITES.contactoIp.max >= 20);
});

test('límites: la clave del contador normaliza correo y recorta', () => {
  assert.equal(claveLimite('login', '1.2.3.4', ' Profe@Clinica.CO '), 'login:1.2.3.4:profe@clinica.co');
  assert.equal(claveLimite('x', 'y'.repeat(500)).length, 200);
});

test('código de acceso: los nuevos deben tener 6 o más caracteres', () => {
  assert.equal(CODIGO_MIN, 6);
  assert.ok(!codigoValido('abcde'));
  assert.ok(codigoValido('gato26'));
});

test('errores del navegador: se descarta el ruido y se limpia lo que llega', () => {
  assert.ok(esRuido('Script error.', ''));
  assert.ok(esRuido('ResizeObserver loop completed with undelivered notifications.', ''));
  assert.ok(esRuido('x is undefined', 'at foo (chrome-extension://abc/content.js:1:1)'));
  assert.ok(esRuido('', ''));
  assert.ok(esRuido('AbortError: The user aborted a request.', ''));
  assert.ok(!esRuido("Cannot read properties of null (reading 'play')", 'at VistaPrincipal'));

  const r = limpiarReporte({ origen: 'estudiante', mensaje: 'a'.repeat(5000) + '\u0007', ruta: '/c/cyf?token=SECRETO#x', pila: 1234 });
  assert.equal(r.mensaje.length, MAX_MENSAJE);
  assert.equal(r.ruta, '/c/cyf'); // sin la consulta ni el ancla
  assert.equal(r.pila, '1234');
  assert.equal(limpiarReporte({}).origen, 'navegador');
  assert.equal(limpiarReporte(null).mensaje, '');
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

test('2FA: solo se aceptan códigos de 6 dígitos (con o sin espacio)', () => {
  assert.equal(codigoTotp('123456'), '123456');
  assert.equal(codigoTotp('123 456'), '123456');
  assert.equal(codigoTotp('12345'), null);
  assert.equal(codigoTotp('abcdef'), null);
  assert.equal(codigoTotp(null), null);
});
