'use client'

import { useEffect, useMemo, useState } from 'react'
import { percentToLetter } from '@/lib/utils'
import { tierForScore, suggestBand, gradeBand, usageCounts, BANDS, type Band, type Pronoun, type Tier } from '@/lib/phrases'
import { loadPhraseBank, usablePhrases, AREA_LABEL, TIER_LABEL, type Phrase } from '@/lib/phraseBank'
import { leastUsedFirst, areaOrder, tierForBehaviorGrade, assembleComment, homeSentence } from '@/lib/commentBuilder'
import { wordCount, nextStepCount } from '@/lib/commentChecks'
import { fillPhrase } from '@/lib/phrases'
import { X } from 'lucide-react'

// ─── Build a comment ─────────────────────────────────────────────
// One screen, tick what applies, get a first draft. Each area opens on
// the tier the student's letter points to; behavior on the behavior
// grade; next steps on the ladder for the weakest area at the band the
// grade and WIDA level suggest. Sentences are offered least-used-first
// in this class, with the count shown. The preview at the bottom is the
// draft; the teacher edits it in the box afterwards.

const AREAS = ['reading', 'phonics', 'writing', 'speaking', 'language']
const TIERS: Tier[] = ['strong', 'on track', 'needs support']
const INK = '#1e293b', MUTED = '#64748b', RULE = '#DFE4EB'

export interface CommentBuilderProps {
  student: { id: string; name: string; pronoun: Pronoun | null; grade: number | null }
  scores: Record<string, number | null>
  behaviorGrade: string | null
  wida: number | null
  doc: 'report_card' | 'progress_report'
  classComments: string[]
  existingText: string
  onInsert: (text: string, mode: 'replace' | 'append') => void
  onClose: () => void
}

