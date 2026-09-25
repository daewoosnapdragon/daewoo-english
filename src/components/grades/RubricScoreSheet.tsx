'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { LEVEL_LABELS, LEVEL_LABELS_KO, LEVEL_ZERO_TEXT, LEVEL_ZERO_TEXT_KO, rubricScore, type RubricCriterion } from '@/components/curriculum/rubric-library'
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'

// ─── Rubric scoring ──────────────────────────────────────────────
// A full-screen page, no scrolling: students on the left, the rubric in the
// middle with one row per criterion and five buttons across it, each holding
// the number, its label and the descriptor, so the whole rubric is readable
// while you mark. A 0 is a real zero. The rail shows the class average per
// criterion so a class-wide weakness shows before the last paper.

interface StudentRow { id: string; english_name: string; korean_name: string }
type Flags = { absent: boolean; exempt: boolean }

interface Props {
  assessment: { id: string; name: string; max_score: number; rubric: { name: string; criteria: RubricCriterion[] } }
  students: StudentRow[]
  onSaved?: () => void
  onExit?: () => void
}

export default function RubricScoreSheet({ assessment, students, onSaved, onExit }: Props) {
  const { currentTeacher, language: lang, showToast } = useApp()
  const criteria = assessment.rubric.criteria
  const [levels, setLevels] = useState<Record<string, Record<string, number>>>({})
  const [flags, setFlags] = useState<Record<string, Flags>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [activeIdx, setActiveIdx] = useState(0)
  const [row, setRow] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const levelsRef = useRef(levels); levelsRef.current = levels
  const flagsRef = useRef(flags); flagsRef.current = flags
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const labels = lang === 'ko' ? LEVEL_LABELS_KO : LEVEL_LABELS
  const zeroText = lang === 'ko' ? LEVEL_ZERO_TEXT_KO : LEVEL_ZERO_TEXT

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('grades').select('student_id, rubric_scores, is_absent, is_exempt').eq('assessment_id', assessment.id)
      if (cancelled) return
      const l: Record<string, Record<string, number>> = {}
      const f: Record<string, Flags> = {}
      ;(data || []).forEach((g: any) => {
        if (g.rubric_scores && typeof g.rubric_scores === 'object') l[g.student_id] = g.rubric_scores
        if (g.is_absent || g.is_exempt) f[g.student_id] = { absent: !!g.is_absent, exempt: !!g.is_exempt }
      })
      setLevels(l); setFlags(f); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [assessment.id])

  const active = students[activeIdx]
  const mine = active ? (levels[active.id] || {}) : {}
  const marked = (sid: string) => Object.keys(levels[sid] || {}).length
  const complete = (sid: string) => flags[sid]?.absent || flags[sid]?.exempt || criteria.every(c => (levels[sid] || {})[c.key] != null)
  const scoreOf = (sid: string) => rubricScore(levels[sid] || {}, criteria.length, assessment.max_score)

  const touch = (sid: string) => setDirty(prev => { const n = new Set(prev); n.add(sid); return n })
  const setLevel = (key: string, v: number) => {
    if (!active) return
    setLevels(prev => ({ ...prev, [active.id]: { ...(prev[active.id] || {}), [key]: v } }))
    setFlags(prev => { const n = { ...prev }; delete n[active.id]; return n })
    touch(active.id)
  }
  const setFlag = (sid: string, which: 'absent' | 'exempt') => {
    setFlags(prev => { const cur = prev[sid]; const on = which === 'absent' ? !cur?.absent : !cur?.exempt; const n = { ...prev }; if (on) n[sid] = { absent: which === 'absent', exempt: which === 'exempt' }; else delete n[sid]; return n })
    touch(sid)
  }

  const saveStudents = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return true
    setSaving(true)
    const rows = ids.map(sid => {
      const fl = flagsRef.current[sid]
      if (fl?.absent || fl?.exempt) return { student_id: sid, assessment_id: assessment.id, score: null, rubric_scores: null, is_absent: !!fl.absent, is_exempt: !!fl.exempt, entered_by: currentTeacher?.id || null }
      const l = levelsRef.current[sid] || {}
      const any = Object.keys(l).length > 0
      return { student_id: sid, assessment_id: assessment.id, score: any ? rubricScore(l, criteria.length, assessment.max_score) : null, rubric_scores: any ? l : null, is_absent: false, is_exempt: false, entered_by: currentTeacher?.id || null }
    })
    const { error } = await supabase.from('grades').upsert(rows, { onConflict: 'student_id,assessment_id' })
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}${error.message.includes('rubric_scores') ? ' · run supabase/migration-rubrics.sql' : ''}`); return false }
    setDirty(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    onSaved?.()
    return true
  }, [assessment.id, assessment.max_score, criteria.length, currentTeacher?.id, showToast, onSaved])

  const saveAll = () => saveStudents(Array.from(dirtyRef.current))
  const goTo = async (idx: number) => {
    if (idx < 0 || idx >= students.length) return
    if (active && dirtyRef.current.has(active.id)) await saveStudents([active.id])
    setActiveIdx(idx); setRow(0)
  }
  const exit = async () => { if (dirtyRef.current.size) await saveStudents(Array.from(dirtyRef.current)); onExit?.() }

  useEffect(() => {
    const id = setInterval(() => { if (dirtyRef.current.size) saveStudents(Array.from(dirtyRef.current)) }, 30_000)
    const onLeave = (e: BeforeUnloadEvent) => { if (dirtyRef.current.size) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onLeave)
    return () => { clearInterval(id); window.removeEventListener('beforeunload', onLeave) }
  }, [saveStudents])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Escape') { exit(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setRow(r => Math.min(r + 1, criteria.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setRow(r => Math.max(r - 1, 0)); return }
      if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); goTo(e.shiftKey ? activeIdx - 1 : activeIdx + 1); return }
      const k = e.key.toUpperCase()
      if (k === 'X' && active) { setFlag(active.id, e.shiftKey ? 'exempt' : 'absent'); return }
      if (/^[0-4]$/.test(k) && criteria[row]) { setLevel(criteria[row].key, Number(k)); setRow(r => Math.min(r + 1, criteria.length - 1)) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const classAvg = useMemo(() => criteria.map(c => {
    const vals = students.map(s => levels[s.id]?.[c.key]).filter((v): v is number => v != null)
    return { key: c.key, label: c.label, n: vals.length, avg: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
  }), [criteria, students, levels])

  const doneCount = students.filter(s => complete(s.id)).length
  const tone = (v: number) => v === 0 ? 'bg-ink-3 border-ink-3 text-paper' : v === 1 ? 'bg-bad border-bad text-white' : v === 2 ? 'bg-warn border-warn text-white' : v === 3 ? 'bg-good border-good text-white' : 'bg-ink border-ink text-paper'
  const isOff = active ? !!(flags[active.id]?.absent || flags[active.id]?.exempt) : false

  return (
    <div className="fixed inset-0 z-[60] bg-paper flex flex-col">
      {/* Top bar */}
      <div className="h-12 px-5 border-b border-rule-2 bg-surface flex items-center gap-4 flex-shrink-0">
        <button onClick={exit} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink"><X size={14} />{lang === 'ko' ? '나가기' : 'Exit'}</button>
        <span className="font-display text-[18px] leading-none text-ink truncate">{assessment.name}</span>
        <span className="text-[12px] text-ink-3 truncate">{assessment.rubric.name} · {criteria.length} {lang === 'ko' ? '기준' : 'criteria'} · /{assessment.max_score}</span>
        <span className="ml-auto text-[12.5px] text-ink-2 tabular-nums">{doneCount} / {students.length} {lang === 'ko' ? '완료' : 'done'}</span>
        {dirty.size > 0 && <span className="text-[12px] text-warn">{dirty.size} {lang === 'ko' ? '명 미저장' : 'unsaved'}</span>}
        <button onClick={saveAll} disabled={saving || dirty.size === 0} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5">{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{lang === 'ko' ? '모두 저장' : 'Save all'}</button>
      </div>

      {loading ? <div className="flex-1 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div> : (
        <div className="flex-1 min-h-0 grid grid-cols-[210px_minmax(0,1fr)_230px]">
          {/* Students */}
          <div className="border-r border-rule-2 bg-paper-2 overflow-y-auto">
            {students.map((s, i) => {
              const fl = flags[s.id]; const done = complete(s.id); const part = !done && marked(s.id) > 0; const sc = scoreOf(s.id)
              return (
                <button key={s.id} onClick={() => goTo(i)} className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-[12.5px] border-b border-rule ${i === activeIdx ? 'bg-surface font-semibold shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-surface/60'}`}>
                  <span className="truncate text-ink">{s.english_name}</span>
                  <span className={`tabular-nums text-[11.5px] ${fl?.absent ? 'text-warn' : fl?.exempt ? 'text-info' : done ? 'text-good' : part ? 'text-warn' : 'text-ink-3'}`}>{fl?.absent ? 'ABS' : fl?.exempt ? 'EXM' : done && sc != null ? `${sc} ✓` : part ? `${sc ?? ''} ~` : ''}</span>
                </button>
              )
            })}
          </div>

          {/* The rubric */}
          <div className="min-h-0 flex flex-col px-8 py-4">
            {active && (
              <>
                <div className="flex items-center justify-between gap-3 mb-3 flex-shrink-0">
                  <h3 className="font-display text-[26px] leading-none text-ink">{active.english_name} <span className="font-sans text-[12px] text-ink-3 ml-1">{active.korean_name}</span></h3>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-[24px] tabular-nums text-ink">{flags[active.id]?.absent ? 'ABS' : flags[active.id]?.exempt ? 'EXM' : (scoreOf(active.id) ?? '—')} <span className="font-sans text-[12px] text-ink-3">/ {assessment.max_score}</span></span>
                    <button onClick={() => setFlag(active.id, 'absent')} className={`h-7 px-2 rounded border text-[11px] font-bold ${flags[active.id]?.absent ? 'bg-warn text-white border-warn' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>ABS</button>
                    <button onClick={() => setFlag(active.id, 'exempt')} className={`h-7 px-2 rounded border text-[11px] font-bold ${flags[active.id]?.exempt ? 'bg-info text-white border-info' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>EXM</button>
                  </div>
                </div>
                {isOff ? (
                  <p className="text-[13px] text-ink-3 py-6">{lang === 'ko' ? '결석/면제 처리됨. 점수를 표시하면 다시 채점됩니다.' : 'Marked absent or exempt. Choosing a level clears it.'}</p>
                ) : (
                  <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3 pr-1">
                    {criteria.map((c, i) => {
                      const v = mine[c.key]
                      const current = row === i
                      return (
                        <div key={c.key} onClick={() => setRow(i)} className={`rounded-md px-3 py-2.5 -mx-3 border ${current ? 'bg-paper-2 border-rule-2' : 'border-transparent'}`}>
                          <div className="flex items-baseline gap-2 mb-2">
                            <span className="text-[15px] font-semibold text-ink">{c.label}</span>
                            {c.standard && <span className="text-[11px] text-info">{c.standard}</span>}
                            {v != null && <span className="ml-auto text-[11.5px] text-ink-3">{labels[v]}</span>}
                          </div>
                          <div className="grid grid-cols-[76px_repeat(4,minmax(0,1fr))] gap-2">
                            {[0, 1, 2, 3, 4].map(n => {
                              const on = v === n
                              return (
                                <button key={n} onClick={e => { e.stopPropagation(); setRow(i); setLevel(c.key, n) }} title={n === 0 ? zeroText : undefined}
                                  className={`text-left rounded-md border px-3 py-2.5 flex flex-col gap-1 transition-colors ${n === 0 ? 'items-center justify-center' : ''} ${on ? tone(n) : 'bg-surface border-rule-2 text-ink hover:border-ink-3 hover:bg-paper-2/60'}`}>
                                  <span className="flex items-baseline gap-2"><span className="font-display text-[22px] tabular-nums leading-none">{n}</span>{n !== 0 && <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${on ? 'opacity-80' : 'text-ink-3'}`}>{labels[n]}</span>}</span>
                                  {n === 0 ? <span className={`text-[10.5px] font-semibold uppercase tracking-wider ${on ? 'opacity-80' : 'text-ink-3'}`}>{labels[0]}</span>
                                    : <span className={`text-[12.5px] leading-snug ${on ? 'opacity-95' : 'text-ink-2'}`}>{c.levels[n - 1]}</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-rule flex-shrink-0">
                  <button onClick={() => goTo(activeIdx - 1)} disabled={activeIdx === 0} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1"><ChevronLeft size={13} />{lang === 'ko' ? '이전' : 'Previous'}</button>
                  <span className="text-[11.5px] text-ink-3">0–4 {lang === 'ko' ? '표시 후 다음 기준' : 'mark and move down'} · ↑ ↓ · ⇥ / ↩ {lang === 'ko' ? '다음 학생' : 'next student'} · X {lang === 'ko' ? '결석' : 'absent'} · ⇧X {lang === 'ko' ? '면제' : 'exempt'} · Esc {lang === 'ko' ? '나가기' : 'exit'}</span>
                  <button onClick={() => goTo(activeIdx + 1)} disabled={activeIdx >= students.length - 1} className="h-8 px-3.5 rounded bg-ink text-paper text-[12.5px] font-semibold disabled:opacity-40 inline-flex items-center gap-1">{lang === 'ko' ? '다음 학생' : 'Next student'}<ChevronRight size={13} /></button>
                </div>
              </>
            )}
          </div>

          {/* Rail */}
          <div className="border-l border-rule-2 bg-paper-2 px-4 py-4 space-y-4 text-[12px] overflow-y-auto">
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '반 평균 (기준별)' : 'Class average so far'}</p>
              {classAvg.map(c => (
                <div key={c.key} className="grid grid-cols-[1fr_auto] gap-2 items-center py-1">
                  <span className="min-w-0"><span className="block text-ink truncate">{c.label}</span><span className="block h-1.5 bg-paper-3 rounded-sm overflow-hidden mt-1"><span className={`block h-full ${c.avg != null && c.avg < 2 ? 'bg-bad' : c.avg != null && c.avg < 3 ? 'bg-warn' : 'bg-good'}`} style={{ width: `${c.avg != null ? (c.avg / 4) * 100 : 0}%` }} /></span></span>
                  <span className="tabular-nums text-ink-2 text-right w-9">{c.avg != null ? c.avg.toFixed(1) : '—'}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '척도' : 'Scale'}</p>
              <p className="text-ink-2 leading-relaxed">0 {labels[0]} · 1 {labels[1]}<br />2 {labels[2]} · 3 {labels[3]} · 4 {labels[4]}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
