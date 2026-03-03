'use client';

import { useState, useCallback, useEffect } from 'react';
import { FilterState } from '@/types';
import Icon from './Icon';

interface SubFolder { id: string; name: string; count: number; type: 'collection' | 'auto'; }

interface CategoryShelfProps {
  counts: Record<string, number>;
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  setActiveView: (v: string) => void;
  setActiveCategory?: (cat: string) => void;
}

const emptyFilters: FilterState = {
  search: '', category: '', resource_type: '', grade_level: '',
  curriculum: '', topic: '', reading_skill: '',
  favorites_only: false, collection_id: '', tag_id: '',
};

// Two shelf rows
const TOP_SHELF = [
  { key: 'into_reading', label: 'Into Reading', isSpecial: true },
  { key: 'all', label: 'All Resources', isSpecial: true },
  { key: 'Grammar', label: 'Grammar' },
  { key: 'Reading', label: 'Reading' },
  { key: 'Writing', label: 'Writing' },
  { key: 'Phonics', label: 'Phonics' },
];

const BOTTOM_SHELF = [
  { key: 'Projects', label: 'Projects' },
  { key: 'Seasonal', label: 'Seasonal' },
  { key: 'Assessments', label: 'Assessments' },
  { key: 'SEL', label: 'SEL' },
  { key: 'Novel Study', label: 'Novel Study' },
  { key: 'Miscellaneous', label: 'Misc' },
  { key: 'favorites', label: 'Favorites', isSpecial: true },
];

// Palette for spines — rose, lilac, and warm muted tones
const SPINE_PALETTE = [
  '#c4a0d4', '#e0a0b0', '#b07888', '#d4b8d4', '#c8899a', '#a07898',
  '#d0a8b8', '#b898d0', '#c09088', '#a88898', '#c0b0c8', '#b0a090', '#d4a0c0',
];

