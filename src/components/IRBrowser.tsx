'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';
import ModuleNotes from './ModuleNotes';
import UnitPlanViewer from './UnitPlanViewer';
import StoryProfileModal from './StoryProfileModal';
import { useAuth } from '@/lib/auth-context';

interface IRBrowserProps {
  onSelectResource: (resource: Resource) => void;
  onPresent?: (resource: Resource & { file_url?: string }, allResources?: (Resource & { file_url?: string })[]) => void;
}

interface StoryGroup {
  title: string;
  resources: (Resource & { thumbnail_url?: string | null })[];
  hasProfile: boolean;
  profileResourceId?: string;
}

interface ModuleData {
  module_num: number;
  teachingPal: Resource[];
  stories: StoryGroup[];
  other: Resource[];
  allResources: Resource[];
}

const TYPE_COLORS: Record<string, string> = {
  'Teaching Pal': 'bg-indigo-100 text-indigo-700',
  'Passage': 'bg-blue-100 text-blue-700',
  'Read Aloud': 'bg-blue-100 text-blue-700',
  'Close Reading': 'bg-blue-100 text-blue-700',
  'Worksheet': 'bg-green-100 text-green-700',
  'Activity': 'bg-green-100 text-green-700',
  'Assessment': 'bg-purple-100 text-purple-700',
  'Graphic Organizer': 'bg-teal-100 text-teal-700',
  'Anchor Chart': 'bg-pink-100 text-pink-700',
  'Writing Prompt': 'bg-orange-100 text-orange-700',
};

