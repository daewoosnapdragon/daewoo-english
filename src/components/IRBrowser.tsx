'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';
import ModuleNotes from './ModuleNotes';
import UnitPlanViewer from './UnitPlanViewer';
import StoryProfileModal from './StoryProfileModal';
import { useAuth } from '@/lib/auth-context';
import { useBill, BillLoading } from './Bill';

interface IRBrowserProps {
  onSelectResource: (resource: Resource) => void;
  onPresent?: (resource: Resource & { file_url?: string }) => void;
  initialStory?: string;
}

interface StoryGroup { title: string; resources: (Resource & { file_url?: string })[]; hasProfile: boolean; profileResourceId?: string; }
interface ModuleData { module_num: number; teachingPal: any[]; stories: StoryGroup[]; other: any[]; allResources: any[]; }

const SPINE_COLORS = ['#e0a0b0', '#b07888', '#d4b8d4', '#c8899a'];

export default function IRBrowser({ onSelectResource, onPresent, initialStory }: IRBrowserProps) {
  const { isTeacher } = useAuth();
  const { triggerReaction } = useBill();
  const [bookNum, setBookNum] = useState<number | null>(null);
  const [selectedModule, setSelectedModule] = useState<number | null>(null);
  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [moduleCounts, setModuleCounts] = useState<Record<number, number>>({});
  const [moduleStories, setModuleStories] = useState<Record<number, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [showUnitPlan, setShowUnitPlan] = useState(false);
  const [profileModal, setProfileModal] = useState<{ resourceId: string; title: string } | null>(null);
  const [activeStory, setActiveStory] = useState<string | null>(null);
  const [pulledBook, setPulledBook] = useState<number | null>(null);
  const [transition, setTransition] = useState<'none' | 'shelf-exit' | 'module-enter'>('none');
  const [recentBook, setRecentBook] = useState<number | null>(null);

  // Context menu for subfolders
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: string; storyTitle?: string; resourceId?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('ir-recent-book');
    if (stored) setRecentBook(Number(stored));
  }, []);

  // Close context menu on click elsewhere
  useEffect(() => {
    const close = () => setContextMenu(null);
    if (contextMenu) { document.addEventListener('click', close); return () => document.removeEventListener('click', close); }
  }, [contextMenu]);

  const fetchModuleCounts = useCallback(async (book: number) => {
    const res = await fetch(`/api/resources?book=${book}&fields=light&limit=2000`);
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const counts: Record<number, number> = {};
    const stories: Record<number, Set<string>> = {};
    for (const r of data) {
      const mnum = Number(r.module_num);
      if (mnum > 0) {
        counts[mnum] = (counts[mnum] || 0) + 1;
        const st = (r.story_title || '').trim();
        if (st) { if (!stories[mnum]) stories[mnum] = new Set(); stories[mnum].add(st); }
      }
    }
    setModuleCounts(counts);
    const sn: Record<number, string[]> = {};
    for (const [m, s] of Object.entries(stories)) sn[Number(m)] = Array.from(s);
    setModuleStories(sn);
  }, []);

  const fetchModule = useCallback(async (book: number, mod: number) => {
    setLoading(true);
    triggerReaction('loading');
    const res = await fetch(`/api/resources?book=${book}&fields=light&limit=2000`);
    const data: any[] = await res.json();
    if (!Array.isArray(data)) { setLoading(false); return; }
    const modR = data.filter((r: any) => Number(r.module_num) === mod).sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    const storyMap = new Map<string, any[]>(); const tp: any[] = []; const other: any[] = [];
    for (const r of modR) {
      const st = (r.story_title || '').trim();
      if (r.resource_type === 'Teaching Pal') tp.push(r);
      else if (st) { if (!storyMap.has(st)) storyMap.set(st, []); storyMap.get(st)!.push(r); }
      else other.push(r);
    }
    const stories: StoryGroup[] = [];
    for (const [title, resources] of Array.from(storyMap.entries())) stories.push({ title, resources, hasProfile: false });
    try {
      const ids = modR.map((r: any) => r.id);
      const profRes = await fetch('/api/story-profile/check', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource_ids: ids }) });
      const pm = await profRes.json();
      if (pm && typeof pm === 'object') { for (const s of stories) { for (const r of s.resources) { if (pm[r.id]) { s.hasProfile = true; s.profileResourceId = r.id; } } } }
    } catch {}
    setModuleData({ module_num: mod, teachingPal: tp, stories, other, allResources: modR });
    // Auto-select first story
    if (stories.length > 0) setActiveStory(stories[0].title);
    setLoading(false);
  }, [triggerReaction]);

  useEffect(() => { if (bookNum) fetchModuleCounts(bookNum); }, [bookNum, fetchModuleCounts]);
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
            {[1, 2, 3, 4].map((num, i) => {
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
                        {moduleCounts ? Object.keys(moduleCounts).length + 'm' : ''}
                      </span>
                    </div>
                  )}

                  {/* Pulled out — TABLE OF CONTENTS */}
                  {isPulled && (
                    <BookTOC
                      num={num}
                      color={color}
                      moduleCounts={moduleCounts}
                      moduleStories={moduleStories}
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

  // ========== CONSTELLATION MODULE VIEW ==========
  // (We skip the module picker — users jump to modules from the TOC)
  if (!selectedModule) {
    const moduleNums = Object.keys(moduleCounts).map(Number).sort((a, b) => a - b);
    return (
      <div className={`flex-1 overflow-y-auto ${transition === 'module-enter' ? 'module-enter' : 'page-enter'}`}>
        <div className="max-w-3xl mx-auto p-8">
          <Breadcrumb steps={[
            { label: 'Books', onClick: () => { setBookNum(null); setSelectedModule(null); setModuleData(null); } },
            { label: `Book ${bookNum}`, active: true },
          ]} />

          <h2 className="text-[10px] font-bold text-cyber-fg uppercase tracking-[0.15em] mb-1 mt-4">Book {bookNum}</h2>
          <p className="text-[12px] text-cyber-dim mb-6">{moduleNums.length} modules</p>

          <div className="space-y-1 stagger-children">
            {moduleNums.map(mod => (
              <div key={mod} className="border border-cyber-border overflow-hidden hover:border-cyber-fg transition-all group">
                <button onClick={() => setSelectedModule(mod)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-cyber-surface/50 transition-colors">
                  <div style={{
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #2a2a2a', fontSize: 14, color: '#8a5565', fontWeight: 300,
                    transition: 'all 0.2s',
                  }} className="group-hover:border-cyber-fg group-hover:text-cyber-fg">
                    {mod}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] text-cyber-fg font-medium">Module {mod}</p>
                    <p className="text-[11px] text-cyber-dim">{moduleCounts[mod] || 0} resources</p>
                    {moduleStories[mod]?.length > 0 && (
                      <div className="flex flex-wrap gap-x-2 mt-1">
                        {moduleStories[mod].map(s => (
                          <button key={s} onClick={(e) => { e.stopPropagation(); goToModule(mod, s); }}
                            className="text-[10px] text-cyber-muted hover:text-cyber-fg transition-colors">{s}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-cyber-muted group-hover:text-cyber-fg text-lg transition-colors">›</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ========== CONSTELLATION VIEW ==========
  const currentStory = moduleData?.stories.find(s => s.title === activeStory);
  const allStories = moduleData?.stories || [];

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
            <h2 className="text-[14px] font-bold text-cyber-fg">Book {bookNum} · Module {selectedModule}</h2>
            <p className="text-[10px] text-cyber-dim mt-1">{allStories.length} stories · {moduleData?.allResources.length || 0} resources</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowUnitPlan(!showUnitPlan)}
              className="btn-glow btn-glow-lilac px-3 py-1.5 text-[11px] font-bold flex items-center gap-1">
              <Icon name="description" size={14} /> Unit Plan
            </button>
          </div>
        </div>
      </div>

      {showUnitPlan && (
        <div className="px-6 pb-4 flex-shrink-0">
          <UnitPlanViewer bookNum={bookNum} moduleNum={selectedModule} onClose={() => setShowUnitPlan(false)} />
        </div>
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><BillLoading /></div>
      ) : moduleData ? (
        <div className="flex-1 flex overflow-hidden" style={{ borderTop: '1px solid #2a2a2a' }}>
          {/* ===== LEFT: Constellation nav ===== */}
          <div className="w-[200px] flex-shrink-0 border-r border-cyber-border overflow-y-auto"
            style={{ background: 'linear-gradient(to bottom, rgba(196,160,212,0.02), transparent)' }}>
            <div className="px-4 py-3 border-b border-cyber-border">
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

            {/* Story dots */}
            {allStories.map((story, i) => (
              <button key={story.title}
                onClick={() => setActiveStory(story.title)}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] transition-all relative ${
                  activeStory === story.title ? 'text-cyber-fg' : 'text-cyber-muted hover:text-cyber-dim'
                }`}>
                <ConstellationDot active={activeStory === story.title} isLast={i === allStories.length - 1 && moduleData.other.length === 0} />
                <span className="truncate">{story.title}</span>
              </button>
            ))}

            {/* Other resources entry */}
            {moduleData.other.length > 0 && (
              <button onClick={() => setActiveStory('__other__')}
                className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-[11px] transition-all relative ${
                  activeStory === '__other__' ? 'text-cyber-lilac' : 'text-cyber-muted hover:text-cyber-dim'
                }`}>
                <ConstellationDot active={activeStory === '__other__'} isLast={true} />
                <span>Other Resources</span>
              </button>
            )}
          </div>

          {/* ===== RIGHT: Orbit grid ===== */}
          <div className="flex-1 overflow-y-auto p-6 relative">
            {/* Ambient dots */}
            <div className="absolute top-[10%] right-[12%] w-[50px] h-[50px] rounded-full opacity-[0.04] pointer-events-none" style={{ background: '#c4a0d4', animation: 'billFloat 8s ease-in-out infinite' }} />
            <div className="absolute bottom-[20%] right-[25%] w-[30px] h-[30px] rounded-full opacity-[0.03] pointer-events-none" style={{ background: '#e0a0b0', animation: 'billFloat 6s ease-in-out infinite 2s' }} />

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

            {/* Story resources */}
            {currentStory && activeStory !== '__teaching_pal__' && activeStory !== '__other__' && (
              <OrbitSection
                title={currentStory.title}
                subtitle={`${currentStory.resources.length} resources`}
                profileButton={
                  currentStory.hasProfile && currentStory.profileResourceId ? (
                    <button onClick={() => setProfileModal({ resourceId: currentStory.profileResourceId!, title: currentStory.title })}
                      className="btn-sweep btn-sweep-lilac px-2.5 py-1 text-[10px] font-bold flex items-center gap-1">
                      <Icon name="auto_stories" size={12} /> Story Profile
                    </button>
                  ) : currentStory.resources.length > 0 ? (
                    <button onClick={() => {
                      const pr = currentStory.resources.find(r => r.resource_type === 'Passage' || r.resource_type === 'Read Aloud') || currentStory.resources[0];
                      setProfileModal({ resourceId: pr.id, title: currentStory.title });
                    }}
                      className="btn-glow btn-glow-lilac px-2.5 py-1 text-[10px] font-bold flex items-center gap-1">
                      <Icon name="add" size={12} /> Generate Profile
                    </button>
                  ) : null
                }>
                {/* Group resources by type for cleaner display */}
                <ResourceOrbitGrid
                  resources={currentStory.resources}
                  onSelect={onSelectResource}
                  onPresent={onPresent}
                  onContextMenu={(e, r) => {
                    e.preventDefault();
                    setContextMenu({ x: e.clientX, y: e.clientY, type: 'resource', resourceId: r.id, storyTitle: currentStory.title });
                  }}
                />
              </OrbitSection>
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
            {isTeacher && moduleData && (
              <div className="mt-8 pt-6 border-t border-cyber-border">
                <ModuleNotes bookNum={bookNum} moduleNum={selectedModule} storyTitle={moduleData.stories[0]?.title || ''} allResources={moduleData.allResources} onSelectResource={onSelectResource} />
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed z-50 border border-cyber-border bg-cyber-bg shadow-lg py-1"
          style={{ left: contextMenu.x, top: contextMenu.y, minWidth: 160 }}>
          <button className="w-full px-3 py-1.5 text-left text-[11px] text-cyber-dim hover:text-cyber-fg hover:bg-cyber-surface transition-colors">
            Move to subfolder...
          </button>
          <button className="w-full px-3 py-1.5 text-left text-[11px] text-cyber-dim hover:text-cyber-fg hover:bg-cyber-surface transition-colors">
            Create new subfolder
          </button>
          <div className="h-px bg-cyber-border my-1" />
          <button className="w-full px-3 py-1.5 text-left text-[11px] text-cyber-dim hover:text-cyber-fg hover:bg-cyber-surface transition-colors">
            Rename subfolder
          </button>
          <button className="w-full px-3 py-1.5 text-left text-[11px] text-cyber-dim hover:text-cyber-fg hover:bg-cyber-surface transition-colors">
            Delete subfolder
          </button>
        </div>
      )}

      {profileModal && (
        <StoryProfileModal resourceId={profileModal.resourceId} storyTitle={profileModal.title} onClose={() => setProfileModal(null)} />
      )}
    </div>
  );
}

// ========== BOOK TOC (shown when a book spine is pulled) ==========
function BookTOC({ num, color, moduleCounts, moduleStories, onOpenBook, onGoToModule }: {
  num: number;
  color: string;
  moduleCounts: Record<number, number>;
  moduleStories: Record<number, string[]>;
  onOpenBook: () => void;
  onGoToModule: (mod: number, story?: string) => void;
}) {
  const moduleNums = Object.keys(moduleCounts).map(Number).sort((a, b) => a - b);

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span className="pulse-glow" style={{ fontSize: 28, fontWeight: 300, color, lineHeight: 1 }}>{num}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#e0a0b0' }}>Book {num}</span>
        </div>
        <div style={{ fontSize: 10, color: '#5a3a42' }}>Into Reading · {moduleNums.length} modules</div>
      </div>

      <div style={{ height: 1, background: '#2a2a2a', marginBottom: 10 }} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: 8, color: '#5a3a42', letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' as const }}>
          Table of Contents
        </div>

        {moduleNums.length > 0 ? moduleNums.map(mod => (
          <div key={mod} style={{ marginBottom: 2 }}>
            <div
              onClick={(e) => { e.stopPropagation(); onGoToModule(mod); }}
              className="btn-glow"
              style={{
                padding: '6px 10px', fontSize: 11,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                cursor: 'pointer',
              }}>
              <span style={{ color: '#e0a0b0' }}>Module {mod}</span>
              <span style={{ fontSize: 9, color: '#5a3a42' }}>{moduleCounts[mod] || 0}</span>
            </div>

            {/* Story names under each module */}
            {moduleStories[mod]?.length > 0 && (
              <div style={{ paddingLeft: 12, paddingBottom: 2 }}>
                {moduleStories[mod].map(s => (
                  <div key={s}
                    onClick={(e) => { e.stopPropagation(); onGoToModule(mod, s); }}
                    style={{
                      fontSize: 9, color: '#5a3a42', padding: '2px 8px',
                      cursor: 'pointer', transition: 'color 0.2s',
                    }}
                    onMouseOver={e => { (e.target as HTMLElement).style.color = '#e0a0b0'; }}
                    onMouseOut={e => { (e.target as HTMLElement).style.color = '#5a3a42'; }}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        )) : (
          <div style={{ fontSize: 10, color: '#3a2028', fontStyle: 'italic', padding: '8px 0' }}>
            No modules found
          </div>
        )}
      </div>
    </div>
  );
}

// ========== CONSTELLATION DOT ==========
function ConstellationDot({ active, isLast }: { active: boolean; isLast: boolean }) {
  return (
    <span className="relative flex-shrink-0" style={{ width: 8, height: 8 }}>
      <span className="absolute inset-0 rounded-full border transition-all duration-300"
        style={{
          borderColor: active ? '#c4a0d4' : '#5a3a42',
          background: active ? '#c4a0d4' : 'transparent',
          boxShadow: active ? '0 0 8px rgba(196,160,212,0.4), 0 0 3px rgba(196,160,212,0.6)' : 'none',
        }} />
      {/* Connecting line to next dot */}
      {!isLast && (
        <span className="absolute left-1/2 top-full -translate-x-1/2" style={{
          width: 1, height: 18, background: '#2a2a2a',
        }} />
      )}
    </span>
  );
}

// ========== ORBIT SECTION ==========
function OrbitSection({ title, subtitle, profileButton, children }: {
  title: string; subtitle: string; profileButton?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-medium text-cyber-fg">{title}</h3>
          <p className="text-[9px] text-cyber-dim mt-1">{subtitle}</p>
        </div>
        {profileButton}
      </div>
      {children}
    </div>
  );
}

// ========== RESOURCE ORBIT GRID ==========
function ResourceOrbitGrid({ resources, onSelect, onPresent, onContextMenu }: {
  resources: any[];
  onSelect: (r: Resource) => void;
  onPresent?: (r: any) => void;
  onContextMenu?: (e: React.MouseEvent, r: any) => void;
}) {
  // Group by resource_type for subfolder-like display
  const groups = new Map<string, any[]>();
  for (const r of resources) {
    const type = r.resource_type || 'Other';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(r);
  }

  // If only one group or few resources, show flat grid
  if (groups.size <= 1 || resources.length <= 4) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {resources.map(r => (
          <OrbitCard key={r.id} resource={r} onSelect={onSelect} onPresent={onPresent} onContextMenu={onContextMenu} />
        ))}
      </div>
    );
  }

  // Multiple groups — show as labeled clusters
  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([type, items]) => (
        <div key={type}>
          <div className="text-[9px] font-bold text-cyber-lilac-dim uppercase tracking-[0.12em] mb-2">{type}s</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map(r => (
              <OrbitCard key={r.id} resource={r} onSelect={onSelect} onPresent={onPresent} onContextMenu={onContextMenu} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== ORBIT CARD ==========
function OrbitCard({ resource, onSelect, onPresent, onContextMenu }: {
  resource: any; onSelect: (r: Resource) => void; onPresent?: (r: any) => void;
  onContextMenu?: (e: React.MouseEvent, r: any) => void;
}) {
  return (
    <div className="border border-cyber-border p-3 cursor-pointer transition-all hover:border-cyber-lilac-muted group relative overflow-hidden"
      style={{ transition: 'all 0.3s ease' }}
      onClick={() => onSelect(resource)}
      onContextMenu={(e) => onContextMenu?.(e, resource)}
      onMouseOver={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(196,160,212,0.08)';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}>
      {/* Top accent line */}
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to right, #c4a0d4, transparent)' }} />

      <div className="text-[8px] font-bold text-cyber-lilac-dim uppercase tracking-[0.1em] mb-1.5">
        {resource.resource_type}
      </div>
      <div className="text-[12px] text-cyber-fg font-normal leading-snug mb-1.5 line-clamp-2">
        {resource.title}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-cyber-muted">
          {resource.page_count ? `${resource.page_count}p` : ''}{resource.file_type ? ` · ${resource.file_type.toUpperCase()}` : ''}
        </span>
        {resource.file_url && onPresent && (
          <button onClick={(e) => { e.stopPropagation(); onPresent(resource); }}
            className="btn-glow px-1.5 py-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
            Present
          </button>
        )}
      </div>
    </div>
  );
}

// ========== BREADCRUMB ==========
function Breadcrumb({ steps }: { steps: { label: string; onClick?: () => void; active?: boolean }[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && (
            <span style={{ margin: '0 6px', color: '#3a2028', fontSize: 10 }}>›</span>
          )}
          {step.active ? (
            <span className="text-[11px] text-cyber-fg font-medium px-2 py-1 border border-cyber-border bg-cyber-surface">
              {step.label}
            </span>
          ) : (
            <button onClick={step.onClick}
              className="text-[11px] text-cyber-dim hover:text-cyber-fg px-2 py-1 border border-transparent hover:border-cyber-border transition-all">
              {step.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
