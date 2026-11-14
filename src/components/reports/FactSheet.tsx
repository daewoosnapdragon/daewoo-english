'use client'

import { useState } from 'react'
import type { LetterRow, RubricPiece } from '@/lib/factSheet'

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

export interface FactSheetQuote { text: string; label: string; /** Shown in full from the start (this semester's progress report). */ full?: boolean }

export interface FactSheetProps {
  rows: LetterRow[]
  /** Column heading for the change since the progress report; omitted when there was none. */
  sinceMidLabel: string | null
  /** Column heading for the change since the previous semester; omitted when there was none. */
  sinceLastLabel: string | null
  /** How the since-progress-report column was worked out; shown under the table. */
  sinceMidNote?: string | null
  facts: FactSheetFacts
  noticings: string[]
  /** Every rubric-scored piece this semester, newest first. */
  rubrics: RubricPiece[]
  /** Every comment parents have already read, newest first. */
  quotes: FactSheetQuote[]
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

function Quote({ q }: { q: FactSheetQuote }) {
  const [open, setOpen] = useState(!!q.full)
  const long = q.text.length > 220
  return (
    <figure className="m-0 pl-3 flex flex-col gap-1" style={{ borderLeft: '1px solid #C8CED8' }}>
      <figcaption className="text-[10.5px]" style={{ color: MUTED }}>{q.label}</figcaption>
      <blockquote className="m-0 font-display text-[13.5px] leading-[1.45] whitespace-pre-wrap" style={{ color: '#475569' }}>{open || !long ? q.text : `${q.text.slice(0, 220).trimEnd()}…`}</blockquote>
      {long && <button type="button" onClick={() => setOpen(o => !o)} className="self-start text-[11px] underline underline-offset-2" style={{ color: MUTED }}>{open ? 'Show less' : 'Show all'}</button>}
    </figure>
  )
}

function RubricRow({ p }: { p: RubricPiece }) {
  const [open, setOpen] = useState(false)
  const hasText = p.criteria.some(c => c.descriptor)
  return (
    <li className="flex flex-col gap-1">
      <button type="button" onClick={() => hasText && setOpen(o => !o)} aria-expanded={open} className={`text-left ${hasText ? 'cursor-pointer' : 'cursor-default'}`} style={{ color: INK }}>
        <span className="font-medium">{p.name}</span>{p.date && <span style={{ color: MUTED }}>, <MonthDay iso={p.date} /></span>}
        <span style={{ color: MUTED }}> · {p.earned}/{p.possible}</span>
        <span className="block" style={{ color: '#475569' }}>{p.criteria.filter(c => c.score != null).map(c => `${c.label} ${c.score}`).join(', ')}{hasText && <span className="underline underline-offset-2 ml-1.5 text-[11px]" style={{ color: MUTED }}>{open ? 'hide' : 'what the rubric says'}</span>}</span>
      </button>
      {open && (
        <dl className="m-0 ml-2 pl-2.5 grid gap-y-1.5" style={{ borderLeft: '1px solid #C8CED8' }}>
          {p.criteria.filter(c => c.score != null).map(c => (
            <div key={c.key}>
              <dt className="text-[11px] font-semibold" style={{ color: '#475569' }}>{c.label} · {c.score}{c.standard && <span className="font-normal" style={{ color: MUTED }}> · {c.standard}</span>}</dt>
              <dd className="m-0 text-[12px] leading-[1.45]" style={{ color: INK }}>{c.descriptor || (c.score === 0 ? 'Level 0: not attempted.' : 'This rubric has no descriptor for this level.')}</dd>
            </div>
          ))}
        </dl>
      )}
    </li>
  )
}

export default function FactSheet({ rows, sinceMidLabel, sinceLastLabel, sinceMidNote, facts, noticings, rubrics, quotes, className = '' }: FactSheetProps) {
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
        {sinceMidNote && <p className="m-0 text-[10.5px] leading-snug" style={{ color: MUTED }}>{sinceMidNote}</p>}
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

      {rubrics.length > 0 && (
        <section className="flex flex-col gap-1.5">
          <H>Rubrics this semester</H>
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {rubrics.map(p => <RubricRow key={p.assessmentId} p={p} />)}
          </ul>
        </section>
      )}

      {quotes.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <H>What parents already read</H>
          {quotes.map((q, i) => <Quote key={i} q={q} />)}
        </section>
      )}

    </aside>
  )
}
