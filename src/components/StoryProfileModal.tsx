'use client';

import { useState, useEffect } from 'react';
import Icon from './Icon';

interface StoryProfileModalProps {
  resourceId: string;
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-sand-100 bg-violet-50 flex-shrink-0">
          <Icon name="auto_stories" size={22} className="text-violet-600" />
          {p ? (
            <input value={p.title || ''} onChange={e => editField('title', e.target.value)}
              className="flex-1 text-sm font-bold text-violet-900 bg-transparent border-0 focus:ring-0 p-0 focus:outline-none" />
          ) : (
            <span className="flex-1 text-sm font-bold text-violet-900">Story Profile</span>
          )}
          <div className="flex items-center gap-2">
            {p && <a href={`/api/story-profile/${resourceId}/pdf`} target="_blank" rel="noopener noreferrer"
              className="px-2 py-1 bg-violet-200 hover:bg-violet-300 text-violet-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
              <Icon name="picture_as_pdf" size={12} /> Print
            </a>}
            {dirty && <button onClick={saveProfile} disabled={saving}
              className="px-3 py-1 bg-vault-500 hover:bg-vault-600 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 disabled:opacity-50">
              {saving ? 'Saving...' : <><Icon name="save" size={12} /> Save</>}
            </button>}
            {saved && <span className="text-[10px] text-green-600 font-bold">✓</span>}
            <button onClick={onClose} className="p-1 hover:bg-violet-100 rounded-lg"><Icon name="close" size={20} className="text-violet-600" /></button>
          </div>
        </div>

        {error && <div className="px-4 py-2 bg-red-50 text-red-700 text-xs">{error}</div>}

