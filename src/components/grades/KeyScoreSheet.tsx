'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import type { QuestionMapItem, ItemResponse } from '@/types'
import { isChoiceItem, markChoice } from '@/lib/answerKey'
import { rubricScore, LEVEL_LABELS, LEVEL_LABELS_KO, LEVEL_ZERO_TEXT, LEVEL_ZERO_TEXT_KO } from '@/components/curriculum/rubric-library'
import { splitEarned } from '@/lib/domainSplit'
import { CCSS_STANDARDS } from '@/components/curriculum/ccss-standards'
import { plainName } from '@/components/curriculum/standards-plain'
import AssessmentAnalysis from './AssessmentAnalysis'
import { BarChart3, Check, ChevronLeft, ChevronRight, Loader2, LayoutGrid, ListChecks } from 'lucide-react'

// ─── Answer sheet scoring ────────────────────────────────────────
// The same bubble sheet the written level test uses: one student at a time,
// A–D marks green or red against the key, written items take points, the
// keyboard drives it, and the rail shows the most-missed questions and the
// per-standard picture while papers are still coming in. Saves the same
// grades rows (score + item_responses) as before.

interface StudentRow { id: string; english_name: string; korean_name: string }
interface Resp { answer?: string; points?: number; levels?: Record<string, number> }
const hasRubric = (q: QuestionMapItem) => q.type === 'rubric' && !!q.rubric?.criteria?.length
type Flags = { absent: boolean; exempt: boolean }

interface Props {
  assessment: { id: string; name: string; max_score: number; question_map: QuestionMapItem[]; mixed?: boolean; domain?: string; english_class?: string }
  students: StudentRow[]
  onSaved?: () => void
}

