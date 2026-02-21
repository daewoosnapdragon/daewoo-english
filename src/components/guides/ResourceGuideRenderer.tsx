'use client'

import { useState } from 'react'
import {
  ChevronDown, ChevronUp, ChevronRight, Search, AlertTriangle,
  BookOpen, Target, TrendingUp, Globe, Zap, BarChart3
} from 'lucide-react'
import type { GuideSection, SkillEntry, SubSkillProgression } from './resource-guide-data'

// ─── Sub-navigation tabs within a guide ────────────────────────

type GuideTab = 'overview' | 'progression' | 'skills' | 'wida' | 'intervention'

const TABS: { id: GuideTab; label: string; icon: typeof BookOpen }[] = [
  { id: 'overview', label: 'Overview', icon: BookOpen },
  { id: 'progression', label: 'Development', icon: TrendingUp },
  { id: 'skills', label: 'Skills & Strategies', icon: Target },
  { id: 'wida', label: 'WIDA Reference', icon: Globe },
  { id: 'intervention', label: 'Intervention', icon: AlertTriangle },
]

export default function ResourceGuideRenderer({ guide }: { guide: GuideSection }) {
  const [tab, setTab] = useState<GuideTab>('overview')

  return (
    <div>
      {/* Tab navigation */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
              tab === t.id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <OverviewTab guide={guide} />}
      {tab === 'progression' && <ProgressionTab guide={guide} />}
      {tab === 'skills' && <SkillsTab guide={guide} />}
      {tab === 'wida' && <WIDATab guide={guide} />}
      {tab === 'intervention' && <InterventionTab guide={guide} />}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// OVERVIEW TAB
// ═══════════════════════════════════════════════════════════════════

function OverviewTab({ guide }: { guide: GuideSection }) {
  return (
    <div className="max-w-4xl space-y-5">
      {/* Big Idea callout */}
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5">
        <p className="text-[10px] font-bold text-navy uppercase tracking-wider mb-2">The Big Idea</p>
        <p className="text-[15px] font-display font-bold text-navy leading-relaxed">{guide.overview.bigIdea}</p>
      </div>

      {/* What & Why grid */}
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

      {/* Research base */}
      <div className="bg-surface-alt/50 border border-border rounded-lg px-5 py-3">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Research Base</p>
        <p className="text-[11px] text-text-secondary leading-relaxed italic">{guide.overview.researchBase}</p>
      </div>

      {/* Milestones table */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h3 className="text-[14px] font-bold text-navy mb-1">Grade-Level Expectations</h3>
        <p className="text-[11px] text-text-tertiary mb-4">What students should be able to do at each stage, and how to check.</p>
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-alt">
                <th className="text-left px-4 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-[80px]">Grade</th>
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">What Students Should Do</th>
                <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-[260px]">How to Assess</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {guide.milestones.map(m => (
                <tr key={m.grade}>
                  <td className="px-4 py-3 align-top">
                    <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-navy text-white text-[11px] font-bold">{m.grade}</span>
                  </td>
                  <td className="px-3 py-3 align-top text-[11px] text-text-secondary leading-relaxed">{m.expectations}</td>
                  <td className="px-3 py-3 align-top text-[11px] text-text-tertiary leading-relaxed">{m.assessHow}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Korean L1 notes */}
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

      {/* App connection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3">
        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">How This Connects to the App</p>
        <p className="text-[11px] text-blue-800 leading-relaxed">{guide.connectionToApp}</p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// PROGRESSION TAB — visual developmental continuum
// ═══════════════════════════════════════════════════════════════════

const DIFFICULTY_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; bar: string }> = {
  basic: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800', badge: 'bg-sky-100 text-sky-700', bar: 'bg-sky-400' },
  foundational: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-400' },
  intermediate: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-400' },
  advanced: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-400' },
}
const DEFAULT_DIFFICULTY_COLOR = { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', badge: 'bg-gray-100 text-gray-700', bar: 'bg-gray-400' }

function ProgressionTab({ guide }: { guide: GuideSection }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">Developmental Progression</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed">
          Skills develop in a predictable sequence from simple to complex. Teach in order — skipping ahead creates gaps.
          The colored bars indicate difficulty level: <span className="font-semibold text-sky-700">basic</span> skills come first,
          then <span className="font-semibold text-emerald-700">foundational</span>,
          then <span className="font-semibold text-amber-700">intermediate</span>,
          then <span className="font-semibold text-rose-700">advanced</span>.
        </p>
      </div>

      {/* Visual timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-[22px] top-3 bottom-3 w-0.5 bg-border" />

        <div className="space-y-3">
          {guide.developmentalProgression.map((skill, idx) => {
            const colors = DIFFICULTY_COLORS[skill.difficulty] || DEFAULT_DIFFICULTY_COLOR
            const isOpen = expanded === skill.name
            return (
              <div key={skill.name} className="relative pl-12">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-4 w-5 h-5 rounded-full ${colors.bar} flex items-center justify-center`}>
                  <span className="text-white text-[9px] font-bold">{idx + 1}</span>
                </div>

                <div className={`border ${colors.border} rounded-xl overflow-hidden ${colors.bg}`}>
                  <button onClick={() => setExpanded(isOpen ? null : skill.name)} className="w-full px-5 py-3.5 flex items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className={`text-[13px] font-bold ${colors.text}`}>{skill.name}</h4>
                        <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-full ${colors.badge}`}>{skill.difficulty}</span>
                        <span className="text-[9px] text-text-tertiary font-medium">{skill.gradeRange}</span>
                      </div>
                      <p className={`text-[11px] ${colors.text} opacity-80 leading-relaxed`}>{skill.description}</p>
                    </div>
                    {isOpen ? <ChevronUp size={16} className="text-text-tertiary shrink-0" /> : <ChevronDown size={16} className="text-text-tertiary shrink-0" />}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-4 border-t border-border/30">
                      <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mt-3 mb-2">Classroom Activities</p>
                      <div className="space-y-2">
                        {skill.activities.map((act, i) => (
                          <div key={i} className="flex gap-2.5">
                            <ChevronRight size={12} className={`${colors.text} shrink-0 mt-0.5`} />
                            <p className={`text-[11px] ${colors.text} leading-relaxed`}>{act}</p>
                          </div>
                        ))}
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
// SKILLS TAB — detailed, expandable skill cards
// ═══════════════════════════════════════════════════════════════════

function SkillsTab({ guide }: { guide: GuideSection }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filtered = search.trim()
    ? guide.skills.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.what.toLowerCase().includes(search.toLowerCase()))
    : guide.skills

  return (
    <div className="max-w-4xl">
      {/* Search */}
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search skills..."
          className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
      </div>

      <div className="space-y-3">
        {filtered.map(skill => {
          const isOpen = expanded === skill.name
          return (
            <div key={skill.name} className="border border-border rounded-xl overflow-hidden bg-surface">
              {/* Header */}
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

              {/* Expanded content */}
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
      {/* What & Why */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border/50">
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">What It Is</p>
          <p className="text-[12px] text-text-secondary leading-relaxed">{skill.what}</p>
        </div>
        <div className="px-5 py-4">
          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">Why It Matters</p>
          <p className="text-[12px] text-text-secondary leading-relaxed">{skill.why}</p>
        </div>
      </div>

      {/* Example */}
      <div className="mx-5 mb-4 bg-surface-alt/60 border border-border rounded-lg p-4">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">In the Classroom</p>
        <p className="text-[12px] text-text-primary leading-relaxed">{skill.example}</p>
      </div>

      {/* How to Teach */}
      <div className="px-5 pb-4">
        <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-3">How to Teach It</p>
        <div className="space-y-3">
          {skill.howToTeach.map((step, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-6 h-6 rounded-lg bg-navy/10 text-navy text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <div>
                <p className="text-[12px] font-semibold text-navy">{step.step}</p>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-0.5">{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Korean note */}
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
// WIDA TAB — what students at each level can do
// ═══════════════════════════════════════════════════════════════════

function WIDATab({ guide }: { guide: GuideSection }) {
  return (
    <div className="max-w-4xl">
      <div className="bg-navy/5 border border-navy/15 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-navy mb-1">WIDA Level Reference</h3>
        <p className="text-[12px] text-text-secondary leading-relaxed">
          What students at each WIDA proficiency level can typically do in this skill area, and what support they need.
          Remember: WIDA levels are absolute — a Level 3 means the same thing regardless of which class the student is in.
        </p>
      </div>

      <div className="space-y-3">
        {guide.wida.map(w => (
          <div key={w.level} className={`border rounded-xl overflow-hidden ${w.color}`}>
            <div className="px-5 py-4">
              <h4 className="text-[13px] font-bold mb-3">{w.level}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">What They Can Do</p>
                  <p className="text-[11px] leading-relaxed">{w.canDo}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-70">Support Needed</p>
                  <p className="text-[11px] leading-relaxed">{w.support}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// INTERVENTION TAB — when and how to respond
// ═══════════════════════════════════════════════════════════════════

function InterventionTab({ guide }: { guide: GuideSection }) {
  return (
    <div className="max-w-4xl">
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
        <h3 className="text-[14px] font-bold text-red-800 mb-1">When Intervention Is Needed</h3>
        <p className="text-[12px] text-red-700 leading-relaxed">
          These signals do not mean something is "wrong" with the student — many ELLs simply need more time and targeted practice.
          The key is recognizing when a student needs more support than general classroom instruction provides, and responding quickly.
        </p>
      </div>

      <div className="space-y-3">
        {guide.interventionSignals.map((signal, i) => (
          <div key={i} className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="flex">
              {/* Red signal bar */}
              <div className="w-1.5 bg-red-400 shrink-0" />
              <div className="px-5 py-4 flex-1">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-semibold text-navy mb-1">{signal.signal}</p>
                    <p className="text-[11px] text-text-secondary leading-relaxed">{signal.whatToDo}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* App connection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-5 py-3 mt-5">
        <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider mb-1">Using the App for Intervention Tracking</p>
        <p className="text-[11px] text-blue-800 leading-relaxed">{guide.connectionToApp}</p>
      </div>
    </div>
  )
}
