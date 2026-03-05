'use client';

import { useState, useEffect } from 'react';
import { Resource, CATEGORY_LABELS, RESOURCE_TYPES, CATEGORIES, GRADE_LEVELS } from '@/types';
import { formatFileSize } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import Icon, { CATEGORY_ICON_MAP } from './Icon';
import StoryProfilePanel from './StoryProfilePanel';
import PDFCleaner from './PDFCleaner';
import SimilarResources from './SimilarResources';
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

type TabType = 'info' | 'edit' | 'ai' | 'assign';

export default function ResourceModal({ resource: initialResource, onClose, onUpdate, onDelete, onToggleFavorite, onSelectRelated, onPresent }: ResourceModalProps) {
  const { isTeacher, isViewer } = useAuth();
  const [resource, setResource] = useState(initialResource);
  const [tab, setTab] = useState<TabType>('info');
  const [analyzing, setAnalyzing] = useState(false);
  const [showStoryProfile, setShowStoryProfile] = useState(false);
  const [showPDFCleaner, setShowPDFCleaner] = useState(false);
  const supabase = createClient();

  // Edit fields
  const [title, setTitle] = useState(resource.title);
  const [notes, setNotes] = useState(resource.teacher_notes || '');
  const [category, setCategory] = useState(resource.category);
  const [resourceType, setResourceType] = useState(resource.resource_type);
  const [gradeStr, setGradeStr] = useState<string[]>(resource.grade_levels || []);
  const [storyTitle, setStoryTitle] = useState(resource.story_title || '');
  const [bookNum, setBookNum] = useState(resource.book_num || 0);
  const [moduleNum, setModuleNum] = useState(resource.module_num || 0);
  const [sortOrder, setSortOrder] = useState(resource.sort_order || 0);

  // Page assignment
  const [paBookNum, setPaBookNum] = useState(resource.book_num || 0);
  const [paModuleNum, setPaModuleNum] = useState(resource.module_num || 0);
  const [paPageStart, setPaPageStart] = useState(1);
  const [paPageEnd, setPaPageEnd] = useState(1);
  const [paLabel, setPaLabel] = useState('');
  const [assignments, setAssignments] = useState<any[]>([]);
  const [savingPa, setSavingPa] = useState(false);

  // Collection resources (same folder)
  const [collectionResources, setCollectionResources] = useState<any[]>([]);

  // Fetch full resource data on open
  useEffect(() => {
    setResource(initialResource);
    fetch(`/api/resources/${initialResource.id}`)
      .then(r => r.ok ? r.json() : null)
      .then(full => {
        if (full?.id) {
          setResource(prev => ({ ...prev, ...full }));
          setTitle(full.title); setNotes(full.teacher_notes || '');
          setCategory(full.category); setResourceType(full.resource_type);
          setGradeStr(full.grade_levels || []); setStoryTitle(full.story_title || '');
          setBookNum(full.book_num || 0); setModuleNum(full.module_num || 0);
          setSortOrder(full.sort_order || 0);
        }
      })
      .catch(() => {});

    // Fetch page assignments
    fetch(`/api/page-assignments?resource_id=${initialResource.id}`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setAssignments(d); })
      .catch(() => {});

    // Fetch collection resources (same folder/collection)
    if (initialResource.collection_id) {
      fetch(`/api/resources?collection_id=${initialResource.collection_id}&fields=light&limit=20`)
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setCollectionResources(d.filter((r: any) => r.id !== initialResource.id)); })
        .catch(() => {});
    }
  }, [initialResource.id]);

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
      if (res.ok) { const d = await res.json(); if (d.updates) { onUpdate(resource.id, d.updates); setResource(prev => ({ ...prev, ...d.updates })); } }
    } catch (e) { console.error(e); }
    setAnalyzing(false);
  };

  const handleDelete = () => { if (confirm('Delete this resource?')) onDelete(resource.id); };

  const handlePresent = () => {
    if (onPresent && resource.file_url) {
      onPresent(resource);
      onClose();
    }
  };

  const handleAssignPage = async () => {
    if (!paBookNum || !paModuleNum) return;
    setSavingPa(true);
    const res = await fetch('/api/page-assignments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resource_id: resource.id, page_start: paPageStart, page_end: paPageEnd,
        book_num: paBookNum, module_num: paModuleNum,
        label: paLabel || `${resource.title} p.${paPageStart}${paPageEnd > paPageStart ? `-${paPageEnd}` : ''}`,
      }),
    });
    if (res.ok) {
      const a = await res.json();
      setAssignments(prev => [...prev, a]);
      setPaLabel('');
      const next = paPageEnd + 1;
      if (next <= pageCount) { setPaPageStart(next); setPaPageEnd(next); }
    }
    setSavingPa(false);
  };

  const handleRemoveAssignment = async (id: string) => {
    await fetch(`/api/page-assignments?id=${id}`, { method: 'DELETE' });
    setAssignments(prev => prev.filter(a => a.id !== id));
  };

  const toggleGrade = (g: string) => setGradeStr(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  const catIcon = CATEGORY_ICON_MAP[resource.category] || 'folder';
  const catLabel = CATEGORY_LABELS[resource.category] || resource.category;
  const pageCount = resource.page_count || 1;
  const isPdf = resource.file_type === 'pdf';
  const fileUrl = resource.file_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-cyber-bg rounded-none shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header — cleaner */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-cyber-border flex-shrink-0 bg-cyber-bg">
          <button onClick={() => onToggleFavorite(resource.id, !resource.is_favorite)} className="p-1 hover:bg-cyber-surface rounded-none">
            <Icon name="star" size={20} filled={resource.is_favorite} className={resource.is_favorite ? 'text-cyber-fg' : 'text-cyber-muted'} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-cyber-fg truncate">{resource.title}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              {resource.category && <span className="text-[10px] text-cyber-dim flex items-center gap-1"><Icon name={catIcon} size={11} /> {catLabel}</span>}
              {resource.resource_type && <span className="text-[10px] text-cyber-muted">{resource.resource_type}</span>}
              {resource.ai_processed && <span className="text-[10px] text-cyber-lilac font-bold flex items-center gap-0.5"><Icon name="auto_awesome" size={10} /> AI</span>}
            </div>
          </div>
          {/* Present button (primary action) */}
          {fileUrl && (
            <button onClick={handlePresent}
              className="btn-sweep px-4 py-2 text-xs font-medium flex items-center gap-1.5">
              <Icon name="present_to_all" size={16} /> Present
            </button>
          )}
          <a href={fileUrl} download={resource.original_filename}
            className="p-2 hover:bg-cyber-surface rounded-none text-cyber-muted hover:text-cyber-dim" title="Download">
            <Icon name="download" size={18} />
          </a>
          <button onClick={onClose} className="p-2 hover:bg-cyber-surface rounded-none"><Icon name="close" size={20} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* LEFT: Preview — clean, no extra controls */}
          <div className="w-[58%] bg-cyber-bg flex flex-col">
            <div className="flex-1 relative overflow-hidden flex items-center justify-center">
              {isPdf && fileUrl ? (<>
                <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center bg-cyber-bg transition-opacity" id="modal-pdf-loading">
                  <div className="w-6 h-6 border-2 border-cyber-border/30 border-t-vault-400 rounded-full animate-spin mb-3" />
                  <p className="text-cyber-fg text-xs">wait please i'm trying my best ;(</p>
                </div>
                <iframe src={`${fileUrl}#toolbar=0&navpanes=0&view=Fit`} className="w-full h-full border-0" style={{ background: 'white' }}
                  onLoad={() => { const el = document.getElementById('modal-pdf-loading'); if (el) el.style.opacity = '0'; setTimeout(() => { if (el) el.style.display = 'none'; }, 300); }} />
              </>) : resource.thumbnail_url ? (
                <div className="w-full h-full flex items-center justify-center p-4">
                  <img src={resource.thumbnail_url} alt="" className="max-w-full max-h-full object-contain rounded-none" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Icon name="description" size={48} className="text-cyber-dim" />
                </div>
              )}
            </div>
            {/* Minimal footer with page info */}
            <div className="flex items-center justify-between px-3 py-1.5 bg-cyber-surface text-cyber-muted text-[10px] flex-shrink-0">
              <span>{pageCount} page{pageCount !== 1 ? 's' : ''}{resource.file_size ? ` · ${formatFileSize(resource.file_size)}` : ''}</span>
              <span>{resource.file_type?.toUpperCase()}</span>
            </div>
          </div>

          {/* RIGHT: Tabs */}
          <div className="w-[42%] flex flex-col border-l border-cyber-border bg-cyber-bg">
            <div className="flex border-b border-gray-200 flex-shrink-0 bg-cyber-bg">
              {([
                'info',
                ...(isTeacher ? ['edit', 'ai'] : []),
                'assign',
              ] as TabType[]).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    tab === t ? 'text-cyber-fg border-b-2 border-cyber-border bg-cyber-bg' : 'text-cyber-muted hover:text-cyber-dim'
                  }`}>
                  {t === 'info' ? 'Info' : t === 'edit' ? 'Edit' : t === 'ai' ? 'AI' : 'Assign'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* INFO TAB */}
              {tab === 'info' && (
                <>
                  {resource.summary && <p className="text-xs text-cyber-dim leading-relaxed">{resource.summary}</p>}
                  {resource.curriculum && <Chip icon="book" text={resource.curriculum} color="vault" />}
                  {resource.story_title && <Chip icon="auto_stories" text={resource.story_title} color="vault" />}
                  {resource.difficulty_level && <Chip icon="signal_cellular_alt" text={resource.difficulty_level} />}
                  {(resource.grade_levels?.length > 0) && (
                    <div className="flex gap-1">{resource.grade_levels.map(g => (
                      <span key={g} className="w-7 h-7 rounded-full bg-cyber-surface border border-cyber-border text-cyber-lilac text-[10px] font-bold flex items-center justify-center">{g}</span>
                    ))}</div>
                  )}
                  <TagRow label="Topics" items={resource.topics} color="green" />
                  <TagRow label="Skills" items={resource.reading_skills} color="purple" />
                  <TagRow label="Standards" items={resource.standards} color="amber" mono />
                  {resource.korean_ell_notes && (
                    <div className="bg-cyber-surface border border-cyber-border rounded-none p-2.5 text-xs text-cyber-dim flex items-start gap-1.5">
                      <Icon name="language" size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                      <span>{resource.korean_ell_notes}</span>
                    </div>
                  )}
                  {resource.teacher_notes && (
                    <div className="bg-cyber-surface border border-cyber-border rounded-none p-2.5 text-xs text-cyber-dim">
                      <span className="text-[9px] font-bold text-cyber-muted uppercase">Notes:</span> {resource.teacher_notes}
                    </div>
                  )}

                  {/* Collection / Related resources from same folder */}
                  {collectionResources.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[9px] font-bold text-cyber-muted uppercase mb-2 flex items-center gap-1">
                        <Icon name="folder" size={12} /> From Same Folder
                      </p>
                      <div className="space-y-1">
                        {collectionResources.map(r => (
                          <button key={r.id} onClick={() => onSelectRelated(r)}
                            className="w-full flex items-center gap-2 px-2.5 py-2 bg-cyber-bg rounded-none border border-cyber-border hover:border-cyber-border transition-colors text-left">
                            <div className="w-7 h-7 rounded bg-cyber-surface flex items-center justify-center flex-shrink-0 overflow-hidden">
                              {r.thumbnail_url
                                ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" />
                                : <Icon name="description" size={12} className="text-cyber-dim" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-medium text-cyber-fg truncate">{r.title}</p>
                              <p className="text-[9px] text-cyber-muted">{r.resource_type}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <SimilarResources resourceId={resource.id} onSelect={onSelectRelated} />
                  <p className="text-[9px] text-cyber-muted pt-2">
                    {resource.created_at ? new Date(resource.created_at).toLocaleDateString() : ''}
                  </p>
                </>
              )}

              {/* EDIT TAB */}
              {tab === 'edit' && (
                <>
                  <input value={title} onChange={e => setTitle(e.target.value)} className="w-full border border-gray-200 rounded-none px-3 py-2 text-sm focus:ring-2 focus:ring-cyber-fg outline-none bg-cyber-bg" />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={category} onChange={e => setCategory(e.target.value)} className="border border-gray-200 rounded-none px-2 py-1.5 text-xs bg-cyber-bg"><option value="">Category</option>{CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}</select>
                    <select value={resourceType} onChange={e => setResourceType(e.target.value)} className="border border-gray-200 rounded-none px-2 py-1.5 text-xs bg-cyber-bg"><option value="">Type</option>{RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                  <div className="flex flex-wrap gap-1">{GRADE_LEVELS.map(g => (
                    <button key={g} onClick={() => toggleGrade(g)} className={`w-8 h-8 text-xs font-bold rounded-none transition-colors ${gradeStr.includes(g) ? 'bg-cyber-surface border border-cyber-fg text-cyber-fg' : 'bg-cyber-surface border border-cyber-border text-cyber-dim hover:border-cyber-dim'}`}>{g}</button>
                  ))}</div>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="My notes..." className="w-full border border-gray-200 rounded-none px-3 py-2 text-xs focus:ring-2 focus:ring-cyber-fg outline-none bg-cyber-bg" rows={2} />
                  <button onClick={handleSave} className="w-full btn-sweep py-2.5 text-xs font-bold">Save Changes</button>
                  {isTeacher && <button onClick={handleDelete} className="w-full py-1.5 text-[10px] text-cyber-dim hover:text-cyber-fg hover:bg-cyber-surface rounded-none">Delete Resource</button>}
                </>
              )}

              {/* AI TAB */}
              {tab === 'ai' && (
                <>
                  <button onClick={handleAnalyze} disabled={analyzing}
                    className="w-full btn-sweep btn-sweep-lilac py-3 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                    {analyzing ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Analyzing...</> : <><Icon name="auto_awesome" size={16} /> {resource.ai_processed ? 'Re-analyze' : 'Auto-tag with AI'}</>}
                  </button>
                  <button onClick={() => setShowStoryProfile(!showStoryProfile)}
                    className="w-full btn-glow btn-glow-lilac py-3 text-xs font-bold flex items-center justify-center gap-2">
                    <Icon name="auto_stories" size={16} /> Story Profile
                  </button>
                  {isPdf && pageCount > 1 && (
                    <button onClick={() => setShowPDFCleaner(!showPDFCleaner)}
                      className="w-full btn-glow py-3 text-xs font-bold flex items-center justify-center gap-2">
                      <Icon name="content_cut" size={16} /> Clean / Split PDF
                    </button>
                  )}
                  {showStoryProfile && <StoryProfilePanel resourceId={resource.id} resourceText="" onClose={() => setShowStoryProfile(false)} />}
                  {showPDFCleaner && <PDFCleaner resourceId={resource.id} title={resource.title} pageCount={pageCount} onComplete={() => { setShowPDFCleaner(false); onClose(); }} onClose={() => setShowPDFCleaner(false)} />}
                </>
              )}

              {/* ASSIGN TAB */}
              {tab === 'assign' && (
                <>
                  <p className="text-[10px] font-bold text-cyber-muted uppercase">Assign Whole Resource</p>
                  <div className="grid grid-cols-2 gap-2">
                    <select value={bookNum} onChange={e => setBookNum(Number(e.target.value))} className="border border-gray-200 rounded-none px-2 py-1.5 text-xs bg-cyber-bg"><option value={0}>Book…</option>{[1,2,3,4].map(n => <option key={n} value={n}>Book {n}</option>)}</select>
                    <select value={moduleNum} onChange={e => setModuleNum(Number(e.target.value))} className="border border-gray-200 rounded-none px-2 py-1.5 text-xs bg-cyber-bg"><option value={0}>Module…</option>{Array.from({length:15},(_,i)=>i+1).map(n => <option key={n} value={n}>Mod {n}</option>)}</select>
                  </div>
                  <input value={storyTitle} onChange={e => setStoryTitle(e.target.value)} className="w-full border border-gray-200 rounded-none px-2 py-1.5 text-xs bg-cyber-bg" placeholder="Story title" />
                  <select value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} className="w-full border border-gray-200 rounded-none px-2 py-1.5 text-xs bg-cyber-bg">
                    <option value={0}>Teaching Pal</option><option value={1}>Module Opener</option>
                    <option value={10}>Story 1</option><option value={11}>Story 1 - Vocab</option><option value={12}>Story 1 - Comp</option>
                    <option value={20}>Story 2</option><option value={21}>Story 2 - Vocab</option><option value={22}>Story 2 - Comp</option>
                    <option value={30}>Story 3</option><option value={40}>Story 4</option><option value={90}>Review</option><option value={91}>Assessment</option>
                  </select>
                  <button onClick={handleSave} className="w-full btn-sweep py-2 text-xs font-bold">Save Assignment</button>

                  {pageCount > 1 && (
                    <div className="border-t border-gray-200 pt-3 mt-2">
                      <p className="text-[10px] font-bold text-cyber-fg uppercase mb-2 flex items-center gap-1">
                        <Icon name="content_cut" size={12} /> Assign Pages ({pageCount} pages)
                      </p>
                      {assignments.length > 0 && (
                        <div className="space-y-1 mb-3">
                          {assignments.map(a => (
                            <div key={a.id} className="flex items-center gap-2 px-2 py-1.5 bg-cyber-surface border border-cyber-border rounded-none text-[10px]">
                              <Icon name="description" size={12} className="text-cyber-dim" />
                              <span className="flex-1 truncate">
                                p.{a.page_start}{a.page_end > a.page_start ? `–${a.page_end}` : ''} → Bk{a.book_num} M{a.module_num}
                                {a.label ? ` · ${a.label}` : ''}
                              </span>
                              <button onClick={() => handleRemoveAssignment(a.id)} className="text-cyber-muted hover:text-cyber-fg">
                                <Icon name="close" size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-2 bg-cyber-surface border border-cyber-border rounded-none p-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-cyber-dim w-12">Pages</span>
                          <input type="number" min={1} max={pageCount} value={paPageStart}
                            onChange={e => { const v = parseInt(e.target.value) || 1; setPaPageStart(v); if (paPageEnd < v) setPaPageEnd(v); }}
                            className="w-14 border border-gray-200 rounded px-2 py-1 text-xs text-center bg-cyber-bg" />
                          <span className="text-[10px] text-cyber-muted">to</span>
                          <input type="number" min={paPageStart} max={pageCount} value={paPageEnd}
                            onChange={e => setPaPageEnd(parseInt(e.target.value) || paPageStart)}
                            className="w-14 border border-gray-200 rounded px-2 py-1 text-xs text-center bg-cyber-bg" />
                          <span className="text-[9px] text-cyber-muted">of {pageCount}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <select value={paBookNum} onChange={e => setPaBookNum(Number(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-xs bg-cyber-bg">
                            <option value={0}>Book…</option>{[1,2,3,4].map(n => <option key={n} value={n}>Book {n}</option>)}
                          </select>
                          <select value={paModuleNum} onChange={e => setPaModuleNum(Number(e.target.value))} className="border border-gray-200 rounded px-2 py-1 text-xs bg-cyber-bg">
                            <option value={0}>Module…</option>{Array.from({length:15},(_,i)=>i+1).map(n => <option key={n} value={n}>Mod {n}</option>)}
                          </select>
                        </div>
                        <input value={paLabel} onChange={e => setPaLabel(e.target.value)}
                          placeholder={`Label (e.g. Grammar Review)`}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs bg-cyber-bg" />
                        <button onClick={handleAssignPage} disabled={savingPa || !paBookNum || !paModuleNum}
                          className="w-full btn-sweep py-1.5 text-[10px] font-bold disabled:opacity-50">
                          {savingPa ? 'Assigning…' : 'Assign Pages'}
                        </button>
                      </div>
                    </div>
                  )}
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
  const c = color === 'vault' ? 'bg-cyber-surface text-cyber-fg' : 'bg-cyber-surface text-cyber-dim';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c}`}><Icon name={icon} size={12} /> {text}</span>;
}

function TagRow({ label, items, color, mono }: { label: string; items?: string[]; color: string; mono?: boolean }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="text-[9px] font-bold text-cyber-muted uppercase mb-0.5">{label}</p>
      <div className="flex flex-wrap gap-1">{items.map(item => (
        <span key={item} className={`px-1.5 py-0.5 bg-${color}-50 text-${color}-700 text-[10px] rounded ${mono ? 'font-mono' : ''}`}>{item}</span>
      ))}</div>
    </div>
  );
}
