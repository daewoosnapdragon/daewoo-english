'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, EnglishClass } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Users, Target, BookOpen, Plus, X, Trash2, Printer, AlertTriangle, Check, Loader2, RefreshCw, Pencil, Save, Archive, RotateCcw, Ban, Zap, Eye, EyeOff, PenTool, Layers } from 'lucide-react'

type GroupType = 'reading' | 'writing' | 'skill' | 'custom'
type SubView = 'overview' | 'reading' | 'writing' | 'skill' | 'custom' | 'exclusions'

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
  const [studentCWPM, setStudentCWPM] = useState<Record<string, { cwpm: number; accuracy: number; date: string }>>({})
  const [studentWIDA, setStudentWIDA] = useState<Record<string, number>>({})
  const [usePrevSemester, setUsePrevSemester] = useState(false)
  const [prevSemesterScores, setPrevSemesterScores] = useState<Record<string, Record<string, number>>>({})
  const [prevSemesterName, setPrevSemesterName] = useState<string>('')
  const [loadingPrev, setLoadingPrev] = useState(false)
  // Hoisted editingId so nested GroupManager doesn't lose state on parent re-render
  const [editingId, setEditingId] = useState<string | null>(null)
  const [savingGroup, setSavingGroup] = useState(false)

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

      // Groups — handle old type values by mapping them
      const { data: grps, error: grpsErr } = await supabase.from('student_groups').select('*').eq('english_class', selectedClass).order('created_at', { ascending: false })
      if (!grpsErr) {
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

      // CWPM data for reading groups — latest per student
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
    { id: 'reading', icon: BookOpen, label: 'Reading', count: classCounts.reading || 0 },
    { id: 'writing', icon: PenTool, label: 'Writing', count: classCounts.writing || 0 },
    { id: 'skill', icon: Target, label: 'Skill', count: classCounts.skill || 0 },
    { id: 'custom', icon: Layers, label: 'Custom', count: classCounts.custom || 0 },
    { id: 'exclusions', icon: Ban, label: 'Exclusions', count: exclusions.length },
  ]

  // ─── CRUD ───────────────────────────────────────────────────────
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

  // ─── AUTO-SUGGEST ──────────────────────────────────────────────
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
      above: { name: 'Above Benchmark', focus: 'CWPM >=' + bench.at + ' — Enrichment, complex texts, deeper comprehension' },
      at: { name: 'At Benchmark', focus: 'CWPM ' + bench.below + '-' + (bench.at - 1) + ' — Grade-level guided reading' },
      below: { name: 'Below Benchmark', focus: 'CWPM ' + bench.wellBelow + '-' + (bench.below - 1) + ' — Targeted fluency practice, repeated reading' },
      wellBelow: { name: 'Well Below Benchmark', focus: 'CWPM <' + bench.wellBelow + ' — Intensive intervention, decodable texts' },
      noData: { name: 'Needs ORF Assessment', focus: 'No fluency data — administer a 1-minute oral reading fluency check' },
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
      above: { name: 'Advanced Writers', focus: 'Above Standard (86%+) — Voice, revision, mentor text analysis' },
      on: { name: 'On-Level Writers', focus: 'On Standard (71-85%) — Organization, elaboration, conventions' },
      approaching: { name: 'Developing Writers', focus: 'Approaching (61-70%) — Sentence structure, paragraph building' },
      below: { name: 'Beginning Writers', focus: 'Below Standard (0-60%) — Sentence formation, spelling patterns, idea generation' },
      noData: { name: 'Needs Writing Assessment', focus: 'No writing scores — assign a writing task to assess' },
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

  // ─── WIDA Badge ───────────────────────────────────────────────
  const WidaBadge = ({ studentId }: { studentId: string }) => {
    const level = studentWIDA[studentId]
    if (!level) return null
    const colors = ['', 'bg-red-100 text-red-700', 'bg-orange-100 text-orange-700', 'bg-amber-100 text-amber-700', 'bg-green-100 text-green-700', 'bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700']
    return <span className={`text-[7px] font-bold px-1 py-0.5 rounded ${colors[level] || 'bg-gray-100'}`} title={'WIDA Level ' + level}>W{level}</span>
  }

  // ─── SHARED GROUP MANAGER ─────────────────────────────────────
  function GroupManager({ type, autoSuggest, infoText, extraStudentInfo }: {
    type: GroupType; autoSuggest?: () => void; infoText: string
    extraStudentInfo?: (sid: string) => string
  }) {
    const typeGroups = filteredGroups.filter(g => g.type === type)

    const toggleStudent = (gid: string, sid: string) => setGroups(prev => prev.map(g => g.id !== gid ? g : { ...g, students: g.students.includes(sid) ? g.students.filter(s => s !== sid) : [...g.students, sid] }))

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

    const handleSave = async (group: Group) => {
      setSavingGroup(true)
      const saved = await saveGroup(group)
      if (saved) {
        setGroups(prev => prev.map(g => g.id === group.id ? saved : g))
        setEditingId(null)
        showToast('Group saved')
      }
      setSavingGroup(false)
    }

    const handlePrint = (group: Group) => {
      const members = group.students.map(sid => students.find(s => s.id === sid)).filter(Boolean)
      const w = window.open('', '_blank')
      if (!w) return
      w.document.write('<html><head><title>' + group.name + '</title><style>body{font-family:sans-serif;padding:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:6px;text-align:left;font-size:13px}th{background:#f5f5f5}h2{margin:0 0 4px}p{margin:0 0 12px;color:#666;font-size:12px}</style></head><body>')
      w.document.write('<h2>' + group.name + '</h2><p>' + (group.focus || '') + '</p>')
      if (group.notes) w.document.write('<p><em>' + group.notes + '</em></p>')
      w.document.write('<table><tr><th>#</th><th>English Name</th><th>Korean Name</th><th>WIDA</th>')
      if (type === 'reading') w.document.write('<th>CWPM</th>')
      if (type === 'writing') w.document.write('<th>Writing %</th>')
      w.document.write('</tr>')
      members.forEach((s: any, i) => {
        const wida = studentWIDA[s.id]
        let extra = ''
        if (type === 'reading') { const d = studentCWPM[s.id]; extra = '<td>' + (d ? d.cwpm + ' wpm' : '--') + '</td>' }
        if (type === 'writing') { const sc = activeScores[s.id]; extra = '<td>' + (sc?.writing != null ? sc.writing + '%' : '--') + '</td>' }
        w.document.write('<tr><td>' + (i + 1) + '</td><td>' + s.english_name + '</td><td>' + s.korean_name + '</td><td>' + (wida ? 'Level ' + wida : '--') + '</td>' + extra + '</tr>')
      })
      w.document.write('</table></body></html>')
      w.document.close()
      w.print()
    }

    return (
      <div className="space-y-3">
        {/* Header buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {!showArchived && autoSuggest && (
            <>
              <button onClick={() => autoSuggest()} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-cyan-50 text-cyan-700 border border-cyan-200 hover:bg-cyan-100">
                <Zap size={12} /> Auto-Suggest
              </button>
              <button onClick={() => refreshGroups(type)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
                <RefreshCw size={12} /> Refresh
              </button>
            </>
          )}
          {!showArchived && (
            <button onClick={() => {
              const newG: Group = { id: 'new-' + Date.now(), name: '', type, english_class: selectedClass, grade: selectedGrade || undefined, students: [], tasks: [] }
              setGroups(prev => [newG, ...prev])
              setEditingId(newG.id)
            }} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-surface-alt text-text-secondary hover:bg-border">
              <Plus size={12} /> New Group
            </button>
          )}
        </div>

        {/* Info */}
        <div className="bg-surface-alt/50 border border-border/50 rounded-lg px-3 py-2 text-[10px] text-text-tertiary">{infoText}</div>

        {/* Groups list */}
        {typeGroups.length === 0 && <p className="text-center text-text-tertiary text-[12px] py-8">No {type} groups yet. {autoSuggest ? 'Click Auto-Suggest to generate from data.' : 'Click New Group to create one.'}</p>}

        {typeGroups.map(group => {
          const isEditing = editingId === group.id
          const warnings = getWarnings(group)
          const isNew = group.id.startsWith('new-')
          const isArchived = group.is_archived

          return (
            <div key={group.id} className={'bg-surface border rounded-xl overflow-hidden transition-all ' + (isArchived ? 'border-amber-200 bg-amber-50/30' : warnings.length > 0 ? 'border-red-200' : 'border-border')}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input value={group.name} onChange={e => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, name: e.target.value } : g))}
                      className="text-[13px] font-bold text-navy border-b border-navy/30 outline-none bg-transparent w-full" placeholder="Group name..." autoFocus />
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-[13px] font-bold text-navy truncate">{group.name || 'Untitled'}</h3>
                      {group.suggested_by === 'auto' && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-700">AUTO</span>}
                      {isArchived && <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">ARCHIVED</span>}
                    </div>
                  )}
                  {group.focus && !isEditing && <p className="text-[10px] text-text-tertiary mt-0.5 truncate">{group.focus}</p>}
                </div>
                <span className="text-[10px] text-text-tertiary">{group.students.length} students</span>
                <div className="flex items-center gap-1">
                  {!isArchived && !isEditing && <button onClick={() => setEditingId(group.id)} className="p-1.5 rounded-lg hover:bg-surface-alt" title="Edit"><Pencil size={13} className="text-text-tertiary" /></button>}
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

              {/* Edit panel */}
              {isEditing && (
                <div className="px-4 py-3 border-t border-border space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-[9px] uppercase text-text-tertiary font-semibold">Focus</label>
                      <input value={group.focus || ''} onChange={e => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, focus: e.target.value } : g))}
                        className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" placeholder="Group purpose..." /></div>
                    <div><label className="text-[9px] uppercase text-text-tertiary font-semibold">Book / Material</label>
                      <input value={group.book || ''} onChange={e => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, book: e.target.value } : g))}
                        className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" placeholder="Optional..." /></div>
                  </div>
                  <div><label className="text-[9px] uppercase text-text-tertiary font-semibold">Notes</label>
                    <textarea value={group.notes || ''} onChange={e => setGroups(prev => prev.map(g => g.id === group.id ? { ...g, notes: e.target.value } : g))}
                      className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none h-16 resize-none" placeholder="Teaching notes..." /></div>

                  <div><label className="text-[9px] uppercase text-text-tertiary font-semibold mb-1 block">Select Students</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {gradeStudents.map(s => {
                        const inGroup = group.students.includes(s.id)
                        const extra = extraStudentInfo?.(s.id) || ''
                        return (
                          <button key={s.id} onClick={() => toggleStudent(group.id, s.id)}
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
                    {(group.tasks || []).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 mb-1">
                        <button onClick={() => setGroups(prev => prev.map(g => g.id !== group.id ? g : { ...g, tasks: g.tasks?.map((tt, j) => j === i ? { ...tt, done: !tt.done } : tt) }))}
                          className={'w-4 h-4 rounded flex items-center justify-center shrink-0 ' + (t.done ? 'bg-green-500 text-white' : 'border border-border')}>{t.done && <Check size={10} />}</button>
                        <span className={'text-[11px] flex-1 ' + (t.done ? 'line-through text-text-tertiary' : '')}>{t.text}</span>
                        <button onClick={() => setGroups(prev => prev.map(g => g.id !== group.id ? g : { ...g, tasks: g.tasks?.filter((_, j) => j !== i) }))}
                          className="p-0.5 rounded hover:bg-red-50"><X size={10} className="text-text-tertiary" /></button>
                      </div>
                    ))}
                    <button onClick={() => {
                      const text = prompt('Task:')
                      if (text?.trim()) setGroups(prev => prev.map(g => g.id !== group.id ? g : { ...g, tasks: [...(g.tasks || []), { text: text.trim(), done: false, created_at: new Date().toISOString() }] }))
                    }} className="text-[10px] text-navy hover:underline">+ Add task</button>
                  </div>
                </div>
              )}

              {/* Read-only student pills */}
              {!isEditing && group.students.length > 0 && (
                <div className="px-4 py-2.5 border-t border-border/50 flex flex-wrap gap-1.5">
                  {group.students.map(sid => students.find(st => st.id === sid)).filter(Boolean)
                    .sort((a: any, b: any) => a.english_name.localeCompare(b.english_name))
                    .map((s: any) => {
                      const extra = extraStudentInfo?.(s.id) || ''
                      return (
                        <span key={s.id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium bg-surface-alt text-text-primary">
                          {s.english_name} <WidaBadge studentId={s.id} />
                          {extra && <span className="text-[8px] text-text-tertiary">{extra}</span>}
                        </span>
                      )
                    })}
                </div>
              )}
              {!isEditing && group.students.length === 0 && (
                <div className="px-4 py-2 border-t border-border/50 text-[10px] text-text-tertiary italic">No students assigned</div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // ─── EXCLUSIONS MANAGER ───────────────────────────────────────
  function ExclusionsManager() {
    const [studentA, setStudentA] = useState('')
    const [studentB, setStudentB] = useState('')
    const [reason, setReason] = useState('')
    const [searchA, setSearchA] = useState('')
    const [searchB, setSearchB] = useState('')
    const [focusA, setFocusA] = useState(false)
    const [focusB, setFocusB] = useState(false)
    // Only show students from the currently selected class and grade
    const classGradeStudents = useMemo(() =>
      students.filter(s => s.english_class === selectedClass && (!selectedGrade || s.grade === selectedGrade)),
      [students, selectedClass, selectedGrade]
    )

    const filteredA = classGradeStudents.filter(s => s.id !== studentB && (searchA.length === 0 || s.english_name.toLowerCase().includes(searchA.toLowerCase()) || s.korean_name.includes(searchA)))
    const filteredB = classGradeStudents.filter(s => s.id !== studentA && (searchB.length === 0 || s.english_name.toLowerCase().includes(searchB.toLowerCase()) || s.korean_name.includes(searchB)))

    const nameA = classGradeStudents.find(s => s.id === studentA)
    const nameB = classGradeStudents.find(s => s.id === studentB)

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
                <span className="text-[9px] ml-1 px-1.5 py-0.5 rounded bg-surface-alt text-text-tertiary">{s.english_class}</span>
              </button>
            ))}
            {filtered.length === 0 && <p className="text-[10px] text-text-tertiary px-3 py-2">No students found</p>}
          </div>
        )}
      </div>
    )

    return (
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-[12px] font-semibold text-navy">Add Exclusion</h3>
          <p className="text-[10px] text-text-tertiary">Students who should not be placed in the same group. Search by name or class. Warnings appear across all group types when conflicts are detected.</p>
          <div className="grid grid-cols-3 gap-2">
            <StudentSearchInput value={studentA} search={searchA} setSearch={setSearchA} setStudent={setStudentA} filtered={filteredA} focus={focusA} setFocus={setFocusA} placeholder="Search Student A..." />
            <StudentSearchInput value={studentB} search={searchB} setSearch={setSearchB} setStudent={setStudentB} filtered={filteredB} focus={focusB} setFocus={setFocusB} placeholder="Search Student B..." />
            <div className="flex gap-1">
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="flex-1 px-2 py-1.5 border border-border rounded-lg text-[11px] outline-none" />
              <button onClick={addExclusion} disabled={!studentA || !studentB} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white disabled:opacity-40">Add</button>
            </div>
          </div>
        </div>
        {exclusions.length === 0 && <p className="text-center text-text-tertiary text-[12px] py-6">No exclusions set.</p>}
        {exclusions.length > 0 && (
          <div className="space-y-1">
            {exclusions.map(ex => {
              const a = classGradeStudents.find(s => s.id === ex.student_a) || students.find(s => s.id === ex.student_a)
              const b = classGradeStudents.find(s => s.id === ex.student_b) || students.find(s => s.id === ex.student_b)
              return (
                <div key={ex.id} className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <Ban size={12} className="text-red-400 shrink-0" />
                  <span className="text-[11px] font-medium text-red-800">{a?.english_name || '?'}{a?.english_class !== selectedClass ? ` (${a?.english_class})` : ''} & {b?.english_name || '?'}{b?.english_class !== selectedClass ? ` (${b?.english_class})` : ''}</span>
                  {ex.reason && <span className="text-[10px] text-red-600 truncate">— {ex.reason}</span>}
                  <button onClick={() => removeExclusion(ex.id)} className="ml-auto p-1 rounded hover:bg-red-100"><X size={12} className="text-red-400" /></button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─── OVERVIEW TAB ─────────────────────────────────────────────
  function OverviewTab({ onNavigate }: { onNavigate: (v: SubView) => void }) {
    const active = filteredGroups.filter(g => !g.is_archived)
    const cards = [
      { type: 'reading' as SubView, icon: BookOpen, label: 'Reading Groups', desc: 'CWPM fluency benchmarks', count: active.filter(g => g.type === 'reading').length, color: 'bg-blue-50 border-blue-200 text-blue-700' },
      { type: 'writing' as SubView, icon: PenTool, label: 'Writing Groups', desc: 'Writing workshop levels', count: active.filter(g => g.type === 'writing').length, color: 'bg-amber-50 border-amber-200 text-amber-700' },
      { type: 'skill' as SubView, icon: Target, label: 'Skill Groups', desc: 'Domain weakness targeting', count: active.filter(g => g.type === 'skill').length, color: 'bg-green-50 border-green-200 text-green-700' },
      { type: 'custom' as SubView, icon: Layers, label: 'Custom Groups', desc: 'Centers, projects, pairs', count: active.filter(g => g.type === 'custom').length, color: 'bg-purple-50 border-purple-200 text-purple-700' },
    ]
    const ungrouped = gradeStudents.filter(s => !active.some(g => g.students.includes(s.id)))

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {cards.map(c => (
            <button key={c.type} onClick={() => onNavigate(c.type)} className={'text-left border rounded-xl p-4 transition-all hover:shadow-sm ' + c.color}>
              <c.icon size={20} className="mb-2 opacity-60" />
              <p className="text-[13px] font-bold">{c.count}</p>
              <p className="text-[11px] font-semibold">{c.label}</p>
              <p className="text-[9px] opacity-70 mt-0.5">{c.desc}</p>
            </button>
          ))}
        </div>
        {ungrouped.length > 0 && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-semibold text-amber-800">{ungrouped.length} student{ungrouped.length !== 1 ? 's' : ''} not in any active group</p>
              <p className="text-[10px] text-amber-700 mt-0.5">{ungrouped.map(s => s.english_name).join(', ')}</p>
            </div>
          </div>
        )}
        {active.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {active.map(g => (
              <div key={g.id} className="bg-surface border border-border rounded-xl p-3 cursor-pointer hover:shadow-sm" onClick={() => onNavigate(g.type as SubView)}>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={'text-[8px] font-bold px-1.5 py-0.5 rounded-full ' + (g.type === 'reading' ? 'bg-blue-100 text-blue-700' : g.type === 'writing' ? 'bg-amber-100 text-amber-700' : g.type === 'skill' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700')}>{g.type}</span>
                  {g.suggested_by === 'auto' && <span className="text-[7px] font-semibold px-1 py-0.5 rounded-full bg-cyan-100 text-cyan-700">AUTO</span>}
                </div>
                <h4 className="text-[12px] font-semibold text-navy truncate">{g.name}</h4>
                <p className="text-[10px] text-text-tertiary mt-1">{g.students.length} students{g.book ? ' · ' + g.book : ''}</p>
              </div>
            ))}
          </div>
        )}
        {active.length === 0 && (
          <div className="text-center py-12 bg-surface border border-border rounded-2xl">
            <Users size={32} className="mx-auto text-text-tertiary mb-2" />
            <p className="text-[13px] font-medium text-text-secondary">No groups created yet</p>
            <p className="text-[11px] text-text-tertiary mt-1">Select a tab above to create or auto-suggest groups</p>
          </div>
        )}
      </div>
    )
  }

  // ─── MAIN RENDER ──────────────────────────────────────────────
  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-navy" /></div>

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

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border pb-0 mb-4 overflow-x-auto">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setSubView(tab.id)}
            className={'inline-flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl text-[12px] font-medium transition-all border-b-2 whitespace-nowrap ' +
              (subView === tab.id ? 'border-navy text-navy bg-surface' : 'border-transparent text-text-secondary hover:text-navy hover:bg-surface-alt/50')}>
            <tab.icon size={14} /> {tab.label}
            {tab.count != null && tab.count > 0 && <span className="text-[9px] bg-navy/10 text-navy px-1.5 py-0.5 rounded-full">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      {subView === 'overview' && <OverviewTab onNavigate={setSubView} />}

      {subView === 'reading' && (
        <GroupManager type="reading" autoSuggest={autoSuggestReading}
          infoText="Reading groups are based on oral reading fluency (CWPM) from the Reading tab. Students are grouped by NAEP benchmark tiers for their grade level. WIDA levels shown as badges for scaffolding decisions."
          extraStudentInfo={sid => {
            const d = studentCWPM[sid]
            return d ? d.cwpm + 'wpm' : 'no ORF'
          }} />
      )}

      {subView === 'writing' && (
        <GroupManager type="writing" autoSuggest={autoSuggestWriting}
          infoText="Writing groups are based on writing domain assessment scores. Pull small groups during writing workshop by skill level. WIDA badges help you choose the right scaffolding for each student."
          extraStudentInfo={sid => {
            const scores = activeScores[sid]
            return scores?.writing != null ? scores.writing + '%' : 'no data'
          }} />
      )}

      {subView === 'skill' && (
        <GroupManager type="skill" autoSuggest={autoSuggestSkill}
          infoText="Skill groups target each student's weakest domain (reading, phonics, writing, speaking, language). Use for targeted small-group intervention during differentiated instruction."
          extraStudentInfo={sid => {
            const scores = activeScores[sid]
            if (!scores || Object.keys(scores).length === 0) return ''
            return Object.entries(scores).slice(0, 3).map(([d, v]) => d[0].toUpperCase() + v).join(' ')
          }} />
      )}

      {subView === 'custom' && (
        <GroupManager type="custom"
          infoText="Custom groups for any purpose: centers rotation, literature circles, partner pairs, project teams, or anything else. No auto-suggest — full flexibility." />
      )}

      {subView === 'exclusions' && <ExclusionsManager />}
    </div>
  )
}
