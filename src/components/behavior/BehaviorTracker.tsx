'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { BehaviorLog } from '@/types'
import { Plus, X, Loader2, AlertTriangle, Check, ChevronDown, ChevronUp, Flag, Clock, Calendar } from 'lucide-react'

// ─── ABC Dropdown Options (from Kyla's ABC Data Tracker) ────────────

const ANTECEDENT_OPTIONS = [
  { category: 'Escape/Avoidance of Tasks', items: ['Given a task/demand', 'Transition between activities', 'Non-preferred activity', 'Difficult task', 'New or unfamiliar task', 'Long task or wait time', 'Corrective feedback given'] },
  { category: 'Attention Seeking (Peer)', items: ['Peer interaction/conflict', 'Peers laughing or reacting', 'Peer provocation', 'Lack of peer attention', 'Wanting peer approval'] },
  { category: 'Attention Seeking (Adult)', items: ['Teacher attending to others', 'Seeking teacher attention', 'Teacher redirection', 'Low adult attention', 'Wanting adult approval'] },
  { category: 'Access to Tangibles', items: ['Denied preferred item/activity', 'Told to share', 'Preferred item removed', 'Waiting for preferred item', 'Seeing others with preferred item'] },
  { category: 'Sensory Input', items: ['Loud/overwhelming environment', 'Unexpected noise or touch', 'Hunger or fatigue', 'Temperature discomfort', 'Overstimulation', 'Understimulation'] },
  { category: 'Social/Peer Interactions', items: ['Excluded from group', 'Social conflict', 'Misreading social cues', 'Group work required', 'Competition with peers'] },
  { category: 'Environmental Triggers', items: ['Change in routine', 'Substitute teacher', 'Unstructured time', 'After recess/specials', 'Morning arrival', 'End of day', 'Testing situation'] },
]

const BEHAVIOR_OPTIONS = [
  { category: 'Elopement', items: ['Left seat without permission', 'Left classroom', 'Ran from adult', 'Wandered around room', 'Hid in classroom'] },
  { category: 'Physical Aggression', items: ['Hit/kicked/pushed peer', 'Hit/kicked/pushed adult', 'Bit someone', 'Spit at someone', 'Pulled hair', 'Headbutted'] },
  { category: 'Destruction', items: ['Threw materials', 'Broke/destroyed materials', 'Knocked items off desk', 'Tore up work', 'Damaged property'] },
  { category: 'Non-compliance', items: ['Refused to follow directions', 'Ignored adult requests', 'Argued with adult', 'Said "no" or "I don\'t want to"', 'Passive non-compliance (sat/did nothing)'] },
  { category: 'Verbal Disruption', items: ['Yelling/screaming', 'Inappropriate language', 'Talking out of turn', 'Making noises', 'Verbal threats', 'Name-calling'] },
  { category: 'Self-Stimulatory/Unsafe', items: ['Unsafe stimming', 'Self-injurious behavior', 'Rocking/spinning', 'Hand flapping', 'Mouthing objects'] },
  { category: 'Other', items: ['Crying/emotional dysregulation', 'Shut down/withdrawal', 'Sleeping in class', 'Off-task behavior', 'Cheating/copying'] },
]

const CONSEQUENCE_OPTIONS = [
  { category: 'Low Intensity', items: ['Ignored behavior', 'Proximity/presence', 'Verbal reminder', 'Visual cue/signal', 'Redirected to task', 'Offered choices', 'Moved seat'] },
  { category: 'Medium Intensity', items: ['Staff redirection', 'Loss of privilege', 'Time away in class', 'Student self-regulated', 'Sensory break provided', 'Buddy room/cool down walk', 'Parent contacted'] },
  { category: 'High Intensity', items: ['Escorted to calm room', 'Additional staff needed', 'Admin called', 'Class evacuated', 'Crisis team called', 'Restraint used', 'Sent home'] },
]

const INTENSITY_LABELS = [
  { value: 1, label: 'Low', labelKo: '낮음', color: '#059669', desc: 'Minor, easily redirected' },
  { value: 2, label: 'Mild', labelKo: '경미', color: '#84cc16', desc: 'Noticeable but manageable' },
  { value: 3, label: 'Moderate', labelKo: '보통', color: '#d97706', desc: 'Disrupts class, needs intervention' },
  { value: 4, label: 'High', labelKo: '높음', color: '#dc2626', desc: 'Significant disruption or safety concern' },
  { value: 5, label: 'Severe', labelKo: '심각', color: '#7c2d12', desc: 'Crisis-level, immediate response needed' },
]

