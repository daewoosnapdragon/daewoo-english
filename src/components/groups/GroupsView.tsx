'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Users, Target, BookOpen, UserPlus, Plus, X, Trash2, Printer, ChevronDown, ChevronRight, AlertTriangle, Check, Loader2, RefreshCw, Pencil, Save, Archive, RotateCcw, Ban, ClipboardList, Zap, Calendar, Filter, Eye, EyeOff, GripVertical, ListChecks, Star } from 'lucide-react'

type GroupType = 'skill' | 'fluency' | 'litCircle' | 'partner' | 'custom'
type SubView = 'overview' | 'skill' | 'fluency' | 'litCircle' | 'partner' | 'exclusions'

interface StudentBasic { id: string; english_name: string; korean_name: string; english_class: string; grade: number; photo_url?: string }
interface Group {
  id: string; name: string; type: GroupType; english_class: string; grade?: number
  focus?: string; notes?: string; book?: string
  students: string[]; roles?: Record<string, string>
  is_archived?: boolean; archived_at?: string; active_from?: string; active_until?: string
  suggested_by?: string; tasks?: { text: string; done: boolean; created_at: string }[]
  created_at?: string; updated_at?: string
}
interface Exclusion { id: string; student_a: string; student_b: string; english_class: string; reason?: string }

const LIT_CIRCLE_ROLES = [
  { name: 'Discussion Director', emoji: '', description: 'Creates discussion questions for the group. Keeps the conversation going and makes sure everyone participates.' },
  { name: 'Summarizer', emoji: '', description: 'Summarizes the key events, main ideas, or important parts of the reading. Gives a brief recap to start the discussion.' },
  { name: 'Word Wizard', emoji: '', description: 'Finds interesting, important, or unfamiliar words from the reading. Shares definitions and discusses why the author chose those words.' },
  { name: 'Connector', emoji: '', description: 'Makes connections between the reading and real life, other books, or things happening in the world. Shares "This reminds me of..."' },
  { name: 'Illustrator', emoji: '', description: 'Draws a picture, diagram, or comic related to the reading. Uses the illustration to explain a key scene or idea to the group.' },
  { name: 'Passage Picker', emoji: '', description: 'Chooses important, interesting, or confusing passages to read aloud. Explains why each passage was chosen and leads discussion about it.' },
]


