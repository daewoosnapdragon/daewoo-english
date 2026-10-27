'use client'

import { logActivity } from '@/lib/activity'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { parseScoreInput } from '@/lib/scoreInput'
import { domainColor, domainShort } from '@/lib/domainTone'
import { domainLabel } from '@/lib/utils'
import { Check, Eraser, Loader2, X } from 'lucide-react'

// ─── Points scoring ──────────────────────────────────────────────
// The third sheet: one total per student, typed straight down the list,
// with the same chrome as the answer sheet and the rubric sheet. A score is
// saved the moment you leave its box (Enter, Tab or ↓ moves down), so there
// is nothing to remember to press; Save all catches anything that failed.
// The rail shows the class as the numbers go in. A mixed paper entered this
// way splits its points across domains in proportion, marked ~.

interface StudentRow { id: string; english_name: string; korean_name: string }
type Flags = { absent: boolean; exempt: boolean }

interface Props {
  assessment: { id: string; name: string; max_score: number; domain?: string; mixed?: boolean; domain_split?: Record<string, number> | null }
  students: StudentRow[]
  /** The gradebook tab the sheet was opened from, so a mixed paper shows that domain's part first. */
  currentDomain?: string
  onSaved?: () => void
}

export default function PointsScoreSheet({ assessment, students, currentDomain, onSaved }: Props) {
  const { currentTeacher, language: lang, showToast, confirmDialog } = useApp()
  const ko = lang === 'ko'
  const max = Number(assessment.max_score) || 0
  const [scores, setScores] = useState<Record<string, number | null>>({})
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [flags, setFlags] = useState<Record<string, Flags>>({})
  const [parts, setParts] = useState<Record<string, Record<string, number> | null>>({})
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const scoresRef = useRef(scores); scoresRef.current = scores
  const flagsRef = useRef(flags); flagsRef.current = flags
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty
  const listRef = useRef<HTMLDivElement>(null)

  // A mixed paper's domains, this tab first.
  const partDomains = useMemo(() => assessment.mixed && assessment.domain_split
    ? Object.entries(assessment.domain_split).filter(([, v]) => Number(v) > 0).map(([d]) => d).sort((a, b) => (a === currentDomain ? -1 : b === currentDomain ? 1 : 0))
    : [], [assessment.mixed, assessment.domain_split, currentDomain])

  // ── Load what is already saved ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('grades').select('student_id, score, is_absent, is_exempt, domain_scores').eq('assessment_id', assessment.id)
      if (cancelled) return
      const s: Record<string, number | null> = {}
      const f: Record<string, Flags> = {}
      const p: Record<string, Record<string, number> | null> = {}
      ;(data || []).forEach((g: any) => {
        s[g.student_id] = g.score == null ? null : Number(g.score)
        p[g.student_id] = g.domain_scores || null
        if (g.is_absent || g.is_exempt) f[g.student_id] = { absent: !!g.is_absent, exempt: !!g.is_exempt }
      })
      scoresRef.current = s; flagsRef.current = f
      setScores(s); setFlags(f); setParts(p); setDrafts({}); setDirty(new Set()); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [assessment.id])

  // ── Save ──
  const saveStudents = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return true
    setSaving(true)
    const rows: any[] = []
    const gone: string[] = []
    for (const sid of ids) {
      const fl = flagsRef.current[sid]
      const sc = scoresRef.current[sid]
      if (fl?.absent || fl?.exempt) rows.push({ student_id: sid, assessment_id: assessment.id, score: null, is_absent: !!fl.absent, is_exempt: !!fl.exempt, entered_by: currentTeacher?.id || null })
      else if (sc != null) rows.push({ student_id: sid, assessment_id: assessment.id, score: sc, is_absent: false, is_exempt: false, entered_by: currentTeacher?.id || null })
      else gone.push(sid)
    }
    let error: { message: string } | null = null
    if (rows.length) ({ error } = await supabase.from('grades').upsert(rows, { onConflict: 'student_id,assessment_id' }))
    // An emptied box removes the grade row, so the averages forget it too.
    if (!error && gone.length) ({ error } = await supabase.from('grades').delete().eq('assessment_id', assessment.id).in('student_id', gone))
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return false }
    setDirty(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n })
    logActivity('scored', assessment.name, { key: assessment.id })
    onSaved?.()
    return true
  }, [assessment.id, currentTeacher?.id, showToast, onSaved])
  const saveAll = () => saveStudents(Array.from(dirtyRef.current))

  const markDirty = (sid: string) => { const d = new Set(dirtyRef.current); d.add(sid); dirtyRef.current = d; setDirty(d) }

  // Leaving a box: read what was typed, keep it, save it.
  const commit = (sid: string) => {
    const draft = drafts[sid]
    if (draft === undefined) return
    setDrafts(prev => { const n = { ...prev }; delete n[sid]; return n })
    const parsed = parseScoreInput(draft, max)
    if (parsed === undefined) { showToast(ko ? `"${draft}"은(는) 점수가 아닙니다` : `"${draft}" is not a score`); return }
    const hadFlag = !!flagsRef.current[sid]
    if (parsed === (scoresRef.current[sid] ?? null) && !(parsed != null && hadFlag)) return
    const next = { ...scoresRef.current, [sid]: parsed }
    scoresRef.current = next; setScores(next)
    if (parsed != null && hadFlag) { const f = { ...flagsRef.current }; delete f[sid]; flagsRef.current = f; setFlags(f) }
    markDirty(sid)
    saveStudents([sid])
  }
  const setFlag = (sid: string, which: 'absent' | 'exempt') => {
    const cur = flagsRef.current[sid]
    const on = which === 'absent' ? !cur?.absent : !cur?.exempt
    const f = { ...flagsRef.current }
    if (on) f[sid] = { absent: which === 'absent', exempt: which === 'exempt' }; else delete f[sid]
    flagsRef.current = f; setFlags(f)
    if (on) { const s = { ...scoresRef.current, [sid]: null }; scoresRef.current = s; setScores(s); setDrafts(prev => { const n = { ...prev }; delete n[sid]; return n }) }
    markDirty(sid)
    saveStudents([sid])
  }

  // ── Clear ──
  const hasAnything = (sid: string) => !!flags[sid] || scores[sid] != null
  const clearStudent = async (sid: string) => {
    const s = students.find(x => x.id === sid); if (!s) return
    const ok = await confirmDialog({ title: ko ? `${s.english_name} 점수 지우기` : `Clear ${s.english_name}'s score?`, message: ko ? '이 평가의 점수가 삭제됩니다. 되돌릴 수 없습니다.' : 'The saved score is removed. This cannot be undone.', danger: true, confirmLabel: ko ? '지우기' : 'Clear', cancelLabel: ko ? '취소' : 'Cancel' })
    if (!ok) return
    setSaving(true)
    const { error } = await supabase.from('grades').delete().eq('assessment_id', assessment.id).eq('student_id', sid)
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return }
    const sc = { ...scoresRef.current }; delete sc[sid]; scoresRef.current = sc; setScores(sc)
    const f = { ...flagsRef.current }; delete f[sid]; flagsRef.current = f; setFlags(f)
    setParts(prev => { const n = { ...prev }; delete n[sid]; return n })
    setDirty(prev => { const n = new Set(prev); n.delete(sid); return n })
    showToast(ko ? `${s.english_name} 점수를 지웠습니다` : `Cleared ${s.english_name}'s score`)
    onSaved?.()
  }
  const clearAll = async () => {
    const n = students.filter(s => hasAnything(s.id)).length
    if (n === 0) return
    const ok = await confirmDialog({ title: ko ? '모든 점수 지우기' : `Clear all ${n} scores?`, message: ko ? `"${assessment.name}"의 모든 점수가 삭제됩니다. 되돌릴 수 없습니다.` : `Every score, absence and exemption for "${assessment.name}" is removed for the whole class. This cannot be undone.`, danger: true, confirmLabel: ko ? '모두 지우기' : 'Clear all', cancelLabel: ko ? '취소' : 'Cancel' })
    if (!ok) return
    setSaving(true)
    const { error } = await supabase.from('grades').delete().eq('assessment_id', assessment.id)
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return }
    scoresRef.current = {}; flagsRef.current = {}
    setScores({}); setFlags({}); setParts({}); setDrafts({}); setDirty(new Set())
    showToast(ko ? '모든 점수를 지웠습니다' : `Cleared ${n} scores`)
    onSaved?.()
  }

  // Anything still unsaved goes every half minute, and on the way out.
  useEffect(() => {
    const id = setInterval(() => { if (dirtyRef.current.size) saveStudents(Array.from(dirtyRef.current)) }, 30_000)
    const onLeave = (e: BeforeUnloadEvent) => { if (dirtyRef.current.size) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', onLeave)
    return () => { clearInterval(id); window.removeEventListener('beforeunload', onLeave) }
  }, [saveStudents])

  // Enter, Tab or ↓ commits and moves down; ↑ moves up.
  const focusRow = (i: number) => listRef.current?.querySelector<HTMLInputElement>(`input[data-row="${i}"]`)?.focus()
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowDown') { e.preventDefault(); (e.target as HTMLInputElement).blur(); focusRow(i + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (e.target as HTMLInputElement).blur(); focusRow(i - 1) }
    else if (e.key === 'Escape') { setDrafts(prev => { const n = { ...prev }; delete n[students[i].id]; return n }); (e.target as HTMLInputElement).blur() }
  }
  // Start on the first empty box.
  useEffect(() => {
    if (loading) return
    const i = students.findIndex(s => scores[s.id] == null && !flags[s.id])
    if (i >= 0) focusRow(i)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading])

  // ── The class so far ──
  const stats = useMemo(() => {
    const vals = students.map(s => scores[s.id]).filter((v): v is number => v != null)
    const pct = (v: number) => max > 0 ? (v / max) * 100 : 0
    const bins = Array(10).fill(0) as number[]
    vals.forEach(v => { bins[Math.min(9, Math.max(0, Math.floor(pct(v) / 10)))]++ })
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
    return { n: vals.length, avg, hi: vals.length ? Math.max(...vals) : null, lo: vals.length ? Math.min(...vals) : null, below: vals.filter(v => pct(v) < 60).length, bins, pct }
  }, [students, scores, max])
  const doneCount = students.filter(s => scores[s.id] != null || flags[s.id]).length
  const fmt = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1).replace(/\.0$/, '')

  if (loading) return <div className="p-10 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-ink-2 tabular-nums">{doneCount} / {students.length} {ko ? '완료' : 'done'}</span>
          <span className="text-[11.5px] text-ink-3">{ko ? '↩ / ⇥ / ↓ 다음 학생 · 7/10 = 비율 입력' : 'Enter, Tab or ↓ for the next student · 7/10 enters a fraction of the total'}</span>
        </div>
        <div className="flex items-center gap-2">
          {dirty.size > 0 && <span className="text-[12px] text-warn">{dirty.size} {ko ? '명 미저장' : 'unsaved'}</span>}
          <button onClick={clearAll} disabled={saving || !students.some(s => hasAnything(s.id))} title={ko ? '반 전체의 점수를 지웁니다' : 'Remove every score for the whole class'} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-bad hover:border-bad disabled:opacity-40 disabled:hover:text-ink-2 disabled:hover:border-rule-2 inline-flex items-center gap-1.5"><Eraser size={13} />{ko ? '모두 지우기' : 'Clear all'}</button>
          <button onClick={saveAll} disabled={saving || dirty.size === 0} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5">{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '모두 저장' : 'Save all'}</button>
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_240px] border border-rule-2 rounded-lg overflow-hidden min-h-[420px]">
        {/* The list */}
        <div ref={listRef} className="overflow-y-auto max-h-[70vh]">
          <div className="grid items-center px-4 h-8 text-[10.5px] uppercase tracking-wider text-ink-3 font-semibold bg-paper-2 border-b border-rule-2" style={{ gridTemplateColumns: `28px minmax(0,1fr) 104px 60px ${partDomains.map(() => '76px').join(' ')} 132px` }}>
            <span>#</span><span>{ko ? '학생' : 'Student'}</span><span className="text-center">/{fmt(max)}</span><span className="text-right">%</span>
            {partDomains.map(d => <span key={d} className="text-center" style={{ color: domainColor(d) }} title={`${domainLabel(d)}: ${ko ? '이 영역 성적부에 반영되는 점수' : 'the points that count in this domain'}`}>{domainShort(d)} /{assessment.domain_split![d]}</span>)}
            <span />
          </div>
          {students.map((s, i) => {
            const fl = flags[s.id]
            const sc = scores[s.id]
            const draft = drafts[s.id]
            const pct = sc != null ? stats.pct(sc) : null
            const low = pct != null && pct < 60
            const over = sc != null && max > 0 && sc > max
            return (
              <div key={s.id} className={`grid items-center px-4 h-10 border-b border-rule text-[13px] ${fl?.absent ? 'opacity-60' : ''} ${fl?.exempt ? 'bg-info-soft/40' : ''}`} style={{ gridTemplateColumns: `28px minmax(0,1fr) 104px 60px ${partDomains.map(() => '76px').join(' ')} 132px` }}>
                <span className="text-ink-3 tabular-nums">{i + 1}</span>
                <span className="min-w-0 truncate"><span className="font-medium text-ink">{s.english_name}</span><span className="text-ink-3 ml-2 text-[12px]">{s.korean_name}</span></span>
                <span className="flex justify-center">
                  {fl?.absent ? <span className="text-[11px] font-bold text-warn">ABS</span> : fl?.exempt ? <span className="text-[11px] font-bold text-info">EXM</span> : (
                    <input data-row={i} type="text" inputMode="decimal" className={`score-input ${sc != null ? 'has-value' : ''} ${low || over ? 'error' : ''}`}
                      value={draft !== undefined ? draft : sc != null ? fmt(sc) : ''}
                      onChange={e => setDrafts(prev => ({ ...prev, [s.id]: e.target.value }))}
                      onFocus={e => { if (drafts[s.id] === undefined) setDrafts(prev => ({ ...prev, [s.id]: sc != null ? fmt(sc) : '' })); e.target.select() }}
                      onBlur={() => commit(s.id)} onKeyDown={e => onKey(e, i)} />
                  )}
                </span>
                <span className={`text-right tabular-nums text-[12px] ${fl ? 'text-ink-3' : low ? 'text-bad font-semibold' : over ? 'text-warn font-semibold' : pct != null ? 'text-ink' : 'text-ink-3'}`}>{fl || pct == null ? '—' : `${pct.toFixed(1)}%`}</span>
                {partDomains.map(d => {
                  // Saved per-domain points when the paper was marked item by item; otherwise a proportional estimate, marked ~.
                  const saved = parts[s.id]?.[d]
                  const possible = Number(assessment.domain_split![d] || 0)
                  const est = saved == null && sc != null && max > 0 ? Math.round(sc * (possible / max) * 10) / 10 : null
                  const v = saved != null ? Number(saved) : est
                  return <span key={d} className={`text-center tabular-nums text-[12px] ${d === currentDomain ? 'font-semibold' : ''}`} style={{ color: domainColor(d) }} title={saved == null && est != null ? (ko ? '문항별 채점이 없어 비례 추정' : 'Estimated in proportion: no item-by-item marks saved') : undefined}>{fl || v == null ? '—' : `${saved == null ? '~' : ''}${fmt(v)}/${fmt(possible)}`}</span>
                })}
                <span className="flex items-center justify-end gap-1">
                  <button onClick={() => setFlag(s.id, 'absent')} className={`h-7 px-2 rounded border text-[11px] font-bold ${fl?.absent ? 'bg-warn text-white border-warn' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>ABS</button>
                  <button onClick={() => setFlag(s.id, 'exempt')} className={`h-7 px-2 rounded border text-[11px] font-bold ${fl?.exempt ? 'bg-info text-white border-info' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>EXM</button>
                  <button onClick={() => clearStudent(s.id)} disabled={saving || !hasAnything(s.id)} title={ko ? '이 학생의 점수를 지웁니다' : 'Remove the saved score for this student'} className="h-7 w-7 rounded border border-rule-2 text-ink-3 hover:text-bad hover:border-bad disabled:opacity-40 disabled:hover:text-ink-3 disabled:hover:border-rule-2 inline-flex items-center justify-center"><X size={12} /></button>
                </span>
              </div>
            )
          })}
        </div>

        {/* Rail */}
        <div className="border-l border-rule-2 bg-paper-2 px-4 py-4 space-y-4 text-[12px] overflow-y-auto">
          <div>
            <p className="eyebrow mb-1.5">{ko ? '반 현황' : 'The class so far'}</p>
            {stats.n === 0 ? <p className="text-ink-3">{ko ? '아직 점수가 없습니다.' : 'No scores yet.'}</p> : (
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 tabular-nums">
                <span className="text-ink-3">{ko ? '평균' : 'Average'}</span><span className="text-ink font-semibold">{fmt(stats.avg!)} <span className="font-normal text-ink-2">· {stats.pct(stats.avg!).toFixed(1)}%</span></span>
                <span className="text-ink-3">{ko ? '최고' : 'High'}</span><span className="text-good">{fmt(stats.hi!)} <span className="text-ink-2">· {stats.pct(stats.hi!).toFixed(0)}%</span></span>
                <span className="text-ink-3">{ko ? '최저' : 'Low'}</span><span className={stats.pct(stats.lo!) < 60 ? 'text-bad' : 'text-ink'}>{fmt(stats.lo!)} <span className="text-ink-2">· {stats.pct(stats.lo!).toFixed(0)}%</span></span>
                <span className="text-ink-3">{ko ? '60% 미만' : 'Under 60%'}</span><span className={stats.below ? 'text-bad font-semibold' : 'text-ink-2'}>{stats.below}</span>
              </div>
            )}
          </div>
          {stats.n > 0 && (
            <div>
              <p className="eyebrow mb-1.5">{ko ? '분포' : 'Spread'}</p>
              <div className="flex items-end gap-[3px] h-14">
                {stats.bins.map((c, i) => {
                  const h = Math.max(...stats.bins, 1)
                  return <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" title={`${i * 10}–${i === 9 ? 100 : i * 10 + 9}%: ${c}`}>
                    {c > 0 && <span className="text-[9.5px] text-ink-3 tabular-nums leading-none">{c}</span>}
                    <div className={`w-full rounded-sm ${i < 6 ? 'bg-bad/70' : i < 8 ? 'bg-warn/70' : 'bg-good/70'}`} style={{ height: `${(c / h) * 40 + (c ? 2 : 0)}px` }} />
                  </div>
                })}
              </div>
              <div className="flex justify-between text-[9.5px] text-ink-3 mt-0.5"><span>0%</span><span>60%</span><span>100%</span></div>
            </div>
          )}
          {partDomains.length > 0 && (
            <p className="text-ink-3 leading-relaxed">{ko ? '총점만 입력하면 영역별 점수는 비례로 추정됩니다 (~). 정확한 영역별 점수는 답안지로 채점하세요.' : 'Typed as one total, a mixed paper splits its points across domains in proportion, marked ~. Mark the answer sheet for exact per-domain points.'}</p>
          )}
        </div>
      </div>
    </div>
  )
}
