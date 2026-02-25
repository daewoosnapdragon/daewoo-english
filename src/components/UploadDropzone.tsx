'use client';

import { useCallback, useState } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';
import { formatFileSize, isAllowedFile } from '@/lib/utils';
import { createClient } from '@/lib/supabase-browser';

interface UploadDropzoneProps {
  onUploadComplete: (resources: Resource[]) => void;
}

interface UploadItem {
  file: File;
  status: 'pending' | 'uploading' | 'registering' | 'done' | 'duplicate' | 'error';
  resource?: Resource;
  error?: string;
  duplicateOf?: string;
}

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

async function getPdfPageCount(file: File): Promise<number> {
  try {
    if (!(window as any).pdfjsLib) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        s.onload = () => resolve(); s.onerror = () => reject();
        document.head.appendChild(s);
      });
    }
    const pdfjsLib = (window as any).pdfjsLib;
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuf = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
    return pdf.numPages || 1;
  } catch {
    return 1;
  }
}

export default function UploadDropzone({ onUploadComplete }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const supabase = createClient();

  const handleUpload = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(f => isAllowedFile(f.name));
    if (!fileArray.length) return;

    const newItems: UploadItem[] = fileArray.map(f => ({ file: f, status: 'pending' as const }));
    setItems(newItems);
    setUploading(true);

    const completed: Resource[] = [];
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    for (let i = 0; i < newItems.length; i++) {
      const file = newItems[i].file;
      setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'uploading' } : item));

      try {
        const hash = await hashFile(file);

        // Detect page count for PDFs
        let pageCount = 1;
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (ext === 'pdf') {
          pageCount = await getPdfPageCount(file);
        }

        const fileId = crypto.randomUUID();
        const storagePath = `${user.id}/${fileId}.${ext}`;

        const { error: storageErr } = await supabase.storage
          .from('resources')
          .upload(storagePath, file, { contentType: file.type, upsert: false });

        if (storageErr) throw new Error(storageErr.message);

        setItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'registering' } : item));

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            storage_path: storagePath,
            file_size: file.size,
            file_hash: hash,
            page_count: pageCount,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text.slice(0, 100));
        }

        const data = await res.json();

        if (data.duplicate) {
          setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'duplicate', duplicateOf: data.existing.title } : item
          ));
        } else if (data.error) {
          throw new Error(data.error);
        } else {
          completed.push(data);
          setItems(prev => prev.map((item, idx) =>
            idx === i ? { ...item, status: 'done', resource: data } : item
          ));
        }
      } catch (err: any) {
        setItems(prev => prev.map((item, idx) =>
          idx === i ? { ...item, status: 'error', error: err.message || 'Upload failed' } : item
        ));
      }
    }

    setUploading(false);
    if (completed.length > 0) onUploadComplete(completed);
  }, [onUploadComplete, supabase]);

  // Recursively extract files from directory entries (for folder drops)
  const getFilesFromEntry = useCallback(async (entry: FileSystemEntry): Promise<File[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        (entry as FileSystemFileEntry).file(f => resolve([f]), () => resolve([]));
      });
    }
    if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      const entries: FileSystemEntry[] = await new Promise((resolve) => {
        const all: FileSystemEntry[] = [];
        const readBatch = () => {
          reader.readEntries((batch) => {
            if (batch.length === 0) { resolve(all); return; }
            all.push(...batch);
            readBatch(); // keep reading until empty (readEntries is batched)
          }, () => resolve(all));
        };
        readBatch();
      });
      const nested = await Promise.all(entries.map(e => getFilesFromEntry(e)));
      return nested.flat();
    }
    return [];
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    // Check for directory entries (folder drop support)
    const entries = Array.from(e.dataTransfer.items || [])
      .map(item => item.webkitGetAsEntry?.())
      .filter(Boolean) as FileSystemEntry[];
    
    if (entries.length > 0 && entries.some(e => e.isDirectory)) {
      // Has folders — recursively extract all files
      const allFiles = await Promise.all(entries.map(e => getFilesFromEntry(e)));
      const files = allFiles.flat();
      if (files.length) handleUpload(files);
    } else if (e.dataTransfer.files.length) {
      handleUpload(e.dataTransfer.files);
    }
  }, [handleUpload, getFilesFromEntry]);

  const clearItems = () => setItems([]);
  const doneCount = items.filter(i => i.status === 'done').length;
  const dupeCount = items.filter(i => i.status === 'duplicate').length;
  const errCount = items.filter(i => i.status === 'error').length;
  const allDone = !uploading && items.length > 0 && items.every(i => !['pending','uploading','registering'].includes(i.status));

  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
          className={`border-2 border-dashed rounded-none p-6 text-center transition-all ${ 
            isDragging ? 'border-cyber-fg bg-cyber-surface' : 'border-cyber-border hover:border-cyber-fg'
          }`}>
          <Icon name="cloud_upload" size={36} className="text-cyber-dim mx-auto mb-2" />
          <p className="text-cyber-fg font-medium text-sm">{isDragging ? 'Drop files or folders here!' : 'Drag & drop files or folders'}</p>
          <p className="text-cyber-dim text-xs mt-1 mb-3">PDF, PowerPoint, Word, Images</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file'; input.multiple = true;
                input.accept = '.pdf,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.doc,.docx,.svg';
                input.onchange = (e) => { const f = (e.target as HTMLInputElement).files; if (f) handleUpload(f); };
                input.click();
              }}
              className="btn-sweep" style={{ padding: '6px 14px', fontSize: 11 }}>
              Choose Files
            </button>
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                (input as any).webkitdirectory = true;
                (input as any).mozdirectory = true;
                input.multiple = true;
                input.onchange = (e) => { const f = (e.target as HTMLInputElement).files; if (f) handleUpload(f); };
                input.click();
              }}
              className="btn-glow" style={{ padding: '6px 14px', fontSize: 11 }}>
              <span className="flex items-center gap-1"><Icon name="folder_open" size={14} /> Choose Folder</span>
            </button>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="bg-cyber-bg rounded-none border border-cyber-border overflow-hidden">
          <div className="px-4 py-2 bg-cyber-surface border-b border-cyber-border flex items-center justify-between">
            <span className="text-xs font-medium text-cyber-dim">
              {uploading ? `Uploading ${items.filter(i => ['done','duplicate'].includes(i.status)).length + 1} of ${items.length}...`
                : `${doneCount} uploaded${dupeCount ? `, ${dupeCount} skipped` : ''}${errCount ? `, ${errCount} failed` : ''}`}
            </span>
            {allDone && <button onClick={clearItems} className="text-xs text-cyber-fg hover:underline">Clear</button>}
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-sand-100">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2">
                <div className="w-5 flex-shrink-0">
                  {item.status === 'pending' && <Icon name="schedule" size={16} className="text-cyber-muted" />}
                  {['uploading','registering'].includes(item.status) && <div className="w-4 h-4 border-2 border-cyber-border rounded-full animate-spin" style={{ borderTopColor: '#c4a0d4' }} />}
                  {item.status === 'done' && <Icon name="check_circle" size={16} className="text-cyber-lilac" />}
                  {item.status === 'duplicate' && <Icon name="content_copy" size={16} className="text-cyber-dim" />}
                  {item.status === 'error' && <Icon name="error" size={16} className="text-cyber-dim" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-cyber-fg truncate">{item.file.name}</p>
                  <p className="text-[10px] text-cyber-muted">
                    {item.status === 'duplicate' && `Already exists`}
                    {item.status === 'error' && item.error}
                    {item.status === 'done' && formatFileSize(item.file.size)}
                    {item.status === 'uploading' && 'Uploading...'}
                    {item.status === 'registering' && 'Registering...'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