export default function CategoryShelf({ counts, filters, setFilters, setActiveView, setActiveCategory }: CategoryShelfProps) {
  const [pulledSpine, setPulledSpine] = useState<string | null>(null);
  const [subFolders, setSubFolders] = useState<Record<string, SubFolder[]>>({});
  const [loadingFolders, setLoadingFolders] = useState<string | null>(null);
  const [recentCat, setRecentCat] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('tv-recent-category');
    if (stored) setRecentCat(stored);
  }, []);

  const fetchFolders = useCallback(async (cat: string) => {
    if (subFolders[cat]) return;
    setLoadingFolders(cat);
    try {
      const res = await fetch(`/api/resources/collections?category=${encodeURIComponent(cat.toLowerCase())}`);
      const data = await res.json();
      if (Array.isArray(data)) setSubFolders(prev => ({ ...prev, [cat]: data }));
    } catch {}
    setLoadingFolders(null);
  }, [subFolders]);

  const pullSpine = (key: string) => {
    if (pulledSpine === key) {
      openCategory(key);
    } else {
      setPulledSpine(key);
      if (!['into_reading', 'all', 'favorites'].includes(key)) {
        fetchFolders(key);
      }
    }
  };

  const openCategory = (key: string) => {
    localStorage.setItem('tv-recent-category', key);
    setRecentCat(key);

    if (key === 'into_reading') {
      setActiveView('into_reading');
    } else if (key === 'all') {
      setFilters(emptyFilters);
      setActiveView('library');
    } else if (key === 'favorites') {
      setFilters({ ...emptyFilters, favorites_only: true });
      setActiveView('library');
    } else {
      if (setActiveCategory) {
        setActiveCategory(key);
        setActiveView('category_browser');
      } else {
        setFilters({ ...emptyFilters, category: key.toLowerCase() });
        setActiveView('library');
      }
    }
  };

  const openSubFolder = (cat: string, folder: SubFolder) => {
    localStorage.setItem('tv-recent-category', cat);
    setActiveView('library');
    if (folder.type === 'auto') {
      setFilters({ ...emptyFilters, category: cat.toLowerCase(), topic: folder.name });
    } else {
      setFilters({ ...emptyFilters, category: cat.toLowerCase(), collection_id: folder.id });
    }
  };

  const getCount = (key: string) => {
    if (key === 'into_reading') return counts.into_reading || 0;
    if (key === 'all') return counts.total || 0;
    if (key === 'favorites') return counts.favorites || 0;
    return counts[`cat_${key.toLowerCase()}`] || counts[key.toLowerCase()] || 0;
  };

  return (
    <div className="flex-1 overflow-y-auto bg-cyber-bg page-enter">
      <div className="max-w-3xl mx-auto p-8">
        <div className="text-[10px] font-semibold text-cyber-fg uppercase tracking-[0.15em] mb-1">Teacher Vault</div>
        <p className="text-cyber-dim text-[12px] mb-4">Pull a spine to browse</p>

        {/* Quick stats */}
        <div className="flex items-center gap-4 mb-8 text-[10px]">
          <div className="flex items-center gap-1.5 text-cyber-dim">
            <Icon name="folder" size={12} />
            <span className="text-cyber-fg">{counts.total || 0}</span> resources
          </div>
          <div className="flex items-center gap-1.5 text-cyber-dim">
            <Icon name="favorite" size={12} />
            <span className="text-cyber-fg">{counts.favorites || 0}</span> favorites
          </div>
          <div className="flex items-center gap-1.5 text-cyber-dim">
            <Icon name="menu_book" size={12} />
            <span className="text-cyber-fg">{counts.into_reading || 0}</span> Into Reading
          </div>
        </div>

        {/* Top shelf */}
        <div className="text-[8px] text-cyber-muted uppercase tracking-[0.15em] mb-3">Curriculum</div>
        <Shelf
          items={TOP_SHELF}
          colorOffset={0}
          pulledSpine={pulledSpine}
          recentCat={recentCat}
          subFolders={subFolders}
          loadingFolders={loadingFolders}
          getCount={getCount}
          onPull={pullSpine}
          onOpen={openCategory}
          onOpenSubFolder={openSubFolder}
          height={300}
        />

        <div style={{ height: 28 }} />

        {/* Bottom shelf */}
        <div className="text-[8px] text-cyber-muted uppercase tracking-[0.15em] mb-3">Collections</div>
        <Shelf
          items={BOTTOM_SHELF}
          colorOffset={TOP_SHELF.length}
          pulledSpine={pulledSpine}
          recentCat={recentCat}
          subFolders={subFolders}
          loadingFolders={loadingFolders}
          getCount={getCount}
          onPull={pullSpine}
          onOpen={openCategory}
          onOpenSubFolder={openSubFolder}
          height={280}
        />
      </div>
    </div>
  );
}

// ========== SHELF ROW ==========
interface ShelfProps {
  items: { key: string; label: string; isSpecial?: boolean }[];
  colorOffset: number;
  pulledSpine: string | null;
  recentCat: string | null;
  subFolders: Record<string, SubFolder[]>;
  loadingFolders: string | null;
  getCount: (key: string) => number;
  onPull: (key: string) => void;
  onOpen: (key: string) => void;
  onOpenSubFolder: (cat: string, folder: SubFolder) => void;
  height: number;
}

