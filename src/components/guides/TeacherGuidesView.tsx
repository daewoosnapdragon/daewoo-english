'use client'

import { useState, useMemo } from 'react'
import { useApp } from '@/lib/context'
import {
  Search, ChevronLeft, ChevronDown, ChevronRight, ExternalLink,
  Layers, BookOpen, PenTool, MessageSquare, ClipboardList, Heart,
  Layout, Star, Globe, BookMarked
} from 'lucide-react'
import { CATEGORIES, GUIDES, type Guide, type Category, type GuideSection } from './teacher-guides-data'

// ─── Icon Map ───────────────────────────────────────────────────

const ICON_MAP: Record<string, any> = {
  'layers': Layers,
  'book-open': BookOpen,
  'pen-tool': PenTool,
  'message-square': MessageSquare,
  'clipboard': ClipboardList,
  'heart': Heart,
  'layout': Layout,
  'star': Star,
  'globe': Globe,
}

// ─── Guide Count Helper ─────────────────────────────────────────

function guideCountByCategory(catId: string): number {
  return GUIDES.filter(g => g.category === catId).length
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function TeacherGuidesView() {
  const { language } = useApp()
  const ko = language === 'ko'

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [selectedGuide, setSelectedGuide] = useState<string | null>(null)
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')

  // Search across all guides
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return null
    const q = searchQuery.toLowerCase()
    return GUIDES.filter(g =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q)) ||
      g.sections.some(s =>
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        (s.subsections || []).some(ss => ss.content.toLowerCase().includes(q))
      )
    )
  }, [searchQuery])

  const currentGuide = selectedGuide ? GUIDES.find(g => g.id === selectedGuide) : null
  const currentCategory = selectedCategory ? CATEGORIES.find(c => c.id === selectedCategory) : null
  const categoryGuides = selectedCategory ? GUIDES.filter(g => g.category === selectedCategory) : []

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(idx)) next.delete(idx)
      else next.add(idx)
      return next
    })
  }

  // ── Guide Detail View ─────────────────────────────────────────

  if (currentGuide) {
    const cat = CATEGORIES.find(c => c.id === currentGuide.category)
    return (
      <div className="min-h-screen bg-surface">
        {/* Header */}
        <div className="bg-white border-b border-border px-10 py-6">
          <button
            onClick={() => { setSelectedGuide(null); setExpandedSections(new Set()) }}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-navy transition-colors mb-3"
          >
            <ChevronLeft size={14} />
            {ko ? '목록으로' : `Back to ${cat?.label || 'guides'}`}
          </button>

          <h2 className="font-display text-xl font-semibold text-navy leading-tight">
            {currentGuide.title}
          </h2>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] font-semibold" style={{ color: cat?.color }}>
              {currentGuide.source}
            </span>
            {currentGuide.sourceUrl && (
              <a
                href={currentGuide.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-navy transition-colors"
              >
                <ExternalLink size={10} /> {ko ? '원본 보기' : 'View original'}
              </a>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {currentGuide.tags.map(tag => (
              <span
                key={tag}
                className="text-[10px] px-2.5 py-0.5 rounded-full bg-surface-alt text-text-secondary font-medium uppercase tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-10 py-6 max-w-[820px]">
          {/* Summary + When to Use */}
          <div
            className="bg-white border border-border rounded-xl p-5 mb-5"
            style={{ borderLeftWidth: 3, borderLeftColor: cat?.color }}
          >
            <p className="text-[13px] text-text-primary leading-relaxed">
              {currentGuide.summary}
            </p>
            <div className="mt-3 px-3.5 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                {ko ? '활용 시기' : 'When to use'}
              </span>
              <p className="text-[12px] text-amber-900 mt-1 leading-relaxed">
                {currentGuide.whenToUse}
              </p>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-2">
            {currentGuide.sections.map((section, idx) => {
              const isOpen = expandedSections.has(idx)
              return (
                <div key={idx} className="bg-white border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => toggleSection(idx)}
                    className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-surface-alt/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{
                          background: isOpen ? cat?.color : '#f0f4f8',
                          color: isOpen ? 'white' : '#6b7280',
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span className="text-[13px] font-semibold text-navy">
                        {section.title}
                      </span>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 border-t border-border/50">
                      <p className="text-[12.5px] text-text-primary leading-[1.7] mt-3.5">
                        {section.content}
                      </p>

                      {section.subsections && section.subsections.length > 0 && (
                        <div className="mt-4 space-y-3">
                          {section.subsections.map((sub, si) => (
                            <div key={si} className="pl-4 border-l-2" style={{ borderColor: `${cat?.color}40` }}>
                              <span className="text-[11px] font-bold text-text-secondary uppercase tracking-wide">
                                {sub.title}
                              </span>
                              <p className="text-[12px] text-text-primary leading-[1.65] mt-1">
                                {sub.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── Search Results View ───────────────────────────────────────

  if (searchResults) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-white border-b border-border px-10 pt-8 pb-5">
          <h2 className="font-display text-[22px] font-semibold text-navy tracking-tight">
            {ko ? '교사 가이드' : 'Teacher Guides'}
          </h2>
          <p className="text-[12px] text-text-secondary mt-1">
            {ko ? '연구 기반 가이드 요약' : 'Research-backed guides summarized for quick reference'}
          </p>
          <div className="mt-4 relative max-w-md">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder={ko ? '모든 가이드 검색...' : 'Search all guides...'}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface-alt border border-border rounded-lg outline-none focus:border-navy/30 transition-colors"
            />
          </div>
        </div>
        <div className="px-10 py-6">
          <p className="text-[12px] text-text-secondary mb-4">
            {searchResults.length} {ko ? '개 결과' : `result${searchResults.length !== 1 ? 's' : ''}`} for &ldquo;{searchQuery}&rdquo;
          </p>
          {searchResults.length === 0 ? (
            <p className="text-[13px] text-text-muted py-8 text-center">
              {ko ? '검색 결과가 없습니다.' : 'No guides match your search. Try different keywords.'}
            </p>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {searchResults.map(guide => {
                const cat = CATEGORIES.find(c => c.id === guide.category)
                return (
                  <button
                    key={guide.id}
                    onClick={() => { setSelectedGuide(guide.id); setSearchQuery('') }}
                    className="w-full text-left bg-white border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: cat?.color }}>
                          {cat?.label}
                        </span>
                        <h3 className="font-display text-[14px] font-semibold text-navy mt-0.5 group-hover:text-gold transition-colors">
                          {guide.title}
                        </h3>
                      </div>
                      <ChevronRight size={16} className="text-border mt-1 shrink-0" />
                    </div>
                    <p className="text-[12px] text-text-secondary leading-relaxed mt-1.5 line-clamp-2">
                      {guide.summary}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Guide List View (within a category) ───────────────────────

  if (selectedCategory && currentCategory) {
    const CatIcon = ICON_MAP[currentCategory.icon] || BookMarked
    return (
      <div className="min-h-screen bg-surface">
        <div className="bg-white border-b border-border px-10 py-6">
          <button
            onClick={() => setSelectedCategory(null)}
            className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-navy transition-colors mb-3"
          >
            <ChevronLeft size={14} />
            {ko ? '전체 카테고리' : 'All Categories'}
          </button>
          <div className="flex items-center gap-2.5">
            <div style={{ color: currentCategory.color }}>
              <CatIcon size={22} />
            </div>
            <h2 className="font-display text-xl font-semibold text-navy">
              {currentCategory.label}
            </h2>
          </div>
          <p className="text-[12px] text-text-secondary mt-1">
            {currentCategory.description}
          </p>
        </div>

        <div className="px-10 py-6">
          <div className="space-y-2 max-w-2xl">
            {categoryGuides.map(guide => (
              <button
                key={guide.id}
                onClick={() => setSelectedGuide(guide.id)}
                className="w-full text-left bg-white border border-border rounded-xl px-5 py-4 hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[14px] font-semibold text-navy group-hover:text-gold transition-colors">
                      {guide.title}
                    </h3>
                    <p className="text-[11px] font-medium mt-0.5" style={{ color: currentCategory.color }}>
                      {guide.source}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-border mt-1 shrink-0" />
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed mt-2">
                  {guide.summary}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {guide.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded-full bg-surface-alt text-text-muted font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── Category Grid View (Home) ─────────────────────────────────

  return (
    <div className="min-h-screen bg-surface">
      <div className="bg-white border-b border-border px-10 pt-8 pb-5">
        <h2 className="font-display text-[22px] font-semibold text-navy tracking-tight">
          {ko ? '교사 가이드' : 'Teacher Guides'}
        </h2>
        <p className="text-[12px] text-text-secondary mt-1">
          {ko
            ? '연구 기반 가이드 — 주제별로 찾아보거나 검색하세요'
            : 'Research-backed guides summarized for quick reference. Browse by topic or search for strategies.'}
        </p>
        <div className="mt-4 relative max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={ko ? '모든 가이드 검색...' : 'Search all guides...'}
            className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface-alt border border-border rounded-lg outline-none focus:border-navy/30 transition-colors"
          />
        </div>
      </div>

      <div className="px-10 py-6">
        {/* Stats bar */}
        <div className="flex items-center gap-4 mb-5 text-[11px] text-text-secondary">
          <span className="font-semibold text-navy">{GUIDES.length} {ko ? '개 가이드' : 'guides'}</span>
          <span className="text-border">|</span>
          <span>{CATEGORIES.length} {ko ? '개 카테고리' : 'categories'}</span>
        </div>

        {/* Category Grid */}
        <div className="grid grid-cols-3 gap-3 max-w-[900px]">
          {CATEGORIES.map(cat => {
            const CatIcon = ICON_MAP[cat.icon] || BookMarked
            const count = guideCountByCategory(cat.id)
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className="text-left bg-white border border-border rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all group"
                style={{ borderLeftWidth: 3, borderLeftColor: cat.color }}
              >
                <div className="flex items-start justify-between">
                  <div style={{ color: cat.color }}>
                    <CatIcon size={20} />
                  </div>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wide"
                    style={{ color: cat.color, background: `${cat.color}12` }}
                  >
                    {count} {count === 1 ? (ko ? '가이드' : 'GUIDE') : (ko ? '가이드' : 'GUIDES')}
                  </span>
                </div>
                <h3 className="font-display text-[14px] font-semibold text-navy mt-3 group-hover:text-gold transition-colors leading-tight">
                  {cat.label}
                </h3>
                <p className="text-[11px] text-text-secondary leading-relaxed mt-1.5">
                  {cat.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
