'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { useTeachers } from '@/hooks/useData'
import { ACTION_LABELS, canViewActivity, type ActivityAction } from '@/lib/activity'
import { Loader2, RefreshCw } from 'lucide-react'

// ─── Activity ────────────────────────────────────────────────────
// Who signed in and what they did, newest first, with a strip of when each
// teacher last signed in and was last seen. Filters by teacher, kind of
// action and how far back. For admin, the head teacher and the Snapdragon
// teacher; everyone else is told so.

interface Row { id: string; teacher_id: string | null; action: ActivityAction; detail: string; path: string; count: number; created_at: string; updated_at: string }

const KST = 'Asia/Seoul'
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { timeZone: KST, hour: 'numeric', minute: '2-digit' })
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: KST })
const dayLabel = (day: string, lang: string) => new Date(day + 'T12:00:00+09:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { timeZone: KST, weekday: 'long', month: 'long', day: 'numeric' })
const whenOf = (iso: string, lang: string) => new Date(iso).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

export default function ActivityView() {
  const { currentTeacher, language: lang } = useApp()
  const ko = lang === 'ko'
  const { teachers } = useTeachers()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [who, setWho] = useState('all')
  const [what, setWhat] = useState<'all' | 'logins' | ActivityAction>('all')
  const [days, setDays] = useState(7)
  const allowed = canViewActivity(currentTeacher)

  const load = useCallback(async () => {
    setLoading(true)
    const since = new Date(Date.now() - days * 86400000).toISOString()
    const { data, error } = await supabase.from('activity_log').select('*').gte('updated_at', since).order('updated_at', { ascending: false }).limit(3000)
    if (error) { setMissing(/activity_log/.test(error.message || '')); setRows([]); setLoading(false); return }
    setMissing(false); setRows((data || []) as Row[]); setLoading(false)
  }, [days])
  useEffect(() => { if (allowed) load() }, [allowed, load])

  const nameOf = (id: string | null) => teachers.find(t => t.id === id)?.name || (ko ? '(알 수 없음)' : '(unknown)')
  const classOf = (id: string | null) => teachers.find(t => t.id === id)?.english_class || ''
  const filtered = useMemo(() => rows.filter(r => (who === 'all' || r.teacher_id === who) && (what === 'all' || (what === 'logins' ? (r.action === 'login' || r.action === 'logout') : r.action === what))), [rows, who, what])
  const byDay = useMemo(() => {
    const out: { day: string; rows: Row[] }[] = []
    for (const r of filtered) { const d = dayOf(r.updated_at); const last = out[out.length - 1]; if (last && last.day === d) last.rows.push(r); else out.push({ day: d, rows: [r] }) }
    return out
  }, [filtered])
  // When each teacher last signed in and was last seen, within the window.
  const presence = useMemo(() => teachers.map(t => {
    const mine = rows.filter(r => r.teacher_id === t.id)
    const login = mine.find(r => r.action === 'login')
    return { t, lastLogin: login?.created_at || null, lastSeen: mine[0]?.updated_at || null, n: mine.length }
  }).sort((a, b) => (b.lastSeen || '').localeCompare(a.lastSeen || '')), [teachers, rows])

  if (!allowed) return (
    <div className="px-8 py-6 animate-fade-in"><p className="text-[13px] text-ink-3">{ko ? '이 페이지는 관리자, 수석 교사, 스냅드래곤 교사만 볼 수 있습니다.' : 'This page is for admin, the head teacher and the Snapdragon teacher.'}</p></div>
  )

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const sel = 'h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
  const tone = (a: ActivityAction) => a === 'login' ? 'text-good' : a === 'logout' ? 'text-ink-3' : a === 'deleted' ? 'text-bad' : a === 'visit' ? 'text-ink-3' : 'text-ink'

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '누가 언제 무엇을' : 'Who did what, and when'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '활동 기록' : 'Activity'}</h1>
        </div>
        <button onClick={load} className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink"><RefreshCw size={13} />{ko ? '새로고침' : 'Refresh'}</button>
      </div>

      {missing && <p className="mb-4 text-[12.5px] text-warn">{ko ? 'supabase/migration-activity-log.sql을 먼저 실행하세요.' : 'The activity_log table is missing. Run supabase/migration-activity-log.sql in the Supabase SQL editor, then reload.'}</p>}

      <div className="flex items-center gap-3 flex-wrap mb-6">
        <div className="flex gap-1.5">{[1, 7, 30].map(d => <button key={d} onClick={() => setDays(d)} className={chip(days === d)}>{d === 1 ? (ko ? '오늘' : 'Today') : (ko ? `${d}일` : `${d} days`)}</button>)}</div>
        <span className="w-px h-6 bg-rule" />
        <select value={who} onChange={e => setWho(e.target.value)} className={sel}>
          <option value="all">{ko ? '모든 교사' : 'Everyone'}</option>
          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}{t.role === 'admin' ? ' · admin' : t.english_class ? ` · ${t.english_class}` : ''}</option>)}
        </select>
        <select value={what} onChange={e => setWhat(e.target.value as any)} className={sel}>
          <option value="all">{ko ? '모든 활동' : 'Everything'}</option>
          <option value="logins">{ko ? '로그인/로그아웃' : 'Sign-ins and sign-outs'}</option>
          {(Object.keys(ACTION_LABELS) as ActivityAction[]).filter(a => a !== 'login' && a !== 'logout').map(a => <option key={a} value={a}>{ACTION_LABELS[a][ko ? 'ko' : 'en']}</option>)}
        </select>
        <span className="text-[12px] text-ink-3 ml-auto tabular-nums">{filtered.length} {ko ? '건' : filtered.length === 1 ? 'entry' : 'entries'}</span>
      </div>

      {!loading && rows.length > 0 && (
        <div className="mb-8">
          <p className="eyebrow mb-2">{ko ? '최근 로그인' : 'Last sign-in and last seen'}</p>
          <div className="grid gap-px bg-rule border border-rule-2 rounded-lg overflow-hidden" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
            {presence.map(({ t, lastLogin, lastSeen, n }) => (
              <button key={t.id} onClick={() => setWho(who === t.id ? 'all' : t.id)} className={`text-left px-3.5 py-3 bg-surface hover:bg-paper-2 ${who === t.id ? 'shadow-[inset_3px_0_0_rgb(var(--accent))]' : ''}`}>
                <p className="text-[13px] font-semibold text-ink">{t.name} <span className="font-normal text-ink-3">· {t.role === 'admin' ? 'admin' : t.english_class}</span></p>
                <p className="text-[11.5px] text-ink-2 mt-1 tabular-nums">{ko ? '로그인' : 'Signed in'}: {lastLogin ? whenOf(lastLogin, lang) : <span className="text-ink-3">{ko ? '기록 없음' : 'not in this window'}</span>}</p>
                <p className="text-[11.5px] text-ink-3 tabular-nums">{ko ? '마지막 활동' : 'Last seen'}: {lastSeen ? whenOf(lastSeen, lang) : '—'}{n ? ` · ${n} ${ko ? '건' : n === 1 ? 'entry' : 'entries'}` : ''}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-ink-3 mx-auto" /></div>
      : byDay.length === 0 ? <p className="text-[13px] text-ink-3 py-8">{missing ? '' : (ko ? '이 기간에 기록이 없습니다.' : 'Nothing recorded in this window.')}</p>
      : byDay.map(g => (
        <div key={g.day} className="mb-6">
          <h2 className="font-display text-[18px] leading-none text-ink border-b border-rule-2 pb-1.5 mb-1">{dayLabel(g.day, lang)}</h2>
          <div className="divide-y divide-rule">
            {g.rows.map(r => (
              <div key={r.id} className="grid grid-cols-[72px_150px_120px_minmax(0,1fr)] gap-3 items-baseline py-1.5 text-[12.5px]">
                <span className="text-ink-3 tabular-nums">{timeOf(r.updated_at)}</span>
                <span className="text-ink truncate" title={classOf(r.teacher_id)}>{nameOf(r.teacher_id)}</span>
                <span className={`font-medium ${tone(r.action)}`}>{ACTION_LABELS[r.action]?.[ko ? 'ko' : 'en'] || r.action}</span>
                <span className="min-w-0 text-ink-2">
                  <span className="break-words">{r.detail}</span>
                  {r.count > 1 && <span className="ml-2 text-[10.5px] text-ink-3 tabular-nums" title={ko ? `${timeOf(r.created_at)}부터` : `since ${timeOf(r.created_at)}`}>×{r.count}</span>}
                  {r.action !== 'visit' && r.path && <span className="ml-2 text-[10.5px] text-ink-3">{r.path}</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[11px] text-ink-3 mt-6">{ko ? '같은 작업을 10분 안에 반복하면 한 줄로 묶이고 횟수(×N)가 표시됩니다. 페이지 열람, 채점, 저장, 평가 생성·수정·삭제, 인쇄, 공지, 설정 변경, 로그인·로그아웃이 기록됩니다.' : 'The same action repeated within ten minutes folds into one line with a count (×N). Recorded: sign-ins and sign-outs, pages opened, scoring, saves, assessments created, edited and deleted, prints, notices and settings changes.'}</p>
    </div>
  )
}
