'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Users, Target, BookOpen, Plus, X, Trash2, Printer, AlertTriangle, Check, Loader2, RefreshCw, Pencil, Save, Archive, RotateCcw, Ban, Zap, Eye, EyeOff, PenTool, Layers, Search, ChevronDown, ChevronRight } from 'lucide-react'

type GroupType = 'reading' | 'writing' | 'skill' | 'custom'

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

// CWPM benchmarks by grade (NAEP-aligned, mid-year)
const CWPM_BENCHMARKS: Record<number, { wellBelow: number; below: number; at: number }> = {
  1: { wellBelow: 20, below: 40, at: 60 },
  2: { wellBelow: 50, below: 70, at: 90 },
  3: { wellBelow: 70, below: 90, at: 110 },
  4: { wellBelow: 90, below: 110, at: 130 },
  5: { wellBelow: 100, below: 120, at: 140 },
}

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

export default function GroupsView() {
  const { currentTeacher, lang, showToast } = useApp()
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
  const [usePrevSemester, setUsePrevSemester] = useState(false)
  const [prevSemesterScores, setPrevSemesterScores] = useState<Record<string, Record<string, number>>>({})
  const [prevSemesterName, setPrevSemesterName] = useState<string>('')
  const [loadingPrev, setLoadingPrev] = useState(false)

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingGroup, setSavingGroup] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Group>>({})
  const [studentSearch, setStudentSearch] = useState('')

  // Filter state: which group types to show (replaces tabs)
  const [activeFilters, setActiveFilters] = useState<Set<GroupType>>(new Set(['reading', 'writing', 'skill', 'custom']))

  // Collapsible exclusions
  const [showExclusions, setShowExclusions] = useState(false)

  // Inline editing: click group name to rename
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')

  // When editingId changes, populate editForm from the group
  useEffect(() => {
    if (editingId) {
      const g = groups.find(gr => gr.id === editingId)
      if (g) setEditForm({ name: g.name, focus: g.focus, book: g.book, notes: g.notes, students: [...g.students], tasks: g.tasks ? [...g.tasks] : [] })
    } else {
      setEditForm({})
      setStudentSearch('')
    }
  }, [editingId]) // eslint-disable-line react-hooks/exhaustive-deps

  const availableGrades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).sort(), [students])

  useEffect(() => {
    if (availableGrades.length > 0 && (selectedGrade === null || !availableGrades.includes(selectedGrade)))
      setSelectedGrade(availableGrades[0])
  }, [availableGrades, selectedGrade])

  const gradeStudents = useMemo(() => selectedGrade ? students.filter(s => s.grade === selectedGrade) : students, [students, selectedGrade])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: studs } = await supabase.from('students').select('id, english_name, korean_name, english_class, grade, photo_url').eq('english_class', selectedClass).eq('is_active', true).order('english_name')
      setStudents(studs || [])

      // Groups -- handle old type values by mapping them
      const { data: grps, error: grpsErr } = await supabase.from('student_groups').select('*').eq('english_class', selectedClass).order('created_at', { ascending: false })
      if (grpsErr) {
        console.warn('student_groups query error (table may not exist yet):', grpsErr.message)
        setGroups([])
      } else {
        const typeMap: Record<string, GroupType> = { fluency: 'reading', litCircle: 'custom', partner: 'custom' }
        setGroups((grps || []).map((g: any) => ({
          ...g,
          type: typeMap[g.type] || g.type,
          students: g.student_ids || [],
          tasks: g.tasks || [],
        })))
      }

      // Exclusions
      try {
        const { data: excl, error: exclErr } = await supabase.from('student_exclusions').select('*').eq('english_class', selectedClass)
        if (!exclErr && excl) setExclusions(excl)
      } catch { /* table might not exist */ }

      // Domain scores for skill + writing groups
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

      // CWPM data for reading groups -- latest per student
      try {
        const { data: readingData } = await supabase.from('reading_assessments').select('student_id, cwpm, accuracy_rate, date').order('date', { ascending: false })
        const cwpmMap: Record<string, { cwpm: number; accuracy: number; date: string }> = {}
        ;(readingData || []).forEach((r: any) => {
          if (!cwpmMap[r.student_id] && r.cwpm != null) {
            cwpmMap[r.student_id] = { cwpm: r.cwpm, accuracy: r.accuracy_rate || 0, date: r.date }
          }
        })
        setStudentCWPM(cwpmMap)
      } catch { }

      // WIDA levels
      try {
        const { data: widaData } = await supabase.from('wida_profiles').select('student_id, overall_level')
        const widaMap: Record<string, number> = {}
        ;(widaData || []).forEach((w: any) => { if (w.overall_level > 0) widaMap[w.student_id] = w.overall_level })
        setStudentWIDA(widaMap)
      } catch { }

      setLoading(false)
    })()
  }, [selectedClass])

  // Load previous semester grades when toggle is on
  useEffect(() => {
    if (!usePrevSemester || Object.keys(prevSemesterScores).length > 0) return
    ;(async () => {
      setLoadingPrev(true)
      try {
        // Find the most recent non-active semester by start_date
        const { data: semesters } = await supabase.from('semesters').select('id, name').eq('is_active', false).order('start_date', { ascending: false }).limit(1)
        if (semesters && semesters.length > 0) {
          const prevSem = semesters[0]
          setPrevSemesterName(prevSem.name)
          const { data: semGrades } = await supabase.from('semester_grades').select('student_id, domain, average').eq('semester_id', prevSem.id)
          if (semGrades) {
            const avgMap: Record<string, Record<string, number>> = {}
            semGrades.forEach((g: any) => {
              if (!avgMap[g.student_id]) avgMap[g.student_id] = {}
              if (g.average != null) avgMap[g.student_id][g.domain] = Math.round(g.average)
            })
            setPrevSemesterScores(avgMap)
          }
        } else {
          setPrevSemesterName('No previous semester found')
        }
      } catch { }
      setLoadingPrev(false)
    })()
  }, [usePrevSemester, prevSemesterScores])

  // Use previous semester scores when toggled on, otherwise current
  const activeScores = usePrevSemester ? prevSemesterScores : studentScores

  const filteredGroups = useMemo(() => groups.filter(g => {
    if (!showArchived && g.is_archived) return false
    if (showArchived && !g.is_archived) return false
    if (!activeFilters.has(g.type)) return false
    if (selectedGrade && g.grade && g.grade !== selectedGrade) return false
    if (!g.grade && selectedGrade) {
      const hasGradeStudents = g.students.some(sid => { const s = students.find(st => st.id === sid); return s && s.grade === selectedGrade })
      if (!hasGradeStudents && g.students.length > 0) return false
    }
    return true
  }), [groups, selectedGrade, showArchived, students, activeFilters])

  const classCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    groups.filter(g => !g.is_archived).forEach(g => { counts[g.type] = (counts[g.type] || 0) + 1 })
    return counts
  }, [groups])

  // ---- CRUD ----
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

  // ---- AUTO-SUGGEST ----
  const autoSuggestReading = useCallback(async () => {
    const gs = gradeStudents
    if (gs.length === 0) return
    const grade = selectedGrade || 3
    const bench = CWPM_BENCHMARKS[grade] || CWPM_BENCHMARKS[3]
    const tiers: Record<string, StudentBasic[]> = { above: [], at: [], below: [], wellBelow: [], noData: [] }
    gs.forEach(s => {
      const data = studentCWPM[s.id]
      if (!data) { tiers.noData.push(s); return }
      if (data.cwpm >= bench.at) tiers.above.push(s)
      else if (data.cwpm >= bench.below) tiers.at.push(s)
      else if (data.cwpm >= bench.wellBelow) tiers.below.push(s)
      else tiers.wellBelow.push(s)
    })
    const tierInfo: Record<string, { name: string; focus: string }> = {
      above: { name: 'Above Benchmark', focus: 'CWPM >=' + bench.at + ' -- Enrichment, complex texts, deeper comprehension' },
      at: { name: 'At Benchmark', focus: 'CWPM ' + bench.below + '-' + (bench.at - 1) + ' -- Grade-level guided reading' },
      below: { name: 'Below Benchmark', focus: 'CWPM ' + bench.wellBelow + '-' + (bench.below - 1) + ' -- Targeted fluency practice, repeated reading' },
      wellBelow: { name: 'Well Below Benchmark', focus: 'CWPM <' + bench.wellBelow + ' -- Intensive intervention, decodable texts' },
      noData: { name: 'Needs ORF Assessment', focus: 'No fluency data -- administer a 1-minute oral reading fluency check' },
    }
    const newGroups: Group[] = []
    for (const [tier, studs] of Object.entries(tiers)) {
      if (studs.length === 0) continue
      const payload = {
        name: tierInfo[tier].name, type: 'reading' as GroupType, english_class: selectedClass, grade: selectedGrade || undefined,
        focus: tierInfo[tier].focus, student_ids: studs.map(s => s.id), suggested_by: 'auto', tasks: [],
        created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
      }
      const { data } = await supabase.from('student_groups').insert(payload).select().single()
      if (data) newGroups.push({ ...data, students: data.student_ids || [], tasks: data.tasks || [] })
    }
    setGroups(prev => [...newGroups, ...prev])
    showToast(newGroups.length + ' reading groups suggested & saved')
  }, [gradeStudents, selectedClass, selectedGrade, studentCWPM, currentTeacher])

  const autoSuggestWriting = useCallback(async () => {
    const gs = gradeStudents
    if (gs.length === 0) return
    const tiers: Record<string, StudentBasic[]> = { above: [], on: [], approaching: [], below: [], noData: [] }
    gs.forEach(s => {
      const scores = activeScores[s.id]
      const writingPct = scores?.writing
      if (writingPct == null) { tiers.noData.push(s); return }
      if (writingPct >= 86) tiers.above.push(s)
      else if (writingPct >= 71) tiers.on.push(s)
      else if (writingPct >= 61) tiers.approaching.push(s)
      else tiers.below.push(s)
    })
    const tierInfo: Record<string, { name: string; focus: string }> = {
      above: { name: 'Advanced Writers', focus: 'Above Standard (86%+) -- Voice, revision, mentor text analysis' },
      on: { name: 'On-Level Writers', focus: 'On Standard (71-85%) -- Organization, elaboration, conventions' },
      approaching: { name: 'Developing Writers', focus: 'Approaching (61-70%) -- Sentence structure, paragraph building' },
      below: { name: 'Beginning Writers', focus: 'Below Standard (0-60%) -- Sentence formation, spelling patterns, idea generation' },
      noData: { name: 'Needs Writing Assessment', focus: 'No writing scores -- assign a writing task to assess' },
    }
    const newGroups: Group[] = []
    for (const [tier, studs] of Object.entries(tiers)) {
      if (studs.length === 0) continue
      const payload = {
        name: tierInfo[tier].name, type: 'writing' as GroupType, english_class: selectedClass, grade: selectedGrade || undefined,
        focus: tierInfo[tier].focus, student_ids: studs.map(s => s.id), suggested_by: 'auto', tasks: [],
        created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
      }
      const { data } = await supabase.from('student_groups').insert(payload).select().single()
      if (data) newGroups.push({ ...data, students: data.student_ids || [], tasks: data.tasks || [] })
    }
    setGroups(prev => [...newGroups, ...prev])
    showToast(newGroups.length + ' writing groups suggested & saved')
  }, [gradeStudents, selectedClass, selectedGrade, activeScores, currentTeacher])

  const autoSuggestSkill = useCallback(async () => {
    const gs = gradeStudents
    if (gs.length === 0) return
    const domains = ['reading', 'phonics', 'writing', 'speaking', 'language']
    const byWeakest: Record<string, StudentBasic[]> = {}
    gs.forEach(s => {
      const scores = activeScores[s.id]
      if (!scores || Object.keys(scores).length === 0) { if (!byWeakest['unassessed']) byWeakest['unassessed'] = []; byWeakest['unassessed'].push(s); return }
      let weakest = ''; let lowest = 101
      domains.forEach(d => { if (scores[d] != null && scores[d] < lowest) { lowest = scores[d]; weakest = d } })
      if (weakest) { if (!byWeakest[weakest]) byWeakest[weakest] = []; byWeakest[weakest].push(s) }
    })
    const labels: Record<string, string> = { reading: 'Reading Support', phonics: 'Phonics Support', writing: 'Writing Support', speaking: 'Speaking Support', language: 'Language Support' }
    const newGroups: Group[] = []
    for (const [domain, studs] of Object.entries(byWeakest)) {
      if (studs.length === 0) continue
      const payload = {
        name: domain === 'unassessed' ? 'Needs Assessment' : labels[domain] || domain + ' Group',
        type: 'skill' as GroupType, english_class: selectedClass, grade: selectedGrade || undefined,
        focus: domain === 'unassessed' ? 'No assessment data yet' : 'Weakest domain: ' + domain,
        student_ids: studs.map(s => s.id), suggested_by: 'auto', tasks: [],
        created_by: currentTeacher?.id || null, updated_at: new Date().toISOString(),
      }
      const { data } = await supabase.from('student_groups').insert(payload).select().single()
      if (data) newGroups.push({ ...data, students: data.student_ids || [], tasks: data.tasks || [] })
    }
    setGroups(prev => [...newGroups, ...prev])
    showToast(newGroups.length + ' skill groups suggested & saved')
  }, [gradeStudents, selectedClass, selectedGrade, activeScores, currentTeacher])

  const refreshGroups = async (type: GroupType) => {
    const toArchive = groups.filter(g => g.type === type && !g.is_archived && !g.id.startsWith('new-'))
    if (toArchive.length > 0 && !confirm('Archive ' + toArchive.length + ' existing ' + type + ' group(s) and regenerate?')) return
    for (const g of toArchive) await archiveGroup(g.id)
    setGroups(prev => prev.filter(g => !(g.type === type && g.id.startsWith('new-'))))
    if (type === 'reading') await autoSuggestReading()
    else if (type === 'writing') await autoSuggestWriting()
    else if (type === 'skill') await autoSuggestSkill()
  }

  // ---- Helper: extra student info per type ----
  const extraStudentInfo = (sid: string, type: GroupType): string => {
    if (type === 'reading') {
      const d = studentCWPM[sid]
      return d ? d.cwpm + 'wpm' : 'no ORF'
    }
    if (type === 'writing') {
      const scores = activeScores[sid]
      return scores?.writing != null ? scores.writing + '%' : 'no data'
    }
    if (type === 'skill') {
      const scores = activeScores[sid]
      if (!scores || Object.keys(scores).length === 0) return ''
      return Object.entries(scores).slice(0, 3).map(([d, v]) => d[0].toUpperCase() + v).join(' ')
    }
    return ''
  }

  // ---- WIDA Badge ----
  const WidaBadge = ({ studentId }: { studentId: string }) => {
    const level = studentWIDA[studentId]
    if (!level) return null
    const colors = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700']
    return <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${colors[level] || 'bg-gray-100'}`} title={'WIDA Level ' + level}>W{level}</span>
  }

  // ---- Warnings (exclusion conflicts) ----
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

  // ---- Toggle filter pill ----
  const toggleFilter = (type: GroupType) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) { next.delete(type) } else { next.add(type) }
      return next
    })
  }

  // ---- Toggle student in edit form ----
  const toggleStudent = (sid: string) => {
    setEditForm(prev => ({
      ...prev,
      students: (prev.students || []).includes(sid)
        ? (prev.students || []).filter(s => s !== sid)
        : [...(prev.students || []), sid]
    }))
  }

  // ---- Save inline edit ----
  const handleSave = async (group: Group) => {
    setSavingGroup(true)
    const merged = { ...group, ...editForm, students: editForm.students || group.students, tasks: editForm.tasks || group.tasks }
    const saved = await saveGroup(merged)
    if (saved) {
      setGroups(prev => prev.map(g => g.id === group.id ? saved : g))
      setEditingId(null)
      showToast('Group saved')
    }
    setSavingGroup(false)
  }

  // ---- Inline rename (click group name) ----
  const handleRenameStart = (group: Group) => {
    if (editingId === group.id) return // already in full edit
    setRenamingId(group.id)
    setRenameValue(group.name)
  }
  const handleRenameCommit = async (group: Group) => {
    if (renameValue.trim() && renameValue !== group.name) {
      const updated = { ...group, name: renameValue.trim() }
      const saved = await saveGroup(updated)
      if (saved) {
        setGroups(prev => prev.map(g => g.id === group.id ? saved : g))
        showToast('Renamed')
      }
    }
    setRenamingId(null)
    setRenameValue('')
  }

  // ---- Print ----
  const handlePrint = (group: Group) => {
    const members = group.students.map(sid => students.find(s => s.id === sid)).filter(Boolean)
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write('<html><head><title>' + group.name + '</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}th{background:#f5f5f5}h2{margin:0 0 4px}p{margin:0 0 12px;color:#666;font-size:12px}</style></head><body>')
    w.document.write('<h2>' + group.name + '</h2><p>' + (group.focus || '') + '</p>')
    if (group.notes) w.document.write('<p><em>' + group.notes + '</em></p>')
    w.document.write('<table><tr><th>#</th><th>English Name</th><th>Korean Name</th><th>WIDA</th>')
    if (group.type === 'reading') w.document.write('<th>CWPM</th>')
    if (group.type === 'writing') w.document.write('<th>Writing %</th>')
    w.document.write('</tr>')
    members.forEach((s: any, i) => {
      const wida = studentWIDA[s.id]
      let extra = ''
      if (group.type === 'reading') { const d = studentCWPM[s.id]; extra = '<td>' + (d ? d.cwpm + ' wpm' : '--') + '</td>' }
      if (group.type === 'writing') { const sc = activeScores[s.id]; extra = '<td>' + (sc?.writing != null ? sc.writing + '%' : '--') + '</td>' }
      w.document.write('<tr><td>' + (i + 1) + '</td><td>' + s.english_name + '</td><td>' + s.korean_name + '</td><td>' + (wida ? 'Level ' + wida : '--') + '</td>' + extra + '</tr>')
    })
    w.document.write('</table></body></html>')
    w.document.close()
    w.print()
  }

  // ---- New group ----
  const addNewGroup = (type: GroupType) => {
    const newG: Group = { id: 'new-' + Date.now(), name: '', type, english_class: selectedClass, grade: selectedGrade || undefined, students: [], tasks: [] }
    setGroups(prev => [newG, ...prev])
    setEditingId(newG.id)
    // Make sure this type filter is visible
    setActiveFilters(prev => { const next = new Set(prev); next.add(type); return next })
  }

  // ---- Exclusions Manager (inline) ----
  function ExclusionsManager() {
    const [studentA, setStudentA] = useState('')
    const [studentB, setStudentB] = useState('')
    const [reason, setReason] = useState('')
    const [searchA, setSearchA] = useState('')
    const [searchB, setSearchB] = useState('')
    const [focusA, setFocusA] = useState(false)
    const [focusB, setFocusB] = useState(false)
    const classGradeStudents = useMemo(() =>
      students.filter(s => s.english_class === selectedClass && (!selectedGrade || s.grade === selectedGrade)),
      [students, selectedClass, selectedGrade]
    )

    const filteredA = classGradeStudents.filter(s => s.id !== studentB && (searchA.length === 0 || s.english_name.toLowerCase().includes(searchA.toLowerCase()) || s.korean_name.includes(searchA)))
    const filteredB = classGradeStudents.filter(s => s.id !== studentA && (searchB.length === 0 || s.english_name.toLowerCase().includes(searchB.toLowerCase()) || s.korean_name.includes(searchB)))

    const addExclusion = async () => {
      if (!studentA || !studentB || studentA === studentB) return
      const { data, error } = await supabase.from('student_exclusions').insert({ student_a: studentA, student_b: studentB, english_class: selectedClass, reason: reason || null }).select().single()
      if (error) { showToast('Error: ' + error.message); return }
      setExclusions(prev => [...prev, data])
      setStudentA(''); setStudentB(''); setReason(''); setSearchA(''); setSearchB('')
      showToast('Exclusion added')
    }

    const removeExclusion = async (id: string) => {
      await supabase.from('student_exclusions').delete().eq('id', id)
      setExclusions(prev => prev.filter(e => e.id !== id))
    }

    const StudentSearchInput = ({ value, search, setSearch, setStudent, filtered, focus, setFocus, placeholder }: any) => (
      <div className="relative">
        <input
          value={value ? (classGradeStudents.find(s => s.id === value)?.english_name || '') : search}
          onChange={e => { setSearch(e.target.value); if (value) setStudent('') }}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 200)}
          placeholder={placeholder}
          className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy"
        />
        {value && <button onClick={() => { setStudent(''); setSearch('') }} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-red-500"><X size={10} /></button>}
        {focus && !value && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-surface border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {filtered.slice(0, 20).map((s: StudentBasic) => (
              <button key={s.id} onMouseDown={() => { setStudent(s.id); setSearch(''); setFocus(false) }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-surface-alt border-b border-border/30 last:border-0">
                <span className="text-[11px] font-medium">{s.english_name}</span>
                <span className="text-[9px] text-text-tertiary ml-1">{s.korean_name}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[10px] text-text-tertiary px-3 py-2">No students found</p>}
          </div>
        )}
      </div>
    )

    return (
      <div className="space-y-3">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-[12px] font-semibold text-navy">Add Exclusion</h3>
          <p className="text-[10px] text-text-tertiary">Students who should not be placed in the same group. Warnings appear across all group types when conflicts are detected.</p>
          <div className="grid grid-cols-3 gap-2">
            <StudentSearchInput value={studentA} search={searchA} setSearch={setSearchA} setStudent={setStudentA} filtered={filteredA} focus={focusA} setFocus={setFocusA} placeholder="Search Student A..." />
            <StudentSearchInput value={studentB} search={searchB} setSearch={setSearchB} setStudent={setStudentB} filtered={filteredB} focus={focusB} setFocus={setFocusB} placeholder="Search Student B..." />
            <div className="flex gap-1">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" />
              <button onClick={addExclusion} disabled={!studentA || !studentB} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white disabled:opacity-40">Add</button>
            </div>
          </div>
        </div>
        {exclusions.length > 0 && (
          <div className="space-y-1">
            {exclusions.map(ex => {
              const a = students.find(s => s.id === ex.student_a)
              const b = students.find(s => s.id === ex.student_b)
              return (
                <div key={ex.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <Ban size={12} className="text-red-400 shrink-0" />
                  <span className="text-[11px] font-medium text-red-800">{a?.english_name || '?'} & {b?.english_name || '?'}</span>
                  {ex.reason && <span className="text-[10px] text-red-600 truncate">-- {ex.reason}</span>}
                  <button onClick={() => removeExclusion(ex.id)} className="ml-auto p-1 rounded hover:bg-red-100"><X size={12} className="text-red-400" /></button>
                </div>
              )
            })}
          </div>
        )}
        {exclusions.length === 0 && <p className="text-center text-text-tertiary text-[11px] py-4">No exclusions set.</p>}
      </div>
    )
  }

  // ---- Ungrouped students ----
  const ungrouped = useMemo(() => {
    const activeGroups = groups.filter(g => !g.is_archived)
    return gradeStudents.filter(s => !activeGroups.some(g => g.students.includes(s.id)))
  }, [gradeStudents, groups])

  // ---- MAIN RENDER ----
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy" /></div>

  const FILTER_PILLS: { type: GroupType; icon: any; label: string; count: number }[] = [
    { type: 'reading', icon: BookOpen, label: 'Reading', count: classCounts.reading || 0 },
    { type: 'writing', icon: PenTool, label: 'Writing', count: classCounts.writing || 0 },
    { type: 'skill', icon: Target, label: 'Skill', count: classCounts.skill || 0 },
    { type: 'custom', icon: Layers, label: 'Custom', count: classCounts.custom || 0 },
  ]

  return (
    <div className="px-6 py-4 max-w-6xl mx-auto">
      {/* Class + Grade selectors */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {(isAdmin ? ENGLISH_CLASSES : [teacherClass || 'Snapdragon']).map(cls => (
          <button key={cls} onClick={() => setSelectedClass(cls as EnglishClass)}
            className={'px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ' + (selectedClass === cls ? 'text-white shadow-sm' : 'bg-surface-alt text-text-secondary hover:bg-border')}
            style={selectedClass === cls ? { backgroundColor: classToColor(cls as EnglishClass), color: classToTextColor(cls as EnglishClass) } : {}}>
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
        <span className="w-px h-5 bg-border mx-1" />
        <button onClick={() => setShowArchived(!showArchived)}
          className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ' + (showArchived ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-surface-alt text-text-secondary hover:bg-border')}>
          {showArchived ? <Eye size={12} /> : <EyeOff size={12} />} {showArchived ? 'Showing Archived' : 'Show Archived'}
        </button>
        <span className="w-px h-5 bg-border mx-1" />
        <button onClick={() => setUsePrevSemester(!usePrevSemester)}
          className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ' + (usePrevSemester ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-surface-alt text-text-secondary hover:bg-border')}>
          {loadingPrev ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {usePrevSemester ? `Using: ${prevSemesterName || 'Previous Semester'}` : 'Use Previous Semester Grades'}
        </button>
      </div>

      {/* Filter pills + action buttons */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {FILTER_PILLS.map(pill => {
          const active = activeFilters.has(pill.type)
          return (
            <button key={pill.type} onClick={() => toggleFilter(pill.type)}
              className={'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all border ' +
                (active ? TYPE_BADGE_STYLES[pill.type] : 'bg-surface-alt text-text-tertiary border-transparent opacity-60 hover:opacity-100')}>
              <pill.icon size={12} /> {pill.label}
              {pill.count > 0 && <span className="text-[9px] ml-0.5 opacity-70">{pill.count}</span>}
            </button>
          )
        })}

        <span className="w-px h-5 bg-border mx-1" />

        {/* Auto-suggest buttons */}
        {!showArchived && (
          <>
            <div className="relative group">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100">
                <Zap size={12} /> Auto-Suggest
              </button>
              <div className="hidden group-hover:block absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                <button onClick={() => autoSuggestReading()} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><BookOpen size={11} /> Reading (CWPM)</button>
                <button onClick={() => autoSuggestWriting()} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><PenTool size={11} /> Writing (Scores)</button>
                <button onClick={() => autoSuggestSkill()} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><Target size={11} /> Skill (Weakest)</button>
              </div>
            </div>

            <div className="relative group">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
                <RefreshCw size={12} /> Refresh
              </button>
              <div className="hidden group-hover:block absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[160px]">
                <button onClick={() => refreshGroups('reading')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><BookOpen size={11} /> Refresh Reading</button>
                <button onClick={() => refreshGroups('writing')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><PenTool size={11} /> Refresh Writing</button>
                <button onClick={() => refreshGroups('skill')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><Target size={11} /> Refresh Skill</button>
              </div>
            </div>

            <div className="relative group">
              <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
                <Plus size={12} /> New Group
              </button>
              <div className="hidden group-hover:block absolute z-50 top-full left-0 mt-1 bg-surface border border-border rounded-lg shadow-lg py-1 min-w-[140px]">
                <button onClick={() => addNewGroup('reading')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><BookOpen size={11} /> Reading</button>
                <button onClick={() => addNewGroup('writing')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><PenTool size={11} /> Writing</button>
                <button onClick={() => addNewGroup('skill')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><Target size={11} /> Skill</button>
                <button onClick={() => addNewGroup('custom')} className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-surface-alt flex items-center gap-2"><Layers size={11} /> Custom</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ungrouped students warning */}
      {ungrouped.length > 0 && !showArchived && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] font-semibold text-amber-800">{ungrouped.length} student{ungrouped.length !== 1 ? 's' : ''} not in any active group</p>
            <p className="text-[10px] text-amber-700 mt-0.5">{ungrouped.map(s => s.english_name).join(', ')}</p>
          </div>
        </div>
      )}

      {/* Groups list */}
      {filteredGroups.length === 0 && (
        <div className="text-center py-12 bg-surface border border-border rounded-2xl mb-4">
          <Users size={32} className="mx-auto text-text-tertiary mb-2" />
          <p className="text-[13px] font-medium text-text-secondary">{showArchived ? 'No archived groups' : 'No groups match current filters'}</p>
          <p className="text-[11px] text-text-tertiary mt-1">{showArchived ? 'Archive groups to see them here' : 'Use Auto-Suggest or create a new group'}</p>
        </div>
      )}

      <div className="space-y-3 mb-6">
        {filteredGroups.map(group => {
          const isEditing = editingId === group.id
          const isRenaming = renamingId === group.id
          const warnings = getWarnings(group)
          const isNew = group.id.startsWith('new-')
          const isArchived = group.is_archived
          const memberStudents = group.students.map(sid => students.find(st => st.id === sid)).filter(Boolean) as StudentBasic[]

          // Students filtered by search in edit mode
          const searchedStudents = studentSearch
            ? gradeStudents.filter(s => s.english_name.toLowerCase().includes(studentSearch.toLowerCase()) || s.korean_name.includes(studentSearch))
            : gradeStudents

          return (
            <div key={group.id} className={
              'bg-surface border rounded-xl overflow-hidden transition-all border-l-4 ' +
              TYPE_CARD_STYLES[group.type] + ' ' +
              (isArchived ? 'border-t-amber-200 border-r-amber-200 border-b-amber-200 bg-amber-50/30' : warnings.length > 0 ? 'border-t-red-200 border-r-red-200 border-b-red-200' : 'border-t-border border-r-border border-b-border')
            }>
              {/* Card header */}
              <div className="px-4 py-3 flex items-center gap-3">
                {/* Type badge */}
                <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0 border ' + TYPE_BADGE_STYLES[group.type]}>{group.type}</span>

                {/* Group name - click to rename */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input value={editForm.name || ''} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                      className="text-[13px] font-bold text-navy border-b border-navy/30 outline-none bg-transparent w-full" placeholder="Group name..." autoFocus />
                  ) : isRenaming ? (
                    <input value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameCommit(group)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameCommit(group); if (e.key === 'Escape') { setRenamingId(null); setRenameValue('') } }}
                      className="text-[13px] font-bold text-navy border-b border-navy/30 outline-none bg-transparent w-full" autoFocus />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-bold text-navy truncate cursor-pointer hover:underline decoration-navy/30" onClick={() => handleRenameStart(group)}>
                        {group.name || 'Untitled'}
                      </h3>
                      {group.suggested_by === 'auto' && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700">AUTO</span>}
                      {isArchived && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">ARCHIVED</span>}
                    </div>
                  )}
                  {group.focus && !isEditing && <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{group.focus}</p>}
                </div>

                <span className="text-[10px] text-text-tertiary whitespace-nowrap">{group.students.length} students</span>

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {!isArchived && !isEditing && (
                    <button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Expand edit panel">
                      <Pencil size={13} className="text-text-tertiary" />
                    </button>
                  )}
                  {!isArchived && <button onClick={() => handlePrint(group)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Print"><Printer size={13} className="text-text-tertiary" /></button>}
                  {!isArchived && !isNew && <button onClick={() => archiveGroup(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Archive"><Archive size={13} className="text-text-tertiary" /></button>}
                  {isArchived && <button onClick={() => restoreGroup(group.id)} className="p-1.5 rounded-lg hover:bg-green-50" title="Restore"><RotateCcw size={13} className="text-green-600" /></button>}
                  {(isNew || isArchived) && <button onClick={() => deleteGroup(group.id)} className="p-1.5 rounded-lg hover:bg-red-50" title="Delete"><Trash2 size={13} className="text-red-400" /></button>}
                  {isEditing && (
                    <>
                      <button onClick={() => { if (isNew) deleteGroup(group.id); setEditingId(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Cancel"><X size={13} className="text-text-tertiary" /></button>
                      <button onClick={() => handleSave(group)} disabled={savingGroup} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white hover:opacity-90 disabled:opacity-50">
                        <Save size={12} className="inline mr-1" />{savingGroup ? '...' : 'Save'}
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

              {/* Inline edit panel (expanded) */}
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
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none h-16 resize-none" placeholder="Teaching notes..." />
                  </div>

                  {/* Student picker with search */}
                  <div>
                    <label className="text-[9px] uppercase text-text-tertiary font-semibold mb-1 block">Select Students</label>
                    <div className="relative mb-2">
                      <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
                      <input
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Search students by name..."
                        className="w-full pl-7 pr-8 py-1.5 border border-border rounded-lg text-[11px] outline-none focus:border-navy"
                      />
                      {studentSearch && (
                        <button onClick={() => setStudentSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-red-500"><X size={10} /></button>
                      )}
                    </div>

                    {/* Selected students as chips (at top for visibility) */}
                    {(editForm.students || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {(editForm.students || []).map(sid => {
                          const s = students.find(st => st.id === sid)
                          if (!s) return null
                          return (
                            <button key={sid} onClick={() => toggleStudent(sid)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-navy/10 text-navy border border-navy/20 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                              {s.english_name}
                              <X size={9} />
                            </button>
                          )
                        })}
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto">
                      {searchedStudents.map(s => {
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
                      {searchedStudents.length === 0 && (
                        <p className="col-span-full text-[10px] text-text-tertiary py-2 text-center">No students match &quot;{studentSearch}&quot;</p>
                      )}
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
                    <button onClick={() => {
                      const text = prompt('Task:')
                      if (text?.trim()) setEditForm(prev => ({ ...prev, tasks: [...(prev.tasks || []), { text: text.trim(), done: false, created_at: new Date().toISOString() }] }))
                    }} className="text-[10px] text-navy hover:underline">+ Add task</button>
                  </div>
                </div>
              )}

              {/* Read-only student chips */}
              {!isEditing && memberStudents.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border/50 flex flex-wrap gap-1.5">
                  {memberStudents
                    .sort((a, b) => a.english_name.localeCompare(b.english_name))
                    .map(s => {
                      const extra = extraStudentInfo(s.id, group.type)
                      return (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-surface-alt text-text-primary">
                          {s.english_name} <WidaBadge studentId={s.id} />
                          {extra && <span className="text-[8px] text-text-tertiary">{extra}</span>}
                        </span>
                      )
                    })}
                </div>
              )}
              {!isEditing && memberStudents.length === 0 && (
                <div className="px-4 py-2 border-t border-border/50 text-[10px] text-text-tertiary italic">No students assigned</div>
              )}

              {/* Tasks preview (read-only, if any undone) */}
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

      {/* Exclusions collapsible section */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button onClick={() => setShowExclusions(!showExclusions)}
          className="w-full flex items-center gap-2 px-4 py-3 bg-surface hover:bg-surface-alt/50 transition-colors text-left">
          {showExclusions ? <ChevronDown size={14} className="text-text-tertiary" /> : <ChevronRight size={14} className="text-text-tertiary" />}
          <Ban size={14} className="text-red-400" />
          <span className="text-[12px] font-semibold text-navy">Exclusions</span>
          {exclusions.length > 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">{exclusions.length}</span>}
          <span className="text-[10px] text-text-tertiary ml-2">Students who should not be grouped together</span>
        </button>
        {showExclusions && (
          <div className="px-4 py-3 border-t border-border">
            <ExclusionsManager />
          </div>
        )}
      </div>
    </div>
  )
}
