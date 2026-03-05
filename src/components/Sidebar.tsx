'use client';

import { useState, useCallback, useEffect } from 'react';
import Icon from './Icon';
import { useAuth } from '@/lib/auth-context';
import { FilterState } from '@/types';
import BillAvatar, { useBill, NAV_TOOLTIPS } from './Bill';
import { showPrompt, showConfirm } from './Dialog';

interface SubFolder { id: string; name: string; count: number; type: 'collection' | 'auto'; }

interface SidebarProps {
  activeView: string;
  setActiveView: (v: string) => void;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  resourceCounts: Record<string, number>;
  setActiveCategory?: (cat: string) => void;
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

export default function Sidebar({ activeView, setActiveView, filters, setFilters, resourceCounts, setActiveCategory }: SidebarProps) {
  const { isTeacher, signOut } = useAuth();
  const { triggerReaction } = useBill();
  const [hovered, setHovered] = useState(false);
  const [pinned, setPinned] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sidebar-pinned') === 'true';
    }
    return false;
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [subFolders, setSubFolders] = useState<Record<string, SubFolder[]>>({});
  const [editingFolder, setEditingFolder] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Persist pin state
  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    localStorage.setItem('sidebar-pinned', String(next));
  };

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
  const goCategory = (cat: string) => {
    if (setActiveCategory) {
      setActiveCategory(cat);
      setActiveView('category_browser');
    } else {
      setFilters({ ...emptyFilters, category: cat.toLowerCase() });
      setActiveView('library');
    }
  };

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
    const name = await showPrompt('New folder name');
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
    const ok = await showConfirm(`Delete "${folder.name}"?`, { confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    await fetch(`/api/collections?id=${folder.id}`, { method: 'DELETE' });
    setSubFolders(prev => ({ ...prev, [cat]: prev[cat]?.filter(f => f.id !== folder.id) }));
  };

  const isActive = (view: string) => activeView === view;
  const isCatActive = (cat: string) => filters.category === cat.toLowerCase() && activeView === 'library' && !filters.topic && !filters.collection_id;
  const expanded = pinned || hovered || mobileOpen;

  // Mobile: close sidebar on navigation
  const goWithClose = (view: string) => { go(view); if (isMobile) setMobileOpen(false); };
  const goCategoryWithClose = (cat: string) => { goCategory(cat); if (isMobile) setMobileOpen(false); };
  const goSubFolderWithClose = (cat: string, folder: SubFolder) => { goSubFolder(cat, folder); if (isMobile) setMobileOpen(false); };

  // Mobile hamburger button (rendered outside sidebar)
  if (isMobile && !mobileOpen) {
    return (
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 w-10 h-10 flex items-center justify-center bg-cyber-bg border border-cyber-border text-cyber-fg"
      >
        <Icon name="menu" size={20} />
      </button>
    );
  }

  return (
    <>
    {/* Mobile overlay */}
    {isMobile && mobileOpen && (
      <div className="mobile-sidebar-overlay" onClick={() => setMobileOpen(false)} />
    )}
    <aside
      onMouseEnter={() => { if (!isMobile) setHovered(true); }}
      onMouseLeave={() => { if (!isMobile) { setHovered(false); setHoveredNav(null); } }}
      className={`flex-shrink-0 border-r border-cyber-border bg-cyber-bg flex flex-col h-screen overflow-hidden transition-all duration-300 ease-in-out ${
        isMobile ? 'fixed left-0 top-0 z-50' : ''
      }`}
      style={{ width: expanded ? 180 : 48, position: isMobile ? 'fixed' : 'relative', zIndex: isMobile ? 50 : 10 }}>

      <div className="px-3 py-3 border-b border-cyber-border h-10 flex items-center justify-between">
        {expanded ? (
          <>
            <span className="text-[9px] font-semibold text-cyber-fg uppercase tracking-[0.15em] whitespace-nowrap">Teacher Vault</span>
            <div className="flex items-center gap-1">
              {isMobile && (
                <button onClick={() => setMobileOpen(false)} className="text-cyber-muted hover:text-cyber-fg p-0.5">
                  <Icon name="close" size={14} />
                </button>
              )}
              {!isMobile && (
                <button onClick={togglePin} className="text-cyber-muted hover:text-cyber-fg p-0.5" title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}>
                  <Icon name={pinned ? 'push_pin' : 'push_pin'} size={12} className={pinned ? 'text-cyber-fg' : ''} />
                </button>
              )}
            </div>
          </>
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
                if (item === 'Favorites') { setFilters({ ...emptyFilters, favorites_only: true }); setActiveView('library'); if (isMobile) setMobileOpen(false); }
                else goWithClose(viewKey);
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
                    <button onClick={() => goCategoryWithClose(cat)}
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
                              <button onClick={() => goSubFolderWithClose(cat, folder)}
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
    </>
  );
}
