'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Users, Target, BookOpen, Plus, X, Trash2, Printer, AlertTriangle, Check, Loader2, Pencil, Save, Archive, RotateCcw, Ban, Eye, EyeOff, PenTool, Layers, Search, ChevronDown, ChevronRight, UserPlus, ArrowRight } from 'lucide-react'
import EmptyState from '@/components/shared/EmptyState'

type GroupType = 'reading' | 'writing' | 'skill' | 'custom'

interface StudentBasic { id: string; english_name: string; korean_name: string; english_class: string; grade: number; photo_url?: string }
interface Group {
  id: string; name: string; type: GroupType; english_class: string; grade?: number
  focus?: string; notes?: string; book?: string
  students: string[]; roles?: Record<string, string>
  is_archived?: boolean; archived_at?: string
  tasks?: { text: string; done: boolean; created_at: string }[]
  created_at?: string; updated_at?: string
}
interface Exclusion { id: string; student_a: string; student_b: string; english_class: string; reason?: string }

const TYPE_BADGE_STYLES: Record<GroupType, string> = {
  reading: 'bg-blue-100 text-blue-700 border-blue-200',
  writing: 'bg-amber-100 text-amber-700 border-amber-200',
  skill: 'bg-green-100 text-green-700 border-green-200',
  custom: 'bg-purple-100 text-purple-700 border-purple-200',
}

const TYPE_CARD_STYLES: Record<GroupType, string> = {
  reading: 'border-l-blue-400',
  writing: 'border-l-amber-400',
  skill: 'border-l-green-400',
  custom: 'border-l-purple-400',
}

const TYPE_ICONS: Record<GroupType, any> = { reading: BookOpen, writing: PenTool, skill: Target, custom: Layers }

