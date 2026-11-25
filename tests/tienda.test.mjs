// Pruebas de la tienda de casos (npm test, sin red): lógica pura, entrega con
// un Supabase falso (éxito, fallo a mitad con compensación, doble entrega,
// tope de puntos), borrado seguro de Storage y reglas de seguridad de las
// acciones.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  monedaDeIdioma, columnaPrecio, normalizarNombrePunto, planificarMapeoPuntos, transicionValida,
  pathDeUrlPublica, pathEsDeCuenta, puedeBorrarObjeto, limpiarDatosCatalogo, urlWhatsappSolicitud, ErrorTienda,
  puedeEntregarse, CUENTA_CATALOGO_ID,
} from '../src/lib/tienda.js';
import {
  entregarAdquisicion, borrarObjetosSeguros, borrarVideosSeguros, borrarExamenesSeguros, crearSolicitud,
  cambiarEstado, contadoresDeCasos, catalogoDeCaso, leerTiendaDeCuenta,
} from '../src/lib/entrega.js';
import { WHATSAPP_NUMERO } from '../src/app/landing/contacto.js';
import { crearFalso } from './_falso.mjs';

const URL_VIDEO = (cuenta, n) => `https://x.supabase.co/storage/v1/object/public/videos/${cuenta}/${n}.mp4`;

// ---------- lógica pura ----------

test('moneda: es=COP, pt=BRL, en=USD; desconocido cae en COP', () => {
  assert.equal(monedaDeIdioma('es'), 'COP');
  assert.equal(monedaDeIdioma('pt'), 'BRL');
  assert.equal(monedaDeIdioma('en'), 'USD');
  assert.equal(monedaDeIdioma('fr'), 'COP');
  assert.equal(monedaDeIdioma('constructor'), 'COP');
  assert.equal(columnaPrecio('BRL'), 'precio_brl');
  assert.equal(columnaPrecio('x'), 'precio_cop');
});

test('puntos: el nombre se normaliza (trim, minúsculas, espacios colapsados)', () => {
  assert.equal(normalizarNombrePunto('  Riñón   Izq '), 'riñón izq');
  assert.equal(normalizarNombrePunto(null), '');
});

test('mapeo de puntos: reutiliza, crea, no repite destino y avisa del tope', () => {
  let n = 0;
  const nuevoId = () => 'punto-n' + (++n);
  const o = (id, nombre, vista = 'ventral', especie = 'perro') => ({ id, especie, vista, nombre, x: 1, y: 2 });
  const plan = planificarMapeoPuntos({
    puntosOrigen: [o('a', 'Hígado'), o('b', 'Bazo'), o('c', 'bazo '), o('d', 'Hígado', 'izq')],
    puntosDestino: [o('x', '  hígado '), o('y', 'Bazo', 'ventral', 'gato')],
    maxPuntos: 10, nuevoId,
  });
  assert.equal(plan.mapa.a, 'x'); // misma especie, vista y nombre normalizado
  // Bazo del perro no coincide con el del gato: se crea; el segundo "bazo" también (otro destino).
  assert.notEqual(plan.mapa.b, plan.mapa.c);
  assert.ok(plan.nuevos.some((p) => p.id === plan.mapa.b));
  assert.notEqual(plan.mapa.d, 'x'); // otra vista
  assert.equal(plan.nuevos.length, 3);
  assert.equal(plan.total, 5);
  assert.equal(plan.excede, false);
  assert.deepEqual(plan.nuevos[0], { id: 'punto-n1', especie: 'perro', vista: 'ventral', nombre: 'Bazo', x: 1, y: 2 });

  const justo = planificarMapeoPuntos({ puntosOrigen: [o('a', 'A'), o('b', 'B')], puntosDestino: [o('x', 'Z')], maxPuntos: 3, nuevoId });
  assert.equal(justo.excede, false);
  const pasa = planificarMapeoPuntos({ puntosOrigen: [o('a', 'A'), o('b', 'B')], puntosDestino: [o('x', 'Z')], maxPuntos: 2, nuevoId });
  assert.equal(pasa.excede, true);
});

test('estados: solo transiciones válidas', () => {
  assert.ok(transicionValida('solicitada', 'pagada'));
  assert.ok(transicionValida('pagada', 'cancelada'));
  assert.ok(transicionValida('fallida', 'entregando'));
  assert.ok(!transicionValida('entregada', 'cancelada'));
  assert.ok(!transicionValida('cancelada', 'pagada'));
  assert.ok(!transicionValida('pagada', 'solicitada'));
  assert.ok(!transicionValida('constructor', 'pagada'));
  // B2: entregar exige el pago marcado.
  assert.ok(!transicionValida('solicitada', 'entregando'));
  assert.ok(transicionValida('pagada', 'entregando'));
  // M1: una entregada solo se reentrega si la clínica borró su caso.
  assert.ok(!transicionValida('entregada', 'entregando'));
  assert.ok(transicionValida('entregada', 'entregando', { casoBorrado: true }));
  assert.ok(!puedeEntregarse({ estado: 'entregada', casoEntregadoId: 'caso-1' }));
  assert.ok(puedeEntregarse({ estado: 'entregada', casoEntregadoId: null }));
  assert.ok(puedeEntregarse({ estado: 'fallida', casoEntregadoId: null }));
  assert.ok(!puedeEntregarse({ estado: 'solicitada', casoEntregadoId: null }));
  assert.ok(!puedeEntregarse({ estado: 'cancelada', casoEntregadoId: null }));
});

