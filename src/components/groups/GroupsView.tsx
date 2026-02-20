'use client'

import { useState, useEffect, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Users, Target, BookOpen, UserPlus, Plus, X, Trash2, Printer, ChevronDown, AlertTriangle, Check, Loader2, RefreshCw, Pencil, Save } from 'lucide-react'

type GroupType = 'skill' | 'fluency' | 'litCircle' | 'partner' | 'custom'
type SubView = 'overview' | 'skill' | 'fluency' | 'litCircle' | 'partner'

interface StudentBasic { id: string; english_name: string; korean_name: string; english_class: string; grade: number; photo_url?: string }
interface Group {
  id: string; name: string; type: GroupType; english_class: string; focus?: string; notes?: string
  students: string[]; roles?: Record<string, string>; book?: string; created_at?: string; updated_at?: string
}

export default function GroupsView() {
  const { currentTeacher, lang } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass | null
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [subView, setSubView] = useState<SubView>('overview')
  const [students, setStudents] = useState<StudentBasic[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [grades, setGrades] = useState<Record<string, any[]>>({})

  // Load students and groups
  useEffect(() => {
    (async () => {
      setLoading(true)
      const [{ data: studs }, { data: grps }, { data: scoreData }] = await Promise.all([
        supabase.from('students').select('id, english_name, korean_name, english_class, grade, photo_url').eq('english_class', selectedClass).eq('is_active', true).order('english_name'),
        supabase.from('student_groups').select('*').eq('english_class', selectedClass).order('created_at', { ascending: false }),
        supabase.from('scores').select('student_id, score, assessments!inner(domain, max_score, english_class)').eq('assessments.english_class', selectedClass),
      ])
      setStudents(studs || [])
      setGroups((grps || []).map((g: any) => ({ ...g, students: g.student_ids || [] })))
      // Build grades by student
      const gm: Record<string, any[]> = {}
      scoreData?.forEach((s: any) => {
        if (!gm[s.student_id]) gm[s.student_id] = []
        gm[s.student_id].push(s)
      })
      setGrades(gm)
      setLoading(false)
    })()
  }, [selectedClass])

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    groups.forEach(g => { counts[g.type] = (counts[g.type] || 0) + 1 })
    return counts
  }, [groups])

  const TABS: { id: SubView; icon: any; label: string; count?: number }[] = [
    { id: 'overview', icon: Users, label: 'Overview' },
    { id: 'skill', icon: Target, label: 'Skill Groups', count: classCounts.skill || 0 },
    { id: 'fluency', icon: BookOpen, label: 'Fluency Groups', count: classCounts.fluency || 0 },
    { id: 'litCircle', icon: BookOpen, label: 'Literature Circles', count: classCounts.litCircle || 0 },
    { id: 'partner', icon: UserPlus, label: 'Partner Pairs', count: classCounts.partner || 0 },
  ]

  const saveGroup = async (group: Group) => {
    const payload = {
      name: group.name, type: group.type, english_class: selectedClass,
      focus: group.focus || null, notes: group.notes || null,
      student_ids: group.students, roles: group.roles || null, book: group.book || null,
      created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
    }
    if (group.id.startsWith('new-')) {
      const { data, error } = await supabase.from('student_groups').insert(payload).select().single()
      if (error) return null
      return { ...data, students: data.student_ids || [] }
    } else {
      const { data, error } = await supabase.from('student_groups').update(payload).eq('id', group.id).select().single()
      if (error) return null
      return { ...data, students: data.student_ids || [] }
    }
  }

  const deleteGroup = async (id: string) => {
    if (id.startsWith('new-')) {
      setGroups(prev => prev.filter(g => g.id !== id))
      return
    }
    await supabase.from('student_groups').delete().eq('id', id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <div className="px-10 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-navy">Student Groups</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">Organize students for targeted instruction, literature circles, and partner work</p>
          </div>
        </div>

        {/* Class selector */}
        {isAdmin && (
          <div className="flex items-center gap-1 mb-4">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mr-2">Class</span>
            {ENGLISH_CLASSES.map(c => (
              <button key={c} onClick={() => setSelectedClass(c)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${selectedClass === c ? `${classToColor(c)} ${classToTextColor(c)} shadow-sm` : 'text-text-secondary hover:bg-surface-alt'}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {/* Sub-tabs */}
        <div className="flex items-center gap-1 border-b border-border pb-0">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setSubView(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[12px] font-medium transition-all border-b-2 ${
                subView === tab.id ? 'border-navy text-navy bg-surface' : 'border-transparent text-text-secondary hover:text-navy hover:bg-surface-alt/50'
              }`}>
              <tab.icon size={14} />
              {tab.label}
              {tab.count != null && tab.count > 0 && <span className="text-[9px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full ml-1">{tab.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 size={20} className="animate-spin text-navy" /></div>
      ) : (
        <div className="px-10 pb-10">
          {subView === 'overview' && <OverviewTab students={students} groups={groups} grades={grades} selectedClass={selectedClass} onNavigate={setSubView} />}
          {subView === 'skill' && <GroupManager type="skill" students={students} groups={groups.filter(g => g.type === 'skill')} grades={grades} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} selectedClass={selectedClass} />}
          {subView === 'fluency' && <GroupManager type="fluency" students={students} groups={groups.filter(g => g.type === 'fluency')} grades={grades} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} selectedClass={selectedClass} />}
          {subView === 'litCircle' && <LitCircleManager students={students} groups={groups.filter(g => g.type === 'litCircle')} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} />}
          {subView === 'partner' && <PartnerManager students={students} groups={groups.filter(g => g.type === 'partner')} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} />}
        </div>
      )}
    </div>
  )
}

// ─── Overview Tab ───────────────────────────────────────────────────
function OverviewTab({ students, groups, grades, selectedClass, onNavigate }: {
  students: StudentBasic[]; groups: Group[]; grades: Record<string, any[]>; selectedClass: string; onNavigate: (v: SubView) => void
}) {
  // Find students not in any group
  const allGroupedIds = new Set(groups.flatMap(g => g.students))
  const ungrouped = students.filter(s => !allGroupedIds.has(s.id))
  // Students in 3+ groups
  const groupCounts: Record<string, number> = {}
  groups.forEach(g => g.students.forEach(sid => { groupCounts[sid] = (groupCounts[sid] || 0) + 1 }))
  const overloaded = students.filter(s => (groupCounts[s.id] || 0) >= 3)

  const cards = [
    { type: 'skill' as SubView, icon: Target, label: 'Skill Groups', desc: 'Data-driven groups by weak standard', count: groups.filter(g => g.type === 'skill').length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { type: 'fluency' as SubView, icon: BookOpen, label: 'Fluency Groups', desc: 'Grouped by reading level/CWPM', count: groups.filter(g => g.type === 'fluency').length, color: 'bg-green-50 border-green-200 text-green-700' },
    { type: 'litCircle' as SubView, icon: BookOpen, label: 'Literature Circles', desc: 'Book clubs with rotating roles', count: groups.filter(g => g.type === 'litCircle').length, color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { type: 'partner' as SubView, icon: UserPlus, label: 'Partner Pairs', desc: 'Mixed-ability partner assignments', count: groups.filter(g => g.type === 'partner').length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  ]

  return (
    <div className="space-y-6 mt-4">
      {/* Group type cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <button key={c.type} onClick={() => onNavigate(c.type)} className={`text-left border rounded-xl p-4 transition-all hover:shadow-sm ${c.color}`}>
            <c.icon size={20} className="mb-2" />
            <h3 className="text-[14px] font-bold">{c.label}</h3>
            <p className="text-[10px] opacity-70 mt-0.5">{c.desc}</p>
            <p className="text-[20px] font-bold mt-2">{c.count} <span className="text-[11px] font-normal">group{c.count !== 1 ? 's' : ''}</span></p>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {(ungrouped.length > 0 || overloaded.length > 0) && (
        <div className="space-y-2">
          {ungrouped.length > 0 && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-amber-800">
                  {ungrouped.length} student{ungrouped.length !== 1 ? 's' : ''} not in any group
                </p>
                <p className="text-[10px] text-amber-700 mt-0.5">{ungrouped.map(s => s.english_name).join(', ')}</p>
              </div>
            </div>
          )}
          {overloaded.length > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
              <AlertTriangle size={14} className="text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-red-800">
                  {overloaded.length} student{overloaded.length !== 1 ? 's' : ''} in 3+ groups (may be overloaded)
                </p>
                <p className="text-[10px] text-red-700 mt-0.5">{overloaded.map(s => `${s.english_name} (${groupCounts[s.id]})`).join(', ')}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All groups summary */}
      {groups.length > 0 && (
        <div>
          <h3 className="text-[13px] font-semibold text-navy mb-2">Active Groups ({groups.length})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {groups.map(g => (
              <div key={g.id} className="bg-surface border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                    g.type === 'skill' ? 'bg-blue-100 text-blue-700' : g.type === 'fluency' ? 'bg-green-100 text-green-700' :
                    g.type === 'litCircle' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                  }`}>{g.type === 'litCircle' ? 'Lit Circle' : g.type}</span>
                  <span className="text-[12px] font-semibold text-navy">{g.name}</span>
                </div>
                {g.focus && <p className="text-[10px] text-text-secondary">{g.focus}</p>}
                <p className="text-[10px] text-text-tertiary mt-1">{g.students.length} students · {g.book ? `📖 ${g.book}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {groups.length === 0 && (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl">
          <Users size={32} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-text-secondary">No groups yet</p>
          <p className="text-[11px] text-text-tertiary mt-1">Click a group type above to get started</p>
        </div>
      )}
    </div>
  )
}

// ─── Group Manager (Skill & Fluency) ──────────────────────────────
function GroupManager({ type, students, groups, grades, setGroups, onSave, onDelete, selectedClass }: {
  type: GroupType; students: StudentBasic[]; groups: Group[]; grades: Record<string, any[]>
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>; onSave: (g: Group) => Promise<any>; onDelete: (id: string) => void
  selectedClass: string
}) {
  const { showToast } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addGroup = () => {
    const newGroup: Group = {
      id: `new-${Date.now()}`, name: type === 'skill' ? 'New Skill Group' : 'New Fluency Group',
      type, english_class: selectedClass, students: [], focus: '', notes: '',
    }
    setGroups(prev => [newGroup, ...prev])
    setEditingId(newGroup.id)
  }

  const updateGroup = (id: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  const toggleStudent = (groupId: string, studentId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const has = g.students.includes(studentId)
      return { ...g, students: has ? g.students.filter(s => s !== studentId) : [...g.students, studentId] }
    }))
  }

  const handleSave = async (group: Group) => {
    setSaving(true)
    const saved = await onSave(group)
    setSaving(false)
    if (saved) {
      setGroups(prev => prev.map(g => g.id === group.id ? saved : g))
      setEditingId(null)
      showToast('Group saved')
    } else {
      showToast('Error saving group')
    }
  }

  const handlePrint = (group: Group) => {
    const pw = window.open('', '_blank'); if (!pw) return
    const memberNames = group.students.map(sid => {
      const s = students.find(st => st.id === sid)
      return s ? `<tr><td style="padding:4px 8px;border:1px solid #ddd">${s.english_name}</td><td style="padding:4px 8px;border:1px solid #ddd">${s.korean_name}</td></tr>` : ''
    }).join('')
    pw.document.write(`<html><head><title>${group.name}</title></head><body style="font-family:Arial;padding:20px">
      <h2 style="color:#1e3a5f;margin-bottom:4px">${group.name}</h2>
      <p style="color:#666;font-size:12px">${group.focus || ''} · ${group.students.length} students</p>
      <table style="border-collapse:collapse;margin-top:12px;width:100%"><thead><tr><th style="padding:4px 8px;border:1px solid #ddd;background:#f1f5f9;text-align:left">English Name</th><th style="padding:4px 8px;border:1px solid #ddd;background:#f1f5f9;text-align:left">Korean Name</th></tr></thead><tbody>${memberNames}</tbody></table>
      ${group.notes ? `<p style="margin-top:12px;font-size:12px;color:#666">Notes: ${group.notes}</p>` : ''}
    </body></html>`)
    pw.document.close(); pw.print()
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-navy">{type === 'skill' ? 'Skill Groups' : 'Fluency Groups'}</h2>
        <button onClick={addGroup} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
          <Plus size={13} /> New Group
        </button>
      </div>

      {type === 'skill' && (
        <p className="text-[11px] text-text-secondary bg-blue-50 border border-blue-200 rounded-lg p-3">
          💡 Tip: Create groups based on weak standards from your assessments. Students who share the same gaps can be taught together.
        </p>
      )}

      {groups.length === 0 && (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl">
          <p className="text-[13px] text-text-secondary">No {type === 'skill' ? 'skill' : 'fluency'} groups yet</p>
          <p className="text-[10px] text-text-tertiary mt-1">Click "New Group" to create one</p>
        </div>
      )}

      {groups.map(group => {
        const isEditing = editingId === group.id
        return (
          <div key={group.id} className="bg-surface border border-border rounded-2xl overflow-hidden">
            {/* Group header */}
            <div className="px-5 py-3 bg-surface-alt/50 flex items-center gap-3">
              {isEditing ? (
                <input value={group.name} onChange={e => updateGroup(group.id, { name: e.target.value })}
                  className="text-[14px] font-bold text-navy bg-transparent border-b border-navy/30 outline-none flex-1" />
              ) : (
                <h3 className="text-[14px] font-bold text-navy flex-1">{group.name}</h3>
              )}
              <span className="text-[10px] text-text-tertiary">{group.students.length} students</span>
              {isEditing ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => handleSave(group)} disabled={saving}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy text-white hover:bg-navy-dark disabled:opacity-50">
                    <Save size={11} /> {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button onClick={() => { if (group.id.startsWith('new-')) onDelete(group.id); setEditingId(null) }}
                    className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePrint(group)} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary" title="Print"><Printer size={13} /></button>
                  <button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary" title="Edit"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm('Delete this group?')) onDelete(group.id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-text-tertiary hover:text-red-500" title="Delete"><Trash2 size={13} /></button>
                </div>
              )}
            </div>

            {/* Focus / notes */}
            {isEditing && (
              <div className="px-5 py-2 border-b border-border flex gap-3">
                <input value={group.focus || ''} onChange={e => updateGroup(group.id, { focus: e.target.value })}
                  placeholder="Focus (e.g. RL.2.1 Key Ideas)" className="flex-1 px-2 py-1 text-[11px] border border-border rounded-lg outline-none" />
                <input value={group.notes || ''} onChange={e => updateGroup(group.id, { notes: e.target.value })}
                  placeholder="Notes (optional)" className="flex-1 px-2 py-1 text-[11px] border border-border rounded-lg outline-none" />
              </div>
            )}
            {!isEditing && group.focus && <p className="px-5 py-1.5 text-[10px] text-text-secondary border-b border-border/50">Focus: {group.focus}</p>}

            {/* Student list */}
            <div className="p-4">
              {isEditing ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {students.map(s => {
                    const inGroup = group.students.includes(s.id)
                    return (
                      <button key={s.id} onClick={() => toggleStudent(group.id, s.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-left transition-all ${
                          inGroup ? 'bg-navy/10 text-navy border border-navy/20' : 'bg-surface-alt/50 text-text-secondary hover:bg-surface-alt border border-transparent'
                        }`}>
                        <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${inGroup ? 'bg-navy text-white' : 'border border-border'}`}>
                          {inGroup && <Check size={10} />}
                        </span>
                        <span className="truncate font-medium">{s.english_name}</span>
                        <span className="text-[9px] text-text-tertiary ml-auto">{s.korean_name}</span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {group.students.map(sid => {
                    const s = students.find(st => st.id === sid)
                    if (!s) return null
                    return (
                      <span key={sid} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-alt text-[10px] font-medium text-text-primary">
                        {s.english_name}
                      </span>
                    )
                  })}
                  {group.students.length === 0 && <span className="text-[10px] text-text-tertiary italic">No students assigned</span>}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Literature Circles ─────────────────────────────────────────────
const LIT_ROLES = ['Discussion Leader', 'Summarizer', 'Word Wizard', 'Connector', 'Illustrator', 'Passage Picker']

function LitCircleManager({ students, groups, setGroups, onSave, onDelete }: {
  students: StudentBasic[]; groups: Group[]; setGroups: React.Dispatch<React.SetStateAction<Group[]>>
  onSave: (g: Group) => Promise<any>; onDelete: (id: string) => void
}) {
  const { showToast } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const addCircle = () => {
    const newGroup: Group = {
      id: `new-${Date.now()}`, name: 'New Literature Circle',
      type: 'litCircle', english_class: '', students: [], roles: {}, book: '',
    }
    setGroups(prev => [newGroup, ...prev])
    setEditingId(newGroup.id)
  }

  const updateGroup = (id: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g))
  }

  const toggleStudent = (groupId: string, studentId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      const has = g.students.includes(studentId)
      return { ...g, students: has ? g.students.filter(s => s !== studentId) : [...g.students, studentId] }
    }))
  }

  const setRole = (groupId: string, studentId: string, role: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g
      return { ...g, roles: { ...(g.roles || {}), [studentId]: role } }
    }))
  }

  const handleSave = async (group: Group) => {
    setSaving(true)
    const saved = await onSave(group)
    setSaving(false)
    if (saved) { setGroups(prev => prev.map(g => g.id === group.id ? saved : g)); setEditingId(null); showToast('Saved') }
  }

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-navy">Literature Circles</h2>
        <button onClick={addCircle} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
          <Plus size={13} /> New Circle
        </button>
      </div>

      <p className="text-[11px] text-text-secondary bg-purple-50 border border-purple-200 rounded-lg p-3">
        📚 Assign books and rotate roles weekly. Each student takes a role during group discussions.
      </p>

      {groups.length === 0 && (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl">
          <p className="text-[13px] text-text-secondary">No literature circles yet</p>
        </div>
      )}

      {groups.map(group => {
        const isEditing = editingId === group.id
        return (
          <div key={group.id} className="bg-surface border border-purple-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 bg-purple-50/50 flex items-center gap-3">
              {isEditing ? (
                <input value={group.name} onChange={e => updateGroup(group.id, { name: e.target.value })}
                  className="text-[14px] font-bold text-navy bg-transparent border-b border-navy/30 outline-none" placeholder="Circle name" />
              ) : (
                <h3 className="text-[14px] font-bold text-navy">{group.name}</h3>
              )}
              {isEditing ? (
                <input value={group.book || ''} onChange={e => updateGroup(group.id, { book: e.target.value })}
                  className="text-[11px] bg-white border border-border rounded-lg px-2 py-1 outline-none flex-1" placeholder="Book title" />
              ) : group.book ? (
                <span className="text-[11px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">📖 {group.book}</span>
              ) : null}
              <span className="text-[10px] text-text-tertiary ml-auto">{group.students.length} students</span>
              {isEditing ? (
                <div className="flex gap-1">
                  <button onClick={() => handleSave(group)} disabled={saving} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy text-white"><Save size={11} /> Save</button>
                  <button onClick={() => { if (group.id.startsWith('new-')) onDelete(group.id); setEditingId(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><Pencil size={13} /></button>
                  <button onClick={() => { if (confirm('Delete?')) onDelete(group.id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-text-tertiary hover:text-red-500"><Trash2 size={13} /></button>
                </div>
              )}
            </div>

            <div className="p-4">
              {isEditing ? (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-text-secondary uppercase">Select students & assign roles:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {students.map(s => {
                      const inGroup = group.students.includes(s.id)
                      return (
                        <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${inGroup ? 'bg-purple-50 border border-purple-200' : 'bg-surface-alt/30'}`}>
                          <button onClick={() => toggleStudent(group.id, s.id)}
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${inGroup ? 'bg-purple-600 text-white' : 'border border-border'}`}>
                            {inGroup && <Check size={10} />}
                          </button>
                          <span className="text-[11px] font-medium truncate">{s.english_name}</span>
                          {inGroup && (
                            <select value={(group.roles || {})[s.id] || ''} onChange={e => setRole(group.id, s.id, e.target.value)}
                              className="ml-auto text-[9px] bg-white border border-border rounded px-1 py-0.5 outline-none">
                              <option value="">-- Role --</option>
                              {LIT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {group.students.map(sid => {
                    const s = students.find(st => st.id === sid)
                    const role = (group.roles || {})[sid]
                    return s ? (
                      <div key={sid} className="flex items-center gap-2 text-[11px]">
                        <span className="font-medium text-navy">{s.english_name}</span>
                        {role && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{role}</span>}
                      </div>
                    ) : null
                  })}
                  {group.students.length === 0 && <span className="text-[10px] text-text-tertiary italic">No students assigned</span>}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Partner Pairs ──────────────────────────────────────────────────
function PartnerManager({ students, groups, setGroups, onSave, onDelete }: {
  students: StudentBasic[]; groups: Group[]; setGroups: React.Dispatch<React.SetStateAction<Group[]>>
  onSave: (g: Group) => Promise<any>; onDelete: (id: string) => void
}) {
  const { showToast } = useApp()
  const [saving, setSaving] = useState(false)

  const addPair = () => {
    const newGroup: Group = {
      id: `new-${Date.now()}`, name: `Pair ${groups.length + 1}`,
      type: 'partner', english_class: '', students: [],
    }
    setGroups(prev => [newGroup, ...prev])
  }

  const updatePair = (id: string, studentIdx: 0 | 1, studentId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== id) return g
      const newStudents = [...g.students]
      newStudents[studentIdx] = studentId
      return { ...g, students: newStudents.filter(Boolean) }
    }))
  }

  const saveAll = async () => {
    setSaving(true)
    let errors = 0
    for (const g of groups) {
      if (g.students.length >= 2) {
        const saved = await onSave(g)
        if (saved) setGroups(prev => prev.map(p => p.id === g.id ? saved : p))
        else errors++
      }
    }
    setSaving(false)
    showToast(errors > 0 ? `Saved with ${errors} error(s)` : 'All pairs saved')
  }

  // Track who's already paired
  const pairedIds = new Set(groups.flatMap(g => g.students))

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-navy">Partner Pairs</h2>
        <div className="flex gap-2">
          <button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark disabled:opacity-50">
            <Save size={13} /> Save All
          </button>
          <button onClick={addPair} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface border border-border hover:bg-surface-alt">
            <Plus size={13} /> Add Pair
          </button>
        </div>
      </div>

      <p className="text-[11px] text-text-secondary bg-amber-50 border border-amber-200 rounded-lg p-3">
        🤝 Create mixed-ability partner pairs for buddy reading, peer editing, and think-pair-share activities.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {groups.map((g, i) => (
          <div key={g.id} className="bg-surface border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-semibold text-navy">Pair {i + 1}</span>
              <button onClick={() => { if (confirm('Remove pair?')) onDelete(g.id) }}
                className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500"><Trash2 size={12} /></button>
            </div>
            <div className="space-y-1.5">
              {[0, 1].map(idx => (
                <select key={idx} value={g.students[idx] || ''} onChange={e => updatePair(g.id, idx as 0 | 1, e.target.value)}
                  className="w-full px-2 py-1.5 text-[11px] border border-border rounded-lg bg-surface outline-none focus:border-navy">
                  <option value="">-- Select student --</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id} disabled={g.students.includes(s.id) && g.students[idx] !== s.id}>
                      {s.english_name} {s.korean_name}
                    </option>
                  ))}
                </select>
              ))}
            </div>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl">
          <p className="text-[13px] text-text-secondary">No partner pairs yet</p>
        </div>
      )}
    </div>
  )
}
