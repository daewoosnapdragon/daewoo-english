'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { percentToLetter } from '@/lib/utils'
import { fillPhrase, tierForScore, suggestBand, gradeBand, usageCounts, BANDS, type Band, type Pronoun, type Tier } from '@/lib/phrases'
import { ChevronDown, ChevronRight, X } from 'lucide-react'

// ─── Phrases drawer ──────────────────────────────────────────────
// The comment bank beside the report card box. Closed by default; opens
// on the student's weakest and strongest areas with the tier their letter
// points to, then the next-step ladder for the weakest area on the band
// the student's grade and WIDA level suggest. Everything else is a
// collapsed group. A click puts the sentence at the cursor with the name
// and pronouns filled in; blanks stay as ____ for the teacher to finish.
// The grey count beside a sentence is how many comments in this class
// already contain it, so "not copied from another comment" is visible.

export interface Phrase {
  id: string; kind: 'sentence' | 'opener' | 'closer' | 'ladder'
  area: string | null; tier: Tier | null; category: string | null; grades: '1-2' | '3-5' | 'all'; doc: 'both' | 'mid' | 'end'
  audience: 'student' | 'parents' | null; band: Band | null; rung: string | null; text: string; home1: string | null; home2: string | null; sort_order: number
}

const AREA_LABEL: Record<string, string> = { reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language', behavior: 'Behavior' }
const TIER_LABEL: Record<Tier, string> = { strong: 'strong', 'on track': 'on track', 'needs support': 'working on it', 'change over time': 'change over time' }
const INK = '#1e293b', MUTED = '#64748b', RULE = '#DFE4EB'

let cache: Phrase[] | null = null
let cacheError: string | null = null
async function loadPhrases(): Promise<{ rows: Phrase[]; error: string | null }> {
  if (cache) return { rows: cache, error: null }
  if (cacheError) return { rows: [], error: cacheError }
  const { data, error } = await supabase.from('comment_phrases').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  if (error) { cacheError = error.code === '42P01' || /comment_phrases/.test(error.message || '') ? 'The phrase bank is not set up yet: run supabase/migration-comment-phrases.sql, then seed-comment-phrases.sql.' : error.message; return { rows: [], error: cacheError } }
  cache = (data || []) as Phrase[]
  return { rows: cache, error: null }
}

export interface PhrasesDrawerProps {
  student: { id: string; name: string; pronoun: Pronoun | null; grade: number | null }
  /** Percent per area, null when not graded; areas marked N/A are passed as null. */
  scores: Record<string, number | null>
  wida: number | null
  doc: 'report_card' | 'progress_report'
  /** Other students' comments in this class, for the usage counts. */
  classComments: string[]
  onInsert: (sentence: string) => void
  onClose: () => void
  className?: string
}

export default function PhrasesDrawer({ student, scores, wida, doc, classComments, onInsert, onClose, className = '' }: PhrasesDrawerProps) {
  const [rows, setRows] = useState<Phrase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [bandPick, setBandPick] = useState<Band | null>(null)

  useEffect(() => { let on = true; loadPhrases().then(r => { if (!on) return; setRows(r.rows); setError(r.error); setLoading(false) }); return () => { on = false } }, [])

  const fill = (t: string) => fillPhrase(t, { name: student.name, pronoun: student.pronoun })
  const gb = gradeBand(student.grade)
  const docOk = (p: Phrase) => p.doc === 'both' || (doc === 'report_card' ? p.doc === 'end' : p.doc === 'mid')
  const gradeOk = (p: Phrase) => p.grades === 'all' || p.grades === gb
  const usable = useMemo(() => rows.filter(p => docOk(p) && gradeOk(p)), [rows, doc, gb]) // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useMemo(() => usageCounts(usable.filter(p => p.kind !== 'ladder'), classComments), [usable, classComments])

  // The two areas to open on.
  const graded = Object.entries(scores).filter(([, v]) => v != null) as Array<[string, number]>
  const sorted = [...graded].sort((a, b) => a[1] - b[1])
  const weakest = sorted[0]?.[0] || null
  const strongest = sorted.length > 1 && sorted[sorted.length - 1][1] - sorted[0][1] >= 5 ? sorted[sorted.length - 1][0] : null
  const band = bandPick || suggestBand(student.grade, wida, sorted[0]?.[1] ?? null)

  const sentencesFor = (area: string, tier: Tier | null) => usable.filter(p => p.kind === 'sentence' && p.area === area && (tier == null || p.tier === tier))
  const toggle = (k: string) => setOpen(o => ({ ...o, [k]: !o[k] }))

  const Row = ({ p, text }: { p: Phrase; text?: string }) => {
    const shown = fill(text ?? p.text)
    const n = text ? 0 : counts[p.id] || 0
    return (
      <li className="flex items-start justify-between gap-2 rounded-md border px-2.5 py-2 bg-white" style={{ borderColor: RULE }}>
        <button type="button" onClick={() => onInsert(shown)} className="text-left leading-[1.45] hover:underline underline-offset-2" style={{ color: INK }}>{shown}</button>
        {!text && <span className="text-[10.5px] whitespace-nowrap pt-0.5" style={{ color: MUTED }}>{n === 0 ? '' : `used ${n}×`}</span>}
      </li>
    )
  }
  const AreaBlock = ({ area, tierOverride }: { area: string; tierOverride?: Tier | null }) => {
    const score = scores[area] ?? null
    const tier = tierOverride === undefined ? tierForScore(score) : tierOverride
    const list = sentencesFor(area, tier)
    const change = tier ? sentencesFor(area, 'change over time') : []
    return (
      <section className="flex flex-col gap-1.5">
        <h3 className="m-0 flex items-baseline justify-between text-[12.5px] font-semibold" style={{ color: INK }}>
          <span>{AREA_LABEL[area] || area}{score != null && <span className="font-display font-medium"> {percentToLetter(score)}</span>}</span>
          {tier && <span className="text-[10.5px] font-medium" style={{ color: MUTED }}>{TIER_LABEL[tier]}</span>}
        </h3>
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {list.map(p => <Row key={p.id} p={p} />)}
          {change.map(p => <Row key={p.id} p={p} />)}
          {list.length === 0 && change.length === 0 && <li className="text-[11.5px]" style={{ color: MUTED }}>Nothing in the bank for this yet.</li>}
        </ul>
      </section>
    )
  }
  const Group = ({ k, title, count, children }: { k: string; title: string; count: number; children: React.ReactNode }) => (
    <div>
      <button type="button" onClick={() => toggle(k)} aria-expanded={!!open[k]} className="w-full flex items-center justify-between gap-2 py-1.5 text-[12.5px] min-h-[32px]" style={{ color: '#475569' }}>
        <span className="inline-flex items-center gap-1">{open[k] ? <ChevronDown size={13} /> : <ChevronRight size={13} />} {title}</span>
        <span style={{ color: MUTED }}>{count}</span>
      </button>
      {open[k] && <div className="pb-2 pl-1">{children}</div>}
    </div>
  )

  // Search across everything usable.
  const needle = q.trim().toLowerCase()
  const hits = needle ? usable.filter(p => fill(p.text).toLowerCase().includes(needle) || (p.home1 || '').toLowerCase().includes(needle) || (p.home2 || '').toLowerCase().includes(needle)).slice(0, 40) : []

  const ladderArea = weakest || 'writing'
  const ladder = usable.filter(p => p.kind === 'ladder' && p.area === ladderArea && p.band === band)
  const otherAreas = Object.keys(AREA_LABEL).filter(a => a !== 'behavior' && a !== weakest && a !== strongest)
  const behaviorCats = Array.from(new Set(usable.filter(p => p.area === 'behavior').map(p => p.category || 'Other')))

  return (
    <aside aria-label="Phrases" className={`flex-[0_1_300px] min-w-[250px] flex flex-col gap-3.5 text-[12.5px] pl-6 ${className}`} style={{ borderLeft: `1px solid ${RULE}`, color: INK }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="m-0 text-[10px] tracking-[1.6px] uppercase font-semibold" style={{ color: MUTED }}>Phrases for {student.name}</h2>
        <button type="button" onClick={onClose} aria-label="Close phrases" className="w-8 h-8 grid place-items-center rounded hover:bg-[#f1f5f9]" style={{ color: '#475569' }}><X size={15} /></button>
      </div>
      {!student.pronoun && <p className="m-0 text-[11.5px] rounded-md px-2.5 py-2 bg-amber-50 border border-amber-200 text-amber-900">Set {student.name}'s pronoun above the box first, so the sentences fill in.</p>}
      <label className="flex flex-col gap-1">
        <span className="text-[10.5px]" style={{ color: MUTED }}>Search all {usable.length} phrases</span>
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. homework, asks for help, vowel teams" className="px-2.5 py-1.5 border rounded-md text-[12.5px] outline-none focus:border-navy bg-white min-h-[34px]" style={{ borderColor: '#C4BBA6', color: INK }} />
      </label>

      {loading && <p className="m-0 text-[11.5px]" style={{ color: MUTED }}>Loading the bank…</p>}
      {error && <p className="m-0 text-[11.5px] text-warn">{error}</p>}

      {!loading && !error && needle && (
        <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
          {hits.map(p => p.kind === 'ladder'
            ? [<Row key={p.id + 'c'} p={p} text={p.text} />, p.home1 && <Row key={p.id + '1'} p={p} text={p.home1} />, p.home2 && <Row key={p.id + '2'} p={p} text={p.home2} />]
            : <Row key={p.id} p={p} />)}
          {hits.length === 0 && <li className="text-[11.5px]" style={{ color: MUTED }}>Nothing matches.</li>}
        </ul>
      )}

      {!loading && !error && !needle && (<>
        {weakest && <AreaBlock area={weakest} />}
        {strongest && <AreaBlock area={strongest} />}
        {!weakest && <p className="m-0 text-[11.5px]" style={{ color: MUTED }}>No grades yet, so nothing to open on. Everything is below.</p>}

        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 flex items-baseline justify-between text-[12.5px] font-semibold" style={{ color: INK }}>
            <span>Next steps · {AREA_LABEL[ladderArea]}</span>
            <span className="inline-flex gap-1">
              {BANDS.map(b => <button key={b} type="button" onClick={() => setBandPick(b)} className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium ${band === b ? 'bg-ink text-paper' : 'hover:bg-[#f1f5f9]'}`} style={band === b ? undefined : { color: MUTED }}>{b}</button>)}
            </span>
          </h3>
          <ul className="m-0 p-0 list-none flex flex-col gap-2">
            {ladder.map(p => (
              <li key={p.id} className="flex flex-col gap-1 rounded-md border px-2.5 py-2 bg-white" style={{ borderColor: RULE }}>
                <span className="text-[10.5px] font-semibold" style={{ color: MUTED }}>{p.rung}</span>
                <button type="button" onClick={() => onInsert(fill(p.text))} className="text-left leading-[1.45] hover:underline underline-offset-2" style={{ color: INK }}>{fill(p.text)}</button>
                {[p.home1, p.home2].filter(Boolean).map((h, i) => <button key={i} type="button" onClick={() => onInsert(fill(h!))} className="text-left leading-[1.45] hover:underline underline-offset-2" style={{ color: '#475569' }}><span style={{ color: MUTED }}>At home: </span>{fill(h!)}</button>)}
              </li>
            ))}
            {ladder.length === 0 && <li className="text-[11.5px]" style={{ color: MUTED }}>No rungs for this band yet.</li>}
          </ul>
          {!bandPick && <p className="m-0 text-[10.5px]" style={{ color: MUTED }}>Band suggested from grade{wida ? ' and WIDA level' : ''}; tap another to change it.</p>}
        </section>

        <section className="flex flex-col pt-2" style={{ borderTop: `1px solid ${RULE}` }}>
          <h3 className="m-0 mb-1 text-[10px] tracking-[1.6px] uppercase font-semibold" style={{ color: MUTED }}>Everything else</h3>
          <Group k="openers" title="Openers" count={usable.filter(p => p.kind === 'opener').length}>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">{usable.filter(p => p.kind === 'opener').map(p => <Row key={p.id} p={p} />)}</ul>
          </Group>
          <Group k="closers" title="Closers" count={usable.filter(p => p.kind === 'closer').length}>
            <ul className="m-0 p-0 list-none flex flex-col gap-1.5">{usable.filter(p => p.kind === 'closer').map(p => <Row key={p.id} p={p} />)}</ul>
          </Group>
          {otherAreas.map(a => (
            <Group key={a} k={a} title={AREA_LABEL[a]} count={sentencesFor(a, null).length}>
              <div className="flex flex-col gap-3">
                {(['strong', 'on track', 'needs support', 'change over time'] as Tier[]).map(tier => sentencesFor(a, tier).length > 0 && (
                  <div key={tier}>
                    <div className="text-[10.5px] font-medium mb-1" style={{ color: MUTED }}>{TIER_LABEL[tier]}</div>
                    <ul className="m-0 p-0 list-none flex flex-col gap-1.5">{sentencesFor(a, tier).map(p => <Row key={p.id} p={p} />)}</ul>
                  </div>
                ))}
              </div>
            </Group>
          ))}
          <Group k="behavior" title="Behavior" count={sentencesFor('behavior', null).length}>
            <div className="flex flex-col gap-3">
              {behaviorCats.map(cat => (
                <div key={cat}>
                  <div className="text-[10.5px] font-medium mb-1" style={{ color: MUTED }}>{cat}</div>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1.5">{usable.filter(p => p.area === 'behavior' && (p.category || 'Other') === cat).map(p => <Row key={p.id} p={p} />)}</ul>
                </div>
              ))}
            </div>
          </Group>
          <Group k="ladders" title="Next steps, every area and band" count={usable.filter(p => p.kind === 'ladder').length}>
            <div className="flex flex-col gap-3">
              {Object.keys(AREA_LABEL).filter(a => a !== 'behavior').map(a => (
                <div key={a}>
                  <div className="text-[10.5px] font-medium mb-1" style={{ color: MUTED }}>{AREA_LABEL[a]}</div>
                  <ul className="m-0 p-0 list-none flex flex-col gap-1.5">
                    {usable.filter(p => p.kind === 'ladder' && p.area === a).map(p => (
                      <li key={p.id} className="flex flex-col gap-0.5 rounded-md border px-2.5 py-2 bg-white" style={{ borderColor: RULE }}>
                        <span className="text-[10.5px]" style={{ color: MUTED }}>{p.band} · {p.rung}</span>
                        <button type="button" onClick={() => onInsert(fill(p.text))} className="text-left leading-[1.45] hover:underline underline-offset-2" style={{ color: INK }}>{fill(p.text)}</button>
                        {[p.home1, p.home2].filter(Boolean).map((h, i) => <button key={i} type="button" onClick={() => onInsert(fill(h!))} className="text-left leading-[1.45] hover:underline underline-offset-2" style={{ color: '#475569' }}><span style={{ color: MUTED }}>At home: </span>{fill(h!)}</button>)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Group>
        </section>
      </>)}

      <p className="m-0 text-[11px] leading-[1.5]" style={{ color: MUTED }}>A click puts the sentence at your cursor with the name and pronouns filled in. ____ is a blank to finish. The grey count is how many comments in this class already use it.</p>
    </aside>
  )
}
