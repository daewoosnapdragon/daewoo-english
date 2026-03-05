'use client';

import { useState, useEffect, useCallback } from 'react';
import { Resource, FilterState } from '@/types';
import Icon from './Icon';
import ResourceCard from './ResourceCard';

interface SubFolder {
  id: string;
  name: string;
  count: number;
  type: 'collection' | 'auto';
}

interface CategoryBrowserProps {
  category: string;
  onSelectResource: (r: Resource) => void;
  onBack: () => void;
  onToggleFavorite?: (id: string, isFav: boolean) => void;
}

const CATEGORY_ICONS: Record<string, string> = {
  grammar: 'edit_note',
  reading: 'menu_book',
  writing: 'draw',
  phonics: 'abc',
  projects: 'construction',
  seasonal: 'psychiatry',
  assessments: 'quiz',
  sel: 'favorite',
  'novel study': 'auto_stories',
  miscellaneous: 'folder_special',
  misc: 'folder_special',
};

const CATEGORY_COLORS: Record<string, string> = {
  grammar: '#c4a0d4',
  reading: '#e0a0b0',
  writing: '#c8899a',
  phonics: '#b898d0',
  projects: '#d4a060',
  seasonal: '#80b890',
  assessments: '#b07888',
  sel: '#e0a0b0',
  'novel study': '#a07898',
  miscellaneous: '#9a8a82',
  misc: '#9a8a82',
};

