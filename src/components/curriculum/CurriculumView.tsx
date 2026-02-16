'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { BookOpen, Layers, Globe2, Users2, BarChart3, Loader2, ChevronDown, ChevronRight, CheckCircle2, Circle, Clock, Info, Search, Save } from 'lucide-react'
import { CCSS_STANDARDS, CCSS_DOMAINS, type CCSSDomain, type CcssStandard } from './ccss-standards'

// ─── CCSS GRADE OFFSET BY CLASS TIER ─────────────────────────────────
function getAdjustedGrade(studentGrade: Grade, englishClass: EnglishClass): number {
  if (['Lily', 'Camellia'].includes(englishClass)) return Math.max(0, studentGrade - 2)
  if (['Daisy', 'Sunflower'].includes(englishClass)) return Math.max(0, studentGrade - 1)
  return studentGrade
}
function gradeLabel(g: number): string { return g === 0 ? 'Kindergarten' : `Grade ${g}` }

// ─── WIDA ─────────────────────────────────────────────────────────────
const WIDA_LEVELS = [
  { level: 1, name: 'Entering', color: '#EF9A9A', bg: '#FFEBEE' },
  { level: 2, name: 'Emerging', color: '#FFCC80', bg: '#FFF3E0' },
  { level: 3, name: 'Developing', color: '#FFF59D', bg: '#FFFDE7' },
  { level: 4, name: 'Expanding', color: '#A5D6A7', bg: '#E8F5E9' },
  { level: 5, name: 'Bridging', color: '#90CAF9', bg: '#E3F2FD' },
  { level: 6, name: 'Reaching', color: '#CE93D8', bg: '#F3E5F5' },
]
const WIDA_DOMAINS = ['listening', 'speaking', 'reading', 'writing'] as const
type WIDADomainKey = typeof WIDA_DOMAINS[number]

