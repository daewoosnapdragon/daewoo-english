'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { BehaviorLog } from '@/types'
import { Plus, X, Loader2, ChevronDown, Bell } from 'lucide-react'

const ANTECEDENTS = [
  'Escape/Avoidance of Tasks', 'Attention Seeking (Peer)', 'Attention Seeking (Adult)',
  'Access to Tangibles', 'Sensory Input', 'Social/Peer Interactions',
  'Environmental Triggers', 'Transition Between Activities', 'Unstructured Time', 'Other',
]

const BEHAVIORS = [
  'Elopement (in class)', 'Elopement (out of class)', 'Physical aggression', 'Verbal aggression',
  'Throwing/destroying materials', 'Non-compliance', 'Unsafe stimming', 'Disrupting class',
  'Crying/emotional outburst', 'Withdrawal/shutting down', 'Off-task behavior', 'Other',
]

const CONSEQUENCES = [
  'Ignored behavior', 'Staff redirection', 'Student self-regulated', 'Verbal warning',
  'Proximity/moved seat', 'Break/cool-down offered', 'Escorted to calm room',
  'Additional staff needed', 'Class evacuated', 'Crisis called', 'Restraint used', 'Parent contacted', 'Other',
]

const LOG_TYPES = [
  { value: 'abc', label: 'ABC Entry', labelKo: 'ABC 기록', icon: '📋', color: 'bg-blue-50 border-blue-200 text-blue-800' },
  { value: 'positive', label: 'Positive', labelKo: '긍정적', icon: '⭐', color: 'bg-green-50 border-green-200 text-green-800' },
  { value: 'concern', label: 'Concern', labelKo: '우려', icon: '⚠️', color: 'bg-yellow-50 border-yellow-200 text-yellow-800' },
  { value: 'parent_contact', label: 'Parent Contact', labelKo: '학부모 연락', icon: '📞', color: 'bg-purple-50 border-purple-200 text-purple-800' },
  { value: 'intervention', label: 'Intervention', labelKo: '개입', icon: '🛡️', color: 'bg-red-50 border-red-200 text-red-800' },
  { value: 'note', label: 'Note', labelKo: '메모', icon: '📝', color: 'bg-gray-50 border-gray-200 text-gray-800' },
] as const

type LangKey = 'en' | 'ko'

