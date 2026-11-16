'use client'

import { useEffect, useState } from 'react'
import ClassFlower, { flowerForClass } from './ClassFlower'

// ─── Welcome ─────────────────────────────────────────────────────
// Right after a teacher logs in: their class flower draws itself above a
// greeting, then the page underneath (already loading) shows through.
// About a second and a half; a click or any key skips it.

const DRAW = 1000, HOLD = 250, FADE = 250

function greeting(name: string, ko: boolean) {
  const h = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul', hour: 'numeric', hour12: false })) % 24
  if (ko) return `${name} 선생님, 안녕하세요`
  return `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name}`
}

export default function Welcome({ name, englishClass, ko, onDone }: { name: string; englishClass?: string | null; ko: boolean; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), DRAW + HOLD)
    const t2 = setTimeout(onDone, DRAW + HOLD + FADE)
    const skip = () => { setLeaving(true); setTimeout(onDone, FADE) }
    window.addEventListener('keydown', skip, { once: true })
    return () => { clearTimeout(t1); clearTimeout(t2); window.removeEventListener('keydown', skip) }
  }, [onDone])
  return (
    <div className={`welcome${leaving ? ' is-leaving' : ''}`} onClick={() => { setLeaving(true); setTimeout(onDone, FADE) }} role="status" aria-live="polite">
      <ClassFlower name={flowerForClass(englishClass)} size={112} line={1.1} draw duration={DRAW} />
      <p className="welcome-line font-display">{greeting(name, ko)}</p>
    </div>
  )
}
