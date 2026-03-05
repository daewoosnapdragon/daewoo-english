'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Icon from './Icon';
import { Resource, CATEGORIES, CATEGORY_LABELS, RESOURCE_TYPES, USAGE_TAGS, DIFFICULTY_TAGS } from '@/types';
import { formatFileSize, isAllowedFile, cleanTitle } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';
import { hashFile, getPdfPageCount } from '@/lib/upload-utils';

interface UploadOrganizeProps {
  onResourcesChanged: () => void;
  onSelectResource: (r: Resource & { thumbnail_url?: string | null; file_url?: string }) => void;
}

interface UploadItem {
  file: File;
  relativePath?: string;
  status: 'pending' | 'uploading' | 'registering' | 'done' | 'duplicate' | 'error';
  resource?: Resource;
  error?: string;
}

export default function UploadOrganize({ onResourcesChanged, onSelectResource }: UploadOrganizeProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [recentResources, setRecentResources] = useState<(Resource & { thumbnail_url?: string | null; file_url?: string })[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkUsageTags, setBulkUsageTags] = useState<string[]>([]);
  const [bulkDiffTags, setBulkDiffTags] = useState<string[]>([]);
  const supabase = createClient();

  const [attentionCounts, setAttentionCounts] = useState<{ untagged: number; noCategory: number; packets: number }>({ untagged: 0, noCategory: 0, packets: 0 });

  const fetchAttentionCounts = useCallback(async () => {
    // Use the init endpoint's counts which cover ALL resources
    const res = await fetch('/api/init');
    const data = await res.json();
    if (data.counts) {
      setAttentionCounts({
        untagged: data.counts.untagged || 0,
        noCategory: data.counts.no_category || 0,
        packets: data.counts.packets || 0,
      });
    }
  }, []);

  useEffect(() => { fetchAttentionCounts(); }, [fetchAttentionCounts]);

  const fetchRecent = useCallback(async () => {
    setLoadingRecent(true);
    const res = await fetch('/api/resources?sort=created_at&order=desc&limit=50');
    const data = await res.json();
    setRecentResources(Array.isArray(data) ? data : []);
    setLoadingRecent(false);
  }, []);

  useEffect(() => { fetchRecent(); }, [fetchRecent]);

  // Collect files from a dropped folder via DataTransferItem.webkitGetAsEntry
  async function getFilesFromDrop(e: React.DragEvent): Promise<{ file: File; path: string }[]> {
    const results: { file: File; path: string }[] = [];
    const items = e.dataTransfer.items;

    async function readEntry(entry: any, path: string): Promise<void> {
      if (entry.isFile) {
        const file: File = await new Promise(res => entry.file(res));
        if (isAllowedFile(file.name)) results.push({ file, path: path + file.name });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        const entries: any[] = await new Promise(res => reader.readEntries(res));
        for (const child of entries) {
          await readEntry(child, path + entry.name + '/');
        }
      }
    }

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const entry = items[i].webkitGetAsEntry?.();
        if (entry) await readEntry(entry, '');
      }
    }

    // Fallback if webkitGetAsEntry not supported
    if (results.length === 0 && e.dataTransfer.files.length) {
      for (const f of Array.from(e.dataTransfer.files)) {
        if (isAllowedFile(f.name)) results.push({ file: f, path: f.name });
      }
    }

    return results;
  }

  const handleUpload = useCallback(async (files: { file: File; path: string }[]) => {
    if (!files.length) return;
    setUploading(true);

    // Detect folder name from paths
    const folderNames = new Set<string>();
    for (const f of files) {
      const parts = f.path.split('/');
      if (parts.length > 1) folderNames.add(parts[0]);
    }

    // Create collections for folders
    const folderCollectionMap = new Map<string, string>();
    for (const folderName of Array.from(folderNames)) {
      try {
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: folderName }),
        });
        if (res.ok) {
          const col = await res.json();
          folderCollectionMap.set(folderName, col.id);
        }
      } catch {}
    }

    const newItems: UploadItem[] = files.map(f => ({ file: f.file, relativePath: f.path, status: 'pending' as const }));
    setItems(newItems);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    for (let i = 0; i < newItems.length; i++) {
      const { file, relativePath } = { file: newItems[i].file, relativePath: newItems[i].relativePath || '' };
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));

      try {
        const hash = await hashFile(file);
        let pageCount = 1;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext === 'pdf') pageCount = await getPdfPageCount(file);

        const fileId = crypto.randomUUID();
        const storagePath = `${user.id}/${fileId}.${ext}`;
        const { error: storageErr } = await supabase.storage.from('resources').upload(storagePath, file, { contentType: file.type, upsert: false });
        if (storageErr) throw new Error(storageErr.message);

        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'registering' } : item));

        // Determine collection from folder path
        const folderName = relativePath.split('/').length > 1 ? relativePath.split('/')[0] : '';
        const collectionId = folderCollectionMap.get(folderName) || '';

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            storage_path: storagePath,
            file_size: file.size,
            file_hash: hash,
            page_count: pageCount,
            collection_id: collectionId || undefined,
          }),
        });

        if (!res.ok) throw new Error((await res.text()).slice(0, 100));
        const data = await res.json();

        if (data.duplicate) {
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'duplicate' } : item));
        } else {
          // Add to collection if from a folder
          if (collectionId && data.id) {
            try {
              await fetch(`/api/collections/${collectionId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ add_resource_id: data.id }),
              });
            } catch {}
          }
          setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'done', resource: data } : item));
        }
      } catch (err: any) {
        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'error', error: err.message } : item));
      }
    }

    setUploading(false);
    onResourcesChanged();
    fetchRecent();
  }, [onResourcesChanged, supabase, fetchRecent]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const files = await getFilesFromDrop(e);
    handleUpload(files);
  }, [handleUpload]);

  const handleFileClick = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.accept = '.pdf,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.svg';
    input.onchange = (e) => {
      const f = (e.target as HTMLInputElement).files;
      if (f) handleUpload(Array.from(f).filter(fi => isAllowedFile(fi.name)).map(fi => ({ file: fi, path: fi.name })));
    };
    input.click();
  };

  // Folder picker
  const handleFolderClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    (input as any).webkitdirectory = true;
    (input as any).directory = true;
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const mapped = Array.from(files)
        .filter(f => isAllowedFile(f.name))
        .map(f => ({ file: f, path: (f as any).webkitRelativePath || f.name }));
      handleUpload(mapped);
    };
    input.click();
  };

  const handleInlineRename = async (id: string, newTitle: string) => {
    setEditingId(null);
    if (!newTitle.trim()) return;
    await fetch(`/api/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: newTitle.trim() }),
    });
    setRecentResources(prev => prev.map(r => r.id === id ? { ...r, title: newTitle.trim() } : r));
  };

  const handleQuickCategory = async (id: string, category: string) => {
    await fetch(`/api/resources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category }),
    });
    setRecentResources(prev => prev.map(r => r.id === id ? { ...r, category } : r));
    onResourcesChanged();
  };

  const handleBulkApply = async () => {
    const ids = Array.from(bulkSelected);
    for (const id of ids) {
      const updates: any = {};
      if (bulkCategory) updates.category = bulkCategory;
      if (bulkUsageTags.length) updates.usage_tags = bulkUsageTags;
      if (bulkDiffTags.length) updates.difficulty_tags = bulkDiffTags;
      if (Object.keys(updates).length) {
        await fetch(`/api/resources/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      }
    }
    setBulkSelected(new Set());
    setShowBulkAssign(false);
    setBulkCategory('');
    setBulkUsageTags([]);
    setBulkDiffTags([]);
    fetchRecent();
    onResourcesChanged();
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const doneCount = items.filter(i => i.status === 'done').length;
  const allDone = !uploading && items.length > 0 && items.every(i => !['pending', 'uploading', 'registering'].includes(i.status));
  const untagged = recentResources.filter(r => !r.ai_processed);
  const noCategory = recentResources.filter(r => !r.category);
  const packets = recentResources.filter(r => r.page_count > 3);

  // Use the full-count numbers for display, but recentResources list for actions
  const displayUntagged = attentionCounts.untagged || untagged.length;
  const displayNoCategory = attentionCounts.noCategory || noCategory.length;
  const displayPackets = attentionCounts.packets || packets.length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-cyber-border flex-shrink-0">
        <Icon name="cloud_upload" size={22} className="text-cyber-fg" />
        <span className="font-bold text-cyber-fg">Upload & Organize</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-none p-8 text-center transition-all ${isDragging ? 'border-cyber-fg bg-cyber-surface' : 'border-cyber-border bg-cyber-surface/50'}`}
        >
          <Icon name="cloud_upload" size={40} className="text-cyber-dim mx-auto mb-3" />
          <p className="text-cyber-fg font-semibold text-sm mb-1">{isDragging ? 'Drop here!' : 'Drag & drop files or folders'}</p>
          <p className="text-cyber-dim text-xs mb-3">PDF, PowerPoint, Word, Images — folders will auto-create collections</p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleFileClick} className="btn-sweep px-4 py-2 text-xs font-bold flex items-center gap-1.5">
              <Icon name="upload_file" size={16} /> Files
            </button>
            <button onClick={handleFolderClick} className="btn-glow px-4 py-2 text-xs font-bold flex items-center gap-1.5">
              <Icon name="create_new_folder" size={16} /> Folder
            </button>
          </div>
        </div>

        {/* Upload progress */}
        {items.length > 0 && (
          <div className="bg-cyber-bg rounded-none border border-cyber-border overflow-hidden">
            <div className="px-4 py-2 bg-cyber-surface border-b border-cyber-border flex items-center justify-between">
              <span className="text-xs font-medium text-cyber-dim">
                {uploading ? `Uploading ${items.filter(i => ['done', 'duplicate'].includes(i.status)).length + 1} of ${items.length}…` : `${doneCount} uploaded`}
              </span>
              {allDone && <button onClick={() => setItems([])} className="text-xs text-cyber-fg hover:underline">Clear</button>}
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-cyber-border">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2">
                  <div className="w-5 flex-shrink-0">
                    {item.status === 'pending' && <Icon name="schedule" size={16} className="text-cyber-muted" />}
                    {['uploading', 'registering'].includes(item.status) && <div className="w-4 h-4 border-2 border-cyber-border border-t-cyber-fg rounded-full animate-spin" />}
                    {item.status === 'done' && <span className="check-pop" style={{ color: '#80c0a0', fontSize: 14 }}>&#10003;</span>}
                    {item.status === 'duplicate' && <Icon name="content_copy" size={16} className="text-amber-500" />}
                    {item.status === 'error' && <Icon name="error" size={16} className="text-cyber-dim" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-cyber-fg truncate">{item.relativePath || item.file.name}</p>
                    <p className="text-[10px] text-cyber-muted">
                      {item.status === 'done' && formatFileSize(item.file.size)}
                      {item.status === 'duplicate' && 'Already exists'}
                      {item.status === 'error' && item.error}
                      {item.status === 'uploading' && 'Uploading…'}
                      {item.status === 'registering' && 'Registering…'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Needs Attention */}
        {(displayUntagged > 0 || displayNoCategory > 0 || displayPackets > 0) && (
          <div className="bg-cyber-surface border border-cyber-border rounded-none p-3">
            <p className="text-xs font-bold text-cyber-fg mb-1.5 flex items-center gap-1"><Icon name="info" size={14} /> Needs Attention</p>
            <div className="flex flex-wrap gap-2">
              {displayUntagged > 0 && (
                <span className="text-[10px] bg-cyber-surface text-cyber-fg px-2 py-1 rounded-none font-medium">{displayUntagged} not AI-tagged</span>
              )}
              {displayNoCategory > 0 && (
                <span className="text-[10px] bg-cyber-surface text-cyber-fg px-2 py-1 rounded-none font-medium">{displayNoCategory} no category</span>
              )}
              {displayPackets > 0 && (
                <span className="text-[10px] bg-cyber-surface text-cyber-fg px-2 py-1 rounded-none font-medium">{displayPackets} multi-page packets</span>
              )}
            </div>
            {untagged.length > 0 && (
              <AutoTagAllButton resources={untagged} onComplete={() => { fetchRecent(); fetchAttentionCounts(); onResourcesChanged(); }} />
            )}
          </div>
        )}

        {/* Bulk actions bar */}
        {bulkSelected.size > 0 && (
          <div className="sticky top-0 z-10 bg-cyber-surface border-b border-cyber-border text-cyber-fg rounded-none px-4 py-2 flex items-center gap-2">
            <span className="text-xs font-bold">{bulkSelected.size} selected</span>
            <div className="flex-1" />
            <button onClick={() => setShowBulkAssign(true)} className="text-xs bg-cyber-bg/20 hover:bg-cyber-bg/30 px-3 py-1 rounded-none font-medium">Assign Tags</button>
            <button onClick={() => setBulkSelected(new Set())} className="text-xs hover:bg-cyber-bg/20 px-2 py-1 rounded-none">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}

        {/* Bulk assign modal */}
        {showBulkAssign && (
          <div className="bg-cyber-bg rounded-none border border-cyber-border p-4 space-y-3">
            <p className="text-sm font-bold text-cyber-fg">Assign to {bulkSelected.size} resources</p>
            <div>
              <label className="text-[10px] font-bold text-cyber-dim uppercase">Category</label>
              <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} className="w-full border border-cyber-border rounded-none px-2 py-1.5 text-xs mt-0.5">
                <option value="">— no change —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-cyber-dim uppercase">Usage Tags</label>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {USAGE_TAGS.map(t => (
                  <button key={t} onClick={() => setBulkUsageTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    className={`px-2 py-0.5 text-[10px] rounded-none font-medium ${bulkUsageTags.includes(t) ? 'bg-cyber-surface border border-cyber-lilac-muted text-cyber-lilac' : 'bg-cyber-surface border border-cyber-border text-cyber-dim hover:border-cyber-border'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-cyber-dim uppercase">Difficulty</label>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {DIFFICULTY_TAGS.map(t => (
                  <button key={t} onClick={() => setBulkDiffTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])}
                    className={`px-2 py-0.5 text-[10px] rounded-none font-medium ${bulkDiffTags.includes(t) ? 'bg-cyber-surface border border-cyber-fg text-cyber-fg' : 'bg-cyber-surface border border-cyber-border text-cyber-dim hover:border-cyber-border'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleBulkApply} className="btn-sweep px-4 py-1.5 text-xs font-bold">Apply</button>
              <button onClick={() => setShowBulkAssign(false)} className="px-4 py-1.5 bg-cyber-surface text-cyber-dim text-xs font-bold rounded-none">Cancel</button>
            </div>
          </div>
        )}

        {/* Recently uploaded */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold text-cyber-dim uppercase tracking-wider">Recently Uploaded</p>
            <div className="flex-1 border-t border-cyber-border" />
          </div>
          {loadingRecent ? (
            <div className="flex justify-center py-8"><div className="w-5 h-5 border-2 border-cyber-border border-t-cyber-fg rounded-full animate-spin" /></div>
          ) : recentResources.length === 0 ? (
            <p className="text-center text-cyber-muted text-sm py-8">No resources yet — upload some!</p>
          ) : (
            <div className="space-y-1">
              {recentResources.map(r => (
                <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 bg-cyber-bg rounded-none border border-cyber-border hover:shadow-sm group">
                  {/* Bulk select checkbox */}
                  <input type="checkbox" checked={bulkSelected.has(r.id)}
                    onChange={() => toggleBulkSelect(r.id)}
                    className="w-3.5 h-3.5 rounded border-cyber-border text-cyber-fg focus:ring-cyber-fg flex-shrink-0" />

                  {/* Thumbnail */}
                  <div className="w-8 h-8 rounded bg-cyber-surface flex items-center justify-center flex-shrink-0 overflow-hidden cursor-pointer"
                    onClick={() => onSelectResource(r)}>
                    {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      : <Icon name="description" size={14} className="text-cyber-dim" />}
                  </div>

                  {/* Title — inline editable */}
                  <div className="flex-1 min-w-0">
                    {editingId === r.id ? (
                      <input
                        autoFocus
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onBlur={() => handleInlineRename(r.id, editTitle)}
                        onKeyDown={e => { if (e.key === 'Enter') handleInlineRename(r.id, editTitle); if (e.key === 'Escape') setEditingId(null); }}
                        className="text-xs font-medium text-cyber-fg w-full bg-cyber-surface border border-cyber-border rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-cyber-fg"
                      />
                    ) : (
                      <p className="text-xs font-medium text-cyber-fg truncate cursor-pointer hover:text-cyber-fg"
                        onClick={() => onSelectResource(r)}
                        onDoubleClick={(e) => { e.stopPropagation(); setEditingId(r.id); setEditTitle(r.title); }}>
                        {r.title}
                      </p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      {r.page_count > 1 && (
                        <span className="text-[8px] bg-cyber-surface text-cyber-fg px-1 rounded font-bold">{r.page_count}p</span>
                      )}
                      {r.category && (
                        <span className="text-[8px] bg-cyber-surface text-cyber-fg px-1 rounded">{CATEGORY_LABELS[r.category] || r.category}</span>
                      )}
                      {r.resource_type && (
                        <span className="text-[8px] text-cyber-dim">{r.resource_type}</span>
                      )}
                      {r.ai_processed && <Icon name="auto_awesome" size={10} className="text-cyber-lilac" />}
                    </div>
                  </div>

                  {/* Quick category picker */}
                  {!r.category && (
                    <select
                      value=""
                      onChange={e => handleQuickCategory(r.id, e.target.value)}
                      className="text-[10px] border border-cyber-border rounded px-1 py-0.5 text-cyber-dim opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 max-w-[80px]"
                    >
                      <option value="">Category…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                    </select>
                  )}

                  {/* Edit button */}
                  <button onClick={() => { setEditingId(r.id); setEditTitle(r.title); }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-cyber-dim hover:text-cyber-fg hover:bg-cyber-surface opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <Icon name="edit" size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AutoTagAllButton({ resources, onComplete }: { resources: (Resource & { thumbnail_url?: string | null })[]; onComplete: () => void }) {
  const [tagging, setTagging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);

  const handleTagAll = async () => {
    setTagging(true);
    setTotal(resources.length);
    setProgress(0);

    for (let i = 0; i < resources.length; i++) {
      setProgress(i + 1);
      try {
        await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resource_id: resources[i].id }),
        });
      } catch {}
      // Small delay to avoid rate limits
      if (i < resources.length - 1) await new Promise(r => setTimeout(r, 500));
    }

    setTagging(false);
    onComplete();
  };

  return (
    <button onClick={handleTagAll} disabled={tagging}
      className="btn-sweep btn-sweep-lilac mt-2 w-full px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60">
      {tagging ? (
        <>
          <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Tagging {progress} of {total}…
        </>
      ) : (
        <>
          <Icon name="auto_awesome" size={14} /> Auto-Tag All ({resources.length})
        </>
      )}
    </button>
  );
}
