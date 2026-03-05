'use client';

import { useState } from 'react';
import { Resource } from '@/types';
import Icon from './Icon';

interface ResourceCardProps {
  resource: Resource & { thumbnail_url?: string | null };
  onSelect: (r: Resource & { thumbnail_url?: string | null; file_url?: string }) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  searchTerm?: string;
}

export default function ResourceCard({ resource, onSelect, onToggleFavorite, searchTerm }: ResourceCardProps) {
  const [bouncing, setBouncing] = useState(false);

  const handleFav = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBouncing(true);
    onToggleFavorite(resource.id, !resource.is_favorite);
    setTimeout(() => setBouncing(false), 400);
  };

  const highlightTitle = (text: string) => {
    if (!searchTerm) return text;
    const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (idx === -1) return text;
    return (
      <>{text.slice(0, idx)}<span style={{ color: '#fff', background: 'rgba(224,160,176,0.25)' }}>{text.slice(idx, idx + searchTerm.length)}</span>{text.slice(idx + searchTerm.length)}</>
    );
  };

  return (
    <div onClick={() => onSelect(resource as any)}
      className="cyber-card cursor-pointer group px-4 py-3">
      <div className="flex items-start gap-3">
        {resource.thumbnail_url && (
          <div className="w-10 h-10 flex-shrink-0 overflow-hidden border border-cyber-border bg-cyber-surface">
            <img src={resource.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-cyber-fg leading-relaxed font-normal transition-colors">
            {highlightTitle(resource.title)}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-[10px] text-cyber-muted">{resource.resource_type || 'Resource'}</span>
            <div className="flex items-center gap-2">
              {resource.page_count && resource.page_count > 1 && (
                <span className="text-[9px] text-cyber-muted">{resource.page_count}p</span>
              )}
              {resource.ai_processed && (
                <Icon name="auto_awesome" size={10} className="text-cyber-dim" />
              )}
              <button onClick={handleFav}
                className={`transition-all ${bouncing ? 'fav-bounce' : ''} ${resource.is_favorite ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'}`}>
                <Icon name="favorite" size={11} filled={resource.is_favorite}
                  className={resource.is_favorite ? 'text-cyber-fg' : 'text-cyber-muted'} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
