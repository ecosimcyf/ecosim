// ============================================================
// Prueba de humo: después de cada despliegue (o en la vista previa de un
// PR), comprueba en segundos que las páginas clave responden bien.
//
//   npm run humo -- https://ecosim-eta.vercel.app
//   npm run humo -- https://<vista-previa>.vercel.app cyf     (2º argumento: slug a probar)
//
// No inicia sesión ni cambia nada. Sale con error si algo falla, así sirve
// también en un flujo automático.
// ============================================================
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const slug = process.argv[3] || null;

const pruebas = [
  { ruta: '/', estado: 200, contiene: 'ECOSIM', cache: true },
  { ruta: '/', estado: 200, contiene: 'lang="pt-BR"', idioma: 'pt-BR' },
  { ruta: '/en', estado: 200, contiene: 'lang="en-US"', cache: true },
  { ruta: '/guia', estado: 200, cache: true },
  { ruta: '/terminos', estado: 200 },
  { ruta: '/privacidad', estado: 200 },
  { ruta: '/robots.txt', estado: 200, contiene: 'Disallow: /admin' },
  { ruta: '/sitemap.xml', estado: 200, contiene: '/pt/guia' },
  { ruta: '/admin/login', estado: 200 },
  { ruta: '/admin', estado: 200, terminaEn: '/admin/login' },
  { ruta: '/api/salud', estado: 200, contiene: '"ok":true' },
  { ruta: '/no-existe-' + Date.now(), estado: 404 },
  { ruta: '/c/no-existe-' + Date.now(), estado: 404 },
  { ruta: '/maniquies/perro-ventral.webp', estado: 200, cabecera: ['cache-control', 'max-age=604800'] },
  ...(slug ? [{ ruta: '/c/' + slug, estado: 200, contiene: 'ECOSIM' }] : []),
];

let fallos = 0;
for (const p of pruebas) {
  const t0 = performance.now();
  let problema = null;
  try {
    const r = await fetch(base + p.ruta, { headers: p.idioma ? { 'Accept-Language': p.idioma } : {}, redirect: 'follow' });
    const texto = await r.text();
    if (r.status !== p.estado) problema = `estado ${r.status} (esperado ${p.estado})`;
    else if (p.contiene && !texto.includes(p.contiene)) problema = `no contiene «${p.contiene}»`;
    else if (p.terminaEn && !new URL(r.url).pathname.endsWith(p.terminaEn)) problema = `terminó en ${r.url}`;
    else if (p.cabecera && !(r.headers.get(p.cabecera[0]) || '').includes(p.cabecera[1])) problema = `${p.cabecera[0]}: ${r.headers.get(p.cabecera[0])}`;
    else if (p.cache && /no-store/.test(r.headers.get('cache-control') || '')) problema = 'no se guarda en caché (no-store)';
  } catch (err) {
    problema = err.message;
  }
  const ms = (performance.now() - t0).toFixed(0).padStart(5);
  console.log(`${problema ? '✗' : '✓'} ${ms} ms  ${p.ruta}${p.idioma ? ' [' + p.idioma + ']' : ''}${problema ? '  → ' + problema : ''}`);
  if (problema) fallos++;
}
console.log(fallos ? `\n${fallos} prueba(s) fallaron en ${base}` : `\nTodo bien en ${base}`);
process.exit(fallos ? 1 : 0);
