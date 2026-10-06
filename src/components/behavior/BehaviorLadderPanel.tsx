'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { getKSTDateString } from '@/lib/utils'
import { type BehaviorCase, type LadderSettings, DEFAULT_LADDER, loadLadderSettings, fetchCases, acknowledgeCase, closeCase, updateAsk, noticeSeenBy, isOverdue, schoolDaysSince, isLadderMissing, sweepLadder } from '@/lib/behaviorLadder'
import { AlertTriangle, Check, ChevronDown, ChevronRight, Eye, EyeOff, Loader2, Printer, X } from 'lucide-react'

// ─── Behavior ladder panel ───────────────────────────────────────
// Admin mode: the cases that need an action, at the top of the dashboard,
// with no dismiss. "I've read this" records who and when; the step's
// action closes the case and writes the parent-contact entry. Teacher mode:
// the same cases for one class (or one student, with history), with whether
// admin has seen them yet and the teacher's one-line ask for admin.

interface Props { mode: 'admin' | 'teacher'; studentId?: string; onChanged?: () => void }
interface LogRow { id: string; date: string; type: string; note: string; is_flagged: boolean; time?: string | null; activity?: string | null; antecedents?: string[]; behaviors?: string[]; consequences?: string[]; intensity?: number; frequency?: number; teachers?: { name: string } | null }
interface TeacherRow { id: string; name: string; role: string; english_class: string }

const TYPE_LABEL: Record<string, { en: string; ko: string; cls: string }> = {
  positive: { en: 'Positive', ko: '긍정', cls: 'bg-green-100 text-green-700' },
  concern: { en: 'Concern', ko: '우려', cls: 'bg-yellow-100 text-yellow-800' },
  negative: { en: 'Negative', ko: '부정', cls: 'bg-red-100 text-red-700' },
  abc: { en: 'Negative', ko: '부정', cls: 'bg-red-100 text-red-700' },
  parent_contact: { en: 'Parent contact', ko: '학부모 연락', cls: 'bg-purple-100 text-purple-700' },
  intervention: { en: 'Intervention', ko: '개입', cls: 'bg-orange-100 text-orange-700' },
  note: { en: 'Note', ko: '메모', cls: 'bg-gray-100 text-gray-700' },
}
const fmtDate = (d: string, ko: boolean) => new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })

