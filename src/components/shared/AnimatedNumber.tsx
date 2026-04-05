'use client'

import { useState, useEffect, useRef } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  className?: string
  suffix?: string
  prefix?: string
}

export default function AnimatedNumber({ value, duration = 600, className = '', suffix = '', prefix = '' }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const prevValue = useRef(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const start = prevValue.current
    const diff = value - start
    if (diff === 0) return

    const startTime = performance.now()
    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        prevValue.current = value
      }
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [value, duration])

  return <span className={className}>{prefix}{display}{suffix}</span>
}