export default function CategoryBrowser({ category, onSelectResource, onBack, onToggleFavorite }: CategoryBrowserProps) {
  const [folders, setFolders] = useState<SubFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const catLower = category.toLowerCase();
  const accent = CATEGORY_COLORS[catLower] || '#c4a0d4';
  const icon = CATEGORY_ICONS[catLower] || 'folder';

  // Fetch folders
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/resources/collections?category=${encodeURIComponent(catLower)}`);
        const data = await res.json();
        if (Array.isArray(data)) setFolders(data);
      } catch {}

      // Get total count
      try {
        const res = await fetch(`/api/resources?category=${encodeURIComponent(catLower)}&fields=light&limit=1`);
        const data = await res.json();
        // The API returns array; for count we'd need a separate endpoint. Use folders sum for now.
      } catch {}

      setLoading(false);
    })();
  }, [catLower]);

  // Fetch resources when folder selected
  const loadResources = useCallback(async (folder: SubFolder | null) => {
    setLoadingResources(true);
    setActiveFolder(folder?.id || 'all');
    try {
      let url = `/api/resources?category=${encodeURIComponent(catLower)}&fields=light&limit=200`;
      if (folder) {
        if (folder.type === 'auto') {
          url += `&topic=${encodeURIComponent(folder.name)}`;
        } else {
          url += `&collection_id=${encodeURIComponent(folder.id)}`;
        }
      }
      const res = await fetch(url);
      const data = await res.json();
      if (Array.isArray(data)) setResources(data);
    } catch {}
    setLoadingResources(false);
  }, [catLower]);

  const foldersWithCount = folders.filter(f => f.count > 0);
  const emptyFolders = folders.filter(f => f.count === 0);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div style={{ fontSize: 11, color: '#7a6068' }}>Loading {category}...</div>
      </div>
    );
  }

  // If a folder is selected, show resources
  if (activeFolder) {
    const currentFolder = folders.find(f => f.id === activeFolder);
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Breadcrumb */}
        <div className="px-4 py-2.5 border-b border-cyber-border flex items-center gap-2 flex-shrink-0" style={{ background: 'rgba(10,6,8,0.6)' }}>
          <button onClick={onBack} className="text-cyber-muted hover:text-cyber-fg text-[10px] transition-colors">
            Home
          </button>
          <span className="text-cyber-muted text-[10px]">&rsaquo;</span>
          <button onClick={() => setActiveFolder(null)} className="text-cyber-muted hover:text-cyber-fg text-[10px] transition-colors" style={{ color: accent }}>
            {category}
          </button>
          <span className="text-cyber-muted text-[10px]">&rsaquo;</span>
          <span className="text-[10px] font-medium" style={{ color: accent }}>
            {activeFolder === 'all' ? 'All Resources' : currentFolder?.name || ''}
          </span>
        </div>

        {/* Resources grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {loadingResources ? (
            <div className="text-center py-16 text-[11px] text-cyber-muted">Loading resources...</div>
          ) : resources.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-[11px] text-cyber-muted mb-2">No resources in this folder yet.</div>
              <div className="text-[9px] text-cyber-dim">Resources will appear here when they match this topic.</div>
            </div>
          ) : (
            <>
              <div className="text-[9px] text-cyber-muted mb-3">{resources.length} resources</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {resources.map(r => (
                  <ResourceCard key={r.id} resource={r as any} onSelect={onSelectResource as any} onToggleFavorite={onToggleFavorite || (() => {})} searchTerm="" />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Folder landing page
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-cyber-border flex-shrink-0" style={{ background: `linear-gradient(135deg, rgba(10,6,8,0.95), rgba(10,6,8,0.8))` }}>
        <div className="flex items-center gap-2 mb-1">
          <button onClick={onBack} className="text-cyber-muted hover:text-cyber-fg text-[10px] transition-colors">
            Home
          </button>
          <span className="text-cyber-muted text-[10px]">&rsaquo;</span>
          <span className="text-[10px]" style={{ color: accent }}>{category}</span>
        </div>
        <div className="flex items-center gap-3">
          <Icon name={icon} size={28} style={{ color: accent, opacity: 0.7 }} />
          <div>
            <h2 className="text-[20px] font-light tracking-[-0.01em]" style={{ color: accent, margin: 0 }}>{category}</h2>
            <p className="text-[10px] text-cyber-muted mt-0.5">
              {foldersWithCount.length} topics with resources
              {emptyFolders.length > 0 && ` / ${emptyFolders.length} suggested topics`}
            </p>
          </div>
          <div style={{ flex: 1 }} />
          <button
            onClick={() => loadResources(null)}
            className="text-[10px] px-3 py-1.5 border transition-all hover:translate-y-[-1px]"
            style={{ borderColor: `${accent}44`, color: accent }}
          >
            View All Resources
          </button>
        </div>
      </div>

      {/* Folder grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Folders with resources */}
        {foldersWithCount.length > 0 && (
          <div className="mb-6">
            <div className="text-[9px] font-semibold text-cyber-muted uppercase tracking-[0.12em] mb-3">Topics</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {foldersWithCount.map(folder => (
                <button
                  key={folder.id}
                  onClick={() => loadResources(folder)}
                  className="category-folder-card"
                  style={{ '--folder-accent': accent } as any}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <Icon name={folder.type === 'collection' ? 'folder' : 'auto_awesome'} size={14}
                      style={{ color: accent, opacity: 0.6 }} />
                    <span className="text-[11px] font-medium truncate" style={{ color: '#d8c8d0' }}>
                      {folder.name}
                    </span>
                  </div>
                  <div className="text-[9px] text-cyber-muted">
                    {folder.count} resource{folder.count !== 1 ? 's' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty/suggested folders */}
        {emptyFolders.length > 0 && (
          <div>
            <div className="text-[9px] font-semibold text-cyber-dim uppercase tracking-[0.12em] mb-3">
              Suggested Topics (upload resources to populate)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {emptyFolders.map(folder => (
                <div
                  key={folder.id}
                  className="px-3 py-2.5 rounded border border-dashed text-[10px] text-cyber-dim"
                  style={{ borderColor: '#2a2028' }}
                >
                  {folder.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {foldersWithCount.length === 0 && emptyFolders.length === 0 && (
          <div className="text-center py-16">
            <div className="text-[11px] text-cyber-muted mb-2">No topics found for {category}.</div>
            <div className="text-[9px] text-cyber-dim">Upload resources and run AI analysis to auto-organize them into topics.</div>
          </div>
        )}
      </div>

      <style>{`
        .category-folder-card {
          text-align: left; padding: 14px 16px;
          background: rgba(10,6,8,0.4);
          border: 1px solid #1a1218;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .category-folder-card:hover {
          border-color: var(--folder-accent, #c4a0d4);
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 1px color-mix(in srgb, var(--folder-accent, #c4a0d4) 15%, transparent);
          background: rgba(10,6,8,0.6);
        }
      `}</style>
    </div>
  );
}