export default function GroupsView() {
  const { currentTeacher, lang, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass | null
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [subView, setSubView] = useState<SubView>('overview')
  const [students, setStudents] = useState<StudentBasic[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [studentScores, setStudentScores] = useState<Record<string, Record<string, number>>>({})

  const availableGrades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).sort(), [students])

  useEffect(() => {
    if (availableGrades.length > 0 && (selectedGrade === null || !availableGrades.includes(selectedGrade)))
      setSelectedGrade(availableGrades[0])
  }, [availableGrades, selectedGrade])

  const gradeStudents = useMemo(() => selectedGrade ? students.filter(s => s.grade === selectedGrade) : students, [students, selectedGrade])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [{ data: studs }, { data: grps }, { data: excl }, { data: scoreData }] = await Promise.all([
        supabase.from('students').select('id, english_name, korean_name, english_class, grade, photo_url').eq('english_class', selectedClass).eq('is_active', true).order('english_name'),
        supabase.from('student_groups').select('*').eq('english_class', selectedClass).order('created_at', { ascending: false }),
        supabase.from('student_exclusions').select('*').eq('english_class', selectedClass).catch(() => ({ data: [] })),
        supabase.from('grades').select('student_id, score, assessments!inner(domain, max_score)').eq('assessments.english_class', selectedClass).not('score', 'is', null),
      ])
      setStudents(studs || [])
      setGroups((grps || []).map((g: any) => ({ ...g, students: g.student_ids || [], tasks: g.tasks || [] })))
      setExclusions((excl as any)?.data || excl || [])
      const scoreMap: Record<string, Record<string, { total: number; count: number }>> = {}
      scoreData?.forEach((s: any) => {
        const sid = s.student_id; const domain = s.assessments?.domain
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
      setLoading(false)
    })()
  }, [selectedClass])

  const filteredGroups = useMemo(() => groups.filter(g => {
    if (!showArchived && g.is_archived) return false
    if (showArchived && !g.is_archived) return false
    if (selectedGrade && g.grade && g.grade !== selectedGrade) return false
    if (!g.grade && selectedGrade) {
      const hasGradeStudents = g.students.some(sid => { const s = students.find(st => st.id === sid); return s && s.grade === selectedGrade })
      if (!hasGradeStudents && g.students.length > 0) return false
    }
    return true
  }), [groups, selectedGrade, showArchived, students])

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    filteredGroups.filter(g => !g.is_archived).forEach(g => { counts[g.type] = (counts[g.type] || 0) + 1 })
    return counts
  }, [filteredGroups])

  const TABS: { id: SubView; icon: any; label: string; count?: number }[] = [
    { id: 'overview', icon: Users, label: 'Overview' },
    { id: 'skill', icon: Target, label: 'Skill Groups', count: classCounts.skill || 0 },
    { id: 'fluency', icon: BookOpen, label: 'Reading Groups', count: classCounts.fluency || 0 },
    { id: 'litCircle', icon: Star, label: 'Lit Circles', count: classCounts.litCircle || 0 },
    { id: 'partner', icon: UserPlus, label: 'Partners', count: classCounts.partner || 0 },
    { id: 'exclusions', icon: Ban, label: 'Exclusions', count: exclusions.length },
  ]

  const saveGroup = async (group: Group) => {
    const payload = {
      name: group.name, type: group.type, english_class: selectedClass, grade: selectedGrade,
      focus: group.focus || null, notes: group.notes || null, book: group.book || null,
      student_ids: group.students, roles: group.roles || null, tasks: group.tasks || [],
      is_archived: group.is_archived || false, archived_at: group.archived_at || null,
      active_from: group.active_from || null, active_until: group.active_until || null,
      suggested_by: group.suggested_by || 'manual',
      created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
    }
    if (group.id.startsWith('new-')) {
      const { data, error } = await supabase.from('student_groups').insert(payload).select().single()
      if (error) { showToast(`Error: ${error.message}`); return null }
      return { ...data, students: data.student_ids || [], tasks: data.tasks || [] }
    } else {
      const { data, error } = await supabase.from('student_groups').update(payload).eq('id', group.id).select().single()
      if (error) { showToast(`Error: ${error.message}`); return null }
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

  const autoSuggestGroups = useCallback((type: 'skill' | 'fluency') => {
    const gStudents = gradeStudents
    if (gStudents.length === 0) return
    if (type === 'skill') {
      const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
      const byWeakest: Record<string, StudentBasic[]> = {}
      gStudents.forEach(s => {
        const scores = studentScores[s.id]
        if (!scores || Object.keys(scores).length === 0) { if (!byWeakest['unassessed']) byWeakest['unassessed'] = []; byWeakest['unassessed'].push(s); return }
        let weakest = ''; let lowest = 101
        domains.forEach(d => { if (scores[d] != null && scores[d] < lowest) { lowest = scores[d]; weakest = d } })
        if (weakest) { if (!byWeakest[weakest]) byWeakest[weakest] = []; byWeakest[weakest].push(s) }
      })
      const labels: Record<string, string> = { reading: 'Reading Support', phonics: 'Phonics Support', writing: 'Writing Support', speaking: 'Speaking Support', language: 'Language Support' }
      const newGroups: Group[] = []
      Object.entries(byWeakest).forEach(([domain, studs]) => {
        if (studs.length === 0) return
        newGroups.push({ id: `new-${Date.now()}-${domain}`, name: domain === 'unassessed' ? 'Needs Assessment' : labels[domain] || `${domain} Group`, type: 'skill', english_class: selectedClass, grade: selectedGrade || undefined, focus: domain === 'unassessed' ? 'Students without enough data' : `Weakest domain: ${domain}`, students: studs.map(s => s.id), suggested_by: 'auto', tasks: [] })
      })
      setGroups(prev => [...newGroups, ...prev]); showToast(`${newGroups.length} skill groups suggested`)
    } else {
      const tiers: Record<string, StudentBasic[]> = { high: [], mid: [], low: [], unassessed: [] }
      gStudents.forEach(s => {
        const scores = studentScores[s.id]
        if (!scores || Object.keys(scores).length === 0) { tiers.unassessed.push(s); return }
        const avg = (Object.values(scores) as number[]).reduce((a: number, b: number) => a + b, 0) / Object.values(scores).length
        if (avg >= 80) tiers.high.push(s); else if (avg >= 60) tiers.mid.push(s); else tiers.low.push(s)
      })
      const tierLabels: Record<string, { name: string; focus: string }> = {
        high: { name: 'Above Grade Level', focus: 'Enrichment and extension activities' },
        mid: { name: 'On Grade Level', focus: 'Core instruction with grade-level materials' },
        low: { name: 'Approaching Grade Level', focus: 'Additional support and scaffolded instruction' },
        unassessed: { name: 'Needs Assessment', focus: 'Students without enough data' },
      }
      const newGroups: Group[] = []
      Object.entries(tiers).forEach(([tier, studs]) => {
        if (studs.length === 0) return
        newGroups.push({ id: `new-${Date.now()}-${tier}`, name: tierLabels[tier].name, type: 'fluency', english_class: selectedClass, grade: selectedGrade || undefined, focus: tierLabels[tier].focus, students: studs.map(s => s.id), suggested_by: 'auto', tasks: [] })
      })
      setGroups(prev => [...newGroups, ...prev]); showToast(`${newGroups.length} reading groups suggested`)
    }
  }, [gradeStudents, studentScores, selectedClass, selectedGrade, showToast])

  const refreshGroups = async (type: 'skill' | 'fluency') => {
    const existing = filteredGroups.filter(g => g.type === type && !g.is_archived)
    if (existing.length > 0 && !confirm(`Archive ${existing.length} current ${type} group(s) and re-suggest from latest data?`)) return
    for (const g of existing) { if (!g.id.startsWith('new-')) await archiveGroup(g.id) }
    setGroups(prev => prev.filter(g => !(g.type === type && g.id.startsWith('new-'))))
    setTimeout(() => autoSuggestGroups(type), 300)
  }

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="px-10 pt-8 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[22px] font-bold text-navy">Student Groups</h1>
            <p className="text-[12px] text-text-secondary mt-0.5">Organize students for targeted instruction, literature circles, and partner work</p>
          </div>
          <button onClick={() => setShowArchived(!showArchived)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${showArchived ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
            <Archive size={13} /> {showArchived ? 'Viewing Archived' : 'Show Archived'}
          </button>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mr-2">Class</span>
            {ENGLISH_CLASSES.map(c => (
              <button key={c} onClick={() => { setSelectedClass(c); setSelectedGrade(null) }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${selectedClass === c ? `${classToColor(c)} ${classToTextColor(c)} shadow-sm` : 'text-text-secondary hover:bg-surface-alt'}`}>
                {c}
              </button>
            ))}
          </div>
        )}

        {availableGrades.length > 1 && (
          <div className="flex items-center gap-1 mb-3">
            <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mr-2">Grade</span>
            {availableGrades.map(g => (
              <button key={g} onClick={() => setSelectedGrade(g)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${selectedGrade === g ? 'bg-navy text-white shadow-sm' : 'text-text-secondary hover:bg-surface-alt'}`}>
                Grade {g}
              </button>
            ))}
          </div>
        )}

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
          {subView === 'overview' && <OverviewTab students={gradeStudents} groups={filteredGroups} selectedGrade={selectedGrade} onNavigate={setSubView} />}
          {(subView === 'skill' || subView === 'fluency') && <GroupManager type={subView as 'skill' | 'fluency'} students={gradeStudents} groups={filteredGroups.filter(g => g.type === subView)} studentScores={studentScores} exclusions={exclusions} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} onArchive={archiveGroup} onRestore={restoreGroup} selectedClass={selectedClass} selectedGrade={selectedGrade} showArchived={showArchived} onAutoSuggest={() => autoSuggestGroups(subView as any)} onRefresh={() => refreshGroups(subView as any)} allStudents={students} />}
          {subView === 'litCircle' && <LitCircleManager students={gradeStudents} groups={filteredGroups.filter(g => g.type === 'litCircle')} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} onArchive={archiveGroup} onRestore={restoreGroup} showArchived={showArchived} />}
          {subView === 'partner' && <PartnerManager students={gradeStudents} groups={filteredGroups.filter(g => g.type === 'partner')} exclusions={exclusions} setGroups={setGroups} onSave={saveGroup} onDelete={deleteGroup} />}
          {subView === 'exclusions' && <ExclusionsManager students={gradeStudents} exclusions={exclusions} setExclusions={setExclusions} selectedClass={selectedClass} />}
        </div>
      )}
    </div>
  )
}