function Shelf({ items, colorOffset, pulledSpine, recentCat, subFolders, loadingFolders, getCount, onPull, onOpen, onOpenSubFolder, height }: ShelfProps) {
  return (
    <>
      <div className="shelf-responsive" style={{ display: 'flex', gap: 3, height, borderBottom: '2px solid #2a2a2a' }}>
        {items.map((item, i) => {
          const isPulled = pulledSpine === item.key;
          const isOther = pulledSpine !== null && !isPulled;
          const isRecent = recentCat === item.key;
          const color = SPINE_PALETTE[(colorOffset + i) % SPINE_PALETTE.length];
          const count = getCount(item.key);
          const folders = subFolders[item.key] || [];
          const isLoading = loadingFolders === item.key;
          const isSpecial = item.isSpecial;

          return (
            <button key={item.key}
              onClick={() => onPull(item.key)}
              style={{
                flex: isPulled ? '1 1 auto' : '0 0 auto',
                width: isPulled ? undefined : isOther ? 40 : `calc(${100 / items.length}% - 3px)`,
                minWidth: isPulled ? 260 : 40,
                height: '100%',
                border: `1px solid ${isPulled ? color : '#2a2a2a'}`,
                borderBottom: `3px solid ${color}`,
                background: isPulled ? 'rgba(224,160,176,0.02)' : 'transparent',
                fontFamily: 'inherit', cursor: 'pointer', textAlign: 'left',
                padding: 0, overflow: 'hidden',
                transition: 'all 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
                transform: isPulled ? 'translateY(-6px)' : 'none',
                boxShadow: isPulled ? `0 6px 24px rgba(224,160,176,0.06)` : 'none',
                display: 'flex', flexDirection: 'column',
                position: 'relative',
              }}>

              {/* Bookmark for recent */}
              {isRecent && !isPulled && (
                <div style={{
                  position: 'absolute', top: -1, right: 6,
                  width: 10, height: 16,
                  background: color, opacity: 0.6,
                  clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 75%, 0 100%)',
                }} />
              )}

              {/* Spine view (collapsed) */}
              {!isPulled && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 8, padding: '12px 0',
                }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{
                      writingMode: 'vertical-lr', transform: 'rotate(180deg)',
                      fontSize: 10, color, letterSpacing: '0.12em', whiteSpace: 'nowrap',
                      opacity: isOther ? 0.5 : 0.8,
                      transition: 'opacity 0.3s ease',
                    }}>
                      {item.label.toUpperCase()}
                    </span>
                  </div>
                  {!isOther && (
                    <span style={{ fontSize: 8, color: '#5a3a42', letterSpacing: '0.1em' }}>
                      {count > 0 ? count : ''}
                    </span>
                  )}
                </div>
              )}

              {/* Pulled / expanded view */}
              {isPulled && (
                <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#e0a0b0' }}>{item.label}</div>
                    <div style={{ fontSize: 10, color: '#5a3a42', marginTop: 2 }}>{count} resource{count !== 1 ? 's' : ''}</div>
                  </div>

                  <div style={{ height: 1, background: '#2a2a2a', marginBottom: 10 }} />

                  <div style={{ flex: 1, overflow: 'auto' }}>
                    <div className="btn-sweep"
                      onClick={(e) => { e.stopPropagation(); onOpen(item.key); }}
                      style={{ padding: '8px 12px', marginBottom: 10, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderColor: color }}>
                      <span>Open {item.label}</span>
                      <span>→</span>
                    </div>

                    {!isSpecial && (<>
                      {isLoading && <div style={{ fontSize: 9, color: '#5a3a42', padding: '4px 0' }}>Loading...</div>}
                      {folders.length > 0 && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ fontSize: 8, color: '#5a3a42', letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' as const }}>Subfolders</div>
                          {folders.map(f => (
                            <div key={f.id} onClick={(e) => { e.stopPropagation(); onOpenSubFolder(item.key, f); }} className="btn-glow"
                              style={{ padding: '5px 10px', marginBottom: 2, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <span style={{ color: '#e0a0b0' }}>{f.name}</span>
                              <span style={{ fontSize: 9, color: '#5a3a42' }}>{f.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {!isLoading && folders.length === 0 && (
                        <div style={{ fontSize: 9, color: '#3a2028', fontStyle: 'italic', padding: '4px 0' }}>No subfolders yet</div>
                      )}
                    </>)}

                    {item.key === 'into_reading' && <div style={{ fontSize: 9, color: '#5a3a42', marginTop: 4 }}>Books 1–4 · Modules · Stories</div>}
                    {item.key === 'favorites' && <div style={{ fontSize: 9, color: '#5a3a42', marginTop: 4 }}>Your saved resources</div>}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {/* Shelf shadow */}
      <div style={{ height: 4, background: 'linear-gradient(to bottom, rgba(224,160,176,0.03), transparent)' }} />
    </>
  );
}
