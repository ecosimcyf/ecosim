import { useRef, useEffect } from 'react';

// Accesibilidad de los modales: foco inicial dentro, Escape cierra, Tab no
// se escapa del modal y al cerrar el foco vuelve a donde estaba.
export function useModal(onCerrar) {
  const ref = useRef(null);
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;
  useEffect(() => {
    const previo = document.activeElement;
    const enfocables = () => Array.from(ref.current?.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])') || [])
      .filter((el) => !el.disabled);
    enfocables()[0]?.focus();
    const tecla = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); cerrarRef.current(); return; }
      if (e.key !== 'Tab') return;
      const lista = enfocables();
      if (!lista.length) return;
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      else if (!ref.current?.contains(document.activeElement)) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', tecla);
    return () => {
      document.removeEventListener('keydown', tecla);
      try { previo?.focus?.(); } catch {}
    };
  }, []);
  return ref;
}
