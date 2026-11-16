'use client'

import { memo } from 'react'
import { FLOWER_ART } from './flowerData'

// ─── Class flowers ───────────────────────────────────────────────
// Each English class is named after a flower. The drawings are Kyla's,
// traced to centre lines (scripts/brand), so a flower can be drawn at any
// size with the line weight chosen for that size, in the class colour, and
// drawn on screen as one continuous pen line. They are too detailed to read
// below about 32 px: class chips keep their colour dot.

export type FlowerName = 'lily' | 'camellia' | 'daisy' | 'sunflower' | 'marigold' | 'snapdragon'
export const FLOWER_NAMES: FlowerName[] = ['lily', 'camellia', 'daisy', 'sunflower', 'marigold', 'snapdragon']

/** The flower for a class. Admin, Unplaced and anything else get the flower of the day. */
export function flowerForClass(cls?: string | null, now: Date = new Date()): FlowerName {
  const k = (cls || '').toLowerCase()
  if ((FLOWER_NAMES as string[]).includes(k)) return k as FlowerName
  const start = Date.UTC(now.getFullYear(), 0, 0)
  const day = Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - start) / 864e5)
  return FLOWER_NAMES[day % FLOWER_NAMES.length]
}

const maxY = (d: string) => {
  let m = 0
  const nums = d.match(/-?\d+(\.\d+)?/g) || []
  for (let i = 1; i < nums.length; i += 2) m = Math.max(m, +nums[i])
  return m
}

interface Props {
  name: FlowerName
  /** Rendered width and height in px. */
  size: number
  /** Line weight on screen, in px. */
  line?: number
  /** Only the flower head, without stem and leaf. */
  head?: boolean
  /** Draw it as one pen line from the bottom of the stem up. */
  draw?: boolean
  /** How long the drawing takes, in ms. */
  duration?: number
  className?: string
  title?: string
}

function ClassFlower({ name, size, line = 1, head = false, draw = false, duration = 2200, className = '', title }: Props) {
  const f = FLOWER_ART[name]
  if (!f) return null
  const vb = head ? f.head : [0, 0, 760, 760]
  const sw = (line * vb[2]) / size
  const paths = head ? f.paths.filter(([d]) => maxY(d) <= f.bot + 6) : f.paths
  let acc = 0
  return (
    <svg className={`class-flower${draw ? ' is-drawing' : ''} ${className}`} width={size} height={size} viewBox={vb.join(' ')}
      style={{ ['--c' as any]: `rgb(var(--${name}))`, strokeWidth: sw }} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      {paths.map(([d, L], i) => {
        const style = draw ? { ['--d' as any]: `${Math.round((acc / f.len) * duration)}ms`, ['--t' as any]: `${Math.max(16, Math.round((L / f.len) * duration))}ms` } : undefined
        acc += L
        return <path key={i} d={d} pathLength={1} style={style} />
      })}
      {f.dots.map(([x, y, r], i) => (
        <circle key={`d${i}`} cx={x} cy={y} r={Math.max(r, sw * 0.45)} style={draw ? { ['--d' as any]: `${Math.round(duration * 0.92)}ms` } : undefined} />
      ))}
    </svg>
  )
}

export default memo(ClassFlower)

/** A flower in a pale circle of its class colour: the teacher's avatar. */
export function FlowerAvatar({ name, size = 40, title }: { name: FlowerName; size?: number; title?: string }) {
  return (
    <span className="flower-avatar" style={{ ['--c' as any]: `rgb(var(--${name}))`, width: size, height: size }} title={title}>
      <ClassFlower name={name} size={Math.round(size * 0.85)} line={size > 48 ? 0.6 : 0.5} />
    </span>
  )
}