export default function GroupsView() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass | null
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [students, setStudents] = useState<StudentBasic[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [studentScores, setStudentScores] = useState<Record<string, Record<string, number>>>({})
  const [studentCWPM, setStudentCWPM] = useState<Record<string, { cwpm: number; accuracy: number; date: string }>>({})
  const [studentWIDA, setStudentWIDA] = useState<Record<string, number>>({})

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingGroup, setSavingGroup] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Group>>({})
  const [showExclusions, setShowExclusions] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [newTaskText, setNewTaskText] = useState('')

  // Student action popover: which student is being moved/added
  const [activeStudentPopover, setActiveStudentPopover] = useState<string | null>(null)

  // New group inline form
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupType, setNewGroupType] = useState<GroupType>('custom')

  useEffect(() => {
    if (editingId) {
      const g = groups.find(gr => gr.id === editingId)
      if (g) setEditForm({ name: g.name, focus: g.focus, book: g.book, notes: g.notes, students: [...g.students], tasks: g.tasks ? [...g.tasks] : [] })
    } else {
      setEditForm({})
    }
  }, [editingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const availableGrades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).sort(), [students])

  useEffect(() => {
    if (availableGrades.length > 0 && (selectedGrade === null || !availableGrades.includes(selectedGrade)))
      setSelectedGrade(availableGrades[0])
  }, [availableGrades, selectedGrade])

  const gradeStudents = useMemo(() => selectedGrade ? students.filter(s => s.grade === selectedGrade) : students, [students, selectedGrade])

  // Load data
  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: studs } = await supabase.from('students').select('id, english_name, korean_name, english_class, grade, photo_url').eq('english_class', selectedClass).eq('is_active', true).order('english_name')
      setStudents(studs || [])

      const { data: grps, error: grpsErr } = await supabase.from('student_groups').select('*').eq('english_class', selectedClass).order('created_at', { ascending: false })
      if (grpsErr) { setGroups([]) } else {
        const typeMap: Record<string, GroupType> = { fluency: 'reading', litCircle: 'custom', partner: 'custom' }
        setGroups((grps || []).map((g: any) => ({ ...g, type: typeMap[g.type] || g.type, students: g.student_ids || [], tasks: g.tasks || [] })))
      }

      try {
        const { data: excl, error: exclErr } = await supabase.from('student_exclusions').select('*').eq('english_class', selectedClass)
        if (!exclErr && excl) setExclusions(excl)
      } catch { }

      // Domain scores
      try {
        const { data: scoreData } = await supabase.from('grades').select('student_id, score, assessments!inner(domain, max_score)').eq('assessments.english_class', selectedClass).not('score', 'is', null)
        const scoreMap: Record<string, Record<string, { total: number; count: number }>> = {}
        ;(scoreData || []).forEach((s: any) => {
          const sid = s.student_id; const domain = s.assessments?.domain
          if (!sid || !domain) return
          const pct = s.assessments?.max_score > 0 ? (s.score / s.assessments.max_score) * 100 : 0
          if (!scoreMap[sid]) scoreMap[sid] = {}
          if (!scoreMap[sid][domain]) scoreMap[sid][domain] = { total: 0, count: 0 }
          scoreMap[sid][domain].total += pct; scoreMap[sid][domain].count += 1
        })
        const avgMap: Record<string, Record<string, number>> = {}
        Object.entries(scoreMap).forEach(([sid, domains]) => {
          avgMap[sid] = {}
          Object.entries(domains).forEach(([d, v]) => { avgMap[sid][d] = Math.round(v.total / v.count) })
        })
        setStudentScores(avgMap)
      } catch { }

      // CWPM
      try {
        const { data: readingData } = await supabase.from('reading_assessments').select('student_id, cwpm, accuracy_rate, date').order('date', { ascending: false })
        const cwpmMap: Record<string, { cwpm: number; accuracy: number; date: string }> = {}
        ;(readingData || []).forEach((r: any) => { if (!cwpmMap[r.student_id] && r.cwpm != null) cwpmMap[r.student_id] = { cwpm: r.cwpm, accuracy: r.accuracy_rate || 0, date: r.date } })
        setStudentCWPM(cwpmMap)
      } catch { }

      // WIDA
      try {
        const { data: widaData } = await supabase.from('wida_profiles').select('student_id, overall_level')
        const widaMap: Record<string, number> = {}
        ;(widaData || []).forEach((w: any) => { if (w.overall_level > 0) widaMap[w.student_id] = w.overall_level })
        setStudentWIDA(widaMap)
      } catch { }

      setLoading(false)
    })()
  }, [selectedClass])

  const activeGroups = useMemo(() => groups.filter(g => !g.is_archived), [groups])
  const filteredGroups = useMemo(() => {
    if (showArchived) return groups.filter(g => g.is_archived)
    return activeGroups.filter(g => {
      if (selectedGrade && g.grade && g.grade !== selectedGrade) return false
      if (!g.grade && selectedGrade && g.students.length > 0) {
        return g.students.some(sid => { const s = students.find(st => st.id === sid); return s && s.grade === selectedGrade })
      }
      return true
    })
  }, [groups, selectedGrade, showArchived, students, activeGroups])

  const ungrouped = useMemo(() => {
    return gradeStudents.filter(s => !activeGroups.some(g => g.students.includes(s.id)))
  }, [gradeStudents, activeGroups])

  // ── CRUD ──
  const saveGroup = async (group: Group) => {
    const payload = {
      name: group.name, type: group.type, english_class: selectedClass, grade: selectedGrade,
      focus: group.focus || null, notes: group.notes || null, book: group.book || null,
      student_ids: group.students, roles: group.roles || null, tasks: group.tasks || [],
      is_archived: group.is_archived || false, archived_at: group.archived_at || null,
      suggested_by: 'manual', created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
    }
    if (group.id.startsWith('new-')) {
      const { data, error } = await supabase.from('student_groups').insert(payload).select().single()
      if (error) { showToast('Error: ' + error.message); return null }
      return { ...data, students: data.student_ids || [], tasks: data.tasks || [] }
    } else {
      const { data, error } = await supabase.from('student_groups').update(payload).eq('id', group.id).select().single()
      if (error) { showToast('Error: ' + error.message); return null }
      return { ...data, students: data.student_ids || [], tasks: data.tasks || [] }
    }
  }

  const deleteGroup = async (id: string) => {
    if (id.startsWith('new-')) { setGroups(prev => prev.filter(g => g.id !== id)); return }
    await supabase.from('student_groups').delete().eq('id', id)
    setGroups(prev => prev.filter(g => g.id !== id))
  }

  const archiveGroup = async (id: string) => {
    const now = new Date().toISOString()
    await supabase.from('student_groups').update({ is_archived: true, archived_at: now }).eq('id', id)
    setGroups(prev => prev.map(g => g.id === id ? { ...g, is_archived: true, archived_at: now } : g))
    showToast('Group archived')
  }

  const restoreGroup = async (id: string) => {
    await supabase.from('student_groups').update({ is_archived: false, archived_at: null }).eq('id', id)
    setGroups(prev => prev.map(g => g.id === id ? { ...g, is_archived: false, archived_at: undefined } : g))
    showToast('Group restored')
  }

  // Quick add student to group (from ungrouped pool or move between groups)
  const addStudentToGroup = async (studentId: string, groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group || group.students.includes(studentId)) return
    const updated = { ...group, students: [...group.students, studentId] }
    const saved = await saveGroup(updated)
    if (saved) { setGroups(prev => prev.map(g => g.id === groupId ? saved : g)); showToast('Student added') }
    setActiveStudentPopover(null)
  }

  const removeStudentFromGroup = async (studentId: string, groupId: string) => {
    const group = groups.find(g => g.id === groupId)
    if (!group) return
    const updated = { ...group, students: group.students.filter(id => id !== studentId) }
    const saved = await saveGroup(updated)
    if (saved) { setGroups(prev => prev.map(g => g.id === groupId ? saved : g)); showToast('Student removed') }
    setActiveStudentPopover(null)
  }

  // ── Helpers ──
  const extraStudentInfo = (sid: string, type: GroupType): string => {
    if (type === 'reading') { const d = studentCWPM[sid]; return d ? d.cwpm + 'wpm' : '' }
    if (type === 'writing') { const scores = studentScores[sid]; return scores?.writing != null ? scores.writing + '%' : '' }
    if (type === 'skill') {
      const scores = studentScores[sid]
      if (!scores || Object.keys(scores).length === 0) return ''
      return Object.entries(scores).slice(0, 3).map(([d, v]) => d[0].toUpperCase() + v).join(' ')
    }
    return ''
  }

  const WidaBadge = ({ studentId }: { studentId: string }) => {
    const level = studentWIDA[studentId]
    if (!level) return null
    const colors = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700']
    return <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${colors[level] || 'bg-gray-100'}`} title={'WIDA Level ' + level}>W{level}</span>
  }

  const getWarnings = (group: Group) => {
    const w: string[] = []
    exclusions.forEach(ex => {
      if (group.students.includes(ex.student_a) && group.students.includes(ex.student_b)) {
        const a = students.find(s => s.id === ex.student_a)
        const b = students.find(s => s.id === ex.student_b)
        if (a && b) w.push(a.english_name + ' & ' + b.english_name)
      }
    })
    return w
  }

  const toggleStudent = (sid: string) => {
    setEditForm(prev => ({
      ...prev,
      students: (prev.students || []).includes(sid)
        ? (prev.students || []).filter(s => s !== sid)
        : [...(prev.students || []), sid]
    }))
  }

  const handleSave = async (group: Group) => {
    setSavingGroup(true)
    const merged = { ...group, ...editForm, students: editForm.students || group.students, tasks: editForm.tasks || group.tasks }
    const saved = await saveGroup(merged)
    if (saved) { setGroups(prev => prev.map(g => g.id === group.id ? saved : g)); setEditingId(null); showToast('Group saved') }
    setSavingGroup(false)
  }

  const handleRenameCommit = async (group: Group) => {
    if (renameValue.trim() && renameValue !== group.name) {
      const updated = { ...group, name: renameValue.trim() }
      const saved = await saveGroup(updated)
      if (saved) { setGroups(prev => prev.map(g => g.id === group.id ? saved : g)); showToast('Renamed') }
    }
    setRenamingId(null); setRenameValue('')
  }

  const handlePrint = (group: Group) => {
    const members = group.students.map(sid => students.find(s => s.id === sid)).filter(Boolean)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`<html><head><title>${group.name}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet"><style>body{font-family:Inter,sans-serif;padding:20px;color:#1A1F2E}table{border-collapse:collapse;width:100%}th,td{border:1px solid #C8CED8;padding:6px;text-align:left;font-size:13px}th{background:#F0F3F8}h2{margin:0 0 4px;color:#647FBC}p{margin:0 0 12px;color:#5A6275;font-size:12px}</style></head><body>`)
    w.document.write(`<h2>${group.name}</h2><p>${group.focus || ''}</p>`)
    if (group.notes) w.document.write(`<p><em>${group.notes}</em></p>`)
    w.document.write('<table><tr><th>#</th><th>English Name</th><th>Korean Name</th><th>WIDA</th>')
    if (group.type === 'reading') w.document.write('<th>CWPM</th>')
    if (group.type === 'writing') w.document.write('<th>Writing %</th>')
    w.document.write('</tr>')
    members.forEach((s: any, i) => {
      const wida = studentWIDA[s.id]
      let extra = ''
      if (group.type === 'reading') { const d = studentCWPM[s.id]; extra = '<td>' + (d ? d.cwpm + ' wpm' : '--') + '</td>' }
      if (group.type === 'writing') { const sc = studentScores[s.id]; extra = '<td>' + (sc?.writing != null ? sc.writing + '%' : '--') + '</td>' }
      w.document.write(`<tr><td>${i + 1}</td><td>${s.english_name}</td><td>${s.korean_name}</td><td>${wida ? 'Level ' + wida : '--'}</td>${extra}</tr>`)
    })
    w.document.write('</table></body></html>')
    w.document.close(); w.print()
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    const newG: Group = { id: 'new-' + Date.now(), name: newGroupName.trim(), type: newGroupType, english_class: selectedClass, grade: selectedGrade || undefined, students: [], tasks: [] }
    const saved = await saveGroup(newG)
    if (saved) { setGroups(prev => [saved, ...prev]); showToast('Group created') }
    setNewGroupName(''); setShowNewGroupForm(false)
  }

  // ── Student chip with popover ──
  const StudentChip = ({ student, groupId, type }: { student: StudentBasic; groupId?: string; type?: GroupType }) => {
    const isActive = activeStudentPopover === student.id + (groupId || 'ungrouped')
    const popoverId = student.id + (groupId || 'ungrouped')
    const extra = type ? extraStudentInfo(student.id, type) : ''
    const cwpmData = studentCWPM[student.id]

    return (
      <div className="relative">
        <button
          onClick={() => setActiveStudentPopover(isActive ? null : popoverId)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
            isActive ? 'bg-navy/10 border-navy/20 text-navy' : 'bg-surface-alt/60 border-transparent text-text-primary hover:bg-surface-alt hover:border-border'
          }`}
        >
          <span>{student.english_name}</span>
          <WidaBadge studentId={student.id} />
          {extra && <span className="text-[8px] text-text-tertiary">{extra}</span>}
          {!type && cwpmData && <span className="text-[8px] text-text-tertiary">{cwpmData.cwpm}wpm</span>}
        </button>
        {isActive && (
          <div className="absolute z-50 left-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
            {groupId ? (
              <>
                {activeGroups.filter(g => g.id !== groupId && !g.students.includes(student.id)).map(g => (
                  <button key={g.id} onClick={() => { removeStudentFromGroup(student.id, groupId); addStudentToGroup(student.id, g.id) }}
                    className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2">
                    <ArrowRight size={10} className="text-text-tertiary" /> Move to {g.name}
                  </button>
                ))}
                <div className="border-t border-border my-0.5" />
                <button onClick={() => removeStudentFromGroup(student.id, groupId)}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-red-50 text-red-600 flex items-center gap-2">
                  <X size={10} /> Remove from group
                </button>
              </>
            ) : (
              activeGroups.length > 0 ? activeGroups.filter(g => !g.students.includes(student.id)).map(g => (
                <button key={g.id} onClick={() => addStudentToGroup(student.id, g.id)}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2">
                  <UserPlus size={10} className="text-text-tertiary" /> {g.name}
                </button>
              )) : (
                <p className="px-3 py-2 text-[10px] text-text-tertiary">Create a group first</p>
              )
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Exclusions Manager ──
  function ExclusionsManager() {
    const [studentA, setStudentA] = useState('')
    const [studentB, setStudentB] = useState('')
    const [reason, setReason] = useState('')

    const addExclusion = async () => {
      if (!studentA || !studentB || studentA === studentB) return
      const { data, error } = await supabase.from('student_exclusions').insert({ student_a: studentA, student_b: studentB, english_class: selectedClass, reason: reason || null }).select().single()
      if (error) { showToast('Error: ' + error.message); return }
      setExclusions(prev => [...prev, data])
      setStudentA(''); setStudentB(''); setReason('')
      showToast('Exclusion added')
    }

    return (
      <div className="space-y-3">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-[9px] uppercase text-text-tertiary font-semibold block mb-1">Student A</label>
            <select value={studentA} onChange={e => setStudentA(e.target.value)} className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none">
              <option value="">Select...</option>
              {gradeStudents.filter(s => s.id !== studentB).map(s => <option key={s.id} value={s.id}>{s.english_name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[9px] uppercase text-text-tertiary font-semibold block mb-1">Student B</label>
            <select value={studentB} onChange={e => setStudentB(e.target.value)} className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none">
              <option value="">Select...</option>
              {gradeStudents.filter(s => s.id !== studentA).map(s => <option key={s.id} value={s.id}>{s.english_name}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-[9px] uppercase text-text-tertiary font-semibold block mb-1">Reason</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional" className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" />
          </div>
          <button onClick={addExclusion} disabled={!studentA || !studentB} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white disabled:opacity-40">Add</button>
        </div>
        {exclusions.length > 0 ? (
          <div className="space-y-1">
            {exclusions.map(ex => {
              const a = students.find(s => s.id === ex.student_a)
              const b = students.find(s => s.id === ex.student_b)
              return (
                <div key={ex.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <Ban size={12} className="text-red-400 shrink-0" />
                  <span className="text-[11px] font-medium text-red-800">{a?.english_name || '?'} & {b?.english_name || '?'}</span>
                  {ex.reason && <span className="text-[10px] text-red-600 truncate">-- {ex.reason}</span>}
                  <button onClick={async () => { await supabase.from('student_exclusions').delete().eq('id', ex.id); setExclusions(prev => prev.filter(e => e.id !== ex.id)) }}
                    className="ml-auto p-1 rounded hover:bg-red-100"><X size={12} className="text-red-400" /></button>
                </div>
              )
            })}
          </div>
        ) : <p className="text-center text-text-tertiary text-[11px] py-3">No exclusions set.</p>}
      </div>
    )
  }

  // ── RENDER ──
  if (loading) return (
    <div className="px-10 py-6">
      <div className="skeleton h-8 w-48 mb-4" />
      <div className="skeleton h-20 w-full mb-4" />
      <div className="skeleton h-32 w-full mb-3" />
      <div className="skeleton h-32 w-full" />
    </div>
  )

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="px-10 pt-8 pb-5 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-text-primary">Groups</h2>
            <p className="text-text-secondary text-sm mt-1">{selectedClass} · {gradeStudents.length} students</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowArchived(!showArchived)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${showArchived ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
              {showArchived ? <Eye size={12} /> : <EyeOff size={12} />} {showArchived ? 'Archived' : 'Show Archived'}
            </button>
            {!showArchived && (
              <button onClick={() => setShowNewGroupForm(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-semibold bg-navy text-white hover:bg-navy-dark transition-colors">
                <Plus size={14} /> New Group
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-10 py-6" onClick={() => setActiveStudentPopover(null)}>
        {/* Class + Grade selectors */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {(isAdmin ? ENGLISH_CLASSES : [teacherClass || 'Snapdragon']).map(cls => (
            <button key={cls} onClick={() => setSelectedClass(cls as EnglishClass)}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ' + (selectedClass === cls ? 'text-white shadow-sm' : 'bg-surface-alt text-text-secondary hover:bg-border')}
              style={selectedClass === cls ? { backgroundColor: classToTextColor(cls as EnglishClass), color: 'white' } : {}}>
              {cls}
            </button>
          ))}
          <span className="w-px h-5 bg-border mx-1" />
          {availableGrades.map(g => (
            <button key={g} onClick={() => setSelectedGrade(g)}
              className={'px-3 py-1.5 rounded-lg text-[11px] font-medium ' + (selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border')}>
              Grade {g}
            </button>
          ))}
        </div>

        {/* New group inline form */}
        {showNewGroupForm && (
          <div className="bg-surface border border-border rounded-xl p-4 mb-5 flex items-end gap-3">
            <div className="flex-1">
              <label className="text-[9px] uppercase text-text-tertiary font-semibold block mb-1">Group Name</label>
              <input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateGroup() }}
                placeholder="e.g. Above Level, Station A, etc."
                className="w-full px-3 py-2 border border-border rounded-lg text-[13px] outline-none focus:border-navy" autoFocus />
            </div>
            <div>
              <label className="text-[9px] uppercase text-text-tertiary font-semibold block mb-1">Type</label>
              <select value={newGroupType} onChange={e => setNewGroupType(e.target.value as GroupType)}
                className="px-3 py-2 border border-border rounded-lg text-[12px] outline-none">
                <option value="reading">Reading</option>
                <option value="writing">Writing</option>
                <option value="skill">Skill</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <button onClick={handleCreateGroup} disabled={!newGroupName.trim()} className="px-4 py-2 rounded-lg text-[12px] font-semibold bg-navy text-white disabled:opacity-40">Create</button>
            <button onClick={() => { setShowNewGroupForm(false); setNewGroupName('') }} className="px-3 py-2 rounded-lg text-[12px] text-text-secondary hover:bg-surface-alt">Cancel</button>
          </div>
        )}

        {/* Ungrouped students pool */}
        {ungrouped.length > 0 && !showArchived && (
          <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 mb-5">
            <p className="text-[11px] font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
              <AlertTriangle size={13} className="text-amber-500" />
              {ungrouped.length} ungrouped student{ungrouped.length !== 1 ? 's' : ''} -- click to add to a group
            </p>
            <div className="flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
              {ungrouped.map(s => <StudentChip key={s.id} student={s} />)}
            </div>
          </div>
        )}

        {/* Groups list */}
        {filteredGroups.length === 0 && (
          <EmptyState
            icon={Users}
            title={showArchived ? 'No archived groups' : 'No groups yet'}
            description={showArchived ? 'Archive active groups to see them here' : 'Create a group and click ungrouped students to add them'}
            action={!showArchived ? { label: 'New Group', onClick: () => setShowNewGroupForm(true) } : undefined}
          />
        )}

        <div className="space-y-3">
          {filteredGroups.map(group => {
            const isEditing = editingId === group.id
            const isRenaming = renamingId === group.id
            const warnings = getWarnings(group)
            const isNew = group.id.startsWith('new-')
            const isArchived = group.is_archived
            const memberStudents = group.students.map(sid => students.find(st => st.id === sid)).filter(Boolean) as StudentBasic[]

            return (
              <div key={group.id} className={
                'bg-surface border rounded-xl overflow-hidden transition-all border-l-4 ' +
                TYPE_CARD_STYLES[group.type] + ' ' +
                (isArchived ? 'opacity-60 border-t-amber-200 border-r-amber-200 border-b-amber-200' : warnings.length > 0 ? 'border-t-red-200 border-r-red-200 border-b-red-200' : 'border-t-border border-r-border border-b-border')
              }>
                {/* Card header */}
                <div className="px-4 py-3 flex items-center gap-3">
                  <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ' + TYPE_BADGE_STYLES[group.type]}>{group.type}</span>
                  <div className="flex-1 min-w-0">
                    {isRenaming ? (
                      <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                        onBlur={() => handleRenameCommit(group)}
                        onKeyDown={e => { if (e.key === 'Enter') handleRenameCommit(group); if (e.key === 'Escape') { setRenamingId(null) } }}
                        className="text-[13px] font-bold text-navy border-b border-navy/30 outline-none bg-transparent w-full" autoFocus />
                    ) : (
                      <h3 className="text-[13px] font-bold text-navy truncate cursor-pointer hover:underline decoration-navy/30"
                        onClick={() => { setRenamingId(group.id); setRenameValue(group.name) }}>
                        {group.name || 'Untitled'}
                      </h3>
                    )}
                    {group.focus && !isEditing && <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{group.focus}</p>}
                  </div>
                  <span className="text-[10px] text-text-tertiary whitespace-nowrap">{group.students.length} students</span>
                  <div className="flex items-center gap-1">
                    {!isArchived && !isEditing && <button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Edit"><Pencil size={13} className="text-text-tertiary" /></button>}
                    {!isArchived && <button onClick={() => handlePrint(group)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Print"><Printer size={13} className="text-text-tertiary" /></button>}
                    {!isArchived && !isNew && <button onClick={() => archiveGroup(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Archive"><Archive size={13} className="text-text-tertiary" /></button>}
                    {isArchived && <button onClick={() => restoreGroup(group.id)} className="p-1.5 rounded-lg hover:bg-green-50" title="Restore"><RotateCcw size={13} className="text-green-600" /></button>}
                    {(isNew || isArchived) && <button onClick={() => deleteGroup(group.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Delete"><Trash2 size={13} className="text-red-400" /></button>}
                    {isEditing && (
                      <>
                        <button onClick={() => { if (isNew) deleteGroup(group.id); setEditingId(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={13} className="text-text-tertiary" /></button>
                        <button onClick={() => handleSave(group)} disabled={savingGroup} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white disabled:opacity-50">
                          {savingGroup ? <Loader2 size={12} className="animate-spin" /> : <><Save size={12} className="inline mr-1" />Save</>}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Exclusion warnings */}
                {warnings.length > 0 && (
                  <div className="px-4 py-1.5 bg-red-50 border-t border-red-200 text-[10px] text-red-700 flex items-center gap-1.5">
                    <Ban size={11} /> Exclusion conflict: {warnings.join(', ')}
                  </div>
                )}

                {/* Edit panel */}
                {isEditing && (
                  <div className="px-4 py-3 border-t border-border space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[9px] uppercase text-text-tertiary font-semibold">Focus</label>
                        <input value={editForm.focus || ''} onChange={e => setEditForm(prev => ({ ...prev, focus: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" placeholder="Group purpose..." />
                      </div>
                      <div>
                        <label className="text-[9px] uppercase text-text-tertiary font-semibold">Book / Material</label>
                        <input value={editForm.book || ''} onChange={e => setEditForm(prev => ({ ...prev, book: e.target.value }))}
                          className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" placeholder="Optional..." />
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] uppercase text-text-tertiary font-semibold">Notes</label>
                      <textarea value={editForm.notes || ''} onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none h-14 resize-none" placeholder="Teaching notes..." />
                    </div>
                    <div>
                      <label className="text-[9px] uppercase text-text-tertiary font-semibold mb-1 block">Students ({(editForm.students || []).length})</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                        {gradeStudents.map(s => {
                          const inGroup = (editForm.students || []).includes(s.id)
                          const extra = extraStudentInfo(s.id, group.type)
                          return (
                            <button key={s.id} onClick={() => toggleStudent(s.id)}
                              className={'flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-left transition-all border ' + (inGroup ? 'bg-navy/10 text-navy border-navy/20' : 'bg-surface-alt/50 text-text-secondary hover:bg-surface-alt border-transparent')}>
                              <span className={'w-4 h-4 rounded flex items-center justify-center shrink-0 ' + (inGroup ? 'bg-navy text-white' : 'border border-border')}>{inGroup && <Check size={10} />}</span>
                              <span className="truncate font-medium">{s.english_name}</span>
                              <WidaBadge studentId={s.id} />
                              {extra && <span className="text-[8px] text-text-tertiary ml-auto shrink-0">{extra}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    {/* Tasks */}
                    <div>
                      <label className="text-[9px] uppercase text-text-tertiary font-semibold mb-1 block">Tasks</label>
                      {(editForm.tasks || []).map((t, i) => (
                        <div key={i} className="flex items-center gap-2 mb-1">
                          <button onClick={() => setEditForm(prev => ({ ...prev, tasks: (prev.tasks || []).map((tt, j) => j === i ? { ...tt, done: !tt.done } : tt) }))}
                            className={'w-4 h-4 rounded flex items-center justify-center shrink-0 ' + (t.done ? 'bg-green-500 text-white' : 'border border-border')}>{t.done && <Check size={10} />}</button>
                          <span className={'text-[11px] flex-1 ' + (t.done ? 'line-through text-text-tertiary' : '')}>{t.text}</span>
                          <button onClick={() => setEditForm(prev => ({ ...prev, tasks: (prev.tasks || []).filter((_, j) => j !== i) }))}
                            className="p-0.5 rounded hover:bg-red-50"><X size={10} className="text-text-tertiary" /></button>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 mt-1">
                        <input value={newTaskText} onChange={e => setNewTaskText(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && newTaskText.trim()) {
                              setEditForm(prev => ({ ...prev, tasks: [...(prev.tasks || []), { text: newTaskText.trim(), done: false, created_at: new Date().toISOString() }] }))
                              setNewTaskText('')
                            }
                          }}
                          placeholder="Add a task..."
                          className="flex-1 px-2 py-1 border border-border rounded text-[11px] outline-none" />
                        <button onClick={() => {
                          if (newTaskText.trim()) {
                            setEditForm(prev => ({ ...prev, tasks: [...(prev.tasks || []), { text: newTaskText.trim(), done: false, created_at: new Date().toISOString() }] }))
                            setNewTaskText('')
                          }
                        }} disabled={!newTaskText.trim()} className="text-[10px] text-navy font-semibold disabled:opacity-30">Add</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Student chips (read mode) — clickable for move/remove */}
                {!isEditing && memberStudents.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-border/50 flex flex-wrap gap-1.5" onClick={e => e.stopPropagation()}>
                    {memberStudents.sort((a, b) => a.english_name.localeCompare(b.english_name)).map(s => (
                      <StudentChip key={s.id} student={s} groupId={group.id} type={group.type} />
                    ))}
                  </div>
                )}
                {!isEditing && memberStudents.length === 0 && (
                  <div className="px-4 py-2 border-t border-border/50 text-[10px] text-text-tertiary italic">No students -- click ungrouped students above or edit to add</div>
                )}

                {/* Tasks preview */}
                {!isEditing && group.tasks && group.tasks.length > 0 && (
                  <div className="px-4 py-2 border-t border-border/50 flex flex-wrap gap-2">
                    {group.tasks.filter(t => !t.done).slice(0, 3).map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-[9px] text-text-tertiary">
                        <span className="w-3 h-3 rounded border border-border flex items-center justify-center shrink-0" />
                        {t.text}
                      </span>
                    ))}
                    {group.tasks.filter(t => !t.done).length > 3 && <span className="text-[9px] text-text-tertiary">+{group.tasks.filter(t => !t.done).length - 3} more</span>}
                    {group.tasks.filter(t => t.done).length > 0 && <span className="text-[9px] text-green-600">{group.tasks.filter(t => t.done).length} done</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Exclusions */}
        <div className="border border-border rounded-xl overflow-hidden mt-6">
          <button onClick={() => setShowExclusions(!showExclusions)}
            className="w-full flex items-center gap-2 px-4 py-3 bg-surface hover:bg-surface-alt/50 transition-colors text-left">
            {showExclusions ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
            <Ban size={14} className="text-red-400" />
            <span className="text-[12px] font-semibold text-navy">Exclusions</span>
            {exclusions.length > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{exclusions.length}</span>}
          </button>
          {showExclusions && (
            <div className="px-4 py-3 border-t border-border">
              <ExclusionsManager />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