// ─── Overview Tab ───────────────────────────────────────────────────
function OverviewTab({ students, groups, selectedGrade, onNavigate }: { students: StudentBasic[]; groups: Group[]; selectedGrade: number | null; onNavigate: (v: SubView) => void }) {
  const active = groups.filter(g => !g.is_archived)
  const allGroupedIds = new Set(active.flatMap(g => g.students))
  const ungrouped = students.filter(s => !allGroupedIds.has(s.id))
  const cards = [
    { type: 'skill' as SubView, icon: Target, label: 'Skill Groups', desc: 'Data-driven by domain weakness', count: active.filter(g => g.type === 'skill').length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
    { type: 'fluency' as SubView, icon: BookOpen, label: 'Reading Groups', desc: 'By overall performance tier', count: active.filter(g => g.type === 'fluency').length, color: 'bg-green-50 border-green-200 text-green-700' },
    { type: 'litCircle' as SubView, icon: Star, label: 'Lit Circles', desc: 'Book clubs with roles', count: active.filter(g => g.type === 'litCircle').length, color: 'bg-purple-50 border-purple-200 text-purple-700' },
    { type: 'partner' as SubView, icon: UserPlus, label: 'Partners', desc: 'Mixed-ability pairs', count: active.filter(g => g.type === 'partner').length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
  ]
  return (
    <div className="space-y-6 mt-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map(c => (
          <button key={c.type} onClick={() => onNavigate(c.type)} className={`text-left border rounded-xl p-4 transition-all hover:shadow-sm ${c.color}`}>
            <c.icon size={20} className="mb-2" /><h3 className="text-[14px] font-bold">{c.label}</h3>
            <p className="text-[10px] opacity-70 mt-0.5">{c.desc}</p>
            <p className="text-[20px] font-bold mt-2">{c.count} <span className="text-[11px] font-normal">group{c.count !== 1 ? 's' : ''}</span></p>
          </button>
        ))}
      </div>
      {ungrouped.length > 0 && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <div><p className="text-[11px] font-semibold text-amber-800">{ungrouped.length} student{ungrouped.length !== 1 ? 's' : ''} not in any group</p>
          <p className="text-[10px] text-amber-700 mt-0.5">{ungrouped.map(s => s.english_name).join(', ')}</p></div>
        </div>
      )}
      {active.length > 0 ? (
        <div>
          <h3 className="text-[13px] font-semibold text-navy mb-2">Active Groups ({active.length}){selectedGrade ? ` · Grade ${selectedGrade}` : ''}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {active.map(g => (
              <div key={g.id} className="bg-surface border border-border rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full uppercase ${g.type === 'skill' ? 'bg-blue-100 text-blue-700' : g.type === 'fluency' ? 'bg-green-100 text-green-700' : g.type === 'litCircle' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{g.type === 'litCircle' ? 'Lit Circle' : g.type}</span>
                  {g.suggested_by === 'auto' && <span className="text-[7px] px-1 py-0.5 rounded bg-cyan-50 text-cyan-700 font-medium">AUTO</span>}
                  <span className="text-[12px] font-semibold text-navy">{g.name}</span>
                </div>
                {g.focus && <p className="text-[10px] text-text-secondary">{g.focus}</p>}
                <p className="text-[10px] text-text-tertiary mt-1">{g.students.length} students{g.book ? ` · ${g.book}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl">
          <Users size={32} className="text-text-tertiary mx-auto mb-3" />
          <p className="text-[14px] font-semibold text-text-secondary">No groups yet{selectedGrade ? ` for Grade ${selectedGrade}` : ''}</p>
          <p className="text-[11px] text-text-tertiary mt-1">Click a group type above or use Auto-Suggest</p>
        </div>
      )}
    </div>
  )
}

// ─── Group Manager (Skill & Fluency) ──────────────────────────────
function GroupManager({ type, students, groups, studentScores, exclusions, setGroups, onSave, onDelete, onArchive, onRestore, selectedClass, selectedGrade, showArchived, onAutoSuggest, onRefresh, allStudents }: {
  type: GroupType; students: StudentBasic[]; groups: Group[]; studentScores: Record<string, Record<string, number>>; exclusions: Exclusion[]
  setGroups: React.Dispatch<React.SetStateAction<Group[]>>; onSave: (g: Group) => Promise<any>; onDelete: (id: string) => void
  onArchive: (id: string) => void; onRestore: (id: string) => void; selectedClass: string; selectedGrade: number | null
  showArchived: boolean; onAutoSuggest: () => void; onRefresh: () => void; allStudents: StudentBasic[]
}) {
  const { showToast } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const addGroup = () => { const g: Group = { id: `new-${Date.now()}`, name: type === 'skill' ? 'New Skill Group' : 'New Reading Group', type, english_class: selectedClass, grade: selectedGrade || undefined, students: [], focus: '', notes: '', tasks: [] }; setGroups(prev => [g, ...prev]); setEditingId(g.id) }
  const updateGroup = (id: string, u: Partial<Group>) => setGroups(prev => prev.map(g => g.id === id ? { ...g, ...u } : g))
  const toggleStudent = (gid: string, sid: string) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, students: g.students.includes(sid) ? g.students.filter(s => s !== sid) : [...g.students, sid] }))
  const getWarnings = (group: Group) => { const w: string[] = []; exclusions.forEach(ex => { if (group.students.includes(ex.student_a) && group.students.includes(ex.student_b)) { const a = allStudents.find(s => s.id === ex.student_a); const b = allStudents.find(s => s.id === ex.student_b); if (a && b) w.push(`${a.english_name} & ${b.english_name}`) } }); return w }
  const handleSave = async (group: Group) => { setSaving(true); const saved = await onSave(group); setSaving(false); if (saved) { setGroups(prev => prev.map(g => g.id === group.id ? saved : g)); setEditingId(null); showToast('Group saved') } }
  const addTask = (gid: string) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, tasks: [...(g.tasks || []), { text: '', done: false, created_at: new Date().toISOString() }] }))
  const updateTask = (gid: string, idx: number, u: Partial<{ text: string; done: boolean }>) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, tasks: (g.tasks || []).map((t, i) => i === idx ? { ...t, ...u } : t) }))
  const deleteTask = (gid: string, idx: number) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, tasks: (g.tasks || []).filter((_, i) => i !== idx) }))
  const typeLabel = type === 'skill' ? 'Skill Groups' : 'Reading Groups'
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-navy">{typeLabel}{selectedGrade ? ` · Grade ${selectedGrade}` : ''}</h2>
        <div className="flex gap-2">{!showArchived && <><button onClick={onRefresh} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface border border-border hover:bg-surface-alt text-text-secondary"><RefreshCw size={13} /> Refresh</button><button onClick={onAutoSuggest} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100"><Zap size={13} /> Auto-Suggest</button><button onClick={addGroup} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark"><Plus size={13} /> New Group</button></>}</div>
      </div>
      {!showArchived && type === 'skill' && <p className="text-[11px] text-text-secondary bg-blue-50 border border-blue-200 rounded-lg p-3"><strong>Auto-Suggest</strong> groups students by weakest domain. <strong>Refresh</strong> archives current and re-generates.</p>}
      {!showArchived && type === 'fluency' && <p className="text-[11px] text-text-secondary bg-green-50 border border-green-200 rounded-lg p-3"><strong>Auto-Suggest</strong> creates groups by performance tier. <strong>Refresh</strong> archives current and re-generates.</p>}
      {groups.length === 0 && <div className="text-center py-12 bg-surface border border-border rounded-2xl"><p className="text-[13px] text-text-secondary">{showArchived ? 'No archived groups' : 'No groups yet — use Auto-Suggest or create manually'}</p></div>}
      {groups.map(group => {
        const isEditing = editingId === group.id; const warnings = getWarnings(group); const isArchived = group.is_archived
        return (<div key={group.id} className={`bg-surface border rounded-2xl overflow-hidden ${isArchived ? 'border-amber-200 opacity-75' : 'border-border'}`}>
          <div className={`px-5 py-3 flex items-center gap-3 ${isArchived ? 'bg-amber-50/50' : 'bg-surface-alt/50'}`}>
            {isEditing ? <input value={group.name} onChange={e => updateGroup(group.id, { name: e.target.value })} className="text-[14px] font-bold text-navy bg-transparent border-b border-navy/30 outline-none flex-1" /> : <h3 className="text-[14px] font-bold text-navy flex-1">{group.name}{group.suggested_by === 'auto' ? <span className="ml-2 text-[8px] font-medium text-cyan-600 bg-cyan-50 px-1.5 py-0.5 rounded-full">AUTO</span> : ''}{isArchived ? <span className="ml-2 text-[8px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">ARCHIVED</span> : ''}</h3>}
            <span className="text-[10px] text-text-tertiary">{group.students.length} students</span>
            {isArchived ? <button onClick={() => onRestore(group.id)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-amber-100 text-amber-700 hover:bg-amber-200"><RotateCcw size={11} /> Restore</button>
            : isEditing ? <div className="flex items-center gap-1"><button onClick={() => handleSave(group)} disabled={saving} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy text-white disabled:opacity-50"><Save size={11} /> {saving ? '...' : 'Save'}</button><button onClick={() => { if (group.id.startsWith('new-')) onDelete(group.id); setEditingId(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><X size={14} /></button></div>
            : <div className="flex items-center gap-1"><button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><Pencil size={13} /></button><button onClick={() => onArchive(group.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-text-tertiary hover:text-amber-600"><Archive size={13} /></button><button onClick={() => { if (confirm('Delete permanently?')) onDelete(group.id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-text-tertiary hover:text-red-500"><Trash2 size={13} /></button></div>}
          </div>
          {warnings.length > 0 && <div className="px-5 py-2 bg-red-50 border-b border-red-200"><div className="flex items-center gap-1.5 text-[10px] text-red-700 font-medium"><Ban size={12} /> Conflict: {warnings.join('; ')}</div></div>}
          {isEditing && !isArchived && <div className="px-5 py-2 border-b border-border space-y-2"><div className="flex gap-3"><input value={group.focus || ''} onChange={e => updateGroup(group.id, { focus: e.target.value })} placeholder="Focus (e.g. RL.2.1 Key Ideas)" className="flex-1 px-2 py-1 text-[11px] border border-border rounded-lg outline-none" /><input value={group.notes || ''} onChange={e => updateGroup(group.id, { notes: e.target.value })} placeholder="Notes" className="flex-1 px-2 py-1 text-[11px] border border-border rounded-lg outline-none" /></div><div className="flex items-center gap-3"><label className="text-[10px] text-text-tertiary">Active period:</label><input type="date" value={group.active_from || ''} onChange={e => updateGroup(group.id, { active_from: e.target.value })} className="px-2 py-1 text-[10px] border border-border rounded-lg outline-none" /><span className="text-[10px] text-text-tertiary">to</span><input type="date" value={group.active_until || ''} onChange={e => updateGroup(group.id, { active_until: e.target.value })} className="px-2 py-1 text-[10px] border border-border rounded-lg outline-none" /></div></div>}
          {!isEditing && (group.focus || group.active_from) && <div className="px-5 py-1.5 text-[10px] text-text-secondary border-b border-border/50 flex items-center gap-3">{group.focus && <span>Focus: {group.focus}</span>}{group.active_from && <span className="text-text-tertiary">{group.active_from}{group.active_until ? ` → ${group.active_until}` : ''}</span>}</div>}
          <div className="p-4">{isEditing && !isArchived ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">{students.map(s => { const inGroup = group.students.includes(s.id); const scores = studentScores[s.id]; return (<button key={s.id} onClick={() => toggleStudent(group.id, s.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-left transition-all ${inGroup ? 'bg-navy/10 text-navy border border-navy/20' : 'bg-surface-alt/50 text-text-secondary hover:bg-surface-alt border border-transparent'}`}><span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${inGroup ? 'bg-navy text-white' : 'border border-border'}`}>{inGroup && <Check size={10} />}</span><span className="truncate font-medium">{s.english_name}</span>{scores && <span className="text-[8px] text-text-tertiary ml-auto shrink-0">{Object.entries(scores).slice(0, 3).map(([d, v]) => `${d[0].toUpperCase()}${v}`).join(' ')}</span>}</button>) })}</div>
          ) : (
            <div className="flex flex-wrap gap-1.5">{group.students.map(sid => { const s = students.find(st => st.id === sid); if (!s) return null; const scores = studentScores[sid]; const avg = scores ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length) : null; return (<span key={sid} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-medium ${avg != null ? (avg >= 80 ? 'bg-green-50 text-green-700' : avg >= 60 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700') : 'bg-surface-alt text-text-primary'}`}>{s.english_name}{avg != null && <span className="text-[8px] opacity-60">{avg}%</span>}</span>) })}{group.students.length === 0 && <span className="text-[10px] text-text-tertiary italic">No students</span>}</div>
          )}</div>
          {(isEditing || (group.tasks && group.tasks.length > 0)) && !isArchived && <div className="px-5 pb-4 border-t border-border/50 pt-3"><div className="flex items-center justify-between mb-2"><h4 className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1"><ListChecks size={12} /> Tasks / Activities</h4>{isEditing && <button onClick={() => addTask(group.id)} className="text-[10px] text-navy font-medium hover:underline">+ Add Task</button>}</div><div className="space-y-1">{(group.tasks || []).map((task, ti) => (<div key={ti} className="flex items-center gap-2"><button onClick={() => { if (isEditing) updateTask(group.id, ti, { done: !task.done }) }} className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${task.done ? 'bg-green-500 border-green-500 text-white' : 'border-border'}`}>{task.done && <Check size={10} />}</button>{isEditing ? <><input value={task.text} onChange={e => updateTask(group.id, ti, { text: e.target.value })} placeholder="Describe task..." className={`flex-1 text-[11px] bg-transparent outline-none border-b border-border/50 py-0.5 ${task.done ? 'line-through text-text-tertiary' : ''}`} /><button onClick={() => deleteTask(group.id, ti)} className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500"><X size={12} /></button></> : <span className={`text-[11px] ${task.done ? 'line-through text-text-tertiary' : ''}`}>{task.text || '(empty)'}</span>}</div>))}</div></div>}
          {!isEditing && group.notes && <div className="px-5 pb-3 text-[10px] text-text-tertiary italic">{group.notes}</div>}
        </div>)
      })}
    </div>
  )
}

