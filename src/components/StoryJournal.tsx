'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';
import ResourceSearchModal from './ResourceSearchModal';
import { showConfirm } from './Dialog';
import SemesterPlanViewer from './SemesterPlanViewer';

interface StoryJournalProps {
  bookNum: number;
  moduleNum: number;
  storyTitle: string;
  resources: (Resource & { file_url?: string })[];
  allModuleResources: Resource[];
  hasProfile: boolean;
  profileResourceId?: string;
  onSelectResource: (r: Resource) => void;
  onPresent?: (r: Resource & { file_url?: string }) => void;
  onOpenProfile: () => void;
  onFocusMode?: (active: boolean) => void;
  onJumpToStory?: (story: string) => void;
}

interface JournalSection {
  id: string;
  folder_name: string;
  notes: string;
  resource_ids: string[];
  sort_order?: number;
  resources: (Resource & { thumbnail_url?: string })[];
}

const SECTION_META: Record<string, { icon: string; color: string; hint: string }> = {
  Grammar:       { icon: 'edit_note',     color: '#c4a0d4', hint: 'mentor sentences, grammar focus, mini-lessons...' },
  Phonics:       { icon: 'abc',           color: '#e0a0b0', hint: 'phonics connections, word patterns, decoding...' },
  Vocabulary:    { icon: 'translate',     color: '#b898d0', hint: 'tier 2/3 words, word walls, context clues...' },
  Writing:       { icon: 'draw',          color: '#c8899a', hint: 'writing prompts, mentor text connections...' },
  Comprehension: { icon: 'menu_book',     color: '#d4b8d4', hint: 'reading skills, close reading, questions...' },
  Centers:       { icon: 'groups',        color: '#a07898', hint: 'center rotations, activities, games...' },
  Assessment:    { icon: 'quiz',          color: '#b07888', hint: 'formative checks, exit tickets, rubrics...' },
  'My Notes':    { icon: 'sticky_note_2', color: '#e0a0b0', hint: 'anything else — your space...' },
};

const PBL_SECTION_META: Record<string, { icon: string; color: string; hint: string }> = {
  'Driving Question':   { icon: 'help_center',    color: '#d4a060', hint: 'essential question that drives the project...' },
  'Project Overview':   { icon: 'architecture',   color: '#e0a0b0', hint: 'what students will create, timeline, materials...' },
  'Success Criteria':   { icon: 'checklist',      color: '#80b890', hint: 'rubric, standards alignment, what mastery looks like...' },
  'Student Groups':     { icon: 'groups',         color: '#88a8d8', hint: 'group assignments, roles, differentiation...' },
  'Scaffolding':        { icon: 'stairs',         color: '#c4a0d4', hint: 'mini-lessons, checkpoints, supports...' },
  'Presentation Plan':  { icon: 'present_to_all', color: '#b07888', hint: 'how students will share, audience, celebration...' },
  'My Notes':           { icon: 'sticky_note_2',  color: '#e0a0b0', hint: 'anything else — your space...' },
};

