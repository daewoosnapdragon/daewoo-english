'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { getBillResponse } from './Bill';

interface CommandItem {
  id: string;
  label: string;
  type: 'action' | 'category' | 'resource' | 'module' | 'story';
  icon?: string;
  onSelect: () => void;
}

interface CommandPaletteProps {
  items: CommandItem[];
}

export default function CommandPalette({ items }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setQuery('');
        setSelected(0);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const billResponse = query.trim() ? getBillResponse(query) : null;
  const filtered = query.trim()
    ? items.filter(i => i.label.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : items.filter(i => i.type === 'action').slice(0, 8);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === 'Enter' && filtered[selected]) {
      filtered[selected].onSelect();
      setOpen(false);
      setQuery('');
    }
  };

  const typeLabels: Record<string, string> = {
    action: 'Action', category: 'Category', resource: 'Resource', module: 'Module', story: 'Story',
  };

  const typeColors: Record<string, string> = {
    action: '#e0a0b0', category: '#b07888', resource: '#8a5565', module: '#d4b8d4', story: '#c8899a',
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)', display: 'flex',
      alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh',
    }}
      onClick={() => setOpen(false)}>
      <div onClick={e => e.stopPropagation()}
        className="palette-enter"
        style={{
          width: '100%', maxWidth: 500,
          background: '#0a0a0a', border: '1px solid #2a2a2a',
          fontFamily: "'JetBrains Mono', monospace",
          boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        }}>
        {/* Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #2a2a2a' }}>
          <span style={{ color: '#5a3a42', fontSize: 13 }}>›</span>
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search resources, categories, actions..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: '#e0a0b0', fontSize: 13, fontFamily: 'inherit',
            }}
          />
          <span style={{ fontSize: 9, color: '#5a3a42', padding: '2px 6px', border: '1px solid #2a2a2a' }}>ESC</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {billResponse && (
            <div style={{ padding: '10px 14px', fontSize: 12, color: '#e0a0b0', borderBottom: '1px solid #1a1a1a' }}>
              {billResponse}
            </div>
          )}
          {filtered.length === 0 && !billResponse ? (
            <div style={{ padding: '20px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 18, marginBottom: 4 }}>( ᵔ.ᵔ )</div>
              <div style={{ fontSize: 11, color: '#5a3a42' }}>nothing found...</div>
            </div>
          ) : (
            filtered.map((item, i) => (
              <button key={item.id}
                onClick={() => { item.onSelect(); setOpen(false); setQuery(''); }}
                onMouseEnter={() => setSelected(i)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  width: '100%', padding: '8px 14px', border: 'none',
                  background: selected === i ? 'rgba(224,160,176,0.06)' : 'transparent',
                  color: '#e0a0b0', fontFamily: 'inherit', fontSize: 12,
                  cursor: 'pointer', textAlign: 'left',
                  borderLeft: selected === i ? '2px solid #e0a0b0' : '2px solid transparent',
                  transition: 'all 0.1s',
                }}>
                {item.icon && <Icon name={item.icon} size={14} className="text-cyber-dim" />}
                <span style={{ flex: 1 }}>
                  {query ? highlightMatch(item.label, query) : item.label}
                </span>
                <span style={{ fontSize: 9, color: typeColors[item.type] || '#5a3a42' }}>
                  {typeLabels[item.type]}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '6px 14px', borderTop: '1px solid #2a2a2a', display: 'flex', gap: 12, fontSize: 9, color: '#3a2028' }}>
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}

function highlightMatch(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#fff', background: 'rgba(224,160,176,0.2)' }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  );
}
