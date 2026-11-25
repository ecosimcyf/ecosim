// Supabase FALSO en memoria para las pruebas de la tienda (no es un test:
// el nombre empieza con "_" y no termina en .test.mjs). Soporta justo lo que
// usan src/lib/entrega.js y src/lib/tienda.js: select/insert/update/delete con
// eq, neq, in, is, not, like, order, range, limit, single, maybeSingle, conteo
// con head, cascadas básicas, unicidad de la tienda y la función
// reclamar_entrega (copia de la lógica del SQL).
export function crearFalso(inicial = {}, { fallar, ahora = () => Date.now() } = {}) {
  const db = {};
  for (const [t, filas] of Object.entries(inicial)) db[t] = filas.map((f) => ({ ...f }));
  const tabla = (t) => (db[t] ||= []);
  const quitados = [];
  const llamadas = [];
  let seq = 0;
  const PREFIJO_ID = { casos: 'caso-', puntos: 'punto-', adquisiciones: 'adq-', caso_archivos: 'arch-' };

  const VIVOS = ['solicitada', 'pagada', 'entregando', 'entregada'];
  function violaUnico(t, fila, excepto) {
    const otras = tabla(t).filter((r) => r !== excepto);
    if (t === 'casos' && fila.origen_catalogo_id != null) {
      return otras.some((r) => r.cuenta_id === fila.cuenta_id && r.origen_catalogo_id === fila.origen_catalogo_id);
    }
    if (t === 'adquisiciones' && VIVOS.includes(fila.estado)) {
      return otras.some((r) => r.cuenta_id === fila.cuenta_id && r.catalogo_id === fila.catalogo_id && VIVOS.includes(r.estado));
    }
    if (t === 'caso_videos') return otras.some((r) => r.caso_id === fila.caso_id && r.punto_id === fila.punto_id);
    return false;
  }

  function borrarFila(t, fila) {
    db[t] = tabla(t).filter((r) => r !== fila);
    if (t === 'casos') {
      db.caso_videos = tabla('caso_videos').filter((v) => v.caso_id !== fila.id);
      db.caso_archivos = tabla('caso_archivos').filter((v) => v.caso_id !== fila.id);
      tabla('adquisiciones').forEach((a) => { if (a.caso_entregado_id === fila.id) a.caso_entregado_id = null; });
    }
    if (t === 'puntos') db.caso_videos = tabla('caso_videos').filter((v) => v.punto_id !== fila.id);
  }

  function likeARegex(patron) {
    let r = '';
    for (let i = 0; i < patron.length; i++) {
      const c = patron[i];
      if (c === '\\') { r += patron[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); continue; }
      r += c === '%' ? '.*' : c === '_' ? '.' : c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    return new RegExp('^' + r + '$');
  }

  function builder(t) {
    const q = { op: 'select', filtros: [], payload: null, devolver: false, cols: '*', count: false, head: false, single: null, rango: null, lim: null };
    const b = {
      select(cols, opts) {
        if (q.op === 'select') { q.cols = cols || '*'; q.count = !!opts?.count; q.head = !!opts?.head; } else { q.devolver = true; q.cols = cols || '*'; }
        return b;
      },
      insert(p) { q.op = 'insert'; q.payload = p; return b; },
      update(p) { q.op = 'update'; q.payload = p; return b; },
      delete() { q.op = 'delete'; return b; },
      eq(c, v) { q.filtros.push((r) => r[c] === v); return b; },
      neq(c, v) { q.filtros.push((r) => r[c] !== v); return b; },
      in(c, l) { q.filtros.push((r) => l.includes(r[c])); return b; },
      is(c, v) { q.filtros.push((r) => (v === null ? r[c] == null : r[c] === v)); return b; },
      not(c, op, v) { q.filtros.push((r) => (op === 'is' && v === null ? r[c] != null : r[c] !== v)); return b; },
      like(c, pat) { const re = likeARegex(pat); q.filtros.push((r) => re.test(String(r[c] ?? ''))); return b; },
      order() { return b; },
      range(a, z) { q.rango = [a, z]; return b; },
      limit(n) { q.lim = n; return b; },
      maybeSingle() { q.single = 'maybe'; return b; },
      single() { q.single = 'uno'; return b; },
      then(res, rej) { return Promise.resolve().then(ejecutar).then(res, rej); },
    };
    const proyectar = (r) => {
      if (q.cols === '*') return { ...r };
      const o = {};
      for (const c of q.cols.split(',').map((x) => x.trim())) o[c] = r[c];
      return o;
    };
    function ejecutar() {
      llamadas.push({ tabla: t, op: q.op });
      const err = fallar?.({ tabla: t, op: q.op, payload: q.payload });
      if (err) return { data: null, error: err };
      const coincide = (r) => q.filtros.every((f) => f(r));
      if (q.op === 'select') {
        let filas = tabla(t).filter(coincide);
        if (q.head) return { data: null, count: filas.length, error: null };
        const total = filas.length;
        if (q.rango) filas = filas.slice(q.rango[0], q.rango[1] + 1);
        if (q.lim != null) filas = filas.slice(0, q.lim);
        const salida = filas.map(proyectar);
        if (q.single) {
          if (salida.length > 1) return { data: null, error: { code: 'PGRST116' } };
          if (!salida.length) return q.single === 'maybe' ? { data: null, error: null } : { data: null, error: { code: 'PGRST116' } };
          return { data: salida[0], error: null };
        }
        return { data: salida, count: q.count ? total : undefined, error: null };
      }
      if (q.op === 'insert') {
        const lista = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((p) => ({ ...p }));
        const nuevas = [];
        for (const f of lista) {
          if (f.id === undefined && PREFIJO_ID[t]) f.id = PREFIJO_ID[t] + 'f' + (++seq);
          if (t === 'adquisiciones') { f.estado ||= 'solicitada'; f.caso_entregado_id ??= null; f.nota ??= ''; }
          if (violaUnico(t, f)) return { data: null, error: { code: '23505' } };
          tabla(t).push(f);
          nuevas.push(f);
        }
        if (!q.devolver) return { data: null, error: null };
        const salida = nuevas.map(proyectar);
        return { data: q.single ? salida[0] : salida, error: null };
      }
      if (q.op === 'update') {
        const filas = tabla(t).filter(coincide);
        for (const f of filas) {
          const nueva = { ...f, ...q.payload };
          if (violaUnico(t, nueva, f)) return { data: null, error: { code: '23505' } };
          Object.assign(f, q.payload);
        }
        return { data: q.devolver ? filas.map(proyectar) : null, error: null };
      }
      // delete
      for (const f of tabla(t).filter(coincide)) borrarFila(t, f);
      return { data: null, error: null };
    }
    return b;
  }

  const cliente = {
    db, quitados, llamadas,
    from: (t) => builder(t),
    storage: { from: (bucket) => ({ remove: async (paths) => { quitados.push(...paths.map((p) => bucket + '/' + p)); return { error: null }; } }) },
    async rpc(fn, args) {
      const err = fallar?.({ tabla: 'rpc', op: fn, payload: args });
      if (err) return { data: null, error: err };
      if (fn === 'reclamar_entrega') {
        const a = tabla('adquisiciones').find((x) => x.id === args.p_adq);
        const ok = a && (['solicitada', 'pagada', 'fallida'].includes(a.estado)
          || (a.estado === 'entregando' && ahora() - (a.actualizada_en || 0) > 10 * 60 * 1000));
        if (!ok) return { data: [], error: null };
        a.estado = 'entregando';
        a.actualizada_en = ahora();
        return { data: [{ ...a }], error: null };
      }
      return { data: null, error: { code: 'PGRST202' } };
    },
  };
  return cliente;
}
