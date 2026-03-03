'use client';

/** Reusable skeleton loaders that match the layout of real content */

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" style={{ width: '40%' }} />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2 border border-cyber-border">
          <div className="skeleton" style={{ width: 36, height: 36 }} />
          <div className="flex-1">
            <div className="skeleton skeleton-text" style={{ width: '50%' }} />
            <div className="skeleton skeleton-text" style={{ width: '25%', height: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonShelf() {
  return (
    <div style={{ display: 'flex', gap: 3, height: 280 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="skeleton" style={{ flex: 1, height: '100%', borderRadius: 0 }} />
      ))}
    </div>
  );
}
