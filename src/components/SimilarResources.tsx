'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';

interface SimilarResourcesProps {
  resourceId: string;
  onSelect: (resource: Resource) => void;
}

export default function SimilarResources({ resourceId, onSelect }: SimilarResourcesProps) {
  const [similar, setSimilar] = useState<(Resource & { match_reason?: string; thumbnail_url?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/similar/${resourceId}`)
      .then(r => r.json())
      .then(data => {
        setSimilar(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [resourceId]);

  if (loading) {
    return (
      <div className="py-3 text-center">
        <div className="w-5 h-5 border-2 border-sand-200 border-t-vault-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!similar.length) return null;

  return (
    <div>
      <p className="text-[10px] font-semibold text-sand-400 uppercase mb-2 flex items-center gap-1">
        <Icon name="recommend" size={14} />
        Similar Resources
      </p>
      <div className="space-y-1">
        {similar.slice(0, 8).map(r => (
          <div
            key={r.id}
            onClick={() => onSelect(r)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-sand-50 cursor-pointer transition-colors"
          >
            <div className="w-8 h-8 rounded bg-sand-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Icon name="description" size={16} className="text-sand-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{r.title}</p>
              <p className="text-[10px] text-sand-400">
                {r.match_reason || r.resource_type || ''}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