test('Storage: paths de URL pública y regla de borrado', () => {
  assert.equal(pathDeUrlPublica(URL_VIDEO('c1', 'u'), 'videos'), 'c1/u.mp4');
  assert.equal(pathDeUrlPublica(URL_VIDEO('c1', 'u'), 'examenes'), null);
  assert.equal(pathDeUrlPublica('', 'videos'), null);
  assert.ok(pathEsDeCuenta('c1/u.mp4', 'c1'));
  assert.ok(!pathEsDeCuenta('c2/u.mp4', 'c1'));
  assert.ok(!pathEsDeCuenta('c1/../c2/u.mp4', 'c1'));
  assert.ok(!pathEsDeCuenta('c1x/u.mp4', 'c1'));
  assert.ok(!pathEsDeCuenta('u.mp4', 'c1'));
  assert.ok(puedeBorrarObjeto({ path: 'c1/u.mp4', cuentaId: 'c1', referenciasRestantes: 0 }));
  assert.ok(!puedeBorrarObjeto({ path: 'c1/u.mp4', cuentaId: 'c1', referenciasRestantes: 1 }));
  assert.ok(!puedeBorrarObjeto({ path: 'c1/u.mp4', cuentaId: 'c1', referenciasRestantes: null }));
  assert.ok(!puedeBorrarObjeto({ path: 'c2/u.mp4', cuentaId: 'c1', referenciasRestantes: 0 }));
});

test('catálogo: validación de datos', () => {
  const d = limpiarDatosCatalogo({
    titulo: '  Caso renal ', descripcionVenta: 'x', precioCop: '1500000', precioBrl: '', precioUsd: '350,5',
    nivel: 'basico', etiquetas: 'riñón, ,riñón,gato', orden: '3', publicado: 1,
  });
  assert.equal(d.titulo, 'Caso renal');
  assert.equal(d.precio_cop, 1500000);
  assert.equal(d.precio_brl, null);
  assert.equal(d.precio_usd, 350.5);
  assert.deepEqual(d.etiquetas, ['riñón', 'gato']);
  assert.equal(d.orden, 3);
  assert.equal(d.publicado, true);
  assert.throws(() => limpiarDatosCatalogo({ titulo: ' ' }), (e) => e.message === 'err.tituloCatalogo');
  assert.throws(() => limpiarDatosCatalogo({ titulo: 'a', precioCop: -1 }), (e) => e.message === 'err.precio');
  assert.throws(() => limpiarDatosCatalogo({ titulo: 'a', precioCop: 'abc' }), (e) => e.message === 'err.precio');
  assert.throws(() => limpiarDatosCatalogo({ titulo: 'a', nivel: 'dios' }), (e) => e.message === 'err.nivel');
  // Parcial: solo lo que viene.
  assert.deepEqual(limpiarDatosCatalogo({ publicado: false }, { parcial: true }), { publicado: false });
});

test('WhatsApp: mensaje en el idioma de la cuenta, con cuenta y caso, sin precios', () => {
  for (const [idioma, frag] of [['es', 'Hola'], ['pt', 'Olá'], ['en', 'Hi']]) {
    const u = urlWhatsappSolicitud({ idioma, cuenta: 'Clínica Norte', titulo: 'Caso renal' });
    assert.ok(u.startsWith('https://wa.me/' + WHATSAPP_NUMERO + '?text='));
    const texto = decodeURIComponent(u.split('?text=')[1]);
    assert.ok(texto.includes(frag), texto);
    assert.ok(texto.includes('Clínica Norte') && texto.includes('Caso renal'));
    assert.ok(!/\$|COP|USD|BRL|R\$/.test(texto));
  }
});

// ---------- datos de ejemplo ----------

function datos() {
  return {
    cuentas: [
      { id: 'cuenta-catalogo', slug: 'catalogo', nombre: 'Catálogo', activa: false },
      { id: 'c1', slug: 'norte', nombre: 'Clínica Norte', activa: true, idioma: 'pt' },
      { id: 'c2', slug: 'sur', nombre: 'Clínica Sur', activa: true, idioma: 'es' },
    ],
    casos: [{
      id: 'caso-cat', cuenta_id: 'cuenta-catalogo', nombre: 'Renal', descripcion: 'desc', especie: 'perro', activo: false,
      laboratorio: [{ titulo: 'Hemograma', filas: [] }], vitales: { fc: 90 }, origen_catalogo_id: null,
    }],
    puntos: [
      { id: 'pA', cuenta_id: 'cuenta-catalogo', especie: 'perro', vista: 'ventral', nombre: 'Hígado', x: 10, y: 20 },
      { id: 'pB', cuenta_id: 'cuenta-catalogo', especie: 'perro', vista: 'ventral', nombre: '  riñón   izq', x: 30, y: 40 },
      { id: 'pX', cuenta_id: 'c1', especie: 'perro', vista: 'ventral', nombre: 'hígado ', x: 1, y: 1 },
    ],
    caso_videos: [
      { caso_id: 'caso-cat', punto_id: 'pA', video_url: URL_VIDEO('cuenta-catalogo', 'v1'), tamano_bytes: 100 },
      { caso_id: 'caso-cat', punto_id: 'pB', video_url: URL_VIDEO('cuenta-catalogo', 'v2'), tamano_bytes: 200 },
    ],
    caso_archivos: [
      { id: 'arch-1', caso_id: 'caso-cat', tipo: 'rx', path: 'cuenta-catalogo/r1.png', url: 'https://x/r1.png', titulo: 'Rx', mime: 'image/png', tamano_bytes: 50, orden: 0 },
    ],
    catalogo_casos: [{
      id: 'cat-1', caso_origen_id: 'caso-cat', titulo: 'Caso renal', publicado: true, especie: 'perro',
      precio_cop: 1000000, precio_brl: 900, precio_usd: 250,
    }],
    adquisiciones: [{ id: 'adq-1', cuenta_id: 'c1', catalogo_id: 'cat-1', estado: 'pagada', moneda: 'BRL', precio_referencia: 900 }],
  };
}
const idsDe = () => { let n = 0; return () => 'punto-t' + (++n); };

