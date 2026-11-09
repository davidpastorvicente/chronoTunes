import { useEffect, useRef } from 'react';

/**
 * The only decorative element allowed by the Genesis design: a dot grid whose
 * dots light up around the pointer. Static for touch / reduced-motion users.
 */
export default function DotGrid() {
  const ref = useRef(null);

  useEffect(() => {
    const element = ref.current;
    const canHover = globalThis.matchMedia?.('(hover: hover) and (prefers-reduced-motion: no-preference)').matches;
    if (!element || !canHover) return undefined;

    let frame = 0;
    const onMove = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty('--mx', `${event.clientX - rect.left}px`);
        element.style.setProperty('--my', `${event.clientY - rect.top}px`);
      });
    };
    globalThis.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      globalThis.removeEventListener('pointermove', onMove);
    };
  }, []);

  return <div ref={ref} className="dot-grid" aria-hidden="true" />;
}