export default function BehaviorLadderPanel({ mode, studentId, onChanged }: Props) {
  const { currentTeacher, language, showToast } = useApp()
  const ko = language === 'ko'
  const isAdmin = currentTeacher?.role === 'admin'
  const [cases, setCases] = useState<BehaviorCase[]>([])
  const [settings, setSettings] = useState<LadderSettings>(DEFAULT_LADDER)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [seen, setSeen] = useState<Record<string, { teacher_id: string; seen_at: string | null }[]>>({})
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [detail, setDetail] = useState<BehaviorCase | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  const load = useCallback(async () => {
    const cls = mode === 'teacher' && !isAdmin && !studentId ? currentTeacher?.english_class : null
    const [{ cases: rows, error }, s, t] = await Promise.all([
      fetchCases({ englishClass: cls, studentId, includeClosed: !!studentId }),
      loadLadderSettings(),
      supabase.from('teachers').select('id, name, role, english_class').eq('is_active', true),
    ])
    if (error) { setMissing(isLadderMissing(error)); setLoading(false); return }
    setCases(rows); setSettings(s); setTeachers((t.data || []) as TeacherRow[])
    setSeen(await noticeSeenBy(rows.map(c => c.notice_id).filter((x): x is string => !!x)))
    setLoading(false)
  }, [mode, studentId, isAdmin, currentTeacher?.english_class])

  useEffect(() => {
    let on = true
    ;(async () => {
      // Admin's dashboard also re-runs the check, so notes entered before the
      // ladder existed (or outside the app) still open their cases.
      if (mode === 'admin' && isAdmin && !studentId) { const n = await sweepLadder(); if (n && on) showToast(ko ? `${n}건의 행동 사례가 열렸습니다` : `${n} behavior ${n === 1 ? 'case' : 'cases'} opened`) }
      if (on) load()
    })()
    return () => { on = false }
  }, [load, mode, isAdmin, studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  const open = useMemo(() => cases.filter(c => c.status !== 'closed'), [cases])
  const closed = useMemo(() => cases.filter(c => c.status === 'closed'), [cases])
  const admins = useMemo(() => teachers.filter(t => t.role === 'admin'), [teachers])
  const nameOf = (id: string | null | undefined) => teachers.find(t => t.id === id)?.name || ''
  const seenByAdmin = (c: BehaviorCase) => {
    if (c.acknowledged_at) return { label: ko ? `${nameOf(c.acknowledged_by)} 확인함 · ${fmtDate(c.acknowledged_at, ko)}` : `${nameOf(c.acknowledged_by) || 'Admin'} read it · ${fmtDate(c.acknowledged_at, ko)}`, tone: 'good' as const }
    const rc = (c.notice_id ? seen[c.notice_id] : []) || []
    const who = admins.filter(a => rc.some(r => r.teacher_id === a.id && r.seen_at))
    if (who.length) return { label: ko ? `${who.map(a => a.name).join(', ')} 알림 봄 · 아직 확인 안 함` : `${who.map(a => a.name).join(', ')} saw the notice · not yet acknowledged`, tone: 'warn' as const }
    return { label: ko ? '관리자가 아직 보지 않음' : 'Admin has not seen it yet', tone: 'bad' as const }
  }

  const ack = async (c: BehaviorCase) => {
    if (!currentTeacher) return
    const err = await acknowledgeCase(c, currentTeacher.id)
    if (err) { showToast(`Error: ${err}`); return }
    showToast(ko ? '확인했습니다' : 'Recorded that you read it')
    load(); onChanged?.()
  }

  if (loading) return null
  if (missing) return isAdmin ? <div className="border border-warn/40 bg-warn-soft/40 rounded-lg px-4 py-3 text-[12.5px] text-ink-2">{ko ? '행동 단계 기능을 쓰려면 supabase/migration-behavior-ladder.sql을 실행하세요.' : 'The behavior ladder needs supabase/migration-behavior-ladder.sql to be run first.'}</div> : null
  if (open.length === 0 && (!studentId || closed.length === 0)) {
    return mode === 'admin' ? <div className="border border-rule-2 rounded-lg px-4 py-2.5 text-[12.5px] text-ink-3 flex items-center gap-2"><Check size={13} className="text-good" />{ko ? '행동 단계: 처리할 사례가 없습니다' : 'Behavior ladder: nothing needs your action'}</div> : null
  }

  const title = mode === 'admin'
    ? (ko ? `행동 단계 · ${open.length}건 처리 필요` : `Behavior ladder · ${open.length} ${open.length === 1 ? 'case needs' : 'cases need'} your action`)
    : studentId ? (ko ? '행동 단계' : 'Behavior ladder') : (ko ? `행동 단계 · ${open.length}건 진행 중` : `Behavior ladder · ${open.length} open`)
  const anyOverdue = open.some(c => isOverdue(c, settings.overdue_days))

  return (
    <div className={`rounded-lg overflow-hidden border ${mode === 'admin' && open.length ? (anyOverdue ? 'border-bad shadow-[0_0_0_3px_rgb(var(--bad)/0.15)]' : 'border-bad/60') : 'border-rule-2'}`}>
      <div className={`px-5 py-3 flex items-center gap-2 border-b ${mode === 'admin' && open.length ? 'bg-bad-soft border-bad/30' : 'bg-paper-2 border-rule-2'}`}>
        <AlertTriangle size={16} className={mode === 'admin' && open.length ? 'text-bad' : 'text-ink-3'} />
        <h3 className="font-display text-[18px] leading-none text-ink">{title}</h3>
        {mode === 'admin' && open.length > 0 && <span className="text-[11px] text-ink-2 ml-2">{ko ? '읽었다고 표시하고 조치를 기록할 때까지 남아 있습니다' : 'Stays here until you mark it read and record the action'}</span>}
        {studentId && closed.length > 0 && <button onClick={() => setShowHistory(h => !h)} className="ml-auto text-[11.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1">{showHistory ? <ChevronDown size={12} /> : <ChevronRight size={12} />}{ko ? `지난 사례 ${closed.length}건` : `${closed.length} closed ${closed.length === 1 ? 'case' : 'cases'}`}</button>}
      </div>
      <div className="divide-y divide-rule">
        {open.map(c => {
          const overdue = isOverdue(c, settings.overdue_days)
          const waiting = schoolDaysSince(c.created_at)
          const s = seenByAdmin(c)
          return (
            <div key={c.id} className={`px-5 py-3 ${overdue ? 'bg-bad-soft/40' : ''}`}>
              <div className="flex items-start gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => setDetail(c)} className="text-[14px] font-semibold text-ink hover:underline">{c.students?.english_name}<span className="text-ink-3 font-normal text-[12px] ml-1.5">{c.students?.korean_name}</span></button>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-paper-2 text-ink-2">{c.students?.english_class}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-soft text-info font-semibold">{ko ? `${c.step}단계` : `Step ${c.step}`}</span>
                    {c.opened_reason === 'flag' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn-soft text-warn font-semibold">{ko ? '교사 표시' : 'flagged by teacher'}</span>}
                    {overdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-bad text-white font-bold">{ko ? `${waiting}일 대기` : `waiting ${waiting} school days`}</span>}
                  </div>
                  <p className="text-[12.5px] text-ink mt-0.5">{c.step_label}{c.step_label ? ' · ' : ''}{ko ? `기록 ${c.log_ids.length}건` : `${c.log_ids.length} ${c.log_ids.length === 1 ? 'note' : 'notes'}`} · {ko ? '열림' : 'opened'} {fmtDate(c.created_at, ko)}{!overdue && waiting > 0 ? ` · ${waiting} ${ko ? '일 전' : waiting === 1 ? 'school day ago' : 'school days ago'}` : ''}</p>
                  {c.ask && <p className="text-[12.5px] text-ink-2 mt-1"><span className="font-semibold text-ink">{ko ? '교사 요청:' : 'Teacher asks:'}</span> {c.ask}</p>}
                  {mode === 'teacher' && <p className={`text-[11.5px] mt-1 inline-flex items-center gap-1 ${s.tone === 'good' ? 'text-good' : s.tone === 'warn' ? 'text-warn' : 'text-bad'}`}>{s.tone === 'bad' ? <EyeOff size={11} /> : <Eye size={11} />}{s.label}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setDetail(c)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink">{ko ? '기록 보기' : 'Open the notes'}</button>
                  {isAdmin && c.status === 'open' && <button onClick={() => ack(c)} className="h-8 px-3 rounded border border-ink text-[12.5px] font-semibold text-ink hover:bg-paper-2">{ko ? '읽었습니다' : "I've read this"}</button>}
                  {isAdmin && <button onClick={() => setDetail(c)} className="h-8 px-3 rounded bg-bad text-white text-[12.5px] font-semibold hover:opacity-90">{c.action_label || (ko ? '조치 기록' : 'Record action')}</button>}
                </div>
              </div>
            </div>
          )
        })}
        {studentId && showHistory && closed.map(c => (
          <div key={c.id} className="px-5 py-2.5 text-[12.5px] text-ink-2 flex items-center gap-2 flex-wrap bg-paper-2/40">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-paper-3 text-ink-2 font-semibold">{ko ? `${c.step}단계` : `Step ${c.step}`}</span>
            <span>{c.action_label} · {c.action_date ? fmtDate(c.action_date, ko) : '—'} · {nameOf(c.closed_by)}</span>
            {c.action_note && <span className="text-ink-3">· {c.action_note}</span>}
            <button onClick={() => setDetail(c)} className="ml-auto text-[11.5px] text-ink-3 hover:text-ink">{ko ? '기록 보기' : 'notes'}</button>
          </div>
        ))}
      </div>
      {detail && <CaseModal c={detail} teachers={teachers} seenLabel={seenByAdmin(detail).label} onClose={() => setDetail(null)} onChanged={() => { load(); onChanged?.() }} />}
    </div>
  )
}

// ── One case: the notes in order, the ask, the action ──
function CaseModal({ c, teachers, seenLabel, onClose, onChanged }: { c: BehaviorCase; teachers: TeacherRow[]; seenLabel: string; onClose: () => void; onChanged: () => void }) {
  const { currentTeacher, language, showToast } = useApp()
  const ko = language === 'ko'
  const isAdmin = currentTeacher?.role === 'admin'
  const [logs, setLogs] = useState<LogRow[] | null>(null)
  const [positives, setPositives] = useState(0)
  const [ask, setAsk] = useState(c.ask || '')
  const [actionDate, setActionDate] = useState(getKSTDateString())
  const [actionNote, setActionNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [showAction, setShowAction] = useState(false)
  const canEditAsk = !isAdmin && c.status !== 'closed' && (currentTeacher?.english_class === c.students?.english_class)

  useEffect(() => {
    let on = true
    ;(async () => {
      const [{ data }, { count }] = await Promise.all([
        c.log_ids.length ? supabase.from('behavior_logs').select('*, teachers(name)').in('id', c.log_ids).order('date').order('created_at') : Promise.resolve({ data: [] as any[] }),
        supabase.from('behavior_logs').select('id', { count: 'exact', head: true }).eq('student_id', c.student_id).eq('type', 'positive').gte('date', (c.log_ids.length ? '1900-01-01' : '1900-01-01')),
      ])
      if (!on) return
      setLogs((data || []) as LogRow[]); setPositives(count || 0)
    })()
    return () => { on = false }
  }, [c.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const saveAsk = async () => { const err = await updateAsk(c.id, ask); if (err) showToast(`Error: ${err}`); else { showToast(ko ? '저장됨' : 'Saved'); onChanged() } }
  const ack = async () => { if (!currentTeacher) return; setBusy(true); const err = await acknowledgeCase(c, currentTeacher.id); setBusy(false); if (err) showToast(`Error: ${err}`); else { showToast(ko ? '확인했습니다' : 'Recorded that you read it'); onChanged(); onClose() } }
  const doClose = async () => {
    if (!currentTeacher) return
    setBusy(true)
    const err = await closeCase(c, currentTeacher.id, actionDate, actionNote)
    setBusy(false)
    if (err) { showToast(`Error: ${err}`); return }
    showToast(ko ? `${c.action_label} 기록됨 · 사례 종료` : `${c.action_label} recorded · case closed`)
    onChanged(); onClose()
  }
  const nameOf = (id: string | null | undefined) => teachers.find(t => t.id === id)?.name || ''

  const print = () => {
    const pw = window.open('', '_blank'); if (!pw || !logs) return
    const esc = (s: string) => String(s || '').replace(/[&<>]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch] as string))
    const rows = logs.map(l => `<tr><td style="padding:5px 8px;border:1px solid #e2e8f0;white-space:nowrap">${fmtDate(l.date, ko)}${l.time ? ` ${esc(l.time)}` : ''}</td><td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(TYPE_LABEL[l.type]?.en || l.type)}${l.is_flagged ? ' · flagged' : ''}</td><td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(l.note)}${(l.behaviors || []).length ? `<br><span style="color:#64748b;font-size:10px">Behavior: ${esc((l.behaviors || []).join(', '))}</span>` : ''}${(l.antecedents || []).length ? `<br><span style="color:#64748b;font-size:10px">Before: ${esc((l.antecedents || []).join(', '))}</span>` : ''}${(l.consequences || []).length ? `<br><span style="color:#64748b;font-size:10px">Response: ${esc((l.consequences || []).join(', '))}</span>` : ''}</td><td style="padding:5px 8px;border:1px solid #e2e8f0">${esc(l.teachers?.name || '')}</td></tr>`).join('')
    pw.document.write(`<!DOCTYPE html><html><head><title>Behavior case - ${esc(c.students?.english_name || '')}</title><style>body{font-family:Inter,Arial,sans-serif;margin:24px;color:#1a1a2e;font-size:12px}@media print{@page{margin:15mm}}</style></head><body><h1 style="font-size:20px;margin:0 0 4px">${esc(c.students?.english_name || '')} <span style="font-weight:400;color:#64748b;font-size:14px">${esc(c.students?.korean_name || '')} · ${esc(c.students?.english_class || '')} · Grade ${c.students?.grade ?? ''}</span></h1><p style="margin:0 0 12px;color:#64748b">Behavior ladder step ${c.step}: ${esc(c.step_label)} · opened ${fmtDate(c.created_at, false)} · ${c.log_ids.length} notes${c.ask ? `<br><b style="color:#1a1a2e">Teacher asks:</b> ${esc(c.ask)}` : ''}</p><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f1f5f9"><th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left">Date</th><th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left">Type</th><th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left">Note</th><th style="padding:5px 8px;border:1px solid #e2e8f0;text-align:left">Teacher</th></tr></thead><tbody>${rows}</tbody></table>${c.status === 'closed' ? `<p style="margin-top:12px"><b>${esc(c.action_label)}</b> · ${c.action_date ? fmtDate(c.action_date, false) : ''} · ${esc(nameOf(c.closed_by))}${c.action_note ? `<br>${esc(c.action_note)}` : ''}</p>` : '<p style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:8px">Parent contact: date ________  spoke with ____________  outcome ______________________________</p>'}<p style="font-size:9px;color:#94a3b8;margin-top:16px">Daewoo Elementary English Program</p></body></html>`)
    pw.document.close(); pw.print()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-2xl max-h-[88vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-rule-2 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-[20px] leading-none text-ink">{c.students?.english_name} <span className="font-sans text-[12px] text-ink-3">{c.students?.korean_name} · {c.students?.english_class}</span></h3>
            <p className="text-[12px] text-ink-2 mt-1">{ko ? `${c.step}단계` : `Step ${c.step}`} · {c.step_label} · {ko ? '열림' : 'opened'} {fmtDate(c.created_at, ko)} · {c.status === 'closed' ? (ko ? '종료' : 'closed') : seenLabel}</p>
          </div>
          <button onClick={print} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><Printer size={13} />{ko ? '인쇄' : 'Print'}</button>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded hover:bg-paper-2"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto min-h-0">
          {/* The ask */}
          <div className="rounded-md border border-rule-2 bg-paper-2/60 px-3.5 py-2.5">
            <p className="eyebrow mb-1">{ko ? '교사가 관리자에게 요청하는 것' : 'What the teacher needs from admin'}</p>
            {canEditAsk ? (
              <div className="flex gap-2">
                <input value={ask} onChange={e => setAsk(e.target.value)} placeholder={ko ? '예: 때리는 행동에 대해 어머니께 전화 부탁드립니다' : 'e.g. please call Mum about the hitting'} className="flex-1 h-8 px-2.5 bg-surface border border-rule-2 rounded text-[12.5px]" />
                <button onClick={saveAsk} className="h-8 px-3 rounded bg-ink text-paper text-[12.5px] font-semibold">{ko ? '저장' : 'Save'}</button>
              </div>
            ) : <p className="text-[13px] text-ink">{c.ask || <span className="text-ink-3">{ko ? '없음' : 'Nothing added'}</span>}</p>}
          </div>
          {/* The notes */}
          {!logs ? <div className="py-6 text-center"><Loader2 size={16} className="animate-spin text-ink-3 mx-auto" /></div> : (
            <div>
              <div className="flex items-baseline justify-between mb-1.5"><p className="eyebrow">{ko ? `기록 ${logs.length}건` : `The ${logs.length} ${logs.length === 1 ? 'note' : 'notes'}`}</p><span className="text-[11px] text-ink-3">{ko ? `긍정 기록 ${positives}건 (전체)` : `${positives} positive ${positives === 1 ? 'note' : 'notes'} on file for balance`}</span></div>
              <div className="divide-y divide-rule border border-rule-2 rounded-md">
                {logs.map(l => (
                  <div key={l.id} className="px-3.5 py-2.5 text-[12.5px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="tabular-nums text-ink-2">{fmtDate(l.date, ko)}{l.time ? ` · ${l.time}` : ''}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${TYPE_LABEL[l.type]?.cls || 'bg-paper-3 text-ink-2'}`}>{ko ? TYPE_LABEL[l.type]?.ko : TYPE_LABEL[l.type]?.en || l.type}</span>
                      {l.is_flagged && <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn-soft text-warn font-semibold">{ko ? '표시됨' : 'flagged'}</span>}
                      {(l.intensity || 1) > 1 && <span className="text-[10px] text-ink-3">{ko ? '강도' : 'intensity'} {l.intensity}</span>}
                      <span className="ml-auto text-[11px] text-ink-3">{l.teachers?.name}</span>
                    </div>
                    {l.note && <p className="text-ink mt-1">{l.note}</p>}
                    {l.activity && <p className="text-[11.5px] text-ink-3 mt-0.5">{ko ? '활동' : 'During'}: {l.activity}</p>}
                    {((l.antecedents || []).length > 0 || (l.behaviors || []).length > 0 || (l.consequences || []).length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(l.antecedents || []).map((a, i) => <span key={`a${i}`} className="text-[10px] px-2 py-0.5 rounded-full bg-info-soft text-info">{a}</span>)}
                        {(l.behaviors || []).map((b, i) => <span key={`b${i}`} className="text-[10px] px-2 py-0.5 rounded-full bg-bad-soft text-bad">{b}</span>)}
                        {(l.consequences || []).map((x, i) => <span key={`c${i}`} className="text-[10px] px-2 py-0.5 rounded-full bg-good-soft text-good">{x}</span>)}
                      </div>
                    )}
                  </div>
                ))}
                {logs.length === 0 && <p className="px-3.5 py-3 text-ink-3">{ko ? '기록을 찾을 수 없습니다.' : 'The notes could not be found (they may have been deleted).'}</p>}
              </div>
            </div>
          )}
          {/* Closed record */}
          {c.status === 'closed' && (
            <div className="rounded-md border border-good/40 bg-good-soft/40 px-3.5 py-2.5 text-[12.5px]">
              <span className="font-semibold text-ink">{c.action_label}</span> · {c.action_date ? fmtDate(c.action_date, ko) : '—'} · {nameOf(c.closed_by)}{c.action_note ? <span className="block text-ink-2 mt-0.5">{c.action_note}</span> : null}
            </div>
          )}
        </div>
        {/* Admin actions */}
        {isAdmin && c.status !== 'closed' && (
          <div className="px-5 py-3 border-t border-rule-2 bg-paper-2/60">
            {!showAction ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px] text-ink-2 mr-auto">{c.status === 'open' ? (ko ? '먼저 읽었다고 표시한 뒤 조치를 기록하세요.' : 'Mark it read, then record the action when it is done.') : (ko ? `${nameOf(c.acknowledged_by)} 확인함 · 조치 기록 대기` : `Read by ${nameOf(c.acknowledged_by)} · waiting for the action`)}</span>
                {c.status === 'open' && <button onClick={ack} disabled={busy} className="h-8 px-3 rounded border border-ink text-[12.5px] font-semibold text-ink hover:bg-surface disabled:opacity-50">{ko ? '읽었습니다' : "I've read this"}</button>}
                <button onClick={() => setShowAction(true)} className="h-8 px-3 rounded bg-bad text-white text-[12.5px] font-semibold hover:opacity-90">{c.action_label || (ko ? '조치 기록' : 'Record action')}</button>
              </div>
            ) : (
              <div className="grid gap-2">
                <p className="text-[12px] text-ink-2">{ko ? `${c.action_label}: 날짜와 한 줄 메모를 남기면 학생 기록에 학부모 연락으로 저장되고 사례가 종료됩니다.` : `${c.action_label}: the date and a line about it go on the student's behavior log as a parent-contact entry, and the case closes.`}</p>
                <div className="flex gap-2 flex-wrap">
                  <input type="date" value={actionDate} onChange={e => setActionDate(e.target.value)} className="h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px]" />
                  <input value={actionNote} onChange={e => setActionNote(e.target.value)} placeholder={ko ? '누구와 통화했고 결과는?' : 'Who you spoke to and what was agreed'} className="flex-1 min-w-[220px] h-8 px-2.5 bg-surface border border-rule-2 rounded text-[12.5px]" />
                  <button onClick={() => setShowAction(false)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2">{ko ? '취소' : 'Cancel'}</button>
                  <button onClick={doClose} disabled={busy || !actionDate} className="h-8 px-3.5 rounded bg-bad text-white text-[12.5px] font-semibold disabled:opacity-50 inline-flex items-center gap-1.5">{busy && <Loader2 size={12} className="animate-spin" />}{ko ? '기록하고 종료' : 'Record and close'}</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