// ---------- entrega ----------

test('entrega: crea las filas en la cuenta destino SIN tocar Storage', async () => {
  const sb = crearFalso(datos());
  const r = await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  const caso = sb.db.casos.find((c) => c.id === r.casoId);
  assert.equal(caso.cuenta_id, 'c1');
  assert.equal(caso.activo, false);
  assert.equal(caso.origen_catalogo_id, 'cat-1');
  assert.equal(caso.nombre, 'Renal');
  assert.deepEqual(caso.vitales, { fc: 90 });
  const vids = sb.db.caso_videos.filter((v) => v.caso_id === r.casoId);
  assert.equal(vids.length, 2);
  // Apuntan a los MISMOS objetos del catálogo.
  assert.deepEqual(vids.map((v) => v.video_url).sort(), [URL_VIDEO('cuenta-catalogo', 'v1'), URL_VIDEO('cuenta-catalogo', 'v2')]);
  // Hígado: reutiliza el punto existente (nombre normalizado); riñón: punto nuevo en c1 con x,y copiados.
  assert.equal(vids.find((v) => v.video_url.endsWith('v1.mp4')).punto_id, 'pX');
  const nuevoPunto = sb.db.puntos.find((p) => p.id === vids.find((v) => v.video_url.endsWith('v2.mp4')).punto_id);
  assert.equal(nuevoPunto.cuenta_id, 'c1');
  assert.deepEqual([nuevoPunto.x, nuevoPunto.y, nuevoPunto.vista, nuevoPunto.especie], [30, 40, 'ventral', 'perro']);
  const arch = sb.db.caso_archivos.filter((a) => a.caso_id === r.casoId);
  assert.equal(arch.length, 1);
  assert.equal(arch[0].path, 'cuenta-catalogo/r1.png');
  const adq = sb.db.adquisiciones.find((a) => a.id === 'adq-1');
  assert.equal(adq.estado, 'entregada');
  assert.equal(adq.caso_entregado_id, r.casoId);
  assert.deepEqual(sb.quitados, []); // nada en Storage
  // El caso origen sigue intacto.
  assert.equal(sb.db.caso_videos.filter((v) => v.caso_id === 'caso-cat').length, 2);
});

test('entrega: doble entrega (o entregar algo ya entregado) no duplica nada', async () => {
  const sb = crearFalso(datos());
  const [a, b] = await Promise.allSettled([
    entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }),
    entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }),
  ]);
  assert.equal([a, b].filter((x) => x.status === 'fulfilled').length, 1);
  const perdedor = [a, b].find((x) => x.status === 'rejected');
  assert.ok(perdedor.reason instanceof ErrorTienda);
  assert.equal(perdedor.reason.message, 'err.adqEstado');
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1').length, 1);
  await assert.rejects(entregarAdquisicion(sb, 'adq-1'), (e) => e.message === 'err.adqEstado');
  await assert.rejects(entregarAdquisicion(sb, 'no-existe'), (e) => e.message === 'err.adqNoExiste');
});

test('entrega: si falla a mitad se deshace todo y queda fallida; se puede reintentar', async () => {
  let romper = true;
  const sb = crearFalso(datos(), {
    fallar: ({ tabla, op }) => (romper && tabla === 'caso_archivos' && op === 'insert' ? { code: 'XX000', message: 'boom' } : null),
  });
  const antes = JSON.stringify(sb.db.puntos);
  await assert.rejects(entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }), (e) => e.message === 'err.entregaFallo');
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1').length, 0);
  assert.equal(sb.db.caso_videos.filter((v) => v.caso_id !== 'caso-cat').length, 0);
  assert.equal(JSON.stringify(sb.db.puntos), antes); // el punto creado se quitó
  const adq = sb.db.adquisiciones.find((a) => a.id === 'adq-1');
  assert.equal(adq.estado, 'fallida');
  assert.match(adq.nota, /Entrega fallida/);
  assert.deepEqual(sb.quitados, []);
  // Reintento desde 'fallida'.
  romper = false;
  const r = await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  assert.equal(sb.db.adquisiciones.find((a) => a.id === 'adq-1').estado, 'entregada');
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1').length, 1);
  assert.equal(sb.db.casos.find((c) => c.id === r.casoId).origen_catalogo_id, 'cat-1');
});

test('entrega: si se excede el tope de puntos falla ANTES de escribir nada', async () => {
  const sb = crearFalso(datos());
  await assert.rejects(entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe(), maxPuntos: 1 }), (e) => e.message === 'err.entregaLimitePuntos');
  assert.ok(!sb.llamadas.some((l) => l.op === 'insert' || l.op === 'delete'));
  assert.equal(sb.db.puntos.length, 3);
  const adq = sb.db.adquisiciones.find((a) => a.id === 'adq-1');
  assert.equal(adq.estado, 'fallida');
  assert.match(adq.nota, /err\.entregaLimitePuntos/);
  // Con espacio, ahora sí.
  await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe(), maxPuntos: 300 });
  assert.equal(sb.db.adquisiciones.find((a) => a.id === 'adq-1').estado, 'entregada');
});

