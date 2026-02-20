'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import {
  Search, ChevronLeft, ChevronRight, ExternalLink,
  Layers, BookOpen, PenTool, MessageSquare, ClipboardList, Heart,
  Layout, Star, Globe, BookMarked, Check, X, Lightbulb, ArrowRight,
  Link2
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
                <p key={i} className="text-[11px] text-green-800 leading-relaxed pl-3 relative before:content-['\\2713'] before:absolute before:left-0 before:text-green-500 before:text-[10px]">{item}</p>
              ))}
            </div>
          </div>
          <div className="bg-red-50/70 border border-red-200 rounded-lg p-3.5">
            <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <X size={12} /> Avoid this
            </p>
            <div className="space-y-1.5">
              {block.dontItems.map((item, i) => (
                <p key={i} className="text-[11px] text-red-800 leading-relaxed pl-3 relative before:content-['\\2717'] before:absolute before:left-0 before:text-red-400 before:text-[10px]">{item}</p>
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
