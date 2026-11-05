// ============================================================
// Respaldo COMPLETO de EcoSim web: base de datos + archivos de Storage
// (videos y exámenes). Los backups de Supabase solo cubren la base —y en
// el plan gratis ni eso—; los videos NO tenían copia en ningún lado.
//
// Uso (desde la carpeta web/):
//   npm run respaldo                         -> respaldo completo
//   npm run respaldo -- --sin-archivos       -> solo la base (rápido)
//   npm run respaldo -- --destino D:\Respaldos\EcoSim
//
// Qué deja en la carpeta destino (por defecto web/respaldos/, que git ignora):
//   base/AAAA-MM-DD_HH-MM/<tabla>.json   una foto de cada tabla en ese momento
//   base/AAAA-MM-DD_HH-MM/usuarios.json  admins (id, correo; SIN contraseñas)
//   archivos/videos/...                  copia espejo de los buckets: solo se
//   archivos/examenes/...                descarga lo nuevo o lo que cambió
//
// Solo LEE de Supabase (nunca escribe ni borra nada allí). Usa la clave
// service_role de .env.local: el respaldo contiene datos de todos los
// clientes; guárdalo en un lugar privado (disco externo, Drive personal).
//
// Cómo restaurar: ver docs/respaldo-y-restauracion.md.
// ============================================================
import { createClient } from '@supabase/supabase-js';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLAS = [
  'cuentas', 'perfiles', 'casos', 'puntos', 'caso_videos', 'caso_archivos',
  'config', 'solicitudes_contacto',
];
const BUCKETS = ['videos', 'examenes'];
const POR_PAGINA = 1000;

const args = process.argv.slice(2);
const opcion = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const SIN_ARCHIVOS = args.includes('--sin-archivos');
const raiz = dirname(dirname(fileURLToPath(import.meta.url)));
const DESTINO = resolve(opcion('--destino') || join(raiz, 'respaldos'));

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const clave = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !clave) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa: npm run respaldo).');
  process.exit(1);
}
const supabase = createClient(url, clave, { auth: { persistSession: false } });

const ahora = new Date();
const sello = ahora.toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
const mb = (b) => (b / 1024 / 1024).toFixed(1) + ' MB';

async function respaldarTabla(dir, tabla) {
  const filas = [];
  for (let desde = 0; ; desde += POR_PAGINA) {
    const { data, error } = await supabase.from(tabla).select('*').range(desde, desde + POR_PAGINA - 1);
    if (error) {
      // Tabla de una migración que aún no se ejecutó: se anota y se sigue.
      console.warn(`  ! ${tabla}: ${error.message}`);
      return 0;
    }
    filas.push(...data);
    if (data.length < POR_PAGINA) break;
  }
  await writeFile(join(dir, tabla + '.json'), JSON.stringify(filas, null, 1));
  return filas.length;
}

async function respaldarUsuarios(dir) {
  const usuarios = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    usuarios.push(...data.users.map((u) => ({ id: u.id, email: u.email, creado: u.created_at })));
    if (data.users.length < 1000) break;
  }
  await writeFile(join(dir, 'usuarios.json'), JSON.stringify(usuarios, null, 1));
  return usuarios.length;
}

// Lista todos los archivos de un bucket (las carpetas son las cuentas).
async function listarBucket(bucket, prefijo = '') {
  const archivos = [];
  for (let offset = 0; ; offset += POR_PAGINA) {
    const { data, error } = await supabase.storage.from(bucket).list(prefijo, { limit: POR_PAGINA, offset });
    if (error) throw error;
    for (const item of data) {
      const ruta = prefijo ? prefijo + '/' + item.name : item.name;
      if (item.id === null) archivos.push(...await listarBucket(bucket, ruta)); // carpeta
      else archivos.push({ ruta, tamano: item.metadata?.size ?? null });
    }
    if (data.length < POR_PAGINA) break;
  }
  return archivos;
}

async function tamanoLocal(ruta) {
  try { return (await stat(ruta)).size; } catch { return null; }
}

async function respaldarBucket(bucket) {
  const archivos = await listarBucket(bucket);
  let nuevos = 0; let bytes = 0; let fallos = 0;
  for (const a of archivos) {
    const local = join(DESTINO, 'archivos', bucket, ...a.ruta.split('/'));
    if (a.tamano != null && (await tamanoLocal(local)) === a.tamano) continue; // ya está
    const { data, error } = await supabase.storage.from(bucket).download(a.ruta);
    if (error) { fallos++; console.warn(`  ! ${bucket}/${a.ruta}: ${error.message}`); continue; }
    const buf = Buffer.from(await data.arrayBuffer());
    await mkdir(dirname(local), { recursive: true });
    await writeFile(local, buf);
    nuevos++; bytes += buf.length;
  }
  const total = archivos.reduce((s, a) => s + (a.tamano || 0), 0);
  console.log(`  ${bucket}: ${archivos.length} archivos (${mb(total)}), ${nuevos} descargados ahora (${mb(bytes)})` + (fallos ? `, ${fallos} con error` : ''));
  return fallos;
}

async function main() {
  console.log('Respaldo de EcoSim →', DESTINO);
  const dirBase = join(DESTINO, 'base', sello);
  await mkdir(dirBase, { recursive: true });

  console.log('Base de datos:');
  for (const t of TABLAS) console.log(`  ${t}: ${await respaldarTabla(dirBase, t)} filas`);
  console.log(`  usuarios (admins): ${await respaldarUsuarios(dirBase)}`);
  await writeFile(join(dirBase, 'LEEME.txt'),
    `Respaldo de EcoSim del ${ahora.toLocaleString('es-CO')}.\nRestaurar: ver docs/respaldo-y-restauracion.md en el repositorio.\n`);

  let fallos = 0;
  if (SIN_ARCHIVOS) console.log('Archivos: omitidos (--sin-archivos).');
  else {
    console.log('Archivos de Storage:');
    for (const b of BUCKETS) fallos += await respaldarBucket(b);
  }
  console.log(fallos ? `Terminado con ${fallos} archivo(s) sin copiar: vuelve a ejecutarlo.` : 'Respaldo terminado.');
  process.exit(fallos ? 1 : 0);
}

main().catch((err) => { console.error('El respaldo falló:', err?.message || err); process.exit(1); });
