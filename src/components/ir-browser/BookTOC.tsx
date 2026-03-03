'use client';

import { CURRICULUM, CurriculumModule, getModuleStoryTitles } from '@/lib/curriculum-data';

interface BookTOCProps {
  num: number;
  color: string;
  resourceCounts: Record<number, number>;
  onOpenBook: () => void;
  onGoToModule: (mod: number, story?: string) => void;
}

export default function BookTOC({ num, color, resourceCounts, onOpenBook, onGoToModule }: BookTOCProps) {
  const book = CURRICULUM.find(b => b.book_num === num);
  if (!book) return null;

  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column' }} className="animate-fade-in">
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
          <span className="pulse-glow" style={{ fontSize: 28, fontWeight: 300, color, lineHeight: 1 }}>{num}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#e0a0b0' }}>Book {num}</span>
        </div>
        <div style={{ fontSize: 10, color: '#5a3a42' }}>Into Reading · {book.modules.length} modules</div>
      </div>

      <div style={{ height: 1, background: '#2a2a2a', marginBottom: 10 }} />

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ fontSize: 8, color: '#5a3a42', letterSpacing: '0.12em', marginBottom: 6, textTransform: 'uppercase' as const }}>
          Table of Contents
        </div>

        {book.modules.map((mod: CurriculumModule) => {
          const storyTitles = getModuleStoryTitles(mod);
          const resCount = resourceCounts[mod.module_num] || 0;

          return (
            <div key={mod.module_num} style={{ marginBottom: 4 }}>
              <div
                onClick={(e) => { e.stopPropagation(); onGoToModule(mod.module_num); }}
                className="btn-glow"
                style={{
                  padding: '6px 10px', fontSize: 11,
                  display: 'flex', alignItems: 'center', gap: 8,
                  cursor: 'pointer',
                }}>
                <span style={{ color, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, minWidth: 14, textAlign: 'center' }}>{mod.module_num}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#e0a0b0', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {mod.title}
                  </div>
                </div>
                {resCount > 0 && (
                  <span style={{ fontSize: 9, color: '#5a3a42', flexShrink: 0 }}>{resCount}</span>
                )}
              </div>

              {storyTitles.length > 0 && (
                <div style={{ paddingLeft: 32, paddingBottom: 2 }}>
                  {storyTitles.map(s => (
                    <div key={s}
                      onClick={(e) => { e.stopPropagation(); onGoToModule(mod.module_num, s); }}
                      style={{
                        fontSize: 9, color: '#5a3a42', padding: '2px 8px',
                        cursor: 'pointer', transition: 'color 0.2s',
                      }}
                      onMouseOver={e => { (e.target as HTMLElement).style.color = '#e0a0b0'; }}
                      onMouseOut={e => { (e.target as HTMLElement).style.color = '#5a3a42'; }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
