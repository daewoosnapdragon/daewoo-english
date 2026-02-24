'use client';

import { useState, useEffect } from 'react';
import { Resource, CATEGORY_LABELS, RESOURCE_TYPES, CATEGORIES, GRADE_LEVELS } from '@/types';
import { formatFileSize } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import Icon, { CATEGORY_ICON_MAP } from './Icon';
import StoryProfilePanel from './StoryProfilePanel';
import SimilarResources from './SimilarResources';
import PDFCleaner from './PDFCleaner';
import { useAuth } from '@/lib/auth-context';

interface ResourceModalProps {
  resource: Resource & { thumbnail_url?: string | null; file_url?: string };
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Resource> & { thumbnail_url?: string }) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string, isFavorite: boolean) => void;
  onSelectRelated: (resource: Resource) => void;
  onPresent?: (resource: Resource & { file_url?: string }) => void;
}

export default function ResourceModal({ resource, onClose, onUpdate, onDelete, onToggleFavorite, onSelectRelated, onPresent }: ResourceModalProps) {
  const { isTeacher, isViewer } = useAuth();
type TabType = 'info' | 'edit' | 'ai' | 'assign';
  const [tab, setTab] = useState<'info' | 'edit' | 'ai' | 'assign'>('info');
  const [analyzing, setAnalyzing] = useState(false);
  const [showStoryProfile, setShowStoryProfile] = useState(false);
  const [showPDFCleaner, setShowPDFCleaner] = useState(false);
  const [showPagePicker, setShowPagePicker] = useState(false);
  const [settingThumb, setSettingThumb] = useState(false);
  const [thumbError, setThumbError] = useState('');
  const supabase = createClient();

  const [title, setTitle] = useState(resource.title);
  const [notes, setNotes] = useState(resource.teacher_notes || '');
  const [category, setCategory] = useState(resource.category);
  const [resourceType, setResourceType] = useState(resource.resource_type);
  const [gradeStr, setGradeStr] = useState<string[]>(resource.grade_levels || []);
  const [storyTitle, setStoryTitle] = useState(resource.story_title || '');
  const [bookNum, setBookNum] = useState(resource.book_num || 0);
  const [moduleNum, setModuleNum] = useState(resource.module_num || 0);
  const [sortOrder, setSortOrder] = useState(resource.sort_order || 0);

  useEffect(() => {
    setTitle(resource.title); setNotes(resource.teacher_notes || '');
    setCategory(resource.category); setResourceType(resource.resource_type);
    setGradeStr(resource.grade_levels || []); setStoryTitle(resource.story_title || '');
    setBookNum(resource.book_num || 0); setModuleNum(resource.module_num || 0);
    setSortOrder(resource.sort_order || 0);
    setTab('info'); setShowStoryProfile(false); setShowPDFCleaner(false);
    setShowPagePicker(false); setThumbError('');
  }, [resource.id]);

  const handleSave = () => {
    const curriculum = bookNum > 0 && bookNum <= 4 ? `Into Reading ${bookNum} Module ${moduleNum}` : resource.curriculum;
    onUpdate(resource.id, {
      title, teacher_notes: notes, category, resource_type: resourceType,
      grade_levels: gradeStr, story_title: storyTitle, suggested_group: storyTitle,
      book_num: bookNum, module_num: moduleNum, sort_order: sortOrder, curriculum,
    });
    setTab('info');
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resource.id }),
      });
      if (res.ok) { const d = await res.json(); if (d.updates) onUpdate(resource.id, d.updates); }
    } catch (e) { console.error(e); }
    setAnalyzing(false);
  };

  const handleDelete = () => { if (confirm('Delete this resource?')) onDelete(resource.id); };

  // Set thumbnail from a PDF page — renders client-side, uploads PNG to Supabase, tells API
  const handleSetThumbFromPage = async (pageNum: number) => {
    if (!resource.file_url) return;
    setSettingThumb(true);
    setThumbError('');
    try {
      // Load pdf.js from CDN
      if (!(window as any).pdfjsLib) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          s.onload = () => resolve(); s.onerror = () => reject(new Error('Failed to load pdf.js'));
          document.head.appendChild(s);
        });
      }
      const pdfjsLib = (window as any).pdfjsLib;
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      // Render page to canvas
      const pdf = await pdfjsLib.getDocument(resource.file_url).promise;
      const page = await pdf.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d')!, viewport }).promise;

      // Convert to blob
      const blob: Blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));

      // Upload directly to Supabase storage (bypasses Vercel body limit)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const thumbPath = `${user.id}/thumbs/${resource.id}.png`;

      const { error: upErr } = await supabase.storage.from('resources').upload(thumbPath, blob, {
        contentType: 'image/png', upsert: true,
      });
      if (upErr) throw new Error(upErr.message);

      // Tell API to update the DB record
      const res = await fetch('/api/thumbnail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resource.id, storage_thumb_path: thumbPath }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      // Update UI with new thumbnail_url
      onUpdate(resource.id, { thumbnail_path: data.thumbnail_path, thumbnail_url: data.thumbnail_url } as any);
      setShowPagePicker(false);
    } catch (e: any) {
      console.error('Thumbnail error:', e);
      setThumbError(e.message || 'Failed');
    }
    setSettingThumb(false);
  };

  const handleCustomThumb = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setSettingThumb(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        const thumbPath = `${user.id}/thumbs/${resource.id}.png`;
        const { error: upErr } = await supabase.storage.from('resources').upload(thumbPath, file, {
          contentType: file.type || 'image/png', upsert: true,
        });
        if (upErr) throw new Error(upErr.message);
        const res = await fetch('/api/thumbnail', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_id: resource.id, storage_thumb_path: thumbPath }),
        });
        const data = await res.json();
        onUpdate(resource.id, { thumbnail_path: data.thumbnail_path, thumbnail_url: data.thumbnail_url } as any);
      } catch (e: any) { setThumbError(e.message); }
      setSettingThumb(false);
    };
    input.click();
  };

  const toggleGrade = (g: string) => setGradeStr(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const catIcon = CATEGORY_ICON_MAP[resource.category] || 'folder';
  const catLabel = CATEGORY_LABELS[resource.category] || resource.category;
  const pageCount = resource.page_count || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-sand-100 flex-shrink-0 bg-sand-50/50">
          <button onClick={() => onToggleFavorite(resource.id, !resource.is_favorite)} className="p-1 hover:bg-sand-100 rounded">
            <Icon name="star" size={20} filled={resource.is_favorite} className={resource.is_favorite ? 'text-amber-500' : 'text-gray-300'} />
          </button>
          <h2 className="text-sm font-semibold text-gray-900 flex-1 truncate">{resource.title}</h2>
          {resource.category && <span className="px-2 py-0.5 bg-sand-100 text-sand-700 text-[10px] rounded-full font-medium flex items-center gap-1"><Icon name={catIcon} size={12} /> {catLabel}</span>}
          {resource.ai_processed && <span className="px-2 py-0.5 bg-violet-100 text-violet-700 text-[10px] rounded-full font-bold"><Icon name="auto_awesome" size={10} /> AI</span>}
          <button onClick={onClose} className="p-1 hover:bg-sand-100 rounded-lg"><Icon name="close" size={20} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Preview */}
          <div className="w-[55%] bg-sand-100 flex flex-col">
            <div className="flex-1 flex items-center justify-center p-3 relative group min-h-0">
              {resource.file_type === 'pdf' && resource.file_url ? (
                <iframe src={`${resource.file_url}#toolbar=0`} className="w-full h-full border-0 rounded-lg bg-white" />
              ) : resource.thumbnail_url ? (
                <img src={resource.thumbnail_url} alt="" className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
              ) : (
                <Icon name="description" size={48} className="text-sand-300" />
              )}
              <div className="absolute bottom-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {resource.file_type === 'pdf' && pageCount > 0 && (
                  <button onClick={() => setShowPagePicker(!showPagePicker)}
                    className="bg-white/95 shadow-sm px-2 py-1 rounded-lg text-[10px] font-medium text-gray-700 flex items-center gap-1 hover:bg-white">
                    <Icon name="photo_library" size={12} /> Page thumb
                  </button>
                )}
                <button onClick={handleCustomThumb}
                  className="bg-white/95 shadow-sm px-2 py-1 rounded-lg text-[10px] font-medium text-gray-700 flex items-center gap-1 hover:bg-white">
                  <Icon name="image" size={12} /> Upload
                </button>
              </div>
            </div>

            {showPagePicker && (
              <div className="border-t border-sand-200 p-3 bg-white max-h-32 overflow-y-auto">
                <p className="text-[10px] font-semibold text-gray-500 mb-2">Set thumbnail from page:</p>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: Math.min(pageCount, 30) }, (_, i) => i + 1).map(pg => (
                    <button key={pg} onClick={() => handleSetThumbFromPage(pg)} disabled={settingThumb}
                      className="w-9 h-9 text-xs font-medium rounded-lg bg-sand-50 hover:bg-vault-50 hover:text-vault-700 border border-sand-200 disabled:opacity-50">
                      {pg}
                    </button>
                  ))}
                </div>
                {settingThumb && <p className="text-[10px] text-vault-600 mt-2 flex items-center gap-1"><span className="w-3 h-3 border-2 border-vault-200 border-t-vault-500 rounded-full animate-spin inline-block" /> Rendering page...</p>}
                {thumbError && <p className="text-[10px] text-red-500 mt-1">{thumbError}</p>}
              </div>
            )}

            <div className="flex gap-1 p-2 border-t border-sand-200 bg-white flex-shrink-0">
              {resource.file_url && onPresent && (
                <button onClick={() => onPresent(resource as any)}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-medium py-1.5 rounded-lg text-center flex items-center justify-center gap-1">
                  <Icon name="present_to_all" size={14} /> Present
                </button>
              )}
              {resource.file_url && <a href={resource.file_url} target="_blank" className="flex-1 bg-vault-500 hover:bg-vault-600 text-white text-[11px] font-medium py-1.5 rounded-lg text-center flex items-center justify-center gap-1"><Icon name="open_in_new" size={14} /> Open</a>}
              <a href={resource.file_url} download={resource.original_filename} className="flex-1 bg-sand-100 hover:bg-sand-200 text-gray-700 text-[11px] font-medium py-1.5 rounded-lg text-center flex items-center justify-center gap-1"><Icon name="download" size={14} /> Save</a>
            </div>
          </div>

          {/* RIGHT: Tabs */}
          <div className="w-[45%] flex flex-col border-l border-sand-200">
            <div className="flex border-b border-sand-200 flex-shrink-0">
              {(() => {
                const tabs: TabType[] = [
                  'info',
                  ...(isTeacher ? (['edit', 'ai'] as TabType[]) : []),
                  'assign',
                ];
                return tabs.map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`flex-1 flex items-center justify-center py-2 border-b-2 transition-colors ${tab === t ? 'border-vault-500 text-vault-700' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>
                    <Icon name={t === 'info' ? 'info' : t === 'edit' ? 'edit' : t === 'ai' ? 'auto_awesome' : 'book'} size={18} />
                  </button>
                ));
              })()}
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {tab === 'info' && (
                <>
                  {resource.summary && <p className="text-xs text-gray-700 leading-relaxed">{resource.summary}</p>}
                  <div className="flex flex-wrap gap-1">
                    {resource.resource_type && <Chip icon="description" text={resource.resource_type} />}
                    {resource.difficulty_level && <Chip icon="signal_cellular_alt" text={resource.difficulty_level} />}
                    {resource.curriculum && <Chip icon="book" text={resource.curriculum} color="vault" />}
                    {resource.story_title && <Chip icon="auto_stories" text={resource.story_title} color="vault" />}
                  </div>
                  {resource.grade_levels?.length > 0 && <div className="flex gap-1">{resource.grade_levels.map(g => <span key={g} className="w-7 h-7 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold flex items-center justify-center">{g}</span>)}</div>}
                  <TagRow label="Topics" items={resource.topics} color="green" />
                  <TagRow label="Skills" items={resource.reading_skills} color="purple" />
                  <TagRow label="Standards" items={resource.standards} color="amber" mono />
                  {resource.korean_ell_notes && <div className="bg-amber-50 rounded-lg p-2 text-xs text-amber-800 flex items-start gap-1.5"><Icon name="language" size={14} className="text-amber-600 mt-0.5 flex-shrink-0" /><span>{resource.korean_ell_notes}</span></div>}
                  {resource.teacher_notes && <div className="bg-sand-50 rounded-lg p-2 text-xs text-gray-700"><span className="text-[9px] font-bold text-sand-400 uppercase">Notes:</span> {resource.teacher_notes}</div>}
                  <SimilarResources resourceId={resource.id} onSelect={onSelectRelated} />
                  <p className="text-[9px] text-sand-400">{pageCount} pg | {formatFileSize(resource.file_size)} | {new Date(resource.created_at).toLocaleDateString()}</p>
                </>
              )}

              {tab === 'edit' && (
                <>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-sand-200 rounded-lg px-3 py-2 text-sm" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={category} onChange={e => setCategory(e.target.value)} className="border border-sand-200 rounded-lg px-2 py-1.5 text-xs"><option value="">Category</option>{CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select>
                    <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="border border-sand-200 rounded-lg px-2 py-1.5 text-xs"><option value="">Type</option>{RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div className="flex gap-1">{GRADE_LEVELS.map(g => <button key={g} onClick={() => toggleGrade(g)} className={`w-8 h-8 text-xs font-bold rounded-lg ${gradeStr.includes(g) ? 'bg-vault-500 text-white' : 'bg-sand-100 text-gray-500'}`}>{g}</button>)}</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="My notes..." className="w-full border border-sand-200 rounded-lg px-3 py-2 text-xs" rows={2} />
                  <button onClick={handleSave} className="w-full bg-vault-500 hover:bg-vault-600 text-white text-xs font-medium py-2 rounded-lg"><Icon name="save" size={14} /> Save</button>
                  {isTeacher && <button onClick={handleDelete} className="w-full py-1.5 text-[10px] text-red-400 hover:bg-red-50 rounded-lg"><Icon name="delete" size={12} /> Delete</button>}
                </>
              )}

              {tab === 'ai' && (
                <>
                  <button onClick={handleAnalyze} disabled={analyzing}
                    className="w-full bg-violet-500 hover:bg-violet-600 text-white text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                    {analyzing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" /> Analyzing...</> : <><Icon name="auto_awesome" size={16} /> {resource.ai_processed ? 'Re-tag' : 'Auto-tag'}</>}
                  </button>
                  <button onClick={() => setShowStoryProfile(!showStoryProfile)}
                    className="w-full bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                    <Icon name="auto_stories" size={16} /> Story Profile
                  </button>
                  {resource.file_type === 'pdf' && pageCount > 1 && (
                    <button onClick={() => setShowPDFCleaner(!showPDFCleaner)}
                      className="w-full bg-sand-100 hover:bg-sand-200 text-gray-700 text-xs font-medium py-2.5 rounded-lg flex items-center justify-center gap-2">
                      <Icon name="content_cut" size={16} /> Clean / Split PDF
                    </button>
                  )}
                  {showStoryProfile && <StoryProfilePanel resourceId={resource.id} resourceText="" onClose={() => setShowStoryProfile(false)} />}
                  {showPDFCleaner && <PDFCleaner resourceId={resource.id} title={resource.title} pageCount={pageCount} onComplete={() => { setShowPDFCleaner(false); onClose(); }} onClose={() => setShowPDFCleaner(false)} />}
                </>
              )}

              {tab === 'assign' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-medium text-gray-500">Book</label><select value={bookNum} onChange={e => setBookNum(Number(e.target.value))} className="w-full border border-sand-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"><option value={0}>None</option>{[1,2,3,4].map(n => <option key={n} value={n}>Book {n}</option>)}</select></div>
                    <div><label className="text-[10px] font-medium text-gray-500">Module</label><select value={moduleNum} onChange={e => setModuleNum(Number(e.target.value))} className="w-full border border-sand-200 rounded-lg px-2 py-1.5 text-xs mt-0.5"><option value={0}>None</option>{Array.from({length:15},(_,i)=>i+1).map(n => <option key={n} value={n}>Mod {n}</option>)}</select></div>
                  </div>
                  <div><label className="text-[10px] font-medium text-gray-500">Story</label><input value={storyTitle} onChange={e => setStoryTitle(e.target.value)} className="w-full border border-sand-200 rounded-lg px-2 py-1.5 text-xs mt-0.5" placeholder="Story title" /></div>
                  <div><label className="text-[10px] font-medium text-gray-500">Sort Order</label>
                    <select value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full border border-sand-200 rounded-lg px-2 py-1.5 text-xs mt-0.5">
                      <option value={0}>Teaching Pal</option><option value={1}>Module Opener</option>
                      <option value={10}>Story 1</option><option value={11}>Story 1 - Vocab</option><option value={12}>Story 1 - Comp</option><option value={13}>Story 1 - Writing</option><option value={14}>Story 1 - Grammar</option>
                      <option value={20}>Story 2</option><option value={21}>Story 2 - Vocab</option><option value={22}>Story 2 - Comp</option>
                      <option value={30}>Story 3</option><option value={40}>Story 4</option><option value={90}>Review</option><option value={91}>Assessment</option>
                    </select>
                  </div>
                  <button onClick={handleSave} className="w-full bg-vault-500 hover:bg-vault-600 text-white text-xs font-medium py-2 rounded-lg"><Icon name="save" size={14} /> Save</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, text, color }: { icon: string; text: string; color?: string }) {
  const c = color === 'vault' ? 'bg-vault-50 text-vault-700' : 'bg-sand-100 text-sand-700';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c}`}><Icon name={icon} size={12} /> {text}</span>;
}

function TagRow({ label, items, color, mono }: { label: string; items?: string[]; color: string; mono?: boolean }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[9px] font-bold text-sand-400 uppercase mb-0.5">{label}</p>
      <div className="flex flex-wrap gap-1">{items.map(item => <span key={item} className={`px-1.5 py-0.5 bg-${color}-50 text-${color}-700 text-[10px] rounded ${mono ? 'font-mono' : ''}`}>{item}</span>)}</div>
    </div>
  );
}