test('entrega: una entrega atascada >10 min se reclama y limpia los restos del intento muerto', async () => {
  const d = datos();
  d.adquisiciones[0].estado = 'entregando';
  d.adquisiciones[0].actualizada_en = 1000;
  d.casos.push({ id: 'resto', cuenta_id: 'c1', nombre: 'a medias', especie: 'perro', activo: false, origen_catalogo_id: 'cat-1' });
  d.caso_videos.push({ caso_id: 'resto', punto_id: 'pX', video_url: URL_VIDEO('cuenta-catalogo', 'v1'), tamano_bytes: 1 });
  const reciente = crearFalso(structuredClone(d), { ahora: () => 1000 + 60 * 1000 });
  await assert.rejects(entregarAdquisicion(reciente, 'adq-1'), (e) => e.message === 'err.adqEstado'); // aún no está vencida
  const sb = crearFalso(d, { ahora: () => 1000 + 11 * 60 * 1000 });
  const r = await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  assert.ok(!sb.db.casos.some((c) => c.id === 'resto'));
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1').length, 1);
  assert.equal(sb.db.casos.find((c) => c.cuenta_id === 'c1').id, r.casoId);
});

test('entrega: sin la migración (función inexistente) avisa que la tienda no está habilitada', async () => {
  const sb = crearFalso(datos());
  sb.rpc = async () => ({ data: null, error: { code: 'PGRST202' } });
  await assert.rejects(entregarAdquisicion(sb, 'adq-1'), (e) => e.message === 'err.tiendaMigracion');
});

// ---------- borrado seguro ----------

test('borrado seguro: no toca objetos ajenos ni los que otro caso sigue usando', async () => {
  const d = datos();
  // c1 compró y recibió el caso: su fila apunta al objeto v1 del catálogo.
  d.casos.push({ id: 'copia', cuenta_id: 'c1', nombre: 'Renal', especie: 'perro', activo: false, origen_catalogo_id: 'cat-1' });
  d.caso_videos.push({ caso_id: 'copia', punto_id: 'pX', video_url: URL_VIDEO('cuenta-catalogo', 'v1'), tamano_bytes: 100 });
  // c1 también tiene un video propio y otro compartido entre dos de sus casos.
  d.caso_videos.push(
    { caso_id: 'copia', punto_id: 'pY', video_url: URL_VIDEO('c1', 'propio'), tamano_bytes: 1 },
    { caso_id: 'copia', punto_id: 'pZ', video_url: URL_VIDEO('c1', 'doble'), tamano_bytes: 1 },
    { caso_id: 'otro', punto_id: 'pZ', video_url: URL_VIDEO('c1', 'doble'), tamano_bytes: 1 },
  );
  const sb = crearFalso(d);

  // (a) La clínica "borra" un video que es del catálogo: prefijo ajeno, no se toca.
  assert.deepEqual(await borrarVideosSeguros(sb, 'c1', [URL_VIDEO('cuenta-catalogo', 'v1')]), []);
  // (b) El catálogo borra v1 de su caso, pero 'copia' lo sigue usando: se conserva.
  sb.db.caso_videos = sb.db.caso_videos.filter((v) => !(v.caso_id === 'caso-cat' && v.punto_id === 'pA'));
  assert.deepEqual(await borrarVideosSeguros(sb, 'cuenta-catalogo', [URL_VIDEO('cuenta-catalogo', 'v1')]), []);
  // (c) v2 ya nadie lo usa tras quitar la fila: sí se borra.
  sb.db.caso_videos = sb.db.caso_videos.filter((v) => v.video_url !== URL_VIDEO('cuenta-catalogo', 'v2'));
  assert.deepEqual(await borrarVideosSeguros(sb, 'cuenta-catalogo', [URL_VIDEO('cuenta-catalogo', 'v2')]), ['cuenta-catalogo/v2.mp4']);
  // (d) Propio y sin otras referencias: se borra; propio pero aún referenciado por otro caso: se conserva.
  sb.db.caso_videos = sb.db.caso_videos.filter((v) => !(v.video_url === URL_VIDEO('c1', 'propio')));
  assert.deepEqual(await borrarVideosSeguros(sb, 'c1', [URL_VIDEO('c1', 'propio'), URL_VIDEO('c1', 'doble')]), ['c1/propio.mp4']);
  assert.deepEqual(sb.quitados, ['videos/cuenta-catalogo/v2.mp4', 'videos/c1/propio.mp4']);
});

test('borrado seguro: recorridos de carpeta y errores de consulta conservan el objeto', async () => {
  const sb = crearFalso(datos());
  assert.deepEqual(await borrarObjetosSeguros(sb, { bucket: 'videos', cuentaId: 'c1', paths: ['c1/../cuenta-catalogo/v1.mp4', 'c2/x.mp4', '', null] }), []);
  const roto = crearFalso(datos(), { fallar: ({ tabla, op }) => (tabla === 'caso_videos' && op === 'select' ? { code: 'XX000' } : null) });
  assert.deepEqual(await borrarObjetosSeguros(roto, { bucket: 'videos', cuentaId: 'c1', paths: ['c1/libre.mp4'] }), []);
  assert.deepEqual(roto.quitados, []);
});