export default function IRBrowser({ onSelectResource, onPresent }: IRBrowserProps) {
  const { isTeacher } = useAuth();
  const [bookNum, setBookNum] = useState(1);
  const [modules, setModules] = useState<ModuleData[]>([]);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);
  const [showUnitPlan, setShowUnitPlan] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [taggingModule, setTaggingModule] = useState<number | null>(null);
  const [moduleGrade, setModuleGrade] = useState<Record<number, string>>({});
  const [showSettings, setShowSettings] = useState<number | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, boolean>>({});

  // Story profile modal
  const [profileModal, setProfileModal] = useState<{ resourceId: string; title: string } | null>(null);
  const [editingStoryTitle, setEditingStoryTitle] = useState<string | null>(null);

  const handleRenameStory = async (story: StoryGroup, newTitle: string, moduleNum: number) => {
    setEditingStoryTitle(null);
    const trimmed = newTitle.trim();
    if (!trimmed || trimmed === story.title) return;

    // Update all resources in this story group + the resource title if it matches
    for (const r of story.resources) {
      const updates: Record<string, any> = { story_title: trimmed };
      // If the resource title was being used as the story name (no explicit story_title), update title too
      if (!r.story_title && r.title === story.title) {
        updates.title = trimmed;
      }
      await fetch(`/api/resources/${r.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    }
    fetchBook();
  };

  const fetchBook = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/resources?curriculum=Into+Reading&book=${bookNum}&limit=1000`);
    const data = await res.json();
    if (!Array.isArray(data)) { setModules([]); setLoading(false); return; }

    // Batch check which resources have profiles
    const allIds = data.map((r: any) => r.id);

    let pMap: Record<string, boolean> = {};
    if (allIds.length > 0) {
      try {
        const pRes = await fetch('/api/story-profile/check', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_ids: allIds }),
        });
        if (pRes.ok) pMap = await pRes.json();
      } catch {}
    }
    setProfileMap(pMap);

    const modMap = new Map<number, (Resource & { thumbnail_url?: string | null })[]>();
    for (const r of data) {
      const m = r.module_num || 0;
      if (!modMap.has(m)) modMap.set(m, []);
      modMap.get(m)!.push(r);
    }

    const mods: ModuleData[] = [];
    for (const mNum of Array.from(modMap.keys()).sort((a, b) => a - b)) {
      if (mNum === 0) continue;
      const resources = modMap.get(mNum)!;
      resources.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

      const teachingPal: Resource[] = [];
      const storyMap = new Map<string, (Resource & { thumbnail_url?: string | null })[]>();
      const other: Resource[] = [];
      const isPassageType = (r: Resource) => ['Passage', 'Read Aloud', 'Close Reading'].includes(r.resource_type);

      for (const r of resources) {
        if (r.resource_type === 'Teaching Pal') {
          teachingPal.push(r);
        } else if (r.story_title) {
          // Has explicit story title — group under it
          if (!storyMap.has(r.story_title)) storyMap.set(r.story_title, []);
          storyMap.get(r.story_title)!.push(r);
        } else if (isPassageType(r)) {
          // Passage without story_title — use resource title as story name
          const storyName = r.title;
          if (!storyMap.has(storyName)) storyMap.set(storyName, []);
          storyMap.get(storyName)!.push(r);
        } else {
          other.push(r);
        }
      }

      const stories: StoryGroup[] = Array.from(storyMap.entries()).map(([title, res]) => {
        const passage = res.find(r => isPassageType(r));
        // Use passage ID for profile, or first resource ID as fallback
        const profileId = passage?.id || res[0]?.id;
        return {
          title, resources: res,
          hasProfile: profileId ? !!pMap[profileId] : false,
          profileResourceId: profileId,
        };
      });

      mods.push({ module_num: mNum, teachingPal, stories, other, allResources: resources });
    }

    setModules(mods); setLoading(false);
    if (mods.length > 0 && expandedModule === null) setExpandedModule(mods[0].module_num);
  }, [bookNum]);

  useEffect(() => { fetchBook(); }, [fetchBook]);

  const handleQuickTagAll = async (moduleNum: number) => {
    const mod = modules.find(m => m.module_num === moduleNum);
    if (!mod) return;
    const untagged = mod.allResources.filter(r => !r.ai_processed);
    if (!untagged.length) return;
    setTaggingModule(moduleNum);
    for (const r of untagged) {
      try { await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resource_id: r.id }) }); } catch {}
    }
    setTaggingModule(null); fetchBook();
  };

  const handleProfileGenerated = (resourceId: string) => {
    setProfileMap(prev => ({ ...prev, [resourceId]: true }));
    setModules(prev => prev.map(mod => ({
      ...mod,
      stories: mod.stories.map(s => s.profileResourceId === resourceId ? { ...s, hasProfile: true } : s),
    })));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-sand-200 flex-shrink-0">
        <Icon name="book" size={22} className="text-vault-600" />
        <span className="font-bold text-gray-900">Into Reading</span>
        <div className="flex-1" />
        <div className="flex rounded-xl overflow-hidden border border-sand-200">
          {[1, 2, 3, 4].map(b => (
            <button key={b} onClick={() => { setBookNum(b); setExpandedModule(null); setExpandedStory(null); setShowUnitPlan(null); }}
              className={`px-4 py-1.5 text-xs font-bold ${bookNum === b ? 'bg-vault-500 text-white' : 'bg-white text-gray-500 hover:bg-sand-50'}`}>
              {b}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-vault-200 border-t-vault-500 rounded-full animate-spin" /></div>
        ) : modules.length === 0 ? (
          <div className="text-center py-16"><Icon name="menu_book" size={36} className="text-sand-300 mx-auto mb-2" /><p className="text-gray-500 text-sm">No resources for Book {bookNum}</p></div>
        ) : (
          <div className="space-y-2">
            {modules.map(mod => {
              const open = expandedModule === mod.module_num;
              const untagged = mod.allResources.filter(r => !r.ai_processed).length;

              return (
                <div key={mod.module_num} className={`rounded-xl border ${open ? 'border-vault-200 bg-white shadow-sm' : 'border-sand-200 bg-sand-50/50'}`}>
                  <button onClick={() => { setExpandedModule(open ? null : mod.module_num); setShowUnitPlan(null); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black ${open ? 'bg-vault-500 text-white' : 'bg-sand-200 text-sand-600'}`}>{mod.module_num}</div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-gray-900">Module {mod.module_num}</span>
                      <div className="flex gap-1 mt-0.5 overflow-hidden">
                        {mod.stories.slice(0, 3).map(s => (
                          <div key={s.title} className="flex items-center gap-1 bg-sand-100 rounded px-1.5 py-0.5 flex-shrink-0">
                            <Icon name="auto_stories" size={10} className={s.hasProfile ? 'text-violet-500' : 'text-sand-500'} />
                            <span className="text-[8px] text-sand-600 max-w-[70px] truncate">{s.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-sand-400">{mod.allResources.length}</span>
                    <Icon name={open ? 'expand_less' : 'expand_more'} size={18} className="text-sand-400" />
                  </button>

                  {open && (
                    <div className="px-4 pb-3 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button onClick={() => setShowUnitPlan(showUnitPlan === mod.module_num ? null : mod.module_num)}
                          className={`px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 ${showUnitPlan === mod.module_num ? 'bg-vault-500 text-white' : 'bg-vault-50 text-vault-700 hover:bg-vault-100'}`}>
                          <Icon name="architecture" size={12} /> Unit Plan
                        </button>
                        <a href={`/api/module-bundle?book=${bookNum}&module=${mod.module_num}`} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100">
                          <Icon name="download" size={12} /> Download All
                        </a>
                        <button onClick={() => setShowSettings(showSettings === mod.module_num ? null : mod.module_num)}
                          className="px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 bg-sand-100 text-gray-600 hover:bg-sand-200">
                          <Icon name="settings" size={12} /> Settings
                        </button>
                        {isTeacher && untagged > 0 && (
                          <button onClick={() => handleQuickTagAll(mod.module_num)} disabled={taggingModule === mod.module_num}
                            className="px-2 py-1 text-[10px] font-bold rounded-lg flex items-center gap-1 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50">
                            {taggingModule === mod.module_num
                              ? <><span className="w-3 h-3 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin inline-block" /> Tagging...</>
                              : <><Icon name="auto_awesome" size={12} /> Tag All ({untagged})</>}
                          </button>
                        )}
                      </div>

                      {showSettings === mod.module_num && (
                        <div className="bg-sand-50 rounded-lg p-3">
                          <label className="text-[10px] font-bold text-gray-500">Target Grade (CCSS)</label>
                          <select value={moduleGrade[mod.module_num] || '2'} onChange={e => setModuleGrade(p => ({ ...p, [mod.module_num]: e.target.value }))}
                            className="w-full border border-sand-200 rounded px-2 py-1 text-xs mt-0.5">
                            {['K','1','2','3','4','5'].map(g => <option key={g} value={g}>Grade {g}</option>)}
                          </select>
                        </div>
                      )}

                      {showUnitPlan === mod.module_num && (
                        <UnitPlanViewer bookNum={bookNum} moduleNum={mod.module_num} targetGrade={moduleGrade[mod.module_num] || '2'} onClose={() => setShowUnitPlan(null)} />
                      )}

                      {mod.teachingPal.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-indigo-500 uppercase mb-1 flex items-center gap-1"><Icon name="menu_book" size={12} /> Teaching Pal</p>
                          {mod.teachingPal.map(r => <RRow key={r.id} r={r} onClick={() => onSelectResource(r)} highlight />)}
                        </div>
                      )}

                      {mod.stories.map(story => {
                        const key = `${mod.module_num}-${story.title}`;
                        const sOpen = expandedStory === key;
                        const isEditing = editingStoryTitle === key;

                        return (
                          <div key={story.title} className={`rounded-xl border ${sOpen ? 'border-vault-200 bg-white' : 'border-sand-100'}`}>
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center cursor-pointer ${story.hasProfile ? 'bg-violet-100' : 'bg-sand-100'}`}
                                onClick={() => setExpandedStory(sOpen ? null : key)}>
                                <Icon name="auto_stories" size={22} className={story.hasProfile ? 'text-violet-500' : 'text-vault-400'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <input
                                    defaultValue={story.title}
                                    autoFocus
                                    className="text-sm font-semibold text-gray-800 bg-white border border-vault-300 rounded px-2 py-0.5 w-full focus:outline-none focus:ring-1 focus:ring-vault-400"
                                    onBlur={e => handleRenameStory(story, e.target.value, mod.module_num)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameStory(story, (e.target as HTMLInputElement).value, mod.module_num); if (e.key === 'Escape') setEditingStoryTitle(null); }}
                                  />
                                ) : (
                                  <span className="text-sm font-semibold text-gray-800 cursor-pointer hover:text-vault-600"
                                    onClick={() => setExpandedStory(sOpen ? null : key)}
                                    onDoubleClick={e => { e.stopPropagation(); setEditingStoryTitle(key); }}>
                                    {story.title}
                                  </span>
                                )}
                                <div className="flex gap-1 mt-0.5">
                                  {story.resources.map(r => r.resource_type).filter((v, i, a) => v && a.indexOf(v) === i).map(t => (
                                    <span key={t} className={`text-[7px] px-1 py-0.5 rounded font-bold ${TYPE_COLORS[t] || 'bg-sand-100 text-sand-600'}`}>{t}</span>
                                  ))}
                                </div>
                              </div>

                              {/* Profile button — opens modal */}
                              {story.profileResourceId && (story.hasProfile || isTeacher) && (
                                <button onClick={() => setProfileModal({ resourceId: story.profileResourceId!, title: story.title })}
                                  className={`px-2 py-1 text-[9px] font-bold rounded-lg flex items-center gap-1 flex-shrink-0 ${
                                    story.hasProfile
                                      ? 'bg-violet-100 hover:bg-violet-200 text-violet-700'
                                      : 'bg-violet-50 hover:bg-violet-100 text-violet-600'
                                  }`}>
                                  <Icon name={story.hasProfile ? 'auto_stories' : 'auto_awesome'} size={12} />
                                  {story.hasProfile ? 'Profile' : 'Gen Profile'}
                                </button>
                              )}

                              <span className="text-[10px] text-sand-400">{story.resources.length}</span>
                              <button onClick={() => setExpandedStory(sOpen ? null : key)} className="p-0.5">
                                <Icon name={sOpen ? 'expand_less' : 'expand_more'} size={16} className="text-sand-400" />
                              </button>
                            </div>

                            {sOpen && (
                              <div className="px-3 pb-3 border-t border-sand-100 pt-2">
                                {onPresent && story.resources.length > 0 && (
                                  <button onClick={() => onPresent(story.resources[0] as any, story.resources as any[])}
                                    className="mb-2 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                                    <Icon name="present_to_all" size={12} /> Present Story ({story.resources.length})
                                  </button>
                                )}
                                {story.resources.map(r => <RRow key={r.id} r={r} onClick={() => onSelectResource(r)} />)}
                                <div className="mt-2 pt-2 border-t border-sand-50">
                                  <ModuleNotes bookNum={bookNum} moduleNum={mod.module_num} storyTitle={story.title}
                                    allResources={mod.allResources} onSelectResource={onSelectResource} />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {mod.other.length > 0 && (
                        <div>
                          <p className="text-[9px] font-bold text-sand-400 uppercase mb-1">Other</p>
                          {mod.other.map(r => <RRow key={r.id} r={r} onClick={() => onSelectResource(r)} />)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Story Profile Modal */}
      {profileModal && (
        <StoryProfileModal
          resourceId={profileModal.resourceId}
          onClose={() => setProfileModal(null)}
          onProfileSaved={() => handleProfileGenerated(profileModal.resourceId)}
        />
      )}
    </div>
  );
}

function RRow({ r, onClick, highlight }: { r: Resource & { thumbnail_url?: string | null }; onClick: () => void; highlight?: boolean }) {
  const icon = r.resource_type === 'Teaching Pal' ? 'menu_book' : r.resource_type === 'Passage' || r.resource_type === 'Read Aloud' || r.resource_type === 'Close Reading' ? 'auto_stories'
    : r.resource_type === 'Worksheet' ? 'assignment' : r.resource_type === 'Assessment' ? 'quiz' : r.resource_type === 'Graphic Organizer' ? 'schema'
    : r.resource_type === 'Anchor Chart' ? 'dashboard' : r.resource_type === 'Writing Prompt' ? 'draw' : r.resource_type === 'Activity' ? 'sports_esports' : 'description';
  return (
    <div onClick={onClick} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${highlight ? 'bg-indigo-50 hover:bg-indigo-100' : 'hover:bg-sand-50'}`}>
      <div className="w-7 h-7 rounded bg-sand-100 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={14} className="text-sand-500" />
      </div>
      <span className="text-xs text-gray-800 flex-1 truncate">{r.title}</span>
      {r.resource_type && <span className={`px-1.5 py-0.5 text-[9px] rounded font-bold flex-shrink-0 ${TYPE_COLORS[r.resource_type] || 'bg-sand-100 text-sand-600'}`}>{r.resource_type}</span>}
    </div>
  );
}
