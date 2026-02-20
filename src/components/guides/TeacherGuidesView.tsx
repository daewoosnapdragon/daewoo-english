'use client'

import { useState, useMemo, useEffect } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import {
  Search, ChevronLeft, ChevronRight, ExternalLink,
  Layers, BookOpen, PenTool, MessageSquare, ClipboardList, Heart,
  Layout, Star, Globe, BookMarked, Check, X, Lightbulb, ArrowRight,
  Link2, Loader2
} from 'lucide-react'
import { CATEGORIES, GUIDES, type Guide, type Category, type ContentBlock, type GuideSection } from './teacher-guides-data'
import { PhonicsSequence, PhonicsStrategies, AssessmentLiteracy, ReadingFluencyGuide } from '@/components/curriculum/TeacherReferences'

// ─── Icon Map ───────────────────────────────────────────────────

const ICON_MAP: Record<string, any> = {
  'layers': Layers, 'book-open': BookOpen, 'pen-tool': PenTool,
  'message-square': MessageSquare, 'clipboard': ClipboardList, 'heart': Heart,
  'layout': Layout, 'star': Star, 'globe': Globe,
}

function guideCountByCategory(catId: string): number {
  return GUIDES.filter(g => g.category === catId).length
}

// ═══════════════════════════════════════════════════════════════════
// BLOCK RENDERER — each block type gets its own visual treatment
// ═══════════════════════════════════════════════════════════════════

