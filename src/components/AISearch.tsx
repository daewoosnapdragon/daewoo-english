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
          <Icon name="auto_awesome" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyber-lilac" />
          <input
            type="text"
            placeholder="Find me something for... (e.g. cause and effect worksheet grade 2)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-cyber-bg border-2 border-cyber-border rounded-none text-sm focus:border-cyber-lilac-muted outline-none placeholder:text-cyber-muted"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="btn-sweep btn-sweep-lilac px-4 py-2.5 rounded-none text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-cyber-muted rounded-full animate-spin" style={{ borderTopColor: '#c4a0d4' }} />
          ) : (
            <Icon name="search" size={18} />
          )}
          AI Search
        </button>
        {active && (
          <button
            onClick={handleClear}
            className="px-3 py-2.5 text-sm text-cyber-dim hover:bg-cyber-surface rounded-none transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        )}
      </div>

      {/* Show what AI understood */}
      {active && filtersUsed && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-cyber-muted">AI understood:</span>
          {filtersUsed.category && (
            <span className="px-2 py-0.5 bg-cyber-surface text-cyber-fg rounded-md">{filtersUsed.category}</span>
          )}
          {filtersUsed.resource_type && (
            <span className="px-2 py-0.5 bg-cyber-surface text-cyber-fg rounded-md">{filtersUsed.resource_type}</span>
          )}
          {filtersUsed.grade_level && (
            <span className="badge-lilac">Grade {filtersUsed.grade_level}</span>
          )}
          {(filtersUsed.reading_skills || []).map((s: string) => (
            <span key={s} className="badge-lilac">{s}</span>
          ))}
          {(filtersUsed.topics || []).map((t: string) => (
            <span key={t} className="badge-rose">{t}</span>
          ))}
          {(filtersUsed.search_terms || []).slice(0, 4).map((t: string) => (
            <span key={t} className="badge-dim">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
