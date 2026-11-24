// Pruebas (npm test, sin red) de la revisión del servidor de nov-2026:
// clave de IP, nombres por defecto, asunto del correo y tope de la limpieza.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { claveIp, sinSaltos, LIMITE_CORREO_DIA } from '../src/lib/limites.js';
import { nombrePorDefecto } from '../src/lib/validar.js';
import { excedeTopeHuerfanos, paraLike, faltaMigracion } from '../src/lib/limpieza.js';

test('IP: IPv4 se usa entera; IPv6 solo por su prefijo /64', () => {
  assert.equal(claveIp('203.0.113.7'), '203.0.113.7');
  assert.equal(claveIp(''), 'desconocido');
  assert.equal(claveIp(undefined), 'desconocido');
  // Dos direcciones del mismo /64 comparten clave; otro /64, no.
  const a = claveIp('2001:db8:abcd:12:1111:2222:3333:4444');
  assert.equal(a, '2001:db8:abcd:12::/64');
  assert.equal(claveIp('2001:DB8:abcd:12:ffff::1'), a);
  assert.notEqual(claveIp('2001:db8:abcd:13::1'), a);
  // Forma comprimida y ceros iniciales.
  assert.equal(claveIp('2001:db8::1'), '2001:db8:0:0::/64');
  assert.equal(claveIp('2001:0db8:0000:0001:0:0:0:5'), '2001:db8:0:1::/64');
  assert.equal(claveIp('::1'), '0:0:0:0::/64');
  // IPv4 dentro de IPv6 y zona de interfaz.
  assert.equal(claveIp('::ffff:198.51.100.2'), '198.51.100.2');
  assert.equal(claveIp('fe80::1%eth0'), 'fe80:0:0:0::/64');
});

test('nombres por defecto: según el idioma de la cuenta, español si es desconocido', () => {
  assert.equal(nombrePorDefecto('casoNuevo', 'es'), 'Caso nuevo');
  assert.equal(nombrePorDefecto('casoNuevo', 'pt'), 'Novo caso');
  assert.equal(nombrePorDefecto('casoNuevo', 'en'), 'New case');
  assert.equal(nombrePorDefecto('caso', 'en'), 'Case');
  assert.equal(nombrePorDefecto('puntoNuevo', 'pt'), 'Novo ponto');
  assert.equal(nombrePorDefecto('punto', 'en'), 'Point');
  assert.equal(nombrePorDefecto('punto', 'fr'), 'Punto');
  assert.equal(nombrePorDefecto('punto', 'constructor'), 'Punto');
  assert.equal(nombrePorDefecto('punto', undefined), 'Punto');
});

test('contacto: el asunto del correo no admite saltos de línea', () => {
  assert.equal(sinSaltos('Ana\r\nBcc: robo@x.com'), 'Ana Bcc: robo@x.com');
  assert.equal(sinSaltos('a\nb\rc\u2028d'), 'a b c d');
  assert.ok(!/[\r\n]/.test(sinSaltos('x\r\n\r\ny')));
  assert.equal(sinSaltos(null), '');
  assert.ok(LIMITE_CORREO_DIA.max > 0 && LIMITE_CORREO_DIA.ventanaSeg === 86400);
});

test('limpieza: no borra si los huérfanos pasan del 20 % (y son más de 10)', () => {
  assert.equal(excedeTopeHuerfanos(0, 100), false);
  assert.equal(excedeTopeHuerfanos(10, 20), false); // 50 %, pero son pocos
  assert.equal(excedeTopeHuerfanos(11, 20), true);
  assert.equal(excedeTopeHuerfanos(20, 100), false); // justo 20 %
  assert.equal(excedeTopeHuerfanos(21, 100), true);
  assert.equal(excedeTopeHuerfanos(11, 1000), false);
  assert.equal(excedeTopeHuerfanos(500, 0), true);
});

test('limpieza: texto literal para un like y detección de migración pendiente', () => {
  assert.equal(paraLike('a_b%c\\d'), 'a\\_b\\%c\\\\d');
  assert.equal(faltaMigracion({ code: 'PGRST202' }), true);
  assert.equal(faltaMigracion({ code: '42P01' }), true);
  assert.equal(faltaMigracion({ code: '23505' }), false);
  assert.equal(faltaMigracion(null), false);
});