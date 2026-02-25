'use client';

// Skip static prerendering — this page requires auth
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Resource, FilterState } from '@/types';
import Icon from '@/components/Icon';
import Sidebar from '@/components/Sidebar';
import ResourceCard from '@/components/ResourceCard';
import ResourceModal from '@/components/ResourceModal';
// UploadDropzone removed — upload only via sidebar/upload view
import UploadOrganize from '@/components/UploadOrganize';
import AISearch from '@/components/AISearch';
import IRBrowser from '@/components/IRBrowser';
import CategoryShelf from '@/components/CategoryShelf';
import CommandPalette from '@/components/CommandPalette';
import { useToast } from '@/components/Toast';
import { useBill, BillLoading, BillEmptyState } from '@/components/Bill';
import SmartboardViewer from '@/components/SmartboardViewer';
import { useAuth } from '@/lib/auth-context';

const emptyFilters: FilterState = {
  search: '', category: '', resource_type: '', grade_level: '',
  curriculum: '', topic: '', reading_skill: '',
  favorites_only: false, collection_id: '', tag_id: '',
};

// ============================================================
// Client-side resource cache — avoids re-fetching on view switch
// ============================================================
interface ResourceCache {
  all: (Resource & { thumbnail_url?: string | null; file_url?: string })[];
  recent: (Resource & { thumbnail_url?: string | null })[];
  counts: Record<string, number>;
  lastFetched: number;
  stale: boolean;
}

const CACHE_TTL = 60_000; // 1 min — show cached data instantly, refresh in background

