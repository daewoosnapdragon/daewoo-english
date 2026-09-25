'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { WIDA_DOMAINS, type WIDADomainKey } from '@/lib/wida'
import { invalidateWIDACache } from '@/components/shared/WIDABadge'
import { WIDA_CAN_DO, LEVELS, suggestLevel, ticksThrough, ticksClearFrom, widaBandForGrade, widaLevelName, type Level } from '@/components/curriculum/wida-cando'
import { Check, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'

// ─── Assess the class ────────────────────────────────────────────
// The whole class's questionnaires as one sitting: students down the left,
// one domain at a time in the middle, Enter saves and moves to the next
// section (then the next student). 1–6 tick everything through that level.
// Moving away from a changed section saves it, so nothing is lost by
// clicking around.

interface StudentRow { id: string; english_name: string; korean_name: string }
interface Props { students: StudentRow[]; grade: number; startStudentId?: string | null; onExit: () => void; onSaved?: () => void }

const DOMAIN_LABEL: Record<WIDADomainKey, [string, string]> = { listening: ['Listening', '듣기'], speaking: ['Speaking', '말하기'], reading: ['Reading', '읽기'], writing: ['Writing', '쓰기'] }
const TONE: Record<number, string> = { 1: 'text-bad', 2: 'text-warn', 3: 'text-warn', 4: 'text-good', 5: 'text-good', 6: 'text-ink' }
const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && Array.from(a).every(x => b.has(x))

export default function WidaAssessSheet({ students, grade, startStudentId, onExit, onSaved }: Props) {
  const { currentTeacher, language: lang, showToast, activeSemester } = useApp()
  const ko = lang === 'ko'
  const band = widaBandForGrade(grade)
  const [levels, setLevels] = useState<Record<string, Record<string, number>>>({})
  const [ticks, setTicks] = useState<Record<string, Record<string, Set<string>>>>({})
  const [loading, setLoading] = useState(true)
  const [candoMissing, setCandoMissing] = useState(false)
  const [idx, setIdx] = useState(() => Math.max(0, students.findIndex(s => s.id === startStudentId)))
  const [domIdx, setDomIdx] = useState(0)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [override, setOverride] = useState<number | null>(null)
  const [ovText, setOvText] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const student = students[idx]
  const domain = WIDA_DOMAINS[domIdx]
  const dl = (d: WIDADomainKey) => DOMAIN_LABEL[d][ko ? 1 : 0]

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ids = students.map(s => s.id)
      const [lv, cd] = await Promise.all([
        supabase.from('student_wida_levels').select('student_id, domain, wida_level').in('student_id', ids),
        supabase.from('student_wida_cando').select('student_id, domain, ticked').in('student_id', ids),
      ])
      if (cancelled) return
      const l: Record<string, Record<string, number>> = {}; (lv.data || []).forEach((r: any) => { (l[r.student_id] ||= {})[r.domain] = Number(r.wida_level) })
      const t: Record<string, Record<string, Set<string>>> = {}; (cd.data || []).forEach((r: any) => { (t[r.student_id] ||= {})[r.domain] = new Set(r.ticked || []) })
      if (cd.error) setCandoMissing(true)
      setLevels(l); setTicks(t); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [students])

  // Load the draft whenever the section changes.
  useEffect(() => {
    if (loading || !student) return
    setDraft(new Set(ticks[student.id]?.[domain] || [])); setOverride(null)
    scrollRef.current?.scrollTo({ top: 0 })
  }, [loading, idx, domIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  const suggestion = useMemo(() => suggestLevel(domain, band, draft), [domain, band, draft])
  const stored = student ? levels[student.id]?.[domain] : undefined
  // With no ticks yet, the stored level (if any) stands; otherwise the ticks decide.
  const chosen: number = override ?? (draft.size === 0 && stored ? stored : suggestion.decimal)
  useEffect(() => { setOvText(String(chosen)) }, [chosen])
  const dirty = !!student && (chosen !== stored || !sameSet(draft, ticks[student.id]?.[domain] || new Set()))
  const commitOverride = () => { const n = Math.round(parseFloat(ovText) * 10) / 10; if (Number.isFinite(n) && n >= 1 && n <= 6) setOverride(n); else setOvText(String(chosen)) }

  const save = useCallback(async (): Promise<boolean> => {
    if (!student || !dirty) return true
    setSaving(true)
    const now = new Date().toISOString()
    const [a, b, c] = await Promise.all([
      supabase.from('student_wida_levels').upsert({ student_id: student.id, domain, wida_level: chosen, updated_by: currentTeacher?.id || null, updated_at: now }, { onConflict: 'student_id,domain' }),
      candoMissing ? Promise.resolve({ error: null }) : supabase.from('student_wida_cando').upsert({ student_id: student.id, domain, ticked: Array.from(draft), updated_by: currentTeacher?.id || null, updated_at: now }, { onConflict: 'student_id,domain' }),
      stored === chosen ? Promise.resolve({ error: null }) : supabase.from('student_wida_history').insert({ student_id: student.id, domain, wida_level: chosen, recorded_by: currentTeacher?.id || null, semester_id: activeSemester?.id || null }),
    ])
    setSaving(false)
    const err = (a as any).error || (b as any).error || (c as any).error
    if (err) { showToast(`Error: ${err.message}${/student_wida_cando/.test(err.message) ? ' · run supabase/migration-wida-cando.sql' : /numeric|integer|invalid input/.test(err.message) ? ' · run supabase/migration-wida-decimals.sql' : ''}`); return false }
    setLevels(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), [domain]: chosen } }))
    setTicks(prev => ({ ...prev, [student.id]: { ...(prev[student.id] || {}), [domain]: new Set(draft) } }))
    setLastSaved(`${student.english_name} · ${dl(domain)} ${chosen}`)
    invalidateWIDACache(); onSaved?.()
    return true
  }, [student, dirty, domain, chosen, draft, stored, candoMissing, currentTeacher, activeSemester, showToast, onSaved]) // eslint-disable-line react-hooks/exhaustive-deps

  const goTo = async (i: number, d: number) => {
    if (i < 0 || i >= students.length || d < 0 || d > 3) return
    if (!(await save())) return
    setIdx(i); setDomIdx(d)
  }
  const next = async () => {
    if (domIdx < 3) return goTo(idx, domIdx + 1)
    if (idx < students.length - 1) return goTo(idx + 1, 0)
    if (await save()) showToast(ko ? '마지막 학생까지 완료' : 'That was the last student. All saved.')
  }
  const prev = () => domIdx > 0 ? goTo(idx, domIdx - 1) : goTo(idx - 1, 3)
  const exit = async () => { if (await save()) onExit() }

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      if (e.key === 'Enter') { e.preventDefault(); next(); return }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(idx, domIdx + 1); return }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(idx, domIdx - 1); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); goTo(idx + 1, domIdx); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); goTo(idx - 1, domIdx); return }
      if (e.key === 'Escape') { e.preventDefault(); exit(); return }
      if (/^[1-6]$/.test(e.key)) { e.preventDefault(); setDraft(ticksThrough(domain, band, Number(e.key) as Level, draft)); setOverride(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  })

  const doneCount = (sid: string) => WIDA_DOMAINS.filter(d => levels[sid]?.[d]).length
  const fully = students.filter(s => doneCount(s.id) === 4).length
  const overall = student ? (() => { const v = WIDA_DOMAINS.map(d => levels[student.id]?.[d]).filter((x): x is number => !!x); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null })() : null

  if (loading) return <div className="p-10 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
  if (!student) return <div className="p-10 text-center text-[13px] text-ink-3">{ko ? '학생이 없습니다.' : 'No students in this class.'}</div>

  return (
    <div className="grid grid-cols-[210px_minmax(0,1fr)_240px] border border-rule-2 rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 220px)', minHeight: 520 }}>
      {/* Students */}
      <div className="border-r border-rule-2 bg-paper-2 overflow-y-auto">
        <div className="px-3 py-2.5 border-b border-rule-2 flex items-center justify-between"><span className="eyebrow">{ko ? '학생' : 'Students'}</span><span className="text-[11px] text-ink-3 tabular-nums">{fully}/{students.length}</span></div>
        {students.map((s, i) => {
          const on = i === idx
          return (
            <button key={s.id} onClick={() => goTo(i, 0)} className={`w-full text-left px-3 py-2 border-b border-rule flex items-center gap-2 ${on ? 'bg-surface border-l-2 border-l-accent' : 'border-l-2 border-l-transparent hover:bg-surface/60'}`}>
              <span className={`flex-1 truncate text-[13px] ${on ? 'text-ink font-semibold' : 'text-ink-2'}`}>{s.english_name}</span>
              <span className="flex gap-0.5">{WIDA_DOMAINS.map(d => <span key={d} className={`w-3.5 h-3.5 rounded-sm text-[9px] font-bold flex items-center justify-center ${levels[s.id]?.[d] ? 'bg-ink text-paper' : 'bg-paper-3 text-ink-3'}`}>{d[0].toUpperCase()}</span>)}</span>
            </button>
          )
        })}
      </div>

      {/* Questionnaire */}
      <div className="flex flex-col min-h-0">
        <div className="px-5 py-3 border-b border-rule-2 flex items-center gap-4 flex-wrap">
          <div>
            <p className="eyebrow">{ko ? `${idx + 1} / ${students.length}번째 학생` : `Student ${idx + 1} of ${students.length}`}</p>
            <h2 className="font-display text-[24px] leading-none text-ink mt-0.5">{student.english_name}<span className="font-sans text-[12.5px] text-ink-3 ml-2">{student.korean_name}</span></h2>
          </div>
          <div className="ml-auto flex border border-rule-2 rounded overflow-hidden">
            {WIDA_DOMAINS.map((d, di) => {
              const lv = levels[student.id]?.[d]
              return <button key={d} onClick={() => goTo(idx, di)} className={`h-11 px-3.5 text-left border-r border-rule-2 last:border-r-0 ${di === domIdx ? 'bg-ink text-paper' : 'bg-surface hover:bg-paper-2'}`}><span className="block text-[10px] uppercase tracking-wider opacity-70">{dl(d)}</span><span className="block text-[14px] font-semibold tabular-nums leading-tight">{lv ?? '—'}{lv ? <span className="text-[10px] font-normal opacity-70 ml-1">{widaLevelName(lv)}</span> : null}</span></button>
            })}
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-5 py-4">
          <div className="flex items-center gap-2 flex-wrap mb-4 text-[12.5px]">
            <span className="text-ink-2">{ko ? '건너뛰기 · 이 수준까지 전부 할 수 있음:' : 'Does everything through level'}</span>
            <div className="flex gap-1">{LEVELS.map(lv => <button key={lv} onClick={() => { setDraft(ticksThrough(domain, band, lv, draft)); setOverride(null) }} className={`w-8 h-8 rounded border text-[13px] font-bold ${suggestion.strength[lv] === 1 ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:border-ink-3'}`}>{lv}</button>)}</div>
            <span className="text-ink-3">{ko ? '· 키보드 1–6' : '· keys 1–6 · then tick what applies at the next level'}</span>
          </div>
          <div className="grid gap-2.5">
            {LEVELS.map(lv => {
              const cur = Math.floor(chosen) === lv
              return (
                <div key={lv} className={`grid grid-cols-[120px_minmax(0,1fr)] gap-4 rounded-md px-3 py-2.5 border ${cur ? 'bg-paper-2 border-rule-2' : 'border-transparent'}`}>
                  <div>
                    <span className={`font-display text-[24px] tabular-nums leading-none ${cur ? 'text-ink' : 'text-ink-3'}`}>{lv}</span>
                    <span className="block text-[10.5px] uppercase tracking-wide text-ink-3 mt-0.5">{widaLevelName(lv)}</span>
                    <span className="block h-1 rounded-sm bg-paper-3 mt-1.5 overflow-hidden"><span className="block h-full bg-ink-3" style={{ width: `${suggestion.strength[lv] * 100}%` }} /></span>
                    {suggestion.strength[lv] === 1
                      ? <button onClick={() => { setDraft(ticksClearFrom(domain, band, lv, draft)); setOverride(null) }} className="mt-1.5 text-[11px] text-ink-3 hover:text-bad">{ko ? '여기부터 해제' : 'Clear from here'}</button>
                      : <button onClick={() => { setDraft(ticksThrough(domain, band, lv, draft)); setOverride(null) }} className="mt-1.5 text-[11px] text-ink-3 hover:text-ink">{ko ? '여기까지 전부' : 'All through here'}</button>}
                  </div>
                  <div className="grid gap-1.5">
                    {WIDA_CAN_DO[domain][band][lv].map(item => (
                      <label key={item.id} className="flex items-start gap-2.5 text-[13.5px] text-ink cursor-pointer">
                        <input type="checkbox" checked={draft.has(item.id)} onChange={e => { setDraft(prevD => { const n = new Set(prevD); e.target.checked ? n.add(item.id) : n.delete(item.id); return n }); setOverride(null) }} className="mt-1" />
                        <span>{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-rule-2 flex items-center gap-3 flex-wrap bg-surface">
          <span className="text-[13px] text-ink-2">{ko ? '제안' : 'Suggested'}: <span className="font-semibold text-ink tabular-nums">{suggestion.decimal} · {widaLevelName(suggestion.level)}</span>{suggestion.decimal > suggestion.level && suggestion.level < 6 && <span className="text-ink-3"> · {Math.round((suggestion.decimal - suggestion.level) * 100)}% {ko ? '의' : 'of'} {widaLevelName(suggestion.level + 1)}</span>}</span>
          <span className="text-[12px] text-ink-3">{ko ? '직접 설정' : 'or set'}</span>
          <div className="flex gap-1">{LEVELS.map(lv => <button key={lv} onClick={() => setOverride(lv)} className={`w-7 h-7 rounded border text-[12px] font-bold ${chosen === lv ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:border-ink-3'}`}>{lv}</button>)}</div>
          <input value={ovText} onChange={e => { if (/^\d?(\.\d?)?$/.test(e.target.value)) setOvText(e.target.value) }} onBlur={commitOverride} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitOverride(); (e.target as HTMLInputElement).blur() } }} inputMode="decimal" className="w-14 h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] tabular-nums text-center text-ink" />
          <div className="ml-auto flex items-center gap-2">
            <button onClick={prev} disabled={idx === 0 && domIdx === 0} className="h-9 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1"><ChevronLeft size={13} />{ko ? '이전' : 'Back'}</button>
            <button onClick={next} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5">
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
              {dirty ? (ko ? `${dl(domain)} ${chosen} 저장 후 ` : `Save ${chosen} · `) : ''}{domIdx < 3 ? (ko ? `다음: ${dl(WIDA_DOMAINS[domIdx + 1])}` : `Next: ${dl(WIDA_DOMAINS[domIdx + 1])}`) : idx < students.length - 1 ? (ko ? `다음 학생: ${students[idx + 1].english_name}` : `Next student: ${students[idx + 1].english_name}`) : (ko ? '완료' : 'Finish')}<ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Rail */}
      <div className="border-l border-rule-2 bg-paper-2 px-4 py-4 space-y-5 text-[12px] overflow-y-auto">
        <div className="flex items-center justify-between"><span className="eyebrow">{ko ? '이 학생' : 'This student'}</span><button onClick={exit} className="inline-flex items-center gap-1 text-ink-3 hover:text-ink"><X size={13} />{ko ? '나가기' : 'Exit'}</button></div>
        <div className="grid gap-1.5">
          {WIDA_DOMAINS.map((d, di) => { const lv = levels[student.id]?.[d]; return <button key={d} onClick={() => goTo(idx, di)} className={`flex items-baseline justify-between px-2 py-1 rounded ${di === domIdx ? 'bg-surface' : 'hover:bg-surface/60'}`}><span className="text-ink-2">{dl(d)}</span><span className={`font-display text-[18px] tabular-nums ${lv ? TONE[Math.floor(lv)] : 'text-ink-3'}`}>{lv ?? '—'}</span></button> })}
          <div className="flex items-baseline justify-between px-2 pt-1 border-t border-rule"><span className="text-ink-3">{ko ? '평균' : 'Overall'}</span><span className="font-semibold text-ink tabular-nums">{overall != null ? overall.toFixed(1) : '—'}</span></div>
        </div>
        <div>
          <span className="eyebrow">{ko ? '반 진행' : 'Class'}</span>
          <p className="text-ink mt-1"><span className="font-display text-[22px] tabular-nums">{fully}</span> <span className="text-ink-3">/ {students.length} {ko ? '명 완료' : 'fully leveled'}</span></p>
          {lastSaved && <p className="text-ink-3 mt-1">{ko ? '마지막 저장' : 'Last saved'}: {lastSaved}</p>}
        </div>
        <div>
          <span className="eyebrow">{ko ? '키보드' : 'Keyboard'}</span>
          <p className="text-ink-3 mt-1 leading-relaxed">↵ {ko ? '저장 후 다음' : 'save and next'} · 1–6 {ko ? '그 수준까지 전부' : 'everything through that level'} · ← → {ko ? '영역' : 'section'} · ↑ ↓ {ko ? '학생' : 'student'} · Esc {ko ? '나가기' : 'exit'}</p>
        </div>
        {candoMissing && <p className="text-warn">{ko ? '체크 항목 저장에는 migration-wida-cando.sql이 필요합니다.' : 'Ticks are not remembered until supabase/migration-wida-cando.sql is run; levels still save.'}</p>}
      </div>
    </div>
  )
}
