'use client';

import { useEffect, useRef } from 'react';

export function spawnHearts(x: number, y: number, count = 4) {
  const chars = ['\u2661', '\u2665', '\u2764'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'heart-particle';
    el.textContent = chars[Math.floor(Math.random() * chars.length)];
    el.style.left = `${x + (Math.random() - 0.5) * 40}px`;
    el.style.top = `${y + (Math.random() - 0.5) * 10}px`;
    el.style.fontSize = `${10 + Math.random() * 10}px`;
    el.style.animationDelay = `${i * 0.06}s`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
}

export default function HeartsOnClick() {
  const clickCount = useRef(0);
  const clickTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      spawnHearts(e.clientX, e.clientY, 4);

      // Rapid click detection
      clickCount.current++;
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 1000);

      // Dispatch custom event for Bill to react
      if (clickCount.current > 8) {
        window.dispatchEvent(new CustomEvent('bill-rapid-click'));
        clickCount.current = 0;
      }
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, []);

  return null;
}