test('borrado seguro de exámenes: el mismo criterio por path', async () => {
  const d = datos();
  d.casos.push({ id: 'copia', cuenta_id: 'c1', origen_catalogo_id: 'cat-1', activo: false, especie: 'perro', nombre: 'x' });
  d.caso_archivos.push({ id: 'a2', caso_id: 'copia', tipo: 'rx', path: 'cuenta-catalogo/r1.png', url: 'u', mime: 'image/png', tamano_bytes: 1, orden: 0 });
  d.caso_archivos.push({ id: 'a3', caso_id: 'copia', tipo: 'lab', path: 'c1/propio.pdf', url: 'u', mime: 'application/pdf', tamano_bytes: 1, orden: 0 });
  const sb = crearFalso(d);
  assert.deepEqual(await borrarExamenesSeguros(sb, 'c1', ['cuenta-catalogo/r1.png']), []); // ajeno
  assert.deepEqual(await borrarExamenesSeguros(sb, 'cuenta-catalogo', ['cuenta-catalogo/r1.png']), []); // la copia lo usa
  sb.db.caso_archivos = sb.db.caso_archivos.filter((a) => a.id !== 'a3');
  assert.deepEqual(await borrarExamenesSeguros(sb, 'c1', ['c1/propio.pdf']), ['c1/propio.pdf']);
  // Sin la tabla (migración de exámenes sin ejecutar) no hay referencias: se puede borrar lo propio.
  const sinTabla = crearFalso(datos(), { fallar: ({ tabla }) => (tabla === 'caso_archivos' ? { code: '42P01' } : null) });
  assert.deepEqual(await borrarExamenesSeguros(sinTabla, 'c1', ['c1/x.png']), ['c1/x.png']);
});

test('catálogo: se detecta si un caso está en el catálogo (y tolera la tabla ausente)', async () => {
  const sb = crearFalso(datos());
  assert.equal(await catalogoDeCaso(sb, 'caso-cat'), 'cat-1');
  assert.equal(await catalogoDeCaso(sb, 'otro'), null);
  const sin = crearFalso(datos(), { fallar: ({ tabla }) => (tabla === 'catalogo_casos' ? { code: '42P01' } : null) });
  assert.equal(await catalogoDeCaso(sin, 'caso-cat'), null);
});

// ---------- solicitud y estados ----------

test('solicitud: moneda y precio congelados por el servidor según el idioma; sin precios en la respuesta', async () => {
  const sb = crearFalso(datos());
  const r = await crearSolicitud(sb, { cuentaId: 'c2', catalogoId: 'cat-1', userId: 'u-1' });
  const fila = sb.db.adquisiciones.find((a) => a.id === r.adquisicion.id);
  assert.equal(fila.moneda, 'COP'); // c2 es español
  assert.equal(fila.precio_referencia, 1000000);
  assert.equal(fila.estado, 'solicitada');
  assert.equal(fila.solicitada_por, 'u-1');
  assert.ok(!JSON.stringify(r).match(/precio|1000000|COP/));
  assert.ok(decodeURIComponent(r.whatsappUrl).includes('Clínica Sur'));
  assert.ok(decodeURIComponent(r.whatsappUrl).includes('Caso renal'));
  // Una cuenta en portugués congela BRL y el mensaje sale en portugués.
  const d = datos(); d.adquisiciones = [];
  const sb2 = crearFalso(d);
  const r2 = await crearSolicitud(sb2, { cuentaId: 'c1', catalogoId: 'cat-1', userId: 'u-2' });
  const f2 = sb2.db.adquisiciones.find((a) => a.id === r2.adquisicion.id);
  assert.equal(f2.moneda, 'BRL');
  assert.equal(f2.precio_referencia, 900);
  assert.ok(decodeURIComponent(r2.whatsappUrl).includes('Olá'));
});

test('solicitud: no publicado, inexistente, repetido o con una fallida pendiente', async () => {
  const d = datos(); d.adquisiciones = []; d.catalogo_casos[0].publicado = false;
  const sb = crearFalso(d);
  await assert.rejects(crearSolicitud(sb, { cuentaId: 'c1', catalogoId: 'cat-1' }), (e) => e.message === 'err.catalogoNoExiste');
  await assert.rejects(crearSolicitud(sb, { cuentaId: 'c1', catalogoId: 'nada' }), (e) => e.message === 'err.catalogoNoExiste');
  sb.db.catalogo_casos[0].publicado = true;
  await crearSolicitud(sb, { cuentaId: 'c1', catalogoId: 'cat-1' });
  await assert.rejects(crearSolicitud(sb, { cuentaId: 'c1', catalogoId: 'cat-1' }), (e) => e.message === 'err.adqYaExiste');
  sb.db.adquisiciones[0].estado = 'fallida';
  await assert.rejects(crearSolicitud(sb, { cuentaId: 'c1', catalogoId: 'cat-1' }), (e) => e.message === 'err.adqYaExiste');
  sb.db.adquisiciones[0].estado = 'cancelada'; // cancelada: se puede volver a pedir
  await crearSolicitud(sb, { cuentaId: 'c1', catalogoId: 'cat-1' });
  // Sin la migración.
  const sin = crearFalso(datos(), { fallar: ({ tabla }) => (tabla === 'catalogo_casos' ? { code: 'PGRST205' } : null) });
  await assert.rejects(crearSolicitud(sin, { cuentaId: 'c1', catalogoId: 'cat-1' }), (e) => e.message === 'err.tiendaMigracion');
});

