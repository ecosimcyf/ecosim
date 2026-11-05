// ============================================================
// Restaura un respaldo hecho con `npm run respaldo` (ver
// docs/respaldo-y-restauracion.md). Por defecto NO cambia nada: solo
// cuenta lo que haría. Para hacerlo de verdad hay que añadir --confirmar.
//
//   npm run restaurar -- --base respaldos/base/2026-11-05_14-30          (simulación)
//   npm run restaurar -- --base respaldos/base/2026-11-05_14-30 --confirmar
//   npm run restaurar -- --solo-archivos --confirmar   (solo videos/exámenes)
//
// Qué hace:
//   · Archivos: sube a Storage los de respaldos/archivos/ que FALTEN (no
//     pisa ninguno que ya exista).
//   · Base: inserta o actualiza ("upsert") las filas de cada tabla, en
//     orden (cuentas antes que sus casos…). No borra nada. Los perfiles de
//     admin solo se restauran si su usuario de Auth existe (las contraseñas
//     no se respaldan: si el usuario se perdió, se crea otra vez y se
//     restablece la contraseña desde el panel).
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const CONFIRMAR = args.includes('--confirmar');
const SOLO_ARCHIVOS = args.includes('--solo-archivos');
const SOLO_BASE = args.includes('--solo-base');
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const DESTINO = resolve(opcion('--destino') || join(raiz, 'respaldos'));
const BASE = opcion('--base') ? resolve(opcion('--base')) : null;

// Orden: primero lo que otras tablas referencian.
const ORDEN = [
  ['cuentas', 'id'], ['puntos', 'id'], ['casos', 'id'], ['caso_videos', 'caso_id,punto_id'],
  ['caso_archivos', 'id'], ['config', 'id'], ['solicitudes_contacto', null], ['perfiles', 'id'],
];
const BUCKETS = ['videos', 'examenes'];
const TIPOS = { mp4: 'video/mp4', webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) { console.error('Faltan las variables de Supabase (usa: npm run restaurar).'); process.exit(1); }
const supabase = createClient(url, clave, { auth: { persistSession: false } });

async function archivosLocales(dir) {
  const r = [];
  let items = [];
  try { items = await readdir(dir, { withFileTypes: true }); } catch { return r; }
  for (const it of items) {
    const p = join(dir, it.name);
    if (it.isDirectory()) r.push(...await archivosLocales(p));
    else r.push(p);
  }
  return r;
}

async function existeEnStorage(bucket, ruta) {
  const carpeta = ruta.includes('/') ? ruta.slice(0, ruta.lastIndexOf('/')) : '';
  const nombre = ruta.slice(ruta.lastIndexOf('/') + 1);
  const { data } = await supabase.storage.from(bucket).list(carpeta, { search: nombre, limit: 10 });
  return (data || []).some((f) => f.name === nombre);
}

async function restaurarArchivos() {
  for (const bucket of BUCKETS) {
    const dir = join(DESTINO, 'archivos', bucket);
    const locales = await archivosLocales(dir);
    let faltan = 0; let subidos = 0;
    for (const local of locales) {
      const ruta = relative(dir, local).split(sep).join('/');
      if (await existeEnStorage(bucket, ruta)) continue;
      faltan++;
      if (!CONFIRMAR) continue;
      const ext = ruta.split('.').pop().toLowerCase();
      const { error } = await supabase.storage.from(bucket).upload(ruta, await readFile(local), {
        contentType: TIPOS[ext] || 'application/octet-stream', cacheControl: '31536000', upsert: false,
      });
      if (error) console.warn(`  ! ${bucket}/${ruta}: ${error.message}`);
      else subidos++;
    }
    console.log(`  ${bucket}: ${locales.length} en el respaldo, ${faltan} faltan en Storage` + (CONFIRMAR ? `, ${subidos} subidos` : ''));
  }
}

async function restaurarBase() {
  if (!BASE) { console.error('Indica qué foto de la base restaurar: --base respaldos/base/<fecha>'); process.exit(1); }
  const { data: lista } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const usuarios = new Set((lista?.users || []).map((u) => u.id));
  for (const [tabla, clavePrimaria] of ORDEN) {
    let filas;
    try { filas = JSON.parse(await readFile(join(BASE, tabla + '.json'), 'utf8')); } catch { console.log(`  ${tabla}: no está en el respaldo`); continue; }
    if (tabla === 'perfiles') {
      const sinUsuario = filas.filter((f) => !usuarios.has(f.id)).length;
      filas = filas.filter((f) => usuarios.has(f.id));
      if (sinUsuario) console.log(`  perfiles: ${sinUsuario} sin usuario de Auth (crear de nuevo desde el panel)`);
    }
    if (tabla === 'solicitudes_contacto') {
      // Su id lo genera la base (no se puede escribir): se insertan sin id
      // solo las que no estén ya (mismo correo y misma fecha).
      const { data: hay } = await supabase.from(tabla).select('correo,creada_en');
      const ya = new Set((hay || []).map((f) => f.correo + '|' + new Date(f.creada_en).getTime()));
      filas = filas.filter((f) => !ya.has(f.correo + '|' + new Date(f.creada_en).getTime()))
        .map(({ id: _id, ...resto }) => resto);
      if (CONFIRMAR && filas.length) {
        const { error } = await supabase.from(tabla).insert(filas);
        if (error) console.error(`  ! ${tabla}: ${error.message}`);
      }
      console.log(`  ${tabla}: ${filas.length} filas que faltan ${CONFIRMAR ? 'restauradas' : 'se restaurarían'}`);
      continue;
    }
    if (CONFIRMAR) {
      for (let i = 0; i < filas.length; i += 500) {
        const { error } = await supabase.from(tabla).upsert(filas.slice(i, i + 500), { onConflict: clavePrimaria });
        if (error) { console.error(`  ! ${tabla}: ${error.message}`); break; }
      }
    }
    console.log(`  ${tabla}: ${filas.length} filas ${CONFIRMAR ? 'restauradas' : 'se restaurarían'}`);
  }
}

async function main() {
  console.log(CONFIRMAR ? 'RESTAURANDO de verdad en ' + url : 'SIMULACIÓN (no se cambia nada; añade --confirmar para hacerlo).');
  if (!SOLO_ARCHIVOS) { console.log('Base de datos:'); await restaurarBase(); }
  if (!SOLO_BASE) { console.log('Archivos:'); await restaurarArchivos(); }
  console.log('Listo.');
}

main().catch((err) => { console.error('La restauración falló:', err?.message || err); process.exit(1); });
