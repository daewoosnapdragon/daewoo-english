'use client'

import type { LetterRow } from '@/lib/factSheet'

// ─── Fact sheet ──────────────────────────────────────────────────
// The narrow column beside the report card comment box: what the app
// already knows about the student, laid out to be read before writing and
// glanced at after. Screen only, never printed. It lives inside the white
// report card, so it uses the card's own greys rather than the page theme.

export interface FactSheetFacts {
  attendance: { absent: number; tardy: number; total: number } | null
  readingNow: { level: string | null; cwpm: number | null; date: string | null } | null
  readingThen: { level: string | null; cwpm: number | null; date: string | null } | null
  wida: { level: number; name: string } | null
  behaviorCount: number
}

export interface FactSheetQuote { text: string; label: string }

export interface FactSheetProps {
  rows: LetterRow[]
  /** Column heading for the change since the progress report; omitted when there was none. */
  sinceMidLabel: string | null
  /** Column heading for the change since the previous semester; omitted when there was none. */
  sinceLastLabel: string | null
  facts: FactSheetFacts
  noticings: string[]
  progress: FactSheetQuote | null
  previous: FactSheetQuote | null
  className?: string
}

const INK = '#1e293b', MUTED = '#64748b', RULE = '#DFE4EB'
const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-[10px] tracking-[1.6px] uppercase font-semibold m-0" style={{ color: MUTED }}>{children}</h3>

function MonthDay({ iso }: { iso: string | null }) {
  if (!iso) return null
  const [, m, d] = iso.split('-').map(Number)
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return <>{d} {MONTHS[(m || 1) - 1]}</>
}

export default function FactSheet({ rows, sinceMidLabel, sinceLastLabel, facts, noticings, progress, previous, className = '' }: FactSheetProps) {
  const reading = (r: FactSheetFacts['readingNow']) => r ? [r.level, r.cwpm != null ? `${Math.round(r.cwpm)} wpm` : null].filter(Boolean).join(' · ') : ''
  return (
    <aside aria-label="Fact sheet" className={`flex-[0_1_300px] min-w-[250px] flex flex-col gap-5 text-[12.5px] leading-snug ${className}`} style={{ color: INK }}>

      <section className="flex flex-col gap-2">
        <H>Letters this semester</H>
        <table className="w-full border-collapse tabular-nums">
          <thead>
            <tr className="text-left text-[10.5px]" style={{ color: MUTED }}>
              <th scope="col" className="font-medium pb-1">Area</th>
              <th scope="col" className="font-medium pb-1">Letter</th>
              {sinceMidLabel && <th scope="col" className="font-medium pb-1 whitespace-nowrap">{sinceMidLabel}</th>}
              {sinceLastLabel && <th scope="col" className="font-medium pb-1 whitespace-nowrap">{sinceLastLabel}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.domain} style={{ borderTop: `1px solid ${RULE}` }}>
                <th scope="row" className="font-medium text-left py-[5px] pr-2">{r.label}</th>
                <td className="py-[5px] whitespace-nowrap">
                  {r.na ? <span style={{ color: MUTED }}>N/A</span> : r.score == null ? <span style={{ color: MUTED }}>—</span> : <><span className="font-display text-[16px]">{r.letter}</span> <span style={{ color: MUTED }}>{r.score.toFixed(0)}</span></>}
                </td>
                {sinceMidLabel && <td className="py-[5px]" style={{ color: MUTED }}>{r.sinceMidterm ?? ''}</td>}
                {sinceLastLabel && <td className="py-[5px] whitespace-nowrap" style={{ color: MUTED }}>{r.sinceLast ?? ''}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-1.5">
        <H>Facts</H>
        <dl className="m-0 grid gap-x-3 gap-y-1" style={{ gridTemplateColumns: '92px minmax(0, 1fr)' }}>
          <dt style={{ color: MUTED }}>Attendance</dt>
          <dd className="m-0">{facts.attendance ? <>{facts.attendance.absent} absent · {facts.attendance.tardy} tardy</> : '—'}</dd>
          <dt style={{ color: MUTED }}>Reading</dt>
          <dd className="m-0">
            {facts.readingNow ? reading(facts.readingNow) : '—'}
            {facts.readingThen && facts.readingThen.date !== facts.readingNow?.date && <span style={{ color: MUTED }}> (<MonthDay iso={facts.readingThen.date} />: {reading(facts.readingThen)})</span>}
          </dd>
          <dt style={{ color: MUTED }}>WIDA</dt>
          <dd className="m-0">{facts.wida ? `${facts.wida.level} ${facts.wida.name}` : '—'}</dd>
          <dt style={{ color: MUTED }}>Behavior</dt>
          <dd className="m-0">{facts.behaviorCount === 0 ? 'no notes this semester' : `${facts.behaviorCount} ${facts.behaviorCount === 1 ? 'note' : 'notes'} this semester`}</dd>
        </dl>
      </section>

      {noticings.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <H>What the app noticed</H>
          <ul className="m-0 pl-3.5 flex flex-col gap-1.5">
            {noticings.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </section>
      )}

      {(progress || previous) && (
        <section className="flex flex-col gap-2.5">
          <H>What parents already read</H>
          {[progress, previous].map((q, i) => q && (
            <figure key={i} className="m-0 pl-3 flex flex-col gap-1" style={{ borderLeft: `1px solid #C8CED8` }}>
              <figcaption className="text-[10.5px]" style={{ color: MUTED }}>{q.label}</figcaption>
              <blockquote className="m-0 font-display text-[13.5px] leading-[1.45] whitespace-pre-wrap" style={{ color: '#475569' }}>{q.text.length > 420 ? `${q.text.slice(0, 420).trimEnd()}…` : q.text}</blockquote>
            </figure>
          ))}
        </section>
      )}

      <p className="m-0 text-[11px]" style={{ color: MUTED }}>Level-test placement is left off this sheet on purpose.</p>
    </aside>
  )
}