test('estados: pagar, cancelar con nota y rechazar transiciones inválidas', async () => {
  const d = datos(); d.adquisiciones[0].estado = 'solicitada';
  const sb = crearFalso(d);
  await cambiarEstado(sb, 'adq-1', 'pagada');
  const a = sb.db.adquisiciones[0];
  assert.equal(a.estado, 'pagada');
  assert.ok(a.pagada_en);
  await assert.rejects(cambiarEstado(sb, 'adq-1', 'pagada'), (e) => e.message === 'err.adqEstado');
  await cambiarEstado(sb, 'adq-1', 'cancelada', { nota: 'No pagó' });
  assert.equal(a.estado, 'cancelada');
  assert.equal(a.nota, 'No pagó');
  await assert.rejects(cambiarEstado(sb, 'adq-1', 'pagada'), (e) => e.message === 'err.adqEstado');
  await assert.rejects(cambiarEstado(sb, 'adq-1', 'entregada'), (e) => e.message === 'err.adqEstado');
  await assert.rejects(cambiarEstado(sb, 'nada', 'pagada'), (e) => e.message === 'err.adqNoExiste');
  // Una entregada no se cancela.
  const e2 = crearFalso(datos());
  await entregarAdquisicion(e2, 'adq-1', { nuevoId: idsDe() });
  await assert.rejects(cambiarEstado(e2, 'adq-1', 'cancelada'), (e) => e.message === 'err.adqEstado');
});

test('contadores de un caso: videos, laboratorio, rx y vitales', async () => {
  const sb = crearFalso(datos());
  const c = await contadoresDeCasos(sb, ['caso-cat']);
  assert.deepEqual(c['caso-cat'], { videos: 2, laboratorio: 1, labArchivos: 0, rx: 1, vitales: true });
});

// ---------- reglas de seguridad de las acciones (revisión del código fuente) ----------

function cuerpoDe(fuente, nombre) {
  const i = fuente.indexOf('export async function ' + nombre + '(');
  assert.ok(i >= 0, nombre + ' no existe');
  const j = fuente.indexOf('\nexport async function ', i + 10);
  return fuente.slice(i, j < 0 ? undefined : j);
}

test('acciones: las de super_admin exigen requerirSuperAdmin; las de la clínica, acceso a SU cuenta', () => {
  const f = readFileSync(new URL('../src/app/actions/tienda.js', import.meta.url), 'utf8');
  const exportadas = [...f.matchAll(/^export async function (\w+)\(/gm)].map((m) => m[1]);
  const deClinica = ['listarTienda', 'solicitarCaso'];
  assert.deepEqual(exportadas.sort(), [
    'actualizarCatalogo', 'alternarPublicado', 'cancelarAdquisicion', 'despublicarCaso', 'entregarAdquisicion',
    'listarAdquisiciones', 'listarCatalogoAdmin', 'listarTienda', 'marcarPagada', 'publicarCaso', 'quitarDelCatalogo',
    'solicitarCaso',
  ].sort());
  for (const n of exportadas) {
    const c = cuerpoDe(f, n);
    if (deClinica.includes(n)) assert.match(c, /requerirAccesoCuenta\(cuentaId\)/, n);
    else if (!/return actualizarCatalogo\(/.test(c)) assert.match(c, /requerirSuperAdmin\(\)/, n);
    if (!/return actualizarCatalogo\(/.test(c)) assert.match(c, /conErrores\(/, n);
  }
  // alternarPublicado/despublicarCaso delegan en actualizarCatalogo (que sí exige super_admin).
  assert.match(cuerpoDe(f, 'actualizarCatalogo'), /requerirSuperAdmin\(\)/);
  // El cliente solo manda (cuentaId, catalogoId): ni precio, ni moneda, ni estado.
  assert.match(f, /export async function solicitarCaso\(cuentaId, catalogoId\)/);
  assert.doesNotMatch(cuerpoDe(f, 'solicitarCaso'), /precio_|moneda:/);
  // La lista de la clínica nunca pide columnas de precio.
  assert.doesNotMatch(cuerpoDe(f, 'listarTienda'), /precio_|precio[A-Z]|moneda/);
  assert.doesNotMatch(cuerpoDe(f, 'listarTienda'), /select\('\*'\)/);
});

test('admin.js: ningún borrado directo de Storage (todo pasa por el borrado seguro)', () => {
  const f = readFileSync(new URL('../src/app/actions/admin.js', import.meta.url), 'utf8');
  assert.doesNotMatch(f, /\.remove\(/);
  assert.match(f, /borrarVideosSeguros/);
  assert.match(f, /err\.cuentaCatalogo/);
  assert.match(f, /err\.casoEnCatalogo/);
  const e = readFileSync(new URL('../src/lib/entrega.js', import.meta.url), 'utf8');
  // Solo el borrado seguro llama a storage.remove.
  assert.equal([...e.matchAll(/\.remove\(/g)].length, 1);
});

// ---------- revisión: M1, M3, B2, B4, B7, B10 ----------

test('B2: una solicitud sin pago marcado NO se entrega; tras marcarla pagada sí', async () => {
  const d = datos(); d.adquisiciones[0].estado = 'solicitada';
  const sb = crearFalso(d);
  await assert.rejects(entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }), (e) => e.message === 'err.adqEstado');
  assert.equal(sb.db.adquisiciones[0].estado, 'solicitada');
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1').length, 0);
  await cambiarEstado(sb, 'adq-1', 'pagada');
  await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  assert.equal(sb.db.adquisiciones[0].estado, 'entregada');
});

test('M1: si la clínica borra el caso entregado, la compra se puede reentregar (y no antes)', async () => {
  const sb = crearFalso(datos());
  const r1 = await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  // Con el caso vivo no se reentrega.
  await assert.rejects(entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }), (e) => e.message === 'err.adqEstado');
  // La clínica borra su caso (la FK pone caso_entregado_id en null).
  await sb.from('casos').delete().eq('id', r1.casoId);
  const adq = sb.db.adquisiciones.find((a) => a.id === 'adq-1');
  assert.equal(adq.estado, 'entregada');
  assert.equal(adq.caso_entregado_id, null);
  const r2 = await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  assert.notEqual(r2.casoId, r1.casoId);
  assert.equal(adq.caso_entregado_id, r2.casoId);
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1' && c.origen_catalogo_id === 'cat-1').length, 1);
  assert.equal(sb.db.adquisiciones.filter((a) => a.cuenta_id === 'c1').length, 1); // sigue una sola compra
  // Una entregada sin caso tampoco se cancela desde las acciones.
  await sb.from('casos').delete().eq('id', r2.casoId);
  await assert.rejects(cambiarEstado(sb, 'adq-1', 'cancelada'), (e) => e.message === 'err.adqEstado');
});

test('M1: la reentrega que falla deja la compra fallida y se puede reintentar', async () => {
  let romper = false;
  const sb = crearFalso(datos(), {
    fallar: ({ tabla, op }) => (romper && tabla === 'caso_archivos' && op === 'insert' ? { code: 'XX000', message: 'boom' } : null),
  });
  const r1 = await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  await sb.from('casos').delete().eq('id', r1.casoId);
  romper = true;
  await assert.rejects(entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }), (e) => e.message === 'err.entregaFallo');
  assert.equal(sb.db.adquisiciones[0].estado, 'fallida');
  romper = false;
  await entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() });
  assert.equal(sb.db.adquisiciones[0].estado, 'entregada');
  assert.ok(sb.db.adquisiciones[0].caso_entregado_id);
});