function BlockRenderer({ block, catColor }: { block: ContentBlock; catColor: string }) {
  switch (block.type) {
    case 'text':
      return <p className="text-[12.5px] text-text-secondary leading-relaxed">{block.value}</p>

    case 'callout':
      return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">{block.label}</p>
          <p className="text-[12px] text-amber-800 font-medium leading-relaxed">{block.value}</p>
        </div>
      )

    case 'tip':
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3.5 flex gap-2.5">
          <Lightbulb size={14} className="text-blue-500 shrink-0 mt-0.5" />
          <p className="text-[12px] text-blue-800 leading-relaxed">{block.value}</p>
        </div>
      )

    case 'example':
      return (
        <div className="bg-surface-alt/70 border border-border rounded-lg p-4">
          {block.label && <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">{block.label}</p>}
          <p className="text-[12px] text-text-primary leading-relaxed italic">{block.value}</p>
        </div>
      )

    case 'list':
      return (
        <div>
          {block.label && <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2">{block.label}</p>}
          <div className="space-y-1.5">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-2 pl-1">
                <span className="text-[11px] mt-0.5 shrink-0" style={{ color: catColor }}>&#8226;</span>
                <p className="text-[12px] text-text-secondary leading-relaxed">
                  {item.bold && <span className="font-semibold text-navy">{item.bold}: </span>}
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'steps':
      return (
        <div>
          {block.label && <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2.5">{block.label}</p>}
          <div className="space-y-2">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 mt-0.5"
                  style={{ backgroundColor: catColor }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-navy">{item.title}</p>
                  <p className="text-[11.5px] text-text-secondary leading-relaxed mt-0.5">{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )

    case 'levels':
      return (
        <div>
          {block.label && <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2.5">{block.label}</p>}
          <div className="space-y-1.5">
            {block.items.map((item, i) => (
              <div key={i} className="flex gap-3 items-start bg-surface-alt/50 border border-border rounded-lg p-3">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap"
                  style={{ backgroundColor: `${item.color}15`, color: item.color }}>
                  {item.level}
                </span>
                <p className="text-[12px] text-text-secondary leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'grid':
      return (
        <div>
          {block.label && <p className="text-[10px] font-semibold text-text-tertiary uppercase tracking-wider mb-2.5">{block.label}</p>}
          <div className={`grid gap-3 ${block.items.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {block.items.map((item, i) => (
              <div key={i} className="bg-surface-alt/50 border border-border rounded-lg p-4"
                style={item.color ? { borderTopWidth: 3, borderTopColor: item.color } : {}}>
                <h4 className="text-[12.5px] font-bold text-navy mb-1.5">{item.title}</h4>
                <p className="text-[11px] text-text-secondary leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )

    case 'do-dont':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-50/70 border border-green-200 rounded-lg p-3.5">
            <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Check size={12} /> Do this
            </p>
            <div className="space-y-1.5">
              {block.doItems.map((item, i) => (
                <p key={i} className="text-[11px] text-green-800 leading-relaxed pl-5 relative"><span className="absolute left-0 text-green-600 font-bold">✓</span>{item}</p>
              ))}
            </div>
          </div>
          <div className="bg-red-50/70 border border-red-200 rounded-lg p-3.5">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <X size={12} /> Avoid this
            </p>
            <div className="space-y-1.5">
              {block.dontItems.map((item, i) => (
                <p key={i} className="text-[11px] text-red-800 leading-relaxed pl-5 relative"><span className="absolute left-0 text-red-500 font-bold">✗</span>{item}</p>
              ))}
            </div>
          </div>
        </div>
      )

    case 'table':
      return (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="bg-surface-alt">
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {block.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} className="px-3 py-2.5 text-[11px] text-text-secondary leading-relaxed">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    default:
      return null
  }
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

type ViewState =
  | { page: 'home' }
  | { page: 'category'; categoryId: string }
  | { page: 'guide'; guideId: string; tab: 'guide' | 'research' }
  | { page: 'phonics'; section: 'sequence' | 'strategies' | 'assessment' | 'fluency' }
  | { page: 'pdlog' }
  | { page: 'subplans' }

export default function TeacherGuidesView() {
  const { language } = useApp()
  const ko = language === 'ko'
  const [view, setView] = useState<ViewState>({ page: 'home' })
  const [searchQuery, setSearchQuery] = useState('')

  // Search
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return GUIDES.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const currentGuide = view.page === 'guide' ? GUIDES.find(g => g.id === view.guideId) : null
  const currentCategory = view.page === 'category' ? CATEGORIES.find(c => c.id === view.categoryId) : null
  const categoryGuides = view.page === 'category' ? GUIDES.filter(g => g.category === view.categoryId) : []

  // ── Phonics & References (re-linked from TeacherReferences) ──────

  if (view.page === 'phonics') {
    const PHONICS_TABS = [
      { id: 'sequence' as const, label: ko ? '파닉스 순서' : 'Phonics Scope & Sequence', icon: Layers },
      { id: 'strategies' as const, label: ko ? '교수 전략' : 'Teaching Strategies', icon: BookOpen },
      { id: 'assessment' as const, label: ko ? '평가 문해력' : 'Assessment Literacy', icon: ClipboardList },
      { id: 'fluency' as const, label: ko ? '읽기 유창성' : 'Reading Fluency', icon: BookMarked },
    ]
    return (
      <div className="animate-fade-in">
        <div className="bg-surface border-b border-border px-8 py-5">
          <button onClick={() => setView({ page: 'home' })}
            className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-navy transition-colors mb-2">
            <ChevronLeft size={13} /> {ko ? '전체 카테고리' : 'All Categories'}
          </button>
          <h2 className="font-display text-xl font-bold text-navy">{ko ? '파닉스 & 기초 기술' : 'Phonics & Foundational Skills'}</h2>
          <p className="text-[12px] text-text-secondary mt-1">{ko ? '과학적 읽기 연구 기반 체계적 파닉스 참고 자료' : 'Science of Reading research-backed phonics reference, teaching strategies, and assessment guidance'}</p>
          <div className="flex gap-1 mt-4">
            {PHONICS_TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setView({ page: 'phonics', section: id })}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  view.section === id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
                }`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="px-8 py-6 max-w-5xl">
          {view.section === 'sequence' && <PhonicsSequence />}
          {view.section === 'strategies' && <PhonicsStrategies />}
          {view.section === 'assessment' && <AssessmentLiteracy />}
          {view.section === 'fluency' && <ReadingFluencyGuide />}
        </div>
      </div>
    )
  }

  // ── Guide Detail ──────────────────────────────────────────────

  if (view.page === 'subplans') {
    return (
      <div className="animate-fade-in">
        <div className="bg-surface border-b border-border px-8 py-5">
          <button onClick={() => setView({ page: 'home' })} className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-navy transition-colors mb-2">
            <ChevronLeft size={13} /> {ko ? '전체 카테고리' : 'All Categories'}
          </button>
          <h2 className="font-display text-xl font-bold text-navy">{ko ? '대체 교사 활동' : 'Sub Plans & Emergency Activities'}</h2>
          <p className="text-[12px] text-text-secondary mt-1">{ko ? '대체 교사를 위한 준비된 활동' : 'Ready-to-go activities for substitute teachers or emergency coverage.'}</p>
        </div>
        <SubPlansContent />
      </div>
    )
  }

  if (view.page === 'pdlog') {
    return (
      <div className="animate-fade-in">
        <div className="bg-surface border-b border-border px-8 py-5">
          <button onClick={() => setView({ page: 'home' })} className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-navy transition-colors mb-2">
            <ChevronLeft size={13} /> {ko ? '전체 카테고리' : 'All Categories'}
          </button>
          <h2 className="font-display text-xl font-bold text-navy">{ko ? '전문성 개발 일지' : 'Professional Development Log'}</h2>
          <p className="text-[12px] text-text-secondary mt-1">{ko ? '워크숍, 독서, 동료 관찰, 개인 교수 목표 기록' : 'Track workshops, readings, peer observations, and personal teaching goals.'}</p>
        </div>
        <PDLogContent />
      </div>
    )
  }

  if (view.page === 'guide' && currentGuide) {
    const cat = CATEGORIES.find(c => c.id === currentGuide.category)!
    const tab = view.tab

    return (
      <div className="animate-fade-in">
        <div className="bg-surface border-b border-border px-8 py-5">
          <button onClick={() => setView({ page: 'category', categoryId: currentGuide.category })}
            className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-navy transition-colors mb-2">
            <ChevronLeft size={13} /> {cat.label}
          </button>
          <h2 className="font-display text-xl font-bold text-navy leading-tight">{currentGuide.title}</h2>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[11px] font-semibold" style={{ color: cat.color }}>{currentGuide.source}</span>
            {currentGuide.sourceUrl && (
              <a href={currentGuide.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-text-muted hover:text-navy transition-colors">
                <ExternalLink size={10} /> Original
              </a>
            )}
          </div>
          <div className="flex gap-1 mt-4">
            {([
              ['guide', ko ? '가이드' : 'Guide', BookOpen],
              ['research', ko ? '연구 & 연결' : 'Research & Connections', Link2],
            ] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setView({ ...view, tab: id as any })}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium transition-all ${
                  tab === id ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary hover:bg-border'
                }`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 py-6 max-w-4xl">
          {tab === 'guide' && (
            <>
              {/* Summary + When to Use */}
              <div className="bg-navy/5 border border-navy/10 rounded-xl p-5 mb-6">
                <p className="text-[13px] text-text-secondary leading-relaxed">{currentGuide.summary}</p>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3">
                  <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">
                    {ko ? '활용 시기' : 'When to use this'}
                  </p>
                  <p className="text-[12px] text-amber-800 font-medium leading-relaxed">{currentGuide.whenToUse}</p>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-6">
                {currentGuide.tags.map(tag => (
                  <span key={tag} className="text-[9px] px-2.5 py-0.5 rounded-full bg-surface-alt text-text-secondary font-medium uppercase tracking-wide border border-border">
                    {tag}
                  </span>
                ))}
              </div>

              {/* Sections */}
              {currentGuide.sections.map((section, si) => (
                <div key={si} className="bg-surface border border-border rounded-xl p-5 mb-4">
                  <h3 className="text-[14px] font-bold text-navy mb-3">{section.title}</h3>
                  <div className="space-y-4">
                    {section.blocks.map((block, bi) => (
                      <BlockRenderer key={bi} block={block} catColor={cat.color} />
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}

          {tab === 'research' && (
            <>
              {/* Related Research */}
              <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                <h3 className="text-[14px] font-bold text-navy mb-1">{ko ? '관련 연구' : 'Research Foundations'}</h3>
                <p className="text-[11px] text-text-tertiary mb-4">Theories and frameworks that support the strategies in this guide</p>
                <div className="space-y-2.5">
                  {currentGuide.relatedResearch.map((ref, i) => (
                    <div key={i} className="bg-surface-alt/50 border border-border rounded-lg p-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[12.5px] font-bold text-navy">{ref.concept}</span>
                        <span className="text-[10px] text-text-tertiary">({ref.author})</span>
                      </div>
                      <p className="text-[11.5px] text-text-secondary leading-relaxed mt-1">{ref.connection}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Related Guides */}
              {currentGuide.relatedGuides.length > 0 && (
                <div className="bg-surface border border-border rounded-xl p-5 mb-6">
                  <h3 className="text-[14px] font-bold text-navy mb-1">{ko ? '관련 가이드' : 'Related Guides'}</h3>
                  <p className="text-[11px] text-text-tertiary mb-4">Other guides in this library that connect to this topic</p>
                  <div className="space-y-1.5">
                    {currentGuide.relatedGuides.map(id => {
                      const related = GUIDES.find(g => g.id === id)
                      if (!related) return null
                      const relCat = CATEGORIES.find(c => c.id === related.category)
                      return (
                        <button key={id} onClick={() => setView({ page: 'guide', guideId: id, tab: 'guide' })}
                          className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-alt/50 border border-border hover:shadow-sm transition-all group">
                          <ArrowRight size={13} className="text-text-muted group-hover:text-navy transition-colors shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold text-navy group-hover:text-gold transition-colors truncate">{related.title}</p>
                            <p className="text-[10px] font-medium mt-0.5" style={{ color: relCat?.color }}>{relCat?.label}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )
  }

  // ── Search Results ────────────────────────────────────────────

  if (searchResults) {
    return (
      <div className="animate-fade-in">
        <div className="bg-surface border-b border-border px-8 py-5">
          <h2 className="font-display text-2xl font-bold text-navy">{ko ? '교사 가이드' : 'Teacher Guides'}</h2>
          <p className="text-[12px] text-text-secondary mt-1">{ko ? '연구 기반 교실 전략 참고 자료' : 'Research-backed classroom strategy reference'}</p>
          <div className="mt-4 relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder={ko ? '가이드 검색...' : 'Search guides...'}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface-alt border border-border rounded-lg outline-none focus:border-navy/30" />
          </div>
        </div>
        <div className="px-8 py-6 max-w-3xl">
          <p className="text-[11px] text-text-secondary mb-4">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"</p>
          {searchResults.length === 0 ? (
            <p className="text-[13px] text-text-muted py-8 text-center">No guides match your search.</p>
          ) : (
            <div className="space-y-2">
              {searchResults.map(guide => {
                const cat = CATEGORIES.find(c => c.id === guide.category)
                return (
                  <button key={guide.id} onClick={() => { setView({ page: 'guide', guideId: guide.id, tab: 'guide' }); setSearchQuery('') }}
                    className="w-full text-left bg-surface border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-all group"
                    style={{ borderLeftWidth: 3, borderLeftColor: cat?.color }}>
                    <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cat?.color }}>{cat?.label}</span>
                    <h3 className="font-display text-[13.5px] font-semibold text-navy mt-0.5 group-hover:text-gold transition-colors">{guide.title}</h3>
                    <p className="text-[11.5px] text-text-secondary leading-relaxed mt-1">{guide.summary}</p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Guide List (category) ─────────────────────────────────────

  if (view.page === 'category' && currentCategory) {
    const CatIcon = ICON_MAP[currentCategory.icon] || BookMarked
    return (
      <div className="animate-fade-in">
        <div className="bg-surface border-b border-border px-8 py-5">
          <button onClick={() => setView({ page: 'home' })}
            className="inline-flex items-center gap-1 text-[11px] text-text-secondary hover:text-navy transition-colors mb-2">
            <ChevronLeft size={13} /> {ko ? '전체 카테고리' : 'All Categories'}
          </button>
          <div className="flex items-center gap-2.5">
            <div style={{ color: currentCategory.color }}><CatIcon size={20} /></div>
            <h2 className="font-display text-xl font-bold text-navy">{currentCategory.label}</h2>
          </div>
          <p className="text-[12px] text-text-secondary mt-1">{currentCategory.description}</p>
        </div>
        <div className="px-8 py-6 max-w-3xl">
          <div className="space-y-2">
            {categoryGuides.map(guide => (
              <button key={guide.id} onClick={() => setView({ page: 'guide', guideId: guide.id, tab: 'guide' })}
                className="w-full text-left bg-surface border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-all group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[13.5px] font-semibold text-navy group-hover:text-gold transition-colors">{guide.title}</h3>
                    <p className="text-[11px] font-medium mt-0.5" style={{ color: currentCategory.color }}>{guide.source}</p>
                  </div>
                  <ChevronRight size={16} className="text-border mt-0.5 shrink-0" />
                </div>
                <p className="text-[11.5px] text-text-secondary leading-relaxed mt-2">{guide.summary}</p>
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {guide.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-surface-alt text-text-muted font-medium">{tag}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Home: Category Grid ───────────────────────────────────────

  return (
    <div className="animate-fade-in">
      <div className="bg-surface border-b border-border px-8 py-5">
        <h2 className="font-display text-2xl font-bold text-navy">{ko ? '교사 가이드' : 'Teacher Guides'}</h2>
        <p className="text-[12px] text-text-secondary mt-1">
          {ko ? '연구 기반 교실 전략 참고 자료' : 'Research-backed classroom strategy reference. Browse by topic or search.'}
        </p>
        <div className="mt-4 relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={ko ? '가이드 검색...' : 'Search guides...'}
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface-alt border border-border rounded-lg outline-none focus:border-navy/30" />
        </div>
      </div>
      <div className="px-8 py-6">
        <div className="flex items-center gap-4 mb-5 text-[11px] text-text-secondary">
          <span className="font-semibold text-navy">{GUIDES.length + 4} {ko ? '개 가이드' : 'guides'}</span>
          <span className="text-border">|</span>
          <span>{CATEGORIES.length + 1} {ko ? '개 카테고리' : 'categories'}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-[900px]">
          {/* Phonics & Foundational Skills — special card linking to TeacherReferences */}
          <button onClick={() => setView({ page: 'phonics', section: 'sequence' })}
            className="text-left bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            style={{ borderTopWidth: 3, borderTopColor: '#F97316' }}>
            <div className="flex items-start justify-between mb-3">
              <div style={{ color: '#F97316' }}><Layers size={20} /></div>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                style={{ color: '#F97316', background: '#F9731612' }}>
                4
              </span>
            </div>
            <h3 className="font-display text-[13.5px] font-semibold text-navy group-hover:text-gold transition-colors leading-tight">Phonics & Foundational Skills</h3>
            <p className="text-[10.5px] text-text-secondary leading-relaxed mt-1.5">Systematic phonics scope & sequence, teaching strategies, assessment literacy, and reading fluency guidance</p>
          </button>
          {/* #34: Sub Plans card */}
          <button onClick={() => setView({ page: 'subplans' })}
            className="text-left bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            style={{ borderTopWidth: 3, borderTopColor: '#EF4444' }}>
            <div className="flex items-start justify-between mb-3">
              <div style={{ color: '#EF4444' }}><Lightbulb size={20} /></div>
            </div>
            <h3 className="font-display text-[13.5px] font-semibold text-navy group-hover:text-gold transition-colors leading-tight">Sub Plans</h3>
            <p className="text-[10.5px] text-text-secondary leading-relaxed mt-1.5">Emergency activities and substitute teacher plans organized by grade and skill level</p>
          </button>
          {CATEGORIES.map(cat => {
            const CatIcon = ICON_MAP[cat.icon] || BookMarked
            const count = guideCountByCategory(cat.id)
            return (
              <button key={cat.id} onClick={() => setView({ page: 'category', categoryId: cat.id })}
                className="text-left bg-surface border border-border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                style={{ borderTopWidth: 3, borderTopColor: cat.color }}>
                <div className="flex items-start justify-between mb-3">
                  <div style={{ color: cat.color }}><CatIcon size={20} /></div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                    style={{ color: cat.color, background: `${cat.color}12` }}>
                    {count || '--'}
                  </span>
                </div>
                <h3 className="font-display text-[13.5px] font-semibold text-navy group-hover:text-gold transition-colors leading-tight">{cat.label}</h3>
                <p className="text-[10.5px] text-text-secondary leading-relaxed mt-1.5">{cat.description}</p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── #41 Professional Development Log ─────────────────────────────────

function PDLogContent() {
  const { currentTeacher, showToast } = useApp()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'workshop', title: '', notes: '', tags: '' })

  const PD_TYPES = [
    { value: 'workshop', label: 'Workshop/Training' },
    { value: 'book', label: 'Book/Article' },
    { value: 'peer_observation', label: 'Peer Observation' },
    { value: 'conference', label: 'Conference' },
    { value: 'online_course', label: 'Online Course' },
    { value: 'personal_goal', label: 'Teaching Goal' },
    { value: 'reflection', label: 'Reflection' },
  ]

  useEffect(() => {
    (async () => {
      if (!currentTeacher) { setLoading(false); return }
      const { data } = await supabase.from('pd_log').select('*').eq('teacher_id', currentTeacher.id).order('created_at', { ascending: false })
      setEntries(data || [])
      setLoading(false)
    })()
  }, [currentTeacher?.id])

  const handleAdd = async () => {
    if (!form.title.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('pd_log').insert({
      teacher_id: currentTeacher.id, pd_type: form.type, title: form.title.trim(),
      notes: form.notes.trim() || null,
      tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }).select().single()
    if (error) { showToast('Error saving'); return }
    if (data) setEntries(prev => [data, ...prev])
    setForm({ type: 'workshop', title: '', notes: '', tags: '' })
    setShowForm(false)
    showToast('PD entry added')
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const typeLabel = (t: string) => PD_TYPES.find(p => p.value === t)?.label || t
  const typeColor = (t: string) => {
    const colors: Record<string, string> = { workshop: 'bg-blue-100 text-blue-700', book: 'bg-purple-100 text-purple-700', peer_observation: 'bg-green-100 text-green-700', conference: 'bg-amber-100 text-amber-700', online_course: 'bg-cyan-100 text-cyan-700', personal_goal: 'bg-red-100 text-red-700', reflection: 'bg-indigo-100 text-indigo-700' }
    return colors[t] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="px-8 py-6 max-w-[700px]">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[12px] text-text-secondary">{entries.length} entries</span>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">
          {showForm ? 'Cancel' : '+ Add Entry'}
        </button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-4 space-y-3">
          <div>
            <label className="text-[10px] font-semibold text-text-secondary uppercase block mb-1">Type</label>
            <div className="flex gap-1 flex-wrap">
              {PD_TYPES.map(pt => (
                <button key={pt.value} onClick={() => setForm(f => ({ ...f, type: pt.value }))}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-medium ${form.type === pt.value ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border'}`}>
                  {pt.label}
                </button>
              ))}
            </div>
          </div>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Title (e.g., 'Orton-Gillingham Level 1 Training')"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Key takeaways or notes (optional)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface resize-none h-20" />
          <input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated: phonics, assessment, ELL)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
          <button onClick={handleAdd} disabled={!form.title.trim()} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white disabled:opacity-40">Save Entry</button>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="py-12 text-center text-text-tertiary text-[13px]">No PD entries yet. Start tracking your professional growth!</div>
      ) : (
        <div className="space-y-2">
          {entries.map(e => (
            <div key={e.id} className="bg-surface border border-border rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${typeColor(e.pd_type)}`}>{typeLabel(e.pd_type)}</span>
                <span className="text-[10px] text-text-tertiary ml-auto">{new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <h4 className="text-[13px] font-semibold text-navy">{e.title}</h4>
              {e.notes && <p className="text-[11px] text-text-secondary mt-1 leading-relaxed">{e.notes}</p>}
              {e.tags?.length > 0 && (
                <div className="flex gap-1 mt-2">
                  {e.tags.map((tag: string) => <span key={tag} className="text-[8px] font-medium px-1.5 py-0.5 rounded bg-surface-alt text-text-tertiary">#{tag}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── #34 Sub Plans / Emergency Activity Library ───────────────────────

function SubPlansContent() {
  const { currentTeacher, showToast } = useApp()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterClass, setFilterClass] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', english_class: currentTeacher?.english_class || 'Lily', grade: 3, description: '', how_to: '', drive_link: '' })

  const CLASSES = ['Lily', 'Camellia', 'Daisy', 'Sunflower', 'Marigold', 'Snapdragon']

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('sub_plans').select('*, teachers(english_name)').order('english_class').order('created_at', { ascending: false })
      setPlans(data || [])
      setLoading(false)
    })()
  }, [])

  const handleAdd = async () => {
    if (!form.title.trim() || !currentTeacher) return
    const { data, error } = await supabase.from('sub_plans').insert({
      title: form.title.trim(), english_class: form.english_class, grade: form.grade,
      description: form.description.trim() || null, how_to: form.how_to.trim() || null,
      drive_link: form.drive_link.trim() || null, created_by: currentTeacher.id,
    }).select('*, teachers(english_name)').single()
    if (error) { showToast(`Error: ${error.message}`); return }
    if (data) setPlans(prev => [data, ...prev])
    setForm({ title: '', english_class: currentTeacher?.english_class || 'Lily', grade: 3, description: '', how_to: '', drive_link: '' })
    setShowForm(false)
    showToast('Sub plan added')
  }

  const handleDelete = async (id: string) => {
    await supabase.from('sub_plans').delete().eq('id', id)
    setPlans(prev => prev.filter(p => p.id !== id))
    showToast('Deleted')
  }

  if (loading) return <div className="p-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  const filtered = filterClass === 'all' ? plans : plans.filter(p => p.english_class === filterClass)
  const grouped: Record<string, any[]> = {}
  filtered.forEach(p => {
    const key = `${p.english_class} (Grade ${p.grade})`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(p)
  })

  return (
    <div className="px-8 py-6 max-w-[900px]">
      <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5 text-[11px] text-red-800">
        Each teacher uploads sub plans for their class. Include lesson descriptions, how to administer, and optionally link to Google Drive materials.
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          <button onClick={() => setFilterClass('all')}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border'}`}>All Classes</button>
          {CLASSES.map(c => (
            <button key={c} onClick={() => setFilterClass(c)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${filterClass === c ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary border border-border'}`}>{c}</button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white">{showForm ? 'Cancel' : '+ Add Sub Plan'}</button>
      </div>

      {showForm && (
        <div className="bg-surface border border-border rounded-xl p-5 mb-5 space-y-3">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Lesson title"
            className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-surface" />
          <div className="flex gap-3">
            <select value={form.english_class} onChange={e => setForm(f => ({ ...f, english_class: e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={form.grade} onChange={e => setForm(f => ({ ...f, grade: +e.target.value }))}
              className="px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none">
              {[1,2,3,4,5].map(g => <option key={g} value={g}>Grade {g}</option>)}
            </select>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description of the lesson (what students will do)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-16" />
          <textarea value={form.how_to} onChange={e => setForm(f => ({ ...f, how_to: e.target.value }))} placeholder="How to administer (step-by-step for the substitute)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none resize-none h-16" />
          <input value={form.drive_link} onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))} placeholder="Google Drive link (optional)"
            className="w-full px-3 py-2 border border-border rounded-lg text-[11px] bg-surface outline-none" />
          <button onClick={handleAdd} disabled={!form.title.trim()} className="px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white disabled:opacity-40">Save Sub Plan</button>
        </div>
      )}

      {Object.keys(grouped).length === 0 && <p className="text-center text-text-tertiary py-8 text-[12px]">No sub plans yet. Add one for your class.</p>}

      {Object.entries(grouped).map(([key, items]) => (
        <div key={key} className="mb-5">
          <h3 className="text-[13px] font-bold text-navy mb-2">{key}</h3>
          <div className="space-y-2">
            {items.map(p => (
              <div key={p.id} className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <h4 className="text-[13px] font-semibold text-navy">{p.title}</h4>
                  <div className="flex items-center gap-2">
                    {p.drive_link && (
                      <a href={p.drive_link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-600 hover:underline font-medium">Google Drive</a>
                    )}
                    {currentTeacher?.id === p.created_by && (
                      <button onClick={() => handleDelete(p.id)} className="text-[10px] text-red-400 hover:text-red-600">Delete</button>
                    )}
                  </div>
                </div>
                {p.description && <p className="text-[11px] text-text-primary leading-relaxed mt-1">{p.description}</p>}
                {p.how_to && (
                  <div className="mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <p className="text-[9px] font-bold text-amber-700 uppercase mb-0.5">How to Administer:</p>
                    <p className="text-[10px] text-amber-800 leading-relaxed whitespace-pre-line">{p.how_to}</p>
                  </div>
                )}
                <p className="text-[9px] text-text-tertiary mt-2">Added by {p.teachers?.english_name || 'Unknown'} on {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