// ============================================================
// RICH TEXT EDITOR
// ============================================================
function RichEditor({ html, onSave, placeholder, accentColor }: {
  html: string; onSave: (html: string) => void; placeholder: string; accentColor: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState(false);
  const [toolbar, setToolbar] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!html);

  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); ref.current?.focus(); };
  const checkEmpty = () => { if (ref.current) setIsEmpty(ref.current.innerText.trim().length === 0); };
  const handleFocus = () => { setEditing(true); setToolbar(true); };
  const save = () => { setToolbar(false); setEditing(false); if (ref.current) { onSave(ref.current.innerHTML); checkEmpty(); } };
  const handleBlur = (e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement;
    if (related?.closest?.('.journal-toolbar')) return;
    save();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
    checkEmpty();
  };

  return (
    <div style={{ position: 'relative' }}>
      {toolbar && (
        <div className="journal-toolbar" style={{ display: 'flex', gap: 2, padding: '4px 0', marginBottom: 4, borderBottom: `1px solid ${accentColor}33` }}>
          {[
            { cmd: 'bold', label: 'B', style: { fontWeight: 700 } },
            { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' } },
            { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' } },
          ].map(b => (
            <button key={b.cmd} tabIndex={-1} onMouseDown={e => { e.preventDefault(); exec(b.cmd); }} style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid transparent', cursor: 'pointer',
              color: '#8a6068', fontSize: 12, fontFamily: 'inherit', ...b.style,
            }}>{b.label}</button>
          ))}
          {[
            { cmd: 'insertUnorderedList', icon: 'format_list_bulleted' },
            { cmd: 'insertOrderedList', icon: 'format_list_numbered' },
            { cmd: 'formatBlock:h3', icon: 'title' },
            { cmd: 'removeFormat', icon: 'format_clear' },
          ].map(b => (
            <button key={b.cmd} tabIndex={-1} onMouseDown={e => {
              e.preventDefault();
              const [c, v] = b.cmd.split(':');
              exec(c, v);
            }} style={{
              width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'none', border: '1px solid transparent', cursor: 'pointer',
              color: '#8a6068', fontSize: 16,
            }}>
              <Icon name={b.icon} size={16} />
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={save} style={{
            padding: '3px 12px', fontSize: 9, fontFamily: 'inherit',
            background: 'none', border: `1px solid ${accentColor}66`, color: accentColor, cursor: 'pointer',
          }}>done</button>
        </div>
      )}
      <div
        ref={ref} contentEditable suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onInput={checkEmpty}
        onPaste={handlePaste}
        dangerouslySetInnerHTML={{ __html: html || '' }}
        className="journal-editable"
        style={{
          minHeight: editing ? 80 : 28, outline: 'none',
          fontSize: 12.5, lineHeight: 1.75, color: '#3a2028',
          padding: '6px 4px',
          borderLeft: editing ? `2px solid ${accentColor}` : '2px solid transparent',
          paddingLeft: editing ? 12 : 4, transition: 'all 0.2s', cursor: 'text',
        }}
      />
      {isEmpty && !editing && (
        <div style={{ position: 'absolute', top: 6, left: 4, pointerEvents: 'none', fontSize: 12, color: '#c0a0a8', fontStyle: 'italic' }}>
          {placeholder}
        </div>
      )}
    </div>
  );
}

// ============================================================
// AI ASSIST
// ============================================================
function AiAssist({ sectionName, notes, bookNum, moduleNum, storyTitle, onResult }: {
  sectionName: string; notes: string; bookNum: number; moduleNum: number; storyTitle: string;
  onResult: (html: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const runAi = async (action: string) => {
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/ai/journal-assist', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, section: sectionName, notes, book_num: bookNum, module_num: moduleNum, story_title: storyTitle }),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const data = await res.json();
      onResult(data.html || data.result || '');
      setOpen(false);
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      fontSize: 9, color: '#8a6878', background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3,
    }}><Icon name="auto_awesome" size={10} /> ai assist</button>
  );

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {[
          { label: 'Organize my notes', action: 'organize' },
          { label: 'Suggest activities', action: 'suggest_activities' },
          { label: 'Expand / add detail', action: 'expand' },
          { label: 'Create questions', action: 'create_questions' },
        ].map(p => (
          <button key={p.action} onClick={() => runAi(p.action)} disabled={loading} style={{
            padding: '4px 10px', fontSize: 9, fontFamily: 'inherit',
            background: 'none', border: '1px solid #d0b8c0', color: '#8a6878',
            cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1,
          }}>{p.label}</button>
        ))}
        <button onClick={() => setOpen(false)} style={{ fontSize: 9, color: '#b09098', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>cancel</button>
      </div>
      {loading && <div style={{ fontSize: 9, color: '#8a6878', marginTop: 4 }}>thinking...</div>}
      {error && <div style={{ fontSize: 9, color: '#a06070', marginTop: 4 }}>{error}</div>}
    </div>
  );
}

// ============================================================
// FLOATING EDITOR (draggable + resizable pop-out window)
// ============================================================

const TEXT_COLORS = [
  { label: 'Default', color: '#3a2028' },
  { label: 'Rose', color: '#c0506a' },
  { label: 'Plum', color: '#8a3070' },
  { label: 'Lavender', color: '#7060b0' },
  { label: 'Blue', color: '#4070b0' },
  { label: 'Teal', color: '#307878' },
  { label: 'Green', color: '#407830' },
  { label: 'Amber', color: '#a07020' },
  { label: 'Rust', color: '#a04830' },
];

const HIGHLIGHT_COLORS = [
  { label: 'None', color: 'transparent' },
  { label: 'Pink', color: '#fce4ec' },
  { label: 'Lavender', color: '#ede7f6' },
  { label: 'Sky', color: '#e3f2fd' },
  { label: 'Mint', color: '#e8f5e9' },
  { label: 'Lemon', color: '#fffde7' },
  { label: 'Peach', color: '#fff3e0' },
  { label: 'Coral', color: '#fbe9e7' },
];

function FloatingEditor({ sectionName, sectionIcon, accentColor, html, placeholder, onSave, onClose }: {
  sectionName: string; sectionIcon: string; accentColor: string;
  html: string; placeholder: string;
  onSave: (html: string) => void; onClose: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 40, y: 50 });
  const [size, setSize] = useState({ w: 580, h: 460 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!html);
  const [showColorPicker, setShowColorPicker] = useState<'text' | 'highlight' | null>(null);
  const [showHeadingMenu, setShowHeadingMenu] = useState(false);
  const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const exec = (cmd: string, val?: string) => { document.execCommand(cmd, false, val); editorRef.current?.focus(); };

  const checkEmpty = () => {
    if (editorRef.current) {
      const text = editorRef.current.innerText.trim();
      setIsEmpty(text.length === 0);
    }
  };

  const handleSaveAndClose = () => {
    if (editorRef.current) onSave(editorRef.current.innerHTML);
    onClose();
  };

  // Paste as plain text
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const onDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('.toolbar-dropdown')) return;
    setDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  const onResizeStart = (e: React.MouseEvent) => {
    setResizing(true);
    dragOffset.current = { x: e.clientX, y: e.clientY };
    e.preventDefault();
    e.stopPropagation();
  };

  useEffect(() => {
    if (!dragging && !resizing) return;
    const onMove = (e: MouseEvent) => {
      if (dragging) {
        setPos({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
      }
      if (resizing) {
        const dx = e.clientX - dragOffset.current.x;
        const dy = e.clientY - dragOffset.current.y;
        setSize(prev => ({ w: Math.max(380, prev.w + dx), h: Math.max(260, prev.h + dy) }));
        dragOffset.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onUp = () => { setDragging(false); setResizing(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging, resizing]);

  useEffect(() => { setTimeout(() => { editorRef.current?.focus(); checkEmpty(); }, 100); }, []);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleSaveAndClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close dropdowns when clicking outside toolbar
  const toolbarRef = useRef<HTMLDivElement>(null);
  const closeDropdowns = useCallback(() => {
    setShowColorPicker(null); setShowHeadingMenu(false); setShowFontSizeMenu(false);
  }, []);

  const ToolBtn = ({ onMouseDown: handler, icon, label, title, active, style: s }: {
    onMouseDown: (e: React.MouseEvent) => void; icon?: string; label?: string; title?: string; active?: boolean; style?: any;
  }) => (
    <button tabIndex={-1} title={title} onMouseDown={e => { e.preventDefault(); handler(e); }} style={{
      width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'rgba(196,160,212,0.12)' : 'none', border: '1px solid transparent',
      borderRadius: 3, cursor: 'pointer', color: '#6a4a58', fontSize: 12, fontFamily: 'inherit',
      transition: 'background 0.15s', ...s,
    }}>
      {icon ? <Icon name={icon} size={15} /> : label}
    </button>
  );

  const Divider = () => <div style={{ width: 1, height: 18, background: '#d8c0c8', margin: '0 3px', alignSelf: 'center', flexShrink: 0 }} />;

  const Dropdown = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <div className="toolbar-dropdown" onMouseDown={e => e.stopPropagation()} style={{
      position: 'absolute', top: '100%', [right ? 'right' : 'left']: 0, marginTop: 4, zIndex: 10,
      background: '#1a1218', border: '1px solid #3a2a30', borderRadius: 6, padding: 6,
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)', minWidth: 120,
    }}>{children}</div>
  );

  return (
    <div className="floating-editor-window" style={{
      position: 'fixed', left: pos.x, top: pos.y, width: size.w, height: size.h,
      zIndex: 90, display: 'flex', flexDirection: 'column',
      background: '#fcf4f0', border: `1px solid ${accentColor}44`,
      boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 1px ${accentColor}44, inset 0 1px 0 rgba(255,255,255,0.05)`,
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Title bar */}
      <div onMouseDown={onDragStart} style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
        background: '#0a0608', cursor: dragging ? 'grabbing' : 'grab', flexShrink: 0,
        borderBottom: `1px solid ${accentColor}33`, userSelect: 'none',
      }}>
        <Icon name={sectionIcon} size={13} style={{ color: accentColor }} />
        <span style={{ fontSize: 11, fontWeight: 500, color: accentColor, flex: 1 }}>{sectionName}</span>
        <span style={{ fontSize: 8, color: '#4a3038', letterSpacing: '0.05em' }}>esc to close</span>
        <button onClick={handleSaveAndClose} className="journal-action-btn" style={{
          '--accent': accentColor, padding: '2px 10px', fontSize: 9, border: `1px solid ${accentColor}44`,
        } as any}>done</button>
        <button onClick={handleSaveAndClose} style={{
          background: 'none', border: 'none', color: '#5a4048', cursor: 'pointer', padding: '2px',
          transition: 'color 0.15s',
        }} onMouseOver={e => (e.currentTarget.style.color = '#e0a0b0')} onMouseOut={e => (e.currentTarget.style.color = '#5a4048')}>
          <Icon name="close" size={14} />
        </button>
      </div>

      {/* Toolbar */}
      <div ref={toolbarRef} className="journal-toolbar" style={{
        display: 'flex', gap: 1, padding: '3px 8px', borderBottom: '1px solid #e8d8d0',
        flexShrink: 0, background: '#f8ece8', flexWrap: 'wrap', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 5,
      }}>
        {/* Bold / Italic / Underline / Strikethrough */}
        <ToolBtn onMouseDown={() => exec('bold')} label="B" title="Bold" style={{ fontWeight: 700 }} />
        <ToolBtn onMouseDown={() => exec('italic')} label="I" title="Italic" style={{ fontStyle: 'italic' }} />
        <ToolBtn onMouseDown={() => exec('underline')} label="U" title="Underline" style={{ textDecoration: 'underline' }} />
        <ToolBtn onMouseDown={() => exec('strikeThrough')} label="S" title="Strikethrough" style={{ textDecoration: 'line-through' }} />
        <Divider />

        {/* Headings dropdown */}
        <div style={{ position: 'relative' }}>
          <ToolBtn onMouseDown={() => { setShowHeadingMenu(!showHeadingMenu); setShowFontSizeMenu(false); setShowColorPicker(null); }} icon="title" title="Headings" active={showHeadingMenu} />
          {showHeadingMenu && (
            <Dropdown>
              {[
                { label: 'Heading 1', tag: 'h2', style: { fontSize: 16, fontWeight: 700 } },
                { label: 'Heading 2', tag: 'h3', style: { fontSize: 14, fontWeight: 600 } },
                { label: 'Heading 3', tag: 'h4', style: { fontSize: 12, fontWeight: 600 } },
                { label: 'Normal', tag: 'p', style: { fontSize: 11 } },
              ].map(h => (
                <button key={h.tag} onMouseDown={e => { e.preventDefault(); exec('formatBlock', h.tag); setShowHeadingMenu(false); editorRef.current?.focus(); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', background: 'none', border: 'none', color: '#d0b8c0', cursor: 'pointer', fontFamily: 'inherit', ...h.style }}>
                  {h.label}
                </button>
              ))}
            </Dropdown>
          )}
        </div>

        {/* Font size dropdown */}
        <div style={{ position: 'relative' }}>
          <ToolBtn onMouseDown={() => { setShowFontSizeMenu(!showFontSizeMenu); setShowHeadingMenu(false); setShowColorPicker(null); }} icon="format_size" title="Font Size" active={showFontSizeMenu} />
          {showFontSizeMenu && (
            <Dropdown>
              {[
                { label: 'Small', size: '2' },
                { label: 'Normal', size: '3' },
                { label: 'Medium', size: '4' },
                { label: 'Large', size: '5' },
                { label: 'X-Large', size: '6' },
              ].map(f => (
                <button key={f.size} onMouseDown={e => { e.preventDefault(); exec('fontSize', f.size); setShowFontSizeMenu(false); editorRef.current?.focus(); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', background: 'none', border: 'none', color: '#d0b8c0', cursor: 'pointer', fontFamily: 'inherit', fontSize: 8 + parseInt(f.size) * 2 }}>
                  {f.label}
                </button>
              ))}
            </Dropdown>
          )}
        </div>
        <Divider />

        {/* Lists */}
        <ToolBtn onMouseDown={() => exec('insertUnorderedList')} icon="format_list_bulleted" title="Bullet List" />
        <ToolBtn onMouseDown={() => exec('insertOrderedList')} icon="format_list_numbered" title="Numbered List" />
        <Divider />

        {/* Text color dropdown */}
        <div style={{ position: 'relative' }}>
          <ToolBtn onMouseDown={() => { setShowColorPicker(showColorPicker === 'text' ? null : 'text'); setShowHeadingMenu(false); setShowFontSizeMenu(false); }} icon="format_color_text" title="Text Color" active={showColorPicker === 'text'} />
          {showColorPicker === 'text' && (
            <Dropdown>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 3 }}>
                {TEXT_COLORS.map(c => (
                  <button key={c.color} title={c.label} onMouseDown={e => { e.preventDefault(); exec('foreColor', c.color); setShowColorPicker(null); editorRef.current?.focus(); }}
                    style={{ width: 22, height: 22, borderRadius: 3, background: c.color, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.2)')} onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
                ))}
              </div>
            </Dropdown>
          )}
        </div>

        {/* Highlight color dropdown */}
        <div style={{ position: 'relative' }}>
          <ToolBtn onMouseDown={() => { setShowColorPicker(showColorPicker === 'highlight' ? null : 'highlight'); setShowHeadingMenu(false); setShowFontSizeMenu(false); }} icon="ink_highlighter" title="Highlight" active={showColorPicker === 'highlight'} />
          {showColorPicker === 'highlight' && (
            <Dropdown>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3 }}>
                {HIGHLIGHT_COLORS.map(c => (
                  <button key={c.color} title={c.label} onMouseDown={e => { e.preventDefault(); exec('hiliteColor', c.color); setShowColorPicker(null); editorRef.current?.focus(); }}
                    style={{ width: 26, height: 22, borderRadius: 3, background: c.color === 'transparent' ? 'repeating-conic-gradient(#d8c0c8 0% 25%, transparent 0% 50%) 50%/8px 8px' : c.color, border: '1px solid rgba(0,0,0,0.15)', cursor: 'pointer', transition: 'transform 0.1s' }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.15)')} onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')} />
                ))}
              </div>
            </Dropdown>
          )}
        </div>
        <Divider />

        {/* Indent / Outdent */}
        <ToolBtn onMouseDown={() => exec('indent')} icon="format_indent_increase" title="Indent" />
        <ToolBtn onMouseDown={() => exec('outdent')} icon="format_indent_decrease" title="Outdent" />
        <Divider />

        {/* Alignment */}
        <ToolBtn onMouseDown={() => exec('justifyLeft')} icon="format_align_left" title="Align Left" />
        <ToolBtn onMouseDown={() => exec('justifyCenter')} icon="format_align_center" title="Center" />
        <Divider />

        {/* Clear formatting */}
        <ToolBtn onMouseDown={() => exec('removeFormat')} icon="format_clear" title="Clear Formatting" />
      </div>

      {/* Editor */}
      <div onMouseDown={closeDropdowns} style={{ flex: 1, overflow: 'auto', padding: '20px 28px', position: 'relative' }}>
        {isEmpty && (
          <div style={{ position: 'absolute', top: 20, left: 28, pointerEvents: 'none', fontSize: 14, color: '#c0a0a8', fontStyle: 'italic' }}>
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef} contentEditable suppressContentEditableWarning
          onInput={checkEmpty}
          onPaste={handlePaste}
          dangerouslySetInnerHTML={{ __html: html || '' }}
          className="journal-editable"
          style={{
            minHeight: '100%', outline: 'none',
            fontSize: 14, lineHeight: 1.9, color: '#3a2028',
          }}
        />
      </div>

      {/* Resize handle */}
      <div onMouseDown={onResizeStart} className="floating-resize-handle">
        <svg width="10" height="10" viewBox="0 0 10 10" style={{ opacity: 0.3 }}>
          <path d="M9 1L1 9M9 4L4 9M9 7L7 9" stroke="#8a6068" strokeWidth="1.2" />
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// FULL UNIT PLAN SIDEBAR
// ============================================================
function FullUnitPlan({ data, bookNum, moduleNum, onRefresh, onJumpToStory }: {
  data: any; bookNum: number; moduleNum: number; onRefresh: () => void; onJumpToStory?: (story: string) => void;
}) {
  const plan = data?.plan || data || {};
  const [showRaw, setShowRaw] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeWeek, setActiveWeek] = useState<number | null>(null);

  const regenerate = async () => {
    setGenerating(true);
    try {
      await fetch('/api/unit-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_num: bookNum, module_num: moduleNum, target_grade: '2' }),
      });
      onRefresh();
    } catch {}
    setGenerating(false);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/unit-plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ book_num: bookNum, module_num: moduleNum, target_grade: '2' }),
      });
      if (res.ok) onRefresh();
    } catch {}
    setGenerating(false);
  };

  // If no plan data, show generate button
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return (
      <div style={{ textAlign: 'center', padding: '30px 20px' }}>
        <div style={{ fontSize: 12, color: '#7a6068', marginBottom: 8 }}>No unit plan generated yet.</div>
        <div style={{ fontSize: 10, color: '#5a4048', marginBottom: 16, lineHeight: 1.5 }}>Generate a UDL backwards design unit plan using your story profiles.</div>
        <button onClick={generate} disabled={generating} className="journal-action-btn" style={{
          margin: '0 auto', '--accent': '#c4a0d4', padding: '8px 16px', fontSize: 10,
        } as any}>
          {generating ? 'Generating...' : 'Generate Unit Plan'}
        </button>
      </div>
    );
  }

  const Section = ({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        fontSize: 9, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em',
        color: accent, marginBottom: 6, paddingBottom: 3, borderBottom: `1px solid ${accent}22`,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <div style={{ width: 3, height: 10, background: accent, borderRadius: 1, flexShrink: 0 }} />
        {title}
      </div>
      {children}
    </div>
  );

  const Tag = ({ children, bg, color: c }: { children: React.ReactNode; bg: string; color: string }) => (
    <span style={{
      display: 'inline-block', fontSize: 8, padding: '1px 6px', marginRight: 3, marginBottom: 2,
      background: bg, color: c, borderRadius: 2,
    }}>{children}</span>
  );

  const weeks = plan.weekly_plan || plan.stage3_learning_plan?.week_overview || [];
  const standards = plan.standards || [];
  const eqs = plan.essential_questions || [];
  const understandings = plan.enduring_understandings || [];
  const stage1 = plan.stage1_goals || {};
  const stage2 = plan.stage2_assessments || {};
  const diff = plan.differentiation || {};

  return (
    <div style={{ fontSize: 11, lineHeight: 1.5, color: '#9a8a92' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 500, color: '#e0a0b0' }}>{plan.title || 'Unit Plan'}</div>
          <div style={{ fontSize: 10, color: '#7a6068' }}>Book {bookNum} / Module {moduleNum}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setShowRaw(!showRaw)} className="journal-action-btn" style={{ fontSize: 8, '--accent': '#7a6068', padding: '2px 8px' } as any}>
            {showRaw ? 'formatted' : 'raw'}
          </button>
          <button onClick={regenerate} disabled={generating} className="journal-action-btn" style={{ fontSize: 8, '--accent': '#c4a0d4', padding: '2px 8px' } as any}>
            {generating ? '...' : 'regen'}
          </button>
          <a href={`/api/unit-plan/pdf?book=${bookNum}&module=${moduleNum}`} target="_blank" rel="noopener noreferrer" className="journal-action-btn" style={{ fontSize: 8, '--accent': '#e0a0b0', padding: '2px 8px', textDecoration: 'none' } as any}>
            PDF
          </a>
        </div>
      </div>

      {showRaw ? (
        <pre style={{
          fontSize: 9, lineHeight: 1.5, color: '#8a7a82', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          background: 'rgba(0,0,0,0.15)', padding: 10, borderRadius: 4, userSelect: 'text', cursor: 'text',
        }}>{JSON.stringify(plan, null, 2)}</pre>
      ) : (
        <>
          {/* Overview */}
          {plan.module_overview && (
            <div style={{ fontSize: 10, color: '#8a7a82', lineHeight: 1.6, marginBottom: 12, padding: '8px 10px', background: 'rgba(224,160,176,0.04)', borderLeft: '2px solid rgba(224,160,176,0.2)', borderRadius: '0 4px 4px 0' }}>
              {plan.module_overview}
            </div>
          )}

          {/* Essential Questions */}
          {eqs.length > 0 && (
            <Section title="Essential Questions" accent="#c4a0d4">
              {eqs.map((q: string, i: number) => (
                <div key={i} style={{ fontSize: 10, color: '#c4a0d4', marginBottom: 4, paddingLeft: 8, fontStyle: 'italic' }}>
                  {q}
                </div>
              ))}
            </Section>
          )}

          {/* Standards */}
          {standards.length > 0 && (
            <Section title="Standards" accent="#8a7a92">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                {standards.map((s: string, i: number) => (
                  <Tag key={i} bg="rgba(138,122,146,0.1)" color="#a090a8">{s}</Tag>
                ))}
              </div>
            </Section>
          )}

          {/* Enduring Understandings */}
          {understandings.length > 0 && (
            <Section title="Enduring Understandings" accent="#88a8d8">
              {understandings.map((u: string, i: number) => (
                <div key={i} style={{ fontSize: 10, color: '#8a9aaa', marginBottom: 3, paddingLeft: 8 }}>
                  {u}
                </div>
              ))}
            </Section>
          )}

          {/* Stage 1: Goals */}
          {Object.keys(stage1).length > 0 && (
            <Section title="Stage 1: Desired Results" accent="#80b890">
              {stage1.knowledge?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#80b890', marginBottom: 2 }}>Knowledge</div>
                  {stage1.knowledge.map((k: string, i: number) => (
                    <div key={i} style={{ fontSize: 10, color: '#8a9a8a', paddingLeft: 8, marginBottom: 2 }}>{k}</div>
                  ))}
                </div>
              )}
              {stage1.skills?.length > 0 && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 8, fontWeight: 600, color: '#88a8d8', marginBottom: 2 }}>Skills</div>
                  {stage1.skills.map((s: string, i: number) => (
                    <div key={i} style={{ fontSize: 10, color: '#8a9aaa', paddingLeft: 8, marginBottom: 2 }}>{s}</div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {/* Stage 2: Evidence */}
          {Object.keys(stage2).length > 0 && (
            <Section title="Stage 2: Evidence" accent="#d4a060">
              {stage2.performance_task && (
                <div style={{ padding: '6px 8px', background: 'rgba(212,160,96,0.06)', borderRadius: 4, marginBottom: 6 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#d4a060' }}>{stage2.performance_task.title || 'Performance Task'}</div>
                  {stage2.performance_task.description && (
                    <div style={{ fontSize: 9, color: '#8a8078', marginTop: 2 }}>{stage2.performance_task.description}</div>
                  )}
                </div>
              )}
              {(stage2.formative || stage2.formative_assessments || []).map((a: any, i: number) => (
                <div key={i} style={{ fontSize: 9, color: '#8a8078', paddingLeft: 8, marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, color: '#b09070' }}>{a.title}:</span> {a.description}
                </div>
              ))}
            </Section>
          )}

          {/* Weekly Plan - the main attraction */}
          {weeks.length > 0 && (
            <Section title="Weekly Plan" accent="#e0a0b0">
              {/* Week tabs */}
              <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
                <button onClick={() => setActiveWeek(null)} style={{
                  fontSize: 8, padding: '2px 8px', background: activeWeek === null ? 'rgba(224,160,176,0.15)' : 'none',
                  border: `1px solid ${activeWeek === null ? '#e0a0b0' : '#2a2028'}`, color: activeWeek === null ? '#e0a0b0' : '#7a6068',
                  cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2, transition: 'all 0.15s',
                }}>All</button>
                {weeks.map((w: any, i: number) => (
                  <button key={i} onClick={() => setActiveWeek(i)} style={{
                    fontSize: 8, padding: '2px 8px',
                    background: activeWeek === i ? 'rgba(224,160,176,0.15)' : 'none',
                    border: `1px solid ${activeWeek === i ? '#e0a0b0' : '#2a2028'}`,
                    color: activeWeek === i ? '#e0a0b0' : '#7a6068',
                    cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2, transition: 'all 0.15s',
                  }}>
                    Wk {w.week || i + 1}{w.story ? `: ${w.story}` : ''}
                  </button>
                ))}
              </div>

              {weeks.filter((_: any, i: number) => activeWeek === null || activeWeek === i).map((w: any, wi: number) => (
                <div key={wi} style={{ marginBottom: 12 }}>
                  {/* Week header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '4px 8px', background: 'rgba(224,160,176,0.06)', borderRadius: 3, marginBottom: 6,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#e0a0b0' }}>
                      Week {w.week || wi + 1}
                      {w.story && <span style={{ fontWeight: 400, color: '#9a8a92', marginLeft: 6 }}>{w.story}</span>}
                    </div>
                    {w.story && onJumpToStory && (
                      <button onClick={() => onJumpToStory(w.story)} style={{
                        fontSize: 7, padding: '1px 6px', background: 'none', border: '1px solid #3a2a30',
                        color: '#7a6068', cursor: 'pointer', fontFamily: 'inherit', borderRadius: 2,
                        transition: 'all 0.15s',
                      }} onMouseOver={e => { e.currentTarget.style.borderColor = '#c4a0d4'; e.currentTarget.style.color = '#c4a0d4'; }}
                        onMouseOut={e => { e.currentTarget.style.borderColor = '#3a2a30'; e.currentTarget.style.color = '#7a6068'; }}>
                        jump to story
                      </button>
                    )}
                  </div>

                  {/* Vocab */}
                  {w.vocabulary?.length > 0 && (
                    <div style={{ marginBottom: 6, paddingLeft: 8 }}>
                      <span style={{ fontSize: 8, fontWeight: 600, color: '#88a8d8' }}>Vocab: </span>
                      {w.vocabulary.map((v: string, vi: number) => (
                        <Tag key={vi} bg="rgba(136,168,216,0.08)" color="#88a8d8">{v}</Tag>
                      ))}
                    </div>
                  )}

                  {/* Days */}
                  {(w.days || w.activities || []).map((day: any, di: number) => (
                    <div key={di} style={{
                      display: 'grid', gridTemplateColumns: '36px 1fr', gap: 6,
                      padding: '4px 0', borderBottom: '1px solid rgba(42,32,40,0.3)',
                      fontSize: 10,
                    }}>
                      <div style={{ fontWeight: 600, color: '#b09098', fontSize: 9 }}>{day.day || ''}</div>
                      <div>
                        <div style={{ color: '#c8b8c0' }}>{day.lesson || day.activity || ''}</div>
                        {day.standard && <div style={{ fontSize: 8, color: '#7a6a72', marginTop: 1 }}>{day.standard}</div>}
                        {day.resources?.length > 0 && (
                          <div style={{ fontSize: 8, color: '#6a5a62', marginTop: 1 }}>
                            {day.resources.map((r: string) => r).join(', ')}
                          </div>
                        )}
                        {day.ell_support && (
                          <div style={{ fontSize: 8, color: '#b07888', marginTop: 2, fontStyle: 'italic' }}>
                            ELL: {day.ell_support}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </Section>
          )}

          {/* Differentiation */}
          {Object.keys(diff).length > 0 && (
            <Section title="Differentiation" accent="#c4a0d4">
              {[
                ['below', 'Below Level', '#88a8d8'],
                ['below_level', 'Below Level', '#88a8d8'],
                ['above', 'Above Level', '#80b890'],
                ['above_level', 'Above Level', '#80b890'],
                ['korean_ell', 'Korean ELL', '#b07888'],
                ['ell', 'ELL', '#b07888'],
              ].map(([key, label, color]) => {
                const items = diff[key as string];
                if (!items?.length) return null;
                return (
                  <div key={key} style={{ marginBottom: 6 }}>
                    <Tag bg={`${color}15`} color={color as string}>{label as string}</Tag>
                    {items.map((s: string, i: number) => (
                      <div key={i} style={{ fontSize: 9, color: '#8a7a82', paddingLeft: 8, marginBottom: 2 }}>{s}</div>
                    ))}
                  </div>
                );
              })}
            </Section>
          )}

          {/* Focus areas */}
          {[
            ['grammar_focus', 'Grammar Focus', '#d4a060'],
            ['phonics_focus', 'Phonics Focus', '#88a8d8'],
            ['writing_focus', 'Writing Focus', '#80b890'],
          ].map(([key, label, color]) => {
            const items = plan[key as string];
            if (!items?.length) return null;
            return (
              <Section key={key} title={label as string} accent={color as string}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {items.map((s: string, i: number) => (
                    <Tag key={i} bg={`${color}12`} color={color as string}>{s}</Tag>
                  ))}
                </div>
              </Section>
            );
          })}
        </>
      )}
    </div>
  );
}

// ============================================================
// MAIN
// ============================================================
export default function StoryJournal({
  bookNum, moduleNum, storyTitle, resources, allModuleResources,
  hasProfile, profileResourceId, onSelectResource, onPresent, onOpenProfile, onFocusMode, onJumpToStory,
}: StoryJournalProps) {
  const [sections, setSections] = useState<JournalSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchForSection, setSearchForSection] = useState<string | null>(null);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [profileSnippet, setProfileSnippet] = useState<any>(null);
  const [unitPlanData, setUnitPlanData] = useState<any>(null);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showUnitPlanPanel, setShowUnitPlanPanel] = useState(false);
  const [showSemesterPlan, setShowSemesterPlan] = useState(false);
  const [hasSemesterPlan, setHasSemesterPlan] = useState(false);
  const [vocabExpanded, setVocabExpanded] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [popoutSection, setPopoutSection] = useState<string | null>(null);

  const fetchSections = useCallback(async () => {
    const p = new URLSearchParams({ book: String(bookNum), module: String(moduleNum), story: storyTitle });
    const res = await fetch(`/api/module-notes?${p}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  }, [bookNum, moduleNum, storyTitle]);

  const fetchProfileSnippet = useCallback(async () => {
    if (!profileResourceId) return;
    try { const res = await fetch(`/api/story-profile/${profileResourceId}`); if (res.ok) { const d = await res.json(); setProfileSnippet(d.data || d); } } catch {}
  }, [profileResourceId]);

  const fetchUnitPlan = useCallback(async () => {
    try { const res = await fetch(`/api/unit-plan?book=${bookNum}&module=${moduleNum}`); if (res.ok) { const d = await res.json(); setUnitPlanData(d.data || d); } } catch {}
  }, [bookNum, moduleNum]);

  useEffect(() => {
    fetchSections().then(s => {
      setSections(s);
      if (s.length > 0) { const withNotes = s.find((x: JournalSection) => x.notes); setExpanded(new Set([withNotes?.id || s[0].id])); }
      setLoading(false);
    });
  }, [fetchSections]);
  useEffect(() => { fetchProfileSnippet(); }, [fetchProfileSnippet]);
  useEffect(() => { fetchUnitPlan(); }, [fetchUnitPlan]);
  useEffect(() => {
    fetch(`/api/semester-plan?book=${bookNum}&module=${moduleNum}`)
      .then(r => { setHasSemesterPlan(r.ok); })
      .catch(() => {});
  }, [bookNum, moduleNum]);

  // ---- Optimistic CRUD ----
  const createSection = async (name: string) => {
    const tempId = `temp-${Date.now()}`;
    const newSection: JournalSection = { id: tempId, folder_name: name, notes: '', resource_ids: [], resources: [] };
    setSections(prev => [...prev, newSection]);
    setExpanded(prev => new Set(prev).add(tempId));

    const res = await fetch('/api/module-notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ book_num: bookNum, module_num: moduleNum, story_title: storyTitle, folder_name: name }) });
    const created = await res.json();
    setSections(prev => prev.map(s => s.id === tempId ? { ...newSection, ...created, resources: [] } : s));
    setExpanded(prev => { const n = new Set(prev); n.delete(tempId); n.add(created.id); return n; });
  };

  const saveNotes = async (sectionId: string, html: string) => {
    setSections(prev => prev.map(s => s.id === sectionId ? { ...s, notes: html } : s));
    await fetch('/api/module-notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sectionId, notes: html }) });
  };

  const addResource = async (sectionId: string, resourceId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, resource_ids: [...(s.resource_ids || []), resourceId] };
    }));
    await fetch('/api/module-notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sectionId, add_resource_id: resourceId }) });
    const fresh = await fetchSections();
    setSections(fresh);
  };

  const removeResource = async (sectionId: string, resourceId: string) => {
    setSections(prev => prev.map(s => {
      if (s.id !== sectionId) return s;
      return { ...s, resource_ids: s.resource_ids.filter(id => id !== resourceId), resources: s.resources.filter(r => r.id !== resourceId) };
    }));
    await fetch('/api/module-notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sectionId, remove_resource_id: resourceId }) });
  };

  const deleteSection = async (sectionId: string) => {
    const ok = await showConfirm('Delete this section?', { confirmLabel: 'Delete', danger: true });
    if (!ok) return;
    setRemoving(sectionId);
    await new Promise(r => setTimeout(r, 250));
    setSections(prev => prev.filter(s => s.id !== sectionId));
    setRemoving(null);
    await fetch('/api/module-notes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sectionId }) });
  };

  const moveSection = (sectionId: string, direction: 'up' | 'down') => {
    setSections(prev => {
      const idx = prev.findIndex(s => s.id === sectionId);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      // Persist sort order in bg
      next.forEach((s, i) => {
        fetch('/api/module-notes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: s.id, sort_order: i }) });
      });
      return next;
    });
  };

  const toggleExpand = (id: string) => { setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); };
  const handlePrint = () => { window.print(); };

  const sectionMeta = storyTitle === '__end_project__' ? PBL_SECTION_META : SECTION_META;
  const resourcesByType: Record<string, (Resource & { file_url?: string })[]> = {};
  for (const r of resources) { const t = r.resource_type || 'Other'; if (!resourcesByType[t]) resourcesByType[t] = []; resourcesByType[t].push(r); }
  const existingNames = new Set(sections.map(s => s.folder_name));
  const availableSections = Object.keys(sectionMeta).filter(n => !existingNames.has(n));
  const pr = profileSnippet;

  if (loading) return <div style={{ padding: 24, fontSize: 11, color: '#7a6068' }}>Loading...</div>;

  return (
    <div className={`story-journal ${popoutSection ? 'has-popout' : ''}`} style={{ display: 'flex', gap: 0, height: '100%' }}>
      {/* ===== MAIN JOURNAL ===== */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 4px' }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 9, color: '#7a6068', letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 6 }}>
            Book {bookNum} / Module {moduleNum}
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 400, color: '#e0a0b0', lineHeight: 1.2, letterSpacing: '-0.01em', margin: 0 }}>
            {storyTitle === '__end_project__' ? 'End of Module Project' : storyTitle}
          </h2>
          {storyTitle === '__end_project__' && (
            <div style={{ fontSize: 10, color: '#d4a060', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 8, padding: '1px 6px', background: 'rgba(212,160,96,0.1)', border: '1px solid rgba(212,160,96,0.2)', fontWeight: 600 }}>PBL</span>
              Summative Assessment &middot; Project-Based Learning
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, color: '#7a6068' }}>{resources.length} resources</span>
            <span style={{ color: '#2a2028' }}>/</span>
            <span style={{ fontSize: 10, color: '#7a6068' }}>{sections.length} sections</span>
            <div style={{ flex: 1 }} />
            {(hasProfile || profileResourceId) && (
              <button onClick={() => { setShowProfilePanel(!showProfilePanel); setShowUnitPlanPanel(false); setShowSemesterPlan(false); }}
                className={`journal-action-btn ${showProfilePanel ? 'active' : ''}`}
                style={{ '--accent': '#c4a0d4' } as any}>
                <Icon name="auto_stories" size={11} /> Story Profile
              </button>
            )}
            <button onClick={() => { setShowUnitPlanPanel(!showUnitPlanPanel); setShowProfilePanel(false); setShowSemesterPlan(false); }}
              className={`journal-action-btn ${showUnitPlanPanel ? 'active' : ''}`}
              style={{ '--accent': '#e0a0b0' } as any}>
              <Icon name="description" size={11} /> Unit Plan
            </button>
            <button onClick={() => { setShowSemesterPlan(!showSemesterPlan); setShowProfilePanel(false); setShowUnitPlanPanel(false); }}
              className={`journal-action-btn ${showSemesterPlan ? 'active' : ''}`}
              style={{ '--accent': '#b4dca0' } as any}>
              <Icon name="calendar_month" size={11} /> Semester Plan
            </button>
            <button onClick={handlePrint} className="journal-action-btn">
              <Icon name="print" size={11} /> Print
            </button>
            <a href={`/api/lesson-plan/pdf?book=${bookNum}&module=${moduleNum}`} target="_blank" rel="noopener noreferrer"
              className="journal-action-btn" style={{ '--accent': '#d4a060', textDecoration: 'none' } as any}>
              <Icon name="picture_as_pdf" size={11} /> Export Lesson Plan
            </a>
          </div>
        </div>

        {/* Glance bar */}
        {pr && (
          <div style={{ background: 'rgba(196,160,212,0.03)', border: '1px solid #1a1a1a', padding: '12px 16px', marginBottom: 22 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
              {pr.genre && <span className="journal-badge" style={{ borderColor: '#3a2a30', color: '#ddb8c0' }}>{pr.genre}</span>}
              {pr.authors_purpose && <span className="journal-badge" style={{ borderColor: '#2a2028', color: '#9a7a82' }}>{pr.authors_purpose}</span>}
              {pr.author && <span style={{ fontSize: 10, color: '#7a6068', fontStyle: 'italic' }}>by {pr.author}</span>}
            </div>
            {pr.reading_skills?.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                {pr.reading_skills.slice(0, 5).map((s: string) => (
                  <span key={s} style={{ fontSize: 9, padding: '2px 8px', background: 'rgba(196,160,212,0.08)', border: '1px solid rgba(196,160,212,0.15)', color: '#c4a0d4' }}>{s}</span>
                ))}
              </div>
            )}
            {pr.vocabulary?.length > 0 && (
              <div style={{ fontSize: 10, color: '#7a6068', marginTop: 4 }}>
                <span style={{ color: '#9a7a9a', fontWeight: 600 }}>vocab:</span>{' '}
                {(vocabExpanded ? pr.vocabulary : pr.vocabulary.slice(0, 6)).map((v: any) => v.word).join(' / ')}
                {pr.vocabulary.length > 6 && !vocabExpanded && (
                  <span onClick={() => setVocabExpanded(true)} className="journal-expand-link">
                    +{pr.vocabulary.length - 6}
                  </span>
                )}
                {vocabExpanded && pr.vocabulary.length > 6 && (
                  <span onClick={() => setVocabExpanded(false)} style={{ color: '#5a4048', cursor: 'pointer', marginLeft: 4, fontSize: 9 }}>show less</span>
                )}
              </div>
            )}
            {pr.korean_ell_connections && (pr.korean_ell_connections.phonics_alerts?.length > 0 || pr.korean_ell_connections.grammar_alerts?.length > 0) && (
              <div style={{ fontSize: 9, color: '#b07888', marginTop: 6, display: 'flex', alignItems: 'flex-start', gap: 4 }}>
                <span style={{ fontWeight: 700, flexShrink: 0 }}>KR</span>
                <span>{pr.korean_ell_connections.phonics_alerts?.slice(0, 2).join(', ')}</span>
                {pr.korean_ell_connections.grammar_alerts?.length > 0 && (
                  <><span style={{ color: '#3a2a30' }}>/</span><span style={{ color: '#9a6a7a' }}>{pr.korean_ell_connections.grammar_alerts.slice(0, 2).join(', ')}</span></>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== TIMELINE ===== */}
        <div style={{ borderLeft: '2px solid #1a1a1a', marginLeft: 3 }}>
          {sections.map((section, idx) => {
            const meta = sectionMeta[section.folder_name] || SECTION_META[section.folder_name] || { icon: 'folder', color: '#9a7a82', hint: '' };
            const isOpen = expanded.has(section.id);
            const isRemoving = removing === section.id;
            return (
              <div key={section.id}
                className={isRemoving ? 'journal-section-exit' : 'journal-section-enter'}
                style={{ position: 'relative', paddingLeft: 22, marginBottom: 4 }}>
                {/* Timeline dot */}
                <div style={{
                  position: 'absolute', left: -5, top: 12, width: 8, height: 8, borderRadius: '50%',
                  background: isOpen ? meta.color : 'transparent',
                  border: `2px solid ${isOpen ? meta.color : '#2a2028'}`,
                  transition: 'all 0.25s ease', boxShadow: isOpen ? `0 0 6px ${meta.color}25` : 'none',
                }} />
                {/* Section header row */}
                <div className="journal-section-header" style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                  <button onClick={() => toggleExpand(section.id)} style={{
                    display: 'flex', alignItems: 'center', gap: 8, flex: 1,
                    padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}>
                    <Icon name={meta.icon} size={14} style={{ color: isOpen ? meta.color : '#6a5060' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: isOpen ? meta.color : '#8a6a72', flex: 1, transition: 'color 0.2s' }}>{section.folder_name}</span>
                    {(section.resource_ids || []).length > 0 && <span style={{ fontSize: 9, color: '#5a4048' }}>{section.resource_ids.length}</span>}
                  </button>
                  {/* Reorder arrows */}
                  <div className="journal-reorder-btns" style={{ display: 'flex', gap: 0 }}>
                    {idx > 0 && (
                      <button onClick={() => moveSection(section.id, 'up')} title="Move up" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#7a6068' }}>
                        <Icon name="keyboard_arrow_up" size={14} />
                      </button>
                    )}
                    {idx < sections.length - 1 && (
                      <button onClick={() => moveSection(section.id, 'down')} title="Move down" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: '#7a6068' }}>
                        <Icon name="keyboard_arrow_down" size={14} />
                      </button>
                    )}
                  </div>
                  <button onClick={() => toggleExpand(section.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                    <Icon name={isOpen ? 'expand_less' : 'expand_more'} size={14} style={{ color: '#4a3038' }} />
                  </button>
                </div>
                {/* Section content */}
                {isOpen && (
                  <div className="journal-editor-area" style={{ paddingBottom: 14, animation: 'editorSlideIn 0.2s ease' }}>
                    <RichEditor html={section.notes || ''} placeholder={meta.hint} accentColor={meta.color} onSave={(h) => saveNotes(section.id, h)} />
                    {(section.resources || []).length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        {section.resources.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', marginBottom: 2, cursor: 'pointer' }}>
                            <div style={{ width: 18, height: 18, flexShrink: 0, overflow: 'hidden', border: '1px solid #d8c0c8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              onClick={() => onSelectResource(r as any)}>
                              {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Icon name="description" size={10} style={{ color: '#a08890' }} />}
                            </div>
                            <span onClick={() => onSelectResource(r as any)} style={{ flex: 1, fontSize: 11, color: '#6a4a58' }}>{r.title}</span>
                            <button onClick={() => removeResource(section.id, r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0a0a8', padding: 2, fontFamily: 'inherit' }}><Icon name="close" size={10} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: 12, marginTop: 8, alignItems: 'center' }}>
                      <button onClick={() => setSearchForSection(section.id)} style={{ fontSize: 9, color: '#8a6878', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icon name="attach_file" size={10} /> pin resource
                      </button>
                      <AiAssist sectionName={section.folder_name} notes={section.notes || ''} bookNum={bookNum} moduleNum={moduleNum} storyTitle={storyTitle} onResult={(h) => saveNotes(section.id, h)} />
                      <button onClick={() => {
                        setPopoutSection(section.id);
                        onFocusMode?.(true);
                        // Auto-open reference panel if not already open
                        if (!showProfilePanel && !showUnitPlanPanel && !showSemesterPlan) {
                          if (hasProfile || profileSnippet) setShowProfilePanel(true);
                          else setShowUnitPlanPanel(true);
                        }
                      }} style={{ fontSize: 9, color: '#8a6878', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Icon name="open_in_new" size={10} /> pop out
                      </button>
                      <div style={{ flex: 1 }} />
                      <button onClick={() => deleteSection(section.id)} className="journal-remove-btn" style={{ fontSize: 9, color: '#b09098', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>remove</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add sections */}
        {availableSections.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, paddingTop: 8, paddingLeft: 25 }}>
            {availableSections.map(name => (
              <button key={name} onClick={() => createSection(name)} className="journal-add-section-btn" style={{
                padding: '3px 10px', fontSize: 9, fontFamily: 'inherit',
                color: '#5a4048', background: 'none', cursor: 'pointer', border: '1px dashed #2a2028',
              }}>+ {name}</button>
            ))}
          </div>
        )}

        {/* Resource index */}
        <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #1a1a1a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 9, color: '#5a4048', letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>resources / {resources.length}</span>
            <button onClick={() => setResourcesOpen(!resourcesOpen)} style={{ fontSize: 9, color: '#6a5060', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>{resourcesOpen ? 'collapse' : 'expand'}</button>
          </div>
          {!resourcesOpen ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {resources.map(r => (
                <button key={r.id} onClick={() => onSelectResource(r)} style={{ padding: '3px 8px', fontSize: 10, fontFamily: 'inherit', color: '#8a6a72', background: 'none', cursor: 'pointer', border: '1px solid #1a1a1a' }}>{r.title}</button>
              ))}
            </div>
          ) : (
            <div>
              {Object.entries(resourcesByType).map(([type, items]) => (
                <div key={type} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 9, color: '#6a5060', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>{type}</div>
                  {items.map(r => (
                    <div key={r.id} style={{ display: 'flex', gap: 8, padding: '5px 8px', marginBottom: 1, cursor: 'pointer' }}>
                      <span onClick={() => onSelectResource(r)} style={{ flex: 1, fontSize: 11, color: '#9a7a82' }}>{r.title}</span>
                      {r.page_count > 1 && <span style={{ fontSize: 9, color: '#5a4048' }}>{r.page_count}p</span>}
                      {onPresent && <button onClick={() => onPresent(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a4048', fontFamily: 'inherit' }}><Icon name="slideshow" size={12} /></button>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== SPLIT-SCREEN PANELS ===== */}
      {(showProfilePanel || showUnitPlanPanel || showSemesterPlan) && (
        <div className="journal-side-panel" style={{ width: showSemesterPlan ? 480 : 400, flexShrink: 0, borderLeft: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column', background: 'rgba(8,6,8,0.6)' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #1a1a1a', flexShrink: 0 }}>
            {hasProfile && (
              <button onClick={() => { setShowProfilePanel(true); setShowUnitPlanPanel(false); setShowSemesterPlan(false); }} style={{
                flex: 1, padding: '8px 12px', fontSize: 9, fontFamily: 'inherit',
                background: showProfilePanel ? 'rgba(196,160,212,0.04)' : 'none',
                border: 'none', borderBottom: showProfilePanel ? '2px solid #c4a0d4' : '2px solid transparent',
                color: showProfilePanel ? '#c4a0d4' : '#5a4048', cursor: 'pointer',
              }}>Story Profile</button>
            )}
            <button onClick={() => { setShowUnitPlanPanel(true); setShowProfilePanel(false); setShowSemesterPlan(false); }} style={{
              flex: 1, padding: '8px 12px', fontSize: 9, fontFamily: 'inherit',
              background: showUnitPlanPanel ? 'rgba(224,160,176,0.04)' : 'none',
              border: 'none', borderBottom: showUnitPlanPanel ? '2px solid #e0a0b0' : '2px solid transparent',
              color: showUnitPlanPanel ? '#e0a0b0' : '#5a4048', cursor: 'pointer',
            }}>Unit Plan</button>
            <button onClick={() => { setShowSemesterPlan(true); setShowProfilePanel(false); setShowUnitPlanPanel(false); }} style={{
              flex: 1, padding: '8px 12px', fontSize: 9, fontFamily: 'inherit',
              background: showSemesterPlan ? 'rgba(180,220,160,0.04)' : 'none',
              border: 'none', borderBottom: showSemesterPlan ? '2px solid #b4dca0' : '2px solid transparent',
              color: showSemesterPlan ? '#b4dca0' : '#5a4048', cursor: 'pointer',
            }}>Semester Plan</button>
            <button onClick={() => { setShowProfilePanel(false); setShowUnitPlanPanel(false); setShowSemesterPlan(false); }} style={{
              padding: '8px 12px', background: 'none', border: 'none', color: '#4a3038', cursor: 'pointer',
            }}><Icon name="close" size={14} /></button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: showSemesterPlan ? 0 : '12px 14px' }}>
            {/* Story Profile */}
            {showProfilePanel && profileSnippet && (() => {
              const d = profileSnippet;
              return (
                <div style={{ fontSize: 11, lineHeight: 1.6, color: '#9a8a92' }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#c4a0d4', marginBottom: 4 }}>{d.title || storyTitle}</div>
                  {d.author && <div style={{ fontSize: 10, color: '#7a6068', fontStyle: 'italic', marginBottom: 8 }}>by {d.author}</div>}
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {[d.genre, d.text_structure?.replace(/_/g, ' '), d.authors_purpose].filter(Boolean).map((b: string, i: number) => (
                      <span key={i} style={{ fontSize: 8, padding: '1px 6px', background: 'rgba(196,160,212,0.08)', border: '1px solid rgba(196,160,212,0.2)', color: '#c4a0d4' }}>{b}</span>
                    ))}
                  </div>
                  {d.summary && <div style={{ fontSize: 10, color: '#8a7a82', marginBottom: 12, lineHeight: 1.5 }}>{d.summary}</div>}

                  {(d.themes?.length > 0 || d.reading_skills?.length > 0) && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#c4a0d4', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Themes & Skills</div>
                      {d.themes?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>{d.themes.map((t: string, i: number) => <span key={i} style={{ fontSize: 8, padding: '1px 6px', background: 'rgba(196,160,212,0.06)', border: '1px solid rgba(196,160,212,0.15)', color: '#b090c0' }}>{t}</span>)}</div>}
                      {d.reading_skills?.length > 0 && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{d.reading_skills.map((s: string, i: number) => <span key={i} style={{ fontSize: 8, padding: '1px 6px', background: 'rgba(120,160,220,0.06)', border: '1px solid rgba(120,160,220,0.15)', color: '#88a8d8' }}>{s}</span>)}</div>}
                    </div>
                  )}

                  {d.vocabulary?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#88a8d8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Vocabulary</div>
                      {d.vocabulary.map((v: any, i: number) => (
                        <div key={i} style={{ marginBottom: 6, paddingLeft: 8, borderLeft: '2px solid rgba(120,160,220,0.2)' }}>
                          <span style={{ fontWeight: 600, color: '#88a8d8', fontSize: 10 }}>{v.word}</span>
                          {v.tier && <span style={{ fontSize: 7, marginLeft: 6, padding: '0 4px', background: 'rgba(120,160,220,0.08)', color: '#88a8d8' }}>{v.tier}</span>}
                          {v.definition && <div style={{ fontSize: 9, color: '#8a7a82' }}>{v.definition}</div>}
                          {v.context_sentence && <div style={{ fontSize: 9, fontStyle: 'italic', color: '#6a5a62' }}>&ldquo;{v.context_sentence}&rdquo;</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {d.mentor_sentences?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#80b890', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Mentor Sentences</div>
                      {d.mentor_sentences.map((m: any, i: number) => (
                        <div key={i} style={{ marginBottom: 6, padding: '4px 8px', background: 'rgba(100,180,120,0.04)', borderLeft: '2px solid rgba(100,180,120,0.3)' }}>
                          <div style={{ fontSize: 10, fontStyle: 'italic', color: '#80b890' }}>&ldquo;{m.sentence}&rdquo;</div>
                          {m.skill && <div style={{ fontSize: 8, color: '#6a5a62', marginTop: 2 }}>Skill: {m.skill}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {d.questions?.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#d4a060', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>Questions</div>
                      {d.questions.map((q: any, i: number) => (
                        <div key={i} style={{ marginBottom: 6 }}>
                          <div style={{ fontSize: 10, color: '#9a8a92' }}>
                            <span style={{ color: '#d4a060', fontWeight: 600 }}>{i + 1}.</span> {q.question}
                            {q.dok && <span style={{ fontSize: 7, marginLeft: 6, padding: '0 4px', background: 'rgba(212,160,96,0.08)', color: '#d4a060' }}>DOK {q.dok}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {d.korean_ell_notes && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 9, fontWeight: 600, color: '#d48080', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700 }}>KR</span> ELL Notes
                      </div>
                      <div style={{ fontSize: 10, color: '#9a8a92', lineHeight: 1.5 }}>{typeof d.korean_ell_notes === 'string' ? d.korean_ell_notes : JSON.stringify(d.korean_ell_notes)}</div>
                    </div>
                  )}
                </div>
              );
            })()}
            {showProfilePanel && !profileSnippet && (
              <div style={{ fontSize: 10, color: '#5a4048', padding: 20, textAlign: 'center' }}>No story profile data available</div>
            )}

            {/* Unit Plan */}
            {showUnitPlanPanel && hasSemesterPlan && (
              <div style={{ padding: '12px 0 8px', marginBottom: 8, borderBottom: '1px solid #1a1a1a' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 9, color: '#b4dca0' }}>
                  <Icon name="info" size={12} />
                  This module has a Semester Plan with full lesson detail. The AI-generated unit plan below may be redundant.
                </div>
                <button onClick={() => { setShowSemesterPlan(true); setShowUnitPlanPanel(false); }} style={{
                  fontSize: 9, color: '#b4dca0', background: 'none', border: '1px solid rgba(180,220,160,0.2)',
                  padding: '3px 8px', cursor: 'pointer', marginTop: 6, fontFamily: 'inherit',
                }}>Switch to Semester Plan</button>
              </div>
            )}
            {showUnitPlanPanel && unitPlanData && (
              <FullUnitPlan data={unitPlanData} bookNum={bookNum} moduleNum={moduleNum} onRefresh={fetchUnitPlan} onJumpToStory={onJumpToStory} />
            )}
            {showUnitPlanPanel && !unitPlanData && (
              <FullUnitPlan data={null} bookNum={bookNum} moduleNum={moduleNum} onRefresh={fetchUnitPlan} onJumpToStory={onJumpToStory} />
            )}

            {/* Semester Plan */}
            {showSemesterPlan && (
              <SemesterPlanViewer bookNum={bookNum} moduleNum={moduleNum} onClose={() => setShowSemesterPlan(false)} />
            )}
          </div>
        </div>
      )}

      {searchForSection && (
        <ResourceSearchModal excludeIds={sections.flatMap(s => s.resource_ids || [])}
          onSelect={(id) => { addResource(searchForSection, id); setSearchForSection(null); }}
          onClose={() => setSearchForSection(null)} />
      )}

      {/* Floating pop-out editor */}
      {popoutSection && (() => {
        const sec = sections.find(s => s.id === popoutSection);
        if (!sec) return null;
        const meta = sectionMeta[sec.folder_name] || SECTION_META[sec.folder_name] || { icon: 'folder', color: '#9a7a82', hint: '' };
        return (
          <FloatingEditor
            sectionName={sec.folder_name}
            sectionIcon={meta.icon}
            accentColor={meta.color}
            html={sec.notes || ''}
            placeholder={meta.hint}
            onSave={(h) => saveNotes(sec.id, h)}
            onClose={() => { setPopoutSection(null); onFocusMode?.(false); }}
          />
        );
      })()}

      <style>{`
        @keyframes fadeSlide { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes editorSlideIn { from { opacity: 0; max-height: 0; } to { opacity: 1; max-height: 1000px; } }

        /* ---- Contenteditable — rose parchment palette ---- */
        .journal-editable { caret-color: #8a4a5a; }
        .journal-editable b, .journal-editable strong { color: #5a2030 !important; font-weight: 600; }
        .journal-editable i, .journal-editable em { color: #6a3a5a !important; }
        .journal-editable u { text-decoration-color: #d0b0b8; }
        .journal-editable ul, .journal-editable ol { margin: 6px 0; padding-left: 22px; }
        .journal-editable li { color: #3a2028 !important; margin-bottom: 3px; }
        .journal-editable ul li { list-style-type: disc; }
        .journal-editable ul li::marker { color: #8a5a68; font-size: 1.1em; }
        .journal-editable ol li::marker { color: #8a5a68; font-weight: 600; }
        .journal-editable h3 { font-size: 13px; font-weight: 600; color: #6a3048 !important; margin: 8px 0 4px; }
        .journal-editable:focus { outline: none; }
        .journal-editable p { margin: 2px 0; }

        /* ---- Buttons ---- */
        .journal-action-btn {
          padding: 4px 10px; font-size: 9px; font-family: inherit; cursor: pointer;
          background: none; border: 1px solid #2a2028; color: #7a6068;
          display: flex; align-items: center; gap: 4px;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .journal-action-btn:hover {
          border-color: var(--accent, #c4a0d4); color: var(--accent, #c4a0d4);
          transform: translateY(-1px);
          box-shadow: 0 3px 12px color-mix(in srgb, var(--accent, #c4a0d4) 15%, transparent);
          background: color-mix(in srgb, var(--accent, #c4a0d4) 5%, transparent);
        }
        .journal-action-btn.active {
          background: rgba(196,160,212,0.06); border-color: var(--accent, #c4a0d4); color: var(--accent, #c4a0d4);
        }
        .journal-badge { font-size: 10px; padding: 2px 8px; border: 1px solid; }

        /* Rose parchment editor area — with subtle texture */
        .journal-editor-area {
          background: #fcf4f0;
          background-image: linear-gradient(to bottom, rgba(224,160,176,0.03) 0%, transparent 40%, rgba(196,160,212,0.02) 100%);
          border-radius: 6px; padding: 6px 12px 10px; margin-top: 2px;
          overflow: hidden;
          transition: box-shadow 0.3s ease;
        }
        .journal-editor-area:focus-within {
          box-shadow: 0 0 0 1px rgba(196,160,212,0.12), 0 2px 12px rgba(196,160,212,0.06);
        }

        /* ---- Animations ---- */
        .journal-section-enter { animation: fadeSlide 0.25s ease; }
        .journal-section-exit {
          opacity: 0; transform: translateX(-20px) scaleY(0.8);
          transition: all 0.25s ease; max-height: 0; overflow: hidden;
          margin-top: 0 !important; margin-bottom: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important;
        }

        /* Reorder arrows — hidden by default, show on hover */
        .journal-reorder-btns { opacity: 0; transition: opacity 0.15s; }
        .journal-section-header:hover .journal-reorder-btns,
        .journal-section-enter:hover .journal-reorder-btns { opacity: 0.6; }
        .journal-reorder-btns:hover { opacity: 1 !important; }

        /* Timeline dot hover warmth */
        .journal-section-enter:hover > div:first-child > div:first-child {
          filter: brightness(1.2);
          transition: filter 0.2s ease;
        }

        /* Expand link */
        .journal-expand-link { color: #c4a0d4; cursor: pointer; margin-left: 4px; transition: color 0.2s; }
        .journal-expand-link:hover { color: #e0c0e0; }

        /* Remove button */
        .journal-remove-btn { transition: color 0.2s !important; }
        .journal-remove-btn:hover { color: #d06070 !important; }

        /* Add section hover */
        .journal-add-section-btn { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important; }
        .journal-add-section-btn:hover {
          border-color: #c4a0d4 !important; color: #c4a0d4 !important; border-style: solid !important;
          transform: translateY(-1px);
          box-shadow: 0 3px 12px rgba(196,160,212,0.1);
        }

        /* Clear formatting */
        .floating-editor-window .journal-editable {
          font-size: 14px !important; line-height: 1.9 !important;
        }
        /* Toolbar dropdown hover */
        .toolbar-dropdown button:hover { background: rgba(196,160,212,0.1) !important; }
        .floating-resize-handle {
          position: absolute; bottom: 2px; right: 4px; width: 16px; height: 16px;
          cursor: nwse-resize; display: flex; align-items: center; justify-content: center;
          transition: opacity 0.2s;
          opacity: 0.4;
        }
        .floating-resize-handle:hover { opacity: 1; }
        @keyframes floatIn {
          from { opacity: 0; transform: scale(0.96) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .floating-editor-window {
          animation: floatIn 0.25s cubic-bezier(0.34, 1.4, 0.64, 1);
        }

        /* When popout is active, dim the main journal but keep sidebar visible */
        .story-journal.has-popout > :first-child {
          opacity: 0.25; pointer-events: none;
          transition: opacity 0.3s ease;
          filter: blur(1px);
        }
        .story-journal.has-popout .journal-side-panel {
          position: relative; z-index: 95;
          box-shadow: -4px 0 20px rgba(0,0,0,0.3);
        }

        /* ---- Print ---- */
        @media print {
          /* Reset everything to printable */
          body, html { background: white !important; }
          .story-journal { background: white !important; color: #222 !important; display: block !important; height: auto !important; overflow: visible !important; }
          .story-journal * { color: #222 !important; border-color: #ccc !important; }
          .story-journal h2 { color: #333 !important; font-size: 18pt !important; }

          /* Show all content, expand sections */
          .story-journal > div:first-child { overflow: visible !important; height: auto !important; padding: 0 !important; }
          .journal-editable { border: none !important; padding: 4px 0 !important; min-height: auto !important; font-size: 10pt !important; line-height: 1.6 !important; }
          .journal-editable b, .journal-editable strong { font-weight: 700 !important; }
          .journal-editable li { color: #333 !important; }
          .journal-editor-area { background: transparent !important; padding: 2px 0 !important; break-inside: avoid; page-break-inside: avoid; }

          /* Hide all interactive elements */
          .journal-action-btn, .journal-reorder-btns, .journal-remove-btn,
          .journal-add-section-btn, .floating-editor-window, .floating-editor-backdrop { display: none !important; }
          button:not(.journal-badge) { display: none !important; }

          /* Hide sidebar panel */
          .journal-side-panel { display: none !important; }

          /* Section headers - make printable */
          .journal-section-enter { break-inside: avoid; page-break-inside: avoid; }

          /* Timeline dots - simplify */
          .story-journal [style*="borderLeft: 2px"] { border-left: 1px solid #ccc !important; }

          /* Badges */
          .story-journal .journal-badge { border-color: #aaa !important; color: #555 !important; font-size: 8pt !important; }

          /* Page breaks */
          .story-journal h2 { page-break-before: auto; }
        }
      `}</style>
    </div>
  );
}