type StdStatus = 'not_started' | 'in_progress' | 'mastered'
const STATUS_CFG = {
  not_started: { label: 'Not Started', icon: Circle, color: 'text-gray-400', bg: 'bg-gray-100' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50' },
  mastered: { label: 'Mastered', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
}

function getGradeBand(grade: number): string {
  if (grade === 0) return 'K'; if (grade === 1) return '1'; if (grade <= 3) return '2-3'; return '4-5'
}

// ═════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════
export default function CurriculumView() {
  const { language } = useApp()
  const [view, setView] = useState<'tracker'|'roadmap'|'wida'|'benchmarks'>('tracker')

  const tabs: [string, string, any][] = [
    ['tracker', 'Standards Tracker', BookOpen],
    ['roadmap', 'Class Roadmap', Layers],
    ['wida', 'WIDA Profiles', Users2],
    ['benchmarks', 'Benchmarks', BarChart3],
  ]

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">{language==='ko'?'교육과정 맵':'Curriculum Map'}</h2>
        <p className="text-[13px] text-text-secondary mt-1">CCSS ELA standards with WIDA student profiles and program benchmarks</p>
        <div className="flex gap-1 mt-4">
          {tabs.map(([id, label, Icon]) => (
            <button key={id} onClick={() => setView(id as any)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-medium transition-all ${view===id?'bg-navy text-white':'text-text-secondary hover:bg-surface-alt'}`}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-8 py-6">
        {view==='tracker'&&<Tracker />}
        {view==='roadmap'&&<Roadmap />}
        {view==='wida'&&<WIDAProfiles />}
        {view==='benchmarks'&&<Benchmarks />}
      </div>
    </div>
  )
}

// ─── STANDARDS TRACKER ───────────────────────────────────────────────
function Tracker() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass)||'Lily')
  const [gr, setGr] = useState<Grade>(3)
  const [dom, setDom] = useState<CCSSDomain>('RL')
  const [statuses, setStatuses] = useState<Record<string,StdStatus>>({})
  const [expanded, setExpanded] = useState<string|null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (!ENGLISH_CLASSES.includes(cls)) setCls('Lily') }, [cls])

  const adj = getAdjustedGrade(gr, cls)
  const stds = useMemo(() => {
    let r = CCSS_STANDARDS.filter(s => s.domain===dom && s.grade===adj)
    if (search) { const q=search.toLowerCase(); r=r.filter(s=>s.code.toLowerCase().includes(q)||s.text.toLowerCase().includes(q)) }
    return r
  }, [dom, adj, search])

  useEffect(() => {
    setLoading(true)
    ;(async () => {
      const { data } = await supabase.from('class_standard_status').select('*').eq('english_class',cls).eq('student_grade',gr)
      const m: Record<string,StdStatus> = {}
      if (data) data.forEach((r:any)=>{ m[r.standard_code]=r.status })
      setStatuses(m); setLoading(false)
    })()
  }, [cls, gr])

  const cycle = async (code: string) => {
    const cur = statuses[code]||'not_started'
    const nxt = cur==='not_started'?'in_progress':cur==='in_progress'?'mastered':'not_started'
    setStatuses(p=>({...p,[code]:nxt}))
    const { error } = await supabase.from('class_standard_status').upsert({
      english_class:cls, student_grade:gr, standard_code:code, status:nxt, updated_by:currentTeacher?.id, updated_at:new Date().toISOString()
    }, { onConflict:'english_class,student_grade,standard_code' })
    if (error) showToast(`Error: ${error.message}`)
  }

  const tier = ['Lily','Camellia'].includes(cls)?'2 below':['Daisy','Sunflower'].includes(cls)?'1 below':'On level'
  const total = CCSS_STANDARDS.filter(s=>s.domain===dom&&s.grade===adj).length
  const mastered = stds.filter(s=>(statuses[s.code]||'not_started')==='mastered').length
  const inProg = stds.filter(s=>(statuses[s.code]||'not_started')==='in_progress').length

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
          <div className="flex gap-1">
            {ENGLISH_CLASSES.map(c=>(
              <button key={c} onClick={()=>setCls(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls===c?'text-white':'text-text-secondary hover:bg-surface-alt'}`}
                style={cls===c?{backgroundColor:classToColor(c),color:classToTextColor(c)}:{}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Student Grade</label>
          <div className="flex gap-1">{GRADES.map(g=><button key={g} onClick={()=>setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr===g?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
        </div>
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search standards..." className="pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] w-56 outline-none focus:border-navy" />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info size={15} className="text-blue-500 flex-shrink-0" />
          <p className="text-[12px] text-blue-700"><span className="font-semibold">{cls}</span> Grade {gr} → <span className="font-semibold">{gradeLabel(adj)} CCSS</span> ({tier})</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-green-600 font-semibold">{mastered} mastered</span>
          <span className="text-blue-600 font-semibold">{inProg} in progress</span>
          <span className="text-text-tertiary">{total - mastered - inProg} not started</span>
        </div>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {CCSS_DOMAINS.map(d=>{
          const cnt=CCSS_STANDARDS.filter(s=>s.domain===d.key&&s.grade===adj).length
          return <button key={d.key} onClick={()=>setDom(d.key)} className={`px-3 py-2 rounded-lg text-[11px] font-medium whitespace-nowrap ${dom===d.key?'bg-navy text-white':'bg-surface-alt text-text-secondary hover:bg-border'}`}>{d.label} ({cnt})</button>
        })}
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
       stds.length===0 ? <div className="py-12 text-center text-text-tertiary text-[13px]">No standards for {dom} at {gradeLabel(adj)}.</div> :
       <div className="space-y-1.5">{stds.map(std=>{
        const status=statuses[std.code]||'not_started'; const cfg=STATUS_CFG[status]; const Icon=cfg.icon; const isExp=expanded===std.code
        return <div key={std.code} className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3">
            <button onClick={()=>cycle(std.code)} className="mt-0.5 flex-shrink-0" title={`${cfg.label} - click to change`}>
              <Icon size={20} className={cfg.color} fill={status==='mastered'?'#22c55e':status==='in_progress'?'#3b82f6':'none'} />
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-navy">{std.code}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[10px] text-text-tertiary">{std.cluster}</span>
              </div>
              <p className="text-[12.5px] text-text-primary mt-1 leading-relaxed">{std.text}</p>
            </div>
            <button onClick={()=>setExpanded(isExp?null:std.code)} className="mt-1 p-1 rounded-lg text-text-tertiary hover:text-navy hover:bg-surface-alt flex-shrink-0">
              {isExp?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
            </button>
          </div>
          {isExp && <div className="border-t border-border bg-gradient-to-b from-blue-50/50 to-surface px-4 py-3">
            <p className="text-[11px] font-semibold text-blue-600 mb-2 flex items-center gap-1"><Globe2 size={13} /> WIDA scaffolds for {getGradeBand(adj)} band</p>
            <p className="text-[11px] text-text-tertiary">Set student WIDA levels in the WIDA Profiles tab to see personalized scaffolding recommendations here.</p>
          </div>}
        </div>
       })}</div>
      }
    </div>
  )
}

// ─── CLASS ROADMAP ───────────────────────────────────────────────────
function Roadmap() {
  const [gr, setGr] = useState<Grade>(3)
  const [dom, setDom] = useState<CCSSDomain>('RL')
  const [allSt, setAllSt] = useState<Record<string,StdStatus>>({})
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    (async()=>{
      setLoading(true)
      const {data}=await supabase.from('class_standard_status').select('*').eq('student_grade',gr)
      const m:Record<string,StdStatus>={}
      if(data) data.forEach((r:any)=>{m[`${r.english_class}::${r.standard_code}`]=r.status})
      setAllSt(m); setLoading(false)
    })()
  },[gr])

  const relStds = CCSS_STANDARDS.filter(s=>s.domain===dom && ENGLISH_CLASSES.some(c=>getAdjustedGrade(gr,c)===s.grade)).sort((a,b)=>a.grade-b.grade||a.code.localeCompare(b.code))

  return <div>
    <div className="flex items-center gap-4 mb-5">
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade</label>
        <div className="flex gap-1">{GRADES.map(g=><button key={g} onClick={()=>setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr===g?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
      </div>
      <div>
        <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Domain</label>
        <div className="flex gap-1">{CCSS_DOMAINS.map(d=><button key={d.key} onClick={()=>setDom(d.key)} className={`px-2 py-1.5 rounded-lg text-[11px] font-medium ${dom===d.key?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>{d.key}</button>)}</div>
      </div>
    </div>
    <div className="flex items-center gap-4 mb-4 text-[10px]">
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border" /> Not Started</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-200 border border-blue-300" /> In Progress</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-300" /> Mastered</span>
      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 border border-dashed border-gray-300" /> N/A</span>
    </div>
    {loading?<div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>:
    <div className="bg-surface border border-border rounded-xl overflow-auto">
      <table className="w-full text-[11px]">
        <thead><tr className="bg-surface-alt">
          <th className="text-left px-3 py-2.5 text-[10px] uppercase tracking-wider text-text-secondary font-semibold sticky left-0 bg-surface-alt min-w-[180px]">Standard</th>
          {ENGLISH_CLASSES.map(c=><th key={c} className="px-2 py-2.5 text-center min-w-[95px]">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold" style={{backgroundColor:classToColor(c),color:classToTextColor(c)}}>{c}</span>
            <div className="text-[9px] text-text-tertiary mt-0.5">{gradeLabel(getAdjustedGrade(gr,c))}</div>
          </th>)}
        </tr></thead>
        <tbody>
          {relStds.map(std=><tr key={std.code} className="border-t border-border hover:bg-surface-alt/50">
            <td className="px-3 py-2 sticky left-0 bg-surface">
              <span className="font-bold text-navy">{std.code}</span>
              <p className="text-[10px] text-text-tertiary mt-0.5 line-clamp-2">{std.text}</p>
            </td>
            {ENGLISH_CLASSES.map(c=>{
              const a=getAdjustedGrade(gr,c)
              if(a!==std.grade) return <td key={c} className="px-2 py-2 text-center"><span className="w-4 h-4 rounded bg-gray-100 border border-dashed border-gray-300 inline-block" /></td>
              const st=allSt[`${c}::${std.code}`]||'not_started'
              const bg=st==='mastered'?'bg-green-200 border-green-300':st==='in_progress'?'bg-blue-200 border-blue-300':'bg-gray-200 border-gray-300'
              return <td key={c} className="px-2 py-2 text-center"><span className={`w-4 h-4 rounded border inline-block ${bg}`} title={`${c}: ${st}`} /></td>
            })}
          </tr>)}
        </tbody>
      </table>
    </div>}
  </div>
}

// ─── WIDA STUDENT PROFILES ──────────────────────────────────────────
function WIDAProfiles() {
  const { currentTeacher, showToast } = useApp()
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass)||'Snapdragon')
  const [gr, setGr] = useState<Grade>(3)
  const { students } = useStudents({ grade: gr, english_class: cls })
  const [levels, setLevels] = useState<Record<string, Record<string, number>>>({}) // studentId -> { domain -> level }
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Admin'
  const availableClasses = isAdmin ? ENGLISH_CLASSES : [currentTeacher?.english_class as EnglishClass].filter(Boolean)

  const loadLevels = useCallback(async () => {
    if (students.length === 0) { setLevels({}); setLoading(false); return }
    setLoading(true)
    const ids = students.map(s => s.id)
    const { data } = await supabase.from('student_wida_levels').select('*').in('student_id', ids)
    const m: Record<string, Record<string, number>> = {}
    if (data) data.forEach((r: any) => {
      if (!m[r.student_id]) m[r.student_id] = {}
      m[r.student_id][r.domain] = r.wida_level
    })
    setLevels(m); setLoading(false); setHasChanges(false)
  }, [students])

  useEffect(() => { loadLevels() }, [loadLevels])

  const setLevel = (studentId: string, domain: string, level: number) => {
    setLevels(prev => {
      const next = { ...prev }
      if (!next[studentId]) next[studentId] = {}
      next[studentId] = { ...next[studentId], [domain]: level }
      return next
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const rows: any[] = []
    for (const [sid, doms] of Object.entries(levels)) {
      for (const [dom, lvl] of Object.entries(doms)) {
        rows.push({ student_id: sid, domain: dom, wida_level: lvl, updated_by: currentTeacher?.id, updated_at: new Date().toISOString() })
      }
    }
    if (rows.length > 0) {
      const { error } = await supabase.from('student_wida_levels').upsert(rows, { onConflict: 'student_id,domain' })
      if (error) { showToast(`Error: ${error.message}`); setSaving(false); return }
    }
    setSaving(false); setHasChanges(false)
    showToast(`Saved WIDA levels for ${students.length} students`)
  }

  const getOverall = (studentId: string): number | null => {
    const sl = levels[studentId]
    if (!sl) return null
    const vals = WIDA_DOMAINS.map(d => sl[d]).filter((v): v is number => v != null)
    if (vals.length === 0) return null
    return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Class</label>
          <div className="flex gap-1">
            {(isAdmin ? ENGLISH_CLASSES : availableClasses).map(c=>(
              <button key={c} onClick={()=>setCls(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${cls===c?'text-white':'text-text-secondary hover:bg-surface-alt'}`}
                style={cls===c?{backgroundColor:classToColor(c),color:classToTextColor(c)}:{}}>{c}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade</label>
          <div className="flex gap-1">{GRADES.map(g=><button key={g} onClick={()=>setGr(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${gr===g?'bg-navy text-white':'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}</div>
        </div>
        {hasChanges && (
          <div className="ml-auto">
            <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save WIDA Levels
            </button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-4">
        <p className="text-[12px] text-blue-700">Set each student's WIDA proficiency level (1-6) per domain. Click a level cell to cycle through levels. These inform scaffolding recommendations across the curriculum.</p>
      </div>

      {/* WIDA Level Legend */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {WIDA_LEVELS.map(wl => (
          <div key={wl.level} className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border text-[10px]">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: wl.color }} />
            <span className="font-bold">L{wl.level}</span>
            <span className="text-text-tertiary">{wl.name}</span>
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
                        <button
                          onClick={() => {
                            const next = lvl >= 6 ? 0 : lvl + 1
                            setLevel(s.id, dom, next)
                          }}
                          className="w-full px-2 py-1.5 rounded-lg border text-[11px] font-medium transition-all hover:shadow-sm"
                          style={wl ? { backgroundColor: wl.bg, borderColor: wl.color, color: '#1e293b' } : { borderColor: '#e2e8f0' }}
                        >
                          {lvl > 0 ? `L${lvl} ${wl?.name || ''}` : '--'}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center">
                    {overall != null ? (
                      <span className="text-[12px] font-bold text-navy">{overall.toFixed(1)}</span>
                    ) : (
                      <span className="text-[11px] text-text-tertiary">--</span>
                    )}
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

// ─── PROGRAM BENCHMARKS ─────────────────────────────────────────────
function Benchmarks() {
  const { currentTeacher, showToast } = useApp()
  const [selGrade, setSelGrade] = useState<Grade>(2)
  const [benchmarks, setBenchmarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Record<string, any>>({})
  const [hasChanges, setHasChanges] = useState(false)

  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Admin'
  const isClassTeacher = currentTeacher?.role === 'teacher' && currentTeacher?.english_class !== 'Admin'

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data } = await supabase.from('class_benchmarks').select('*').eq('grade', selGrade).order('display_order', { ascending: true })
      setBenchmarks(data || [])
      const ed: Record<string, any> = {}
      if (data) data.forEach((b: any) => { ed[b.english_class] = { ...b } })
      setEditing(ed)
      setLoading(false); setHasChanges(false)
    })()
  }, [selGrade])

  const updateField = (cls: string, field: string, value: any) => {
    setEditing(prev => ({ ...prev, [cls]: { ...prev[cls], [field]: value } }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    setSaving(true)
    for (const [cls, data] of Object.entries(editing)) {
      const { error } = await supabase.from('class_benchmarks').upsert({
        english_class: cls, grade: selGrade,
        cwpm_mid: data.cwpm_mid || null, cwpm_end: data.cwpm_end || null,
        lexile_min: data.lexile_min || null, lexile_max: data.lexile_max || null,
        notes: data.notes || null,
        display_order: ENGLISH_CLASSES.indexOf(cls as EnglishClass),
      }, { onConflict: 'english_class,grade' })
      if (error) { showToast(`Error saving ${cls}: ${error.message}`); setSaving(false); return }
    }
    setSaving(false); setHasChanges(false)
    showToast('Benchmarks saved')
  }

  const canEdit = isAdmin || isClassTeacher

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-text-tertiary font-semibold block mb-1">Grade</label>
          <div className="flex gap-1">
            {GRADES.map(g => <button key={g} onClick={() => setSelGrade(g)} className={`px-4 py-2 rounded-lg text-[12px] font-medium ${selGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>Grade {g}</button>)}
          </div>
        </div>
        {hasChanges && canEdit && (
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-gold text-navy-dark hover:bg-gold-light">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save Benchmarks
          </button>
        )}
      </div>

      {loading ? <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div> :
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="bg-surface-alt border-b border-border">
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-32">Class</th>
            <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-28">CWPM Mid</th>
            <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-28">CWPM End</th>
            <th className="text-center px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-36">Lexile Range</th>
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold">Focus / WIDA Notes</th>
          </tr></thead>
          <tbody>
            {ENGLISH_CLASSES.map(cls => {
              const data = editing[cls] || {}
              const canEditRow = isAdmin || (isClassTeacher && currentTeacher?.english_class === cls)
              return (
                <tr key={cls} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className="inline-flex px-3 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEditRow ? <input type="number" value={data.cwpm_mid || ''} onChange={e => updateField(cls, 'cwpm_mid', e.target.value ? Number(e.target.value) : null)} className="w-16 text-center border border-border rounded-lg px-2 py-1.5 text-[12px]" />
                    : <span className="text-[13px] font-semibold">{data.cwpm_mid || '--'}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEditRow ? <input type="number" value={data.cwpm_end || ''} onChange={e => updateField(cls, 'cwpm_end', e.target.value ? Number(e.target.value) : null)} className="w-16 text-center border border-border rounded-lg px-2 py-1.5 text-[12px]" />
                    : <span className="text-[13px] font-semibold">{data.cwpm_end || '--'}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {canEditRow ? (
                      <div className="flex items-center justify-center gap-1">
                        <input type="number" value={data.lexile_min || ''} onChange={e => updateField(cls, 'lexile_min', e.target.value ? Number(e.target.value) : null)} className="w-14 text-center border border-border rounded-lg px-1 py-1.5 text-[12px]" />
                        <span className="text-text-tertiary">-</span>
                        <input type="number" value={data.lexile_max || ''} onChange={e => updateField(cls, 'lexile_max', e.target.value ? Number(e.target.value) : null)} className="w-14 text-center border border-border rounded-lg px-1 py-1.5 text-[12px]" />
                        <span className="text-[11px] text-text-tertiary">L</span>
                      </div>
                    ) : <span className="text-[13px]">{data.lexile_min != null && data.lexile_max != null ? `${data.lexile_min}-${data.lexile_max}L` : '--'}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {canEditRow ? <textarea value={data.notes || ''} onChange={e => updateField(cls, 'notes', e.target.value)} rows={1} className="w-full border border-border rounded-lg px-3 py-1.5 text-[12px] resize-y" placeholder="e.g. WIDA 1-2, Letter recognition" />
                    : <span className="text-[12px] text-text-secondary">{data.notes || '--'}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>}

      <p className="text-[11px] text-text-tertiary mt-3 max-w-3xl">
        These benchmarks are used for CWPM charts, reading grouping, and progress tracking. They reflect realistic ELL program targets per grade level, not native-speaker norms. Use the Focus/WIDA Notes column to note WIDA levels and standards focus areas per class. Admin and class teachers can edit.
      </p>
    </div>
  )
}
