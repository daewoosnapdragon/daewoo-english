'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { BookOpen, Users2, Loader2, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, Info, Save, Globe2, Zap } from 'lucide-react'
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
type InterventionStatus = 'none' | 'not_yet_taught' | 'taught_needs_reteach' | 'reteaching' | 'reassessing'
const STATUS_CFG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  mastered: { label: 'Mastered', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
}
const INTERVENTION_OPTIONS: { value: InterventionStatus; label: string; color: string }[] = [
  { value: 'none', label: '--', color: '' },
  { value: 'not_yet_taught', label: 'Not yet taught', color: 'text-gray-500 bg-gray-100' },
  { value: 'taught_needs_reteach', label: 'Needs reteach', color: 'text-red-700 bg-red-100' },
  { value: 'reteaching', label: 'Reteaching', color: 'text-amber-700 bg-amber-100' },
  { value: 'reassessing', label: 'Reassessing', color: 'text-blue-700 bg-blue-100' },
]

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
  const [view, setView] = useState<'standards' | 'guide' | 'quickcheck'>('standards')

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">{language === 'ko' ? '표준' : 'Standards'}</h2>
        <p className="text-[13px] text-text-secondary mt-1">CCSS standards tracking, quick checks, and WIDA/CCSS reference guide</p>
        <div className="flex gap-1 mt-4">
          {([['standards', 'Standards Checklist', BookOpen], ['quickcheck', 'Quick Check', Zap], ['guide', 'WIDA/CCSS Guide', Globe2]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${view === id ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-6">
        {view === 'standards' && <ClusterTracker />}
        {view === 'quickcheck' && <QuickCheckTool />}
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
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [viewingSnapshot, setViewingSnapshot] = useState<string | null>(null)
  const [snapshotData, setSnapshotData] = useState<Record<string, Record<string, number>> | null>(null)

  // Warn on page leave with unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (hasChanges) { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasChanges])

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

  // Load available snapshots
  useEffect(() => {
    ;(async () => {
      const { data } = await supabase.from('wida_snapshots').select('id, label, english_class, student_grade, created_at')
        .eq('english_class', cls).eq('student_grade', gr).order('created_at', { ascending: false })
      setSnapshots(data || [])
    })()
  }, [cls, gr])

  const saveSnapshot = async () => {
    const label = prompt('Snapshot label (e.g. "Midterm Spring 2026"):')
    if (!label) return
    const { error } = await supabase.from('wida_snapshots').insert({
      english_class: cls, student_grade: gr, label,
      snapshot_data: JSON.stringify(levels), created_by: currentTeacher?.id,
    })
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast('WIDA snapshot saved')
    const { data } = await supabase.from('wida_snapshots').select('id, label, english_class, student_grade, created_at')
      .eq('english_class', cls).eq('student_grade', gr).order('created_at', { ascending: false })
    setSnapshots(data || [])
  }

  const loadSnapshot = async (id: string) => {
    if (viewingSnapshot === id) { setViewingSnapshot(null); setSnapshotData(null); return }
    const { data } = await supabase.from('wida_snapshots').select('snapshot_data').eq('id', id).single()
    if (data?.snapshot_data) {
      try { setSnapshotData(JSON.parse(data.snapshot_data)); setViewingSnapshot(id) } catch { showToast('Invalid snapshot data') }
    }
  }

  const printOnePager = () => {
    const win = window.open('', '_blank')
    if (!win) return
    const rows = students.map((s: any, i: number) => {
      const sl = levels[s.id] || {}
      const overall = getOverall(s.id)
      const cells = WIDA_DOMAINS.map(d => {
        const lvl = sl[d] || 0
        const wl = WIDA_LEVELS.find(w => w.level === lvl)
        const bg = wl ? wl.bg : '#f8fafc'
        return `<td style="text-align:center;padding:6px;background:${bg};font-weight:600;font-size:11px">${lvl > 0 ? `L${lvl}` : '--'}</td>`
      }).join('')
      return `<tr><td style="padding:6px;font-size:11px">${i + 1}</td><td style="padding:6px;font-size:11px;font-weight:500">${s.english_name}</td>${cells}<td style="text-align:center;padding:6px;font-weight:700;font-size:12px;color:#1e3a5f">${overall?.toFixed(1) || '--'}</td></tr>`
    }).join('')
    win.document.write(`<!DOCTYPE html><html><head><title>WIDA Profiles - ${cls} Grade ${gr}</title><style>
      body { font-family: -apple-system, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
      h1 { font-size: 18px; color: #1e3a5f; margin-bottom: 4px; } .meta { color: #64748b; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; margin-top: 12px; } th { background: #f1f5f9; padding: 8px; font-size: 9px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
      td { border-bottom: 1px solid #f1f5f9; } @media print { body { padding: 10px; } } @page { size: A4 landscape; margin: 15mm; }
    </style></head><body><h1>WIDA Profiles: ${cls} -- Grade ${gr}</h1><p class="meta">Printed ${new Date().toLocaleDateString()} | ${students.length} students</p>
    <table><thead><tr><th>#</th><th style="text-align:left">Student</th>${WIDA_DOMAINS.map(d => `<th>${d.charAt(0).toUpperCase() + d.slice(1)}</th>`).join('')}<th>Overall</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    win.document.close(); win.print()
  }

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
        {!hasChanges && (
          <div className="ml-auto flex gap-2">
            <button onClick={printOnePager} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium text-text-secondary hover:bg-surface-alt border border-border">
              Print One-Pager
            </button>
            <button onClick={saveSnapshot} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-navy text-white hover:bg-navy-dark">
              Save Snapshot
            </button>
          </div>
        )}
      </div>

      {/* Snapshots */}
      {snapshots.length > 0 && (
        <div className="mb-4 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold">Snapshots:</span>
          {snapshots.map(snap => (
            <button key={snap.id} onClick={() => loadSnapshot(snap.id)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${viewingSnapshot === snap.id ? 'bg-navy text-white border-navy' : 'bg-surface-alt text-text-secondary border-border hover:border-navy'}`}>
              {snap.label} ({new Date(snap.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
            </button>
          ))}
          {viewingSnapshot && <button onClick={() => { setViewingSnapshot(null); setSnapshotData(null) }} className="text-[10px] text-red-500 hover:text-red-700 font-medium">Clear comparison</button>}
        </div>
      )}

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
                    const snapLvl = snapshotData?.[s.id]?.[dom] || 0
                    const diff = viewingSnapshot && snapLvl > 0 ? lvl - snapLvl : null
                    return (
                      <td key={dom} className="px-3 py-2.5 text-center">
                        <button onClick={() => setLevel(s.id, dom, lvl >= 6 ? 0 : lvl + 1)}
                          className="w-full px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:shadow-sm"
                          style={wl ? { backgroundColor: wl.bg, borderColor: wl.color, color: '#1e293b' } : { borderColor: '#e2e8f0' }}>
                          {lvl > 0 ? `L${lvl} ${wl?.name || ''}` : '--'}
                        </button>
                        {diff != null && diff !== 0 && (
                          <span className={`text-[9px] font-bold block mt-0.5 ${diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        )}
                        {diff === 0 && viewingSnapshot && snapLvl > 0 && (
                          <span className="text-[9px] text-text-tertiary block mt-0.5">=</span>
                        )}
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
// ─── Quick Check Tool ────────────────────────────────────────────────
// Lightweight formative pulse-check: got it / almost / not yet per student per standard
type QuickCheckMark = 'got_it' | 'almost' | 'not_yet'
const QC_OPTIONS: { value: QuickCheckMark; label: string; emoji: string; color: string; bg: string }[] = [
  { value: 'got_it', label: 'Got It', emoji: '\u2713', color: 'text-green-700', bg: 'bg-green-100 border-green-300 hover:bg-green-200' },
  { value: 'almost', label: 'Almost', emoji: '~', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300 hover:bg-amber-200' },
  { value: 'not_yet', label: 'Not Yet', emoji: '\u2717', color: 'text-red-700', bg: 'bg-red-100 border-red-300 hover:bg-red-200' },
]

function QuickCheckTool() {
  const { currentTeacher, showToast } = useApp()
  const isTeacher = currentTeacher?.role === 'teacher'
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const { students } = useStudents({ grade: gr, english_class: cls })
  const [selectedStd, setSelectedStd] = useState<string | null>(null)
  const [marks, setMarks] = useState<Record<string, QuickCheckMark>>({})
  const [saving, setSaving] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  const adj = getAdjustedGrade(gr, cls)
  const allStandards = useMemo(() => CCSS_DOMAINS.flatMap(d => getClusters(d.key, adj).flatMap(c => c.standards)), [adj])

  // Load history for selected standard
  useEffect(() => {
    if (!selectedStd) return
    ;(async () => {
      const { data } = await supabase.from('quick_checks').select('*').eq('standard_code', selectedStd).eq('english_class', cls).eq('student_grade', gr).order('created_at', { ascending: false }).limit(20)
      setHistory(data || [])
    })()
  }, [selectedStd, cls, gr])

  const saveQuickCheck = async () => {
    if (!selectedStd || Object.keys(marks).length === 0) return
    setSaving(true)
    const rows = Object.entries(marks).map(([studentId, mark]) => ({
      student_id: studentId,
      standard_code: selectedStd,
      english_class: cls,
      student_grade: gr,
      mark,
      created_by: currentTeacher?.id,
    }))
    const { error } = await supabase.from('quick_checks').insert(rows)
    if (error) { showToast(`Error: ${error.message}`); setSaving(false); return }
    showToast(`Quick check saved for ${Object.keys(marks).length} students`)
    setMarks({})
    setSaving(false)
    // Reload history
    const { data } = await supabase.from('quick_checks').select('*').eq('standard_code', selectedStd).eq('english_class', cls).eq('student_grade', gr).order('created_at', { ascending: false }).limit(20)
    setHistory(data || [])
  }

  return (
    <div>
      {/* Header: class + grade selectors */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1">
          {ENGLISH_CLASSES.map(c => (
            <button key={c} onClick={() => setCls(c)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${cls === c ? 'text-white shadow-sm' : 'hover:opacity-80'}`}
              style={{ backgroundColor: cls === c ? classToTextColor(c) : classToColor(c), color: cls === c ? 'white' : classToTextColor(c) }}>{c}</button>
          ))}
        </div>
        <div className="flex gap-1">
          {GRADES.map(g => (
            <button key={g} onClick={() => setGr(g)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'}`}>G{g}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        {/* Standard selector (left) */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
            <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Select a Standard</p>
          </div>
          <div className="max-h-[500px] overflow-y-auto divide-y divide-border">
            {allStandards.map(std => (
              <button key={std.code} onClick={() => { setSelectedStd(std.code); setMarks({}) }}
                className={`w-full text-left px-4 py-2.5 hover:bg-surface-alt/50 transition-colors ${selectedStd === std.code ? 'bg-navy/5 border-l-2 border-navy' : ''}`}>
                <span className="text-[11px] font-bold text-navy">{std.code}</span>
                <p className="text-[10px] text-text-secondary leading-snug truncate">{std.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Student marking grid (center) */}
        <div className="col-span-2">
          {!selectedStd ? (
            <div className="bg-surface border border-border rounded-xl p-12 text-center">
              <Zap size={24} className="mx-auto text-text-tertiary mb-2" />
              <p className="text-[13px] text-text-tertiary">Select a standard to begin a quick check.</p>
              <p className="text-[11px] text-text-tertiary mt-1">3 taps per student, ~90 seconds for 16 students.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="px-5 py-3 bg-navy/5 border-b border-border flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-navy">{selectedStd}</p>
                    <p className="text-[11px] text-text-secondary">{allStandards.find(s => s.code === selectedStd)?.text}</p>
                  </div>
                  <button onClick={saveQuickCheck} disabled={saving || Object.keys(marks).length === 0}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-[11px] font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-40">
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save ({Object.keys(marks).length})
                  </button>
                </div>
                <div className="p-3 grid grid-cols-2 gap-2">
                  {students.map(s => {
                    const m = marks[s.id]
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-surface-alt/30 rounded-lg px-3 py-2">
                        <span className="text-[12px] font-medium text-navy flex-1 truncate">{s.english_name}</span>
                        <div className="flex gap-1">
                          {QC_OPTIONS.map(opt => (
                            <button key={opt.value} onClick={() => setMarks(p => ({ ...p, [s.id]: opt.value }))}
                              className={`w-8 h-8 rounded-lg border text-[13px] font-bold transition-all ${m === opt.value ? `${opt.bg} ${opt.color} border-2` : 'bg-surface border-border text-text-tertiary hover:bg-surface-alt'}`}
                              title={opt.label}>
                              {opt.emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-4 py-2 border-t border-border bg-amber-50/40 text-[10px] text-amber-700">
                  <Info size={10} className="inline mr-1" />Quick checks are formative evidence only -- they do NOT affect grades or the gradebook.
                </div>
              </div>

              {/* History for this standard */}
              {history.length > 0 && (
                <div className="bg-surface border border-border rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
                    <p className="text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Recent Quick Checks for {selectedStd}</p>
                  </div>
                  <div className="px-4 py-3 max-h-[180px] overflow-y-auto">
                    {(() => {
                      // Group by date
                      const byDate: Record<string, Record<string, number>> = {}
                      history.forEach((h: any) => {
                        const d = new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        if (!byDate[d]) byDate[d] = { got_it: 0, almost: 0, not_yet: 0 }
                        byDate[d][h.mark as string] = (byDate[d][h.mark as string] || 0) + 1
                      })
                      return Object.entries(byDate).map(([date, counts]) => (
                        <div key={date} className="flex items-center gap-3 py-1.5">
                          <span className="text-[11px] text-text-tertiary w-16">{date}</span>
                          <span className="text-[10px] text-green-600 font-medium">{counts.got_it || 0} got it</span>
                          <span className="text-[10px] text-amber-600 font-medium">{counts.almost || 0} almost</span>
                          <span className="text-[10px] text-red-600 font-medium">{counts.not_yet || 0} not yet</span>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ClusterTracker() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const [statuses, setStatuses] = useState<Record<string, StdStatus>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [stdAverages, setStdAverages] = useState<Record<string, number>>({})
  const [interventions, setInterventions] = useState<Record<string, InterventionStatus>>({})
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
      const iv: Record<string, InterventionStatus> = {}
      if (data) data.forEach((r: any) => { m[r.standard_code] = r.status; if (r.intervention_status) iv[r.standard_code] = r.intervention_status })
      setStatuses(m); setInterventions(iv); setLoading(false)
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

  // Auto-apply mastery suggestions when grade data loads
  const [autoSuggested, setAutoSuggested] = useState(false)
  useEffect(() => {
    if (loading || autoSuggested || Object.keys(stdAverages).length === 0) return
    const th = thresholds[cls] || { mastered: 80, approaching: 50 }
    const newStatuses = { ...statuses }
    let changed = 0
    Object.entries(stdAverages).forEach(([code, avg]) => {
      const current = statuses[code] || 'not_started'
      const suggest: StdStatus = avg >= th.mastered ? 'mastered' : avg >= th.approaching ? 'in_progress' : 'not_started'
      if (suggest !== current) { newStatuses[code] = suggest; changed++ }
    })
    if (changed > 0) {
      setStatuses(newStatuses)
      // Persist silently in background
      const rows = Object.entries(newStatuses)
        .filter(([c]) => stdAverages[c] != null)
        .map(([code, status]) => ({
          english_class: cls, student_grade: gr, standard_code: code, status,
          updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
        }))
      supabase.from('class_standard_status').upsert(rows, { onConflict: 'english_class,student_grade,standard_code' })
    }
    setAutoSuggested(true)
  }, [loading, stdAverages, autoSuggested])

  // Reset auto-suggest flag when class/grade changes
  useEffect(() => { setAutoSuggested(false) }, [cls, gr])

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
                if (suggest !== current) {
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
              if (suggest !== current) {
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
                                      {/* Intervention status for low-mastery standards */}
                                      {ss !== 'mastered' && (
                                        <select
                                          value={interventions[std.code] || 'none'}
                                          onChange={async (e) => {
                                            const val = e.target.value as InterventionStatus
                                            setInterventions(p => ({ ...p, [std.code]: val }))
                                            await supabase.from('class_standard_status').upsert({
                                              english_class: cls, student_grade: gr, standard_code: std.code,
                                              status: ss, intervention_status: val === 'none' ? null : val,
                                              updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
                                            }, { onConflict: 'english_class,student_grade,standard_code' })
                                          }}
                                          className={`text-[9px] font-medium px-1.5 py-0.5 rounded border-0 outline-none cursor-pointer ${
                                            INTERVENTION_OPTIONS.find(o => o.value === (interventions[std.code] || 'none'))?.color || 'text-gray-400 bg-transparent'
                                          }`}
                                        >
                                          {INTERVENTION_OPTIONS.map(o => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                          ))}
                                        </select>
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