export default function HomePage() {
  const { isTeacher, isViewer } = useAuth();
  const { toast } = useToast();
  const { triggerReaction } = useBill();
  const [resources, setResources] = useState<(Resource & { thumbnail_url?: string | null; file_url?: string })[]>([]);
  const [recentResources, setRecentResources] = useState<(Resource & { thumbnail_url?: string | null })[]>([]);
  const [aiResults, setAiResults] = useState<(Resource & { thumbnail_url?: string | null })[] | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [selectedResource, setSelectedResource] = useState<(Resource & { thumbnail_url?: string | null; file_url?: string }) | null>(null);
  const [presentingResource, setPresentingResource] = useState<(Resource & { file_url?: string }) | null>(null);
  const [presentingList, setPresentingList] = useState<(Resource & { file_url?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAISearch, setShowAISearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeView, setActiveView] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Dynamic page title
  useEffect(() => {
    const titles: Record<string, string> = {
      home: 'Teacher Vault',
      library: filters.category ? `TV · ${filters.category}` : 'TV · All Resources',
      into_reading: 'TV · Into Reading',
      upload: 'TV · Upload',
      recent: 'TV · Recent',
    };
    document.title = titles[activeView] || 'Teacher Vault';
  }, [activeView, filters.category]);

  // Bill reacts to view changes
  useEffect(() => {
    if (activeView === 'upload') triggerReaction('upload_start');
    else if (loading) triggerReaction('loading');
  }, [activeView, loading, triggerReaction]);

  // Command palette items
  const commandItems = [
    { id: 'home', label: 'Go Home', type: 'action' as const, icon: 'home', onSelect: () => { setFilters(emptyFilters); setActiveView('home'); } },
    { id: 'all', label: 'All Resources', type: 'action' as const, icon: 'folder', onSelect: () => { setFilters(emptyFilters); setActiveView('library'); } },
    { id: 'ir', label: 'Into Reading', type: 'action' as const, icon: 'menu_book', onSelect: () => setActiveView('into_reading') },
    { id: 'fav', label: 'Favorites', type: 'action' as const, icon: 'favorite', onSelect: () => { setFilters({ ...emptyFilters, favorites_only: true }); setActiveView('library'); } },
    { id: 'upload', label: 'Upload Resources', type: 'action' as const, icon: 'cloud_upload', onSelect: () => setActiveView('upload') },
    { id: 'recent', label: 'Recent', type: 'action' as const, icon: 'schedule', onSelect: () => setActiveView('recent') },
    ...['Grammar', 'Reading', 'Writing', 'Phonics', 'Projects', 'Seasonal', 'Assessments', 'SEL', 'Novel Study'].map(cat => ({
      id: `cat-${cat}`, label: cat, type: 'category' as const, icon: 'folder',
      onSelect: () => { setFilters({ ...emptyFilters, category: cat.toLowerCase() }); setActiveView('library'); },
    })),
    ...[1, 2, 3, 4].map(n => ({
      id: `book-${n}`, label: `Into Reading — Book ${n}`, type: 'module' as const, icon: 'menu_book',
      onSelect: () => setActiveView('into_reading'),
    })),
    ...resources.slice(0, 50).map(r => ({
      id: r.id, label: r.title, type: 'resource' as const, icon: 'description',
      onSelect: () => setSelectedResource(r),
    })),
  ];

  const supabase = createClient();
  const cacheRef = useRef<ResourceCache>({ all: [], recent: [], counts: {}, lastFetched: 0, stale: true });

  // ============================================================
  // Combined init fetch — one cold start for everything
  // ============================================================
  const fetchInit = useCallback(async (force = false) => {
    const cache = cacheRef.current;
    const now = Date.now();

    // If cache is fresh and not forced, use cached data
    if (!force && !cache.stale && now - cache.lastFetched < CACHE_TTL && cache.all.length > 0) {
      setResources(cache.all);
      setRecentResources(cache.recent);
      setCounts(cache.counts);
      setLoading(false);
      return;
    }

    // Show cached data immediately while refreshing
    if (cache.all.length > 0) {
      setResources(cache.all);
      setRecentResources(cache.recent);
      setCounts(cache.counts);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/init');
      const data = await res.json();
      if (data.resources) {
        cacheRef.current = {
          all: data.resources,
          recent: data.recent || [],
          counts: data.counts || {},
          lastFetched: Date.now(),
          stale: false,
        };
        setResources(data.resources);
        setRecentResources(data.recent || []);
        setCounts(data.counts || {});
      }
    } catch (e) {
      console.error('Init fetch error:', e);
    }
    setLoading(false);
  }, []);

  // Filtered fetch — only when filters are active
  const fetchFiltered = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.category) params.set('category', filters.category);
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.grade_level) params.set('grade_level', filters.grade_level);
    if (filters.curriculum) params.set('curriculum', filters.curriculum);
    if (filters.topic) params.set('topic', filters.topic);
    if (filters.reading_skill) params.set('reading_skill', filters.reading_skill);
    if (filters.favorites_only) params.set('favorites', 'true');
    if (filters.collection_id) params.set('collection_id', filters.collection_id);
    params.set('limit', '100');
    params.set('fields', 'light');
    const res = await fetch(`/api/resources?${params}`);
    const data = await res.json();
    setResources(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filters]);

  const hasActiveFilter = !!(filters.search || filters.category || filters.resource_type ||
    filters.grade_level || filters.curriculum || filters.topic || filters.reading_skill || filters.favorites_only || filters.collection_id);

  // Initial load
  useEffect(() => { fetchInit(); }, [fetchInit]);

  // When filters change, decide whether to use cache or fetch
  useEffect(() => {
    if (activeView !== 'library' && activeView !== 'recent') return;
    if (hasActiveFilter) {
      fetchFiltered();
    } else if (activeView === 'library') {
      // Use cache — no fetch needed
      setResources(cacheRef.current.all);
    } else if (activeView === 'recent') {
      setRecentResources(cacheRef.current.recent);
    }
  }, [filters, activeView, hasActiveFilter, fetchFiltered]);

  // Mark cache stale after mutations
  const invalidateCache = useCallback(() => {
    cacheRef.current.stale = true;
    fetchInit(true);
  }, [fetchInit]);

  const handleToggleFavorite = async (id: string, isFav: boolean) => {
    // Optimistic update
    setResources(prev => prev.map(r => r.id === id ? { ...r, is_favorite: isFav } : r));
    if (selectedResource?.id === id) setSelectedResource(prev => prev ? { ...prev, is_favorite: isFav } : null);
    triggerReaction(isFav ? 'favorite' : 'unfavorite');
    toast(isFav ? 'added to favorites' : 'removed from favorites', isFav ? 'success' : 'info');

    await fetch('/api/resources/favorites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_favorite: isFav }),
    });

    cacheRef.current.all = cacheRef.current.all.map(r => r.id === id ? { ...r, is_favorite: isFav } : r);
    const c = cacheRef.current.counts;
    c.favorites = (c.favorites || 0) + (isFav ? 1 : -1);
    setCounts({ ...c });
    
  };

  const handleUpdate = async (id: string, updates: Partial<Resource> & { thumbnail_url?: string }) => {
    const { thumbnail_url, ...dbUpdates } = updates as any;
    if (Object.keys(dbUpdates).length > 0) {
      await fetch(`/api/resources/${id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbUpdates),
      });
    }
    const allUpdates = { ...dbUpdates, ...(thumbnail_url ? { thumbnail_url } : {}) };
    setResources(prev => prev.map(r => r.id === id ? { ...r, ...allUpdates } : r));
    if (selectedResource?.id === id) setSelectedResource(prev => prev ? { ...prev, ...allUpdates } : null);
    cacheRef.current.all = cacheRef.current.all.map(r => r.id === id ? { ...r, ...allUpdates } : r);
    cacheRef.current.stale = true;
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/resources/${id}`, { method: 'DELETE' });
    setResources(prev => prev.filter(r => r.id !== id));
    cacheRef.current.all = cacheRef.current.all.filter(r => r.id !== id);
    setSelectedResource(null);
    cacheRef.current.stale = true;
    // Refresh counts
    fetchInit(true);
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const handleUploadComplete = (uploaded: Resource[]) => {
    invalidateCache();
    if (uploaded.length === 1) setSelectedResource(uploaded[0] as any);
  };

  const handleInlineRename = async (id: string, newTitle: string) => {
    setEditingId(null);
    if (!newTitle.trim()) return;
    await handleUpdate(id, { title: newTitle.trim() });
  };

  const isAISearch = aiResults !== null;
  const displayResources = isAISearch ? aiResults : activeView === 'recent' ? recentResources : resources;

  return (
    <div className="flex h-screen bg-cyber-bg">
      <CommandPalette items={commandItems} />
      <Sidebar filters={filters} setFilters={setFilters} resourceCounts={counts}
        activeView={activeView} setActiveView={setActiveView} />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Upload & Organize view */}
        {activeView === 'upload' && (
          <UploadOrganize
            onResourcesChanged={invalidateCache}
            onSelectResource={(r) => setSelectedResource(r as any)}
          />
        )}

        {/* IR Browser view */}
        {activeView === 'into_reading' && (
          <IRBrowser onSelectResource={(r) => setSelectedResource(r as any)} onPresent={(r) => { setPresentingResource(r as any); }} />
        )}

        {/* Library / Recent / Favorites views */}
        {/* Home dashboard */}
        {activeView === 'home' && (
          <CategoryShelf
            counts={counts}
            filters={filters}
            setFilters={setFilters}
            setActiveView={setActiveView}
          />
        )}

        {activeView !== 'upload' && activeView !== 'into_reading' && activeView !== 'home' && (
          <>
            {/* Top bar */}
            <div className="bg-cyber-bg border-b border-cyber-border px-4 py-2 space-y-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-dim" />
                  <input type="text" placeholder="Search…" value={filters.search}
                    onChange={e => { setAiResults(null); setActiveView('library'); setFilters({ ...filters, search: e.target.value }); }}
                    className="w-full pl-9 pr-3 py-1.5 bg-cyber-surface border border-cyber-border text-cyber-fg text-[12px] outline-none focus:border-cyber-fg placeholder:text-cyber-muted" />
                </div>
                <button onClick={() => setShowAISearch(!showAISearch)}
                  className={`p-1.5 transition-colors ${showAISearch ? 'bg-cyber-fg text-cyber-bg' : 'text-cyber-muted hover:text-cyber-fg border border-cyber-border'} ${isViewer ? 'hidden' : ''}`}>
                  <Icon name="auto_awesome" size={18} />
                </button>
                <div className="flex overflow-hidden border border-cyber-border">
                  <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-cyber-fg text-cyber-bg' : 'text-cyber-muted'}`}><Icon name="grid_view" size={14} /></button>
                  <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-cyber-fg text-cyber-bg' : 'text-cyber-muted'}`}><Icon name="view_list" size={14} /></button>
                </div>
                {isTeacher && (
                  <button onClick={() => setActiveView('upload')}
                    className="border border-cyber-border text-cyber-dim hover:text-cyber-fg hover:border-cyber-fg px-3 py-1.5 text-[10px] font-medium flex items-center gap-1 transition-colors">
                    <Icon name="add" size={16} /> Upload
                  </button>
                )}
                {isViewer && (
                  <span className="px-2 py-1 bg-cyber-surface text-cyber-fg text-[10px] font-bold rounded-lg flex items-center gap-1">
                    <Icon name="visibility" size={14} /> View Only
                  </span>
                )}
              </div>
              {showAISearch && isTeacher && <AISearch onResults={(r) => { setAiResults(r); setActiveView('library'); }} onClear={() => setAiResults(null)} />}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {loading && !isAISearch ? (
                  <BillLoading />
                ) : (displayResources?.length || 0) === 0 ? (
                  <div className="text-center py-16">
                    <BillEmptyState type={filters.favorites_only ? 'favorites' : filters.search ? 'search' : 'default'} />
                    {isTeacher && (
                      <button onClick={() => setActiveView('upload')}
                        className="mt-3 border border-cyber-border text-cyber-dim hover:text-cyber-fg hover:border-cyber-fg px-4 py-2 text-[10px] font-medium transition-colors">
                        Upload Resources
                      </button>
                    )}
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 stagger-children">
                    {displayResources?.map(r => (
                      <ResourceCard key={r.id} resource={r} onSelect={setSelectedResource} onToggleFavorite={handleToggleFavorite} searchTerm={filters.search} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
                    {displayResources?.map(r => (
                      <div key={r.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-sand-100 hover:shadow-sm cursor-pointer group">
                        <div className="w-9 h-9 rounded bg-cyber-surface flex items-center justify-center flex-shrink-0 overflow-hidden"
                          onClick={() => setSelectedResource(r)}>
                          {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                            : <Icon name="description" size={16} className="text-cyber-dim" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          {editingId === r.id ? (
                            <input
                              autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)}
                              onBlur={() => handleInlineRename(r.id, editTitle)}
                              onKeyDown={e => { if (e.key === 'Enter') handleInlineRename(r.id, editTitle); if (e.key === 'Escape') setEditingId(null); }}
                              className="text-xs font-medium text-cyber-fg w-full bg-cyber-surface border border-cyber-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-cyber-fg"
                            />
                          ) : (
                            <p className="text-xs font-medium text-cyber-fg truncate"
                              onClick={() => setSelectedResource(r)}
                              onDoubleClick={(e) => { e.stopPropagation(); setEditingId(r.id); setEditTitle(r.title); }}>
                              {r.title}
                            </p>
                          )}
                          <p className="text-[9px] text-cyber-dim">{r.resource_type}{r.category ? ` · ${r.category}` : ''}</p>
                        </div>
                        {r.ai_processed && <Icon name="auto_awesome" size={14} className="text-violet-400" />}
                        <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(r.id, !r.is_favorite); }}>
                          <Icon name="star" size={18} filled={r.is_favorite} className={r.is_favorite ? 'text-amber-500' : 'text-gray-200'} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {selectedResource && (
        <ResourceModal resource={selectedResource} onClose={() => setSelectedResource(null)}
          onUpdate={handleUpdate} onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite} onSelectRelated={(r) => setSelectedResource(r as any)}
          onPresent={(r) => { setPresentingResource(r); setSelectedResource(null); }} />
      )}

      {presentingResource && (
        <SmartboardViewer
          resource={presentingResource as any}
          onClose={() => { setPresentingResource(null); setPresentingList([]); }}
        />
      )}
    </div>
  );
}
