'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { Resource, CATEGORIES, CATEGORY_LABELS, RESOURCE_TYPES } from '@/types';

interface ResourceSearchModalProps {
  onSelect: (resourceId: string) => void;
  onClose: () => void;
  excludeIds?: string[];
}

export default function ResourceSearchModal({ onSelect, onClose, excludeIds = [] }: ResourceSearchModalProps) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [results, setResults] = useState<(Resource & { thumbnail_url?: string })[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    if (resourceType) params.set('resource_type', resourceType);
    params.set('limit', '50');
    const res = await fetch(`/api/resources?${params}`);
    const data = await res.json();
    const exclude = new Set(excludeIds);
    setResults(Array.isArray(data) ? data.filter((r: Resource) => !exclude.has(r.id)) : []);
    setLoading(false);
  }, [search, category, resourceType, excludeIds]);

  useEffect(() => {
    const t = setTimeout(doSearch, 300);
    return () => clearTimeout(t);
  }, [doSearch]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col overflow-hidden">
        <div className="p-3 border-b border-sand-200 space-y-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-gray-900 flex-1">Add Resource</h3>
            <button onClick={onClose} className="p-1 hover:bg-sand-100 rounded"><Icon name="close" size={18} /></button>
          </div>
          <div className="relative">
            <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sand-400" />
            <input type="text" placeholder="Search resources..." value={search} onChange={e => setSearch(e.target.value)} autoFocus
              className="w-full pl-9 pr-3 py-2 bg-sand-50 border border-sand-200 rounded-lg text-sm" />
          </div>
          <div className="flex gap-2">
            <select value={category} onChange={e => setCategory(e.target.value)} className="border border-sand-200 rounded-lg px-2 py-1 text-[11px] flex-1">
              <option value="">All Categories</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
            <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="border border-sand-200 rounded-lg px-2 py-1 text-[11px] flex-1">
              <option value="">All Types</option>
              {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center"><div className="w-5 h-5 border-2 border-vault-200 border-t-vault-500 rounded-full animate-spin mx-auto" /></div>
          ) : results.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">No resources found</p>
          ) : (
            <div className="divide-y divide-sand-50">
              {results.map(r => (
                <button key={r.id} onClick={() => { onSelect(r.id); onClose(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-vault-50 text-left transition-colors">
                  <div className="w-8 h-8 rounded bg-sand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Icon name="description" size={14} className="text-sand-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 truncate">{r.title}</p>
                    <p className="text-[10px] text-sand-500">
                      {r.resource_type && <span>{r.resource_type}</span>}
                      {r.story_title && <span> · {r.story_title}</span>}
                      {r.curriculum && <span> · {r.curriculum}</span>}
                    </p>
                  </div>
                  <Icon name="add_circle" size={18} className="text-vault-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
