'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';
import ModuleNotes from './ModuleNotes';
import StoryProfileModal from './StoryProfileModal';
import StoryJournal from './StoryJournal';
import { useAuth } from '@/lib/auth-context';
import { useBill, BillLoading } from './Bill';
import { BookTOC, ConstellationDot, OrbitSection, OrbitCard, ResourceOrbitGrid, Breadcrumb } from './ir-browser';
import {
  CURRICULUM,
  findModule,
  getModuleStoryTitles,
  matchStoryTitle,
  CurriculumModule,
  CurriculumStory,
} from '@/lib/curriculum-data';

interface IRBrowserProps {
  onSelectResource: (resource: Resource) => void;
  onPresent?: (resource: Resource & { file_url?: string }) => void;
  initialStory?: string;
}

interface CanonicalStoryGroup {
  title: string;
  author?: string;
  genre: string;
  type: string;
  powerWords: string[];
  week: number;
  resources: (Resource & { file_url?: string })[];
  hasProfile: boolean;
  profileResourceId?: string;
}

interface ModuleData {
  module_num: number;
  curriculum: CurriculumModule;
  teachingPal: any[];
  stories: CanonicalStoryGroup[];
  other: any[];
  allResources: any[];
}

const SPINE_COLORS = ['#e0a0b0', '#b07888', '#d4b8d4', '#c8899a'];

