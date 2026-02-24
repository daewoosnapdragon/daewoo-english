'use client';

import { useState, useEffect, useCallback } from 'react';
import Icon from './Icon';
import { Resource } from '@/types';
import ResourceSearchModal from './ResourceSearchModal';

interface ModuleNotesProps {
  bookNum: number;
  moduleNum: number;
  storyTitle: string;
  allResources: Resource[];
  onSelectResource: (r: Resource) => void;
}

interface NoteFolder {
  id: string;
  folder_name: string;
  notes: string;
  resource_ids: string[];
  resources: (Resource & { thumbnail_url?: string })[];
}

const PRESET_FOLDERS = ['Grammar', 'Phonics', 'Vocabulary', 'Writing', 'Comprehension', 'Centers', 'Assessment'];
const ICONS: Record<string, string> = {
  Grammar: 'edit_note', Phonics: 'abc', Vocabulary: 'translate',
  Writing: 'draw', Comprehension: 'menu_book', Centers: 'groups', Assessment: 'quiz',
};

export default function ModuleNotes({ bookNum, moduleNum, storyTitle, allResources, onSelectResource }: ModuleNotesProps) {
  const [folders, setFolders] = useState<NoteFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [searchForFolder, setSearchForFolder] = useState<string | null>(null);
  const [showCustomName, setShowCustomName] = useState(false);
  const [customName, setCustomName] = useState('');

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ book: String(bookNum), module: String(moduleNum), story: storyTitle });
    const res = await fetch(`/api/module-notes?${p}`);
    const data = await res.json();
    setFolders(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [bookNum, moduleNum, storyTitle]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createFolder = async (name: string) => {
    await fetch('/api/module-notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_num: bookNum, module_num: moduleNum, story_title: storyTitle, folder_name: name }),
    });
    fetchNotes();
    setShowCustomName(false);
    setCustomName('');
  };

  const saveNotes = async (folderId: string) => {
    await fetch('/api/module-notes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId, notes: editText }),
    });
    setEditingNotes(null);
    fetchNotes();
  };

  const addResource = async (folderId: string, resourceId: string) => {
    await fetch('/api/module-notes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId, add_resource_id: resourceId }),
    });
    fetchNotes();
  };

  const removeResource = async (folderId: string, resourceId: string) => {
    await fetch('/api/module-notes', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId, remove_resource_id: resourceId }),
    });
    fetchNotes();
  };

  const deleteFolder = async (folderId: string) => {
    if (!confirm('Delete this folder?')) return;
    await fetch('/api/module-notes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: folderId }),
    });
    fetchNotes();
  };

  const allLinkedIds = folders.flatMap(f => f.resource_ids || []);

  if (loading) return null;

  return (
    <div className="space-y-1">
      {folders.map(f => (
        <div key={f.id} className="rounded-lg border border-sand-100 overflow-hidden">
          <button onClick={() => setOpenFolder(openFolder === f.id ? null : f.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-sand-50 text-left">
            <Icon name={ICONS[f.folder_name] || 'folder'} size={14} className="text-vault-500" />
            <span className="text-[11px] font-medium text-gray-700 flex-1">{f.folder_name}</span>
            <span className="text-[9px] text-sand-400">{(f.resource_ids || []).length}</span>
            <Icon name={openFolder === f.id ? 'expand_less' : 'expand_more'} size={14} className="text-sand-400" />
          </button>

          {openFolder === f.id && (
            <div className="border-t border-sand-50 px-2 py-1.5 space-y-1">
              {/* Notes */}
              {editingNotes === f.id ? (
                <div>
                  <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2} autoFocus
                    className="w-full border border-sand-200 rounded px-2 py-1 text-[11px]" placeholder="Teaching notes..." />
                  <div className="flex gap-1 mt-0.5">
                    <button onClick={() => saveNotes(f.id)} className="px-2 py-0.5 bg-vault-500 text-white text-[9px] rounded font-medium">Save</button>
                    <button onClick={() => setEditingNotes(null)} className="px-2 py-0.5 bg-sand-100 text-[9px] rounded">Cancel</button>
                  </div>
                </div>
              ) : (
                <div onClick={() => { setEditingNotes(f.id); setEditText(f.notes); }}
                  className="text-[11px] text-gray-600 cursor-pointer hover:bg-sand-50 p-1 rounded min-h-[20px]">
                  {f.notes || <span className="text-sand-400 italic">Click to add notes...</span>}
                </div>
              )}

              {/* Linked resources */}
              {(f.resources || []).map(r => (
                <div key={r.id} className="flex items-center gap-1.5 text-[11px]">
                  <div onClick={() => onSelectResource(r as any)} className="flex items-center gap-1.5 flex-1 cursor-pointer hover:bg-sand-50 p-0.5 rounded truncate">
                    <div className="w-5 h-5 rounded bg-sand-100 flex-shrink-0 flex items-center justify-center overflow-hidden">
                      {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="w-full h-full object-cover" /> : <Icon name="description" size={10} className="text-sand-400" />}
                    </div>
                    <span className="text-gray-700 truncate">{r.title}</span>
                  </div>
                  <button onClick={() => removeResource(f.id, r.id)} className="p-0.5 text-sand-400 hover:text-red-500"><Icon name="close" size={12} /></button>
                </div>
              ))}

              {/* Actions */}
              <div className="flex gap-2 pt-0.5">
                <button onClick={() => setSearchForFolder(f.id)} className="text-[9px] text-vault-600 hover:underline flex items-center gap-0.5">
                  <Icon name="search" size={10} /> Add resource
                </button>
                <button onClick={() => deleteFolder(f.id)} className="text-[9px] text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add folder buttons */}
      <div className="flex flex-wrap gap-1 pt-1">
        {PRESET_FOLDERS.filter(n => !folders.some(f => f.folder_name === n)).slice(0, 4).map(n => (
          <button key={n} onClick={() => createFolder(n)}
            className="px-1.5 py-0.5 bg-sand-50 hover:bg-vault-50 border border-dashed border-sand-300 rounded text-[9px] text-gray-500 hover:text-vault-700 flex items-center gap-0.5">
            <Icon name="add" size={10} /> {n}
          </button>
        ))}
        {showCustomName ? (
          <div className="flex gap-1 items-center">
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Name"
              className="border border-sand-200 rounded px-1.5 py-0.5 text-[10px] w-20" autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && customName.trim()) createFolder(customName.trim()); }} />
            <button onClick={() => { if (customName.trim()) createFolder(customName.trim()); }}
              className="px-1.5 py-0.5 bg-vault-500 text-white text-[9px] rounded font-medium">Add</button>
            <button onClick={() => setShowCustomName(false)} className="text-[9px] text-gray-400">✕</button>
          </div>
        ) : (
          <button onClick={() => setShowCustomName(true)}
            className="px-1.5 py-0.5 bg-sand-50 hover:bg-vault-50 border border-dashed border-sand-300 rounded text-[9px] text-gray-500 hover:text-vault-700 flex items-center gap-0.5">
            <Icon name="add" size={10} /> Custom...
          </button>
        )}
      </div>

      {/* Resource search modal */}
      {searchForFolder && (
        <ResourceSearchModal
          excludeIds={allLinkedIds}
          onSelect={(resourceId) => addResource(searchForFolder, resourceId)}
          onClose={() => setSearchForFolder(null)}
        />
      )}
    </div>
  );
}
