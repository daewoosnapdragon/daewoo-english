'use client';

import { Resource } from '@/types';
import Icon from './Icon';

const TYPE_DOTS: Record<string, string> = {
  'Teaching Pal': 'bg-indigo-500',
  'Passage': 'bg-blue-500',
  'Read Aloud': 'bg-blue-400',
  'Close Reading': 'bg-blue-600',
  'Worksheet': 'bg-green-500',
  'Activity': 'bg-emerald-500',
  'Assessment': 'bg-purple-500',
  'Graphic Organizer': 'bg-teal-500',
  'Anchor Chart': 'bg-pink-500',
  'Writing Prompt': 'bg-orange-500',
  'Game': 'bg-yellow-500',
  'Presentation': 'bg-red-400',
  'Reference': 'bg-gray-500',
};

interface ResourceCardProps {
  resource: Resource & { thumbnail_url?: string | null };
  onSelect: (r: Resource & { thumbnail_url?: string | null; file_url?: string }) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
}

export default function ResourceCard({ resource, onSelect, onToggleFavorite }: ResourceCardProps) {
  const dotColor = TYPE_DOTS[resource.resource_type] || 'bg-sand-400';

  return (
    <div onClick={() => onSelect(resource as any)}
      className="group bg-white rounded-xl border border-sand-200 overflow-hidden hover:shadow-md hover:border-vault-300 cursor-pointer transition-all">
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-sand-100 relative overflow-hidden">
        {resource.thumbnail_url ? (
          <img src={resource.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Icon name={resource.file_type === 'pdf' ? 'picture_as_pdf' : resource.file_type === 'presentation' ? 'slideshow' : 'description'}
              size={32} className="text-sand-300" />
          </div>
        )}

        {/* Top-right badges */}
        <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
          {resource.ai_processed && (
            <span className="w-5 h-5 bg-violet-500/90 rounded-full flex items-center justify-center">
              <Icon name="auto_awesome" size={12} className="text-white" />
            </span>
          )}
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(resource.id, !resource.is_favorite); }}
            className="w-5 h-5 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Icon name="star" size={14} filled={resource.is_favorite} className={resource.is_favorite ? 'text-amber-500' : 'text-gray-400'} />
          </button>
        </div>

        {/* Type dot + label overlay */}
        {resource.resource_type && (
          <div className="absolute bottom-1.5 left-1.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-white/90 text-gray-700`}>
              <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
              {resource.resource_type}
            </span>
          </div>
        )}
      </div>

      {/* Info - minimal */}
      <div className="p-2">
        <p className="text-xs font-medium text-gray-900 line-clamp-2 leading-tight">{resource.title}</p>
        {resource.story_title && (
          <p className="text-[10px] text-vault-600 truncate mt-0.5">{resource.story_title}</p>
        )}
      </div>
    </div>
  );
}
