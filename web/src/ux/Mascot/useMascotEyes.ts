import { useEffect, type RefObject } from 'react';

const MAX_PUPIL_OFFSET = 28;
const SATURATION_DISTANCE_PX = 220;

export function useMascotEyes(svgRef: RefObject<SVGSVGElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;

    if (!enabled) {
      el.style.removeProperty('--pupil-x');
      el.style.removeProperty('--pupil-y');
      return;
    }

    let raf = 0;
    let lastEvent: MouseEvent | null = null;

    const flush = () => {
      raf = 0;
      const ev = lastEvent;
      lastEvent = null;
      if (!ev) return;

      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = ev.clientX - cx;
      const dy = ev.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        el.style.setProperty('--pupil-x', '0px');
        el.style.setProperty('--pupil-y', '0px');
        return;
      }
      const ratio = Math.min(1, dist / SATURATION_DISTANCE_PX);
      const px = (dx / dist) * ratio * MAX_PUPIL_OFFSET;
      const py = (dy / dist) * ratio * MAX_PUPIL_OFFSET;
      el.style.setProperty('--pupil-x', `${px.toFixed(2)}px`);
      el.style.setProperty('--pupil-y', `${py.toFixed(2)}px`);
    };

    const onMove = (ev: MouseEvent) => {
      lastEvent = ev;
      if (!raf) raf = requestAnimationFrame(flush);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (raf) cancelAnimationFrame(raf);
      el.style.removeProperty('--pupil-x');
      el.style.removeProperty('--pupil-y');
    };
  }, [enabled, svgRef]);
}
