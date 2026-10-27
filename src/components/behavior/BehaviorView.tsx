'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { getKSTDateString } from '@/lib/utils'
import { type BehaviorCase, type LadderSettings, DEFAULT_LADDER, loadLadderSettings, fetchCases, noticeSeenBy, isOverdue, schoolDaysSince, isLadderMissing, sendReminder, reminderSentToday } from '@/lib/behaviorLadder'
import { CaseModal, type TeacherRow } from './BehaviorLadderPanel'
import { AlertTriangle, Bell, Flag, Loader2, RefreshCw } from 'lucide-react'

// ─── Behavior ────────────────────────────────────────────────────
// Every ladder case with its story so far (opened, the ask, read by admin,
// the action, or what has not happened yet and for how long), and every
// behavior note, in one place. Teachers see their own class; admin, the
// head teacher and the Snapdragon teacher see all classes and can send a
// case an automatic reminder: an urgent notice to admin with no name on
// it, whose read receipt shows here.

interface LogRow { id: string; student_id: string; date: string; type: string; note: string; is_flagged: boolean; teacher_id: string | null; created_at: string; students?: { english_name: string; korean_name: string; english_class: string; grade: number } | null; teachers?: { name: string } | null }
type Seen = Record<string, { teacher_id: string; seen_at: string | null }[]>