interface BehaviorTrackerProps {
  studentId: string
  studentName: string
  lang: 'en' | 'ko'
}

export default function BehaviorTracker({ studentId, studentName, lang }: BehaviorTrackerProps) {
  const { currentTeacher, showToast } = useApp()
  const [logs, setLogs] = useState<BehaviorLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
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
      setLogs(data.map((row: any) => ({
        ...row,
        teacher_name: row.teachers?.name || '',
        antecedents: row.antecedents || [],
        behaviors: row.behaviors || [],
        consequences: row.consequences || [],
      })))
    }
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [studentId])

  const handleDelete = async (id: string) => {
    const msg = lang === 'ko' ? '이 기록을 삭제하시겠습니까?' : 'Delete this behavior log? This cannot be undone.'
    if (!confirm(msg)) return
    const { error } = await supabase.from('behavior_logs').delete().eq('id', id)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(lang === 'ko' ? '삭제되었습니다' : 'Log deleted'); loadLogs() }
  }

  const abcCount = logs.filter(l => l.type === 'abc').length
  const flaggedCount = logs.filter(l => l.is_flagged).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-[14px] font-semibold text-navy">{lang === 'ko' ? 'ABC 행동 기록' : 'ABC Behavior Tracking'}</h4>
          <p className="text-[11px] text-text-tertiary mt-0.5">
            {abcCount} {lang === 'ko' ? '건 기록' : 'incidents logged'}
            {flaggedCount > 0 && <span className="text-danger ml-2">· {flaggedCount} flagged</span>}
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark transition-all">
          {showForm ? <X size={13} /> : <Plus size={13} />} {showForm ? (lang === 'ko' ? '닫기' : 'Close') : (lang === 'ko' ? '기록 추가' : 'Log Incident')}
        </button>
      </div>

      {/* New Entry Form */}
      {showForm && (
        <ABCEntryForm
          studentId={studentId}
          teacherId={currentTeacher?.id || null}
          lang={lang}
          onSaved={() => { setShowForm(false); loadLogs() }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Log List */}
      {loading ? (
        <div className="py-8 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>
      ) : logs.length === 0 ? (
        <div className="py-8 text-center text-text-tertiary text-[13px]">
          {lang === 'ko' ? '아직 행동 기록이 없습니다.' : 'No behavior logs yet.'}
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => {
            const isExpanded = expandedLog === log.id
            const intensity = INTENSITY_LABELS.find(i => i.value === log.intensity) || INTENSITY_LABELS[0]
            const isAbc = log.type === 'abc'

            return (
              <div key={log.id} className={`border rounded-lg overflow-hidden transition-all ${log.is_flagged ? 'border-danger/30 bg-danger-light/30' : 'border-border bg-surface'}`}>
                <button onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-alt/50 transition-all">
                  {isAbc && (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: intensity.color }}>{log.intensity}</div>
                  )}
                  {!isAbc && (
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      log.type === 'positive' ? 'bg-success-light text-success' : log.type === 'concern' ? 'bg-yellow-100 text-yellow-700' : 'bg-surface-alt text-text-tertiary'
                    }`}>{log.type === 'positive' ? '✓' : log.type === 'concern' ? '!' : '•'}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-medium text-navy truncate">
                        {isAbc
                          ? (log.behaviors && log.behaviors.length > 0 ? log.behaviors.slice(0, 2).join(', ') : 'ABC Incident')
                          : log.note.slice(0, 60) + (log.note.length > 60 ? '...' : '')}
                      </span>
                      {log.is_flagged && <Flag size={11} className="text-danger flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-text-tertiary">{new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      {log.time && <span className="text-[10px] text-text-tertiary">{log.time}</span>}
                      {log.teacher_name && <span className="text-[10px] text-text-tertiary">· {log.teacher_name}</span>}
                      {isAbc && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: intensity.color + '20', color: intensity.color }}>{lang === 'ko' ? intensity.labelKo : intensity.label}</span>}
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/50">
                    {isAbc && (
                      <div className="grid grid-cols-3 gap-3 mt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{lang === 'ko' ? '선행사건' : 'Antecedent'}</p>
                          <div className="space-y-0.5">{(log.antecedents || []).map((a: string, i: number) => (
                            <p key={i} className="text-[11px] text-navy">• {a}</p>
                          ))}{(!log.antecedents || log.antecedents.length === 0) && <p className="text-[11px] text-text-tertiary">—</p>}</div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{lang === 'ko' ? '행동' : 'Behavior'}</p>
                          <div className="space-y-0.5">{(log.behaviors || []).map((b: string, i: number) => (
                            <p key={i} className="text-[11px] text-navy">• {b}</p>
                          ))}{(!log.behaviors || log.behaviors.length === 0) && <p className="text-[11px] text-text-tertiary">—</p>}</div>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold mb-1">{lang === 'ko' ? '결과' : 'Consequence'}</p>
                          <div className="space-y-0.5">{(log.consequences || []).map((c: string, i: number) => (
                            <p key={i} className="text-[11px] text-navy">• {c}</p>
                          ))}{(!log.consequences || log.consequences.length === 0) && <p className="text-[11px] text-text-tertiary">—</p>}</div>
                        </div>
                      </div>
                    )}
                    {isAbc && (
                      <div className="flex items-center gap-4 mt-3 text-[11px]">
                        {log.activity && <span><span className="text-text-tertiary">{lang === 'ko' ? '활동:' : 'Activity:'}</span> <span className="font-medium">{log.activity}</span></span>}
                        {log.duration && <span><span className="text-text-tertiary">{lang === 'ko' ? '지속시간:' : 'Duration:'}</span> <span className="font-medium">{log.duration}</span></span>}
                        {log.frequency > 1 && <span><span className="text-text-tertiary">{lang === 'ko' ? '빈도:' : 'Frequency:'}</span> <span className="font-medium">{log.frequency}x</span></span>}
                      </div>
                    )}
                    {log.note && <p className="text-[12px] text-text-secondary mt-2 bg-surface-alt rounded p-2">{log.note}</p>}
                    <div className="flex justify-end mt-3">
                      <button onClick={() => handleDelete(log.id)} className="text-[11px] text-danger hover:underline">{lang === 'ko' ? '삭제' : 'Delete'}</button>
                    </div>
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

// ─── ABC Entry Form ─────────────────────────────────────────────────

function ABCEntryForm({ studentId, teacherId, lang, onSaved, onCancel }: {
  studentId: string; teacherId: string | null; lang: 'en' | 'ko'; onSaved: () => void; onCancel: () => void
}) {
  const { showToast } = useApp()
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState('')
  const [duration, setDuration] = useState('')
  const [activity, setActivity] = useState('')
  const [antecedents, setAntecedents] = useState<string[]>([])
  const [behaviors, setBehaviors] = useState<string[]>([])
  const [consequences, setConsequences] = useState<string[]>([])
  const [frequency, setFrequency] = useState(1)
  const [intensity, setIntensity] = useState(1)
  const [notes, setNotes] = useState('')
  const [isFlagged, setIsFlagged] = useState(false)
  const [saving, setSaving] = useState(false)

  const [openSection, setOpenSection] = useState<'antecedent' | 'behavior' | 'consequence' | null>('behavior')

  const toggleItem = (list: string[], setList: (v: string[]) => void, item: string) => {
    setList(list.includes(item) ? list.filter(x => x !== item) : [...list, item])
  }

  const handleSave = async () => {
    if (behaviors.length === 0) { showToast(lang === 'ko' ? '행동을 하나 이상 선택하세요' : 'Select at least one behavior'); return }
    setSaving(true)
    const { error } = await supabase.from('behavior_logs').insert({
      student_id: studentId,
      teacher_id: teacherId,
      date,
      type: 'abc',
      time,
      duration,
      activity,
      antecedents,
      behaviors,
      consequences,
      frequency,
      intensity,
      note: notes,
      is_flagged: isFlagged,
    })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`)
    else { showToast(lang === 'ko' ? '행동 기록이 저장되었습니다' : 'Behavior incident logged'); onSaved() }
  }

  return (
    <div className="mb-4 bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 bg-accent-light border-b border-border">
        <h4 className="text-[13px] font-semibold text-navy">{lang === 'ko' ? '새 ABC 기록' : 'New ABC Incident Log'}</h4>
      </div>
      <div className="p-5 space-y-4">
        {/* Date, Time, Duration, Activity row */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1"><Calendar size={10} className="inline mr-1" />{lang === 'ko' ? '날짜' : 'Date'}</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1"><Clock size={10} className="inline mr-1" />{lang === 'ko' ? '시간' : 'Time'}</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '지속시간' : 'Duration'}</label>
            <input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. 5 min" className="w-full px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '활동/과제' : 'Task/Activity'}</label>
            <input type="text" value={activity} onChange={e => setActivity(e.target.value)} placeholder="e.g. Math worksheet" className="w-full px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
          </div>
        </div>

        {/* ABC Checkboxes */}
        <CheckboxSection title={lang === 'ko' ? 'A — 선행사건 (Antecedent)' : 'A — Antecedent'} subtitle={lang === 'ko' ? '행동 전에 무엇이 있었나요?' : 'What happened before the behavior?'} options={ANTECEDENT_OPTIONS} selected={antecedents} onToggle={(item) => toggleItem(antecedents, setAntecedents, item)} isOpen={openSection === 'antecedent'} onToggleOpen={() => setOpenSection(openSection === 'antecedent' ? null : 'antecedent')} color="#2563eb" />
        <CheckboxSection title={lang === 'ko' ? 'B — 행동 (Behavior)' : 'B — Behavior'} subtitle={lang === 'ko' ? '어떤 행동이 관찰되었나요?' : 'What did the student do?'} options={BEHAVIOR_OPTIONS} selected={behaviors} onToggle={(item) => toggleItem(behaviors, setBehaviors, item)} isOpen={openSection === 'behavior'} onToggleOpen={() => setOpenSection(openSection === 'behavior' ? null : 'behavior')} color="#dc2626" required />
        <CheckboxSection title={lang === 'ko' ? 'C — 결과 (Consequence)' : 'C — Consequence'} subtitle={lang === 'ko' ? '행동 후 어떤 조치가 취해졌나요?' : 'What happened after?'} options={CONSEQUENCE_OPTIONS} selected={consequences} onToggle={(item) => toggleItem(consequences, setConsequences, item)} isOpen={openSection === 'consequence'} onToggleOpen={() => setOpenSection(openSection === 'consequence' ? null : 'consequence')} color="#059669" />

        {/* Frequency, Intensity, Flag */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '빈도' : 'Frequency'}</label>
            <input type="number" min={1} max={99} value={frequency} onChange={e => setFrequency(parseInt(e.target.value) || 1)} className="w-full px-2 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy" />
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-2">{lang === 'ko' ? '강도 (1-5)' : 'Intensity (1-5)'}</label>
            <div className="flex gap-1">
              {INTENSITY_LABELS.map(level => (
                <button key={level.value} onClick={() => setIntensity(level.value)} title={level.desc}
                  className={`flex-1 py-1.5 rounded text-[11px] font-bold transition-all ${intensity === level.value ? 'text-white shadow-sm' : 'text-text-tertiary bg-surface-alt hover:opacity-80'}`}
                  style={intensity === level.value ? { backgroundColor: level.color } : {}}>
                  {level.value}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end pb-1">
            <button onClick={() => setIsFlagged(!isFlagged)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium transition-all border ${isFlagged ? 'bg-danger text-white border-danger' : 'bg-surface border-border text-text-secondary hover:border-danger/30'}`}>
              <Flag size={12} /> {isFlagged ? (lang === 'ko' ? '플래그됨' : 'Flagged') : (lang === 'ko' ? '플래그' : 'Flag for Admin')}
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold block mb-1">{lang === 'ko' ? '메모' : 'Notes'}</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder={lang === 'ko' ? '추가 메모...' : 'Additional notes about the incident...'}
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy resize-none" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-[12px] font-medium hover:bg-surface-alt">{lang === 'ko' ? '취소' : 'Cancel'}</button>
          <button onClick={handleSave} disabled={saving || behaviors.length === 0}
            className="px-5 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-40 flex items-center gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} {lang === 'ko' ? '저장' : 'Save Incident'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Checkbox Section ───────────────────────────────────────────────

function CheckboxSection({ title, subtitle, options, selected, onToggle, isOpen, onToggleOpen, color, required }: {
  title: string; subtitle: string; options: { category: string; items: string[] }[]
  selected: string[]; onToggle: (item: string) => void
  isOpen: boolean; onToggleOpen: () => void; color: string; required?: boolean
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={onToggleOpen} className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-surface-alt/50 transition-all">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[12px] font-semibold">{title}</span>
          {required && <span className="text-[9px] text-danger font-medium">*</span>}
          {selected.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: color }}>{selected.length}</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
      </button>
      {isOpen && (
        <div className="px-4 pb-3 border-t border-border/50">
          <p className="text-[10px] text-text-tertiary mt-2 mb-2">{subtitle}</p>
          {options.map(group => (
            <div key={group.category} className="mb-2">
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">{group.category}</p>
              <div className="flex flex-wrap gap-1">
                {group.items.map(item => {
                  const isSelected = selected.includes(item)
                  return (
                    <button key={item} onClick={() => onToggle(item)}
                      className={`px-2 py-1 rounded text-[11px] transition-all border ${isSelected ? 'text-white border-transparent font-medium' : 'bg-surface border-border text-text-secondary hover:border-navy/20'}`}
                      style={isSelected ? { backgroundColor: color } : {}}>
                      {item}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
