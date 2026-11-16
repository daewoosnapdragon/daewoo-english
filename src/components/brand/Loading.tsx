'use client'

import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import ClassFlower, { flowerForClass } from './ClassFlower'

// ─── Loading ─────────────────────────────────────────────────────
// Ruled lines, with the signed-in teacher's class flower drawing itself in
// one pen line on top of them. Nothing shows for the first 150 ms, so a
// fast load never flashes a loader. With reduced motion the flower is
// simply there.

const DRAW = 2200, HOLD = 650, FADE = 420

function useReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduce(m.matches)
    const on = () => setReduce(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return reduce
}

export default function Loading({ rows = 5, label, className = '' }: { rows?: number; label?: string; className?: string }) {
  const { currentTeacher, language } = useApp()
  const name = flowerForClass(currentTeacher?.english_class)
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(false)
  const [cycle, setCycle] = useState(0)
  useEffect(() => { const t = setTimeout(() => setShown(true), 150); return () => clearTimeout(t) }, [])
  useEffect(() => {
    if (!shown || reduce) return
    const t = setTimeout(() => setCycle(c => c + 1), DRAW + HOLD + FADE)
    return () => clearTimeout(t)
  }, [shown, cycle, reduce])
  const size = Math.max(48, Math.min(96, rows * 34 - 20))
  const text = label || (language === 'ko' ? '불러오는 중' : 'Loading')
  return (
    <div role="status" aria-live="polite" className={`ruled-wait${shown ? ' is-shown' : ''} ${className}`}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="ruled-wait-line" />)}
      <div className="ruled-wait-center">
        {shown && (
          <span key={cycle} className="ruled-wait-flower" style={{ ['--cycle' as any]: `${DRAW + HOLD + FADE}ms` }}>
            <ClassFlower name={name} size={size} line={1.2} draw={!reduce} duration={DRAW} />
          </span>
        )}
      </div>
      <span className="sr-only">{text}</span>
    </div>
  )
}
