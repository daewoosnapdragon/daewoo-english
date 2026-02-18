'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { BookOpen, Users2, Loader2, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, Info, Save, Globe2 } from 'lucide-react'
import { CCSS_STANDARDS, CCSS_DOMAINS, type CCSSDomain } from './ccss-standards'
import WIDAGuide from './WIDAGuide'

function getAdjustedGrade(studentGrade: Grade, englishClass: EnglishClass): number {
  if (['Lily', 'Camellia'].includes(englishClass)) return Math.max(0, studentGrade - 2)
  if (['Daisy', 'Sunflower'].includes(englishClass)) return Math.max(0, studentGrade - 1)
  return studentGrade
}
function gradeLabel(g: number): string { return g === 0 ? 'Kindergarten' : `Grade ${g}` }

export const WIDA_LEVELS = [
  { level: 1, name: 'Entering', color: '#EF9A9A', bg: '#FFEBEE',
    desc: 'Relies on gestures, pictures, and single words. Cannot follow verbal instructions without visual support. Often silent or uses Korean.',
    scaffolds: 'Use bilingual word walls, picture dictionaries, TPR. Accept drawings as responses. Pair with bilingual buddy.' },
  { level: 2, name: 'Emerging', color: '#FFCC80', bg: '#FFF3E0',
    desc: 'Uses short phrases and memorized chunks. Answers yes/no and simple questions. Writes using word banks and copied patterns.',
    scaffolds: 'Provide word banks and sentence starters. Pre-teach 5-7 key words. Allow extra processing time. Use graphic organizers.' },
  { level: 3, name: 'Developing', color: '#FFF59D', bg: '#FFFDE7',
    desc: 'Speaks in simple sentences with errors. Follows most discussions on familiar topics. Reads with support. Writes paragraphs with frequent errors.',
    scaffolds: 'Use graphic organizers for writing. Pair for think-pair-share. Highlight key text features. Give writing checklists.' },
  { level: 4, name: 'Expanding', color: '#A5D6A7', bg: '#E8F5E9',
    desc: 'Communicates well for most tasks. Reads independently with occasional confusion on academic language. You sometimes forget this student is an ELL.',
    scaffolds: 'Focus on academic vocabulary. Teach editing strategies. Use mentor texts. Challenge with open-ended questions.' },
  { level: 5, name: 'Bridging', color: '#90CAF9', bg: '#E3F2FD',
    desc: 'Near-native fluency. Reads and writes at or near grade level. Errors are minor. Can explain complex ideas to peers.',
    scaffolds: 'Focus on idioms, figurative language, nuance. Assign peer tutoring roles. Teach advanced writing craft.' },
  { level: 6, name: 'Reaching', color: '#CE93D8', bg: '#F3E5F5',
    desc: 'Fully proficient. Indistinguishable from native speakers in most classroom situations. No longer needs ELL-specific scaffolding.',
    scaffolds: 'Enrichment and leadership roles. Focus on content depth. Continue monitoring for regression under stress.' },
]
export const WIDA_DOMAINS = ['listening', 'speaking', 'reading', 'writing'] as const
export type WIDADomainKey = typeof WIDA_DOMAINS[number]

type StdStatus = 'not_started' | 'in_progress' | 'mastered'
const STATUS_CFG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  mastered: { label: 'Mastered', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
}

// Build cluster groups from standards
function getClusters(domain: CCSSDomain, grade: number) {
  const stds = CCSS_STANDARDS.filter(s => s.domain === domain && s.grade === grade)
  const map = new Map<string, typeof stds>()
  stds.forEach(s => {
    if (!map.has(s.cluster)) map.set(s.cluster, [])
    map.get(s.cluster)!.push(s)
  })
  return Array.from(map.entries()).map(([name, standards]) => ({ name, standards, codes: standards.map(s => s.code) }))
}

