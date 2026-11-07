// ============================================================
// Prueba de carga: simula N estudiantes abriendo la MISMA cuenta a la vez
// (lo que pasa al empezar una clase o al escanear el QR en una charla).
//
// Cada estudiante virtual hace lo mismo que el navegador real:
//   1. (si se da --sitio) pide la página /c/<slug> (sale de la caché del CDN
//      con los datos de la cuenta: el navegador ya no los pide aparte)
//   2. casos_activos_v2 (el menú)
//   3. datos_caso_v2 del primer caso (abrir el caso)
//   4. casos_activos_v2 cada 15 s (el sondeo) hasta que acaba la prueba
// NO descarga videos (eso lo sirve el CDN de Supabase, que escala solo, y
// gastaría transferencia del plan).
//
// Uso (desde web/):
//   npm run prueba-carga -- --slug prueba2 --estudiantes 300 --segundos 90
//   npm run prueba-carga -- --slug prueba2 --sitio https://<vista-previa>.vercel.app
//
// Si la cuenta tiene código de acceso, el token se lee con la clave
// service_role de .env.local (como si todos hubieran escrito el código).
// Pega contra la base REAL: úsala con moderación y fuera de horas de clase.
// ============================================================
import { createClient } from '@supabase/supabase-js';

const args = process.argv.slice(2);
const opcion = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const SLUG = opcion('--slug', 'prueba2');
const N = Number(opcion('--estudiantes', 100));
const SEGUNDOS = Number(opcion('--segundos', 60));
const SITIO = opcion('--sitio', null);
const SONDEO_MS = 15000;
// Llegan escalonados en los primeros 20 s (como al escanear un QR).
const LLEGADA_MS = Number(opcion('--llegada', 20)) * 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon) { console.error('Faltan las variables de Supabase (usa: npm run prueba-carga).'); process.exit(1); }

const tiempos = {}; // operación -> [ms]
const errores = {}; // operación -> n
function anotar(op, ms, ok) {
  (tiempos[op] ||= []).push(ms);
  if (!ok) errores[op] = (errores[op] || 0) + 1;
}
async function medir(op, fn) {
  const t0 = performance.now();
  try {
    const r = await fn();
    const ok = !r?.error && (r?.ok ?? true);
    anotar(op, performance.now() - t0, ok);
    return r;
  } catch {
    anotar(op, performance.now() - t0, false);
    return null;
  }
}
const pct = (arr, p) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 0; };

async function tokenDeLaCuenta(cuentaId) {
  if (!servicio) return null;
  const admin = createClient(url, servicio, { auth: { persistSession: false } });
  const { data } = await admin.from('cuentas').select('token_acceso').eq('id', cuentaId).maybeSingle();
  return data?.token_acceso || null;
}

async function estudiante(i, fin, token, cuentaId) {
  await new Promise((r) => setTimeout(r, (i / N) * LLEGADA_MS));
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  if (SITIO) await medir('pagina', () => fetch(SITIO + '/c/' + SLUG).then((r) => ({ ok: r.ok, txt: r.text() })));
  const menu = await medir('menu', () => sb.rpc('casos_activos_v2', { p_cuenta_id: cuentaId, p_token: token }));
  const caso = menu?.data?.[0];
  if (caso) await medir('abrir-caso', () => sb.rpc('datos_caso_v2', { p_cuenta_id: cuentaId, p_caso_id: caso.id, p_token: token }));
  while (Date.now() + SONDEO_MS < fin) {
    await new Promise((r) => setTimeout(r, SONDEO_MS));
    await medir('sondeo', () => sb.rpc('casos_activos_v2', { p_cuenta_id: cuentaId, p_token: token }));
  }
}

async function main() {
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('cuenta_por_slug_v2', { p_slug: SLUG });
  if (error || !data?.[0]) { console.error('No existe la cuenta', SLUG, error?.message || ''); process.exit(1); }
  const cuenta = data[0];
  const token = cuenta.requiere_codigo ? await tokenDeLaCuenta(cuenta.id) : null;
  if (cuenta.requiere_codigo && !token) { console.error('La cuenta pide código y no hay clave service_role para leer su token.'); process.exit(1); }

  console.log(`Prueba de carga: ${N} estudiantes en «${SLUG}» durante ${SEGUNDOS} s` + (SITIO ? ` (+ página en ${SITIO})` : '') + '…');
  const inicio = Date.now();
  const fin = inicio + SEGUNDOS * 1000;
  await Promise.all(Array.from({ length: N }, (_, i) => estudiante(i, fin, token, cuenta.id)));
  const dur = (Date.now() - inicio) / 1000;

  let total = 0; let fallos = 0;
  console.log('\nOperación     peticiones  errores   p50     p95     máx');
  for (const [op, arr] of Object.entries(tiempos)) {
    total += arr.length; fallos += errores[op] || 0;
    console.log(`${op.padEnd(13)} ${String(arr.length).padStart(10)} ${String(errores[op] || 0).padStart(8)} ${pct(arr, 0.5).toFixed(0).padStart(6)}ms ${pct(arr, 0.95).toFixed(0).padStart(6)}ms ${Math.max(...arr).toFixed(0).padStart(6)}ms`);
  }
  console.log(`\n${total} peticiones en ${dur.toFixed(0)} s (${(total / dur).toFixed(1)}/s), ${fallos} con error (${((fallos / total) * 100).toFixed(2)} %).`);
  process.exit(fallos / total > 0.01 ? 1 : 0);
}

main();
