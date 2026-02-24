'use client';

import { useState } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';

interface AISearchProps {
  onResults: (resources: Resource[]) => void;
  onClear: () => void;
}

export default function AISearch({ onResults, onClear }: AISearchProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(false);
  const [filtersUsed, setFiltersUsed] = useState<any>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setActive(true);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();
      if (data.results) {
        onResults(data.results);
        setFiltersUsed(data.filters_used);
      }
    } catch (err) {
      console.error('AI search error:', err);
    }
    setLoading(false);
  };

  const handleClear = () => {
    setQuery('');
    setActive(false);
    setFiltersUsed(null);
    onClear();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Icon name="auto_awesome" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-violet-500" />
          <input
            type="text"
            placeholder="Find me something for... (e.g. cause and effect worksheet grade 2)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-white border-2 border-violet-200 rounded-xl text-sm focus:ring-2 focus:ring-violet-400 focus:border-violet-400 outline-none placeholder:text-gray-400"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="bg-violet-500 hover:bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Icon name="search" size={18} />
          )}
          AI Search
        </button>
        {active && (
          <button
            onClick={handleClear}
            className="px-3 py-2.5 text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {/* Show what AI understood */}
      {active && filtersUsed && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-400">AI understood:</span>
          {filtersUsed.category && (
            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md">{filtersUsed.category}</span>
          )}
          {filtersUsed.resource_type && (
            <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded-md">{filtersUsed.resource_type}</span>
          )}
          {filtersUsed.grade_level && (
            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md">Grade {filtersUsed.grade_level}</span>
          )}
          {(filtersUsed.reading_skills || []).map((s: string) => (
            <span key={s} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md">{s}</span>
          ))}
          {(filtersUsed.topics || []).map((t: string) => (
            <span key={t} className="px-2 py-0.5 bg-green-50 text-green-700 rounded-md">{t}</span>
          ))}
          {(filtersUsed.search_terms || []).slice(0, 4).map((t: string) => (
            <span key={t} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