export default function CommentBuilder({ student, scores, behaviorGrade, wida, doc, classComments, existingText, onInsert, onClose }: CommentBuilderProps) {
  const [rows, setRows] = useState<Phrase[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tierPick, setTierPick] = useState<Record<string, Tier>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [opener, setOpener] = useState<string | null>(null)
  const [closer, setCloser] = useState<string | null>(null)
  const [bandPick, setBandPick] = useState<Band | null>(null)
  const [stepArea, setStepArea] = useState<string | null>(null)

  useEffect(() => { let on = true; loadPhraseBank().then(r => { if (!on) return; setRows(r.rows); setError(r.error); setLoading(false) }); return () => { on = false } }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const usable = useMemo(() => usablePhrases(rows, doc, gradeBand(student.grade)), [rows, doc, student.grade])
  const counts = useMemo(() => usageCounts(usable.filter(p => p.kind !== 'ladder'), classComments), [usable, classComments])
  const fill = (t: string) => fillPhrase(t, { name: student.name, pronoun: student.pronoun })
  const byId = useMemo(() => new Map(usable.map(p => [p.id, p])), [usable])

  const order = areaOrder(scores, AREAS)
  const graded = order.filter(a => scores[a] != null)
  const weakest = graded.length ? graded[graded.length - 1] : 'writing'
  const ladderArea = stepArea || weakest
  const band = bandPick || suggestBand(student.grade, wida, scores[weakest] ?? null)
  const tierOf = (area: string): Tier => tierPick[area] || (area === 'behavior' ? tierForBehaviorGrade(behaviorGrade) : (tierForScore(scores[area]) || 'on track'))

  const openers = useMemo(() => leastUsedFirst(usable.filter(p => p.kind === 'opener'), counts), [usable, counts])
  const closers = useMemo(() => leastUsedFirst(usable.filter(p => p.kind === 'closer'), counts), [usable, counts])
  useEffect(() => { if (opener == null && openers.length) setOpener(openers[0].id); if (closer == null && closers.length) setCloser(closers[0].id) }, [openers, closers]) // eslint-disable-line react-hooks/exhaustive-deps

  const sentences = (area: string, tier: Tier) => leastUsedFirst(usable.filter(p => p.kind === 'sentence' && p.area === area && p.tier === tier), counts)
  const ladder = usable.filter(p => p.kind === 'ladder' && p.area === ladderArea && p.band === band)
  const toggle = (k: string) => setChecked(c => ({ ...c, [k]: !c[k] }))

  const selection = useMemo(() => ({
    opener: opener ? byId.get(opener)?.text || null : null,
    areas: order.map(a => ({ area: a, sentences: usable.filter(p => p.kind === 'sentence' && p.area === a && checked[p.id]).map(p => p.text) })),
    behavior: usable.filter(p => p.kind === 'sentence' && p.area === 'behavior' && checked[p.id]).map(p => p.text),
    nextSteps: usable.filter(p => p.kind === 'ladder' && checked[`${p.id}:c`]).map(p => p.text),
    home: usable.flatMap(p => p.kind === 'ladder' ? [checked[`${p.id}:1`] && p.home1, checked[`${p.id}:2`] && p.home2].filter(Boolean) as string[] : []),
    closer: closer ? byId.get(closer)?.text || null : null,
  }), [opener, closer, checked, usable, byId, order])
  const draft = useMemo(() => assembleComment(selection, { name: student.name, pronoun: student.pronoun }), [selection, student.name, student.pronoun])
  const words = wordCount(draft)
  const steps = nextStepCount(draft)
  const ticked = Object.values(checked).filter(Boolean).length

  const Check = ({ k, text, count }: { k: string; text: string; count?: number }) => (
    <label className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 bg-white cursor-pointer" style={{ borderColor: checked[k] ? INK : RULE }}>
      <input type="checkbox" checked={!!checked[k]} onChange={() => toggle(k)} className="mt-[3px]" />
      <span className="flex-1 leading-[1.4]" style={{ color: INK }}>{text}</span>
      {count != null && count > 0 && <span className="text-[10.5px] whitespace-nowrap pt-0.5" style={{ color: MUTED }}>used {count}×</span>}
    </label>
  )
  const TierButtons = ({ area }: { area: string }) => (
    <span className="inline-flex gap-1">
      {TIERS.map(t => <button key={t} type="button" onClick={() => setTierPick(p => ({ ...p, [area]: t }))} className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium ${tierOf(area) === t ? 'bg-ink text-paper' : 'hover:bg-[#f1f5f9]'}`} style={tierOf(area) === t ? undefined : { color: MUTED }}>{TIER_LABEL[t]}</button>)}
    </span>
  )
  const Section = ({ title, aside, children }: { title: React.ReactNode; aside?: React.ReactNode; children: React.ReactNode }) => (
    <section className="flex flex-col gap-2">
      <h3 className="m-0 flex items-baseline justify-between gap-3 flex-wrap text-[13px] font-semibold" style={{ color: INK }}><span>{title}</span>{aside}</h3>
      {children}
    </section>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(27,24,18,0.45)' }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Build a comment for ${student.name}`} onClick={e => e.stopPropagation()}
        className="w-full max-w-[1100px] max-h-[92vh] flex flex-col rounded-xl shadow-xl overflow-hidden" style={{ background: '#f8f9fb', color: INK }}>
        <div className="flex items-center justify-between gap-4 px-5 py-3 bg-white" style={{ borderBottom: `1px solid ${RULE}` }}>
          <div>
            <h2 className="m-0 font-display text-[20px] leading-tight">Build a comment for {student.name}</h2>
            <p className="m-0 text-[11.5px]" style={{ color: MUTED }}>Tick what applies. The draft at the bottom is yours to edit in the box afterwards.{!student.pronoun && <span className="text-amber-800 font-semibold"> Pronoun not set yet, so sentences keep {'{his}'} until it is.</span>}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-9 h-9 grid place-items-center rounded hover:bg-[#f1f5f9]" style={{ color: '#475569' }}><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5 text-[12.5px]">
          {loading && <p className="m-0" style={{ color: MUTED }}>Loading the bank…</p>}
          {error && <p className="m-0 text-warn">{error}</p>}
          {!loading && !error && (<>
            <Section title="Opener">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {openers.map(p => (
                  <label key={p.id} className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 bg-white cursor-pointer" style={{ borderColor: opener === p.id ? INK : RULE }}>
                    <input type="radio" name="opener" checked={opener === p.id} onChange={() => setOpener(p.id)} className="mt-[3px]" />
                    <span className="flex-1 leading-[1.4]">{fill(p.text)}</span>
                    {(counts[p.id] || 0) > 0 && <span className="text-[10.5px] whitespace-nowrap pt-0.5" style={{ color: MUTED }}>used {counts[p.id]}×</span>}
                  </label>
                ))}
                <label className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer" style={{ color: MUTED }}><input type="radio" name="opener" checked={opener === ''} onChange={() => setOpener('')} /> No opener</label>
              </div>
            </Section>

            {order.map(a => {
              const tier = tierOf(a)
              const list = sentences(a, tier)
              const change = sentences(a, 'change over time')
              return (
                <Section key={a} title={<>{AREA_LABEL[a]}{scores[a] != null && <span className="font-display font-medium"> {percentToLetter(scores[a] as number)}</span>}{scores[a] == null && <span className="font-normal" style={{ color: MUTED }}> · not graded</span>}</>} aside={<TierButtons area={a} />}>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {list.map(p => <Check key={p.id} k={p.id} text={fill(p.text)} count={counts[p.id]} />)}
                    {change.map(p => <Check key={p.id} k={p.id} text={fill(p.text)} count={counts[p.id]} />)}
                    {list.length === 0 && change.length === 0 && <p className="m-0" style={{ color: MUTED }}>Nothing in the bank for this yet.</p>}
                  </div>
                </Section>
              )
            })}

            <Section title={<>Behavior{behaviorGrade && <span className="font-display font-medium"> {behaviorGrade}</span>}</>} aside={<TierButtons area="behavior" />}>
              {(() => {
                const tier = tierOf('behavior')
                const list = leastUsedFirst(usable.filter(p => p.kind === 'sentence' && p.area === 'behavior' && (p.tier === tier || p.tier === 'change over time')), counts)
                const cats = Array.from(new Set(list.map(p => p.category || 'Other')))
                return (
                  <div className="flex flex-col gap-2.5">
                    {cats.map(cat => (
                      <div key={cat}>
                        <div className="text-[10.5px] font-medium mb-1" style={{ color: MUTED }}>{cat}</div>
                        <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                          {list.filter(p => (p.category || 'Other') === cat).map(p => <Check key={p.id} k={p.id} text={fill(p.text)} count={counts[p.id]} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Section>

            <Section title={<>Next steps · <select value={ladderArea} onChange={e => setStepArea(e.target.value)} className="font-semibold bg-transparent border-0 underline underline-offset-2 cursor-pointer" aria-label="Area for next steps">{AREAS.map(a => <option key={a} value={a}>{AREA_LABEL[a]}</option>)}</select></>}
              aside={<span className="inline-flex gap-1">{BANDS.map(b => <button key={b} type="button" onClick={() => setBandPick(b)} className={`px-1.5 py-0.5 rounded text-[10.5px] font-medium ${band === b ? 'bg-ink text-paper' : 'hover:bg-[#f1f5f9]'}`} style={band === b ? undefined : { color: MUTED }}>{b}</button>)}</span>}>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                {ladder.map(p => (
                  <div key={p.id} className="flex flex-col gap-1.5 rounded-md border px-2.5 py-2 bg-white" style={{ borderColor: RULE }}>
                    <span className="text-[10.5px] font-semibold" style={{ color: MUTED }}>{p.rung}</span>
                    <Check k={`${p.id}:c`} text={fill(p.text)} />
                    {p.home1 && <Check k={`${p.id}:1`} text={fill(homeSentence(p.home1))} />}
                    {p.home2 && <Check k={`${p.id}:2`} text={fill(homeSentence(p.home2))} />}
                  </div>
                ))}
                {ladder.length === 0 && <p className="m-0" style={{ color: MUTED }}>No rungs for this band yet.</p>}
              </div>
              {!bandPick && <p className="m-0 text-[10.5px]" style={{ color: MUTED }}>Band suggested from grade{wida ? ' and WIDA level' : ''}; tap another to change it.</p>}
            </Section>

            <Section title="Closer">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                {closers.map(p => (
                  <label key={p.id} className="flex items-start gap-2 rounded-md border px-2.5 py-1.5 bg-white cursor-pointer" style={{ borderColor: closer === p.id ? INK : RULE }}>
                    <input type="radio" name="closer" checked={closer === p.id} onChange={() => setCloser(p.id)} className="mt-[3px]" />
                    <span className="flex-1 leading-[1.4]">{fill(p.text)}</span>
                    {(counts[p.id] || 0) > 0 && <span className="text-[10.5px] whitespace-nowrap pt-0.5" style={{ color: MUTED }}>used {counts[p.id]}×</span>}
                  </label>
                ))}
                <label className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer" style={{ color: MUTED }}><input type="radio" name="closer" checked={closer === ''} onChange={() => setCloser('')} /> No closer</label>
              </div>
            </Section>
          </>)}
        </div>

        <div className="px-5 py-3 bg-white flex flex-col gap-2.5" style={{ borderTop: `1px solid ${RULE}` }}>
          <div className="flex items-baseline justify-between gap-4 flex-wrap">
            <span className="text-[10px] tracking-[1.6px] uppercase font-semibold" style={{ color: MUTED }}>Draft</span>
            <span className="text-[11.5px] tabular-nums" style={{ color: MUTED }}>{ticked} ticked · {words} words · aim for about 200{steps >= 4 ? ` · ${steps} things to work on; parents remember one or two` : ''}</span>
          </div>
          <p className="m-0 max-h-[150px] overflow-y-auto whitespace-pre-wrap text-[13.5px] leading-[1.6] rounded-md px-3 py-2" style={{ background: '#fafaf8', border: `1px solid ${RULE}`, color: draft ? INK : MUTED }}>{draft || 'Tick sentences above and the draft appears here.'}</p>
          <div className="flex items-center justify-end gap-2 flex-wrap">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-[12.5px] border hover:bg-[#f1f5f9]" style={{ borderColor: '#C4BBA6', color: '#475569' }}>Cancel</button>
            {existingText.trim() ? (<>
              <button type="button" disabled={!draft} onClick={() => onInsert(draft, 'append')} className="px-3 py-2 rounded-lg text-[12.5px] font-semibold border hover:bg-[#f1f5f9] disabled:opacity-40" style={{ borderColor: INK, color: INK }}>Add to the end</button>
              <button type="button" disabled={!draft} onClick={() => onInsert(draft, 'replace')} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-40">Replace the comment</button>
            </>) : (
              <button type="button" disabled={!draft} onClick={() => onInsert(draft, 'replace')} className="px-4 py-2 rounded-lg text-[12.5px] font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-40">Put in the box</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
