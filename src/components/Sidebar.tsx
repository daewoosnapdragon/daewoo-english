'use client';

import { useState, useCallback, useEffect } from 'react';
import Icon from './Icon';
import { useAuth } from '@/lib/auth-context';
import { FilterState } from '@/types';
import BillAvatar, { useBill, NAV_TOOLTIPS } from './Bill';

interface SubFolder { id: string; name: string; count: number; type: 'collection' | 'auto'; }

interface SidebarProps {
  activeView: string;
  setActiveView: (v: string) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  resourceCounts: Record<string, number>;
}

const CATEGORIES = [
  'Grammar', 'Reading', 'Writing', 'Phonics', 'Projects',
  'Seasonal', 'Assessments', 'SEL', 'Novel Study', 'Miscellaneous',
];

const NAV_ICONS: Record<string, string> = {
  Home: 'home', 'All Resources': 'folder', 'Into Reading': 'menu_book',
  Favorites: 'favorite', Recent: 'schedule', Upload: 'cloud_upload',
};

const emptyFilters: FilterState = {
  search: '', category: '', resource_type: '', grade_level: '',
  curriculum: '', favorites_only: false, collection_id: '', topic: '',
  reading_skill: '', tag_id: '',
};

export default function Sidebar({ activeView, setActiveView, filters, setFilters, resourceCounts }: SidebarProps) {
  const { isTeacher, signOut } = useAuth();
  const { triggerReaction } = useBill();
  const [hovered, setHovered] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [subFolders, setSubFolders] = useState<Record<string, SubFolder[]>>({});
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Listen for rapid clicks
  useEffect(() => {
    const handler = () => triggerReaction('rapid_click');
    window.addEventListener('bill-rapid-click', handler);
    return () => window.removeEventListener('bill-rapid-click', handler);
  }, [triggerReaction]);

  // Welcome on mount
  useEffect(() => {
    const visited = localStorage.getItem('bill-visited');
    if (!visited) {
      localStorage.setItem('bill-visited', 'true');
      triggerReaction('first_visit');
    } else {
      triggerReaction('welcome');
    }
  }, [triggerReaction]);

  const go = (view: string) => { setFilters(emptyFilters); setActiveView(view); };
  const goCategory = (cat: string) => { setFilters({ ...emptyFilters, category: cat.toLowerCase() }); setActiveView('library'); };

  const goSubFolder = (cat: string, folder: SubFolder) => {
    setActiveView('library');
    if (folder.type === 'auto') setFilters({ ...emptyFilters, category: cat.toLowerCase(), topic: folder.name });
    else setFilters({ ...emptyFilters, category: cat.toLowerCase(), collection_id: folder.id });
  };

  const toggleExpand = useCallback(async (cat: string) => {
    setExpandedCats(prev => { const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n; });
    if (!subFolders[cat]) {
      try {
        const res = await fetch(`/api/resources/collections?category=${encodeURIComponent(cat.toLowerCase())}`);
        const data = await res.json();
        if (Array.isArray(data)) setSubFolders(prev => ({ ...prev, [cat]: data }));
      } catch {}
    }
  }, [subFolders]);

  const createFolder = async (cat: string) => {
    const name = prompt('Folder name:');
    if (!name) return;
    await fetch('/api/collections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, category: cat.toLowerCase() }) });
    setSubFolders(prev => ({ ...prev, [cat]: undefined as any }));
    toggleExpand(cat);
  };

  const renameFolder = async (id: string) => {
    if (!editName.trim()) { setEditingFolder(null); return; }
    await fetch('/api/collections', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, name: editName.trim() }) });
    setEditingFolder(null); setSubFolders({});
  };

  const deleteFolder = async (cat: string, folder: SubFolder) => {
    if (!confirm(`Delete "${folder.name}"?`)) return;
    await fetch(`/api/collections?id=${folder.id}`, { method: 'DELETE' });
    setSubFolders(prev => ({ ...prev, [cat]: prev[cat]?.filter(f => f.id !== folder.id) }));
  };

  const isActive = (view: string) => activeView === view;
  const isCatActive = (cat: string) => filters.category === cat.toLowerCase() && activeView === 'library' && !filters.topic && !filters.collection_id;
  const expanded = hovered;

  return (
    <aside
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setHoveredNav(null); }}
      className="flex-shrink-0 border-r border-cyber-border bg-cyber-bg flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: expanded ? 180 : 48, position: 'relative', zIndex: 10 }}>

      <div className="px-3 py-3 border-b border-cyber-border h-10 flex items-center">
        {expanded ? (
          <span className="text-[9px] font-semibold text-cyber-fg uppercase tracking-[0.15em] whitespace-nowrap">Teacher Vault</span>
        ) : (
          <Icon name="school" size={16} className="text-cyber-fg mx-auto" />
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-1.5">
        {['Home', 'All Resources', 'Into Reading', 'Favorites', 'Recent', ...(isTeacher ? ['Upload'] : [])].map(item => {
          const viewKey = item === 'Home' ? 'home' : item === 'All Resources' ? 'library' : item === 'Into Reading' ? 'into_reading' : item === 'Favorites' ? 'library' : item === 'Recent' ? 'recent' : 'upload';
          const active = item === 'Favorites' ? (isActive('library') && filters.favorites_only) :
                         item === 'All Resources' ? (isActive('library') && !filters.category && !filters.favorites_only) :
                         isActive(viewKey);
          const count = item === 'All Resources' ? resourceCounts.total : item === 'Into Reading' ? resourceCounts.into_reading : undefined;

          return (
            <div key={item} className="relative">
              <button onClick={() => {
                if (item === 'Favorites') { setFilters({ ...emptyFilters, favorites_only: true }); setActiveView('library'); }
                else go(viewKey);
              }}
                onMouseEnter={() => setHoveredNav(item)}
                onMouseLeave={() => setHoveredNav(null)}
                className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-left transition-colors ${
                  active ? 'text-cyber-fg' : 'text-cyber-dim hover:text-cyber-fg'
                }`}
                title={!expanded ? item : undefined}>
                <Icon name={NAV_ICONS[item] || 'folder'} size={14} className="flex-shrink-0" />
                {expanded && (
                  <span className="flex-1 flex items-center justify-between text-[12px] whitespace-nowrap overflow-hidden">
                    <span>{item}</span>
                    {count != null && count > 0 && <span className="text-[9px]">{count}</span>}
                  </span>
                )}
              </button>
              {/* Bill tooltip on hover */}
              {expanded && hoveredNav === item && NAV_TOOLTIPS[item] && (
                <div style={{
                  position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)',
                  marginLeft: 8, whiteSpace: 'nowrap', fontSize: 9, color: '#5a3a42',
                  background: '#0a0a0a', border: '1px solid #2a2a2a', padding: '3px 8px',
                  animation: 'billFadeIn 0.15s ease',
                  zIndex: 20,
                }}>
                  {NAV_TOOLTIPS[item]}
                </div>
              )}
            </div>
          );
        })}

        {expanded && (
          <>
            <div className="mt-3 mb-1 px-3">
              <span className="text-[8px] font-semibold text-cyber-muted uppercase tracking-[0.15em]">Categories</span>
            </div>

            {CATEGORIES.map(cat => {
              const count = resourceCounts[`cat_${cat.toLowerCase()}`] || resourceCounts[cat.toLowerCase()] || 0;
              const isExpanded = expandedCats.has(cat);
              const folders = subFolders[cat] || [];

              return (
                <div key={cat}>
                  <div className="flex items-center group">
                    <button onClick={() => goCategory(cat)}
                      className={`flex-1 flex items-center justify-between px-3 py-1 text-[12px] text-left transition-colors ${
                        isCatActive(cat) ? 'text-cyber-fg' : 'text-cyber-dim hover:text-cyber-fg'
                      }`}>
                      <span>{cat}</span>
                      {count > 0 && <span className="text-[9px]">{count}</span>}
                    </button>
                    <button onClick={() => toggleExpand(cat)} className="w-5 h-5 flex items-center justify-center text-cyber-muted hover:text-cyber-dim">
                      <Icon name={isExpanded ? 'expand_less' : 'expand_more'} size={12} />
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="ml-3 pl-2 border-l border-cyber-border mb-1 slide-forward">
                      {folders.map(folder => {
                        const folderActive = (filters.collection_id === folder.id) || (folder.type === 'auto' && filters.topic === folder.name);
                        return (
                          <div key={folder.id} className="flex items-center group">
                            {editingFolder === folder.id ? (
                              <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') renameFolder(folder.id); if (e.key === 'Escape') setEditingFolder(null); }}
                                onBlur={() => renameFolder(folder.id)}
                                className="flex-1 px-2 py-0.5 text-[10px] bg-cyber-surface border border-cyber-border text-cyber-fg outline-none" />
                            ) : (
                              <button onClick={() => goSubFolder(cat, folder)}
                                className={`flex-1 flex items-center justify-between px-2 py-0.5 text-[10px] text-left transition-colors ${
                                  folderActive ? 'text-cyber-fg' : 'text-cyber-muted hover:text-cyber-dim'
                                }`}>
                                <span className="truncate">{folder.name}</span>
                                <span className="text-[9px] ml-1">{folder.count}</span>
                              </button>
                            )}
                            {folder.type === 'collection' && editingFolder !== folder.id && (
                              <div className="hidden group-hover:flex">
                                <button onClick={() => { setEditingFolder(folder.id); setEditName(folder.name); }} className="w-4 h-4 flex items-center justify-center text-cyber-muted hover:text-cyber-dim"><Icon name="edit" size={8} /></button>
                                <button onClick={() => deleteFolder(cat, folder)} className="w-4 h-4 flex items-center justify-center text-cyber-muted hover:text-cyber-fg"><Icon name="close" size={8} /></button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {isTeacher && (
                        <button onClick={() => createFolder(cat)} className="flex items-center gap-1 px-2 py-0.5 text-[9px] text-cyber-muted hover:text-cyber-dim">
                          + folder
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Bill + sign out */}
      <div className="border-t border-cyber-border p-2 flex flex-col gap-1">
        <div style={{ animation: 'billFloat 4s ease-in-out infinite' }}>
          <BillAvatar expanded={expanded} />
        </div>
        <button onClick={signOut} className="w-full flex items-center gap-2 px-1 py-1 text-cyber-muted hover:text-cyber-dim transition-colors" title="sign out">
          <Icon name="logout" size={14} className="flex-shrink-0" />
          {expanded && <span className="text-[10px]">sign out</span>}
        </button>
        {expanded && (
          <div className="text-center text-[8px] text-cyber-muted">cmd+K search</div>
        )}
      </div>
    </aside>
  );
}
