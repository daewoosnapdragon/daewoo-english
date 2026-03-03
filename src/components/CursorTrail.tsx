'use client';

import { useEffect, useRef } from 'react';

const TRAIL_COUNT = 5;
const SIZES = [8, 6, 4, 3, 2];

export default function CursorTrail() {
  const trailRefs = useRef<(HTMLDivElement | null)[]>([]);
  const positions = useRef(Array.from({ length: TRAIL_COUNT }, () => ({ x: -100, y: -100 })));
  const mouse = useRef({ x: -100, y: -100 });
  const visible = useRef(false);
  const raf = useRef<number>(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      // Hide trail during presentation mode (SmartboardViewer adds [data-presenting] to its container)
      const isPresenting = !!document.querySelector('[data-presenting]');
      if (isPresenting) {
        if (visible.current) {
          visible.current = false;
          trailRefs.current.forEach(el => { if (el) el.style.opacity = '0'; });
        }
        return;
      }
      if (!visible.current) {
        visible.current = true;
        trailRefs.current.forEach(el => { if (el) el.style.opacity = '1'; });
      }
    };

    const onLeave = () => {
      visible.current = false;
      trailRefs.current.forEach(el => { if (el) el.style.opacity = '0'; });
    };

    const animate = () => {
      const pos = positions.current;
      const m = mouse.current;

      pos[0].x += (m.x - pos[0].x) * 0.45;
      pos[0].y += (m.y - pos[0].y) * 0.45;

      for (let i = 1; i < TRAIL_COUNT; i++) {
        const ease = 0.3 - i * 0.04;
        pos[i].x += (pos[i - 1].x - pos[i].x) * ease;
        pos[i].y += (pos[i - 1].y - pos[i].y) * ease;
      }

      for (let i = 0; i < TRAIL_COUNT; i++) {
        const el = trailRefs.current[i];
        if (el) {
          const s = SIZES[i];
          el.style.left = (pos[i].x - s / 2) + 'px';
          el.style.top = (pos[i].y - s / 2) + 'px';
        }
      }

      raf.current = requestAnimationFrame(animate);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseleave', onLeave);
    raf.current = requestAnimationFrame(animate);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  return (
    <>
      {SIZES.map((size, i) => (
        <div
          key={i}
          ref={el => { trailRefs.current[i] = el; }}
          style={{
            position: 'fixed',
            width: size,
            height: size,
            borderRadius: '50%',
            background: '#c4a0d4',
            boxShadow: `0 0 ${6 - i}px ${Math.max(1, 2 - i * 0.3)}px rgba(196,160,212,${0.5 - i * 0.08})`,
            pointerEvents: 'none',
            zIndex: 99999,
            opacity: 0,
            transition: 'opacity 0.3s ease',
          }}
        />
      ))}
    </>
  );
}
