'use client';

import Icon from '../Icon';
import { Resource } from '@/types';

// ========== CONSTELLATION DOT ==========
export function ConstellationDot({ active, isLast }: { active: boolean; isLast: boolean }) {
  return (
    <span className="relative flex-shrink-0" style={{ width: 8, height: 8 }}>
      <span className="absolute inset-0 rounded-full border transition-all duration-300"
        style={{
          borderColor: active ? '#c4a0d4' : '#5a3a42',
          background: active ? '#c4a0d4' : 'transparent',
          boxShadow: active ? '0 0 8px rgba(196,160,212,0.4), 0 0 3px rgba(196,160,212,0.6)' : 'none',
          animation: active ? 'constellationPulse 3s ease-in-out infinite' : 'none',
        }} />
      {!isLast && (
        <span className="absolute left-1/2 top-full -translate-x-1/2" style={{
          width: 1, height: 18, background: '#2a2a2a',
        }} />
      )}
    </span>
  );
}

// ========== ORBIT SECTION ==========
export function OrbitSection({ title, subtitle, profileButton, children }: {
  title: string; subtitle: string; profileButton?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-[14px] font-medium text-cyber-fg">{title}</h3>
          <p className="text-[9px] text-cyber-dim mt-1">{subtitle}</p>
        </div>
        {profileButton}
      </div>
      {children}
    </div>
  );
}

// ========== ORBIT CARD ==========
export function OrbitCard({ resource, onSelect, onPresent, onContextMenu }: {
  resource: any; onSelect: (r: Resource) => void; onPresent?: (r: any) => void;
  onContextMenu?: (e: React.MouseEvent, r: any) => void;
}) {
  return (
    <div className="border border-cyber-border p-3 cursor-pointer transition-all hover:border-cyber-lilac-muted group relative overflow-hidden"
      style={{ transition: 'all 0.3s ease' }}
      onClick={() => onSelect(resource)}
      onContextMenu={(e) => onContextMenu?.(e, resource)}
      onMouseOver={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(196,160,212,0.08)';
      }}
      onMouseOut={e => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}>
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'linear-gradient(to right, #c4a0d4, transparent)' }} />

      <div className="text-[8px] font-bold text-cyber-lilac-dim uppercase tracking-[0.1em] mb-1.5">
        {resource.resource_type}
      </div>
      <div className="text-[12px] text-cyber-fg font-normal leading-snug mb-1.5 line-clamp-2">
        {resource.title}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-cyber-muted">
          {resource.page_count ? `${resource.page_count}p` : ''}{resource.file_type ? ` · ${resource.file_type.toUpperCase()}` : ''}
        </span>
        {resource.file_url && onPresent && (
          <button onClick={(e) => { e.stopPropagation(); onPresent(resource); }}
            className="btn-glow px-1.5 py-0.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity">
            Present
          </button>
        )}
      </div>
    </div>
  );
}

// ========== RESOURCE ORBIT GRID ==========
export function ResourceOrbitGrid({ resources, onSelect, onPresent, onContextMenu }: {
  resources: any[];
  onSelect: (r: Resource) => void;
  onPresent?: (r: any) => void;
  onContextMenu?: (e: React.MouseEvent, r: any) => void;
}) {
  const groups = new Map<string, any[]>();
  for (const r of resources) {
    const type = r.resource_type || 'Other';
    if (!groups.has(type)) groups.set(type, []);
    groups.get(type)!.push(r);
  }

  if (groups.size <= 1 || resources.length <= 4) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {resources.map(r => (
          <OrbitCard key={r.id} resource={r} onSelect={onSelect} onPresent={onPresent} onContextMenu={onContextMenu} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Array.from(groups.entries()).map(([type, items]) => (
        <div key={type}>
          <div className="text-[9px] font-bold text-cyber-lilac-dim uppercase tracking-[0.12em] mb-2">{type}s</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {items.map(r => (
              <OrbitCard key={r.id} resource={r} onSelect={onSelect} onPresent={onPresent} onContextMenu={onContextMenu} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ========== BREADCRUMB ==========
export function Breadcrumb({ steps }: { steps: { label: string; onClick?: () => void; active?: boolean }[] }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center">
          {i > 0 && (
            <span style={{ margin: '0 6px', color: '#3a2028', fontSize: 10 }}>›</span>
          )}
          {step.active ? (
            <span className="text-[11px] text-cyber-fg font-medium px-2 py-1 border border-cyber-border bg-cyber-surface">
              {step.label}
            </span>
          ) : (
            <button onClick={step.onClick}
              className="text-[11px] text-cyber-dim hover:text-cyber-fg px-2 py-1 border border-transparent hover:border-cyber-border transition-all">
              {step.label}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
