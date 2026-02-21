'use client'

import { useState, useMemo } from 'react'
import {
  ChevronDown, ChevronUp, ChevronRight, Search, AlertTriangle,
  BookOpen, Target, TrendingUp, Globe, List
} from 'lucide-react'
import type { GuideSection, SkillEntry, GrammarPoint } from './resource-guide-data'

type GuideTab = 'overview' | 'progression' | 'skills' | 'grammar-ref' | 'wida' | 'intervention'

export default function ResourceGuideRenderer({ guide }: { guide: GuideSection }) {
  const [tab, setTab] = useState<GuideTab>('overview')
  const tabs: { id: GuideTab; label: string; icon: typeof BookOpen; show: boolean }[] = [
    { id: 'overview', label: 'Overview', icon: BookOpen, show: true },
    { id: 'progression', label: 'Development', icon: TrendingUp, show: true },
    { id: 'skills', label: 'Skills & Strategies', icon: Target, show: true },
    { id: 'grammar-ref', label: 'Grammar Reference', icon: List, show: !!guide.grammarPoints?.length },
    { id: 'wida', label: 'WIDA by Grade', icon: Globe, show: true },
    { id: 'intervention', label: 'Intervention', icon: AlertTriangle, show: true },
  ]
  return (
    <div>
      <div className="flex gap-1 mb-6 flex-wrap">
        {tabs.filter(t => t.show).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${tab === t.id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab guide={guide} />}
      {tab === 'progression' && <ProgressionTab guide={guide} />}
      {tab === 'skills' && <SkillsTab guide={guide} />}
      {tab === 'grammar-ref' && guide.grammarPoints && <GrammarReferenceTab points={guide.grammarPoints} />}
      {tab === 'wida' && <WIDATab guide={guide} />}
      {tab === 'intervention' && <InterventionTab guide={guide} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// OVERVIEW
// ═══════════════════════════════════════════════════════════════════
function OverviewTab({ guide }: { guide: GuideSection }) {
  return (
    <div className="max-w-4xl space-y-5">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5">
        <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">The Big Idea</p>
        <p className="text-[15px] font-display font-bold text-navy leading-relaxed">{guide.overview.bigIdea}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-navy mb-2">What Is It?</h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">{guide.overview.what}</p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-navy mb-2">Why Does It Matter?</h3>
          <p className="text-[12px] text-text-secondary leading-relaxed">{guide.overview.whyItMatters}</p>
        </div>
      </div>
      <div className="bg-surface-alt/50 border border-border rounded-lg px-5 py-3">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Research Base</p>
        <p className="text-[11px] text-text-secondary leading-relaxed italic">{guide.overview.researchBase}</p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-[14px] font-bold text-navy mb-1">Grade-Level Expectations</h3>
        <p className="text-[11px] text-text-tertiary mb-4">What students should do at each stage, and how to check.</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead><tr className="bg-surface-alt">
              <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-[80px]">Grade</th>
              <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">Expected Skills</th>
              <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-[260px]">How to Assess</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {guide.milestones.map(m => (
                <tr key={m.grade}>
                  <td className="px-4 py-3 align-top"><span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-navy text-white text-[11px] font-bold">{m.grade}</span></td>
                  <td className="px-3 py-3 align-top text-[11px] text-text-secondary leading-relaxed">{m.expectations}</td>
                  <td className="px-3 py-3 align-top text-[11px] text-text-tertiary leading-relaxed">{m.assessHow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {guide.koreanL1Considerations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <h3 className="text-[13px] font-bold text-amber-800 mb-3">Korean L1 Considerations</h3>
          <div className="space-y-2.5">
            {guide.koreanL1Considerations.map((note, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <p className="text-[11px] text-amber-900 leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3">
        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">App Connection</p>
        <p className="text-[11px] text-blue-800 leading-relaxed">{guide.connectionToApp}</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESSION — timeline
// ═══════════════════════════════════════════════════════════════════
const DC = {
  foundational: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
  intermediate: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  advanced: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-400' },
}

function ProgressionTab({ guide }: { guide: GuideSection }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">Developmental Progression</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed">Skills develop in sequence. Colors: <span className="font-semibold text-emerald-700">foundational</span>, <span className="font-semibold text-amber-700">intermediate</span>, <span className="font-semibold text-rose-700">advanced</span>.</p>
      </div>
      <div className="relative">
        <div className="absolute left-[22px] top-3 bottom-3 w-0.5 bg-border" />
        <div className="space-y-3">
          {guide.developmentalProgression.map((skill, idx) => {
            const c = DC[skill.difficulty]; const isOpen = expanded === skill.name
            return (
              <div key={skill.name} className="relative pl-12">
                <div className={`absolute left-2.5 top-4 w-5 h-5 rounded-full ${c.bar} flex items-center justify-center`}><span className="text-white text-[9px] font-bold">{idx + 1}</span></div>
                <div className={`border ${c.border} rounded-xl overflow-hidden ${c.bg}`}>
                  <button onClick={() => setExpanded(isOpen ? null : skill.name)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={`text-[13px] font-bold ${c.text}`}>{skill.name}</h4>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>{skill.difficulty}</span>
                        <span className="text-[9px] text-text-tertiary font-medium">{skill.gradeRange}</span>
                      </div>
                      <p className={`text-[11px] ${c.text} opacity-80 leading-relaxed`}>{skill.description}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-text-tertiary shrink-0" /> : <ChevronDown size={16} className="text-text-tertiary shrink-0" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 border-t border-border/30">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mt-3 mb-2">Classroom Activities</p>
                      <div className="space-y-2">
                        {skill.activities.map((act, i) => <div key={i} className="flex gap-2.5"><ChevronRight size={12} className={`${c.text} shrink-0 mt-0.5`} /><p className={`text-[11px] ${c.text} leading-relaxed`}>{act}</p></div>)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// SKILLS — expandable cards
// ═══════════════════════════════════════════════════════════════════
function SkillsTab({ guide }: { guide: GuideSection }) {
  const [search, setSearch] = useState(''); const [expanded, setExpanded] = useState<string | null>(null)
  const filtered = search.trim() ? guide.skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.what.toLowerCase().includes(search.toLowerCase())) : guide.skills
  return (
    <div className="max-w-4xl">
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills and strategies..." className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
      </div>
      <div className="space-y-3">
        {filtered.map(skill => {
          const isOpen = expanded === skill.name
          return (
            <div key={skill.name} className="border border-border rounded-xl overflow-hidden bg-surface">
              <button onClick={() => setExpanded(isOpen ? null : skill.name)} className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-surface-alt/30 transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-[13px] font-bold text-navy">{skill.name}</h3>
                    {skill.ccss && <span className="text-[9px] font-mono text-text-tertiary bg-surface-alt px-1.5 py-0.5 rounded">{skill.ccss}</span>}
                    {skill.gradeRange && <span className="text-[9px] text-text-tertiary">{skill.gradeRange}</span>}
                  </div>
                  <p className="text-[11px] text-text-secondary mt-0.5 line-clamp-1">{skill.what}</p>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-text-tertiary shrink-0" /> : <ChevronDown size={16} className="text-text-tertiary shrink-0" />}
              </button>
              {isOpen && <SkillDetail skill={skill} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SkillDetail({ skill }: { skill: SkillEntry }) {
  return (
    <div className="border-t border-border/50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border/50">
        <div className="px-5 py-4"><p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">What It Is</p><p className="text-[12px] text-text-secondary leading-relaxed">{skill.what}</p></div>
        <div className="px-5 py-4"><p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Why It Matters</p><p className="text-[12px] text-text-secondary leading-relaxed">{skill.why}</p></div>
      </div>
      <div className="mx-5 mb-4 bg-surface-alt/60 border border-border rounded-lg p-4">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">In the Classroom</p>
        <p className="text-[12px] text-text-primary leading-relaxed">{skill.example}</p>
      </div>
      <div className="px-5 pb-4">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3">How to Teach It</p>
        <div className="space-y-3">
          {skill.howToTeach.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-lg bg-navy/10 text-navy text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <div><p className="text-[12px] font-semibold text-navy">{step.step}</p><p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{step.detail}</p></div>
            </div>
          ))}
        </div>
      </div>
      {skill.koreanNote && (
        <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3.5">
          <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Korean L1 Note</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">{skill.koreanNote}</p>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// GRAMMAR REFERENCE — searchable, filterable
// ═══════════════════════════════════════════════════════════════════
function GrammarReferenceTab({ points }: { points: GrammarPoint[] }) {
  const [search, setSearch] = useState(''); const [filterCat, setFilterCat] = useState('all'); const [filterDiff, setFilterDiff] = useState('all'); const [expanded, setExpanded] = useState<string | null>(null)
  const categories = useMemo(() => [...new Set(points.map(p => p.category))], [points])
  const filtered = useMemo(() => points.filter(p => {
    if (filterCat !== 'all' && p.category !== filterCat) return false
    if (filterDiff !== 'all' && p.difficulty !== filterDiff) return false
    if (search.trim()) { const q = search.toLowerCase(); return p.term.toLowerCase().includes(q) || p.definition.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) }
    return true
  }), [points, search, filterCat, filterDiff])
  const grouped = useMemo(() => { const m = new Map<string, GrammarPoint[]>(); for (const p of filtered) { if (!m.has(p.category)) m.set(p.category, []); m.get(p.category)!.push(p) }; return m }, [filtered])
  const dc: Record<string, string> = { basic: 'bg-emerald-100 text-emerald-700', intermediate: 'bg-amber-100 text-amber-700', advanced: 'bg-rose-100 text-rose-700' }

  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5 mb-5">
        <h3 className="text-[14px] font-bold text-navy mb-1">Grammar Reference</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed">Comprehensive English grammar reference from basic to advanced. Use as a quick-lookup during planning or to understand what students need at each level.</p>
      </div>
      <div className="flex flex-wrap gap-2 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search grammar terms..." className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
        </div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[12px] bg-surface"><option value="all">All Categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
        <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-[12px] bg-surface"><option value="all">All Levels</option><option value="basic">Basic</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select>
      </div>
      {[...grouped.entries()].map(([cat, items]) => (
        <div key={cat} className="mb-6">
          <h4 className="text-[12px] font-bold text-navy uppercase tracking-wider mb-2 pl-1">{cat}</h4>
          <div className="space-y-2">
            {items.map(p => {
              const key = `${p.category}-${p.term}`; const isOpen = expanded === key
              return (
                <div key={key} className="border border-border rounded-lg bg-surface overflow-hidden">
                  <button onClick={() => setExpanded(isOpen ? null : key)} className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-surface-alt/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2"><span className="text-[12px] font-bold text-navy">{p.term}</span><span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-full ${dc[p.difficulty]}`}>{p.difficulty}</span></div>
                      <p className="text-[10px] text-text-secondary mt-0.5 line-clamp-1">{p.definition}</p>
                    </div>
                    {isOpen ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border/50 px-4 py-3 space-y-3">
                      <div><p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Definition</p><p className="text-[11px] text-text-secondary leading-relaxed">{p.definition}</p></div>
                      <div><p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Examples</p><div className="flex flex-wrap gap-1.5">{p.examples.map((ex, i) => <span key={i} className="text-[11px] bg-surface-alt px-2.5 py-1 rounded-lg text-text-primary italic">{ex}</span>)}</div></div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3"><p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-0.5">Teaching Tip</p><p className="text-[11px] text-blue-800 leading-relaxed">{p.teachingTip}</p></div>
                      {p.koreanNote && <div className="bg-amber-50 border border-amber-200 rounded-lg p-3"><p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Korean L1 Note</p><p className="text-[11px] text-amber-800 leading-relaxed">{p.koreanNote}</p></div>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-[12px] text-text-tertiary text-center py-8">No grammar points match your search.</p>}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// WIDA TAB — MATRIX: grades (rows) x levels (columns)
// Falls back to level cards if no matrix data
// ═══════════════════════════════════════════════════════════════════
const WH = [
  { label: 'L1 Entering', color: 'bg-red-100 text-red-800', cellBg: 'bg-red-50/30' },
  { label: 'L2 Emerging', color: 'bg-orange-100 text-orange-800', cellBg: 'bg-orange-50/30' },
  { label: 'L3 Developing', color: 'bg-amber-100 text-amber-800', cellBg: 'bg-amber-50/30' },
  { label: 'L4 Expanding', color: 'bg-green-100 text-green-800', cellBg: 'bg-green-50/30' },
  { label: 'L5 Bridging', color: 'bg-blue-100 text-blue-800', cellBg: 'bg-blue-50/30' },
]

function WIDATab({ guide }: { guide: GuideSection }) {
  if (guide.widaMatrix?.length) return <WIDAMatrixView matrix={guide.widaMatrix} title={guide.title} />
  return <WIDALegacyView wida={guide.wida} />
}

function WIDAMatrixView({ matrix, title }: { matrix: NonNullable<GuideSection['widaMatrix']>; title: string }) {
  return (
    <div className="max-w-5xl">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">{title}: What Students Can Do at Each Grade and WIDA Level</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed">Find your grade on the left, then read across to see what students at each WIDA level can typically do. This tells you what to expect and how to differentiate.</p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-[10px] min-w-[800px]">
          <thead><tr>
            <th className="text-left px-3 py-3 bg-navy text-white text-[9px] uppercase tracking-wider font-semibold w-[60px] sticky left-0 z-10">Grade</th>
            {WH.map(h => <th key={h.label} className={`text-left px-3 py-3 text-[9px] uppercase tracking-wider font-semibold ${h.color}`}>{h.label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-border">
            {matrix.map(row => (
              <tr key={row.grade} className="hover:bg-surface-alt/30">
                <td className="px-3 py-3 align-top sticky left-0 bg-surface z-10"><span className="inline-flex w-7 h-7 items-center justify-center rounded-lg bg-navy text-white text-[11px] font-bold">{row.grade}</span></td>
                <td className={`px-3 py-3 align-top leading-relaxed ${WH[0].cellBg}`}>{row.level1}</td>
                <td className={`px-3 py-3 align-top leading-relaxed ${WH[1].cellBg}`}>{row.level2}</td>
                <td className={`px-3 py-3 align-top leading-relaxed ${WH[2].cellBg}`}>{row.level3}</td>
                <td className={`px-3 py-3 align-top leading-relaxed ${WH[3].cellBg}`}>{row.level4}</td>
                <td className={`px-3 py-3 align-top leading-relaxed ${WH[4].cellBg}`}>{row.level5}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[9px] text-text-tertiary mt-2 italic">WIDA levels are absolute — a Level 3 means the same thing regardless of class. Your class determines WHAT you teach; WIDA determines HOW.</p>
    </div>
  )
}

function WIDALegacyView({ wida }: { wida: GuideSection['wida'] }) {
  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">WIDA Level Reference</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed">What students at each WIDA level can do and what support they need.</p>
      </div>
      <div className="space-y-3">
        {wida.map(w => (
          <div key={w.level} className={`border rounded-xl overflow-hidden ${w.color}`}>
            <div className="px-5 py-4">
              <h4 className="text-[13px] font-bold mb-3">{w.level}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">What They Can Do</p><p className="text-[11px] leading-relaxed">{w.canDo}</p></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Support Needed</p><p className="text-[11px] leading-relaxed">{w.support}</p></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// INTERVENTION
// ═══════════════════════════════════════════════════════════════════
function InterventionTab({ guide }: { guide: GuideSection }) {
  return (
    <div className="max-w-4xl">
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-red-800 mb-1">When Intervention Is Needed</h3>
        <p className="text-[12px] text-red-700 leading-relaxed">These signals do not mean something is "wrong" — many ELLs need more time and targeted practice. The key is recognizing when general instruction is not enough and responding quickly.</p>
      </div>
      <div className="space-y-3">
        {guide.interventionSignals.map((s, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex">
              <div className="w-1.5 bg-red-400 shrink-0" />
              <div className="px-5 py-4 flex-1"><div className="flex items-start gap-3"><AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" /><div><p className="text-[12px] font-semibold text-navy mb-1">{s.signal}</p><p className="text-[11px] text-text-secondary leading-relaxed">{s.whatToDo}</p></div></div></div>
            </div>
          </div>
        ))}
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mt-5">
        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">App Integration</p>
        <p className="text-[11px] text-blue-800 leading-relaxed">{guide.connectionToApp}</p>
      </div>
    </div>
  )
}
