'use client'

import { useMemo, useState } from 'react'

// ─── Shared charts ───────────────────────────────────────────────
// One drawing style for the whole app: thin marks, a faint grid, tabular
// labels, one emphasised endpoint, colours from the theme (--c-* in
// globals.css) so every chart reads the same in light and dark. Four forms
// cover what the app shows: a line over time with a benchmark band, a dot
// strip for where one student sits in the class, horizontal bars (single or
// paired), and a sparkline for tiles.

const C = { s1: 'var(--c-1)', s2: 'var(--c-2)', good: 'var(--c-good)', warn: 'var(--c-warn)', bad: 'var(--c-bad)', mute: 'var(--c-mute)', rule: 'var(--c-rule)', band: 'var(--c-band)', text: 'var(--c-text)', track: 'var(--c-track)' }
const font = { fontFamily: 'var(--font-sans-stack)', fontVariantNumeric: 'tabular-nums' as const }

function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || mag * 10
  const out: number[] = []
  for (let v = 0; v <= max + 1e-9; v += step) out.push(Math.round(v * 100) / 100)
  return out
}

// ── Line over time ────────────────────────────────────────────────
export interface LinePoint { x: string; y: number; label?: string; note?: string; tone?: 'good' | 'warn' | 'bad' }
export interface LineChartProps {
  points: LinePoint[]
  /** A second, quieter line (e.g. the class average) aligned by x. */
  compare?: LinePoint[]
  compareLabel?: string
  /** A shaded target band, e.g. the grade's benchmark range. */
  band?: { low: number; high: number; label: string }
  /** Dashed reference lines. */
  lines?: { y: number; label: string }[]
  yMax?: number
  height?: number
  unit?: string
  formatX?: (x: string) => string
  emptyText?: string
}

