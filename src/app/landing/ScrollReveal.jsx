'use client';
// Revela las secciones marcadas con data-reveal a medida que entran en
// pantalla (fade + subida leve). Sin parallax ni scroll-jacking — solo un
// fundido. Respeta prefers-reduced-motion y no bloquea el contenido si
// JavaScript tarda: cada sección ya es legible, solo aparece transparente
// hasta que el observer la marca.
import { useEffect } from 'react';

export default function ScrollReveal() {
  useEffect(() => {
    const elementos = document.querySelectorAll('[data-reveal]');
    if (!elementos.length) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elementos.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('is-visible');
            observer.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    elementos.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return null;
}
