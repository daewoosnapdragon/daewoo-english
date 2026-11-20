'use client'

import Loading from '@/components/brand/Loading'
import { logActivity } from '@/lib/activity'
import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { BehaviorLog } from '@/types'
import { Plus, X, Loader2, ChevronDown, ChevronRight, Bell } from 'lucide-react'
import { getKSTDateString } from '@/lib/utils'
import { ladderStatus, updateAsk, type LadderStatus } from '@/lib/behaviorLadder'

// ─── ABC Options organized by category ──────────────────────────────

const ANTECEDENT_CATEGORIES = [
  { label: 'Demands & Tasks', items: ['Escape/Avoidance of Tasks', 'Difficult task presented', 'Non-preferred activity', 'Task demand change'] },
  { label: 'Social', items: ['Attention Seeking (Peer)', 'Attention Seeking (Adult)', 'Social/Peer Interactions', 'Peer conflict'] },
  { label: 'Environment', items: ['Sensory Input', 'Environmental Triggers', 'Transition Between Activities', 'Unstructured Time', 'Change in routine', 'Loud/crowded environment'] },
  { label: 'Access & Tangibles', items: ['Access to Tangibles', 'Denied preferred item/activity', 'Waiting/sharing required'] },
  { label: 'Other', items: ['Other'] },
]

const BEHAVIOR_CATEGORIES = [
  { label: 'Leaving / Movement', items: ['Elopement (in class)', 'Elopement (out of class)', 'Out of seat', 'Wandering'] },
  { label: 'Aggression', items: ['Physical aggression', 'Verbal aggression', 'Throwing/destroying materials', 'Hitting', 'Kicking', 'Biting'] },
  { label: 'Disruption', items: ['Disrupting class', 'Talking out of turn', 'Making noises', 'Non-compliance', 'Refusal'] },
  { label: 'Emotional', items: ['Crying/emotional outburst', 'Withdrawal/shutting down', 'Tantrum', 'Self-injurious behavior'] },
  { label: 'Off-task', items: ['Off-task behavior', 'Unsafe stimming', 'Not following directions', 'Sleeping in class'] },
  { label: 'Other', items: ['Other'] },
]

const CONSEQUENCE_CATEGORIES = [
  { label: 'Low-Level Response', items: ['Ignored behavior', 'Verbal warning', 'Staff redirection', 'Proximity/moved seat', 'Nonverbal cue/signal'] },
  { label: 'Student-Led', items: ['Student self-regulated', 'Used coping strategy', 'Requested break'] },
  { label: 'Break / De-escalation', items: ['Break/cool-down offered', 'Escorted to calm room', 'Sensory break', 'Walk break'] },
  { label: 'Positive', items: ['Verbal praise after recovery', 'Reinforcement provided', 'Natural consequence'] },
  { label: 'Escalated Response', items: ['Additional staff needed', 'Class evacuated', 'Crisis called', 'Restraint used', 'Parent contacted', 'Office referral'] },
  { label: 'Other', items: ['Other'] },
]

// Each type is a word and a small dot in its status colour; the entry itself
// stays on paper so a long log reads as one list, not a stack of tinted cards.
const LOG_TYPES = [
  { value: 'positive', label: 'Positive', labelKo: '긍정적', dot: 'bg-good', text: 'text-good' },
  { value: 'concern', label: 'Concern', labelKo: '우려', dot: 'bg-warn', text: 'text-warn' },
  { value: 'negative', label: 'Negative', labelKo: '부정 행동', dot: 'bg-bad', text: 'text-bad' },
  { value: 'parent_contact', label: 'Parent Contact', labelKo: '학부모 연락', dot: 'bg-info', text: 'text-info' },
  { value: 'intervention', label: 'Intervention', labelKo: '개입', dot: 'bg-ink-2', text: 'text-ink' },
  { value: 'note', label: 'Note', labelKo: '메모', dot: 'bg-ink-3', text: 'text-ink' },
] as const
// Old rows written as 'abc' read as negative.
const ABC_TYPE = { value: 'abc', label: 'Negative', labelKo: '부정 행동', dot: 'bg-bad', text: 'text-bad' }

// The ladder numbers come from a database function; when it is missing or
// returns nothing usable, show no progress rather than "NaN/NaN".
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

type LangKey = 'en' | 'ko'

// onCount and addSignal let the student page fold an empty Behavior section to
// one line and open the add form from it; the list shows the latest entries
// first and the rest behind "Show all".
const RECENT = 5