        {loading ? (
          <div className="flex-1 flex items-center justify-center"><div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin" /></div>
        ) : !p && !generating ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-6">
              <Icon name="auto_stories" size={48} className="text-violet-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">Generate an AI story profile from the resource text.</p>
              <button onClick={generateProfile} className="bg-violet-500 hover:bg-violet-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 mx-auto">
                <Icon name="auto_awesome" size={18} /> Generate Profile
              </button>
            </div>
          </div>
        ) : generating ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-10 h-10 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-600">Analyzing text...</p>
              <p className="text-xs text-gray-400 mt-1">30-60 seconds</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex overflow-x-auto border-b border-sand-100 px-2 flex-shrink-0">
              {sections.map(s => (
                <button key={s.id} onClick={() => setSection(s.id)}
                  className={`flex items-center gap-1 px-3 py-2 text-[11px] font-bold whitespace-nowrap border-b-2 ${
                    section === s.id ? 'border-violet-500 text-violet-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                  <Icon name={s.icon} size={14} /> {s.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {section === 'overview' && <>
                <div className="flex flex-wrap gap-2 text-[11px]">
                  {p.genre && <span className="px-2 py-0.5 bg-violet-50 text-violet-700 rounded font-bold">{p.genre}</span>}
                  {p.text_structure && <span className="px-2 py-0.5 bg-sand-100 rounded">{p.text_structure.replace(/_/g, ' ')}</span>}
                  {p.authors_purpose && <span className="px-2 py-0.5 bg-sand-100 rounded">{p.authors_purpose}</span>}
                  {p.author && <span className="px-2 py-0.5 bg-sand-50 text-gray-500 rounded italic">by {p.author}</span>}
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
                <div key={i} className="bg-sand-50 rounded-lg p-3 relative group">
                  <button onClick={() => removeArrayItem('vocabulary', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400"><Icon name="close" size={14} /></button>
                  <div className="flex items-center gap-2 mb-1">
                    <ET value={v.word} onChange={val => editArrayItem('vocabulary', i, 'word', val)} className="font-bold text-gray-900 max-w-[140px]" />
                    <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded font-bold">{v.tier}</span>
                    <span className="text-[9px] text-gray-400 italic">{v.part_of_speech}</span>
                  </div>
                  <ET value={v.definition} onChange={val => editArrayItem('vocabulary', i, 'definition', val)} className="text-gray-600" />
                  {v.context_sentence && <ET value={v.context_sentence} onChange={val => editArrayItem('vocabulary', i, 'context_sentence', val)} className="text-gray-500 italic mt-1" />}
                </div>
              ))}

              {section === 'mentor' && <>
                {(p.mentor_sentences || []).map((m: any, i: number) => (
                  <div key={i} className="bg-indigo-50 rounded-lg p-3 relative group">
                    <button onClick={() => removeArrayItem('mentor_sentences', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400"><Icon name="close" size={14} /></button>
                    <ET value={m.sentence} onChange={val => editArrayItem('mentor_sentences', i, 'sentence', val)} className="font-medium text-indigo-900 italic" />
                    <div className="flex gap-2 mt-1 text-[10px]"><span className="text-gray-500">Skill:</span><ET value={m.skill} onChange={val => editArrayItem('mentor_sentences', i, 'skill', val)} className="text-indigo-700" /></div>
                    <div className="mt-1 text-[10px]"><span className="text-gray-500">Mini-lesson:</span><ET value={m.mini_lesson} onChange={val => editArrayItem('mentor_sentences', i, 'mini_lesson', val)} className="text-indigo-700" /></div>
                  </div>
                ))}
                {(!p.mentor_sentences?.length) && <p className="text-xs text-gray-400">No mentor sentences. Regenerate to add them.</p>}
              </>}

              {section === 'questions' && <>
                {(p.questions || []).map((q: any, i: number) => (
                  <div key={i} className="bg-sand-50 rounded-lg p-3 relative group">
                    <button onClick={() => removeArrayItem('questions', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400"><Icon name="close" size={14} /></button>
                    <div className="flex gap-2 mb-1"><span className="text-[9px] bg-purple-100 text-purple-700 px-1 rounded font-bold">DOK {q.dok}</span><span className="text-[9px] text-gray-400">{q.type === 'multiple_choice' ? 'MC' : 'SA'}</span></div>
                    <ET value={q.question} onChange={val => editArrayItem('questions', i, 'question', val)} className="font-medium text-gray-800" />
                    {q.choices && <div className="mt-1 space-y-0.5">{q.choices.map((c: string, j: number) => <p key={j} className={`text-[11px] px-2 py-0.5 rounded ${c === q.answer ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-600'}`}>{String.fromCharCode(65+j)}. {c}</p>)}</div>}
                    {q.type === 'short_answer' && q.answer && <p className="text-[11px] text-green-700 mt-1"><b>Answer:</b> {q.answer}</p>}
                  </div>
                ))}
                <SL {...slProps} text="Writing Prompts" />
                {(p.writing_prompts || []).map((w: any, i: number) => (
                  <div key={i} className="bg-orange-50 rounded-lg p-3 relative group">
                    <button onClick={() => removeArrayItem('writing_prompts', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400"><Icon name="close" size={14} /></button>
                    <span className="text-[9px] bg-orange-100 text-orange-700 px-1 rounded font-bold">{w.genre}</span>
                    <ET value={w.prompt} onChange={val => editArrayItem('writing_prompts', i, 'prompt', val)} className="text-gray-800 mt-1" />
                  </div>
                ))}
              </>}

              {section === 'discussion' && <>
                {(p.discussion_prompts || []).map((d: any, i: number) => (
                  <div key={i} className="bg-green-50 rounded-lg p-3 relative group">
                    <button onClick={() => removeArrayItem('discussion_prompts', i)} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400"><Icon name="close" size={14} /></button>
                    <ET value={d.prompt} onChange={val => editArrayItem('discussion_prompts', i, 'prompt', val)} className="font-medium text-green-900" />
                    {d.follow_up && <div className="mt-1"><span className="text-[9px] text-gray-500">Follow-up:</span><ET value={d.follow_up} onChange={val => editArrayItem('discussion_prompts', i, 'follow_up', val)} className="text-green-700" /></div>}
                  </div>
                ))}
                {(!p.discussion_prompts?.length) && <p className="text-xs text-gray-400">No discussion prompts.</p>}
              </>}

              {section === 'craft' && <>
                <div><SL {...slProps} text="Author's Craft" /><TL items={p.authors_craft || []} onEdit={v => editField('authors_craft', v)} /></div>
                <div><SL {...slProps} text="Text Features" /><TL items={p.text_features || []} onEdit={v => editField('text_features', v)} /></div>
                <SL {...slProps} text="Differentiation" />
                <div className="bg-blue-50 rounded-lg p-2"><p className="text-[9px] font-bold text-blue-600 mb-1">Below Level</p><TL items={p.differentiation?.below_level || []} onEdit={v => editField('differentiation.below_level', v)} /></div>
                <div className="bg-green-50 rounded-lg p-2"><p className="text-[9px] font-bold text-green-600 mb-1">Above Level</p><TL items={p.differentiation?.above_level || []} onEdit={v => editField('differentiation.above_level', v)} /></div>
                <div className="bg-amber-50 rounded-lg p-2"><p className="text-[9px] font-bold text-amber-600 mb-1">ELL</p><TL items={p.differentiation?.ell_supports || []} onEdit={v => editField('differentiation.ell_supports', v)} /></div>
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
                  <div key={i} className="bg-sand-50 rounded p-2 text-[11px]"><b>{m.word}</b>{m.prefix && <span className="text-blue-600 ml-1">[{m.prefix}]</span>}{m.root && <span className="text-green-600 ml-1">[{m.root}]</span>}{m.meaning && <span className="text-gray-500 ml-1">= {m.meaning}</span>}</div>
                ))}</>}
              </>; })()}

              <div className="pt-4 border-t border-sand-100">
                <button onClick={generateProfile} disabled={generating}
                  className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-bold rounded-lg flex items-center gap-1">
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

