// ─── Areas at a glance: the parent-facing chart ──────────────────
// One bar per domain drawn over the school's letter bands (E, D, C, B, A),
// with the class average as a tick. Built as an SVG string so the same
// picture goes on the screen and into the printed progress report. The
// geometry is separate from the drawing so it can be tested.

export interface DomainBarRow { key: string; label: string; value: number | null; na?: boolean; classAvg?: number | null }
export interface DomainBarsOptions {
  letterOf: (v: number) => string
  width?: number
  /** Draw the class average ticks. On unless the comparison is hidden for this student. */
  showClass?: boolean
  labels?: Partial<typeof DEFAULT_LABELS>
}

const DEFAULT_LABELS = { yourChild: 'Your child', classAverage: 'Class average', notAssessed: 'Not assessed', noGrade: 'No grade yet' }

/** The school's bands: A+ to A- is 90 and up … E is under 60. */
export const LETTER_BANDS = [
  { letter: 'E', from: 0, to: 60 }, { letter: 'D', from: 60, to: 70 }, { letter: 'C', from: 70, to: 80 },
  { letter: 'B', from: 80, to: 90 }, { letter: 'A', from: 90, to: 100 },
]
const BAND_FILL = ['#e8e4da', '#eeeae1', '#f3f0e9', '#f8f6f1', '#fcfbf8']
export const BAR_COLOR = '#647FBC'
export const TICK_COLOR = '#334155'

export function layoutDomainBars(rows: DomainBarRow[], width = 680) {
  const labelW = 134, valueW = 100, rowH = 28, top = 6, axisH = 20, legendH = 20, gap = 12
  const plotX = labelW, plotW = width - labelW - valueW - gap
  const x = (v: number) => plotX + (Math.max(0, Math.min(100, v)) / 100) * plotW
  const height = top + rows.length * rowH + axisH + legendH
  return {
    width, height, labelW, plotX, plotW, rowH, top, axisH, x,
    rows: rows.map((r, i) => ({ ...r, y: top + i * rowH, barW: r.na || r.value == null ? 0 : x(r.value) - plotX, tickX: r.na || r.classAvg == null ? null : x(r.classAvg) })),
  }
}

const esc = (s: string) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string))
const f = (n: number) => n.toFixed(1)

export function domainBarsSvg(rows: DomainBarRow[], opts: DomainBarsOptions): string {
  const L = layoutDomainBars(rows, opts.width)
  const lab = { ...DEFAULT_LABELS, ...(opts.labels || {}) }
  const showClass = opts.showClass !== false
  const plotBottom = L.top + rows.length * L.rowH
  const bands = LETTER_BANDS.map((b, i) =>
    `<rect x="${f(L.x(b.from))}" y="${L.top}" width="${f(L.x(b.to) - L.x(b.from))}" height="${rows.length * L.rowH}" fill="${BAND_FILL[i]}"/>` +
    `<text x="${f((L.x(b.from) + L.x(b.to)) / 2)}" y="${plotBottom + 14}" text-anchor="middle" font-size="11" font-weight="600" fill="#64748b">${b.letter}</text>`).join('')
  const bars = L.rows.map(r => {
    const cy = r.y + L.rowH / 2
    const label = `<text x="${L.plotX - 10}" y="${f(cy + 4)}" text-anchor="end" font-size="12" font-weight="600" fill="#1e293b">${esc(r.label)}</text>`
    if (r.na) return label + `<text x="${L.plotX + 8}" y="${f(cy + 4)}" font-size="11" font-style="italic" fill="#94a3b8">${esc(lab.notAssessed)}</text>`
    if (r.value == null) return label + `<text x="${L.plotX + 8}" y="${f(cy + 4)}" font-size="11" font-style="italic" fill="#94a3b8">${esc(lab.noGrade)}</text>`
    const bar = `<rect x="${L.plotX}" y="${f(cy - 7)}" width="${f(Math.max(2, r.barW))}" height="14" fill="${BAR_COLOR}"/>`
    const tick = showClass && r.tickX != null ? `<line x1="${f(r.tickX)}" x2="${f(r.tickX)}" y1="${f(cy - 11)}" y2="${f(cy + 11)}" stroke="${TICK_COLOR}" stroke-width="2"/>` : ''
    const value = `<text x="${L.plotX + L.plotW + 10}" y="${f(cy + 4)}" font-size="12" font-weight="700" fill="#1e293b">${r.value.toFixed(1)}% · ${esc(opts.letterOf(r.value))}</text>`
    return label + bar + tick + value
  }).join('')
  const ly = plotBottom + L.axisH + 10
  const legend = `<rect x="${L.plotX}" y="${ly - 8}" width="12" height="10" fill="${BAR_COLOR}"/><text x="${L.plotX + 17}" y="${ly}" font-size="10.5" fill="#64748b">${esc(lab.yourChild)}</text>` +
    (showClass ? `<line x1="${L.plotX + 100}" x2="${L.plotX + 100}" y1="${ly - 9}" y2="${ly + 2}" stroke="${TICK_COLOR}" stroke-width="2"/><text x="${L.plotX + 107}" y="${ly}" font-size="10.5" fill="#64748b">${esc(lab.classAverage)}</text>` : '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.width} ${L.height}" width="100%" role="img" aria-label="Each area as a bar over the letter bands, with the class average marked" style="display:block;font-family:'Segoe UI',Arial,sans-serif">${bands}${bars}${legend}</svg>`
}