export default function BehaviorTracker({ studentId, studentName }: { studentId: string; studentName: string }) {
  const { language, currentTeacher, showToast } = useApp()
  const lang = language as LangKey
  const [logs, setLogs] = useState<BehaviorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)

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

  const typeCounts = LOG_TYPES.reduce((acc, t) => {
    acc[t.value] = logs.filter(l => l.type === t.value).length; return acc
  }, {} as Record<string, number>)
  const flaggedCount = logs.filter(l => l.is_flagged).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h4 className="text-[13px] font-semibold text-navy">{lang === 'ko' ? '행동 기록' : 'Behavior Log'}</h4>
          <span className="text-[11px] text-text-tertiary">{logs.length} {lang === 'ko' ? '건' : 'entries'}</span>
          {flaggedCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-medium">
              <Bell size={9} /> {flaggedCount} {lang === 'ko' ? '관리자 알림' : 'flagged for admin'}
            </span>
          )}
        </div>
        <button onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
          <Plus size={13} /> {lang === 'ko' ? '기록 추가' : 'Add Entry'}
        </button>
      </div>

      {logs.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {LOG_TYPES.map(t => typeCounts[t.value] > 0 && (
            <span key={t.value} className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium border ${t.color}`}>
              {t.icon} {lang === 'ko' ? t.labelKo : t.label}: {typeCounts[t.value]}
            </span>
          ))}
        </div>
      )}

      {showAddForm && (
        <AddBehaviorForm studentId={studentId} lang={lang}
          onClose={() => setShowAddForm(false)}
          onSaved={() => { setShowAddForm(false); loadLogs() }} />
      )}

      {loading ? (
        <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center"><p className="text-text-tertiary text-[13px]">{lang === 'ko' ? '행동 기록이 없습니다.' : 'No behavior logs yet.'}</p></div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const typeInfo = LOG_TYPES.find(t => t.value === log.type) || LOG_TYPES[5]
            const isExpanded = expandedLog === log.id
            const isAbc = log.type === 'abc'
            return (
              <div key={log.id} className={`border rounded-lg overflow-hidden transition-all ${log.is_flagged ? 'border-red-300 bg-red-50/30' : 'border-border'}`}>
                <div className="px-4 py-3 flex items-start gap-3 cursor-pointer hover:bg-surface-alt/50" onClick={() => setExpandedLog(isExpanded ? null : log.id)}>
                  <span className="text-lg mt-0.5">{typeInfo.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${typeInfo.color}`}>{lang === 'ko' ? typeInfo.labelKo : typeInfo.label}</span>
                      <span className="text-[11px] text-text-tertiary">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      {log.time && <span className="text-[11px] text-text-tertiary">· {log.time}</span>}
                      {log.teacher_name && <span className="text-[10px] text-text-tertiary">— {log.teacher_name}</span>}
                      {log.is_flagged && <span className="inline-flex items-center gap-0.5 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold"><Bell size={8} /> ADMIN</span>}
                    </div>
                    <p className="text-[12px] text-text-primary truncate">{log.note || (isAbc ? (log.behaviors || []).join(', ') : '—')}</p>
                    {isAbc && log.intensity > 1 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] text-text-tertiary">Intensity:</span>
                        {[1,2,3,4,5].map(i => <div key={i} className={`w-3 h-3 rounded-full ${i <= log.intensity ? (log.intensity >= 4 ? 'bg-red-500' : log.intensity >= 3 ? 'bg-yellow-500' : 'bg-green-500') : 'bg-gray-200'}`} />)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleToggleFlag(log) }}
                      title={log.is_flagged ? 'Remove admin flag' : 'Flag for admin'}
                      className={`p-1.5 rounded-md transition-all ${log.is_flagged ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-text-tertiary hover:text-red-400 hover:bg-red-50'}`}>
                      <Bell size={13} fill={log.is_flagged ? 'currentColor' : 'none'} />
                    </button>
                    <ChevronDown size={14} className={`text-text-tertiary transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-4 pb-3 border-t border-border/50 pt-3 bg-surface-alt/30">
                    {isAbc && (
                      <div className="space-y-2 mb-3">
                        {log.activity && <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Activity:</span><p className="text-[12px]">{log.activity}</p></div>}
                        {log.duration && <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Duration:</span><span className="text-[12px] ml-1">{log.duration}</span></div>}
                        {(log.antecedents || []).length > 0 && (
                          <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Antecedent:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.antecedents.map((a, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{a}</span>)}</div></div>
                        )}
                        {(log.behaviors || []).length > 0 && (
                          <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Behavior:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.behaviors.map((b, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">{b}</span>)}</div></div>
                        )}
                        {(log.consequences || []).length > 0 && (
                          <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Consequence:</span>
                            <div className="flex flex-wrap gap-1 mt-1">{log.consequences.map((c, i) => <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700">{c}</span>)}</div></div>
                        )}
                        {log.frequency > 1 && <div><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Frequency:</span><span className="text-[12px] ml-1">{log.frequency}x</span></div>}
                      </div>
                    )}
                    {log.note && isAbc && <div className="mb-3"><span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Notes:</span><p className="text-[12px] mt-0.5">{log.note}</p></div>}
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

function AddBehaviorForm({ studentId, lang, onClose, onSaved }: { studentId: string; lang: LangKey; onClose: () => void; onSaved: () => void }) {
  const { currentTeacher, showToast } = useApp()
  const [type, setType] = useState<string>('abc')
  // Auto-fill date and time — teachers don't have time during class
  const now = new Date()
  const [date] = useState(now.toISOString().split('T')[0])
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
  const isAbc = type === 'abc'

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter(x => x !== item) : [...arr, item])
  }

  const handleSave = async () => {
    if (isAbc && behaviors.length === 0) { showToast(lang === 'ko' ? '행동을 선택하세요' : 'Select at least one behavior'); return }
    if (!isAbc && !note.trim()) { showToast(lang === 'ko' ? '메모를 입력하세요' : 'Enter a note'); return }
    setSaving(true)
    const { error } = await supabase.from('behavior_logs').insert({
      student_id: studentId, date, type,
      time: time || null, duration: duration || null, activity: activity || null,
      antecedents: isAbc ? antecedents : [], behaviors: isAbc ? behaviors : [],
      consequences: isAbc ? consequences : [],
      frequency: isAbc ? frequency : 1, intensity: isAbc ? intensity : 1,
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
        <div className="flex gap-1.5 flex-wrap">
          {LOG_TYPES.map(t => (
            <button key={t.value} onClick={() => setType(t.value)}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${type === t.value ? 'border-navy bg-navy text-white' : `${t.color} hover:opacity-80`}`}>
              {t.icon} {lang === 'ko' ? t.labelKo : t.label}
            </button>
          ))}
        </div>

        {/* Auto date/time display */}
        <div className="flex items-center gap-3 px-3 py-2 bg-surface-alt rounded-lg">
          <span className="text-[11px]">📅</span>
          <span className="text-[12px] font-medium">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          <span className="text-text-tertiary">·</span>
          <span className="text-[12px] font-medium">{time}</span>
          <span className="text-[10px] text-text-tertiary ml-auto">{lang === 'ko' ? '자동 기록' : 'Auto-recorded'}</span>
        </div>

        {isAbc && (
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Duration <span className="text-text-tertiary normal-case">(opt)</span></label>
              <input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 5 min" className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
            <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Task / Activity</label>
              <input type="text" value={activity} onChange={e => setActivity(e.target.value)} placeholder="e.g. Reading time"
                className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" /></div>
          </div>
        )}

        {isAbc && (
          <>
            <CheckboxGroup label="Antecedent" items={ANTECEDENTS} selected={antecedents} onToggle={item => toggleItem(antecedents, setAntecedents, item)} color="blue" />
            <CheckboxGroup label="Behavior *" items={BEHAVIORS} selected={behaviors} onToggle={item => toggleItem(behaviors, setBehaviors, item)} color="yellow" />
            <CheckboxGroup label="Consequence" items={CONSEQUENCES} selected={consequences} onToggle={item => toggleItem(consequences, setConsequences, item)} color="red" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Frequency</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} max={50} value={frequency} onChange={e => setFrequency(parseInt(e.target.value) || 1)}
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
          </>
        )}

        <div><label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">Notes {!isAbc && '*'}</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Details..."
            className="w-full px-2.5 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy resize-none" /></div>

        {/* Flag for Admin — prominent and clear */}
        <label className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg border transition-all ${isFlagged ? 'bg-red-50 border-red-200' : 'bg-surface-alt border-transparent hover:border-border'}`}>
          <input type="checkbox" checked={isFlagged} onChange={e => setIsFlagged(e.target.checked)} className="rounded" />
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

function CheckboxGroup({ label, items, selected, onToggle, color }: {
  label: string; items: string[]; selected: string[]; onToggle: (item: string) => void; color: 'blue' | 'yellow' | 'red'
}) {
  const [expanded, setExpanded] = useState(selected.length > 0)
  const colorMap = {
    blue: { selected: 'bg-blue-100 border-blue-400 text-blue-700', unselected: 'bg-surface border-border text-text-secondary hover:border-blue-300' },
    yellow: { selected: 'bg-yellow-100 border-yellow-400 text-yellow-700', unselected: 'bg-surface border-border text-text-secondary hover:border-yellow-300' },
    red: { selected: 'bg-red-100 border-red-400 text-red-700', unselected: 'bg-surface border-border text-text-secondary hover:border-red-300' },
  }
  const c = colorMap[color]
  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold mb-1.5">
        <ChevronDown size={12} className={`transition-transform ${expanded ? '' : '-rotate-90'}`} /> {label}
        {selected.length > 0 && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${c.selected}`}>{selected.length}</span>}
      </button>
      {expanded && (
        <div className="flex flex-wrap gap-1.5">
          {items.map(item => (
            <button key={item} onClick={() => onToggle(item)}
              className={`px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${selected.includes(item) ? c.selected : c.unselected}`}>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