export default function IRBrowser({ onSelectResource, onPresent, initialStory }: IRBrowserProps) {
  const { isTeacher } = useAuth();
  const { triggerReaction } = useBill();
  const [bookNum, setBookNum] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileModal, setProfileModal] = useState<{ resourceId: string; title: string } | null>(null);
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [pulledBook, setPulledBook] = useState<number | null>(null);
  const [transition, setTransition] = useState<'none' | 'shelf-exit' | 'module-enter'>('none');
  const [recentBook, setRecentBook] = useState<number | null>(null);
  const [storiesCollapsed, setStoriesCollapsed] = useState(false);

  // Resource counts per module per book (from actual uploads)
  const [resourceCounts, setResourceCounts] = useState<Record<number, Record<number, number>>>({});

  useEffect(() => {
    const stored = localStorage.getItem('ir-recent-book');
    if (stored) setRecentBook(Number(stored));
  }, []);

  // Prefetch resource counts for all books (lightweight)
  useEffect(() => {
    async function prefetch() {
      try {
        const res = await fetch('/api/resources?curriculum=into_reading&fields=light&limit=500');
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const counts: Record<number, Record<number, number>> = {};
        for (const r of data) {
          const bnum = Number(r.book_num);
          const mnum = Number(r.module_num);
          if (bnum <= 0 || mnum <= 0) continue;
          if (!counts[bnum]) counts[bnum] = {};
          counts[bnum][mnum] = (counts[bnum][mnum] || 0) + 1;
        }
        setResourceCounts(counts);
      } catch {}
    }
    prefetch();
  }, []);

  // Fetch resources for a module and match to canonical stories
  const fetchModule = useCallback(async (book: number, mod: number) => {
    setLoading(true);
    triggerReaction('loading');

    const curriculumModule = findModule(mod, book);
    if (!curriculumModule) { setLoading(false); return; }

    // Fetch uploaded resources for this module
    let modResources: any[] = [];
    try {
      const res = await fetch(`/api/resources?book=${book}&fields=light&limit=200`);
      const data = await res.json();
      if (Array.isArray(data)) {
        modResources = data
          .filter((r: any) => Number(r.module_num) === mod)
          .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      }
    } catch {}

    // Build canonical story groups
    const matchedResourceIds = new Set<string>();
    const tp: any[] = [];
    const canonicalStories: CanonicalStoryGroup[] = [];

    // Extract teaching pal resources first
    for (const r of modResources) {
      if (r.resource_type === 'Teaching Pal') {
        tp.push(r);
        matchedResourceIds.add(r.id);
      }
    }

    // Build story groups from canonical data
    for (const week of curriculumModule.weeks) {
      for (const story of week.stories) {
        if (story.type !== 'mybook') continue;

        // Match uploaded resources to this canonical story
        const matched = modResources.filter(r => {
          if (matchedResourceIds.has(r.id)) return false;
          const st = (r.story_title || '').trim();
          if (!st) return false;
          const canonical = matchStoryTitle(st, mod, book);
          return canonical === story.title;
        });

        for (const r of matched) matchedResourceIds.add(r.id);

        canonicalStories.push({
          title: story.title,
          author: story.author,
          genre: story.genre,
          type: story.type,
          powerWords: story.powerWords || [],
          week: week.week,
          resources: matched,
          hasProfile: false,
        });
      }
    }

    // Check for story profiles
    try {
      const ids = modResources.map((r: any) => r.id);
      if (ids.length > 0) {
        const profRes = await fetch('/api/story-profile/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_ids: ids }),
        });
        const pm = await profRes.json();
        if (pm && typeof pm === 'object') {
          for (const s of canonicalStories) {
            for (const r of s.resources) {
              if (pm[r.id]) {
                s.hasProfile = true;
                s.profileResourceId = r.id;
              }
            }
          }
        }
      }
    } catch {}

    // Unmatched resources go to "other"
    const other = modResources.filter(r => !matchedResourceIds.has(r.id));

    setModuleData({
      module_num: mod,
      curriculum: curriculumModule,
      teachingPal: tp,
      stories: canonicalStories,
      other,
      allResources: modResources,
    });

    // Auto-select first story
    if (canonicalStories.length > 0) setActiveStory(canonicalStories[0].title);
    setLoading(false);
  }, [triggerReaction]);

  useEffect(() => { if (bookNum && selectedModule) fetchModule(bookNum, selectedModule); }, [bookNum, selectedModule, fetchModule]);

  const openBook = (num: number) => {
    localStorage.setItem('ir-recent-book', String(num));
    setRecentBook(num);
    setTransition('shelf-exit');
    setTimeout(() => {
      setBookNum(num);
      setPulledBook(null);
      setTransition('module-enter');
      setTimeout(() => setTransition('none'), 350);
    }, 300);
  };

  const goToModule = (mod: number, storyTitle?: string) => {
    setSelectedModule(mod);
    if (storyTitle) setActiveStory(storyTitle);
  };

  // ========== BOOKSHELF ==========
  if (!bookNum) {
    return (
      <div className={`flex-1 overflow-y-auto page-enter ${transition === 'shelf-exit' ? 'shelf-exit' : ''}`}>
        <div className="max-w-3xl mx-auto p-8">
          <h2 className="text-[10px] font-bold text-cyber-fg uppercase tracking-[0.15em] mb-1">Into Reading</h2>
          <p className="text-[12px] text-cyber-dim mb-8">Pull a book from the shelf</p>

          <div style={{ display: 'flex', gap: 3, height: 400, borderBottom: '2px solid #2a2a2a' }}>
            {CURRICULUM.map((book, i) => {
              const num = book.book_num;
              const isPulled = pulledBook === num;
              const isOther = pulledBook !== null && !isPulled;
              const isRecent = recentBook === num;
              const color = SPINE_COLORS[i];

              return (
                <button key={num}
                  onClick={() => isPulled ? openBook(num) : setPulledBook(isPulled ? null : num)}
                  style={{
                    flex: isPulled ? '1 1 auto' : '0 0 auto',
                    width: isPulled ? undefined : isOther ? 48 : 'calc(25% - 3px)',
                    minWidth: isPulled ? 280 : 48,
                    height: '100%',
                    border: `1px solid ${isPulled ? color : '#2a2a2a'}`,
                    borderBottom: `3px solid ${color}`,
                    background: isPulled ? 'rgba(224,160,176,0.02)' : 'transparent',
                    fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                    padding: 0, overflow: 'hidden',
                    transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: isPulled ? 'translateY(-8px)' : 'none',
                    boxShadow: isPulled ? `0 8px 30px rgba(224,160,176,0.08)` : 'none',
                    display: 'flex', flexDirection: 'column',
                    position: 'relative',
                  }}>

                  {/* Bookmark tab for recent book */}
                  {isRecent && !isPulled && (
                    <div style={{
                      position: 'absolute', top: -1, right: 8,
                      width: 12, height: 20,
                      background: color, opacity: 0.7,
                      clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
                    }} />
                  )}

                  {/* Spine view */}
                  {!isPulled && (
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', height: '100%', gap: 12, padding: '16px 0',
                    }}>
                      <span className="pulse-glow" style={{ fontSize: 18, fontWeight: 600, color }}>{num}</span>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{
                          writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                          fontSize: 11, color, letterSpacing: '0.15em', whiteSpace: 'nowrap', opacity: 0.7,
                        }}>
                          BOOK {num}
                        </span>
                      </div>
                      <span style={{ fontSize: 8, color: '#5a3a42', letterSpacing: '0.1em' }}>
                        {book.modules.length}m
                      </span>
                    </div>
                  )}

                  {/* Pulled out — TABLE OF CONTENTS from canonical data */}
                  {isPulled && (
                    <BookTOC
                      num={num}
                      color={color}
                      resourceCounts={resourceCounts[num] || {}}
                      onOpenBook={() => openBook(num)}
                      onGoToModule={(mod, story) => { openBook(num); setTimeout(() => goToModule(mod, story), 350); }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Shelf shadow */}
          <div style={{ height: 6, background: 'linear-gradient(to bottom, rgba(224,160,176,0.04), transparent)' }} />
        </div>
      </div>
    );
  }

  // ========== MODULE LIST ==========
  if (!selectedModule) {
    const book = CURRICULUM.find(b => b.book_num === bookNum);
    const modules = book?.modules || [];

    return (
      <div className={`flex-1 overflow-y-auto ${transition === 'module-enter' ? 'module-enter' : 'page-enter'}`}>
        <div className="max-w-3xl mx-auto p-8">
          <Breadcrumb steps={[
            { label: 'Books', onClick: () => { setBookNum(null); setSelectedModule(null); setModuleData(null); } },
            { label: `Book ${bookNum}`, active: true },
          ]} />

          <h2 className="text-[10px] font-bold text-cyber-fg uppercase tracking-[0.15em] mb-1 mt-4">Book {bookNum}</h2>
          <p className="text-[12px] text-cyber-dim mb-6">{modules.length} modules</p>

          <div className="space-y-1 stagger-children">
            {modules.map(mod => {
              const storyTitles = getModuleStoryTitles(mod);
              const resCount = resourceCounts[bookNum]?.[mod.module_num] || 0;

              return (
                <div key={mod.module_num} className="border border-cyber-border overflow-hidden hover:border-cyber-fg transition-all group">
                  <button onClick={() => setSelectedModule(mod.module_num)}
                    className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cyber-surface/50 transition-colors">
                    <div style={{
                      width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: '1px solid #2a2a2a', fontSize: 14, color: '#8a5565', fontWeight: 300,
                      transition: 'all 0.2s',
                    }} className="group-hover:border-cyber-fg group-hover:text-cyber-fg">
                      {mod.module_num}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-cyber-fg font-medium">{mod.title}</p>
                      <p className="text-[10px] text-cyber-muted mt-0.5" style={{ fontStyle: 'italic' }}>{mod.essentialQuestion}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-cyber-dim">{resCount} resources</span>
                        <span className="text-[10px] text-cyber-dim">·</span>
                        <span className="text-[10px] text-cyber-dim">{storyTitles.length} stories</span>
                      </div>
                      {storyTitles.length > 0 && (
                        <div className="flex flex-wrap gap-x-2 mt-1.5">
                          {storyTitles.map(s => (
                            <button key={s} onClick={(e) => { e.stopPropagation(); goToModule(mod.module_num, s); }}
                              className="text-[10px] text-cyber-muted hover:text-cyber-fg transition-colors">{s}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-cyber-muted group-hover:text-cyber-fg text-lg transition-colors">›</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ========== MODULE DETAIL VIEW ==========
  const currentStory = moduleData?.stories.find(s => s.title === activeStory);
  const allStories = moduleData?.stories || [];
  const currMod = moduleData?.curriculum;

  return (
    <div className="flex-1 overflow-hidden flex flex-col page-enter">
      {/* Header bar */}
      <div className="px-6 pt-5 pb-3 flex-shrink-0">
        <Breadcrumb steps={[
          { label: 'Books', onClick: () => { setBookNum(null); setSelectedModule(null); setModuleData(null); } },
          { label: `Book ${bookNum}`, onClick: () => { setSelectedModule(null); setModuleData(null); } },
          { label: `Module ${selectedModule}`, active: true },
        ]} />
        <div className="flex items-center justify-between mt-3">
          <div>
            <h2 className="text-[14px] font-bold text-cyber-fg">
              {currMod ? currMod.title : `Module ${selectedModule}`}
            </h2>
            {currMod && (
              <p className="text-[10px] text-cyber-muted mt-0.5" style={{ fontStyle: 'italic' }}>
                {currMod.essentialQuestion}
              </p>
            )}
            <p className="text-[10px] text-cyber-dim mt-1">
              {allStories.length} stories · {moduleData?.allResources.length || 0} resources
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><BillLoading /></div>
      ) : moduleData ? (
        <div className="flex-1 flex overflow-hidden" style={{ borderTop: '1px solid #2a2a2a' }}>
          {/* ===== LEFT: Story nav ===== */}
          <div style={{
            width: storiesCollapsed ? 0 : 220, flexShrink: 0, borderRight: storiesCollapsed ? 'none' : '1px solid',
            borderColor: '#2a2a2a', overflowX: 'hidden', overflowY: storiesCollapsed ? 'hidden' : 'auto',
            transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            background: 'linear-gradient(to bottom, rgba(196,160,212,0.02), transparent)',
          }}>
            <div className="px-4 py-3 border-b border-cyber-border" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="text-[9px] font-bold text-cyber-lilac uppercase tracking-[0.12em]">Stories</div>
            </div>

            {/* Teaching Pal entry */}
            {moduleData.teachingPal.length > 0 && (
              <button onClick={() => setActiveStory('__teaching_pal__')}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] transition-all relative ${
                  activeStory === '__teaching_pal__' ? 'text-cyber-lilac' : 'text-cyber-muted hover:text-cyber-dim'
                }`}>
                <ConstellationDot active={activeStory === '__teaching_pal__'} isLast={allStories.length === 0} />
                <span>Teaching Pal</span>
              </button>
            )}

            {/* Canonical story dots */}
            {allStories.map((story, i) => (
              <button key={story.title}
                onClick={() => setActiveStory(story.title)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] transition-all relative ${
                  activeStory === story.title ? 'text-cyber-fg' : 'text-cyber-muted hover:text-cyber-dim'
                }`}>
                <ConstellationDot active={activeStory === story.title} isLast={i === allStories.length - 1 && moduleData.other.length === 0} />
                <div className="flex-1 min-w-0">
                  <span className="block truncate">{story.title}</span>
                  {story.resources.length > 0 && (
                    <span className="text-[8px] text-cyber-dim">{story.resources.length} files</span>
                  )}
                </div>
                {story.resources.length === 0 && (
                  <span style={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid #3a2a2a', flexShrink: 0 }} />
                )}
              </button>
            ))}

            {/* End of Module Project */}
            <button
              onClick={() => setActiveStory('__end_project__')}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] transition-all relative ${
                activeStory === '__end_project__' ? 'text-cyber-fg' : 'text-cyber-muted hover:text-cyber-dim'
              }`}>
              <ConstellationDot active={activeStory === '__end_project__'} isLast={moduleData.other.length === 0} />
              <span className="truncate" style={{ fontWeight: 500 }}>End of Module Project</span>
              <span style={{ fontSize: 7, padding: '1px 4px', background: 'rgba(212,160,96,0.1)', color: '#d4a060', marginLeft: 'auto', flexShrink: 0 }}>PBL</span>
            </button>

            {/* Other resources */}
            {moduleData.other.length > 0 && (
              <button onClick={() => setActiveStory('__other__')}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] transition-all relative ${
                  activeStory === '__other__' ? 'text-cyber-lilac' : 'text-cyber-muted hover:text-cyber-dim'
                }`}>
                <ConstellationDot active={activeStory === '__other__'} isLast={true} />
                <span>Other Resources</span>
                <span className="text-[8px] text-cyber-dim ml-auto">{moduleData.other.length}</span>
              </button>
            )}
          </div>

          {/* ===== RIGHT: Content ===== */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            {/* Ambient dots */}
            <div className="absolute top-[10%] right-[12%] w-[50px] h-[50px] rounded-full opacity-[0.04] pointer-events-none" style={{ background: '#c4a0d4', animation: 'billFloat 8s ease-in-out infinite' }} />

            {/* Teaching Pal */}
            {activeStory === '__teaching_pal__' && (
              <OrbitSection title="Teaching Pal" subtitle={`${moduleData.teachingPal.length} resources`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {moduleData.teachingPal.map(r => (
                    <OrbitCard key={r.id} resource={r} onSelect={onSelectResource} onPresent={onPresent} />
                  ))}
                </div>
              </OrbitSection>
            )}

            {/* Story view */}
            {currentStory && activeStory !== '__teaching_pal__' && activeStory !== '__other__' && activeStory !== '__end_project__' && (
              <StoryJournal
                bookNum={bookNum}
                moduleNum={selectedModule}
                storyTitle={currentStory.title}
                resources={currentStory.resources}
                allModuleResources={moduleData?.allResources || []}
                hasProfile={currentStory.hasProfile}
                profileResourceId={currentStory.profileResourceId}
                onSelectResource={onSelectResource}
                onPresent={onPresent}
                onOpenProfile={() => {
                  if (currentStory.hasProfile && currentStory.profileResourceId) {
                    setProfileModal({ resourceId: currentStory.profileResourceId, title: currentStory.title });
                  } else if (currentStory.resources.length > 0) {
                    const pr = currentStory.resources.find(r => r.resource_type === 'Passage' || r.resource_type === 'Read Aloud') || currentStory.resources[0];
                    setProfileModal({ resourceId: pr.id, title: currentStory.title });
                  }
                }}
                onFocusMode={(active) => setStoriesCollapsed(active)}
                onJumpToStory={(story) => setActiveStory(story)}
              />
            )}

            {/* End of Module Project */}
            {activeStory === '__end_project__' && (
              <StoryJournal
                bookNum={bookNum}
                moduleNum={selectedModule}
                storyTitle="__end_project__"
                resources={[]}
                allModuleResources={moduleData?.allResources || []}
                hasProfile={false}
                onSelectResource={onSelectResource}
                onPresent={onPresent}
                onOpenProfile={() => {}}
                onFocusMode={(active) => setStoriesCollapsed(active)}
                onJumpToStory={(story) => setActiveStory(story)}
              />
            )}

            {/* Other resources */}
            {activeStory === '__other__' && (
              <OrbitSection title="Other Resources" subtitle={`${moduleData.other.length} resources`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {moduleData.other.map(r => (
                    <OrbitCard key={r.id} resource={r} onSelect={onSelectResource} onPresent={onPresent} />
                  ))}
                </div>
              </OrbitSection>
            )}

            {/* Module notes */}
            {isTeacher && moduleData && (activeStory === '__teaching_pal__' || activeStory === '__other__') && (
              <div className="mt-8 pt-6 border-t border-cyber-border">
                <ModuleNotes bookNum={bookNum} moduleNum={selectedModule} storyTitle={moduleData.stories[0]?.title || ''} allResources={moduleData.allResources} onSelectResource={onSelectResource} />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {profileModal && (
        <StoryProfileModal resourceId={profileModal.resourceId} storyTitle={profileModal.title} onClose={() => setProfileModal(null)} />
      )}
    </div>
  );
}