export default function KeyScoreSheet({ assessment, students, onSaved }: Props) {
  const { currentTeacher, language: lang, showToast } = useApp()
  const map = assessment.question_map
  const letters = useMemo(() => map.some(q => q.answer_key === 'E') ? ['A', 'B', 'C', 'D', 'E'] : ['A', 'B', 'C', 'D'], [map])
  const [responses, setResponses] = useState<Record<string, Record<number, Resp>>>({})
  const [flags, setFlags] = useState<Record<string, Flags>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [activeIdx, setActiveIdx] = useState(0)
  const [focusedQ, setFocusedQ] = useState<number>(map[0]?.num || 1)
  // Inside a rubric item, which criterion the keyboard marks next.
  const [critIdx, setCritIdx] = useState(0)
  const levelLabels = lang === 'ko' ? LEVEL_LABELS_KO : LEVEL_LABELS
  const zeroText = lang === 'ko' ? LEVEL_ZERO_TEXT_KO : LEVEL_ZERO_TEXT
  const levelTone = (v: number) => v === 0 ? 'bg-ink-3 border-ink-3 text-paper' : v === 1 ? 'bg-bad border-bad text-white' : v === 2 ? 'bg-warn border-warn text-white' : v === 3 ? 'bg-good border-good text-white' : 'bg-ink border-ink text-paper'
  const [view, setView] = useState<'sheet' | 'grid' | 'analysis'>('sheet')
  // Hovering a column header on the class grid shows what the column is:
  // the question, its key and points, the standard in plain words, the
  // rubric criterion with its levels, and how the class did on it.
  type Crit = { key: string; label: string; levels: string[]; standard?: string }
  const [hover, setHover] = useState<null | { x: number; y: number; it: QuestionMapItem; crit?: Crit }>(null)
  const showHover = (e: React.MouseEvent<HTMLElement>, it: QuestionMapItem, crit?: Crit) => {
    const r = e.currentTarget.getBoundingClientRect()
    setHover({ x: Math.min(Math.max(r.left + r.width / 2, 170), window.innerWidth - 170), y: r.bottom, it, crit })
  }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const respRef = useRef(responses); respRef.current = responses
  const flagsRef = useRef(flags); flagsRef.current = flags
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty

  // ── Load what is already saved ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('grades').select('student_id, item_responses, is_absent, is_exempt').eq('assessment_id', assessment.id)
      if (cancelled) return
      const r: Record<string, Record<number, Resp>> = {}
      const f: Record<string, Flags> = {}
      ;(data || []).forEach((g: any) => {
        if (Array.isArray(g.item_responses)) {
          r[g.student_id] = {}
          g.item_responses.forEach((ir: any) => { if (ir.q != null && (ir.answer || ir.points != null || ir.levels)) r[g.student_id][ir.q] = { answer: ir.answer || undefined, points: ir.points ?? undefined, levels: ir.levels || undefined } })
        }
        if (g.is_absent || g.is_exempt) f[g.student_id] = { absent: !!g.is_absent, exempt: !!g.is_exempt }
      })
      setResponses(r); setFlags(f); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [assessment.id])

  const active = students[activeIdx]
  const mine = active ? (responses[active.id] || {}) : {}
  const q = (num: number) => map.find(x => x.num === num)!
  const answered = (sid: string, item: QuestionMapItem) => { const r = responses[sid]?.[item.num]; if (!r) return false; if (hasRubric(item)) return item.rubric!.criteria.every(c => r.levels?.[c.key] != null); return isChoiceItem(item) ? !!r.answer : r.points != null }
  const isComplete = (sid: string) => flags[sid]?.absent || flags[sid]?.exempt || map.every(it => answered(sid, it))
  const total = (sid: string) => { const r = responses[sid]; if (!r) return 0; return map.reduce((s, it) => s + (r[it.num]?.points || 0), 0) }
  const answeredCount = (sid: string) => map.filter(it => answered(sid, it)).length

  const touch = (sid: string) => setDirty(prev => { const n = new Set(prev); n.add(sid); return n })
  const setAnswer = (num: number, answer: string) => {
    if (!active) return
    const item = q(num)
    setResponses(prev => ({ ...prev, [active.id]: { ...(prev[active.id] || {}), [num]: { answer, points: markChoice(item, answer) } } }))
    setFlags(prev => { const n = { ...prev }; delete n[active.id]; return n })
    touch(active.id)
  }
  const setPoints = (num: number, pts: number | null) => {
    if (!active) return
    const item = q(num)
    const clamped = pts == null ? undefined : Math.max(0, Math.min(item.max_points, pts))
    setResponses(prev => ({ ...prev, [active.id]: { ...(prev[active.id] || {}), [num]: { points: clamped } } }))
    setFlags(prev => { const n = { ...prev }; delete n[active.id]; return n })
    touch(active.id)
  }
  const setCritLevel = (num: number, key: string, v: number) => {
    if (!active) return
    const item = q(num)
    setResponses(prev => {
      const cur = prev[active.id]?.[num] || {}
      const levels = { ...(cur.levels || {}), [key]: v }
      const points = rubricScore(levels, item.rubric!.criteria.length, item.max_points) ?? 0
      return { ...prev, [active.id]: { ...(prev[active.id] || {}), [num]: { levels, points } } }
    })
    setFlags(prev => { const n = { ...prev }; delete n[active.id]; return n })
    touch(active.id)
  }
  const setFlag = (sid: string, which: 'absent' | 'exempt') => {
    setFlags(prev => {
      const cur = prev[sid]
      const on = which === 'absent' ? !cur?.absent : !cur?.exempt
      const n = { ...prev }
      if (on) n[sid] = { absent: which === 'absent', exempt: which === 'exempt' }; else delete n[sid]
      return n
    })
    touch(sid)
  }

  // ── Save ──
  const saveStudents = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return true
    setSaving(true)
    const rows = ids.map(sid => {
      const fl = flagsRef.current[sid]
      if (fl?.absent || fl?.exempt) return { student_id: sid, assessment_id: assessment.id, score: null, item_responses: null, is_absent: !!fl.absent, is_exempt: !!fl.exempt, entered_by: currentTeacher?.id || null }
      const r = respRef.current[sid] || {}
      const item_responses: ItemResponse[] = map.map(it => {
        const resp = r[it.num]
        const correct = isChoiceItem(it) && resp?.answer ? resp.answer === it.answer_key : undefined
        return { q: it.num, type: it.type, answer: resp?.answer, correct, points: resp?.points || 0, max: it.max_points, standard: it.standard, ...(resp?.levels ? { levels: resp.levels } : {}) }
      })
      const score = item_responses.reduce((s, ir) => s + ir.points, 0)
      const anything = map.some(it => { const resp = r[it.num]; return resp && (resp.answer || resp.points != null || resp.levels) })
      const domain_scores = assessment.mixed && anything ? splitEarned(map, item_responses, assessment.domain || 'reading') : null
      return { student_id: sid, assessment_id: assessment.id, score: anything ? score : null, item_responses: anything ? item_responses : null, ...(assessment.mixed ? { domain_scores } : {}), is_absent: false, is_exempt: false, entered_by: currentTeacher?.id || null }
    })
    const { error } = await supabase.from('grades').upsert(rows, { onConflict: 'student_id,assessment_id' })
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return false }
    setDirty(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    onSaved?.()
    return true
  }, [assessment.id, map, currentTeacher?.id, showToast, onSaved])

  const saveAll = () => saveStudents(Array.from(dirtyRef.current))
  const goTo = async (idx: number) => {
    if (idx < 0 || idx >= students.length) return
    if (active && dirtyRef.current.has(active.id)) await saveStudents([active.id])
    setActiveIdx(idx); setFocusedQ(map[0]?.num || 1); setCritIdx(0)
  }

  // Autosave every 30 seconds, and warn before leaving with unsaved marks.
  useEffect(() => {
    const id = setInterval(() => { if (dirtyRef.current.size) saveStudents(Array.from(dirtyRef.current)) }, 30_000)
    const onLeave = (e: BeforeUnloadEvent) => { if (dirtyRef.current.size) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onLeave)
    return () => { clearInterval(id); window.removeEventListener('beforeunload', onLeave) }
  }, [saveStudents])

  // ── Keyboard ──
  useEffect(() => {
    if (view !== 'sheet') return
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const idx = map.findIndex(it => it.num === focusedQ)
      const next = () => { setCritIdx(0); if (idx < map.length - 1) setFocusedQ(map[idx + 1].num) }
      const cur = map[idx]
      const critCount = cur && hasRubric(cur) ? cur.rubric!.criteria.length : 0
      if (e.key === 'ArrowDown') { e.preventDefault(); if (critCount && critIdx < critCount - 1) setCritIdx(c => c + 1); else next(); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); if (critCount && critIdx > 0) setCritIdx(c => c - 1); else if (idx > 0) { const prevItem = map[idx - 1]; setFocusedQ(prevItem.num); setCritIdx(hasRubric(prevItem) ? prevItem.rubric!.criteria.length - 1 : 0) } return }
      if (e.key === 'Tab') { e.preventDefault(); goTo(e.shiftKey ? activeIdx - 1 : activeIdx + 1); return }
      if (e.key === 'Enter') { e.preventDefault(); goTo(activeIdx + 1); return }
      const k = e.key.toUpperCase()
      if (k === 'X' && active) { setFlag(active.id, e.shiftKey ? 'exempt' : 'absent'); return }
      const item = map[idx]
      if (!item) return
      if (hasRubric(item)) {
        if (/^[0-4]$/.test(k)) {
          const c = item.rubric!.criteria[critIdx]
          if (c) { setCritLevel(item.num, c.key, Number(k)); if (critIdx < item.rubric!.criteria.length - 1) setCritIdx(critIdx + 1); else next() }
        }
      } else if (isChoiceItem(item)) {
        const ok = item.type === 'true_false' ? ['T', 'F'] : letters
        if (ok.includes(k)) { setAnswer(item.num, k); next() }
      } else if (/^[0-9]$/.test(k) && item.max_points < 10) {
        setPoints(item.num, Number(k)); next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ── Analysis over the papers marked so far ──
  const analysis = useMemo(() => {
    const scored = students.filter(s => !flags[s.id]?.absent && !flags[s.id]?.exempt && answeredCount(s.id) > 0)
    const perQ = map.map(it => {
      const rs = scored.map(s => responses[s.id]?.[it.num]).filter(r => r && (isChoiceItem(it) ? r.answer : r.points != null)) as Resp[]
      const earned = rs.reduce((a, r) => a + (r.points || 0), 0)
      const possible = rs.length * it.max_points
      const missed = isChoiceItem(it) ? rs.filter(r => (r.points || 0) === 0).length : 0
      return { num: it.num, n: rs.length, pct: possible ? earned / possible : null, missed, choice: isChoiceItem(it) }
    })
    const perStd: Record<string, { earned: number; possible: number }> = {}
    map.forEach(it => {
      if (hasRubric(it)) {
        it.rubric!.criteria.forEach(c => {
          if (!c.standard) return
          scored.forEach(s => {
            const lv = responses[s.id]?.[it.num]?.levels?.[c.key]
            if (lv == null) return
            const e = (perStd[c.standard!] ||= { earned: 0, possible: 0 })
            e.earned += lv; e.possible += 4
          })
        })
        return
      }
      if (!it.standard) return
      scored.forEach(s => {
        const r = responses[s.id]?.[it.num]
        if (!r || (isChoiceItem(it) ? !r.answer : r.points == null)) return
        const e = (perStd[it.standard!] ||= { earned: 0, possible: 0 })
        e.earned += r.points || 0; e.possible += it.max_points
      })
    })
    const mostMissed = perQ.filter(x => x.n > 0 && x.pct != null).sort((a, b) => (a.pct! - b.pct!)).slice(0, 5)
    return { papers: scored.length, perQ, perStd, mostMissed }
  }, [responses, flags, students, map])

  const doneCount = students.filter(s => isComplete(s.id)).length
  const bubble = (on: boolean, tone: 'right' | 'wrong' | 'key' | 'plain') =>
    `w-7 h-7 rounded-full border text-[11px] font-bold flex items-center justify-center transition-colors ${
      tone === 'right' ? 'bg-good border-good text-white' : tone === 'wrong' ? 'bg-bad border-bad text-white' : tone === 'key' ? 'bg-good-soft border-good text-good' : on ? 'bg-ink border-ink text-paper' : 'border-rule-2 text-ink-2 hover:border-ink-3'}`

  if (loading) return <div className="p-10 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-ink-2 tabular-nums">{doneCount} / {students.length} {lang === 'ko' ? '완료' : 'done'}</span>
          <div data-guide="grades.views" className="inline-flex border border-rule-2 rounded overflow-hidden">
            <button onClick={() => setView('sheet')} className={`h-8 px-3 text-[12.5px] font-medium inline-flex items-center gap-1.5 ${view === 'sheet' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}><ListChecks size={13} />{lang === 'ko' ? '답안지' : 'Answer sheet'}</button>
            <button onClick={() => setView('grid')} className={`h-8 px-3 text-[12.5px] font-medium inline-flex items-center gap-1.5 border-l border-rule-2 ${view === 'grid' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}><LayoutGrid size={13} />{lang === 'ko' ? '반 전체' : 'Class grid'}</button>
            <button onClick={() => setView('analysis')} className={`h-8 px-3 text-[12.5px] font-medium inline-flex items-center gap-1.5 border-l border-rule-2 ${view === 'analysis' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}><BarChart3 size={13} />{lang === 'ko' ? '분석' : 'Analysis'}</button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty.size > 0 && <span className="text-[12px] text-warn">{dirty.size} {lang === 'ko' ? '명 미저장' : 'unsaved'}</span>}
          <button onClick={saveAll} disabled={saving || dirty.size === 0} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{lang === 'ko' ? '모두 저장' : 'Save all'}
          </button>
        </div>
      </div>

      {view === 'sheet' ? (
        <div className="grid grid-cols-[200px_minmax(0,1fr)_240px] border border-rule-2 rounded-lg overflow-hidden min-h-[420px]">
          {/* Students */}
          <div className="border-r border-rule-2 bg-paper-2 overflow-y-auto max-h-[70vh]">
            {students.map((s, i) => {
              const fl = flags[s.id]
              const done = isComplete(s.id)
              const part = !done && answeredCount(s.id) > 0
              return (
                <button key={s.id} onClick={() => goTo(i)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] border-b border-rule ${i === activeIdx ? 'bg-surface font-semibold shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-surface/60'}`}>
                  <span className="truncate text-ink">{s.english_name}</span>
                  <span className={`tabular-nums text-[11.5px] ${fl?.absent ? 'text-warn' : fl?.exempt ? 'text-info' : done ? 'text-good' : part ? 'text-warn' : 'text-ink-3'}`}>
                    {fl?.absent ? 'ABS' : fl?.exempt ? 'EXM' : done ? `${total(s.id)} ✓` : part ? `${total(s.id)} ~` : ''}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Sheet */}
          <div className="px-5 py-4 overflow-y-auto max-h-[70vh]">
            {active && (
              <>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-[22px] leading-none text-ink">{active.english_name} <span className="font-sans text-[12px] text-ink-3 ml-1">{active.korean_name}</span></h3>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-[22px] tabular-nums text-ink">{flags[active.id]?.absent ? 'ABS' : flags[active.id]?.exempt ? 'EXM' : total(active.id)} <span className="font-sans text-[12px] text-ink-3">/ {assessment.max_score}</span></span>
                    <button onClick={() => setFlag(active.id, 'absent')} className={`h-7 px-2 rounded border text-[11px] font-bold ${flags[active.id]?.absent ? 'bg-warn text-white border-warn' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>ABS</button>
                    <button onClick={() => setFlag(active.id, 'exempt')} className={`h-7 px-2 rounded border text-[11px] font-bold ${flags[active.id]?.exempt ? 'bg-info text-white border-info' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>EXM</button>
                  </div>
                </div>
                {(flags[active.id]?.absent || flags[active.id]?.exempt) ? (
                  <p className="text-[13px] text-ink-3 py-6">{flags[active.id]?.absent ? (lang === 'ko' ? '결석 처리됨. 답을 표시하면 다시 채점됩니다.' : 'Marked absent for this assessment. Marking an answer clears it.') : (lang === 'ko' ? '면제 처리됨.' : 'Exempt from this assessment. Marking an answer clears it.')}</p>
                ) : (
                  <div className="divide-y divide-rule">
                    {map.map(it => {
                      const r = mine[it.num]
                      const focused = focusedQ === it.num
                      return (
                        <div key={it.num} onClick={() => setFocusedQ(it.num)}
                          className={`grid grid-cols-[34px_minmax(0,1fr)_auto] gap-3 items-center py-1.5 -mx-2 px-2 rounded ${focused ? 'bg-paper-2' : ''}`}>
                          <span className="text-[11px] text-ink-3 tabular-nums">Q{it.num}</span>
                          {hasRubric(it) ? (
                            <div className="grid gap-2 py-1 min-w-0">
                              <span className="text-[11px] text-ink-3">{it.rubric!.name} · {r?.points ?? 0} / {it.max_points}</span>
                              {it.rubric!.criteria.map((c, ci) => {
                                const lv = r?.levels?.[c.key]
                                const cf = focused && critIdx === ci
                                return (
                                  <div key={c.key} onClick={e => { e.stopPropagation(); setFocusedQ(it.num); setCritIdx(ci) }} className={`rounded-md border px-2.5 py-2 -mx-1 ${cf ? 'bg-paper-3/60 border-rule-2' : 'border-transparent'}`}>
                                    <div className="flex items-baseline gap-2 mb-1.5">
                                      <span className="text-[13px] font-semibold text-ink">{c.label}</span>
                                      {c.standard && <span className="text-[11px] text-info">{c.standard}</span>}
                                      {lv != null && <span className="ml-auto text-[11px] text-ink-3">{levelLabels[lv]}</span>}
                                    </div>
                                    <div className="grid grid-cols-[56px_repeat(4,minmax(0,1fr))] gap-1.5">
                                      {[0, 1, 2, 3, 4].map(n => {
                                        const on = lv === n
                                        return (
                                          <button key={n} title={n === 0 ? zeroText : undefined} onClick={e => { e.stopPropagation(); setFocusedQ(it.num); setCritIdx(ci); setCritLevel(it.num, c.key, n) }}
                                            className={`text-left rounded border px-2 py-1.5 flex flex-col gap-0.5 min-w-0 ${n === 0 ? 'items-center justify-center' : ''} ${on ? levelTone(n) : 'bg-surface border-rule-2 text-ink hover:border-ink-3 hover:bg-paper-2/60'}`}>
                                            <span className="flex items-baseline gap-1.5"><span className="font-display text-[17px] tabular-nums leading-none">{n}</span>{n !== 0 && <span className={`text-[9.5px] font-semibold uppercase tracking-wider ${on ? 'opacity-80' : 'text-ink-3'}`}>{levelLabels[n]}</span>}</span>
                                            {n === 0 ? <span className={`text-[9.5px] font-semibold uppercase tracking-wider ${on ? 'opacity-80' : 'text-ink-3'}`}>{levelLabels[0]}</span>
                                              : <span className={`text-[11.5px] leading-snug ${on ? 'opacity-95' : 'text-ink-2'}`}>{c.levels[n - 1]}</span>}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : isChoiceItem(it) ? (
                            <div className="flex items-center gap-2 flex-wrap">
                              <div className="flex gap-1.5">
                                {(it.type === 'true_false' ? ['T', 'F'] : letters).map(L => {
                                  const chosen = r?.answer === L
                                  const isKey = it.answer_key === L
                                  const tone = chosen ? (isKey ? 'right' : 'wrong') : (r?.answer && isKey ? 'key' : 'plain')
                                  return <button key={L} onClick={e => { e.stopPropagation(); setFocusedQ(it.num); setAnswer(it.num, L) }} className={bubble(false, tone)}>{L}</button>
                                })}
                              </div>
                              {r?.answer && r.answer !== it.answer_key && <span className="text-[11px] text-ink-3">{lang === 'ko' ? '정답' : 'key'} {it.answer_key}</span>}
                              {it.max_points !== 1 && <span className="text-[11px] text-ink-3">{it.max_points} pt</span>}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {it.max_points <= 8 && Number.isInteger(it.max_points) && (
                                <div className="flex gap-1.5">
                                  {Array.from({ length: it.max_points + 1 }, (_, p) => (
                                    <button key={p} onClick={e => { e.stopPropagation(); setFocusedQ(it.num); setPoints(it.num, p) }} className={bubble(r?.points === p, r?.points === p ? (p === it.max_points ? 'right' : p === 0 ? 'wrong' : 'plain') : 'plain')}>{p}</button>
                                  ))}
                                </div>
                              )}
                              {/* Half points (2.5 / 5) and anything over 8 go in here. */}
                              <input type="number" min={0} max={it.max_points} step={0.5} value={r?.points ?? ''} onChange={e => setPoints(it.num, e.target.value === '' ? null : Number(e.target.value))} onFocus={() => setFocusedQ(it.num)} onClick={e => e.stopPropagation()}
                                className="w-16 h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] tabular-nums text-center" placeholder="2.5" />
                              <span className="text-[11px] text-ink-3">/ {it.max_points} · {it.type === 'rubric' ? (lang === 'ko' ? '루브릭' : 'rubric') : (lang === 'ko' ? '서술형' : 'written')}</span>
                            </div>
                          )}
                          <span className="text-[10.5px] text-info text-right">{it.standard || ''}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-rule">
                  <button onClick={() => goTo(activeIdx - 1)} disabled={activeIdx === 0} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1"><ChevronLeft size={13} />{lang === 'ko' ? '이전' : 'Previous'}</button>
                  <button onClick={() => goTo(activeIdx + 1)} disabled={activeIdx >= students.length - 1} className="h-8 px-3.5 rounded bg-ink text-paper text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1">{lang === 'ko' ? '다음 학생' : 'Next student'}<ChevronRight size={13} /></button>
                </div>
              </>
            )}
          </div>

          {/* Rail */}
          <div className="border-l border-rule-2 bg-paper-2 px-4 py-4 space-y-4 text-[12px] overflow-y-auto max-h-[70vh]">
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '가장 많이 틀린 문항' : 'Most missed so far'} · {analysis.papers}</p>
              {analysis.mostMissed.length === 0 ? <p className="text-ink-3">{lang === 'ko' ? '아직 채점된 답안이 없습니다.' : 'No papers marked yet.'}</p> : analysis.mostMissed.map(x => (
                <div key={x.num} className="grid grid-cols-[30px_1fr_44px] gap-2 items-center py-0.5">
                  <span className="tabular-nums text-ink-2">Q{x.num}</span>
                  <span className="h-2 bg-paper-3 rounded-sm overflow-hidden"><span className="block h-full bg-bad" style={{ width: `${(1 - (x.pct ?? 0)) * 100}%` }} /></span>
                  <span className="tabular-nums text-right text-ink-2">{x.choice ? `${x.missed}/${x.n}` : `${Math.round((x.pct ?? 0) * 100)}%`}</span>
                </div>
              ))}
            </div>
            {Object.keys(analysis.perStd).length > 0 && (
              <div>
                <p className="eyebrow mb-1.5">{lang === 'ko' ? '기준별' : 'By standard so far'}</p>
                {Object.entries(analysis.perStd).map(([code, v]) => (
                  <div key={code} className="grid grid-cols-[64px_1fr_40px] gap-2 items-center py-0.5">
                    <span className="text-info truncate">{code}</span>
                    <span className="h-2 bg-paper-3 rounded-sm overflow-hidden"><span className="block h-full bg-info" style={{ width: `${v.possible ? (v.earned / v.possible) * 100 : 0}%` }} /></span>
                    <span className="tabular-nums text-right text-ink-2">{v.possible ? Math.round((v.earned / v.possible) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            )}
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '키보드' : 'Keyboard'}</p>
              <p className="text-ink-2 leading-relaxed">{letters.join(' ')} · T F · 0–9 {lang === 'ko' ? '답 입력 후 다음 문항' : 'answer and move on'}<br />↑ ↓ {lang === 'ko' ? '문항 이동' : 'change question'} · ⇥ / ↩ {lang === 'ko' ? '다음 학생' : 'next student'}<br />X {lang === 'ko' ? '결석' : 'absent'} · ⇧X {lang === 'ko' ? '면제' : 'exempt'}</p>
            </div>
          </div>
        </div>
      ) : view === 'analysis' ? (
        <AssessmentAnalysis map={map} students={students} responses={responses} flags={flags} letters={letters} maxScore={assessment.max_score} englishClass={assessment.english_class} lang={lang} onOpenStudent={i => { if (i >= 0) { setActiveIdx(i); setView('sheet') } }} />
      ) : (
        <div className="border border-rule-2 rounded-lg overflow-auto max-h-[70vh]">
          <table className="text-[12px] tabular-nums border-collapse min-w-full">
            <thead className="sticky top-0 bg-paper-2 z-10">
              <tr>
                <th className="text-left px-3 py-2 eyebrow font-semibold border-b border-rule-2 min-w-[160px]">{lang === 'ko' ? '학생' : 'Student'}</th>
                {map.map(it => { const a = analysis.perQ.find(x => x.num === it.num)!; if (hasRubric(it)) return it.rubric!.criteria.map(c => {
                    const vals = students.map(s => responses[s.id]?.[it.num]?.levels?.[c.key]).filter((v): v is number => v != null)
                    const avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null
                    return (
                      <th key={`${it.num}-${c.key}`} className="px-1 py-2 border-b border-rule-2 text-center min-w-[44px] cursor-help" onMouseEnter={e => showHover(e, it, c)} onMouseLeave={() => setHover(null)}>
                        <span className="block text-[10.5px] text-ink-2 truncate max-w-[60px]">Q{it.num} · {c.label}</span>
                        <span className={`block text-[10px] ${avg != null && avg < 2 ? 'text-bad font-semibold' : 'text-ink-3'}`}>{avg != null ? avg.toFixed(1) : ''}</span>
                      </th>) }); return (
                  <th key={it.num} className="px-1 py-2 border-b border-rule-2 text-center min-w-[34px] cursor-help" onMouseEnter={e => showHover(e, it)} onMouseLeave={() => setHover(null)}>
                    <span className="block text-[10.5px] text-ink-2">Q{it.num}</span>
                    <span className={`block text-[10px] ${a.pct != null && a.pct < 0.6 ? 'text-bad font-semibold' : 'text-ink-3'}`}>{a.pct == null ? '' : `${Math.round(a.pct * 100)}%`}</span>
                  </th>) })}
                <th className="px-3 py-2 border-b border-rule-2 text-right eyebrow font-semibold">{lang === 'ko' ? '총점' : 'Total'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {students.map((s, i) => {
                const fl = flags[s.id]
                return (
                  <tr key={s.id} onClick={() => { setActiveIdx(i); setView('sheet') }} className="hover:bg-paper-2 cursor-pointer">
                    <td className="px-3 py-1.5 text-ink whitespace-nowrap">{s.english_name}</td>
                    {fl?.absent || fl?.exempt ? (
                      <td colSpan={map.reduce((n, it) => n + (hasRubric(it) ? it.rubric!.criteria.length : 1), 0)} className="px-3 py-1.5 text-ink-3 text-center">{fl.absent ? (lang === 'ko' ? '결석' : 'Absent') : (lang === 'ko' ? '면제' : 'Exempt')}</td>
                    ) : map.map(it => {
                      const r = responses[s.id]?.[it.num]
                      if (hasRubric(it)) return it.rubric!.criteria.map(c => {
                        const lv = r?.levels?.[c.key]
                        if (lv == null) return <td key={`${it.num}-${c.key}`} className="text-center text-ink-3 py-1.5">·</td>
                        return <td key={`${it.num}-${c.key}`} className="py-1 text-center"><span className={`inline-flex w-6 h-6 rounded items-center justify-center text-[11px] font-bold ${lv === 0 ? 'bg-paper-3 text-ink-2' : lv === 1 ? 'bg-bad-soft text-bad' : lv === 2 ? 'bg-warn-soft text-warn' : lv === 3 ? 'bg-good-soft text-good' : 'bg-ink text-paper'}`}>{lv}</span></td>
                      })
                      if (!r || (isChoiceItem(it) ? !r.answer : r.points == null)) return <td key={it.num} className="text-center text-ink-3 py-1.5">·</td>
                      if (isChoiceItem(it)) {
                        const ok = r.answer === it.answer_key
                        return <td key={it.num} className="py-1 text-center"><span className={`inline-flex w-6 h-6 rounded-full items-center justify-center text-[11px] font-bold ${ok ? 'bg-good-soft text-good' : 'bg-bad-soft text-bad'}`}>{r.answer}</span></td>
                      }
                      const frac = it.max_points ? (r.points || 0) / it.max_points : 0
                      return <td key={it.num} className={`py-1.5 text-center ${frac >= 1 ? 'text-good' : frac === 0 ? 'text-bad' : 'text-ink'}`}>{r.points}</td>
                    })}
                    <td className="px-3 py-1.5 text-right font-semibold text-ink">{fl?.absent || fl?.exempt ? '—' : answeredCount(s.id) ? total(s.id) : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {hover && (() => {
        const { it, crit } = hover
        const a = analysis.perQ.find(x => x.num === it.num)
        const std = crit ? crit.standard : it.standard
        const stdRow = std ? CCSS_STANDARDS.find(x => x.code === std) : null
        const scored = students.filter(s => !flags[s.id]?.absent && !flags[s.id]?.exempt)
        const typeName = it.type === 'mc' ? (lang === 'ko' ? '객관식' : 'Multiple choice') : it.type === 'true_false' ? (lang === 'ko' ? '참/거짓' : 'True / false') : it.type === 'rubric' ? (lang === 'ko' ? '루브릭' : 'Rubric') : it.type === 'open_ended' ? (lang === 'ko' ? '서술형' : 'Extended writing') : (lang === 'ko' ? '단답형' : 'Short answer')
        // Answer spread for choice items, so a popular wrong answer stands out.
        const dist = isChoiceItem(it) ? (it.type === 'true_false' ? ['T', 'F'] : letters).map(L => ({ L, n: scored.filter(s => responses[s.id]?.[it.num]?.answer === L).length })) : []
        const distTotal = dist.reduce((n, d) => n + d.n, 0)
        const critVals = crit ? scored.map(s => responses[s.id]?.[it.num]?.levels?.[crit.key]).filter((v): v is number => v != null) : []
        const critAvg = critVals.length ? critVals.reduce((x, y) => x + y, 0) / critVals.length : null
        return (
          <div className="fixed z-50 w-[340px] bg-surface border border-rule-2 rounded-md shadow-lg p-3.5 text-[12px] text-ink-2 pointer-events-none" style={{ left: hover.x, top: hover.y + 6, transform: 'translateX(-50%)' }}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[14px] font-semibold text-ink">Q{it.num}{crit ? ` · ${crit.label}` : ''}</span>
              <span className="text-ink-3">{crit ? `${it.rubric?.name || typeName} · 0–4` : `${typeName}${it.answer_key ? ` · ${lang === 'ko' ? '정답' : 'key'} ${it.answer_key}` : ''} · ${it.max_points} ${lang === 'ko' ? '점' : 'pt'}`}</span>
            </div>
            {std ? (
              <div className="mt-2 grid gap-0.5">
                <span><span className="font-mono text-[11px] text-info bg-info-soft px-1.5 py-0.5 rounded mr-1.5">{std}</span><span className="font-medium text-ink">{plainName(std)}</span></span>
                {stdRow?.text && <span className="text-[11.5px] text-ink-3 leading-snug">{stdRow.text}</span>}
              </div>
            ) : <p className="mt-2 text-ink-3">{lang === 'ko' ? '기준 태그 없음' : 'No standard tagged'}</p>}
            {crit && (
              <div className="mt-2 grid gap-0.5 text-[11.5px]">
                {crit.levels.map((t, i) => <span key={i} className="leading-snug"><span className="font-semibold text-ink tabular-nums">{i + 1}</span> <span className="text-ink-3">{levelLabels[i + 1]}:</span> {t}</span>)}
              </div>
            )}
            <div className="mt-2.5 pt-2 border-t border-rule flex items-center gap-3 flex-wrap">
              {crit
                ? <span>{critAvg != null ? <><span className={`font-semibold tabular-nums ${critAvg < 2 ? 'text-bad' : 'text-ink'}`}>{critAvg.toFixed(1)}</span> {lang === 'ko' ? `평균 · ${critVals.length}명` : `class average · ${critVals.length} scored`}{critVals.length ? ` · ${[0, 1, 2, 3, 4].map(n => `${n}:${critVals.filter(v => v === n).length}`).join(' ')}` : ''}</> : (lang === 'ko' ? '아직 채점 없음' : 'Nothing scored yet')}</span>
                : a && a.n > 0 && a.pct != null
                  ? <span><span className={`font-semibold tabular-nums ${a.pct < 0.6 ? 'text-bad' : 'text-ink'}`}>{Math.round(a.pct * 100)}%</span> {lang === 'ko' ? `정답률 · ${a.n}명` : `of points earned · ${a.n} scored`}</span>
                  : <span>{lang === 'ko' ? '아직 채점 없음' : 'Nothing scored yet'}</span>}
              {distTotal > 0 && (
                <span className="flex gap-1.5 ml-auto">
                  {dist.map(d => <span key={d.L} className={`inline-flex items-center gap-0.5 tabular-nums ${d.L === it.answer_key ? 'text-good font-semibold' : d.n && d.n >= Math.max(2, distTotal * 0.3) ? 'text-bad font-semibold' : 'text-ink-3'}`}>{d.L}<span className="text-[10.5px]">{d.n}</span></span>)}
                </span>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
