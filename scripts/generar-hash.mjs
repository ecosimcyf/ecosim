// ============================================================
// Utilidad de línea de comandos.
//
//   node scripts/generar-hash.mjs "mi-contraseña"
//     -> imprime el hash bcrypt para poner en ADMIN_PASSWORD_HASH
//
//   node scripts/generar-hash.mjs --secreto
//     -> imprime una cadena aleatoria para poner en ADMIN_SESSION_SECRET
// ============================================================

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';

const arg = process.argv[2];

if (arg === '--secreto') {
  console.log(crypto.randomBytes(32).toString('hex'));
  process.exit(0);
}

if (!arg) {
  console.error('Uso:');
  console.error('  node scripts/generar-hash.mjs "tu-contraseña"   (hash de la contraseña)');
  console.error('  node scripts/generar-hash.mjs --secreto          (secreto de la cookie)');
  process.exit(1);
}

// Devolvemos el hash en base64 para que sea seguro pegarlo en .env.local
// (los signos "$" del hash bcrypt se rompen al leer un .env con Next.js).
const hash = bcrypt.hashSync(arg, 10);
console.log(Buffer.from(hash, 'utf8').toString('base64'));
