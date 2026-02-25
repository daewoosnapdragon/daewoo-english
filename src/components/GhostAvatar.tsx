'use client';

import { useState, useEffect } from 'react';

type GhostMood = 'idle' | 'happy' | 'thinking' | 'sleepy' | 'excited';

const faces: Record<GhostMood, string> = {
  idle: '👻',
  happy: '( ᵔ‿ᵔ )',
  thinking: '( ᵔ.ᵔ )',
  sleepy: '( ᵕ‿ᵕ )',
  excited: '( ★‿★ )',
};

interface GhostAvatarProps {
  mood?: GhostMood;
  expanded?: boolean;
}

export default function GhostAvatar({ mood = 'idle', expanded = false }: GhostAvatarProps) {
  const [currentMood, setCurrentMood] = useState<GhostMood>(mood);
  const [idle, setIdle] = useState(0);

  useEffect(() => { setCurrentMood(mood); setIdle(0); }, [mood]);

  // Go sleepy after 30s of no mood change
  useEffect(() => {
    const t = setInterval(() => {
      setIdle(p => {
        if (p > 30 && currentMood !== 'sleepy') setCurrentMood('sleepy');
        return p + 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [currentMood]);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      animation: 'ghostFloat 3s ease-in-out infinite',
    }}>
      {expanded ? (
        <span style={{
          fontSize: 11, color: '#e0a0b0', letterSpacing: '0.05em',
          animation: 'ghostBlink 4s ease infinite',
          whiteSpace: 'nowrap',
        }}>
          {faces[currentMood]}
        </span>
      ) : (
        <span style={{ fontSize: 14 }}>👻</span>
      )}
    </div>
  );
}

export type { GhostMood };
