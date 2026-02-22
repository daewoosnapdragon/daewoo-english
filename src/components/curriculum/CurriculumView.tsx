'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { BookOpen, Users2, Loader2, Info, Save, Globe2, Zap } from 'lucide-react'
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

type StdStatus = 'below' | 'approaching' | 'on' | 'above'
type InterventionStatus = 'none' | 'not_yet_taught' | 'taught_needs_reteach' | 'reteaching' | 'reassessing'
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
  const [guidanceExpanded, setGuidanceExpanded] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('daewoo_wida_guidance_dismissed') !== 'true'
  })

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

  // Load available snapshots (gracefully handle missing table)
  useEffect(() => {
    ;(async () => {
      try {
        const { data, error } = await supabase.from('wida_snapshots').select('id, label, english_class, student_grade, created_at')
          .eq('english_class', cls).eq('student_grade', gr).order('created_at', { ascending: false })
        if (!error) setSnapshots(data || [])
      } catch { /* table may not exist yet */ }
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

  const [widaView, setWidaView] = useState<'edit' | 'timeline'>('edit')
  const [historyData, setHistoryData] = useState<any[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Load history when timeline tab is selected
  useEffect(() => {
    if (widaView !== 'timeline' || students.length === 0) return
    setHistoryLoading(true)
    ;(async () => {
      try {
        const { data } = await supabase.from('student_wida_history').select('student_id, domain, wida_level, recorded_at')
          .in('student_id', students.map(s => s.id)).order('recorded_at', { ascending: true })
        setHistoryData(data || [])
      } catch { setHistoryData([]) }
      setHistoryLoading(false)
    })()
  }, [widaView, students])

  return (
    <div>
      {/* Understanding & Using WIDA Profiles - guidance panel */}
      <div className="mb-5">
        <button onClick={() => {
          const next = !guidanceExpanded
          setGuidanceExpanded(next)
          if (!next) localStorage.setItem('daewoo_wida_guidance_dismissed', 'true')
          else localStorage.removeItem('daewoo_wida_guidance_dismissed')
        }} className="flex items-center gap-2 text-[12px] font-semibold text-navy hover:text-navy-dark mb-2">
          <Info size={14} />
          <span>Understanding &amp; Using WIDA Profiles</span>
          <span className="text-[10px] text-text-tertiary font-normal ml-1">{guidanceExpanded ? '▾ collapse' : '▸ expand'}</span>
        </button>
        {guidanceExpanded && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 space-y-3 text-[11px] text-blue-900 leading-relaxed">
            <div>
              <p className="font-bold text-[12px] text-blue-800 mb-1">What WIDA levels mean</p>
              <p>These are not grades. They describe where a student is in their English language development journey. Every student progresses through these levels — no level is &ldquo;bad.&rdquo; A Level 2 student working hard is exactly where they should be.</p>
            </div>
            <div>
              <p className="font-bold text-[12px] text-blue-800 mb-1">How to set levels</p>
              <p>Rate each student on 4 domains (listening, speaking, reading, writing) based on classroom observation, not testing. Ask yourself: &ldquo;How does this student perform in English during regular class?&rdquo; Use the level descriptions below as your guide. When in doubt, go with the lower level — it&apos;s better to over-scaffold than under-scaffold.</p>
            </div>
            <div>
              <p className="font-bold text-[12px] text-blue-800 mb-1">How to use scaffolds</p>
              <p>The scaffolding strategies listed for each level are starting points. If a student is Level 2 in writing but Level 4 in speaking, scaffold their writing tasks (sentence starters, word banks) while letting them participate freely in discussion. Don&apos;t apply one level uniformly across all domains.</p>
            </div>
            <div>
              <p className="font-bold text-[12px] text-blue-800 mb-1">How often to update</p>
              <p>Review WIDA levels every 4–6 weeks or after a major assessment cycle. Students can jump levels quickly, especially at lower levels. If a Level 2 student starts producing full sentences independently, bump them to Level 3.</p>
            </div>
            <div>
              <p className="font-bold text-[12px] text-blue-800 mb-1">How this connects to other features</p>
              <p>WIDA levels appear on student hover cards throughout the app. They&apos;re factored into report card comment auto-drafts, inform group placement suggestions, and show up in leveling test results.</p>
            </div>
            <button onClick={() => { setGuidanceExpanded(false); localStorage.setItem('daewoo_wida_guidance_dismissed', 'true') }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-medium bg-blue-600 text-white hover:bg-blue-700 mt-1">
              Got it
            </button>
          </div>
        )}
      </div>

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

      {/* View tabs */}
      <div className="flex gap-1 mb-5">
        <button onClick={() => setWidaView('edit')} className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${widaView === 'edit' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
          Edit Levels
        </button>
        <button onClick={() => setWidaView('timeline')} className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${widaView === 'timeline' ? 'bg-navy text-white' : 'text-text-secondary hover:bg-surface-alt'}`}>
          Class Timeline
        </button>
      </div>

      {widaView === 'timeline' ? (
        <WIDATimeline students={students} historyData={historyData} currentLevels={levels} loading={historyLoading} cls={cls} gr={gr} />
      ) : (
      <>

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
      </>
      )}
    </div>
  )
}

// ─── WIDA Timeline Grid View ──────────────────────────────────────
function WIDATimeline({ students, historyData, currentLevels, loading, cls, gr }: {
  students: any[]; historyData: any[]; currentLevels: Record<string, Record<string, number>>; loading: boolean; cls: string; gr: number
}) {
  if (loading) return <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  // Group history by month
  const months = new Set<string>()
  const byStudentMonth: Record<string, Record<string, Record<string, number>>> = {} // sid -> month -> { domain: level }
  historyData.forEach(h => {
    const month = h.recorded_at.slice(0, 7)
    months.add(month)
    if (!byStudentMonth[h.student_id]) byStudentMonth[h.student_id] = {}
    if (!byStudentMonth[h.student_id][month]) byStudentMonth[h.student_id][month] = {}
    byStudentMonth[h.student_id][month][h.domain] = h.wida_level
  })
  const sortedMonths = Array.from(months).sort()
  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Also add "Current" as the last column
  const allColumns = [...sortedMonths, 'current']

  const getOverall = (levels: Record<string, number> | undefined) => {
    if (!levels) return null
    const vals = Object.values(levels).filter(v => v > 0)
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  if (sortedMonths.length === 0 && students.length > 0) {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center">
        <p className="text-text-secondary text-[13px] mb-2">No WIDA history data yet for this class.</p>
        <p className="text-text-tertiary text-[11px]">History is recorded each time you save WIDA levels. Save levels now to start tracking changes over time.</p>
      </div>
    )
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-surface-alt border-b border-border">
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[160px]">Student</th>
            {allColumns.map(col => {
              if (col === 'current') return <th key="current" className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-navy font-bold w-20">Current</th>
              const [y, m] = col.split('-')
              return <th key={col} className="text-center px-3 py-3 text-[10px] text-text-secondary font-semibold w-16">{MONTH_NAMES[parseInt(m)]} {y.slice(2)}</th>
            })}
            <th className="text-center px-3 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-20">Change</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s: any) => {
            const firstMonthLevels = sortedMonths.length > 0 ? byStudentMonth[s.id]?.[sortedMonths[0]] : null
            const firstOverall = getOverall(firstMonthLevels)
            const currentOverall = getOverall(currentLevels[s.id])
            const change = firstOverall && currentOverall ? currentOverall - firstOverall : null

            return (
              <tr key={s.id} className="border-t border-border hover:bg-surface-alt/50">
                <td className="px-4 py-2 sticky left-0 bg-surface">
                  <span className="text-[11px] font-medium">{s.english_name}</span>
                  <span className="text-[10px] text-text-tertiary ml-1.5">{s.korean_name}</span>
                </td>
                {allColumns.map(col => {
                  const levels = col === 'current' ? currentLevels[s.id] : byStudentMonth[s.id]?.[col]
                  const overall = getOverall(levels)
                  if (!overall) return <td key={col} className="text-center px-3 py-2 text-[10px] text-text-tertiary">--</td>
                  const bg = overall <= 1.5 ? '#fef2f2' : overall <= 2.5 ? '#fffbeb' : overall <= 3.5 ? '#f0fdf4' : overall <= 4.5 ? '#eff6ff' : '#f5f3ff'
                  const color = overall <= 1.5 ? '#dc2626' : overall <= 2.5 ? '#d97706' : overall <= 3.5 ? '#16a34a' : overall <= 4.5 ? '#2563eb' : '#7c3aed'
                  return (
                    <td key={col} className="text-center px-3 py-2">
                      <span className="inline-block px-2 py-1 rounded text-[11px] font-bold" style={{ backgroundColor: bg, color }}
                        title={levels ? WIDA_DOMAINS.map(d => `${d}: L${levels[d] || '?'}`).join(', ') : ''}>
                        {overall.toFixed(1)}
                      </span>
                    </td>
                  )
                })}
                <td className="text-center px-3 py-2">
                  {change != null ? (
                    <span className={`text-[11px] font-bold ${change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-text-tertiary'}`}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)}
                    </span>
                  ) : <span className="text-[10px] text-text-tertiary">--</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-border text-[10px] text-text-tertiary">
        Hover over a score to see domain breakdown. Colors indicate overall proficiency level. Timeline shows the overall average (L/S/R/W) at each snapshot date.
      </div>
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

// #28: Teaching tips for common CCSS standards
// #28: Teaching tips — evidence-based, ELL-specific, grade-aware
function getTeachingTip(code: string): string | null {
  const tips: Record<string, string> = {
    'RL.K.1': 'Read aloud daily, pause to ask who/what questions with picture support. Accept pointing or single-word answers. Model: I do, We do, You do.',
    'RL.1.1': 'Teach students to put their finger on the answer before responding. Use the frame: "The text says ___." Practice with predictable books where answers are explicit.',
    'RL.1.2': 'Three-box story maps (beginning/middle/end) with pictures. Students draw first, retell orally, then write. Keep retellings to 3 sentences max.',
    'RL.1.3': 'Create a feelings chart with faces. After reading, ask: "How does [character] feel? Why?" Frame: "[Character] feels ___ because ___."',
    'RL.2.1': 'Teach "right there" (answer in one sentence) vs. "think about it" questions. Model underlining evidence with a document camera. For ELLs: pre-teach key vocabulary before reading.',
    'RL.2.2': 'After fables, students identify the lesson: "This story teaches us ___." Keep a class chart of morals from different stories to compare across texts.',
    'RL.2.3': 'Problem-solution graphic organizer. Ask: "What is the problem? What does [character] do? Does it work?" For lower levels, give events on cards to sequence.',
    'RL.3.1': 'Two-column notes: Evidence (text says) and Inference (I think). Model with think-alouds. For ELLs: "The text says ___, so I think ___ because ___."',
    'RL.3.2': 'Topic vs. theme: topic is one word (friendship), theme is a sentence (true friends help even when it is hard). Practice distinguishing the two with familiar stories.',
    'RL.3.3': 'Character change map: beginning, middle, end. Track what the character wants, what happens, how they respond. Compare characters across two texts.',
    'RL.4.1': 'Require page citations: "On page ___, it says ___." For inference: "The text says ___, so I think ___." Build evidence-based argument skills.',
    'RL.4.2': 'Theme identification across multiple texts. Students compare: "Both stories teach us that ___." Use theme vocabulary: courage, perseverance, kindness.',
    'RL.5.1': 'Quote sandwich: introduce the quote, provide it with page number, explain its significance. Students practice with short passages before applying to longer texts.',
    'RF.K.1': 'Shared reading with big books. Point to each word (concept of word). Teach left-to-right tracking through daily morning messages on chart paper.',
    'RF.K.2': 'Heggerty phonemic awareness routine (5 min/day). Clap syllables in student names. For Korean speakers: focus on final consonant sounds not present in Korean.',
    'RF.K.3': 'One letter-sound per week, multisensory: see, say, trace, write in sand. Use Orton-Gillingham keyword cards. For Korean speakers: /f/, /v/, /th/ need explicit teaching.',
    'RF.1.2': 'Daily Elkonin box work (3 min). Push one counter per sound. Korean speakers need extra practice with /r/ vs /l/, /f/ vs /p/, and /v/ vs /b/ contrasts.',
    'RF.1.3': 'Decodable readers matched to taught patterns. Sequence: CVC, blends, digraphs, CVCe. For Korean speakers: teach th, sh, ch as single sounds explicitly.',
    'RF.2.3': 'Vowel team sorting (ai/ay, ee/ea, oa/ow). Self-check: "Does it look right AND sound right?" For Korean speakers: short vs. long vowel distinction needs explicit work.',
    'RF.3.3': 'Prefix/suffix instruction (un-, re-, pre-, -ful, -less, -tion). Word-building with root + affix cards. Students predict meaning, then verify in context.',
    'RF.3.4': 'Repeated reading of same passage 3x builds fluency. Partner reading: "Read it like you are talking to a friend." Track CWPM weekly with 1-minute reads.',
    'RF.4.3': 'Greek/Latin roots (tele-, micro-, -graph, -port). Class roots wall where students add new words as they encounter them. This unlocks hundreds of academic words.',
    'W.K.3': 'Draw, tell a friend, write the words. Accept invented spelling at this stage. The goal is getting ideas on paper, not correct spelling.',
    'W.1.3': 'Temporal words wall (first, then, next, finally). 4-box storyboards. For ELLs: draw + label before writing full sentences. Bilingual planning allowed.',
    'W.2.1': 'Simplified OREO: I think ___. One reason is ___. Another reason is ___. That is why ___. Provide opinion word banks (believe, feel, prefer, best).',
    'W.2.3': 'Five senses descriptive writing. Create sensory detail chart for a shared class experience. For ELLs: adjective word banks organized by sense.',
    'W.3.1': 'OREO with mentor texts. Identify opinion structures in read-alouds before students write. Model: "The author thinks ___ because ___."',
    'W.3.2': 'Informative: topic sentence + 3 facts + closing. "Expert Books" where students write about something they know. For ELLs: allow bilingual research notes.',
    'W.4.1': 'Address counter-arguments: "Some people think ___, but I disagree because ___." Hold a class debate before writing so students hear opposing views.',
    'SL.K.1': 'Talking sticks or turn-taking tokens. Practice in groups of 3 before whole class. Teach: eyes on the speaker, wait for your turn, respond to what was said.',
    'SL.1.1': 'Discussion frames: "I agree because ___." "I have a different idea: ___." Pairs first, then share with class. Allow 10 seconds of think time for ELLs.',
    'SL.2.1': 'After read-alouds, partner retelling with "First... Then... Finally..." frames. Picture cards for sequencing support. Accept shortened retellings from lower-level ELLs.',
    'SL.3.1': 'Accountable Talk moves posted on class chart: "Can you say more?" "I agree/disagree because ___." "Can you give an example?" Practice one move per week.',
    'SL.3.4': 'Expert Presentation: 3 facts on index cards, present to a small group. For ELLs: note cards allowed, practice with partner first. Focus on volume and eye contact.',
    'SL.4.1': 'Structured protocols: Think-Pair-Share, Numbered Heads, Inside-Outside Circle. Assign discussion roles (questioner, summarizer, connector).',
    'L.K.1': 'Morning message to model capitals and punctuation. Students "fix" daily sentences on whiteboards. One grammar skill per week maximum at this level.',
    'L.1.1': 'Mentor sentences from read-alouds: Notice, Label, Practice, Apply. For Korean speakers: explicitly teach SVO word order (Korean uses SOV).',
    'L.2.1': 'High-frequency irregular past tense (went, said, came, got) first since students use these daily. "Tricky verbs" wall. Practice through daily oral sentences.',
    'L.2.2': 'Apostrophe sorting: contractions (it is = it\'s) vs. possessives (the dog\'s bone). Korean has no apostrophes, so explicit instruction with many examples is essential.',
    'L.3.1': 'Sentence combining: two simple sentences + conjunction (and, but, so, because). This builds grammar and writing fluency at the same time.',
    'L.4.1': 'Sentence expansion: start with a kernel sentence, add who, when, where, how. Students physically manipulate sentence strips to build complex sentences.',
  }
  if (tips[code]) return tips[code]
  // Try one grade below for coverage
  const parts = code.match(/^([A-Z]+)\.(\d+)\.(\d+)$/)
  if (parts) {
    const lower = parts[1] + '.' + Math.max(0, Number(parts[2]) - 1) + '.' + parts[3]
    if (tips[lower]) return tips[lower]
  }
  return null
}


function ClusterTracker() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const [statuses, setStatuses] = useState<Record<string, StdStatus>>({})
  const [loading, setLoading] = useState(true)
  const [stdAverages, setStdAverages] = useState<Record<string, number>>({})
  const [interventions, setInterventions] = useState<Record<string, InterventionStatus>>({})
  const [qcPulse, setQcPulse] = useState<Record<string, { got_it: number; almost: number; not_yet: number }>>({})
  const [showThresholdEdit, setShowThresholdEdit] = useState(false)
  const [expandedTip, setExpandedTip] = useState<string | null>(null)
  const [domainFilter, setDomainFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const DEFAULT_THRESHOLDS: Record<string, { above: number; on: number; approaching: number }> = {
    Lily: { above: 86, on: 71, approaching: 61 }, Camellia: { above: 86, on: 71, approaching: 61 },
    Daisy: { above: 86, on: 71, approaching: 61 }, Sunflower: { above: 86, on: 71, approaching: 61 },
    Marigold: { above: 86, on: 71, approaching: 61 }, Snapdragon: { above: 86, on: 71, approaching: 61 },
  }
  const [thresholds, setThresholds] = useState(DEFAULT_THRESHOLDS)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'mastery_thresholds').single()
      if (data?.value) {
        try {
          const saved = JSON.parse(data.value)
          const migrated: Record<string, { above: number; on: number; approaching: number }> = {}
          Object.entries(saved).forEach(([cls, val]: [string, any]) => {
            if (val.above != null) { migrated[cls] = val }
            else if (val.mastered != null) { migrated[cls] = { above: Math.min(val.mastered + 15, 100), on: val.mastered, approaching: val.approaching } }
          })
          setThresholds(prev => ({ ...prev, ...migrated }))
        } catch {}
      }
    })()
  }, [])

  const saveThresholds = async () => {
    await supabase.from('app_settings').upsert({ key: 'mastery_thresholds', value: JSON.stringify(thresholds) }, { onConflict: 'key' })
    showToast('Mastery thresholds saved')
    setShowThresholdEdit(false)
  }

  const t = thresholds[cls] || DEFAULT_THRESHOLDS[cls] || { above: 86, on: 71, approaching: 61 }
  const adj = getAdjustedGrade(gr, cls)
  const tier = ['Lily', 'Camellia'].includes(cls) ? '2 below' : ['Daisy', 'Sunflower'].includes(cls) ? '1 below' : 'On level'

  // All standards flat list with domain/cluster info
  const allStandards = useMemo(() => {
    return CCSS_DOMAINS.flatMap(d =>
      getClusters(d.key, adj).flatMap(c =>
        c.standards.map(std => ({ ...std, domain: d.key, domainLabel: d.label, cluster: c.name }))
      )
    )
  }, [adj])

  // Load statuses + interventions
  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const { data } = await supabase.from('class_standard_status').select('*').eq('english_class', cls).eq('student_grade', gr)
      const m: Record<string, StdStatus> = {}
      const iv: Record<string, InterventionStatus> = {}
      if (data) data.forEach((r: any) => { if (['below','approaching','on','above'].includes(r.status)) m[r.standard_code] = r.status; if (r.intervention_status) iv[r.standard_code] = r.intervention_status })
      setStatuses(m); setInterventions(iv); setLoading(false)
    })()
  }, [cls, gr])

  // Load averages + quick check pulse in single effect (parallel fetches)
  useEffect(() => {
    (async () => {
      const { data: sem } = await supabase.from('semesters').select('id').eq('is_active', true).single()
      if (!sem) { setStdAverages({}); setQcPulse({}); return }

      const [assessRes, qcRes] = await Promise.all([
        supabase.from('assessments').select('id, sections, standards, max_score')
          .eq('english_class', cls).eq('grade', gr).eq('semester_id', sem.id),
        supabase.from('quick_checks').select('standard_code, mark')
          .eq('english_class', cls).eq('student_grade', gr)
      ])

      const assessments = assessRes.data || []
      const qcData = qcRes.data || []

      // Build QC pulse counts
      const pulse: Record<string, { got_it: number; almost: number; not_yet: number }> = {}
      qcData.forEach((qc: any) => {
        if (!pulse[qc.standard_code]) pulse[qc.standard_code] = { got_it: 0, almost: 0, not_yet: 0 }
        const key = qc.mark as 'got_it' | 'almost' | 'not_yet'
        if (key in pulse[qc.standard_code]) pulse[qc.standard_code][key]++
      })
      setQcPulse(pulse)

      // Build assessment averages
      if (assessments.length === 0) { setStdAverages({}); return }
      const aIds = assessments.map(a => a.id)
      const { data: grades } = await supabase.from('grades').select('assessment_id, score, section_scores')
        .in('assessment_id', aIds).not('score', 'is', null)
      if (!grades || grades.length === 0) { setStdAverages({}); return }

      const avgs: Record<string, { total: number; count: number }> = {}
      assessments.forEach(a => {
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
      // Factor in QC at 0.5 weight
      const QC_SCORE: Record<string, number> = { got_it: 95, almost: 60, not_yet: 20 }
      const qcByStd: Record<string, number[]> = {}
      qcData.forEach((qc: any) => {
        if (!qcByStd[qc.standard_code]) qcByStd[qc.standard_code] = []
        qcByStd[qc.standard_code].push(QC_SCORE[qc.mark] || 50)
      })
      Object.entries(qcByStd).forEach(([code, scores]) => {
        const qcAvg = scores.reduce((a, b) => a + b, 0) / scores.length
        if (!avgs[code]) avgs[code] = { total: 0, count: 0 }
        avgs[code].total += qcAvg * 0.5; avgs[code].count += 0.5
      })
      const result: Record<string, number> = {}
      Object.entries(avgs).forEach(([code, { total, count }]) => { result[code] = Math.round(total / count * 10) / 10 })
      setStdAverages(result)
    })()
  }, [cls, gr])

  // Auto-apply mastery from averages (only for standards with data, don't override manual)
  const [autoSuggested, setAutoSuggested] = useState(false)
  useEffect(() => {
    if (loading || autoSuggested || Object.keys(stdAverages).length === 0) return
    const newStatuses = { ...statuses }
    let changed = 0
    Object.entries(stdAverages).forEach(([code, avg]) => {
      const current = statuses[code]
      const suggest: StdStatus = avg >= t.above ? 'above' : avg >= t.on ? 'on' : avg >= t.approaching ? 'approaching' : 'below'
      if (current == null || (current !== suggest && current !== 'above')) {
        newStatuses[code] = suggest; changed++
      }
    })
    if (changed > 0) {
      setStatuses(newStatuses)
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

  useEffect(() => { setAutoSuggested(false) }, [cls, gr])

  // Effective status: use saved status, or compute from average, or "not_started" if no data
  const getEffectiveStatus = useCallback((code: string): StdStatus | 'not_started' => {
    const saved = statuses[code]
    if (saved) return saved
    const avg = stdAverages[code]
    if (avg != null) {
      return avg >= t.above ? 'above' : avg >= t.on ? 'on' : avg >= t.approaching ? 'approaching' : 'below'
    }
    return 'not_started'
  }, [statuses, stdAverages, t])

  const cycleStatus = async (code: string) => {
    const cur = getEffectiveStatus(code)
    const cycle: (StdStatus | 'not_started')[] = ['not_started', 'below', 'approaching', 'on', 'above']
    const idx = cycle.indexOf(cur)
    const nx = cycle[(idx + 1) % cycle.length]
    if (nx === 'not_started') {
      setStatuses(p => { const n = { ...p }; delete n[code]; return n })
      await supabase.from('class_standard_status').delete()
        .eq('english_class', cls).eq('student_grade', gr).eq('standard_code', code)
    } else {
      setStatuses(p => ({ ...p, [code]: nx as StdStatus }))
      await supabase.from('class_standard_status').upsert({
        english_class: cls, student_grade: gr, standard_code: code, status: nx,
        updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
      }, { onConflict: 'english_class,student_grade,standard_code' })
    }
  }

  // Summary counts
  const counts = useMemo(() => {
    const c: Record<string, number> = { not_started: 0, below: 0, approaching: 0, on: 0, above: 0 }
    allStandards.forEach(std => { c[getEffectiveStatus(std.code)]++ })
    return c
  }, [allStandards, getEffectiveStatus])

  // Filter displayed standards
  const displayed = useMemo(() => {
    let list = allStandards
    if (domainFilter !== 'all') list = list.filter(s => s.domain === domainFilter)
    if (statusFilter !== 'all') list = list.filter(s => getEffectiveStatus(s.code) === statusFilter)
    return list
  }, [allStandards, domainFilter, statusFilter, getEffectiveStatus])

  // Group by domain → cluster
  const grouped = useMemo(() => {
    const m = new Map<string, typeof displayed>()
    displayed.forEach(s => {
      if (!m.has(s.domain)) m.set(s.domain, [])
      m.get(s.domain)!.push(s)
    })
    return Array.from(m.entries())
  }, [displayed])

  const STATUS_DISPLAY: Record<string, { dot: string; bg: string; label: string; ring: string }> = {
    not_started: { dot: '', bg: '', label: 'Not Started', ring: '' },
    below: { dot: 'bg-red-500', bg: 'bg-red-50/50', label: 'Below', ring: '' },
    approaching: { dot: 'bg-amber-400', bg: 'bg-amber-50/50', label: 'Approaching', ring: '' },
    on: { dot: 'bg-green-500', bg: 'bg-green-50/50', label: 'On Standard', ring: '' },
    above: { dot: 'bg-blue-500', bg: 'bg-blue-50/50', label: 'Above', ring: '' },
  }

  // QC mini bar
  const QCBar = ({ code }: { code: string }) => {
    const p = qcPulse[code]
    if (!p || (p.got_it + p.almost + p.not_yet === 0)) return null
    const total = p.got_it + p.almost + p.not_yet
    const gPct = (p.got_it / total) * 100
    const aPct = (p.almost / total) * 100
    return (
      <div className="flex items-center gap-1.5" title={`Quick Check: ${p.got_it} got it, ${p.almost} almost, ${p.not_yet} not yet (${total} total)`}>
        <div className="w-14 h-1.5 rounded-full bg-gray-200 overflow-hidden flex">
          {gPct > 0 && <div className="h-full bg-green-500" style={{ width: `${gPct}%` }} />}
          {aPct > 0 && <div className="h-full bg-amber-400" style={{ width: `${aPct}%` }} />}
        </div>
        <span className="text-[8px] text-text-tertiary whitespace-nowrap">{p.got_it}/{total}</span>
      </div>
    )
  }

  return (
    <div>
      {/* Class + Grade selector */}
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

      {/* Info banner */}
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-blue-500" />
          <p className="text-[12px] text-blue-700"><span className="font-semibold">{cls}</span> Grade {gr} → <span className="font-semibold">{gradeLabel(adj)} CCSS</span> ({tier})</p>
        </div>
        <button onClick={() => setShowThresholdEdit(!showThresholdEdit)} className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-white/70 text-blue-600 hover:bg-white border border-blue-200">
          ⚙ Thresholds
        </button>
      </div>

      {/* Threshold Editor */}
      {showThresholdEdit && (
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <p className="text-[13px] font-bold text-navy mb-1">Standards Mastery Thresholds</p>
          <p className="text-[10px] text-text-tertiary mb-4">Set the percentage cutoffs for each class. These determine how student scores map to mastery levels.</p>
          <div className="space-y-3">
            {ENGLISH_CLASSES.map(c => {
              const th = thresholds[c] || { above: 86, on: 71, approaching: 61 }
              const updateTh = (field: 'above' | 'on' | 'approaching', val: number) =>
                setThresholds(prev => ({ ...prev, [c]: { ...(prev[c] || { above: 86, on: 71, approaching: 61 }), [field]: val } }))
              return (
                <div key={c} className="flex items-center gap-3 bg-surface-alt/50 rounded-lg px-3 py-2.5">
                  <span className="text-[11px] font-bold w-20 shrink-0" style={{ color: classToColor(c) }}>{c}</span>
                  <div className="flex items-center gap-1.5 flex-1 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />Above:
                      <input type="number" min={0} max={100} value={th.above}
                        onChange={e => updateTh('above', Number(e.target.value))}
                        className="w-10 px-1 py-0.5 border border-border rounded text-[10px] text-center bg-white" />%+
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-green-500" />On:
                      <input type="number" min={0} max={100} value={th.on}
                        onChange={e => updateTh('on', Number(e.target.value))}
                        className="w-10 px-1 py-0.5 border border-border rounded text-[10px] text-center bg-white" />–{th.above - 1}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px]">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />Approaching:
                      <input type="number" min={0} max={100} value={th.approaching}
                        onChange={e => updateTh('approaching', Number(e.target.value))}
                        className="w-10 px-1 py-0.5 border border-border rounded text-[10px] text-center bg-white" />–{th.on - 1}%
                    </span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-text-tertiary">
                      <span className="w-2 h-2 rounded-full bg-red-500" />Below: 0–{th.approaching - 1}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowThresholdEdit(false)} className="px-3 py-1.5 rounded-lg text-[11px] text-text-secondary hover:bg-surface-alt">Cancel</button>
            <button onClick={saveThresholds} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-navy text-white hover:opacity-90">Save Thresholds</button>
          </div>
        </div>
      )}

      {/* Summary strip + filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-3 py-2">
          {([['not_started', 'Not Started', 'bg-gray-200'], ['below', 'Below', 'bg-red-500'], ['approaching', 'Approaching', 'bg-amber-400'], ['on', 'On', 'bg-green-500'], ['above', 'Above', 'bg-blue-500']] as const).map(([key, label, dot]) => (
            <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${statusFilter === key ? 'bg-navy/10 text-navy ring-1 ring-navy/20' : 'text-text-secondary hover:bg-surface-alt'}`}>
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {counts[key]} {label}
            </button>
          ))}
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}
          className="px-2.5 py-1.5 border border-border rounded-lg text-[11px] outline-none bg-surface">
          <option value="all">All Domains</option>
          {CCSS_DOMAINS.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
        <span className="text-[9px] text-text-tertiary ml-auto">Click dot to cycle: — → Below → Approaching → On → Above → —</span>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] text-text-tertiary mb-3">
        <span>Thresholds: Above ≥{t.above}% | On ≥{t.on}% | Approaching ≥{t.approaching}%</span>
        <span className="flex items-center gap-1"><span className="w-8 h-1.5 rounded-full overflow-hidden flex"><span className="h-full bg-green-500 w-3" /><span className="h-full bg-amber-400 w-3" /><span className="h-full bg-gray-200 w-2" /></span> = Quick Check pulse</span>
      </div>

      {/* Main table */}
      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
      <div className="space-y-5">
        {grouped.map(([domKey, standards]) => {
          const domInfo = CCSS_DOMAINS.find(d => d.key === domKey)
          const clusterGroups = new Map<string, typeof standards>()
          standards.forEach(s => {
            if (!clusterGroups.has(s.cluster)) clusterGroups.set(s.cluster, [])
            clusterGroups.get(s.cluster)!.push(s)
          })
          return (
            <div key={domKey} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 bg-surface-alt border-b border-border">
                <h3 className="text-[12px] font-bold text-navy uppercase tracking-wider">{domInfo?.label || domKey}</h3>
              </div>
              <div className="divide-y divide-border/50">
                {Array.from(clusterGroups.entries()).map(([clusterName, clusterStds]) => (
                  <div key={clusterName}>
                    <div className="px-4 py-1.5 bg-surface-alt/30 border-b border-border/30">
                      <span className="text-[10px] font-semibold text-text-secondary">{clusterName}</span>
                    </div>
                    {clusterStds.map(std => {
                      const es = getEffectiveStatus(std.code)
                      const d = STATUS_DISPLAY[es] || STATUS_DISPLAY['not_started']
                      const avg = stdAverages[std.code]
                      const iv = interventions[std.code]
                      const tip = getTeachingTip(std.code)
                      return (
                        <div key={std.code} className={`flex items-start gap-3 px-4 py-2 hover:bg-surface-alt/30 transition-colors ${d.bg}`}>
                          {/* Status dot */}
                          <button onClick={() => cycleStatus(std.code)} className="mt-1 flex-shrink-0" title={`${d.label} — click to cycle`}>
                            {es === 'not_started'
                              ? <span className="block w-3.5 h-3.5 rounded-full border-2 border-dashed border-gray-300" />
                              : <span className={`block w-3.5 h-3.5 rounded-full ${d.dot}`} />
                            }
                          </button>

                          {/* Standard info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[11px] font-bold text-navy">{std.code}</span>
                              {avg != null && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${avg >= t.above ? 'bg-blue-100 text-blue-700' : avg >= t.on ? 'bg-green-100 text-green-700' : avg >= t.approaching ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                  {Math.round(avg)}%
                                </span>
                              )}
                              <QCBar code={std.code} />
                              {(es === 'below' || es === 'approaching') && (
                                <select
                                  value={iv || 'none'}
                                  onChange={async (e) => {
                                    const val = e.target.value as InterventionStatus
                                    setInterventions(p => ({ ...p, [std.code]: val }))
                                    await supabase.from('class_standard_status').upsert({
                                      english_class: cls, student_grade: gr, standard_code: std.code,
                                      status: es as StdStatus, intervention_status: val === 'none' ? null : val,
                                      updated_by: currentTeacher?.id, updated_at: new Date().toISOString()
                                    }, { onConflict: 'english_class,student_grade,standard_code' })
                                  }}
                                  className={`text-[9px] font-medium px-1.5 py-0.5 rounded border-0 outline-none cursor-pointer ${
                                    INTERVENTION_OPTIONS.find(o => o.value === (iv || 'none'))?.color || 'text-gray-400 bg-transparent'
                                  }`}
                                >
                                  {INTERVENTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              )}
                              {tip && (
                                <button onClick={() => setExpandedTip(expandedTip === std.code ? null : std.code)}
                                  className="text-[9px] text-indigo-600 hover:underline">💡 tip</button>
                              )}
                            </div>
                            <p className="text-[11px] text-text-primary leading-snug mt-0.5">{std.text}</p>
                            {expandedTip === std.code && tip && (
                              <div className="mt-1 text-[10px] text-indigo-800 bg-indigo-50 rounded px-2 py-1.5 leading-relaxed">{tip}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>}
    </div>
  )
}
