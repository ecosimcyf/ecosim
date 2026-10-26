// ============================================================
// Crea el primer super_admin: un usuario de Supabase Auth + su fila en
// "perfiles" con rol='super_admin' (cuenta_id null, porque un super_admin
// no pertenece a ninguna cuenta de cliente).
//
// Uso:
//   node scripts/crear-super-admin.mjs correo@dominio.com "contraseña"
//
// Lee NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY de .env.local
// (lo parseamos a mano: no asumimos Node >=20.6 con --env-file).
// ============================================================
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..');

// ---------- leer .env.local a mano (líneas CLAVE=valor) ----------

function leerEnvLocal(ruta) {
  const env = {};
  if (!existsSync(ruta)) return env;
  const texto = readFileSync(ruta, 'utf8');
  for (const linea of texto.split('\n')) {
    const l = linea.trim();
    if (!l || l.startsWith('#')) continue;
    const i = l.indexOf('=');
    if (i === -1) continue;
    const clave = l.slice(0, i).trim();
    let valor = l.slice(i + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (clave) env[clave] = valor;
  }
  return env;
}

const envArchivo = leerEnvLocal(join(raiz, '.env.local'));
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || envArchivo.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || envArchivo.SUPABASE_SERVICE_ROLE_KEY;

const [correo, contrasena] = process.argv.slice(2);

if (!correo || !contrasena) {
  console.error('Uso:');
  console.error('  node scripts/crear-super-admin.mjs <correo> <contraseña>');
  process.exit(1);
}

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('[crear-super-admin] Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY.');
  console.error('Defínelas en .env.local (en la raíz de web/) o como variables de entorno.');
  process.exit(1);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  const { data, error } = await supabase.auth.admin.createUser({
    email: correo,
    password: contrasena,
    email_confirm: true,
  });
  if (error) {
    console.error('[crear-super-admin] No se pudo crear el usuario en Auth:', error.message);
    process.exitCode = 1;
    return;
  }

  const { error: errorPerfil } = await supabase
    .from('perfiles')
    .insert({ id: data.user.id, rol: 'super_admin', cuenta_id: null });
  if (errorPerfil) {
    console.error('[crear-super-admin] El usuario se creó en Auth, pero falló su perfil:', errorPerfil.message);
    console.error('[crear-super-admin] Revisa a mano la tabla "perfiles" para el usuario', data.user.id);
    process.exitCode = 1;
    return;
  }

  console.log(`[crear-super-admin] Listo: ${correo} (id ${data.user.id}) creado con rol super_admin.`);
}

main().catch((e) => {
  console.error('[crear-super-admin] Error inesperado:', e?.message || e);
  process.exitCode = 1;
});