// ─── Literature Circles ─────────────────────────────────────────────
function LitCircleManager({ students, groups, setGroups, onSave, onDelete, onArchive, onRestore, showArchived }: { students: StudentBasic[]; groups: Group[]; setGroups: React.Dispatch<React.SetStateAction<Group[]>>; onSave: (g: Group) => Promise<any>; onDelete: (id: string) => void; onArchive: (id: string) => void; onRestore: (id: string) => void; showArchived: boolean }) {
  const { showToast } = useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showRoleRef, setShowRoleRef] = useState(false)
  const addCircle = () => { const g: Group = { id: `new-${Date.now()}`, name: 'New Literature Circle', type: 'litCircle', english_class: '', students: [], roles: {}, book: '', tasks: [] }; setGroups(prev => [g, ...prev]); setEditingId(g.id) }
  const updateGroup = (id: string, u: Partial<Group>) => setGroups(prev => prev.map(g => g.id === id ? { ...g, ...u } : g))
  const toggleStudent = (gid: string, sid: string) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, students: g.students.includes(sid) ? g.students.filter(s => s !== sid) : [...g.students, sid] }))
  const setRole = (gid: string, sid: string, role: string) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, roles: { ...(g.roles || {}), [sid]: role } }))
  const handleSave = async (group: Group) => { setSaving(true); const saved = await onSave(group); setSaving(false); if (saved) { setGroups(prev => prev.map(g => g.id === group.id ? saved : g)); setEditingId(null); showToast('Saved') } }
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-navy">Literature Circles</h2>
        <div className="flex gap-2">
          <button onClick={() => setShowRoleRef(!showRoleRef)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100"><BookOpen size={13} /> {showRoleRef ? 'Hide' : 'View'} Role Guide</button>
          {!showArchived && <button onClick={addCircle} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark"><Plus size={13} /> New Circle</button>}
        </div>
      </div>
      {showRoleRef && <div className="bg-purple-50 border border-purple-200 rounded-xl p-4"><h3 className="text-[13px] font-bold text-purple-800 mb-3">Literature Circle Roles</h3><div className="grid grid-cols-2 lg:grid-cols-3 gap-3">{LIT_CIRCLE_ROLES.map(role => (<div key={role.name} className="bg-white rounded-lg p-3 border border-purple-100"><div className="flex items-center gap-2 mb-1"><span className="text-[16px]">{role.emoji}</span><h4 className="text-[12px] font-bold text-purple-800">{role.name}</h4></div><p className="text-[10px] text-text-secondary leading-relaxed">{role.description}</p></div>))}</div></div>}
      {groups.length === 0 && <div className="text-center py-12 bg-surface border border-border rounded-2xl"><p className="text-[13px] text-text-secondary">No literature circles yet</p></div>}
      {groups.map(group => { const isEditing = editingId === group.id; const isArchived = group.is_archived; return (
        <div key={group.id} className={`bg-surface border rounded-2xl overflow-hidden ${isArchived ? 'border-amber-200 opacity-75' : 'border-purple-200'}`}>
          <div className={`px-5 py-3 flex items-center gap-3 ${isArchived ? 'bg-amber-50/50' : 'bg-purple-50/50'}`}>
            {isEditing ? <input value={group.name} onChange={e => updateGroup(group.id, { name: e.target.value })} className="text-[14px] font-bold text-navy bg-transparent border-b border-navy/30 outline-none" placeholder="Circle name" /> : <h3 className="text-[14px] font-bold text-navy">{group.name}</h3>}
            {isEditing ? <input value={group.book || ''} onChange={e => updateGroup(group.id, { book: e.target.value })} className="text-[11px] bg-white border border-border rounded-lg px-2 py-1 outline-none flex-1" placeholder="Book title" /> : group.book ? <span className="text-[11px] text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">{group.book}</span> : null}
            <span className="text-[10px] text-text-tertiary ml-auto">{group.students.length}</span>
            {isArchived ? <button onClick={() => onRestore(group.id)} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-amber-100 text-amber-700"><RotateCcw size={11} /> Restore</button>
            : isEditing ? <div className="flex gap-1"><button onClick={() => handleSave(group)} disabled={saving} className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy text-white"><Save size={11} /> Save</button><button onClick={() => { if (group.id.startsWith('new-')) onDelete(group.id); setEditingId(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={14} /></button></div>
            : <div className="flex gap-1"><button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><Pencil size={13} /></button><button onClick={() => onArchive(group.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-text-tertiary"><Archive size={13} /></button><button onClick={() => { if (confirm('Delete?')) onDelete(group.id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-text-tertiary hover:text-red-500"><Trash2 size={13} /></button></div>}
          </div>
          {isEditing && <div className="px-5 py-2 border-b border-border"><input value={group.notes || ''} onChange={e => updateGroup(group.id, { notes: e.target.value })} placeholder="Notes (discussion schedule, chapters, etc.)" className="w-full px-2 py-1 text-[11px] border border-border rounded-lg outline-none" /></div>}
          <div className="p-4">{isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{students.map(s => { const inGroup = group.students.includes(s.id); return (<div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${inGroup ? 'bg-purple-50 border border-purple-200' : 'bg-surface-alt/30'}`}><button onClick={() => toggleStudent(group.id, s.id)} className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${inGroup ? 'bg-purple-600 text-white' : 'border border-border'}`}>{inGroup && <Check size={10} />}</button><span className="text-[11px] font-medium truncate">{s.english_name}</span>{inGroup && <select value={(group.roles || {})[s.id] || ''} onChange={e => setRole(group.id, s.id, e.target.value)} className="ml-auto text-[9px] bg-white border border-border rounded px-1 py-0.5 outline-none"><option value="">-- Role --</option>{LIT_CIRCLE_ROLES.map(r => <option key={r.name} value={r.name}>{r.emoji} {r.name}</option>)}</select>}</div>) })}</div>
          ) : (
            <div className="space-y-1">{group.students.map(sid => { const s = students.find(st => st.id === sid); const role = (group.roles || {})[sid]; const rd = LIT_CIRCLE_ROLES.find(r => r.name === role); return s ? <div key={sid} className="flex items-center gap-2 text-[11px]"><span className="font-medium text-navy">{s.english_name}</span>{rd && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">{rd.emoji} {rd.name}</span>}</div> : null })}{group.students.length === 0 && <span className="text-[10px] text-text-tertiary italic">No students</span>}</div>
          )}</div>
          {!isEditing && group.notes && <div className="px-5 pb-3 text-[10px] text-text-tertiary italic">{group.notes}</div>}
        </div>) })}
    </div>
  )
}

// ─── Partner Pairs ──────────────────────────────────────────────────
function PartnerManager({ students, groups, exclusions, setGroups, onSave, onDelete }: { students: StudentBasic[]; groups: Group[]; exclusions: Exclusion[]; setGroups: React.Dispatch<React.SetStateAction<Group[]>>; onSave: (g: Group) => Promise<any>; onDelete: (id: string) => void }) {
  const { showToast } = useApp()
  const [saving, setSaving] = useState(false)
  const addPair = () => { setGroups(prev => [{ id: `new-${Date.now()}`, name: `Pair ${groups.length + 1}`, type: 'partner', english_class: '', students: [] }, ...prev]) }
  const updatePair = (id: string, idx: 0 | 1, sid: string) => setGroups(prev => prev.map(g => { if (g.id !== id) return g; const ns = [...g.students]; ns[idx] = sid; return { ...g, students: ns.filter(Boolean) } }))
  const saveAll = async () => { setSaving(true); for (const g of groups) { if (g.students.length >= 2) { const saved = await onSave(g); if (saved) setGroups(prev => prev.map(p => p.id === g.id ? saved : p)) } }; setSaving(false); showToast('Pairs saved') }
  const isExcluded = (a: string, b: string) => exclusions.some(ex => (ex.student_a === a && ex.student_b === b) || (ex.student_a === b && ex.student_b === a))
  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-bold text-navy">Partner Pairs</h2>
        <div className="flex gap-2"><button onClick={saveAll} disabled={saving} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white disabled:opacity-50"><Save size={13} /> Save All</button><button onClick={addPair} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface border border-border hover:bg-surface-alt"><Plus size={13} /> Add Pair</button></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{groups.map((g, i) => { const bad = g.students.length >= 2 && isExcluded(g.students[0], g.students[1]); return (
        <div key={g.id} className={`bg-surface border rounded-xl p-3 ${bad ? 'border-red-300 bg-red-50/30' : 'border-border'}`}>
          <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-semibold text-navy">Pair {i + 1}</span>{bad && <span className="text-[9px] text-red-600 font-medium"><Ban size={10} className="inline" /> Conflict</span>}<button onClick={() => { if (confirm('Remove?')) onDelete(g.id) }} className="p-1 rounded hover:bg-red-50 text-text-tertiary hover:text-red-500"><Trash2 size={12} /></button></div>
          <div className="space-y-1.5">{[0, 1].map(idx => (<select key={idx} value={g.students[idx] || ''} onChange={e => updatePair(g.id, idx as 0 | 1, e.target.value)} className="w-full px-2 py-1.5 text-[11px] border border-border rounded-lg bg-surface outline-none"><option value="">-- Select --</option>{students.map(s => <option key={s.id} value={s.id} disabled={g.students.includes(s.id) && g.students[idx] !== s.id}>{s.english_name} {s.korean_name}</option>)}</select>))}</div>
        </div>) })}</div>
      {groups.length === 0 && <div className="text-center py-12 bg-surface border border-border rounded-2xl"><p className="text-[13px] text-text-secondary">No partner pairs yet</p></div>}
    </div>
  )
}

// ─── Exclusions Manager ─────────────────────────────────────────────
function ExclusionsManager({ students, exclusions, setExclusions, selectedClass }: { students: StudentBasic[]; exclusions: Exclusion[]; setExclusions: React.Dispatch<React.SetStateAction<Exclusion[]>>; selectedClass: string }) {
  const { showToast, currentTeacher } = useApp()
  const [studentA, setStudentA] = useState(''); const [studentB, setStudentB] = useState(''); const [reason, setReason] = useState('')
  const add = async () => {
    if (!studentA || !studentB || studentA === studentB) { showToast('Select two different students'); return }
    const [a, b] = [studentA, studentB].sort()
    const { data, error } = await supabase.from('student_exclusions').insert({ student_a: a, student_b: b, english_class: selectedClass, reason: reason || null, created_by: currentTeacher?.id }).select().single()
    if (error) { showToast(error.message.includes('unique') ? 'Already exists' : `Error: ${error.message}`); return }
    setExclusions(prev => [...prev, data]); setStudentA(''); setStudentB(''); setReason(''); showToast('Exclusion added')
  }
  const remove = async (id: string) => { await supabase.from('student_exclusions').delete().eq('id', id); setExclusions(prev => prev.filter(e => e.id !== id)); showToast('Removed') }
  return (
    <div className="mt-4 space-y-4">
      <div><h2 className="text-[16px] font-bold text-navy">Student Exclusions</h2><p className="text-[11px] text-text-secondary mt-1">Mark students who should not be in the same group. Conflicts will be flagged.</p></div>
      <div className="bg-surface border border-border rounded-xl p-4">
        <h3 className="text-[12px] font-semibold text-navy mb-3">Add Exclusion Pair</h3>
        <div className="flex items-end gap-3">
          <div className="flex-1"><label className="text-[10px] text-text-tertiary mb-1 block">Student A</label><select value={studentA} onChange={e => setStudentA(e.target.value)} className="w-full px-2 py-1.5 text-[11px] border border-border rounded-lg outline-none"><option value="">-- Select --</option>{students.map(s => <option key={s.id} value={s.id}>{s.english_name}</option>)}</select></div>
          <div className="flex-1"><label className="text-[10px] text-text-tertiary mb-1 block">Student B</label><select value={studentB} onChange={e => setStudentB(e.target.value)} className="w-full px-2 py-1.5 text-[11px] border border-border rounded-lg outline-none"><option value="">-- Select --</option>{students.filter(s => s.id !== studentA).map(s => <option key={s.id} value={s.id}>{s.english_name}</option>)}</select></div>
          <div className="flex-1"><label className="text-[10px] text-text-tertiary mb-1 block">Reason</label><input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Off-task together" className="w-full px-2 py-1.5 text-[11px] border border-border rounded-lg outline-none" /></div>
          <button onClick={add} disabled={!studentA || !studentB} className="px-4 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white disabled:opacity-40 shrink-0"><Ban size={13} className="inline mr-1" /> Add</button>
        </div>
      </div>
      {exclusions.length > 0 ? <div className="space-y-2">{exclusions.map(ex => { const a = students.find(s => s.id === ex.student_a); const b = students.find(s => s.id === ex.student_b); return (
        <div key={ex.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
          <Ban size={14} className="text-red-400 shrink-0" /><span className="text-[12px] font-medium text-red-800">{a?.english_name || '?'}</span><span className="text-[10px] text-red-400">✕</span><span className="text-[12px] font-medium text-red-800">{b?.english_name || '?'}</span>{ex.reason && <span className="text-[10px] text-red-600 ml-2">({ex.reason})</span>}<button onClick={() => remove(ex.id)} className="ml-auto p-1 rounded hover:bg-red-100 text-red-400"><Trash2 size={13} /></button>
        </div>) })}</div>
      : <div className="text-center py-8 bg-surface border border-border rounded-xl"><p className="text-[12px] text-text-tertiary">No exclusions set.</p></div>}
    </div>
  )
}