function SL({ text, profileLabels, onRename }: { text: string; profileLabels?: Record<string, string>; onRename?: (defaultName: string, newName: string) => void }) {
  const [editing, setEditing] = useState(false);
  const display = profileLabels?.[text] || text;

  if (editing && onRename) {
    return <input defaultValue={display} autoFocus
      className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1 bg-transparent border-b border-violet-300 focus:outline-none w-40"
      onBlur={e => { onRename(text, e.target.value); setEditing(false); }}
      onKeyDown={e => { if (e.key === 'Enter') { onRename(text, (e.target as HTMLInputElement).value); setEditing(false); } }} />;
  }
  return <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wide mb-1 cursor-pointer hover:bg-violet-50 rounded px-1 -mx-1 inline-block"
    onClick={() => onRename && setEditing(true)} title="Click to rename">{display}</p>;
}

function ET({ value, onChange, className = '', ml }: { value: string; onChange: (v: string) => void; className?: string; ml?: boolean }) {
  if (ml) return <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={2}
    className={`w-full bg-transparent border border-transparent hover:border-sand-200 focus:border-violet-300 rounded px-1.5 py-0.5 text-xs focus:outline-none resize-none ${className}`} />;
  return <input value={value || ''} onChange={e => onChange(e.target.value)}
    className={`w-full bg-transparent border border-transparent hover:border-sand-200 focus:border-violet-300 rounded px-1.5 py-0.5 text-xs focus:outline-none ${className}`} />;
}

function TL({ items, onEdit }: { items: string[]; onEdit: (v: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  if (editing) return <div>
    <textarea value={text} onChange={e => setText(e.target.value)} rows={2} className="w-full border border-sand-200 rounded px-2 py-1 text-xs" placeholder="One per line" autoFocus />
    <div className="flex gap-1 mt-1">
      <button onClick={() => { onEdit(text.split('\n').map(s => s.trim()).filter(Boolean)); setEditing(false); }} className="px-2 py-0.5 bg-vault-500 text-white text-[9px] rounded font-bold">Done</button>
      <button onClick={() => setEditing(false)} className="px-2 py-0.5 bg-sand-100 text-[9px] rounded">Cancel</button>
    </div>
  </div>;
  return <div className="flex flex-wrap gap-1 cursor-pointer" onClick={() => { setText(items.join('\n')); setEditing(true); }}>
    {items.length > 0 ? items.map((item, i) => <span key={i} className="px-2 py-0.5 bg-sand-50 text-gray-700 text-[11px] rounded hover:bg-sand-100">{item}</span>)
      : <span className="text-[11px] text-sand-400 italic">Click to add...</span>}
  </div>;
}