// ═══════════════════════════════════════════════════════════════════
// MAIN - default to WIDA Profiles
// ═══════════════════════════════════════════════════════════════════
export default function CurriculumView() {
  const { language } = useApp()
  const [view, setView] = useState<'standards' | 'guide'>('standards')

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">{language === 'ko' ? '표준' : 'Standards'}</h2>
        <p className="text-[13px] text-text-secondary mt-1">CCSS standards tracking and WIDA/CCSS reference guide</p>
        <div className="flex gap-1 mt-4">
          {([['standards', 'Standards Checklist', BookOpen], ['guide', 'WIDA/CCSS Guide', Globe2]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${view === id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-6">
        {view === 'standards' && <ClusterTracker />}
        {view === 'guide' && <WIDAGuide />}
      </div>
    </div>
  )
}

// ─── WIDA STUDENT PROFILES ──────────────────────────────────────────
export function WIDAProfiles() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Admin'
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Snapdragon')
  const [gr, setGr] = useState<Grade>(3)
  const { students } = useStudents({ grade: gr, english_class: cls })
  const [levels, setLevels] = useState<Record<string, Record<string, number>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const availableClasses = isAdmin ? ENGLISH_CLASSES : [currentTeacher?.english_class as EnglishClass].filter(Boolean)

  const loadLevels = useCallback(async () => {
    if (students.length === 0) { setLevels({}); setLoading(false); return }
    setLoading(true)
    const { data } = await supabase.from('student_wida_levels').select('*').in('student_id', students.map(s => s.id))
    const m: Record<string, Record<string, number>> = {}
    if (data) data.forEach((r: any) => { if (!m[r.student_id]) m[r.student_id] = {}; m[r.student_id][r.domain] = r.wida_level })
    setLevels(m); setLoading(false); setHasChanges(false)
  }, [students])

  useEffect(() => { loadLevels() }, [loadLevels])

  const setLevel = (studentId: string, domain: string, level: number) => {
    setLevels(prev => ({ ...prev, [studentId]: { ...(prev[studentId] || {}), [domain]: level } }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const rows: any[] = []
    const historyRows: any[] = []
    for (const [sid, doms] of Object.entries(levels)) {
      for (const [dom, lvl] of Object.entries(doms)) {
        if (lvl > 0) {
          rows.push({ student_id: sid, domain: dom, wida_level: lvl, updated_by: currentTeacher?.id, updated_at: new Date().toISOString() })
          historyRows.push({ student_id: sid, domain: dom, wida_level: lvl, recorded_by: currentTeacher?.id })
        }
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from('student_wida_levels').upsert(rows, { onConflict: 'student_id,domain' })
      if (error) { showToast(`Error: ${error.message}`); setSaving(false); return }
      // Record history snapshot (non-blocking)
      supabase.from('student_wida_history').insert(historyRows).then(() => {})
    }
    setSaving(false); setHasChanges(false)
    showToast(`Saved WIDA levels for ${students.length} students`)
  }

  const getOverall = (studentId: string): number | null => {
    const sl = levels[studentId]
    if (!sl) return null
    const vals = WIDA_DOMAINS.map(d => sl[d]).filter((v): v is number => v != null && v > 0)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }

  const [applyingScaffolds, setApplyingScaffolds] = useState(false)
  const autoApplyScaffolds = async () => {
    setApplyingScaffolds(true)
    let totalApplied = 0
    // For each student with WIDA levels, check if they have scaffolds already
    for (const s of students) {
      const sl = levels[s.id]
      if (!sl) continue
      const vals = WIDA_DOMAINS.map(d => sl[d]).filter((v): v is number => v != null && v > 0)
      if (vals.length === 0) continue
      const avgLevel = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)

      // Check if student already has scaffolds
      const { count } = await supabase.from('student_scaffolds').select('id', { count: 'exact', head: true }).eq('student_id', s.id).eq('is_active', true)
      if ((count || 0) > 0) continue // Skip students who already have scaffolds

      // Pick 3-4 default scaffolds for their level
      const { SCAFFOLD_BANK } = await import('./WIDAGuide')
      const matching = SCAFFOLD_BANK
        ? SCAFFOLD_BANK.filter((sc: any) => avgLevel >= sc.levelRange[0] && avgLevel <= sc.levelRange[1])
        : []
      // Pick one per domain if possible, then fill with general
      const picks: any[] = []
      const domains = ['listening', 'speaking', 'reading', 'writing', 'general']
      for (const dom of domains) {
        const domMatch = matching.filter((sc: any) => sc.domain === dom)
        if (domMatch.length > 0 && picks.length < 4) picks.push(domMatch[0])
      }
      if (picks.length > 0) {
        const rows = picks.map(p => ({
          student_id: s.id, domain: p.domain, scaffold_text: p.text,
          wida_level: p.levelRange[0], assigned_by: currentTeacher?.id,
        }))
        await supabase.from('student_scaffolds').insert(rows)
        totalApplied += picks.length
      }
    }
    setApplyingScaffolds(false)
    showToast(totalApplied > 0 ? `Applied ${totalApplied} scaffolds to students without existing scaffolds` : 'All students already have scaffolds assigned')
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
          <div className="flex gap-1">
            {(isAdmin ? ENGLISH_CLASSES : availableClasses).map(c => (
              <button key={c} onClick={() => setCls(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={cls === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade</label>
          <div className="flex gap-1">{GRADES.map(g => <button key={g} onClick={() => setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
        </div>
        {hasChanges && (
          <div className="ml-auto flex gap-2">
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save WIDA Levels
            </button>
          </div>
        )}
        {!hasChanges && students.length > 0 && (
          <div className="ml-auto">
            <button onClick={autoApplyScaffolds} disabled={applyingScaffolds}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:opacity-50">
              {applyingScaffolds ? <Loader2 size={13} className="animate-spin" /> : null} Auto-Apply Scaffolds
            </button>
          </div>
        )}
      </div>

      {/* WIDA Level definitions with scaffolding strategies */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        {WIDA_LEVELS.map(wl => (
          <div key={wl.level} className="px-3 py-2.5 rounded-lg border border-border" style={{ borderLeftWidth: 3, borderLeftColor: wl.color }}>
            <span className="text-[11px] font-bold text-navy">L{wl.level} {wl.name}</span>
            <p className="text-[10px] text-text-tertiary mt-0.5 leading-snug">{wl.desc}</p>
            <p className="text-[10px] text-blue-600 mt-1.5 leading-snug font-medium">Scaffolds: <span className="font-normal text-blue-500">{wl.scaffolds}</span></p>
          </div>
        ))}
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
       students.length === 0 ? <div className="py-12 text-center text-text-tertiary">No students found for {cls} Grade {gr}.</div> :
      <div className="bg-surface border border-border rounded-xl overflow-auto">
        <table className="w-full">
          <thead><tr className="bg-surface-alt border-b border-border">
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-8">#</th>
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold min-w-[180px]">Student</th>
            {WIDA_DOMAINS.map(d => (
              <th key={d} className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-28 capitalize">{d}</th>
            ))}
            <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-24">Overall</th>
          </tr></thead>
          <tbody>
            {students.map((s: any, i: number) => {
              const sl = levels[s.id] || {}
              const overall = getOverall(s.id)
              return (
                <tr key={s.id} className="border-t border-border hover:bg-surface-alt/50">
                  <td className="px-4 py-2.5 text-[11px] text-text-tertiary">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-[12px] font-medium">{s.english_name}</span>
                    <span className="text-[11px] text-text-tertiary ml-2">{s.korean_name}</span>
                  </td>
                  {WIDA_DOMAINS.map(dom => {
                    const lvl = sl[dom] || 0
                    const wl = WIDA_LEVELS.find(w => w.level === lvl)
                    return (
                      <td key={dom} className="px-3 py-2.5 text-center">
                        <button onClick={() => setLevel(s.id, dom, lvl >= 6 ? 0 : lvl + 1)}
                          className="w-full px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:shadow-sm"
                          style={wl ? { backgroundColor: wl.bg, borderColor: wl.color, color: '#1e293b' } : { borderColor: '#e2e8f0' }}>
                          {lvl > 0 ? `L${lvl} ${wl?.name || ''}` : '--'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center">
                    {overall != null ? <span className="text-[12px] font-bold text-navy">{overall.toFixed(1)}</span> : <span className="text-[11px] text-text-tertiary">--</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>}
    </div>
  )
}

// ─── CLUSTER-LEVEL STANDARDS TRACKER ────────────────────────────────
function ClusterTracker() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const [statuses, setStatuses] = useState<Record<string, StdStatus>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stdAverages, setStdAverages] = useState<Record<string, number>>({})
  const [showThresholdEdit, setShowThresholdEdit] = useState(false)

  // Default mastery thresholds per class tier
  const DEFAULT_THRESHOLDS: Record<string, { mastered: number; approaching: number }> = {
    Lily: { mastered: 70, approaching: 45 }, Camellia: { mastered: 70, approaching: 45 },
    Daisy: { mastered: 75, approaching: 50 }, Sunflower: { mastered: 75, approaching: 50 },
    Marigold: { mastered: 85, approaching: 60 }, Snapdragon: { mastered: 90, approaching: 65 },
  }
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)

  // Load saved thresholds from settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'mastery_thresholds').single()
      if (data?.value) {
        try { setThresholds(prev => ({ ...prev, ...JSON.parse(data.value) })) } catch {}
      }
    })()
  }, [])

  const saveThresholds = async () => {
    await supabase.from('app_settings').upsert({ key: 'mastery_thresholds', value: JSON.stringify(thresholds) }, { onConflict: 'key' })
    showToast('Mastery thresholds saved')
    setShowThresholdEdit(false)
  }

  const t = thresholds[cls] || { mastered: 80, approaching: 50 }

  const adj = getAdjustedGrade(gr, cls)
  const tier = ['Lily', 'Camellia'].includes(cls) ? '2 below' : ['Daisy', 'Sunflower'].includes(cls) ? '1 below' : 'On level'

  // All clusters across all domains for this adjusted grade
  const allClusters = useMemo(() => {
    return CCSS_DOMAINS.flatMap(d => getClusters(d.key, adj).map(c => ({ ...c, domain: d.key, domainLabel: d.label })))
  }, [adj])

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const { data } = await supabase.from('class_standard_status').select('*').eq('english_class', cls).eq('student_grade', gr)
      const m: Record<string, StdStatus> = {}
      if (data) data.forEach((r: any) => { m[r.standard_code] = r.status })
      setStatuses(m); setLoading(false)
    })()
  }, [cls, gr])

  // Cluster status = worst status of its children (all mastered -> mastered, any in_progress -> in_progress, else not_started)
  const getClusterStatus = (codes: string[]): StdStatus => {
    const st = codes.map(c => statuses[c] || 'not_started')
    if (st.every(s => s === 'mastered')) return 'mastered'
    if (st.some(s => s === 'mastered' || s === 'in_progress')) return 'in_progress'
    return 'not_started'
  }

  const cycleCluster = async (codes: string[]) => {
    const cur = getClusterStatus(codes)
    const nxt: StdStatus = cur === 'not_started' ? 'in_progress' : cur === 'in_progress' ? 'mastered' : 'not_started'
    const newStatuses = { ...statuses }
    codes.forEach(c => { newStatuses[c] = nxt })
    setStatuses(newStatuses)
    // Upsert all codes in the cluster
    const rows = codes.map(c => ({
      english_class: cls, student_grade: gr, standard_code: c, status: nxt,
      updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
    }))
    const { error } = await supabase.from('class_standard_status').upsert(rows, { onConflict: 'english_class,student_grade,standard_code' })
    if (error) showToast(`Error: ${error.message}`)
  }

  // Load class averages for standards from grades
  useEffect(() => {
    (async () => {
      const { data: sem } = await supabase.from('semesters').select('id').eq('is_active', true).single()
      if (!sem) return
      const { data: assessments } = await supabase.from('assessments').select('id, sections, standards, max_score')
        .eq('english_class', cls).eq('grade', gr).eq('semester_id', sem.id)
      if (!assessments || assessments.length === 0) return
      const aIds = assessments.map(a => a.id)
      const { data: grades } = await supabase.from('grades').select('assessment_id, score, section_scores')
        .in('assessment_id', aIds).not('score', 'is', null)
      if (!grades || grades.length === 0) return

      const avgs: Record<string, { total: number; count: number }> = {}
      assessments.forEach(a => {
        // Section-based standards
        if (a.sections) {
          a.sections.forEach((sec: any, si: number) => {
            if (!sec.standard) return
            grades.filter(g => g.assessment_id === a.id && g.section_scores?.[String(si)] != null).forEach(g => {
              const pct = sec.max_points > 0 ? (g.section_scores[String(si)] / sec.max_points) * 100 : 0
              if (!avgs[sec.standard]) avgs[sec.standard] = { total: 0, count: 0 }
              avgs[sec.standard].total += pct; avgs[sec.standard].count++
            })
          })
        }
        // Assessment-level standards
        if (a.standards?.length) {
          const aGrades = grades.filter(g => g.assessment_id === a.id)
          if (aGrades.length === 0) return
          const avg = aGrades.reduce((s: number, g: any) => s + ((g.score / a.max_score) * 100), 0) / aGrades.length
          a.standards.forEach((st: any) => {
            if (!avgs[st.code]) avgs[st.code] = { total: 0, count: 0 }
            avgs[st.code].total += avg; avgs[st.code].count++
          })
        }
      })
      const result: Record<string, number> = {}
      Object.entries(avgs).forEach(([code, { total, count }]) => { result[code] = Math.round(total / count * 10) / 10 })
      setStdAverages(result)
    })()
  }, [cls, gr])

  const total = allClusters.length
  const mastered = allClusters.filter(c => getClusterStatus(c.codes) === 'mastered').length
  const inProg = allClusters.filter(c => getClusterStatus(c.codes) === 'in_progress').length

  // Group clusters by domain
  const grouped = useMemo(() => {
    const m = new Map<string, typeof allClusters>()
    allClusters.forEach(c => {
      if (!m.has(c.domain)) m.set(c.domain, [])
      m.get(c.domain)!.push(c)
    })
    return Array.from(m.entries())
  }, [allClusters])

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
          <div className="flex gap-1">
            {ENGLISH_CLASSES.map(c => (
              <button key={c} onClick={() => setCls(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                style={cls === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Student Grade</label>
          <div className="flex gap-1">{GRADES.map(g => <button key={g} onClick={() => setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
        </div>
      </div>

      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-blue-500" />
          <p className="text-[12px] text-blue-700"><span className="font-semibold">{cls}</span> Grade {gr} → <span className="font-semibold">{gradeLabel(adj)} CCSS</span> ({tier})</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-green-600 font-semibold">{mastered} done</span>
          <span className="text-blue-600 font-semibold">{inProg} started</span>
          <span className="text-text-tertiary">{total - mastered - inProg} not started</span>
          <button onClick={async () => {
            // Auto-suggest from assessment section scores
            const { data: sem } = await supabase.from('semesters').select('id').eq('is_active', true).single()
            if (!sem) { showToast('No active semester'); return }
            const { data: assessments } = await supabase.from('assessments').select('id, sections, standards, english_class, grade, max_score')
              .eq('english_class', cls).eq('grade', gr).eq('semester_id', sem.id)
              .not('sections', 'is', null)
            if (!assessments || assessments.length === 0) {
              // Also check assessments with standards but no sections
              const { data: stdAssessments } = await supabase.from('assessments').select('id, standards, english_class, grade, max_score')
                .eq('english_class', cls).eq('grade', gr).eq('semester_id', sem.id)
              if (!stdAssessments || stdAssessments.length === 0) { showToast('No assessments with standards tagged'); return }
              const { data: grades } = await supabase.from('grades').select('assessment_id, score')
                .in('assessment_id', stdAssessments.map(a => a.id)).not('score', 'is', null)
              if (!grades || grades.length === 0) { showToast('No scores found'); return }
              const stdAvgs: Record<string, { total: number; count: number }> = {}
              stdAssessments.forEach(a => {
                const aGrades = grades.filter(g => g.assessment_id === a.id)
                if (aGrades.length === 0 || !a.standards?.length) return
                const avg = aGrades.reduce((s: number, g: any) => s + ((g.score / a.max_score) * 100), 0) / aGrades.length
                a.standards.forEach((st: any) => {
                  if (!stdAvgs[st.code]) stdAvgs[st.code] = { total: 0, count: 0 }
                  stdAvgs[st.code].total += avg; stdAvgs[st.code].count++
                })
              })
              let suggested = 0
              const newStatuses = { ...statuses }
              Object.entries(stdAvgs).forEach(([code, { total, count }]) => {
                const avg = total / count
                const current = statuses[code] || 'not_started'
                const suggest: StdStatus = avg >= t.mastered ? 'mastered' : avg >= t.approaching ? 'in_progress' : 'not_started'
                if (suggest !== current && (suggest === 'mastered' || (suggest === 'in_progress' && current === 'not_started'))) {
                  newStatuses[code] = suggest; suggested++
                }
              })
              if (suggested > 0) {
                setStatuses(newStatuses)
                const rows = Object.entries(newStatuses).filter(([c]) => stdAvgs[c]).map(([code, status]) => ({
                  english_class: cls, student_grade: gr, standard_code: code, status,
                  updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
                }))
                await supabase.from('class_standard_status').upsert(rows, { onConflict: 'english_class,student_grade,standard_code' })
                showToast(`Updated ${suggested} standard(s) from grade data`)
              } else { showToast('No changes suggested') }
              return
            }
            const aIds = assessments.map(a => a.id)
            const { data: grades } = await supabase.from('grades').select('assessment_id, section_scores, score')
              .in('assessment_id', aIds).not('score', 'is', null)
            if (!grades || grades.length === 0) { showToast('No scores found'); return }
            const stdAvgs: Record<string, { total: number; count: number }> = {}
            assessments.forEach(a => {
              if (!a.sections) return
              a.sections.forEach((sec: any, si: number) => {
                if (!sec.standard) return
                grades.filter(g => g.assessment_id === a.id && g.section_scores?.[String(si)] != null).forEach(g => {
                  const pct = sec.max_points > 0 ? (g.section_scores[String(si)] / sec.max_points) * 100 : 0
                  if (!stdAvgs[sec.standard]) stdAvgs[sec.standard] = { total: 0, count: 0 }
                  stdAvgs[sec.standard].total += pct; stdAvgs[sec.standard].count++
                })
              })
            })
            let suggested = 0
            const newStatuses = { ...statuses }
            Object.entries(stdAvgs).forEach(([code, { total, count }]) => {
              const avg = total / count
              const current = statuses[code] || 'not_started'
              const suggest: StdStatus = avg >= t.mastered ? 'mastered' : avg >= t.approaching ? 'in_progress' : 'not_started'
              if (suggest !== current && (suggest === 'mastered' || (suggest === 'in_progress' && current === 'not_started'))) {
                newStatuses[code] = suggest; suggested++
              }
            })
            if (suggested > 0) {
              setStatuses(newStatuses)
              const rows = Object.entries(newStatuses).filter(([c]) => stdAvgs[c]).map(([code, status]) => ({
                english_class: cls, student_grade: gr, standard_code: code, status,
                updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
              }))
              await supabase.from('class_standard_status').upsert(rows, { onConflict: 'english_class,student_grade,standard_code' })
              showToast(`Updated ${suggested} standard(s) from section scores`)
            } else { showToast('No changes suggested') }
          }} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-navy text-white hover:bg-navy-dark">
            Suggest from Grades
          </button>
          <button onClick={() => setShowThresholdEdit(!showThresholdEdit)} className="px-3 py-1 rounded-lg text-[10px] font-semibold bg-surface-alt text-text-secondary hover:bg-border" title="Edit mastery thresholds">
            ⚙ Thresholds
          </button>
        </div>
      </div>

      {/* Threshold Editor */}
      {showThresholdEdit && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <p className="text-[12px] font-semibold text-amber-800 mb-3">Mastery Thresholds by Class</p>
          <div className="grid grid-cols-3 gap-3">
            {ENGLISH_CLASSES.map(c => (
              <div key={c} className="flex items-center gap-2">
                <span className="text-[11px] font-semibold w-20" style={{ color: classToColor(c) }}>{c}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-amber-700">Mastered:</span>
                  <input type="number" min={0} max={100} value={thresholds[c]?.mastered ?? 80}
                    onChange={e => setThresholds(prev => ({ ...prev, [c]: { ...(prev[c] || { mastered: 80, approaching: 50 }), mastered: Number(e.target.value) } }))}
                    className="w-12 px-1 py-0.5 border border-amber-300 rounded text-[11px] text-center bg-white" />
                  <span className="text-[9px] text-amber-600">%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-amber-700">Approaching:</span>
                  <input type="number" min={0} max={100} value={thresholds[c]?.approaching ?? 50}
                    onChange={e => setThresholds(prev => ({ ...prev, [c]: { ...(prev[c] || { mastered: 80, approaching: 50 }), approaching: Number(e.target.value) } }))}
                    className="w-12 px-1 py-0.5 border border-amber-300 rounded text-[11px] text-center bg-white" />
                  <span className="text-[9px] text-amber-600">%</span>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowThresholdEdit(false)} className="px-3 py-1 rounded text-[11px] text-amber-700 hover:bg-amber-100">Cancel</button>
            <button onClick={saveThresholds} className="px-3 py-1 rounded text-[11px] bg-amber-600 text-white hover:bg-amber-700">Save Thresholds</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <p className="text-[11px] text-text-tertiary">Click status icon to cycle clusters. Expand to see individual standards.</p>
        <span className="text-[9px] text-text-tertiary ml-auto">Mastered ≥{t.mastered}% | Approaching ≥{t.approaching}%</span>
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
      <div className="space-y-6">
        {grouped.map(([domKey, clusters]) => {
          const domInfo = CCSS_DOMAINS.find(d => d.key === domKey)
          return (
            <div key={domKey}>
              <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider mb-2">{domInfo?.label || domKey}</h3>
              <div className="space-y-1">
                {clusters.map(cluster => {
                  const st = getClusterStatus(cluster.codes)
                  const cfg = STATUS_CFG[st]
                  const Icon = cfg.icon
                  const isExp = expanded === `${domKey}::${cluster.name}`
                  return (
                    <div key={`${domKey}::${cluster.name}`} className="bg-surface border border-border rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => cycleCluster(cluster.codes)} className="flex-shrink-0" title={`${cfg.label} - click to change`}>
                          <Icon size={20} className={cfg.color} fill={st === 'mastered' ? '#22c55e' : st === 'in_progress' ? '#3b82f6' : 'none'} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] font-semibold text-navy">{cluster.name}</span>
                          <span className={`ml-2 text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                          <span className="text-[10px] text-text-tertiary ml-2">{cluster.codes.length} standard{cluster.codes.length !== 1 ? 's' : ''}</span>
                        </div>
                        <button onClick={() => setExpanded(isExp ? null : `${domKey}::${cluster.name}`)} className="p-1 rounded-lg text-text-tertiary hover:text-navy hover:bg-surface-alt">
                          {isExp ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                      </div>
                      {isExp && (
                        <div className="border-t border-border bg-surface-alt/30 px-4 py-2 space-y-1">
                          {cluster.standards.map(std => {
                            const ss = statuses[std.code] || 'not_started'
                            const sc = STATUS_CFG[ss]
                            const SI = sc.icon
                            return (
                              <div key={std.code} className="flex items-start gap-2.5 py-1.5">
                                <button onClick={async () => {
                                  const nx: StdStatus = ss === 'not_started' ? 'in_progress' : ss === 'in_progress' ? 'mastered' : 'not_started'
                                  setStatuses(p => ({ ...p, [std.code]: nx }))
                                  await supabase.from('class_standard_status').upsert({
                                    english_class: cls, student_grade: gr, standard_code: std.code, status: nx,
                                    updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
                                  }, { onConflict: 'english_class,student_grade,standard_code' })
                                }} className="mt-0.5 flex-shrink-0">
                                  <SI size={16} className={sc.color} fill={ss === 'mastered' ? '#22c55e' : ss === 'in_progress' ? '#3b82f6' : 'none'} />
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-bold text-text-secondary">{std.code}</span>
                                    {stdAverages[std.code] != null && (
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${stdAverages[std.code] >= t.mastered ? 'bg-green-100 text-green-700' : stdAverages[std.code] >= t.approaching ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                        avg {Math.round(stdAverages[std.code])}%
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-text-primary leading-snug">{std.text}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>}
    </div>
  )
}
