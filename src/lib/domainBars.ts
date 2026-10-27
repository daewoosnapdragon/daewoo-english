// ─── Areas at a glance: the parent-facing chart ──────────────────
// One thin bar per domain on a faint track, the school's letter bands
// marked by hairlines with small letters above, the class average as a
// short line. Built as an SVG string so the same picture goes on the
// screen and into the printed progress report, sized like the report
// card's comparison band rather than scaled to the page. The geometry is
// separate from the drawing so it can be tested.

export interface DomainBarRow { key: string; label: string; value: number | null; na?: boolean; classAvg?: number | null }
export interface DomainBarsOptions {
  letterOf: (v: number) => string
  /** Colour for the letter next to the value; the tiles' colours, so the two agree. */
  letterColorOf?: (letter: string) => string
  width?: number
  /** Draw the class average marks. On unless the comparison is hidden for this student. */
  showClass?: boolean
  labels?: Partial<typeof DEFAULT_LABELS>
}

const DEFAULT_LABELS = { yourChild: 'Your child', classAverage: 'Class average', notAssessed: 'Not assessed', noGrade: 'No grade yet' }

/** The school's bands: A+ to A- is 90 and up … E is under 60. */
export const LETTER_BANDS = [
  { letter: 'E', from: 0, to: 60 }, { letter: 'D', from: 60, to: 70 }, { letter: 'C', from: 70, to: 80 },
  { letter: 'B', from: 80, to: 90 }, { letter: 'A', from: 90, to: 100 },
]
export const BAR_COLOR = '#647FBC'
export const TICK_COLOR = '#475569'
const TRACK = '#edeae2'
const GRID = '#cfc9bb'

export function layoutDomainBars(rows: DomainBarRow[], width = 640) {
  const labelW = 118, valueW = 96, rowH = 22, top = 18, legendH = 22, gap = 14
  const plotX = labelW, plotW = width - labelW - valueW - gap
  const x = (v: number) => plotX + (Math.max(0, Math.min(100, v)) / 100) * plotW
  const height = top + rows.length * rowH + legendH
  return {
    width, height, labelW, plotX, plotW, rowH, top, gap, x,
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
  // Band boundaries as hairlines, the letters above them.
  const bands = LETTER_BANDS.map((b, i) =>
    (i > 0 ? `<line x1="${f(L.x(b.from))}" x2="${f(L.x(b.from))}" y1="${L.top - 2}" y2="${plotBottom + 2}" stroke="${GRID}" stroke-width="1" stroke-dasharray="2 3"/>` : '') +
    `<text x="${f((L.x(b.from) + L.x(b.to)) / 2)}" y="${L.top - 7}" text-anchor="middle" font-size="9.5" font-weight="600" letter-spacing="1" fill="#94a3b8">${b.letter}</text>`).join('')
  const bars = L.rows.map(r => {
    const cy = r.y + L.rowH / 2
    const label = `<text x="${L.plotX - 10}" y="${f(cy + 4)}" text-anchor="end" font-size="11.5" font-weight="600" fill="#475569">${esc(r.label)}</text>`
    if (r.na) return label + `<text x="${L.plotX + 2}" y="${f(cy + 4)}" font-size="10.5" font-style="italic" fill="#94a3b8">${esc(lab.notAssessed)}</text>`
    if (r.value == null) return label + `<text x="${L.plotX + 2}" y="${f(cy + 4)}" font-size="10.5" font-style="italic" fill="#94a3b8">${esc(lab.noGrade)}</text>`
    const track = `<rect x="${L.plotX}" y="${f(cy - 4)}" width="${f(L.plotW)}" height="8" rx="2" fill="${TRACK}"/>`
    const bar = `<rect x="${L.plotX}" y="${f(cy - 4)}" width="${f(Math.max(3, r.barW))}" height="8" rx="2" fill="${BAR_COLOR}"/>`
    const tick = showClass && r.tickX != null ? `<line data-tick="1" x1="${f(r.tickX)}" x2="${f(r.tickX)}" y1="${f(cy - 7)}" y2="${f(cy + 7)}" stroke="${TICK_COLOR}" stroke-width="1.5"/>` : ''
    const letter = opts.letterOf(r.value)
    const color = opts.letterColorOf ? opts.letterColorOf(letter) : '#1e293b'
    const value = `<text x="${L.plotX + L.plotW + L.gap}" y="${f(cy + 4)}" font-size="12" font-weight="600" fill="#1e293b">${r.value.toFixed(1)}%</text>` +
      `<text x="${L.plotX + L.plotW + L.gap + 52}" y="${f(cy + 4)}" font-size="11" font-weight="700" fill="${color}">${esc(letter)}</text>`
    return label + track + bar + tick + value
  }).join('')
  const ly = plotBottom + 15
  const legend = `<rect x="${L.plotX}" y="${ly - 6}" width="12" height="6" rx="1.5" fill="${BAR_COLOR}"/><text x="${L.plotX + 17}" y="${ly}" font-size="10" fill="#64748b">${esc(lab.yourChild)}</text>` +
    (showClass ? `<line x1="${L.plotX + 96}" x2="${L.plotX + 96}" y1="${ly - 8}" y2="${ly + 1}" stroke="${TICK_COLOR}" stroke-width="1.5"/><text x="${L.plotX + 102}" y="${ly}" font-size="10" fill="#64748b">${esc(lab.classAverage)}</text>` : '')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${L.width} ${L.height}" width="100%" role="img" aria-label="Each area as a bar, with the letter bands and the class average marked" style="display:block;max-width:${L.width}px;font-family:'Segoe UI',Arial,sans-serif">${bands}${bars}${legend}</svg>`
}
