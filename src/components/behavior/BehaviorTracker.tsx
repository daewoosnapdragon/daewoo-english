'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { BehaviorLog } from '@/types'
import { Plus, X, Loader2, ChevronDown, ChevronRight, Bell } from 'lucide-react'
import { getKSTDateString } from '@/lib/utils'

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

const LOG_TYPES = [
  { value: 'positive', label: 'Positive', labelKo: '긍정적', icon: '', color: 'bg-green-50 border-green-200 text-green-800' },
  { value: 'concern', label: 'Concern', labelKo: '우려', icon: '', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { value: 'negative', label: 'Negative', labelKo: '부정 행동', icon: '🔴', color: 'bg-red-50 border-red-200 text-red-800' },
  { value: 'parent_contact', label: 'Parent Contact', labelKo: '학부모 연락', icon: '📞', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { value: 'intervention', label: 'Intervention', labelKo: '개입', icon: '🛡️', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  { value: 'note', label: 'Note', labelKo: '메모', icon: '', color: 'bg-gray-50 border-gray-200 text-gray-800' },
] as const

type LangKey = 'en' | 'ko'

export default function BehaviorTracker({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [logs, setLogs] = useState<BehaviorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

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

  useEffect(() => { loadLogs() }, [studentId])

  const handleDelete = async (id: string) => {
    if (!confirm(lang === 'ko' ? '이 기록을 삭제하시겠습니까?' : 'Delete this log entry?')) return
    const { error } = await supabase.from('behavior_logs').delete().eq('id', id)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(lang === 'ko' ? '삭제되었습니다' : 'Deleted'); loadLogs() }
  }

  const handleToggleFlag = async (log: BehaviorLog) => {
    const { error } = await supabase.from('behavior_logs').update({ is_flagged: !log.is_flagged }).eq('id', log.id)
    if (!error) loadLogs()
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
      const typeInfo = [...LOG_TYPES, { value: 'abc', label: 'Negative', labelKo: '부정 행동', icon: '🔴', color: '' }].find(t => t.value === log.type)
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
          <span className="text-[13px] font-medium text-navy">{logs.length} {lang === 'ko' ? '건의 기록' : 'entries'}</span>
          {flaggedCount > 0 && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{flaggedCount} flagged</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt border border-border">🖨️ Print</button>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${showAddForm ? 'bg-surface-alt text-text-secondary' : 'bg-navy text-white hover:bg-navy-dark'}`}>
            {showAddForm ? <><X size={13} /> Close</> : <><Plus size={13} /> {lang === 'ko' ? '기록 추가' : 'Add Entry'}</>}
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
          <div className="flex items-center gap-3 px-3 py-2 bg-surface-alt rounded-lg text-[11px]">
            <span className="font-semibold text-text-secondary">This week:</span>
            <span className="text-green-600 font-semibold">{pos} positive</span>
            <span className="text-red-600 font-semibold">{neg} negative</span>
            {thisWeek.length > 0 && <span className="text-text-tertiary">({thisWeek.length} total)</span>}
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
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-[10px] uppercase tracking-wider text-indigo-500 font-semibold mb-1.5">Pattern Analysis ({abcLogs.length} ABC entries)</p>
            <p className="text-[12px] text-indigo-900 leading-relaxed">{insights.join(' ')}</p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {topAntecedents.length > 0 && (
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-indigo-400 font-semibold mb-1">Top Antecedents</p>
                  {topAntecedents.map(([label, count]) => (
                    <div key={label} className="flex items-center gap-1.5 py-0.5">
                      <div className="flex-1 h-1 bg-indigo-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(count / abcLogs.length) * 100}%` }} /></div>
                      <span className="text-[9px] text-indigo-700 whitespace-nowrap">{label} ({count})</span>
                    </div>
                  ))}
                </div>
              )}
              {topBehaviors.length > 0 && (
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-indigo-400 font-semibold mb-1">Top Behaviors</p>
                  {topBehaviors.map(([label, count]) => (
                    <div key={label} className="flex items-center gap-1.5 py-0.5">
                      <div className="flex-1 h-1 bg-amber-200 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${(count / abcLogs.length) * 100}%` }} /></div>
                      <span className="text-[9px] text-amber-700 whitespace-nowrap">{label} ({count})</span>
                    </div>
                  ))}
                </div>
              )}
              {topConsequences.length > 0 && (
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-indigo-400 font-semibold mb-1">Top Consequences</p>
                  {topConsequences.map(([label, count]) => (
                    <div key={label} className="flex items-center gap-1.5 py-0.5">
                      <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${(count / abcLogs.length) * 100}%` }} /></div>
                      <span className="text-[9px] text-red-700 whitespace-nowrap">{label} ({count})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {[{ id: 'all', label: 'All', count: logs.length }, ...LOG_TYPES.map(t => ({ id: t.value, label: lang === 'ko' ? t.labelKo : t.label, count: logs.filter((l: any) => l.type === t.value || (t.value === 'negative' && l.type === 'abc')).length })), { id: 'flagged', label: ' Flagged', count: flaggedCount }].map((tab: any) => (
          <button key={tab.id} onClick={() => setFilterType(tab.id)}
            className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${filterType === tab.id ? 'border-navy text-navy' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}>
            {tab.label} {tab.count > 0 && <span className="ml-1 text-[9px] bg-surface-alt px-1.5 py-0.5 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {showAddForm && <AddBehaviorForm studentId={studentId} lang={lang} onClose={() => setShowAddForm(false)} onSaved={() => { setShowAddForm(false); loadLogs() }} />}

      {loading ? (
        <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-text-tertiary text-[13px]">{lang === 'ko' ? '아직 기록이 없습니다.' : 'No behavior logs yet.'}</div>
      ) : (
        <div className="space-y-1.5">
          {filteredLogs.map((log: any) => {
            const typeInfo = [...LOG_TYPES, { value: 'abc', label: 'Negative', labelKo: '부정 행동', icon: '🔴', color: 'bg-red-50 border-red-200 text-red-800' }].find(t => t.value === log.type)
            const isExpanded = expandedLog === log.id
            const hasAbc = (log.antecedents?.length || 0) > 0 || (log.behaviors?.length || 0) > 0 || (log.consequences?.length || 0) > 0
            return (
              <div key={log.id} className={`border rounded-lg overflow-hidden transition-all ${typeInfo?.color || 'bg-surface border-border'}`}>
                <div className="px-4 py-2.5 flex items-start gap-2 cursor-pointer" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                  <span className="text-[14px] mt-0.5">{typeInfo?.icon || ''}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-[11px] font-semibold">{lang === 'ko' ? typeInfo?.labelKo : typeInfo?.label}</span>
                      {hasAbc && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-200 text-blue-700 font-bold">ABC</span>}
                      <span className="text-[11px] text-text-tertiary">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {log.time && <span className="text-[11px] text-text-tertiary">· {log.time}</span>}
                      {log.teacher_name && <span className="text-[10px] text-text-tertiary">— {log.teacher_name}</span>}
                      {log.is_flagged && <span className="inline-flex items-center gap-0.5 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold"><Bell size={8} /> ADMIN</span>}
                    </div>
                    <p className="text-[12px] text-text-primary truncate">{log.note || (log.behaviors || []).join(', ') || '—'}</p>
                    {hasAbc && log.intensity > 1 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-text-tertiary">Intensity:</span>
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-3 rounded-full ${i <= log.intensity ? (log.intensity >= 4 ? 'bg-red-500' : log.intensity >= 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'}`} />)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={(e: any) => { e.stopPropagation(); handleToggleFlag(log) }}
                      className={`p-1.5 rounded-md transition-all ${log.is_flagged ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-text-tertiary hover:text-red-400 hover:bg-red-50'}`}>
                      <Bell size={13} fill={log.is_flagged ? 'currentColor' : 'none'} />
                    </button>
                    <ChevronDown size={14} className={`text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-border/50 pt-3 bg-surface-alt/30">
                    {hasAbc && (
                      <div className="space-y-2 mb-3">
                        {log.activity && <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Activity:</span><p className="text-[12px]">{log.activity}</p></div>}
                        {log.duration && <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Duration:</span><span className="text-[12px] ml-1">{log.duration}</span></div>}
                        {(log.antecedents || []).length > 0 && (
                          <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Antecedent:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.antecedents.map((a: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a}</span>)}</div></div>
                        )}
                        {(log.behaviors || []).length > 0 && (
                          <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Behavior:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.behaviors.map((b: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{b}</span>)}</div></div>
                        )}
                        {(log.consequences || []).length > 0 && (
                          <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Consequence:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.consequences.map((c: string, i: number) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">{c}</span>)}</div></div>
                        )}
                        {log.frequency > 1 && <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Frequency:</span><span className="text-[12px] ml-1">{log.frequency}x</span></div>}
                      </div>
                    )}
                    {log.note && <div className="mb-3"><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Notes:</span><p className="text-[12px] mt-0.5">{log.note}</p></div>}
                    <div className="flex justify-end"><button onClick={() => handleDelete(log.id)} className="text-[11px] text-danger hover:underline">{lang === 'ko' ? '삭제' : 'Delete'}</button></div>
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

// ─── Add Form ───────────────────────────────────────────────────────

function AddBehaviorForm({ studentId, lang, onClose, onSaved }: { studentId: string; lang: LangKey; onClose: () => void; onSaved: () => void }) {
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
    else { showToast(lang === 'ko' ? '저장되었습니다' : 'Saved'); onSaved() }
  }

  return (
    <div className="border border-navy/20 rounded-xl bg-surface overflow-hidden">
      <div className="px-4 py-3 bg-accent-light border-b border-border flex items-center justify-between">
        <h4 className="text-[13px] font-semibold text-navy">{lang === 'ko' ? '새 행동 기록' : 'New Behavior Entry'}</h4>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-alt"><X size={14} /></button>
      </div>
      <div className="p-4 space-y-4">
        {/* Entry type */}
        <div className="flex gap-1.5 flex-wrap">
          {LOG_TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${type === t.value && !hasAbcData ? 'border-navy bg-navy text-white' : `${t.color} hover:opacity-80`}`}>
              {t.icon} {lang === 'ko' ? t.labelKo : t.label}
            </button>
          ))}
        </div>

        {/* Auto date/time */}
        <div className="flex items-center gap-3 px-3 py-2 bg-surface-alt rounded-lg">
          <span className="text-[11px]"></span>
          <span className="text-[12px] font-medium">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-[12px] font-medium">{time}</span>
          <span className="text-[10px] text-text-tertiary ml-auto">{lang === 'ko' ? '자동 기록' : 'Auto-recorded'}</span>
        </div>

        {/* Notes — always visible, always first */}
        <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '메모' : 'Notes'}</label>
          <textarea value={note} onChange={(e: any) => setNote(e.target.value)} rows={3} placeholder={lang === 'ko' ? '무슨 일이 있었는지 적어주세요...' : "What happened? You can submit with just a note, or expand ABC data below for more detail..."}
            className="w-full px-2.5 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy resize-none" /></div>

        {/* ABC Section — optional, collapsible */}
        <div className="border border-border rounded-lg overflow-hidden">
          <button onClick={() => setShowAbc(!showAbc)}
            className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${showAbc || hasAbcData ? 'bg-blue-50' : 'bg-surface-alt hover:bg-surface-alt/80'}`}>
            <div className="flex items-center gap-2">
              {showAbc ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronRight size={14} className="text-text-tertiary" />}
              <span className={`text-[12px] font-semibold ${showAbc || hasAbcData ? 'text-blue-700' : 'text-text-secondary'}`}>
                 ABC Data <span className="font-normal text-[10px]">(optional — for detailed behavior tracking)</span>
              </span>
            </div>
            {hasAbcData && (
              <span className="text-[9px] bg-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                {antecedents.length + behaviors.length + consequences.length} selected
              </span>
            )}
          </button>

          {showAbc && (
            <div className="p-4 space-y-4 border-t border-border">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Duration <span className="text-text-tertiary normal-case">(opt)</span></label>
                  <input type="text" value={duration} onChange={(e: any) => setDuration(e.target.value)} placeholder="e.g. 5 min" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
                <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Task / Activity</label>
                  <input type="text" value={activity} onChange={(e: any) => setActivity(e.target.value)} placeholder="e.g. Reading time"
                    className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
              </div>

              <CategorizedCheckboxGroup label="Antecedent" categories={ANTECEDENT_CATEGORIES} selected={antecedents} onToggle={item => toggleItem(antecedents, setAntecedents, item)} color="blue" />
              <CategorizedCheckboxGroup label="Behavior" categories={BEHAVIOR_CATEGORIES} selected={behaviors} onToggle={item => toggleItem(behaviors, setBehaviors, item)} color="yellow" />
              <CategorizedCheckboxGroup label="Consequence" categories={CONSEQUENCE_CATEGORIES} selected={consequences} onToggle={item => toggleItem(consequences, setConsequences, item)} color="red" />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Frequency</label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={1} max={50} value={frequency} onChange={(e: any) => setFrequency(parseInt(e.target.value) || 1)}
                      className="w-16 px-2.5 py-1.5 border border-border rounded-lg text-[12px] text-center outline-none focus:border-navy" />
                    <span className="text-[11px] text-text-tertiary">times</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-2">Intensity: {intensity}/5</label>
                  <div className="flex gap-1.5">
                    {[1,2,3,4,5].map(i => (
                      <button key={i} onClick={() => setIntensity(i)}
                        className={`w-8 h-8 rounded-full text-[11px] font-bold transition-all border-2 ${
                          i <= intensity ? (intensity >= 4 ? 'bg-red-500 border-red-500 text-white' : intensity >= 3 ? 'bg-yellow-500 border-yellow-500 text-white' : 'bg-green-500 border-green-500 text-white')
                          : 'bg-surface border-border text-text-tertiary hover:border-navy/30'
                        }`}>{i}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Flag for Admin */}
        <label className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg border transition-all ${isFlagged ? 'bg-red-50 border-red-200' : 'bg-surface-alt border-transparent hover:border-border'}`}>
          <input type="checkbox" checked={isFlagged} onChange={(e: any) => setIsFlagged(e.target.checked)} className="rounded" />
          <Bell size={14} className={isFlagged ? 'text-red-500' : 'text-text-tertiary'} />
          <div>
            <span className="text-[12px] font-medium">{lang === 'ko' ? '관리자에게 알림' : 'Flag for Admin (Victoria)'}</span>
            <p className="text-[10px] text-text-tertiary">{lang === 'ko' ? '대시보드에 알림이 표시됩니다' : 'Shows notification on admin dashboard with link to this entry'}</p>
          </div>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg text-[12px] font-medium hover:bg-surface-alt">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving && <Loader2 size={12} className="animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Categorized Checkbox Group ─────────────────────────────────────

function CategorizedCheckboxGroup({ label, categories, selected, onToggle, color }: {
  label: string; categories: { label: string; items: string[] }[]; selected: string[]; onToggle: (item: string) => void; color: 'blue' | 'yellow' | 'red'
}) {
  const [expanded, setExpanded] = useState(selected.length > 0)
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set())
  const colorMap = {
    blue: { selected: 'bg-blue-100 border-blue-400 text-blue-700', unselected: 'bg-surface border-border text-text-secondary hover:border-blue-300', header: 'text-blue-700' },
    yellow: { selected: 'bg-yellow-100 border-yellow-400 text-yellow-700', unselected: 'bg-surface border-border text-text-secondary hover:border-yellow-300', header: 'text-yellow-700' },
    red: { selected: 'bg-red-100 border-red-400 text-red-700', unselected: 'bg-surface border-border text-text-secondary hover:border-red-300', header: 'text-red-700' },
  }
  const c = colorMap[color]

  const toggleCat = (catLabel: string) => {
    const next = new Set(expandedCats)
    next.has(catLabel) ? next.delete(catLabel) : next.add(catLabel)
    setExpandedCats(next)
  }

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1.5">
        <ChevronDown size={12} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} /> {label}
        {selected.length > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${c.selected}`}>{selected.length}</span>}
      </button>
      {expanded && (
        <div className="space-y-1 ml-1">
          {categories.map(cat => {
            const catSelected = cat.items.filter(item => selected.includes(item))
            const isCatExpanded = expandedCats.has(cat.label) || catSelected.length > 0
            return (
              <div key={cat.label} className="border border-border/60 rounded-lg overflow-hidden">
                <button onClick={() => toggleCat(cat.label)}
                  className={`w-full px-3 py-1.5 flex items-center justify-between text-[10px] font-medium transition-colors ${isCatExpanded ? 'bg-surface-alt' : 'bg-surface hover:bg-surface-alt/50'}`}>
                  <div className="flex items-center gap-1.5">
                    <ChevronRight size={10} className={`transition-transform ${isCatExpanded ? 'rotate-90' : ''}`} />
                    <span className={catSelected.length > 0 ? c.header : 'text-text-secondary'}>{cat.label}</span>
                  </div>
                  {catSelected.length > 0 && <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold ${c.selected}`}>{catSelected.length}</span>}
                </button>
                {isCatExpanded && (
                  <div className="px-3 py-2 flex flex-wrap gap-1.5 border-t border-border/40">
                    {cat.items.map(item => (
                      <button key={item} onClick={() => onToggle(item)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${selected.includes(item) ? c.selected : c.unselected}`}>
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