test('B10: la cuenta técnica del catálogo no puede solicitar casos', async () => {
  const d = datos(); d.adquisiciones = [];
  const sb = crearFalso(d);
  await assert.rejects(crearSolicitud(sb, { cuentaId: CUENTA_CATALOGO_ID, catalogoId: 'cat-1' }), (e) => e.message === 'err.noAutorizado');
  assert.equal(sb.db.adquisiciones.length, 0);
  const f = readFileSync(new URL('../src/app/actions/tienda.js', import.meta.url), 'utf8');
  assert.match(cuerpoDe(f, 'solicitarCaso'), /cuentaId === CUENTA_CATALOGO_ID/);
});

test('B7: la clínica ve también los despublicados que ya pidió (sin poder solicitarlos) y nunca precios', async () => {
  const d = datos();
  d.catalogo_casos[0].publicado = false; // despublicado, con adquisición 'pagada' de c1
  d.casos.push({ id: 'caso-cat2', cuenta_id: 'cuenta-catalogo', nombre: 'Otro', descripcion: '', especie: 'gato', activo: false });
  d.catalogo_casos.push({ id: 'cat-2', caso_origen_id: 'caso-cat2', titulo: 'Oculto', publicado: false, especie: 'gato', precio_cop: 5 });
  d.catalogo_casos.push({ id: 'cat-3', caso_origen_id: 'caso-cat2', titulo: 'Visible', publicado: true, especie: 'gato', precio_cop: 7 });
  const sb = crearFalso(d);
  const c1 = await leerTiendaDeCuenta(sb, 'c1');
  assert.deepEqual(c1.items.map((i) => i.id).sort(), ['cat-1', 'cat-3']);
  const viejo = c1.items.find((i) => i.id === 'cat-1');
  assert.equal(viejo.disponible, false);
  assert.equal(viejo.adquisicion.estado, 'pagada');
  assert.equal(c1.items.find((i) => i.id === 'cat-3').disponible, true);
  assert.ok(!/precio|moneda|1000000|"publicado"/i.test(JSON.stringify(c1)));
  // Una cuenta sin adquisición solo ve lo publicado; una cancelada tampoco cuenta.
  const c2 = await leerTiendaDeCuenta(sb, 'c2');
  assert.deepEqual(c2.items.map((i) => i.id), ['cat-3']);
  sb.db.adquisiciones[0].estado = 'cancelada';
  assert.deepEqual((await leerTiendaDeCuenta(sb, 'c1')).items.map((i) => i.id), ['cat-3']);
  // Fallida sí se ve; sin la migración, tienda no disponible.
  sb.db.adquisiciones[0].estado = 'fallida';
  assert.equal((await leerTiendaDeCuenta(sb, 'c1')).items.find((i) => i.id === 'cat-1').adquisicion.estado, 'fallida');
  const sin = crearFalso(datos(), { fallar: ({ tabla }) => (tabla === 'catalogo_casos' ? { code: 'PGRST205' } : null) });
  assert.deepEqual(await leerTiendaDeCuenta(sin, 'c1'), { tiendaDisponible: false, items: [] });
});

