'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-browser';
import { Resource, FilterState } from '@/types';
import Icon from '@/components/Icon';
import Sidebar from '@/components/Sidebar';
import ResourceCard from '@/components/ResourceCard';
import ResourceModal from '@/components/ResourceModal';
import UploadDropzone from '@/components/UploadDropzone';
import AISearch from '@/components/AISearch';
import IRBrowser from '@/components/IRBrowser';
import SmartboardViewer from '@/components/SmartboardViewer';
import { useAuth } from '@/lib/auth-context';

const emptyFilters: FilterState = {
  search: '', category: '', resource_type: '', grade_level: '',
  curriculum: '', topic: '', reading_skill: '',
  favorites_only: false, collection_id: '', tag_id: '',
};

export default function HomePage() {
  const { isTeacher, isViewer, role } = useAuth();
  const [resources, setResources] = useState<(Resource & { thumbnail_url?: string | null; file_url?: string })[]>([]);
  const [recentResources, setRecentResources] = useState<(Resource & { thumbnail_url?: string | null })[]>([]);
  const [aiResults, setAiResults] = useState<(Resource & { thumbnail_url?: string | null })[] | null>(null);
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [selectedResource, setSelectedResource] = useState<(Resource & { thumbnail_url?: string | null; file_url?: string }) | null>(null);
  const [presentingResource, setPresentingResource] = useState<(Resource & { file_url?: string }) | null>(null);
  const [presentingList, setPresentingList] = useState<(Resource & { file_url?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showAISearch, setShowAISearch] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeView, setActiveView] = useState<string>('library');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const supabase = createClient();

  const fetchResources = useCallback(async () => {
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
    const res = await fetch(`/api/resources?${params}`);
    const data = await res.json();
    setResources(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [filters]);

  const fetchRecent = useCallback(async () => {
    const res = await fetch('/api/resources/recent');
    const data = await res.json();
    setRecentResources(Array.isArray(data) ? data : []);
  }, []);

  const fetchCounts = useCallback(async () => {
    const res = await fetch('/api/resources?limit=5000');
    const all = await res.json();
    if (!Array.isArray(all)) return;
    const c: Record<string, number> = { total: all.length, favorites: 0 };
    for (const r of all) {
      if (r.is_favorite) c.favorites++;
      if (r.category) c[r.category] = (c[r.category] || 0) + 1;
      if (r.curriculum?.includes('Into Reading')) c.into_reading = (c.into_reading || 0) + 1;
    }
    setCounts(c);
  }, []);

  useEffect(() => {
    if (activeView === 'recent') fetchRecent();
    else if (activeView === 'library') { setAiResults(null); fetchResources(); }
  }, [filters, activeView, fetchResources, fetchRecent]);

  useEffect(() => { fetchCounts(); }, [fetchCounts]);

  const handleToggleFavorite = async (id: string, isFav: boolean) => {
    await fetch('/api/resources/favorites', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_favorite: isFav }),
    });
    setResources(prev => prev.map(r => r.id === id ? { ...r, is_favorite: isFav } : r));
    if (selectedResource?.id === id) setSelectedResource(prev => prev ? { ...prev, is_favorite: isFav } : null);
    fetchCounts();
  };

  const handleUpdate = async (id: string, updates: Partial<Resource> & { thumbnail_url?: string }) => {
    // Separate UI-only fields from DB fields
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
    fetchCounts();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/resources/${id}`, { method: 'DELETE' });
    setResources(prev => prev.filter(r => r.id !== id));
    setSelectedResource(null);
    fetchCounts();
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); window.location.href = '/login'; };

  const handleUploadComplete = (uploaded: Resource[]) => {
    fetchResources(); fetchCounts();
    if (uploaded.length === 1) setSelectedResource(uploaded[0] as any);
  };

  const isAISearch = aiResults !== null;
  const displayResources = isAISearch ? aiResults : activeView === 'recent' ? recentResources : resources;

  return (
    <div className="flex h-screen bg-sand-50">
      <Sidebar filters={filters} setFilters={setFilters} resourceCounts={counts}
        activeView={activeView} setActiveView={setActiveView}
        collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed}
        onSignOut={handleSignOut} />

      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Top bar */}
        <div className="bg-white border-b border-sand-200 px-4 py-2 space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
              <input type="text" placeholder="Search..." value={filters.search}
                onChange={e => { setAiResults(null); setActiveView('library'); setFilters({ ...filters, search: e.target.value }); }}
                className="w-full pl-9 pr-3 py-1.5 bg-sand-50 border border-sand-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-vault-400" />
            </div>
            <button onClick={() => setShowAISearch(!showAISearch)}
              className={`p-2 rounded-xl transition-colors ${showAISearch ? 'bg-violet-500 text-white' : 'bg-violet-50 text-violet-600'} ${isViewer ? 'hidden' : ''}`}>
              <Icon name="auto_awesome" size={18} />
            </button>
            {activeView !== 'into_reading' && (
              <div className="flex rounded-lg overflow-hidden border border-sand-200">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 ${viewMode === 'grid' ? 'bg-vault-500 text-white' : 'text-gray-400'}`}><Icon name="grid_view" size={16} /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 ${viewMode === 'list' ? 'bg-vault-500 text-white' : 'text-gray-400'}`}><Icon name="view_list" size={16} /></button>
              </div>
            )}
            {isTeacher && (
              <button onClick={() => setShowUpload(!showUpload)}
                className="bg-vault-500 hover:bg-vault-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
                <Icon name="add" size={16} /> Upload
              </button>
            )}
            {isViewer && (
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-lg flex items-center gap-1">
                <Icon name="visibility" size={14} /> View Only
              </span>
            )}
          </div>
          {showAISearch && isTeacher && <AISearch onResults={(r) => { setAiResults(r); setActiveView('library'); }} onClear={() => setAiResults(null)} />}
          {showUpload && isTeacher && <UploadDropzone onUploadComplete={handleUploadComplete} />}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeView === 'into_reading' && <IRBrowser onSelectResource={(r) => setSelectedResource(r as any)} onPresent={(r, all) => { setPresentingResource(r as any); setPresentingList((all || [r]) as any[]); }} />}

          {activeView !== 'into_reading' && (
            <div className="p-4">
              {loading && !isAISearch ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-vault-200 border-t-vault-500 rounded-full animate-spin" />
                </div>
              ) : (displayResources?.length || 0) === 0 ? (
                <div className="text-center py-16">
                  <Icon name="folder_open" size={40} className="text-sand-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Nothing here yet</p>
                  <button onClick={() => setShowUpload(true)}
                    className="mt-3 bg-vault-500 hover:bg-vault-600 text-white px-4 py-2 rounded-xl text-xs font-bold">
                    Upload Resources
                  </button>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {displayResources?.map(r => (
                    <ResourceCard key={r.id} resource={r} onSelect={setSelectedResource} onToggleFavorite={handleToggleFavorite} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {displayResources?.map(r => (
                    <div key={r.id} onClick={() => setSelectedResource(r)}
                      className="flex items-center gap-3 p-2 bg-white rounded-lg border border-sand-100 hover:shadow-sm cursor-pointer">
                      <div className="w-9 h-9 rounded bg-sand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Icon name="description" size={16} className="text-sand-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 truncate">{r.title}</p>
                        <p className="text-[9px] text-sand-400">{r.resource_type}{r.category ? ` · ${r.category}` : ''}</p>
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
          )}
        </div>
      </main>

      {selectedResource && (
        <ResourceModal resource={selectedResource} onClose={() => setSelectedResource(null)}
          onUpdate={handleUpdate} onDelete={handleDelete}
          onToggleFavorite={handleToggleFavorite} onSelectRelated={(r) => setSelectedResource(r as any)}
          onPresent={(r) => { setPresentingResource(r); setPresentingList(resources as any[]); setSelectedResource(null); }} />
      )}

      {presentingResource && (
        <SmartboardViewer
          resource={presentingResource as any}
          allResources={presentingList}
          onClose={() => { setPresentingResource(null); setPresentingList([]); }}
        />
      )}
    </div>
  );
}