export default function BehaviorTracker({ studentId, studentName, onCount, addSignal }: { studentId: string; studentName: string; onCount?: (n: number) => void; addSignal?: number }) {
  const { language, currentTeacher, showToast, confirmDialog, promptDialog } = useApp()
  const lang = language as LangKey
  const [logs, setLogs] = useState<BehaviorLog[]>([])
  // Where the student is on the behavior ladder: notes toward the next step, or an open case.
  const [ladder, setLadder] = useState<LadderStatus | null>(null)
  const refreshLadder = async () => { setLadder(await ladderStatus(studentId)) }
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [showAll, setShowAll] = useState(false)
  useEffect(() => { if (!loading) onCount?.(logs.length) }, [loading, logs.length]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (addSignal) setShowAddForm(true) }, [addSignal])

  const loadLogs = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('behavior_logs')
      .select('*, teachers(name)')
      .eq('student_id', studentId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error && data) {
      setLogs(data.map((row: any) => ({ ...row, teacher_name: row.teachers?.name || '' })))
    }
    setLoading(false)
  }

  useEffect(() => { loadLogs(); refreshLadder() }, [studentId]) // eslint-disable-line react-hooks/exhaustive-deps

  // After a note is saved the trigger may have opened a case; if so, ask the
  // teacher for the one line admin needs, and tell the masthead to re-count.
  const afterSave = async () => {
    setShowAddForm(false)
    const before = ladder?.open_case_id || null
    loadLogs()
    const after = await ladderStatus(studentId)
    setLadder(after)
    if (after?.open_case_id && after.open_case_id !== before) {
      window.dispatchEvent(new Event('daewoo:ladder-changed'))
      const ask = await promptDialog({ title: lang === 'ko' ? '관리자 검토 사례가 열렸습니다' : 'A case has opened for admin review', message: lang === 'ko' ? `${studentName}의 기록이 ${after.step}단계 기준에 이르렀습니다. 관리자에게 필요한 것을 한 줄로 적어 주세요 (선택).` : `${studentName} has reached step ${after.step}: ${after.step_label || 'admin review'}. Add one line about what you need from admin (optional).`, placeholder: lang === 'ko' ? '예: 때리는 행동에 대해 어머니께 전화 부탁드립니다' : 'e.g. please call Mum about the hitting', confirmLabel: lang === 'ko' ? '추가' : 'Add', cancelLabel: lang === 'ko' ? '건너뛰기' : 'Skip' })
      if (ask && ask.trim()) { const err = await updateAsk(after.open_case_id, ask); if (err) showToast(`Error: ${err}`) }
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirmDialog({ title: lang === 'ko' ? '이 기록을 삭제하시겠습니까?' : 'Delete this log entry?', danger: true, confirmLabel: lang === 'ko' ? '삭제' : 'Delete', cancelLabel: lang === 'ko' ? '취소' : 'Cancel' })) return
    const gone = logs.find(l => l.id === id)
    const { error } = await supabase.from('behavior_logs').delete().eq('id', id)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(lang === 'ko' ? '삭제되었습니다' : 'Deleted'); logActivity('deleted', `Behavior note · ${studentName}${gone?.date ? ` · ${gone.date}` : ''}`); loadLogs() }
  }

  const handleToggleFlag = async (log: BehaviorLog) => {
    const { error } = await supabase.from('behavior_logs').update({ is_flagged: !log.is_flagged }).eq('id', log.id)
    if (!error) { logActivity('edited', `Behavior note ${log.is_flagged ? 'unflagged' : 'flagged for admin'} · ${studentName} · ${log.date}`); loadLogs() }
  }

  const flaggedCount = logs.filter((l: any) => l.is_flagged).length

  // Filter logs by type tab
  const filteredLogs = filterType === 'all' ? logs
    : filterType === 'flagged' ? logs.filter((l: any) => l.is_flagged)
    : logs.filter((l: any) => l.type === filterType || (filterType === 'negative' && (l.type === 'abc' || l.type === 'negative')))

  const handlePrint = () => {
    const printWin = window.open('', '_blank')
    if (!printWin) return
    const rows = filteredLogs.map((log: any) => {
      const typeInfo = [...LOG_TYPES, ABC_TYPE].find(t => t.value === log.type)
      return `<tr>
        <td style="padding:6px;border:1px solid #ddd">${new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}${log.time ? ' ' + log.time : ''}</td>
        <td style="padding:6px;border:1px solid #ddd">${typeInfo?.label || log.type}</td>
        <td style="padding:6px;border:1px solid #ddd">${log.note || ''}${(log.behaviors?.length || 0) > 0 ? '<br><small>Behaviors: ' + log.behaviors.join(', ') + '</small>' : ''}${(log.antecedents?.length || 0) > 0 ? '<br><small>Antecedent: ' + log.antecedents.join(', ') + '</small>' : ''}${(log.consequences?.length || 0) > 0 ? '<br><small>Consequence: ' + log.consequences.join(', ') + '</small>' : ''}</td>
        <td style="padding:6px;border:1px solid #ddd">${log.teacher_name || ''}</td>
        <td style="padding:6px;border:1px solid #ddd">${log.is_flagged ? '' : ''}</td>
      </tr>`
    }).join('')
    printWin.document.write(`<html><head><title>Behavior Log — ${studentName}</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%;font-size:12px}th{background:#f0f0f0;padding:8px;border:1px solid #ddd;text-align:left}h2{margin-bottom:4px}p{color:#666;margin-top:0}</style></head><body>
      <h2>Behavior Log — ${studentName}</h2><p>Printed ${new Date().toLocaleDateString()} · ${filteredLogs.length} entries</p>
      <table><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Teacher</th><th>Flag</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    printWin.document.close()
    printWin.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[length:calc(13px*var(--ts))] font-medium text-ink">{logs.length} {lang === 'ko' ? '건의 기록' : 'entries'}</span>
          {flaggedCount > 0 && <span className="inline-flex items-center gap-1 text-[length:calc(11.5px*var(--ts))] text-bad font-semibold"><Bell size={11} />{flaggedCount} {lang === 'ko' ? '건 알림' : 'flagged'}</span>}
          {ladder && (ladder.open_case_id
            ? <span className="text-[length:calc(11.5px*var(--ts))] bg-bad-soft text-bad px-2 py-0.5 rounded-full font-semibold" title={lang === 'ko' ? '관리자 검토 사례가 열려 있습니다' : 'A case is open for admin review'}>{finite(ladder.step) ? (lang === 'ko' ? `${ladder.step}단계 사례 열림` : `step ${ladder.step} case open`) : (lang === 'ko' ? '사례 열림' : 'case open')}</span>
            : finite(ladder.note_count) && finite(ladder.threshold) && finite(ladder.step) && ladder.threshold > 0
              ? <span className={`inline-flex items-center gap-1.5 text-[length:calc(11.5px*var(--ts))] ${ladder.note_count >= ladder.threshold - 1 ? 'text-warn font-semibold' : 'text-ink-3'}`} title={lang === 'ko' ? `우려·부정 기록 ${ladder.threshold}건이면 ${ladder.step}단계(${ladder.step_label}) 사례가 열립니다` : `${ladder.threshold} concern or negative notes open a step ${ladder.step} case: ${ladder.step_label}`}>{ladder.note_count >= ladder.threshold - 1 && <span className="w-1.5 h-1.5 rounded-full bg-warn" />}{ladder.note_count}/{ladder.threshold} {lang === 'ko' ? `· ${ladder.step}단계까지` : `toward step ${ladder.step}`}{ladder.note_count === ladder.threshold - 1 ? (lang === 'ko' ? ' · 한 건 더 기록되면 사례가 열립니다' : ' · one more opens a case') : ''}</span>
              : null)}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="inline-flex items-center h-8 px-3 rounded border border-rule-2 text-[length:calc(12px*var(--ts))] font-medium text-ink-2 hover:text-ink hover:border-ink-3">{lang === 'ko' ? '인쇄' : 'Print'}</button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className={`inline-flex items-center gap-1.5 h-8 px-3 rounded text-[length:calc(12px*var(--ts))] font-semibold transition-colors ${showAddForm ? 'border border-rule-2 text-ink-2 hover:text-ink' : 'bg-accent text-white hover:bg-accent-hover'}`}>
            {showAddForm ? <><X size={13} /> {lang === 'ko' ? '닫기' : 'Close'}</> : <><Plus size={13} /> {lang === 'ko' ? '기록 추가' : 'Add Entry'}</>}
          </button>
        </div>
      </div>

      {/* Weekly summary */}
      {(() => {
        const now = new Date()
        const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay())
        const weekStr = weekStart.toISOString().split('T')[0]
        const thisWeek = logs.filter(l => l.date >= weekStr)
        const pos = thisWeek.filter(l => l.type === 'positive').length
        const neg = thisWeek.filter(l => l.type === 'negative' || l.type === 'abc').length
        if (thisWeek.length === 0) return null
        return (
          <div className="flex items-center gap-3 px-3 py-2 bg-paper-2 rounded text-[length:calc(12px*var(--ts))]">
            <span className="font-semibold text-ink-2">{lang === 'ko' ? '이번 주:' : 'This week:'}</span>
            <span className="inline-flex items-center gap-1.5 text-good font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-good" />{pos} {lang === 'ko' ? '긍정' : 'positive'}</span>
            <span className="inline-flex items-center gap-1.5 text-bad font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-bad" />{neg} {lang === 'ko' ? '부정' : 'negative'}</span>
            {thisWeek.length > 0 && <span className="text-ink-3">({lang === 'ko' ? `전체 ${thisWeek.length}건` : `${thisWeek.length} total`})</span>}
          </div>
        )
      })()}

      {/* ABC Pattern Analysis -- shows after 5+ negative/ABC entries */}
      {(() => {
        const abcLogs = logs.filter(l => (l.type === 'negative' || l.type === 'abc') && ((l.antecedents?.length || 0) > 0 || (l.behaviors?.length || 0) > 0 || (l.consequences?.length || 0) > 0))
        if (abcLogs.length < 5) return null

        // Analyze antecedents
        const antCounts: Record<string, number> = {}
        abcLogs.forEach(l => (l.antecedents || []).forEach((a: string) => { antCounts[a] = (antCounts[a] || 0) + 1 }))
        const topAntecedents = Object.entries(antCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

        // Analyze behaviors
        const behCounts: Record<string, number> = {}
        abcLogs.forEach(l => (l.behaviors || []).forEach((b: string) => { behCounts[b] = (behCounts[b] || 0) + 1 }))
        const topBehaviors = Object.entries(behCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

        // Analyze consequences
        const conCounts: Record<string, number> = {}
        abcLogs.forEach(l => (l.consequences || []).forEach((c: string) => { conCounts[c] = (conCounts[c] || 0) + 1 }))
        const topConsequences = Object.entries(conCounts).sort((a, b) => b[1] - a[1]).slice(0, 3)

        // Time patterns
        const timeCounts: Record<string, number> = {}
        abcLogs.forEach(l => { if (l.time) { const hour = l.time.split(':')[0]; const period = Number(hour) < 12 ? 'Morning' : Number(hour) < 15 ? 'Early afternoon' : 'Late afternoon'; timeCounts[period] = (timeCounts[period] || 0) + 1 } })
        const topTime = Object.entries(timeCounts).sort((a, b) => b[1] - a[1])[0]

        // Activity patterns
        const actCounts: Record<string, number> = {}
        abcLogs.forEach(l => { if (l.activity) actCounts[l.activity] = (actCounts[l.activity] || 0) + 1 })
        const topActivity = Object.entries(actCounts).sort((a, b) => b[1] - a[1])[0]

        // Build insight sentence
        const insights: string[] = []
        if (topAntecedents.length > 0) {
          const topAnt = topAntecedents[0]
          insights.push(`${topAnt[1]} of ${abcLogs.length} incidents involve "${topAnt[0]}" as an antecedent.`)
        }
        if (topBehaviors.length > 0) {
          insights.push(`Most common behavior: "${topBehaviors[0][0]}" (${topBehaviors[0][1]}x).`)
        }
        if (topTime) {
          insights.push(`Incidents cluster in the ${topTime[0].toLowerCase()} (${topTime[1]} of ${abcLogs.length}).`)
        }
        if (topActivity) {
          insights.push(`Most common during: ${topActivity[0]} (${topActivity[1]}x).`)
        }

        return (
          <div className="border border-rule-2 rounded-lg p-4 bg-surface">
            <p className="eyebrow mb-1.5">Pattern Analysis ({abcLogs.length} ABC entries)</p>
            <p className="text-[length:calc(12.5px*var(--ts))] text-ink leading-relaxed max-w-[75ch]">{insights.join(' ')}</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {topAntecedents.length > 0 && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold mb-1">Top Antecedents</p>
                  {topAntecedents.map(([label, count]) => (
                    <div key={label} className="flex items-center gap-1.5 py-0.5">
                      <div className="flex-1 h-1 bg-paper-3 rounded-full overflow-hidden"><div className="h-full bg-ink-2 rounded-full" style={{ width: `${(count / abcLogs.length) * 100}%` }} /></div>
                      <span className="text-[length:calc(11.5px*var(--ts))] text-ink-2 whitespace-nowrap">{label} ({count})</span>
                    </div>
                  ))}
                </div>
              )}
              {topBehaviors.length > 0 && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold mb-1">Top Behaviors</p>
                  {topBehaviors.map(([label, count]) => (
                    <div key={label} className="flex items-center gap-1.5 py-0.5">
                      <div className="flex-1 h-1 bg-paper-3 rounded-full overflow-hidden"><div className="h-full bg-ink-2 rounded-full" style={{ width: `${(count / abcLogs.length) * 100}%` }} /></div>
                      <span className="text-[length:calc(11.5px*var(--ts))] text-ink-2 whitespace-nowrap">{label} ({count})</span>
                    </div>
                  ))}
                </div>
              )}
              {topConsequences.length > 0 && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold mb-1">Top Consequences</p>
                  {topConsequences.map(([label, count]) => (
                    <div key={label} className="flex items-center gap-1.5 py-0.5">
                      <div className="flex-1 h-1 bg-paper-3 rounded-full overflow-hidden"><div className="h-full bg-ink-2 rounded-full" style={{ width: `${(count / abcLogs.length) * 100}%` }} /></div>
                      <span className="text-[length:calc(11.5px*var(--ts))] text-ink-2 whitespace-nowrap">{label} ({count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-rule-2 overflow-x-auto">
        {[{ id: 'all', label: lang === 'ko' ? '전체' : 'All', count: logs.length }, ...LOG_TYPES.map(t => ({ id: t.value, label: lang === 'ko' ? t.labelKo : t.label, count: logs.filter((l: any) => l.type === t.value || (t.value === 'negative' && l.type === 'abc')).length })), { id: 'flagged', label: lang === 'ko' ? '알림' : 'Flagged', count: flaggedCount }].map((tab: any) => (
          <button key={tab.id} onClick={() => setFilterType(tab.id)}
            className={`px-3 py-2 text-[length:calc(11.5px*var(--ts))] whitespace-nowrap transition-colors border-b-2 -mb-px ${filterType === tab.id ? 'border-ink text-ink font-semibold' : 'border-transparent text-ink-3 font-medium hover:text-ink'}`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 text-[length:calc(11.5px*var(--ts))] bg-paper-2 text-ink-2 px-1.5 py-0.5 rounded-full tabular-nums">{tab.count}</span>}
          </button>
        ))}
      </div>

      {showAddForm && <AddBehaviorForm studentId={studentId} studentName={studentName} lang={lang} onClose={() => setShowAddForm(false)} onSaved={afterSave} />}

      {loading ? (
        <Loading rows={4} />
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-ink-3 text-[length:calc(13px*var(--ts))]">{lang === 'ko' ? '아직 기록이 없습니다.' : 'No behavior logs yet.'}</div>
      ) : (
        <div className="space-y-1.5">
          {(showAll ? filteredLogs : filteredLogs.slice(0, RECENT)).map((log: any) => {
            const typeInfo = [...LOG_TYPES, ABC_TYPE].find(t => t.value === log.type)
            const isExpanded = expandedLog === log.id
            const hasAbc = (log.antecedents?.length || 0) > 0 || (log.behaviors?.length || 0) > 0 || (log.consequences?.length || 0) > 0
            return (
              <div key={log.id} className={`border rounded-lg overflow-hidden bg-surface ${log.is_flagged ? 'border-bad/40' : 'border-rule'}`}>
                <div className="px-4 py-2.5 flex items-start gap-2.5 cursor-pointer hover:bg-paper-2/60 transition-colors" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                  <span className={`w-2 h-2 rounded-full mt-[5px] shrink-0 ${typeInfo?.dot || 'bg-ink-3'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[length:calc(11.5px*var(--ts))] font-semibold ${typeInfo?.text || 'text-ink'}`}>{lang === 'ko' ? typeInfo?.labelKo : typeInfo?.label}</span>
                      {hasAbc && <span className="text-[length:calc(11.5px*var(--ts))] px-1.5 py-px rounded border border-rule-2 text-ink-2 font-semibold tracking-wide">ABC</span>}
                      <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {log.time && <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">· {log.time}</span>}
                      {log.teacher_name && <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">— {log.teacher_name}</span>}
                      {log.is_flagged && <span className="inline-flex items-center gap-1 text-[length:calc(11.5px*var(--ts))] text-bad font-semibold uppercase tracking-wide"><Bell size={10} /> {lang === 'ko' ? '관리자' : 'Admin'}</span>}
                    </div>
                    <p className="text-[length:calc(12.5px*var(--ts))] text-ink truncate">{log.note || (log.behaviors || []).join(', ') || '—'}</p>
                    {hasAbc && log.intensity > 1 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">Intensity:</span>
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-2.5 h-2.5 rounded-full ${i <= log.intensity ? (log.intensity >= 4 ? 'bg-bad' : log.intensity >= 3 ? 'bg-warn' : 'bg-good') : 'bg-paper-3'}`} />)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={(e: any) => { e.stopPropagation(); handleToggleFlag(log) }} aria-pressed={!!log.is_flagged} aria-label={lang === 'ko' ? '관리자에게 알림' : 'Flag for admin'}
                      className={`p-1.5 rounded transition-colors ${log.is_flagged ? 'text-bad bg-bad-soft hover:bg-bad-soft/70' : 'text-ink-3 hover:text-bad hover:bg-paper-2'}`}>
                      <Bell size={13} fill={log.is_flagged ? 'currentColor' : 'none'} />
                    </button>
                    <ChevronDown size={14} className={`text-ink-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-rule pt-3 bg-paper-2/50">
                    {hasAbc && (
                      <div className="space-y-2 mb-3">
                        {log.activity && <div><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Activity:</span><p className="text-[length:calc(12px*var(--ts))]">{log.activity}</p></div>}
                        {log.duration && <div><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Duration:</span><span className="text-[length:calc(12px*var(--ts))] ml-1">{log.duration}</span></div>}
                        {(log.antecedents || []).length > 0 && (
                          <div><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Antecedent:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.antecedents.map((a: string, i: number) => <span key={i} className="text-[length:calc(11.5px*var(--ts))] px-2 py-0.5 rounded-full border border-rule-2 bg-surface text-ink-2">{a}</span>)}</div></div>
                        )}
                        {(log.behaviors || []).length > 0 && (
                          <div><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Behavior:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.behaviors.map((b: string, i: number) => <span key={i} className="text-[length:calc(11.5px*var(--ts))] px-2 py-0.5 rounded-full border border-rule-2 bg-surface text-ink-2">{b}</span>)}</div></div>
                        )}
                        {(log.consequences || []).length > 0 && (
                          <div><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Consequence:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.consequences.map((c: string, i: number) => <span key={i} className="text-[length:calc(11.5px*var(--ts))] px-2 py-0.5 rounded-full border border-rule-2 bg-surface text-ink-2">{c}</span>)}</div></div>
                        )}
                        {log.frequency > 1 && <div><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Frequency:</span><span className="text-[length:calc(12px*var(--ts))] ml-1">{log.frequency}x</span></div>}
                      </div>
                    )}
                    {log.note && <div className="mb-3"><span className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-3 font-semibold">Notes:</span><p className="text-[length:calc(12px*var(--ts))] mt-0.5">{log.note}</p></div>}
                    <div className="flex justify-end"><button onClick={() => handleDelete(log.id)} className="text-[length:calc(11.5px*var(--ts))] text-bad hover:underline underline-offset-2">{lang === 'ko' ? '삭제' : 'Delete'}</button></div>
                  </div>
                )}
              </div>
            )
          })}
          {filteredLogs.length > RECENT && (
            <button type="button" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}
              className="inline-flex items-center h-8 text-[length:calc(12px*var(--ts))] font-medium text-ink-2 hover:text-ink underline-offset-2 hover:underline">
              {showAll ? (lang === 'ko' ? `최근 ${RECENT}개만 보기` : `Show the latest ${RECENT}`) : (lang === 'ko' ? `${filteredLogs.length}개 모두 보기` : `Show all ${filteredLogs.length}`)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add Form ───────────────────────────────────────────────────────

function AddBehaviorForm({ studentId, studentName, lang, onClose, onSaved }: { studentId: string; studentName: string; lang: LangKey; onClose: () => void; onSaved: () => void }) {
  const { currentTeacher, showToast } = useApp()
  const [type, setType] = useState<string>('note')
  const now = new Date()
  const [date] = useState(getKSTDateString())
  const [time] = useState(now.toTimeString().slice(0, 5))
  const [duration, setDuration] = useState('')
  const [activity, setActivity] = useState('')
  const [antecedents, setAntecedents] = useState<string[]>([])
  const [behaviors, setBehaviors] = useState<string[]>([])
  const [consequences, setConsequences] = useState<string[]>([])
  const [frequency, setFrequency] = useState(1)
  const [intensity, setIntensity] = useState(1)
  const [note, setNote] = useState('')
  const [isFlagged, setIsFlagged] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showAbc, setShowAbc] = useState(false) // ABC section is optional and collapsible

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const hasAbcData = antecedents.length > 0 || behaviors.length > 0 || consequences.length > 0

  const handleSave = async () => {
    if (!note.trim() && !hasAbcData) { showToast(lang === 'ko' ? '메모를 입력하거나 ABC 데이터를 선택하세요' : 'Enter a note or add ABC data'); return }
    setSaving(true)
    const { error } = await supabase.from('behavior_logs').insert({
      student_id: studentId, date, type: hasAbcData ? 'negative' : type,
      time: time || null, duration: duration || null, activity: activity || null,
      antecedents, behaviors, consequences,
      frequency: hasAbcData ? frequency : 1, intensity: hasAbcData ? intensity : 1,
      note: note.trim(), is_flagged: isFlagged,
      teacher_id: currentTeacher?.id || null,
    })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(lang === 'ko' ? '저장되었습니다' : 'Saved'); onSaved(); logActivity('saved', `Behavior note · ${studentName} · ${date} · ${hasAbcData ? 'ABC' : type}${isFlagged ? ' · flagged for admin' : ''}`) }
  }

  return (
    <div className="border border-rule-2 rounded-lg bg-surface overflow-hidden">
      <div className="px-4 py-3 bg-paper-2 border-b border-rule flex items-center justify-between">
        <h4 className="text-[length:calc(13px*var(--ts))] font-semibold text-ink">{lang === 'ko' ? '새 행동 기록' : 'New Behavior Entry'}</h4>
        <button onClick={onClose} aria-label={lang === 'ko' ? '닫기' : 'Close'} className="p-1 rounded text-ink-3 hover:text-ink hover:bg-paper-3"><X size={14} /></button>
      </div>
      <div className="p-4 space-y-4">
        {/* Entry type */}
        <div className="flex gap-1.5 flex-wrap">
          {LOG_TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              aria-pressed={type === t.value && !hasAbcData}
              className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[length:calc(11.5px*var(--ts))] font-medium border transition-colors ${type === t.value && !hasAbcData ? 'border-ink bg-ink text-paper' : 'border-rule-2 text-ink-2 hover:text-ink hover:border-ink-3'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{lang === 'ko' ? t.labelKo : t.label}
            </button>
          ))}
        </div>

        {/* Auto date/time */}
        <div className="flex items-center gap-3 px-3 py-2 bg-paper-2 rounded text-ink">
          <span className="text-[length:calc(12px*var(--ts))] font-medium">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span className="text-ink-3">·</span>
          <span className="text-[length:calc(12px*var(--ts))] font-medium">{time}</span>
          <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3 ml-auto">{lang === 'ko' ? '자동 기록' : 'Auto-recorded'}</span>
        </div>

        {/* Notes — always visible, always first */}
        <div><label className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-2 font-semibold block mb-1">{lang === 'ko' ? '메모' : 'Notes'}</label>
          <textarea value={note} onChange={(e: any) => setNote(e.target.value)} rows={3} placeholder={lang === 'ko' ? '무슨 일이 있었는지 적어주세요...' : "What happened? You can submit with just a note, or expand ABC data below for more detail..."}
            className="w-full px-2.5 py-2 border border-rule-2 rounded bg-surface text-ink text-[length:calc(12px*var(--ts))] outline-none resize-none" /></div>

        {/* ABC Section — optional, collapsible */}
        <div className="border border-rule-2 rounded-lg overflow-hidden">
          <button onClick={() => setShowAbc(!showAbc)} aria-expanded={showAbc}
            className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${showAbc || hasAbcData ? 'bg-paper-2' : 'bg-surface hover:bg-paper-2'}`}>
            <div className="flex items-center gap-2">
              {showAbc ? <ChevronDown size={14} className="text-ink" /> : <ChevronRight size={14} className="text-ink-3" />}
              <span className={`text-[length:calc(12px*var(--ts))] font-semibold ${showAbc || hasAbcData ? 'text-ink' : 'text-ink-2'}`}>
                 ABC Data <span className="font-normal text-ink-3 text-[length:calc(11.5px*var(--ts))]">(optional — for detailed behavior tracking)</span>
              </span>
            </div>
            {hasAbcData && (
              <span className="text-[length:calc(11.5px*var(--ts))] bg-ink text-paper px-2 py-0.5 rounded-full font-semibold">
                {antecedents.length + behaviors.length + consequences.length} selected
              </span>
            )}
          </button>

          {showAbc && (
            <div className="p-4 space-y-4 border-t border-rule">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-2 font-semibold block mb-1">Duration <span className="text-ink-3 normal-case">(opt)</span></label>
                  <input type="text" value={duration} onChange={(e: any) => setDuration(e.target.value)} placeholder="e.g. 5 min" className="w-full px-2.5 py-1.5 border border-rule-2 rounded bg-surface text-ink text-[length:calc(12px*var(--ts))] outline-none" /></div>
                <div><label className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-2 font-semibold block mb-1">Task / Activity</label>
                  <input type="text" value={activity} onChange={(e: any) => setActivity(e.target.value)} placeholder="e.g. Reading time"
                    className="w-full px-2.5 py-1.5 border border-rule-2 rounded bg-surface text-ink text-[length:calc(12px*var(--ts))] outline-none" /></div>
              </div>

              <CategorizedCheckboxGroup label="Antecedent" categories={ANTECEDENT_CATEGORIES} selected={antecedents} onToggle={item => toggleItem(antecedents, setAntecedents, item)} />
              <CategorizedCheckboxGroup label="Behavior" categories={BEHAVIOR_CATEGORIES} selected={behaviors} onToggle={item => toggleItem(behaviors, setBehaviors, item)} />
              <CategorizedCheckboxGroup label="Consequence" categories={CONSEQUENCE_CATEGORIES} selected={consequences} onToggle={item => toggleItem(consequences, setConsequences, item)} />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-2 font-semibold block mb-1">Frequency</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={50} value={frequency} onChange={(e: any) => setFrequency(parseInt(e.target.value) || 1)}
                      className="w-16 px-2.5 py-1.5 border border-rule-2 rounded bg-surface text-ink text-[length:calc(12px*var(--ts))] text-center outline-none" />
                    <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">times</span>
                  </div>
                </div>
                <div>
                  <label className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-2 font-semibold block mb-2">Intensity: {intensity}/5</label>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setIntensity(i)}
                        aria-pressed={i === intensity}
                        className={`w-8 h-8 rounded-full text-[length:calc(11.5px*var(--ts))] font-semibold transition-colors border ${
                          i <= intensity ? 'bg-ink border-ink text-paper' : 'bg-surface border-rule-2 text-ink-3 hover:border-ink-3 hover:text-ink'
                        }`}>{i}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flag for Admin */}
        <label className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded border transition-colors ${isFlagged ? 'bg-bad-soft border-bad/30' : 'bg-paper-2 border-transparent hover:border-rule-2'}`}>
          <input type="checkbox" checked={isFlagged} onChange={(e: any) => setIsFlagged(e.target.checked)} className="rounded accent-[rgb(var(--bad))]" />
          <Bell size={14} className={isFlagged ? 'text-bad' : 'text-ink-3'} />
          <div>
            <span className={`text-[length:calc(12px*var(--ts))] font-medium ${isFlagged ? 'text-bad' : 'text-ink'}`}>{lang === 'ko' ? '관리자에게 알림' : 'Flag for Admin (Victoria)'}</span>
            <p className="text-[length:calc(11.5px*var(--ts))] text-ink-2">{lang === 'ko' ? '대시보드에 알림이 표시됩니다' : 'Shows notification on admin dashboard with link to this entry'}</p>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="h-8 px-3 rounded border border-rule-2 text-[length:calc(12px*var(--ts))] font-medium text-ink-2 hover:text-ink hover:border-ink-3">{lang === 'ko' ? '취소' : 'Cancel'}</button>
          <button onClick={handleSave} disabled={saving}
            className="h-8 px-4 rounded text-[length:calc(12px*var(--ts))] font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} {lang === 'ko' ? '저장' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Categorized Checkbox Group ─────────────────────────────────────

// Antecedent, behavior and consequence pick the same way: chips that turn ink
// when chosen. The group's label says which is which, so they need no hue.
function CategorizedCheckboxGroup({ label, categories, selected, onToggle }: {
  label: string; categories: { label: string; items: string[] }[]; selected: string[]; onToggle: (item: string) => void
}) {
  const [expanded, setExpanded] = useState(selected.length > 0)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const c = { selected: 'bg-ink border-ink text-paper', unselected: 'bg-surface border-rule-2 text-ink-2 hover:text-ink hover:border-ink-3', header: 'text-ink font-semibold' }

  const toggleCat = (catLabel: string) => {
    const next = new Set(expandedCats)
    next.has(catLabel) ? next.delete(catLabel) : next.add(catLabel)
    setExpandedCats(next)
  }

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} aria-expanded={expanded} className="flex items-center gap-1.5 text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-ink-2 font-semibold mb-1.5">
        <ChevronDown size={12} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} /> {label}
        {selected.length > 0 && <span className={`text-[length:calc(11.5px*var(--ts))] px-1.5 py-0.5 rounded-full font-semibold ${c.selected}`}>{selected.length}</span>}
      </button>
      {expanded && (
        <div className="space-y-1 ml-1">
          {categories.map(cat => {
            const catSelected = cat.items.filter(item => selected.includes(item))
            const isCatExpanded = expandedCats.has(cat.label) || catSelected.length > 0
            return (
              <div key={cat.label} className="border border-rule rounded overflow-hidden">
                <button onClick={() => toggleCat(cat.label)}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-[length:calc(11.5px*var(--ts))] font-medium transition-colors ${isCatExpanded ? 'bg-paper-2' : 'bg-surface hover:bg-paper-2'}`}>
                  <div className="flex items-center gap-1.5">
                    <ChevronRight size={10} className={`transition-transform ${isCatExpanded ? 'rotate-90' : ''}`} />
                    <span className={catSelected.length > 0 ? c.header : 'text-ink-2'}>{cat.label}</span>
                  </div>
                  {catSelected.length > 0 && <span className={`text-[length:calc(11.5px*var(--ts))] px-1.5 py-0.5 rounded-full font-semibold ${c.selected}`}>{catSelected.length}</span>}
                </button>
                {isCatExpanded && (
                  <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-rule">
                    {cat.items.map(item => (
                      <button key={item} onClick={() => onToggle(item)}
                        aria-pressed={selected.includes(item)}
                        className={`px-2.5 py-1 rounded-full text-[length:calc(11.5px*var(--ts))] font-medium border transition-colors ${selected.includes(item) ? c.selected : c.unselected}`}>
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