test('M3 / B1: la cuenta catálogo se localiza por id; el slug está reservado y siempre queda inactiva', () => {
  const t = readFileSync(new URL('../src/app/actions/tienda.js', import.meta.url), 'utf8');
  assert.match(t, /\.eq\('id', CUENTA_CATALOGO_ID\)/);
  assert.doesNotMatch(t, /\.eq\('slug'/);
  const a = readFileSync(new URL('../src/app/actions/admin.js', import.meta.url), 'utf8');
  assert.match(cuerpoDe(a, 'crearCuenta'), /slugLimpio === SLUG_CATALOGO\) throw new ErrorAdmin\('err\.slugReservado'\)/);
  assert.match(cuerpoDe(a, 'actualizarCuenta'), /cuentaId === CUENTA_CATALOGO_ID \? false : !!activa/);
  assert.match(cuerpoDe(a, 'eliminarCuenta'), /cuenta\.id === CUENTA_CATALOGO_ID/);
  // La migración y el estado final de schema.sql abortan si el slug ya lo usa otra cuenta, ANTES del insert.
  for (const f of ['../supabase/migracion-2026-11-25-tienda.sql', '../supabase/schema.sql']) {
    const sql = readFileSync(new URL(f, import.meta.url), 'utf8');
    const iBloque = sql.indexOf("slug = 'catalogo' and id <> 'cuenta-catalogo'");
    const iInsert = sql.indexOf("values ('cuenta-catalogo'");
    assert.ok(iBloque > 0 && iBloque < iInsert, f);
    assert.match(sql, /raise exception/);
    // reclamar_entrega: ya no acepta 'solicitada'; sí la entregada sin caso.
    const rec = sql.slice(sql.indexOf('create or replace function reclamar_entrega'));
    assert.doesNotMatch(rec.slice(0, rec.indexOf('$$;', 100)), /'solicitada'/, f);
    assert.match(rec, /a\.estado = 'entregada' and a\.caso_entregado_id is null/, f);
  }
});

test('B4: la compensación no borra un punto que otro video ya usa; la limpieza de restos quita los puntos huérfanos', async () => {
  // Compensación: entre crear el punto y fallar, otro caso de la clínica pasa a usarlo.
  let sb;
  sb = crearFalso(datos(), {
    fallar: ({ tabla, op }) => {
      if (tabla === 'caso_archivos' && op === 'insert') {
        sb.db.casos.push({ id: 'otro', cuenta_id: 'c1', nombre: 'Otro', especie: 'perro', activo: false, origen_catalogo_id: null });
        sb.db.caso_videos.push({ caso_id: 'otro', punto_id: 'punto-t1', video_url: URL_VIDEO('c1', 'z'), tamano_bytes: 1 });
        return { code: 'XX000', message: 'boom' };
      }
      return null;
    },
  });
  await assert.rejects(entregarAdquisicion(sb, 'adq-1', { nuevoId: idsDe() }), (e) => e.message === 'err.entregaFallo');
  assert.ok(sb.db.puntos.some((p) => p.id === 'punto-t1'), 'el punto en uso se conserva');
  assert.ok(sb.db.caso_videos.some((v) => v.caso_id === 'otro' && v.punto_id === 'punto-t1'));
  assert.equal(sb.db.casos.filter((c) => c.cuenta_id === 'c1' && c.origen_catalogo_id === 'cat-1').length, 0);

  // Restos de un intento muerto: sus puntos sin uso (y que coinciden con el caso) se quitan; los usados o ajenos, no.
  const d = datos();
  d.adquisiciones[0].estado = 'entregando'; d.adquisiciones[0].actualizada_en = 1000;
  d.puntos.push(
    { id: 'pR', cuenta_id: 'c1', especie: 'perro', vista: 'ventral', nombre: 'Riñón izq', x: 3, y: 3 }, // huérfano tras quitar el resto
    { id: 'pZ', cuenta_id: 'c1', especie: 'perro', vista: 'ventral', nombre: 'Otro punto', x: 4, y: 4 }, // no es de este caso
  );
  d.casos.push({ id: 'resto', cuenta_id: 'c1', nombre: 'a medias', especie: 'perro', activo: false, origen_catalogo_id: 'cat-1' });
  d.casos.push({ id: 'propio', cuenta_id: 'c1', nombre: 'mío', especie: 'perro', activo: false, origen_catalogo_id: null });
  d.caso_videos.push(
    { caso_id: 'resto', punto_id: 'pR', video_url: URL_VIDEO('cuenta-catalogo', 'v2'), tamano_bytes: 1 },
    { caso_id: 'resto', punto_id: 'pX', video_url: URL_VIDEO('cuenta-catalogo', 'v1'), tamano_bytes: 1 },
    { caso_id: 'resto', punto_id: 'pZ', video_url: URL_VIDEO('cuenta-catalogo', 'v1'), tamano_bytes: 1 },
    { caso_id: 'propio', punto_id: 'pX', video_url: URL_VIDEO('c1', 'mio'), tamano_bytes: 1 },
  );
  const sb2 = crearFalso(d, { ahora: () => 1000 + 11 * 60 * 1000 });
  await entregarAdquisicion(sb2, 'adq-1', { nuevoId: idsDe() });
  assert.ok(!sb2.db.casos.some((c) => c.id === 'resto'));
  assert.ok(!sb2.db.puntos.some((p) => p.id === 'pR'), 'el punto huérfano del intento muerto se quitó');
  assert.ok(sb2.db.puntos.some((p) => p.id === 'pX'), 'el punto que usa otro caso se conserva');
  assert.ok(sb2.db.puntos.some((p) => p.id === 'pZ'), 'un punto que no es de este caso no se toca');
  assert.ok(sb2.db.caso_videos.some((v) => v.caso_id === 'propio' && v.punto_id === 'pX'));
});
