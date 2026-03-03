'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';

interface StoryProfileModalProps {
  resourceId: string;
  storyTitle?: string;
  onClose: () => void;
  onProfileSaved?: () => void;
}

export default function StoryProfileModal({ resourceId, onClose, onProfileSaved }: StoryProfileModalProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [section, setSection] = useState('overview');
  const [dirty, setDirty] = useState(false);

  useEffect(() => { loadProfile(); }, [resourceId]);

  async function loadProfile() {
    setLoading(true); setError('');
    try {
      const res = await fetch(`/api/story-profile/${resourceId}`);
      if (res.ok) {
        const d = await res.json();
        setProfile(d.data || d);
      } else {
        setProfile(null);
      }
    } catch { setProfile(null); }
    setLoading(false);
  }

  async function generateProfile() {
    setGenerating(true); setError('');
    try {
      const res = await fetch(`/api/story-profile/${resourceId}`, { method: 'POST' });
      if (res.ok) {
        const d = await res.json();
        setProfile(d.data || d);
        onProfileSaved?.();
      } else {
        const err = await res.json();
        setError(err.error || 'Generation failed');
      }
    } catch (e: any) { setError(e.message); }
    setGenerating(false);
  }

  async function saveProfile() {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/story-profile/${resourceId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: profile, title: profile?.title }),
      });
      if (res.ok) {
        setSaved(true); setDirty(false);
        setTimeout(() => setSaved(false), 2000);
        onProfileSaved?.();
      } else {
        const err = await res.json();
        setError(err.error || 'Save failed');
      }
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  function editField(path: string, value: any) {
    setProfile((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!obj[keys[i]]) obj[keys[i]] = {};
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return updated;
    });
    setDirty(true);
  }

  function editArrayItem(path: string, index: number, field: string, value: string) {
    setProfile((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (const k of keys) obj = obj[k];
      if (obj[index]) obj[index][field] = value;
      return updated;
    });
    setDirty(true);
  }

  function removeArrayItem(path: string, index: number) {
    setProfile((prev: any) => {
      const updated = JSON.parse(JSON.stringify(prev));
      const keys = path.split('.');
      let obj = updated;
      for (const k of keys) obj = obj[k];
      obj.splice(index, 1);
      return updated;
    });
    setDirty(true);
  }

  const p = profile;
  const profileLabels = p?.section_labels || {};
  const renameLabel = (defaultName: string, newName: string) => {
    editField('section_labels', { ...profileLabels, [defaultName]: newName.trim() || defaultName });
  };
  const slProps = { profileLabels, onRename: renameLabel };
  const sections = [
    { id: 'overview', icon: 'info', label: 'Overview' },
    { id: 'vocab', icon: 'translate', label: 'Vocabulary' },
    { id: 'mentor', icon: 'format_quote', label: 'Mentor' },
    { id: 'questions', icon: 'quiz', label: 'Questions' },
    { id: 'discussion', icon: 'forum', label: 'Discussion' },
    { id: 'craft', icon: 'brush', label: 'Craft' },
    { id: 'ell', icon: 'language', label: 'Korean ELL' },
    { id: 'word_work', icon: 'spellcheck', label: 'Word Work' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-cyber-bg shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden border border-cyber-border">

        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-cyber-border bg-cyber-surface flex-shrink-0">
          <Icon name="auto_stories" size={20} className="text-cyber-lilac" />
          {p ? (
            <input value={p.title || ''} onChange={e => editField('title', e.target.value)}
              className="flex-1 text-sm font-bold text-cyber-fg bg-transparent border-0 focus:ring-0 p-0 focus:outline-none" />
          ) : (
            <span className="flex-1 text-sm font-bold text-cyber-fg">Story Profile</span>
          )}
          <div className="flex items-center gap-2">
            {p && (
              <a href={`/api/story-profile/${resourceId}/pdf`} target="_blank" rel="noopener noreferrer"
                className="btn-sweep btn-sweep-lilac px-2.5 py-1 text-[10px] font-bold flex items-center gap-1 no-underline">
                <Icon name="picture_as_pdf" size={12} /> Print
              </a>
            )}
            {dirty && (
              <button onClick={saveProfile} disabled={saving}
                className="btn-sweep px-3 py-1 text-[10px] font-bold flex items-center gap-1 disabled:opacity-50">
                {saving ? 'Saving...' : <><Icon name="save" size={12} /> Save</>}
              </button>
            )}
            {saved && (
              <span className="text-[10px] text-cyber-lilac font-bold animate-fade-in" style={{ textShadow: '0 0 8px rgba(196,160,212,0.4)' }}>✓ saved</span>
            )}
            <button onClick={onClose} className="btn-glow p-1">
              <Icon name="close" size={18} className="text-cyber-dim" />
            </button>
          </div>
        </div>

        {/* Error bar */}
        {error && (
          <div className="px-4 py-2 border-b border-cyber-border bg-cyber-surface text-xs text-cyber-fg" style={{ borderLeftWidth: 2, borderLeftColor: '#a06070' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-cyber-border rounded-full animate-spin" style={{ borderTopColor: '#c4a0d4' }} />
          </div>
        ) : !p && !generating ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <Icon name="auto_stories" size={48} className="text-cyber-lilac-dim mx-auto mb-3" style={{ opacity: 0.5 }} />
              <p className="text-sm text-cyber-dim mb-4">Generate an AI story profile from the resource text.</p>
              <button onClick={generateProfile}
                className="btn-sweep btn-sweep-lilac px-5 py-2.5 text-sm font-bold flex items-center gap-2 mx-auto">
                <Icon name="auto_awesome" size={18} /> Generate Profile
              </button>
            </div>
          </div>
        ) : generating ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-cyber-border rounded-full animate-spin mx-auto mb-3" style={{ borderTopColor: '#c4a0d4' }} />
              <p className="text-sm text-cyber-dim">Analyzing text...</p>
              <p className="text-xs text-cyber-muted mt-1">30-60 seconds</p>
            </div>
          </div>
        ) : (
          <>
            {/* Constellation dot nav for sections */}
            <div className="dot-nav border-b border-cyber-border px-2 flex-shrink-0">
              {sections.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`dot-nav-item ${section === s.id ? 'active' : ''}`}>
                  {s.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {section === 'overview' && <>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {p.genre && <span className="badge-rose">{p.genre}</span>}
                  {p.text_structure && <span className="badge-dim">{p.text_structure.replace(/_/g, ' ')}</span>}
                  {p.authors_purpose && <span className="badge-dim">{p.authors_purpose}</span>}
                  {p.author && <span className="text-[11px] text-cyber-dim italic">by {p.author}</span>}
                </div>
                <div><SL {...slProps} text="Summary" /><ET value={p.summary} onChange={v => editField('summary', v)} ml /></div>
                <div><SL {...slProps} text="Themes" /><TL items={p.themes || []} onEdit={v => editField('themes', v)} /></div>
                <div><SL {...slProps} text="Reading Skills" /><TL items={p.reading_skills || []} onEdit={v => editField('reading_skills', v)} /></div>
                <div><SL {...slProps} text="Standards" /><TL items={p.standards || []} onEdit={v => editField('standards', v)} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><SL {...slProps} text="Grammar" /><TL items={p.grammar_connections || []} onEdit={v => editField('grammar_connections', v)} /></div>
                  <div><SL {...slProps} text="Phonics" /><TL items={p.phonics_connections || []} onEdit={v => editField('phonics_connections', v)} /></div>
                  <div><SL {...slProps} text="Writing" /><TL items={p.writing_connections || []} onEdit={v => editField('writing_connections', v)} /></div>
                </div>
              </>}

              {section === 'vocab' && (p.vocabulary || []).map((v: any, i: number) => (
                <div key={i} className="bg-cyber-surface border border-cyber-border p-3 relative group">
                  <button onClick={() => removeArrayItem('vocabulary', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cyber-dim hover:text-cyber-fg transition-opacity"><Icon name="close" size={14} /></button>
                  <div className="flex items-center gap-2 mb-1">
                    <ET value={v.word} onChange={val => editArrayItem('vocabulary', i, 'word', val)} className="font-bold text-cyber-fg max-w-[140px]" />
                    <span className="badge-lilac">{v.tier}</span>
                    <span className="text-[9px] text-cyber-muted italic">{v.part_of_speech}</span>
                  </div>
                  <ET value={v.definition} onChange={val => editArrayItem('vocabulary', i, 'definition', val)} className="text-cyber-dim" />
                  {v.context_sentence && <ET value={v.context_sentence} onChange={val => editArrayItem('vocabulary', i, 'context_sentence', val)} className="text-cyber-dim italic mt-1" />}
                </div>
              ))}

              {section === 'mentor' && <>
                {(p.mentor_sentences || []).map((m: any, i: number) => (
                  <div key={i} className="bg-cyber-surface border border-cyber-border p-3 relative group">
                    <button onClick={() => removeArrayItem('mentor_sentences', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cyber-dim hover:text-cyber-fg transition-opacity"><Icon name="close" size={14} /></button>
                    <ET value={m.sentence} onChange={val => editArrayItem('mentor_sentences', i, 'sentence', val)} className="font-medium text-cyber-fg italic" />
                    <div className="flex gap-2 mt-1 text-[10px]"><span className="text-cyber-muted">Skill:</span><ET value={m.skill} onChange={val => editArrayItem('mentor_sentences', i, 'skill', val)} className="text-cyber-fg" /></div>
                    <div className="mt-1 text-[10px]"><span className="text-cyber-muted">Mini-lesson:</span><ET value={m.mini_lesson} onChange={val => editArrayItem('mentor_sentences', i, 'mini_lesson', val)} className="text-cyber-fg" /></div>
                  </div>
                ))}
                {(!p.mentor_sentences?.length) && <p className="text-xs text-cyber-muted">No mentor sentences. Regenerate to add them.</p>}
              </>}

              {section === 'questions' && <>
                {(p.questions || []).map((q: any, i: number) => (
                  <div key={i} className="bg-cyber-surface border border-cyber-border p-3 relative group">
                    <button onClick={() => removeArrayItem('questions', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cyber-dim hover:text-cyber-fg transition-opacity"><Icon name="close" size={14} /></button>
                    <div className="flex gap-2 mb-1">
                      <span className="badge-lilac">DOK {q.dok}</span>
                      <span className="text-[9px] text-cyber-muted">{q.type === 'multiple_choice' ? 'MC' : 'SA'}</span>
                    </div>
                    <ET value={q.question} onChange={val => editArrayItem('questions', i, 'question', val)} className="font-medium text-cyber-fg" />
                    {q.choices && (
                      <div className="mt-1 space-y-0.5">
                        {q.choices.map((c: string, j: number) => (
                          <p key={j} className={`text-[11px] px-2 py-0.5 ${c === q.answer ? 'text-cyber-fg border-l-2' : 'text-cyber-dim'}`}
                            style={c === q.answer ? { borderLeftColor: '#c4a0d4', background: 'rgba(196,160,212,0.06)' } : {}}>
                            {String.fromCharCode(65+j)}. {c}
                          </p>
                        ))}
                      </div>
                    )}
                    {q.type === 'short_answer' && q.answer && (
                      <p className="text-[11px] text-cyber-lilac mt-1">
                        <span className="font-bold">Answer:</span> {q.answer}
                      </p>
                    )}
                  </div>
                ))}

                <SL {...slProps} text="Writing Prompts" />
                {(p.writing_prompts || []).map((w: any, i: number) => (
                  <div key={i} className="bg-cyber-surface border border-cyber-border p-3 relative group" style={{ borderLeftWidth: 2, borderLeftColor: '#8a5565' }}>
                    <button onClick={() => removeArrayItem('writing_prompts', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cyber-dim hover:text-cyber-fg transition-opacity"><Icon name="close" size={14} /></button>
                    <span className="badge-rose">{w.genre}</span>
                    <ET value={w.prompt} onChange={val => editArrayItem('writing_prompts', i, 'prompt', val)} className="text-cyber-fg mt-1" />
                  </div>
                ))}
              </>}

              {section === 'discussion' && <>
                {(p.discussion_prompts || []).map((d: any, i: number) => (
                  <div key={i} className="bg-cyber-surface border border-cyber-border p-3 relative group" style={{ borderLeftWidth: 2, borderLeftColor: '#c4a0d4' }}>
                    <button onClick={() => removeArrayItem('discussion_prompts', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-cyber-dim hover:text-cyber-fg transition-opacity"><Icon name="close" size={14} /></button>
                    <ET value={d.prompt} onChange={val => editArrayItem('discussion_prompts', i, 'prompt', val)} className="font-medium text-cyber-fg" />
                    {d.follow_up && (
                      <div className="mt-1">
                        <span className="text-[9px] text-cyber-muted">Follow-up:</span>
                        <ET value={d.follow_up} onChange={val => editArrayItem('discussion_prompts', i, 'follow_up', val)} className="text-cyber-dim" />
                      </div>
                    )}
                  </div>
                ))}
                {(!p.discussion_prompts?.length) && <p className="text-xs text-cyber-muted">No discussion prompts.</p>}
              </>}

              {section === 'craft' && <>
                <div><SL {...slProps} text="Author's Craft" /><TL items={p.authors_craft || []} onEdit={v => editField('authors_craft', v)} /></div>
                <div><SL {...slProps} text="Text Features" /><TL items={p.text_features || []} onEdit={v => editField('text_features', v)} /></div>
                <SL {...slProps} text="Differentiation" />
                <DiffBox label="Below Level" color="#8a5565" items={p.differentiation?.below_level || []} onEdit={v => editField('differentiation.below_level', v)} />
                <DiffBox label="Above Level" color="#c4a0d4" items={p.differentiation?.above_level || []} onEdit={v => editField('differentiation.above_level', v)} />
                <DiffBox label="ELL" color="#b07888" items={p.differentiation?.ell_supports || []} onEdit={v => editField('differentiation.ell_supports', v)} />
              </>}

              {section === 'ell' && (() => { const k = p.korean_ell_connections || {}; return <>
                <div><SL {...slProps} text="Phonics Alerts" /><TL items={k.phonics_alerts || []} onEdit={v => editField('korean_ell_connections.phonics_alerts', v)} /></div>
                <div><SL {...slProps} text="Grammar Alerts" /><TL items={k.grammar_alerts || []} onEdit={v => editField('korean_ell_connections.grammar_alerts', v)} /></div>
                <div><SL {...slProps} text="Cultural Connections" /><TL items={k.cultural_connections || []} onEdit={v => editField('korean_ell_connections.cultural_connections', v)} /></div>
                <div><SL {...slProps} text="Sentence Focus" /><TL items={k.sentence_focus || []} onEdit={v => editField('korean_ell_connections.sentence_focus', v)} /></div>
              </>; })()}

              {section === 'word_work' && (() => { const ww = p.word_work || {}; return <>
                <div><SL {...slProps} text="High-Frequency Words" /><TL items={ww.high_frequency || []} onEdit={v => editField('word_work.high_frequency', v)} /></div>
                <div><SL {...slProps} text="Spelling Patterns" /><TL items={ww.spelling_patterns || []} onEdit={v => editField('word_work.spelling_patterns', v)} /></div>
                {ww.morphology?.length > 0 && <><SL {...slProps} text="Morphology" />{ww.morphology.map((m: any, i: number) => (
                  <div key={i} className="bg-cyber-surface border border-cyber-border p-2 text-[11px]">
                    <b className="text-cyber-fg">{m.word}</b>
                    {m.prefix && <span className="text-cyber-lilac ml-1">[{m.prefix}]</span>}
                    {m.root && <span className="text-cyber-fg ml-1">[{m.root}]</span>}
                    {m.meaning && <span className="text-cyber-dim ml-1">= {m.meaning}</span>}
                  </div>
                ))}</>}
              </>; })()}

              <div className="pt-4 border-t border-cyber-border">
                <button onClick={generateProfile} disabled={generating}
                  className="btn-glow btn-glow-lilac px-3 py-1.5 text-xs font-bold flex items-center gap-1">
                  <Icon name="refresh" size={14} /> Regenerate
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ========== DIFFERENTIATION BOX ========== */
function DiffBox({ label, color, items, onEdit }: { label: string; color: string; items: string[]; onEdit: (v: string[]) => void }) {
  return (
    <div className="bg-cyber-surface border border-cyber-border p-2" style={{ borderLeftWidth: 2, borderLeftColor: color }}>
      <p className="text-[9px] font-bold mb-1 uppercase tracking-wide" style={{ color }}>{label}</p>
      <TL items={items} onEdit={onEdit} />
    </div>
  );
}

/* ========== SECTION LABEL ========== */
function SL({ text, profileLabels, onRename }: { text: string; profileLabels?: Record<string, string>; onRename?: (defaultName: string, newName: string) => void }) {
  const [editing, setEditing] = useState(false);
  const display = profileLabels?.[text] || text;

  if (editing && onRename) {
    return <input defaultValue={display} autoFocus
      className="text-[10px] font-bold text-cyber-lilac uppercase tracking-wide mb-1 bg-transparent border-b border-cyber-lilac-muted focus:outline-none w-40"
      onBlur={e => { onRename(text, e.target.value); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onRename(text, (e.target as HTMLInputElement).value); setEditing(false); } }} />;
  }
  return <p className="text-[10px] font-bold text-cyber-lilac uppercase tracking-wide mb-1 cursor-pointer hover:bg-cyber-surface px-1 -mx-1 inline-block transition-colors"
    onClick={() => onRename && setEditing(true)} title="Click to rename">{display}</p>;
}

/* ========== EDITABLE TEXT ========== */
function ET({ value, onChange, className = '', ml }: { value: string; onChange: (v: string) => void; className?: string; ml?: boolean }) {
  if (ml) return <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2}
    className={`w-full bg-transparent border border-transparent hover:border-cyber-border focus:border-cyber-lilac-muted px-1.5 py-0.5 text-xs focus:outline-none resize-none ${className}`} />;
  return <input value={value || ''} onChange={e => onChange(e.target.value)}
    className={`w-full bg-transparent border border-transparent hover:border-cyber-border focus:border-cyber-lilac-muted px-1.5 py-0.5 text-xs focus:outline-none ${className}`} />;
}

/* ========== TAG LIST ========== */
function TL({ items, onEdit }: { items: string[]; onEdit: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  if (editing) return <div>
    <textarea value={text} onChange={e => setText(e.target.value)} rows={2}
      className="w-full border border-cyber-border bg-cyber-surface text-cyber-fg px-2 py-1 text-xs focus:outline-none focus:border-cyber-lilac-muted" placeholder="One per line" autoFocus />
    <div className="flex gap-1 mt-1">
      <button onClick={() => { onEdit(text.split('\n').map(s => s.trim()).filter(Boolean)); setEditing(false); }}
        className="btn-sweep btn-sweep-lilac px-2 py-0.5 text-[9px] font-bold">Done</button>
      <button onClick={() => setEditing(false)}
        className="btn-glow px-2 py-0.5 text-[9px]">Cancel</button>
    </div>
  </div>;
  return <div className="flex flex-wrap gap-1 cursor-pointer" onClick={() => { setText(items.join('\n')); setEditing(true); }}>
    {items.length > 0 ? items.map((item, i) => <span key={i} className="px-2 py-0.5 bg-cyber-surface border border-cyber-border text-cyber-fg text-[11px] hover:border-cyber-lilac-muted transition-colors">{item}</span>)
      : <span className="text-[11px] text-cyber-muted italic">Click to add...</span>}
  </div>;
}