const KST = 'Asia/Seoul'
const fmtDay = (iso: string, ko: boolean) => new Date(iso.length === 10 ? iso + 'T12:00:00+09:00' : iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric' })
const fmtWhen = (iso: string, ko: boolean) => new Date(iso).toLocaleString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const TYPE_TONE: Record<string, string> = { positive: 'bg-good-soft text-good', concern: 'bg-warn-soft text-warn', negative: 'bg-bad-soft text-bad', parent_contact: 'bg-info-soft text-info', intervention: 'bg-info-soft text-info' }

export default function BehaviorView() {
  const { currentTeacher, language, showToast } = useApp()
  const ko = language === 'ko'
  const isAdmin = currentTeacher?.role === 'admin'
  const allClasses = isAdmin || !!currentTeacher?.is_head_teacher || currentTeacher?.english_class === 'Snapdragon'
  const own = currentTeacher?.english_class || ''
  const [cases, setCases] = useState<BehaviorCase[]>([])
  const [logs, setLogs] = useState<LogRow[]>([])
  const [settings, setSettings] = useState<LadderSettings>(DEFAULT_LADDER)
  const [teachers, setTeachers] = useState<TeacherRow[]>([])
  const [seen, setSeen] = useState<Seen>({})
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [detail, setDetail] = useState<BehaviorCase | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  // Filters
  const [cls, setCls] = useState<string>('all')
  const [caseState, setCaseState] = useState<'needs' | 'closed' | 'all'>('needs')
  const [days, setDays] = useState(60)
  const [type, setType] = useState('all')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const since = new Date(Date.now() - days * 86400000)
    const sinceDay = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, '0')}-${String(since.getDate()).padStart(2, '0')}`
    const [{ cases: rows, error }, s, t, l] = await Promise.all([
      fetchCases({ englishClass: allClasses ? null : own, includeClosed: true }),
      loadLadderSettings(),
      supabase.from('teachers').select('id, name, role, english_class').eq('is_active', true),
      supabase.from('behavior_logs').select('id, student_id, date, type, note, is_flagged, teacher_id, created_at, students(english_name, korean_name, english_class, grade), teachers(name)').gte('date', sinceDay).order('date', { ascending: false }).order('created_at', { ascending: false }).limit(2000),
    ])
    if (error) { setMissing(isLadderMissing(error)); setLoading(false); return }
    setMissing(false)
    setCases(rows); setSettings(s); setTeachers((t.data || []) as TeacherRow[])
    const allLogs = ((l.data || []) as unknown as LogRow[]).filter(r => allClasses || r.students?.english_class === own)
    setLogs(allLogs)
    setSeen(await noticeSeenBy(rows.flatMap(c => [c.notice_id, c.reminder_notice_id]).filter((x): x is string => !!x)))
    setLoading(false)
  }, [days, allClasses, own])
  useEffect(() => { load() }, [load])

  const nameOf = (id: string | null | undefined) => teachers.find(t => t.id === id)?.name || '—'
  const admins = teachers.filter(t => t.role === 'admin')
  const classes = useMemo(() => Array.from(new Set([...cases.map(c => c.students?.english_class), ...logs.map(r => r.students?.english_class)].filter((x): x is string => !!x))).sort(), [cases, logs])
  const types = useMemo(() => Array.from(new Set(logs.map(r => r.type))).sort(), [logs])

  // Who has seen a notice, as a phrase.
  const seenPhrase = (noticeId: string | null | undefined) => {
    if (!noticeId) return null
    const rs = (seen[noticeId] || []).filter(r => r.seen_at && admins.some(a => a.id === r.teacher_id))
    if (!rs.length) return { ok: false, text: ko ? '아직 안 봄' : 'not seen yet' }
    const latest = rs.sort((a, b) => (b.seen_at || '').localeCompare(a.seen_at || ''))[0]
    return { ok: true, text: `${ko ? '확인' : 'seen by'} ${nameOf(latest.teacher_id)} ${fmtWhen(latest.seen_at!, ko)}` }
  }

  const visibleCases = cases
    .filter(c => cls === 'all' || c.students?.english_class === cls)
    .filter(c => caseState === 'all' ? true : caseState === 'closed' ? c.status === 'closed' : c.status !== 'closed')
  const needsCount = cases.filter(c => c.status !== 'closed').length

  const visibleLogs = logs
    .filter(r => cls === 'all' || r.students?.english_class === cls)
    .filter(r => type === 'all' || r.type === type)
    .filter(r => !flaggedOnly || r.is_flagged)
    .filter(r => !q.trim() || `${r.students?.english_name || ''} ${r.students?.korean_name || ''}`.toLowerCase().includes(q.trim().toLowerCase()))

  const remind = async (c: BehaviorCase) => {
    if (!admins.length) { showToast(ko ? '관리자 계정이 없습니다' : 'There is no admin account to remind.'); return }
    setBusy(c.id)
    const err = await sendReminder(c, admins.map(a => a.id))
    setBusy(null)
    if (err) { showToast(`Error: ${err}`); return }
    showToast(ko ? '자동 알림이 관리자에게 전달됩니다' : 'A reminder is on its way to admin, with no name on it.')
    load()
  }

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const sel = 'h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
  const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5'

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{allClasses ? (ko ? '모든 반' : 'Every class') : own}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '행동' : 'Behavior'}</h1>
        </div>
        <button onClick={load} className={btn}><RefreshCw size={13} />{ko ? '새로고침' : 'Refresh'}</button>
      </div>

      {missing && <p className="mb-4 text-[12.5px] text-warn">{ko ? 'supabase/migration-behavior-ladder.sql을 먼저 실행하세요.' : 'The behavior ladder tables are missing. Run supabase/migration-behavior-ladder.sql first.'}</p>}

      <div className="flex items-center gap-3 flex-wrap mb-5">
        {allClasses && (
          <select value={cls} onChange={e => setCls(e.target.value)} className={sel}>
            <option value="all">{ko ? '모든 반' : 'All classes'}</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <span className="text-[12px] text-ink-3">{ko ? '사례와 기록 모두에 적용됩니다' : 'applies to the cases and the notes'}</span>
      </div>

      {/* ── Cases ── */}
      <section className="mb-10">
        <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-rule-2 pb-2 mb-3">
          <h2 className="font-display text-[22px] leading-none text-ink">{ko ? '행동 단계 사례' : 'Ladder cases'} <span className="text-ink-3 text-[14px] font-sans">· {needsCount} {ko ? '건 진행 중' : needsCount === 1 ? 'needs action' : 'need action'}</span></h2>
          <div className="flex gap-1.5">
            <button onClick={() => setCaseState('needs')} className={chip(caseState === 'needs')}>{ko ? '진행 중' : 'Needs action'}</button>
            <button onClick={() => setCaseState('closed')} className={chip(caseState === 'closed')}>{ko ? '종결' : 'Closed'}</button>
            <button onClick={() => setCaseState('all')} className={chip(caseState === 'all')}>{ko ? '전체' : 'All'}</button>
          </div>
        </div>
        {loading ? <div className="py-8 text-center"><Loader2 size={18} className="animate-spin text-ink-3 mx-auto" /></div>
        : visibleCases.length === 0 ? <p className="text-[13px] text-ink-3 py-4">{ko ? '해당하는 사례가 없습니다.' : 'No cases here.'}</p>
        : (
          <div className="divide-y divide-rule border-t border-b border-rule">
            {visibleCases.map(c => {
              const overdue = isOverdue(c, settings.overdue_days)
              const waiting = schoolDaysSince(c.created_at)
              const readSeen = seenPhrase(c.notice_id)
              const remSeen = seenPhrase(c.reminder_notice_id)
              const today = reminderSentToday(c)
              // The story so far, as one line of steps.
              const steps: { text: string; tone: 'good' | 'warn' | 'bad' | 'mute' }[] = []
              steps.push({ text: `${ko ? '열림' : 'Opened'} ${fmtDay(c.created_at, ko)} · ${c.log_ids.length} ${ko ? '건' : c.log_ids.length === 1 ? 'note' : 'notes'}${c.opened_reason === 'flag' ? (ko ? ' · 교사 표시' : ' · flagged by the teacher') : ''}`, tone: 'mute' })
              if (c.ask) steps.push({ text: `${ko ? '교사 요청' : 'Teacher asked'}: ${c.ask}`, tone: 'mute' })
              if (c.acknowledged_at) steps.push({ text: `${ko ? '읽음' : 'Read by'} ${nameOf(c.acknowledged_by)} ${fmtWhen(c.acknowledged_at, ko)}`, tone: 'good' })
              else if (c.status !== 'closed') steps.push({ text: `${ko ? '아직 읽지 않음' : 'Not read yet'} · ${waiting} ${ko ? '수업일 대기' : waiting === 1 ? 'school day' : 'school days'}${readSeen ? ` · ${ko ? '알림' : 'notice'} ${readSeen.text}` : ''}`, tone: overdue ? 'bad' : 'warn' })
              if (c.status === 'closed') steps.push({ text: `${c.action_label || (ko ? '조치' : 'Action')} ${c.action_date ? fmtDay(c.action_date, ko) : ''} · ${nameOf(c.closed_by)}${c.action_note ? ` · ${c.action_note}` : ''}`, tone: 'good' })
              else if (c.acknowledged_at) steps.push({ text: `${ko ? '아직 조치 없음' : 'No action recorded yet'} · ${schoolDaysSince(c.acknowledged_at)} ${ko ? '수업일' : 'school days since it was read'}`, tone: 'warn' })
              if (c.reminder_at) steps.push({ text: `${ko ? '자동 알림' : 'Reminder'} ${fmtWhen(c.reminder_at, ko)}${(c.reminder_count || 0) > 1 ? ` ×${c.reminder_count}` : ''}${remSeen ? ` · ${remSeen.text}` : ''}`, tone: remSeen?.ok ? 'good' : 'warn' })
              return (
                <div key={c.id} className={`py-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] items-start ${overdue && c.status !== 'closed' ? 'bg-bad-soft/30 -mx-3 px-3' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => setDetail(c)} className="text-[14px] font-semibold text-ink hover:underline">{c.students?.english_name}<span className="text-ink-3 font-normal text-[12px] ml-1.5">{c.students?.korean_name}</span></button>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-paper-2 text-ink-2">{c.students?.english_class} · G{c.students?.grade}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-info-soft text-info font-semibold">{ko ? `${c.step}단계` : `Step ${c.step}`}</span>
                      {c.status === 'closed' ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-good-soft text-good font-semibold">{ko ? '종결' : 'closed'}</span>
                        : c.status === 'acknowledged' ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-warn-soft text-warn font-semibold">{ko ? '읽음 · 조치 대기' : 'read · waiting for action'}</span>
                        : <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${overdue ? 'bg-bad text-white' : 'bg-warn-soft text-warn'}`}>{ko ? `관리자 대기 ${waiting}일` : `waiting on admin · ${waiting} school ${waiting === 1 ? 'day' : 'days'}`}</span>}
                    </div>
                    <ol className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[12px]">
                      {steps.map((st, i) => (
                        <li key={i} className={`inline-flex items-center gap-2 ${st.tone === 'good' ? 'text-good' : st.tone === 'warn' ? 'text-warn' : st.tone === 'bad' ? 'text-bad' : 'text-ink-2'}`}>
                          {i > 0 && <span className="text-ink-3">→</span>}<span>{st.text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setDetail(c)} className={btn}>{ko ? '기록 보기' : 'Open the notes'}</button>
                    {allClasses && !isAdmin && c.status !== 'closed' && (
                      <button onClick={() => remind(c)} disabled={busy === c.id || today} title={today ? (ko ? '오늘 이미 알림이 갔습니다' : 'A reminder already went out today') : (ko ? '관리자에게 이름 없는 자동 알림을 보냅니다' : 'Sends admin an urgent notice with no name on it, as if automatic')} className={`${btn} border-warn/60 text-warn hover:text-warn`}>
                        {busy === c.id ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}{today ? (ko ? '오늘 알림 완료' : 'Reminded today') : (ko ? '자동 알림 보내기' : 'Send a reminder')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Notes ── */}
      <section>
        <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-rule-2 pb-2 mb-3">
          <h2 className="font-display text-[22px] leading-none text-ink">{ko ? '행동 기록' : 'Behavior notes'} <span className="text-ink-3 text-[14px] font-sans">· {visibleLogs.length}</span></h2>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1.5">{[30, 60, 180].map(d => <button key={d} onClick={() => setDays(d)} className={chip(days === d)}>{ko ? `${d}일` : `${d} days`}</button>)}</div>
            <select value={type} onChange={e => setType(e.target.value)} className={sel}><option value="all">{ko ? '모든 종류' : 'All kinds'}</option>{types.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}</select>
            <label className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 cursor-pointer select-none"><input type="checkbox" checked={flaggedOnly} onChange={e => setFlaggedOnly(e.target.checked)} /> {ko ? '표시된 것만' : 'flagged only'}</label>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder={ko ? '학생 찾기' : 'Find a student'} className="h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-[150px]" />
          </div>
        </div>
        {loading ? null : visibleLogs.length === 0 ? <p className="text-[13px] text-ink-3 py-4">{ko ? '기록이 없습니다.' : 'No notes in this window.'}</p> : (
          <div className="divide-y divide-rule border-t border-b border-rule">
            {visibleLogs.map(r => (
              <div key={r.id} className="grid grid-cols-[72px_190px_110px_minmax(0,1fr)_110px] gap-3 items-baseline py-2 text-[12.5px]">
                <span className="text-ink-3 tabular-nums">{fmtDay(r.date, ko)}</span>
                <span className="min-w-0 truncate"><span className="font-medium text-ink">{r.students?.english_name}</span><span className="text-ink-3 ml-1.5 text-[11px]">{r.students?.english_class}</span></span>
                <span><span className={`text-[10.5px] px-1.5 py-0.5 rounded font-semibold ${TYPE_TONE[r.type] || 'bg-paper-2 text-ink-2'}`}>{r.type.replace('_', ' ')}</span>{r.is_flagged && <Flag size={11} className="inline ml-1.5 text-bad" />}</span>
                <span className="text-ink-2 whitespace-pre-wrap break-words">{r.note}</span>
                <span className="text-ink-3 text-[11.5px] truncate">{r.teachers?.name || nameOf(r.teacher_id)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {detail && <CaseModal c={detail} teachers={teachers} seenLabel={seenPhrase(detail.notice_id)?.text || ''} onClose={() => setDetail(null)} onChanged={load} />}
      {!allClasses && <p className="text-[11px] text-ink-3 mt-6 inline-flex items-center gap-1.5"><AlertTriangle size={11} />{ko ? '내 반의 사례와 기록만 보입니다.' : 'You see your own class. Admin and the Snapdragon teacher see every class.'}</p>}
    </div>
  )
}