export function LineChart({ points, compare, compareLabel, band, lines, yMax, height = 200, unit = '', formatX, emptyText = 'No data yet' }: LineChartProps) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 640, H = height, P = { top: 18, right: 64, bottom: 26, left: 38 }
  const cw = W - P.left - P.right, ch = H - P.top - P.bottom
  const n = points.length
  const maxY = useMemo(() => {
    const vals = [...points.map(p => p.y), ...(compare || []).map(p => p.y), band?.high || 0, ...(lines || []).map(l => l.y), yMax || 0]
    return Math.max(10, Math.max(...vals) * 1.12)
  }, [points, compare, band, lines, yMax])
  if (n === 0) return <p className="text-[12.5px] text-ink-3 py-6">{emptyText}</p>
  const xs = (i: number) => P.left + (n === 1 ? cw / 2 : (i / (n - 1)) * cw)
  const ys = (v: number) => P.top + ch - (v / maxY) * ch
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${xs(i)} ${ys(p.y)}`).join(' ')
  const cpath = compare && compare.length === n ? compare.map((p, i) => `${i ? 'L' : 'M'} ${xs(i)} ${ys(p.y)}`).join(' ') : null
  const fx = formatX || ((x: string) => new Date(x + (x.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
  const ticks = niceTicks(maxY)
  const toneColor = (t?: string) => t === 'good' ? C.good : t === 'warn' ? C.warn : t === 'bad' ? C.bad : C.s1
  const last = points[n - 1]
  const labelEvery = Math.max(1, Math.ceil(n / 8))
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={font} onMouseLeave={() => setHover(null)}>
        {band && <rect x={P.left} y={ys(band.high)} width={cw} height={Math.max(2, ys(band.low) - ys(band.high))} fill={C.band} />}
        {band && <text x={P.left + 4} y={ys(band.high) + 11} fontSize="9.5" fill={C.good}>{band.label}</text>}
        {ticks.map(t => <g key={t}><line x1={P.left} x2={W - P.right} y1={ys(t)} y2={ys(t)} stroke={C.rule} strokeWidth="1" /><text x={P.left - 6} y={ys(t) + 3.5} textAnchor="end" fontSize="10" fill={C.text}>{t}</text></g>)}
        {(lines || []).map(l => <g key={l.label}><line x1={P.left} x2={W - P.right} y1={ys(l.y)} y2={ys(l.y)} stroke={C.mute} strokeWidth="1" strokeDasharray="4 3" /><text x={W - P.right + 4} y={ys(l.y) + 3.5} fontSize="9.5" fill={C.text}>{l.label}</text></g>)}
        {cpath && <path d={cpath} fill="none" stroke={C.mute} strokeWidth="1.5" strokeDasharray="3 3" />}
        {cpath && compareLabel && <text x={W - P.right + 4} y={ys(compare![n - 1].y) + 3.5} fontSize="9.5" fill={C.text}>{compareLabel}</text>}
        <path d={path} fill="none" stroke={C.s1} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={xs(i)} cy={ys(p.y)} r={i === n - 1 || hover === i ? 4.5 : 3} fill={toneColor(p.tone)} stroke="var(--paper-hex, #F5F1E8)" strokeWidth="1.5" />
            <rect x={xs(i) - Math.max(8, cw / n / 2)} y={P.top} width={Math.max(16, cw / n)} height={ch} fill="transparent" onMouseEnter={() => setHover(i)} />
            {i % labelEvery === 0 && <text x={xs(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={C.text}>{fx(p.x)}</text>}
          </g>
        ))}
        <text x={xs(n - 1) + 8} y={ys(last.y) + 4} fontSize="12" fontWeight="600" fill="rgb(var(--ink))">{Math.round(last.y)}{unit}</text>
      </svg>
      {hover != null && points[hover] && (
        <div className="absolute pointer-events-none bg-surface border border-rule-2 rounded shadow-lg px-2.5 py-1.5 text-[12px] text-ink" style={{ left: `${(xs(hover) / W) * 100}%`, top: 0, transform: 'translate(-50%, -100%)' }}>
          <span className="font-semibold tabular-nums">{Math.round(points[hover].y)}{unit}</span> · {fx(points[hover].x)}{points[hover].label ? ` · ${points[hover].label}` : ''}{points[hover].note ? <span className="block text-ink-3">{points[hover].note}</span> : null}
          {compare && compare[hover] && <span className="block text-ink-3">{compareLabel || 'compare'} {Math.round(compare[hover].y)}{unit}</span>}
        </div>
      )}
    </div>
  )
}

// ── Dot strip: where one student sits among the class ─────────────
export interface DotStripProps { values: { id: string; label: string; value: number }[]; highlightId?: string; max?: number; threshold?: number; unit?: string }
export function DotStrip({ values, highlightId, max = 100, threshold, unit = '' }: DotStripProps) {
  const [hover, setHover] = useState<string | null>(null)
  const W = 640, H = 84, P = { left: 24, right: 24 }
  const cw = W - P.left - P.right
  const xs = (v: number) => P.left + (Math.min(v, max) / max) * cw
  const sorted = [...values].sort((a, b) => a.value - b.value)
  // stack dots that land within a few px of each other
  const placed: { id: string; label: string; value: number; x: number; row: number }[] = []
  sorted.forEach(v => { const x = xs(v.value); let row = 0; while (placed.some(p => p.row === row && Math.abs(p.x - x) < 11)) row++; placed.push({ ...v, x, row }) })
  const avg = values.length ? values.reduce((a, b) => a + b.value, 0) / values.length : null
  const hi = placed.find(p => p.id === highlightId)
  const hoverPt = hover ? placed.find(p => p.id === hover) : null
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" style={font} onMouseLeave={() => setHover(null)}>
        {threshold != null && <rect x={P.left} y={30} width={xs(threshold) - P.left} height={30} fill={C.bad} opacity="0.08" />}
        <line x1={P.left} x2={W - P.right} y1={60} y2={60} stroke={C.rule} />
        {[0, max / 2, max].map(t => <text key={t} x={xs(t)} y={76} textAnchor="middle" fontSize="10" fill={C.text}>{t}{unit}</text>)}
        {avg != null && <g><line x1={xs(avg)} x2={xs(avg)} y1={26} y2={62} stroke="rgb(var(--ink))" strokeWidth="1.5" /><text x={xs(avg)} y={18} textAnchor="middle" fontSize="10" fill={C.text}>avg {Math.round(avg)}{unit}</text></g>}
        {placed.map(p => <circle key={p.id} cx={p.x} cy={54 - p.row * 10} r={p.id === highlightId ? 6 : 4.5} fill={p.id === highlightId ? C.s2 : C.s1} stroke="var(--paper-hex, #F5F1E8)" strokeWidth="1.5" onMouseEnter={() => setHover(p.id)} />)}
        {hi && <text x={hi.x} y={hi.row ? 20 : 34} textAnchor="middle" fontSize="11" fontWeight="600" fill="rgb(var(--ink))">{hi.label} {Math.round(hi.value)}{unit}</text>}
      </svg>
      {hoverPt && <div className="absolute pointer-events-none bg-surface border border-rule-2 rounded shadow-lg px-2.5 py-1 text-[12px] text-ink" style={{ left: `${(hoverPt.x / W) * 100}%`, top: 0, transform: 'translate(-50%, -100%)' }}>{hoverPt.label} · <span className="tabular-nums font-semibold">{Math.round(hoverPt.value)}{unit}</span></div>}
    </div>
  )
}

// ── Horizontal bars, single or paired ─────────────────────────────
export interface BarRow { label: string; a: number | null; b?: number | null; tone?: 'good' | 'warn' | 'bad'; sub?: string }
export function Bars({ rows, aLabel, bLabel, max = 100, unit = '%' }: { rows: BarRow[]; aLabel?: string; bLabel?: string; max?: number; unit?: string }) {
  const paired = rows.some(r => r.b != null)
  return (
    <div className="grid gap-2" style={font}>
      {rows.map(r => (
        <div key={r.label} className="grid grid-cols-[120px_minmax(0,1fr)_44px] gap-3 items-center text-[12.5px]">
          <span className="text-ink truncate" title={r.label}>{r.label}{r.sub && <span className="block text-[10.5px] text-ink-3">{r.sub}</span>}</span>
          <span className="grid gap-[3px]">
            <span className="h-2 rounded-sm" style={{ background: C.track }}><span className="block h-full rounded-sm" style={{ width: `${r.a != null ? Math.min(100, (r.a / max) * 100) : 0}%`, background: r.tone === 'bad' ? C.bad : r.tone === 'warn' ? C.warn : r.tone === 'good' ? C.good : C.s1 }} /></span>
            {paired && <span className="h-2 rounded-sm" style={{ background: C.track }}><span className="block h-full rounded-sm" style={{ width: `${r.b != null ? Math.min(100, (r.b / max) * 100) : 0}%`, background: C.mute }} /></span>}
          </span>
          <span className="text-right tabular-nums text-ink">{r.a != null ? `${Math.round(r.a)}${unit}` : '—'}{paired && <span className="block text-[10.5px] text-ink-3">{r.b != null ? `${Math.round(r.b)}${unit}` : '—'}</span>}</span>
        </div>
      ))}
      {paired && (aLabel || bLabel) && <div className="flex gap-4 text-[11px] text-ink-3 mt-1"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.s1 }} />{aLabel}</span><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: C.mute }} />{bLabel}</span></div>}
    </div>
  )
}

// ── Sparkline for a tile ──────────────────────────────────────────
export function Sparkline({ values, tone, width = 100, height = 26 }: { values: number[]; tone?: 'good' | 'warn' | 'bad'; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} className="block" />
  const min = Math.min(...values), max = Math.max(...values), range = max - min || 1
  const xs = (i: number) => 3 + (i / (values.length - 1)) * (width - 6)
  const ys = (v: number) => height - 3 - ((v - min) / range) * (height - 6)
  const d = values.map((v, i) => `${i ? 'L' : 'M'} ${xs(i)} ${ys(v)}`).join(' ')
  const color = tone === 'bad' ? C.bad : tone === 'warn' ? C.warn : tone === 'good' ? C.good : C.s1
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs(values.length - 1)} cy={ys(values[values.length - 1])} r="2.5" fill={color} />
    </svg>
  )
}
