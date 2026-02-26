'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, Trash2, Pencil, Check, Minus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Copy, ClipboardPaste, GripVertical } from 'lucide-react'

interface Period { id: string; name: string; sort_order: number; color: string }
interface Track { id: string; english_class: string; grade: number | null; name: string; sort_order: number }
interface Cell { id?: string; content: string; standard_codes: string[] }

// Render cell content with markdown-like formatting
function renderCellContent(content: string): string {
  if (!content) return ''
  return content
    .replace(/---/g, '<hr style="border:0;border-top:1px solid #e2e8f0;margin:3px 0">')
    .replace(/^## (.+)$/gm, '<div style="font-size:13px;font-weight:800;color:#1B2A4A;margin:3px 0 1px">$1</div>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:10px;position:relative;margin:0"><span style="position:absolute;left:1px">&#8226;</span>$1</div>')
    .replace(/\n\n+/g, '<div style="height:4px"></div>')
    .replace(/\n/g, '<br>')
}

// Extract just the bold headings and titles for the at-a-glance view
function extractHeadings(content: string): { text: string; isTitle: boolean }[] {
  if (!content) return []
  const headings: { text: string; isTitle: boolean }[] = []
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    const titleMatch = trimmed.match(/^## (.+)$/)
    if (titleMatch) { headings.push({ text: titleMatch[1], isTitle: true }); continue }
    const headingMatch = trimmed.match(/^\*\*(.+?)\*\*$/)
    if (headingMatch) headings.push({ text: headingMatch[1], isTitle: false })
  }
  return headings
}

// Extract topic keywords — non-heading, non-divider lines as compact tags
function extractKeywords(content: string): string[] {
  if (!content) return []
  const kw: string[] = []
  for (const line of content.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (t.match(/^## /)) continue                  // skip titles
    if (t.match(/^\*\*(.+?)\*\*$/)) continue        // skip bold headings
    if (t === '---' || t === '***' || t === '___') continue // skip dividers
    // Clean up: strip bullet prefix, bold markers, leading/trailing punctuation
    let clean = t.replace(/^[-*•]\s*/, '').replace(/\*\*/g, '').replace(/\*(.+?)\*/g, '$1').trim()
    if (!clean || clean.length < 2) continue
    // Split on common delimiters (·, /, ,) to get individual topics
    const parts = clean.split(/\s*[·\/]\s*|,\s*/).map(s => s.trim()).filter(s => s.length >= 2)
    if (parts.length > 1) { kw.push(...parts) } else if (clean.length <= 40) { kw.push(clean) } else { kw.push(clean.slice(0, 38) + '…') }
  }
  return kw.slice(0, 6) // max 6 tags
}

// Check if content has detail beyond just headings
function hasDetail(content: string): boolean {
  if (!content) return false
  return content.split('\n').some(line => {
    const t = line.trim()
    return t && !t.match(/^\*\*(.+?)\*\*$/) && t !== '---' && t !== '***' && t !== '___'
  })
}

export default function YearlyPlanView() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Snapdragon'
  const teacherClass = currentTeacher?.english_class as EnglishClass
  const [viewMode, setViewMode] = useState<'class' | 'program'>(isAdmin ? 'program' : 'class')
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(3)
  const [progGrade, setProgGrade] = useState<Grade | 'all'>('all')
  const [progClass, setProgClass] = useState<EnglishClass | 'all'>('all')

  const [periods, setPeriods] = useState<Period[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [allCells, setAllCells] = useState<Record<string, Record<string, Cell>>>({})
  const [loading, setLoading] = useState(true)
  const [clipboard, setClipboard] = useState<{ content: string; fromKey: string } | null>(null)
  const [popover, setPopover] = useState<{ key: string; rect: DOMRect } | null>(null)
  const popoverOpenTimer = useRef<NodeJS.Timeout | null>(null)
  const popoverCloseTimer = useRef<NodeJS.Timeout | null>(null)
  const clearPopoverTimers = () => {
    if (popoverOpenTimer.current) clearTimeout(popoverOpenTimer.current)
    if (popoverCloseTimer.current) clearTimeout(popoverCloseTimer.current)
  }
  const schedulePopoverClose = () => {
    if (popoverCloseTimer.current) clearTimeout(popoverCloseTimer.current)
    popoverCloseTimer.current = setTimeout(() => setPopover(null), 300)
  }
  const cancelPopoverClose = () => {
    if (popoverCloseTimer.current) clearTimeout(popoverCloseTimer.current)
  }
  const [editModal, setEditModal] = useState<{ trackId: string; periodId: string; trackIdx: number; periodIdx: number } | null>(null)
  const [editText, setEditText] = useState('')
  // Block editor state
  type BlockType = 'title' | 'heading' | 'text' | 'bullet' | 'divider'
  interface Block { id: string; type: BlockType; text: string }
  const [blocks, setBlocks] = useState<Block[]>([])
  const [focusedBlockIdx, setFocusedBlockIdx] = useState<number | null>(null)
  const blockIdCounter = useRef(0)
  const newBlock = (type: BlockType = 'heading', text = ''): Block => ({ id: `b${++blockIdCounter.current}`, type, text })

  // Parse markdown string into blocks
  const parseToBlocks = (md: string): Block[] => {
    if (!md.trim()) return [newBlock('heading')]
    return md.split('\n').map(line => {
      const trimmed = line.trim()
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') return newBlock('divider')
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return newBlock('bullet', trimmed.slice(2))
      if (trimmed.startsWith('## ')) return newBlock('title', trimmed.slice(3))
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) return newBlock('heading', trimmed.slice(2, -2))
      if (trimmed.startsWith('**')) return newBlock('heading', trimmed.replace(/\*\*/g, ''))
      return newBlock('text', line)
    }).filter((b, i, arr) => !(b.type === 'text' && !b.text && i === arr.length - 1 && arr.length > 1))
  }

  // Serialize blocks back to markdown
  const blocksToMarkdown = (bs: Block[]): string => {
    return bs.map(b => {
      if (b.type === 'divider') return '---'
      if (b.type === 'title') return `## ${b.text}`
      if (b.type === 'heading') return `**${b.text}**`
      if (b.type === 'bullet') return `- ${b.text}`
      return b.text
    }).join('\n')
  }

  // Sync blocks -> editText whenever blocks change
  const updateBlocks = (newBlocks: Block[]) => {
    setBlocks(newBlocks)
    setEditText(blocksToMarkdown(newBlocks))
  }
  const [addingTrack, setAddingTrack] = useState(false)
  const [newTrackName, setNewTrackName] = useState('')
  // Swimlane state
  const [collapsedTracks, setCollapsedTracks] = useState<Set<string>>(new Set())
  const [compareModal, setCompareModal] = useState<{ trackName: string; periodId: string; periodName: string; grade: Grade } | null>(null)
  const [compareClasses, setCompareClasses] = useState<Set<EnglishClass>>(new Set())
  const [renamingTrack, setRenamingTrack] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  const canEdit = isAdmin || currentTeacher?.english_class === selectedClass
  const isEmptyContent = (c?: string) => {
    if (!c) return true
    const t = c.trim()
    return !t || t === '-' || t === '--' || t === '—' || t === '---' || t === '***' || t === '___'
  }

  // Drag-to-reorder state for tracks
  const dragTrack = useRef<string | null>(null)
  const dragOverTrack = useRef<string | null>(null)
  const [dragTrackId, setDragTrackId] = useState<string | null>(null)

  const handleDragStart = (trackId: string) => {
    dragTrack.current = trackId
    setDragTrackId(trackId)
  }
  const handleDragOver = (e: React.DragEvent, trackId: string) => {
    e.preventDefault()
    dragOverTrack.current = trackId
  }
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragTrack.current
    const to = dragOverTrack.current
    if (!from || !to || from === to) { setDragTrackId(null); return }

    const fromIdx = classTracks.findIndex(t => t.id === from)
    const toIdx = classTracks.findIndex(t => t.id === to)
    if (fromIdx < 0 || toIdx < 0) { setDragTrackId(null); return }

    // Reorder locally
    const reordered = [...classTracks]
    const [moved] = reordered.splice(fromIdx, 1)
    reordered.splice(toIdx, 0, moved)

    // Update sort_order for all affected tracks
    const updates = reordered.map((t, i) => ({ ...t, sort_order: i }))
    setTracks(prev => prev.map(t => {
      const updated = updates.find(u => u.id === t.id)
      return updated ? { ...t, sort_order: updated.sort_order } : t
    }))

    // Persist to database
    for (const t of updates) {
      await supabase.from('yearly_plan_tracks').update({ sort_order: t.sort_order }).eq('id', t.id)
    }

    dragTrack.current = null
    dragOverTrack.current = null
    setDragTrackId(null)
    showToast('Tracks reordered')
  }
  const handleDragEnd = () => {
    dragTrack.current = null
    dragOverTrack.current = null
    setDragTrackId(null)
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [pRes, tRes] = await Promise.all([
        supabase.from('yearly_plan_periods').select('*').order('sort_order'),
        supabase.from('yearly_plan_tracks').select('*').order('sort_order'),
      ])
      const uniquePeriods = (pRes.data || []).filter((p: any, i: number, arr: any[]) => arr.findIndex((q: any) => q.name === p.name) === i)
      setPeriods(uniquePeriods)
      setTracks(tRes.data || [])
      setLoading(false)
    })()
  }, [])

  const loadCells = useCallback(async (cls: EnglishClass, gr: Grade) => {
    const { data } = await supabase.from('yearly_plan_cells').select('*').eq('english_class', cls).eq('grade', gr)
    const m: Record<string, Cell> = {}
    if (data) data.forEach((c: any) => { m[`${c.track_id}::${c.period_id}`] = { id: c.id, content: c.content || '', standard_codes: c.standard_codes || [] } })
    return m
  }, [])

  useEffect(() => { loadCells(selectedClass, selectedGrade).then(setCells) }, [selectedClass, selectedGrade, loadCells])

  useEffect(() => {
    if (viewMode !== 'program') return
    ;(async () => {
      const { data } = await supabase.from('yearly_plan_cells').select('*')
      const m: Record<string, Record<string, Cell>> = {}
      if (data) data.forEach((c: any) => {
        const key = `${c.english_class}::${c.grade}`
        if (!m[key]) m[key] = {}
        m[key][`${c.track_id}::${c.period_id}`] = { id: c.id, content: c.content || '', standard_codes: c.standard_codes || [] }
      })
      setAllCells(m)
    })()
  }, [viewMode])

  const classTracks = useMemo(() => tracks.filter(t => t.english_class === selectedClass && (t.grade === selectedGrade || !t.grade)).sort((a, b) => a.sort_order - b.sort_order), [tracks, selectedClass, selectedGrade])

  const saveCellData = async (trackId: string, periodId: string, content: string) => {
    const key = `${trackId}::${periodId}`
    const existing = cells[key]
    const row = { english_class: selectedClass, grade: selectedGrade, track_id: trackId, period_id: periodId, content: content.trim(), updated_by: currentTeacher?.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('yearly_plan_cells').upsert(row, { onConflict: 'english_class,grade,track_id,period_id' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setCells(prev => ({ ...prev, [key]: { id: data.id, content: content.trim(), standard_codes: existing?.standard_codes || [] } }))
  }
  const saveCell = async (trackId: string, periodId: string, content: string) => {
    await saveCellData(trackId, periodId, content)
    setEditModal(null); setEditText('')
  }

  const addTrack = async () => {
    if (!newTrackName.trim()) return
    const maxOrder = classTracks.reduce((max, t) => Math.max(max, t.sort_order), 0)
    const { data, error } = await supabase.from('yearly_plan_tracks').insert({ english_class: selectedClass, grade: selectedGrade, name: newTrackName.trim(), sort_order: maxOrder + 1 }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setTracks(prev => [...prev, data]); setNewTrackName(''); setAddingTrack(false)
  }

  const copyCell = (trackId: string, periodId: string) => {
    const key = `${trackId}::${periodId}`
    const cell = cells[key]
    if (cell?.content) {
      setClipboard({ content: cell.content, fromKey: key })
      showToast('Copied')
    }
  }

  const pasteCell = async (trackId: string, periodId: string) => {
    if (!clipboard) return
    const key = `${trackId}::${periodId}`
    await saveCellData(trackId, periodId, clipboard.content)
    showToast('Pasted')
  }

  const moveCell = async (fromTrackId: string, fromPeriodId: string, toTrackId: string, toPeriodId: string) => {
    const fromKey = `${fromTrackId}::${fromPeriodId}`
    const cell = cells[fromKey]
    if (!cell?.content) return
    await saveCellData(toTrackId, toPeriodId, cell.content)
    await saveCellData(fromTrackId, fromPeriodId, '')
    showToast('Moved')
  }

  const deleteTrack = async (trackId: string) => {
    const track = tracks.find(t => t.id === trackId)
    if (!confirm(`Remove "${track?.name || 'this track'}" from ${selectedClass} Grade ${selectedGrade}?\n\nThis only affects ${selectedClass} Grade ${selectedGrade}.`)) return
    
    // Delete cells for THIS class+grade only
    await supabase.from('yearly_plan_cells').delete().eq('track_id', trackId).eq('english_class', selectedClass).eq('grade', selectedGrade)
    
    // Check if any OTHER class/grade still has cells or if the track is used elsewhere
    const { count } = await supabase.from('yearly_plan_cells')
      .select('*', { count: 'exact', head: true })
      .eq('track_id', trackId)
    
    if (!count || count === 0) {
      // No cells remain anywhere — safe to delete the track row
      await supabase.from('yearly_plan_tracks').delete().eq('id', trackId)
      setTracks(prev => prev.filter(t => t.id !== trackId))
    } else {
      // Other classes/grades still use this track — hide it locally but keep the row
      // Just update local state to remove it from view
      // (Track still exists for other class/grade combos)
      setTracks(prev => prev.filter(t => t.id !== trackId))
      showToast(`Track hidden from ${selectedClass} Gr${selectedGrade} (still used by other classes)`)
      return
    }
    showToast('Track removed')
  }

  const renameTrack = async (trackId: string) => {
    if (!renameText.trim()) return
    const { error } = await supabase.from('yearly_plan_tracks').update({ name: renameText.trim() }).eq('id', trackId)
    if (error) { showToast(`Error: ${error.message}`); return }
    setTracks(prev => prev.map(t => t.id === trackId ? { ...t, name: renameText.trim() } : t))
    setRenamingTrack(null); setRenameText('')
  }

  // Save current cell and navigate to adjacent track
  const navigateTrack = async (direction: 'up' | 'down') => {
    if (!editModal) return
    await saveCellData(editModal.trackId, editModal.periodId, editText)
    const newIdx = editModal.trackIdx + (direction === 'down' ? 1 : -1)
    if (newIdx < 0 || newIdx >= classTracks.length) return
    const nextTrack = classTracks[newIdx]
    const key = `${nextTrack.id}::${editModal.periodId}`
    const nextContent = cells[key]?.content || ''
    setEditModal({ trackId: nextTrack.id, periodId: editModal.periodId, trackIdx: newIdx, periodIdx: editModal.periodIdx })
    setEditText(nextContent)
    setBlocks(parseToBlocks(nextContent))
    yearlyLastSaved.current = nextContent
  }

  // Save current cell and navigate to adjacent period
  const navigatePeriod = async (direction: 'left' | 'right') => {
    if (!editModal) return
    await saveCellData(editModal.trackId, editModal.periodId, editText)
    const newIdx = editModal.periodIdx + (direction === 'right' ? 1 : -1)
    if (newIdx < 0 || newIdx >= periods.length) return
    const nextPeriod = periods[newIdx]
    const key = `${editModal.trackId}::${nextPeriod.id}`
    const nextContent = cells[key]?.content || ''
    setEditModal({ trackId: editModal.trackId, periodId: nextPeriod.id, trackIdx: editModal.trackIdx, periodIdx: newIdx })
    setEditText(nextContent)
    setBlocks(parseToBlocks(nextContent))
    yearlyLastSaved.current = nextContent
  }

  const openEditModal = (trackId: string, periodId: string) => {
    const trackIdx = classTracks.findIndex(t => t.id === trackId)
    const periodIdx = periods.findIndex(p => p.id === periodId)
    const key = `${trackId}::${periodId}`
    const content = cells[key]?.content || ''
    setEditModal({ trackId, periodId, trackIdx, periodIdx })
    setEditText(content)
    setBlocks(parseToBlocks(content))
    yearlyLastSaved.current = content
  }

  // Debounced autosave for yearly plan modal
  const yearlyAutosaveTimer = useRef<NodeJS.Timeout | null>(null)
  const yearlyLastSaved = useRef<string>('')
  useEffect(() => {
    if (!editModal) return
    if (editText === yearlyLastSaved.current) return
    if (yearlyAutosaveTimer.current) clearTimeout(yearlyAutosaveTimer.current)
    yearlyAutosaveTimer.current = setTimeout(async () => {
      await saveCellData(editModal.trackId, editModal.periodId, editText)
      yearlyLastSaved.current = editText
    }, 2000)
    return () => { if (yearlyAutosaveTimer.current) clearTimeout(yearlyAutosaveTimer.current) }
  }, [editText, editModal])

  const progClasses = progClass === 'all' ? ENGLISH_CLASSES : [progClass]
  const progGrades = progGrade === 'all' ? GRADES : [progGrade]

  useEffect(() => {
    if (progGrade !== 'all' && !GRADES.includes(progGrade)) setProgGrade('all')
    if (progClass !== 'all' && !ENGLISH_CLASSES.includes(progClass)) setProgClass('all')
  }, [progGrade, progClass])

  if (loading) return <div className="py-12 text-center"><Loader2 size={20} className="animate-spin text-navy mx-auto" /></div>

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex gap-1 bg-surface-alt rounded-lg p-1">
          <button onClick={() => setViewMode('class')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'class' ? 'bg-navy text-white' : 'text-text-secondary'}`}>My Class</button>
          <button onClick={() => setViewMode('program')} className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${viewMode === 'program' ? 'bg-navy text-white' : 'text-text-secondary'}`}>Full Program</button>
        </div>
        {clipboard && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gold/10 border border-gold/30 rounded-lg">
            <ClipboardPaste size={13} className="text-gold" />
            <span className="text-[11px] font-medium text-navy">Copied -- click any cell to paste</span>
            <button onClick={() => setClipboard(null)} className="text-text-tertiary hover:text-red-500 p-0.5"><X size={12} /></button>
          </div>
        )}
        {viewMode === 'class' && (
          <>
            <div className="flex gap-1">
              {(isAdmin ? ENGLISH_CLASSES : [teacherClass]).filter(Boolean).map(c => (
                <button key={c} onClick={() => setSelectedClass(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${selectedClass === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                  style={selectedClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
              ))}
            </div>
            <div className="flex gap-1">
              {GRADES.map(g => <button key={g} onClick={() => setSelectedGrade(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${selectedGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}
            </div>
          </>
        )}
        {viewMode === 'program' && (
          <>
            <div className="flex gap-1">
              <button onClick={() => setProgClass('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${progClass === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All Classes</button>
              {ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(c => (
                <button key={c} onClick={() => setProgClass(c)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${progClass === c ? 'text-white' : 'text-text-secondary hover:bg-surface-alt'}`}
                  style={progClass === c ? { backgroundColor: classToColor(c), color: classToTextColor(c) } : {}}>{c}</button>
              ))}
            </div>
            <div className="flex gap-1">
              <button onClick={() => setProgGrade('all')} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${progGrade === 'all' ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>All Grades</button>
              {GRADES.map(g => <button key={g} onClick={() => setProgGrade(g)} className={`px-3 py-1.5 rounded-lg text-[11px] font-medium ${progGrade === g ? 'bg-navy text-white' : 'bg-surface-alt text-text-secondary'}`}>Gr {g}</button>)}
            </div>
          </>
        )}
      </div>

      {/* CLASS VIEW */}
      {viewMode === 'class' && (
        <div className="bg-surface border border-border rounded-xl overflow-auto">
          <table className="w-full table-fixed min-w-[900px]">
            <colgroup>
              <col style={{ width: '170px' }} />
              {periods.map(p => <col key={p.id} />)}
            </colgroup>
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold bg-surface-alt border-b border-border">Track</th>
                {periods.map(p => <th key={p.id} className="text-center px-3 py-3 text-[12px] font-bold border-b border-border" style={{ backgroundColor: p.color, color: '#1B2A4A' }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {classTracks.map(track => (
                <tr key={track.id}
                  className={`border-t border-border group ${dragTrackId === track.id ? 'opacity-40' : ''}`}
                  draggable={canEdit}
                  onDragStart={() => handleDragStart(track.id)}
                  onDragOver={e => handleDragOver(e, track.id)}
                  onDrop={handleDrop}
                  onDragEnd={handleDragEnd}
                >
                  <td className="px-2 py-3 text-[11px] font-semibold text-navy align-top bg-surface-alt/30">
                    <div className="flex items-start gap-1">
                      {canEdit && (
                        <span className="cursor-grab active:cursor-grabbing text-text-tertiary/40 hover:text-text-secondary mt-0.5 shrink-0" title="Drag to reorder">
                          <GripVertical size={14} />
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                    {renamingTrack === track.id ? (
                      <div className="flex items-center gap-1">
                        <input value={renameText} onChange={e => setRenameText(e.target.value)} className="px-2 py-1 border border-navy rounded text-[11px] outline-none w-28" autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') renameTrack(track.id); if (e.key === 'Escape') setRenamingTrack(null) }} />
                        <button onClick={() => renameTrack(track.id)} className="p-0.5 text-green-600"><Check size={12} /></button>
                        <button onClick={() => setRenamingTrack(null)} className="p-0.5 text-text-tertiary"><X size={12} /></button>
                      </div>
                    ) : (
                      <div>
                        <span className="break-words leading-snug">{track.name}</span>
                        {canEdit && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 mt-1">
                            <button onClick={() => { setRenamingTrack(track.id); setRenameText(track.name) }} className="p-0.5 rounded text-text-tertiary hover:text-navy" title="Rename"><Pencil size={11} /></button>
                            <button onClick={() => deleteTrack(track.id)} className="p-0.5 rounded text-text-tertiary hover:text-red-500" title="Remove track"><Trash2 size={11} /></button>
                          </span>
                        )}
                      </div>
                    )}
                      </div>
                    </div>
                  </td>
                  {periods.map(period => {
                    const key = `${track.id}::${period.id}`; const cell = cells[key]
                    const isCopied = clipboard?.fromKey === key
                    const headings = cell?.content ? extractHeadings(cell.content) : []
                    const detail = cell?.content ? hasDetail(cell.content) : false
                    return (
                      <td key={period.id} className="px-2 py-1.5 border-l border-border align-top group/cell relative"
                        onMouseEnter={e => {
                          if (!cell?.content || editModal) return
                          cancelPopoverClose()
                          const td = e.currentTarget
                          popoverOpenTimer.current = setTimeout(() => {
                            setPopover({ key, rect: td.getBoundingClientRect() })
                          }, 400)
                        }}
                        onMouseLeave={() => {
                          if (popoverOpenTimer.current) clearTimeout(popoverOpenTimer.current)
                          schedulePopoverClose()
                        }}
                      >
                          <div onClick={() => { if (canEdit) { clearPopoverTimers(); setPopover(null); openEditModal(track.id, period.id) } }}
                            className={`min-h-[48px] rounded-lg px-2 py-1.5 transition-all ${canEdit ? 'cursor-pointer hover:bg-surface-alt/50 hover:ring-1 hover:ring-navy/20' : ''} ${cell?.content ? '' : 'text-text-tertiary italic text-[11px]'} ${isCopied ? 'ring-2 ring-gold/40' : ''}`}>
                            {cell?.content ? (
                              <>
                                {headings.length > 0 && (
                                  <div className="space-y-0.5">
                                    {headings.map((h, i) => (
                                      <p key={i} className={`leading-snug truncate ${h.isTitle ? 'text-[12px] font-extrabold text-navy' : 'text-[11px] font-semibold text-navy/80'}`}>{h.text}</p>
                                    ))}
                                  </div>
                                )}
                                {(() => {
                                  const kw = extractKeywords(cell.content)
                                  if (kw.length === 0) return headings.length === 0 ? <p className="text-[10px] text-text-secondary leading-snug line-clamp-3">{cell.content.replace(/\*\*/g, '').replace(/^- /gm, '• ').slice(0, 80)}</p> : null
                                  return (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {kw.map((k, i) => (
                                        <span key={i} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-medium bg-white/50 text-text-secondary border border-border/30 leading-tight">{k}</span>
                                      ))}
                                    </div>
                                  )
                                })()}
                              </>
                            ) : (
                              canEdit ? (clipboard ? 'Click to paste' : '') : ''
                            )}
                          </div>
                          {canEdit && (
                            <div className="absolute top-0.5 right-0.5 opacity-0 group-hover/cell:opacity-100 transition-opacity flex gap-0.5">
                              {cell?.content && (
                                <button onClick={e => { e.stopPropagation(); copyCell(track.id, period.id) }}
                                  className={`p-1 rounded ${isCopied ? 'bg-gold/20 text-gold' : 'bg-white/80 text-text-tertiary hover:text-navy'} shadow-sm`} title="Copy">
                                  <Copy size={11} />
                                </button>
                              )}
                              {clipboard && !isCopied && (
                                <button onClick={async e => { e.stopPropagation(); await pasteCell(track.id, period.id); setCells(await loadCells(selectedClass, selectedGrade)) }}
                                  className="p-1 rounded bg-white/80 text-text-tertiary hover:text-navy shadow-sm" title="Paste">
                                  <ClipboardPaste size={11} />
                                </button>
                              )}
                            </div>
                          )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {canEdit && (
            <div className="px-4 py-3 border-t border-border">
              {addingTrack ? (
                <div className="flex items-center gap-2">
                  <input value={newTrackName} onChange={e => setNewTrackName(e.target.value)} placeholder="Track name..." className="px-3 py-1.5 border border-border rounded-lg text-[12px] outline-none focus:border-navy w-48" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') addTrack(); if (e.key === 'Escape') setAddingTrack(false) }} />
                  <button onClick={addTrack} className="px-3 py-1.5 rounded-lg bg-navy text-white text-[11px] font-medium">Add</button>
                  <button onClick={() => setAddingTrack(false)} className="px-3 py-1.5 rounded-lg bg-surface-alt text-text-secondary text-[11px]">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setAddingTrack(true)} className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-navy"><Plus size={14} /> Add Track</button>
              )}
            </div>
          )}
        </div>
      )}

      {/* PROGRAM VIEW — Swimlane: subjects as rows, classes as columns, periods as sub-rows */}
      {viewMode === 'program' && (() => {
        // Gather all unique track names across selected classes
        const activeClasses = progClass === 'all' ? ENGLISH_CLASSES.filter(c => c !== 'Unplaced') : [progClass]
        const activeGrades = progGrade === 'all' ? GRADES : [progGrade]
        
        // Group tracks by name across classes
        const trackNameSet = new Set<string>()
        activeClasses.forEach(cls => {
          tracks.filter(t => t.english_class === cls).forEach(t => trackNameSet.add(t.name))
        })
        const trackNames = Array.from(trackNameSet)

        // For each track name, check if ANY class has content for it
        const visibleTrackNames = trackNames.filter(name => {
          return activeClasses.some(cls => {
            const clsTracks = tracks.filter(t => t.english_class === cls && t.name === name)
            return activeGrades.some(g => {
              const cellData = allCells[`${cls}::${g}`]
              return clsTracks.some(t => periods.some(p => !isEmptyContent(cellData?.[`${t.id}::${p.id}`]?.content)))
            })
          })
        })

        const toggleCollapse = (name: string) => setCollapsedTracks(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })

        const openCompare = (trackName: string, periodId: string, periodName: string, grade: Grade, cls: EnglishClass) => {
          setCompareClasses(new Set([cls]))
          setCompareModal({ trackName, periodId, periodName, grade })
        }

        const toggleCompareClass = (cls: EnglishClass) => {
          setCompareClasses(prev => { const n = new Set(prev); n.has(cls) ? n.delete(cls) : n.add(cls); return n })
        }

        const gridCols = `80px repeat(${activeClasses.length}, 1fr)`

        return (
          <div className="space-y-3">
            {/* Sticky class headers */}
            <div className="sticky top-0 z-10 bg-bg pt-1 pb-2">
              <div className="grid gap-1.5" style={{ gridTemplateColumns: gridCols }}>
                <div />
                {activeClasses.map(cls => (
                  <div key={cls} className="text-center py-2 rounded-lg text-[11px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</div>
                ))}
              </div>
            </div>

            {/* Subject swimlanes */}
            {visibleTrackNames.map(trackName => {
              const isCollapsed = collapsedTracks.has(trackName)
              return (
                <div key={trackName} className="bg-surface border border-border rounded-xl overflow-hidden">
                  {/* Subject header — collapsible */}
                  <button onClick={() => toggleCollapse(trackName)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-navy text-white hover:bg-navy-dark transition-colors">
                    <h3 className="font-display text-[13px] font-bold">{trackName}</h3>
                    <ChevronDown size={14} className={`opacity-60 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                  </button>

                  {!isCollapsed && (
                    <div>
                      {/* Period sub-rows */}
                      {periods.map((period, pi) => (
                        <div key={period.id} className={`grid ${pi > 0 ? 'border-t border-border/50' : ''}`} style={{ gridTemplateColumns: gridCols }}>
                          {/* Period label */}
                          <div className="flex items-start justify-center px-2 py-2.5 text-[9px] font-bold text-text-tertiary uppercase tracking-wider bg-surface-alt/50 border-r border-border/30">
                            {period.name}
                          </div>
                          {/* Class cells */}
                          {activeClasses.map(cls => {
                            // Find the track for THIS class with this name
                            const clsTrack = tracks.find(t => t.english_class === cls && t.name === trackName)
                            // Get best grade match
                            let cellContent = ''
                            let cellGrade: Grade = activeGrades[0]
                            if (clsTrack) {
                              for (const g of activeGrades) {
                                const cd = allCells[`${cls}::${g}`]
                                const c = cd?.[`${clsTrack.id}::${period.id}`]?.content
                                if (!isEmptyContent(c)) { cellContent = c!; cellGrade = g; break }
                              }
                            }

                            const headings = cellContent ? extractHeadings(cellContent) : []
                            const hasMore = cellContent ? hasDetail(cellContent) : false
                            const classColors: Record<string, string> = {
                              Lily: '#FEF3F3', Camellia: '#FFF8F0', Daisy: '#FFFDE8',
                              Sunflower: '#F0FAF0', Marigold: '#F0F5FA', Snapdragon: '#F5F0FA',
                            }
                            
                            return (
                              <div key={cls}
                                className={`px-2.5 py-2 border-r border-border/20 last:border-r-0 min-h-[52px] cursor-pointer transition-all hover:brightness-[0.97] group/cell relative`}
                                style={{ backgroundColor: cellContent ? (classColors[cls] || '#FAFAFA') : 'transparent' }}
                                onClick={() => { if (cellContent && clsTrack) openCompare(trackName, period.id, period.name, cellGrade, cls) }}>
                                {cellContent ? (
                                  <>
                                    {headings.length > 0 && (
                                      <div className="mb-1">
                                        {headings.slice(0, 2).map((h, i) => (
                                          <p key={i} className={`leading-snug ${h.isTitle ? 'text-[11px] font-extrabold text-navy' : 'text-[10px] font-semibold text-navy/80'}`}>{h.text}</p>
                                        ))}
                                      </div>
                                    )}
                                    {(() => {
                                      const kw = extractKeywords(cellContent)
                                      if (kw.length === 0) return headings.length === 0 ? <p className="text-[10px] text-text-secondary leading-snug line-clamp-2">{cellContent.replace(/\*\*/g, '').replace(/^- /gm, '• ').slice(0, 60)}</p> : null
                                      return (
                                        <div className="flex flex-wrap gap-1">
                                          {kw.map((k, i) => (
                                            <span key={i} className="inline-block px-1.5 py-0.5 rounded text-[8px] font-medium bg-white/60 text-text-secondary border border-border/30 leading-tight">{k}</span>
                                          ))}
                                        </div>
                                      )
                                    })()}
                                    <span className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity text-[8px] text-text-tertiary bg-white/80 px-1 rounded border border-border/50">⤢</span>
                                  </>
                                ) : (
                                  <span className="text-[10px] text-text-tertiary/30">—</span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      })()}

      {/* ─── Compare Modal ─── */}
      {compareModal && (() => {
        const activeClasses = progClass === 'all' ? ENGLISH_CLASSES.filter(c => c !== 'Unplaced') : [progClass]
        const selectedArr = activeClasses.filter(c => compareClasses.has(c))
        const cols = Math.max(selectedArr.length, 1)

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => setCompareModal(null)}>
            <div className="bg-surface rounded-2xl shadow-xl w-full max-w-[900px] max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-[16px] font-semibold text-navy">{compareModal.trackName}</h2>
                  <span className="text-[10px] font-bold text-text-secondary bg-surface-alt px-2.5 py-1 rounded-md">{compareModal.periodName}</span>
                  <span className="text-[10px] text-text-tertiary">Grade {compareModal.grade}</span>
                </div>
                <button onClick={() => setCompareModal(null)} className="p-2 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
              </div>

              {/* Class selector bar */}
              <div className="px-6 py-3 border-b border-border bg-surface-alt/30 flex items-center gap-2 flex-wrap">
                <span className="text-[9px] font-bold text-text-tertiary uppercase tracking-wider">Compare:</span>
                {activeClasses.map(cls => (
                  <button key={cls} onClick={() => toggleCompareClass(cls)}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${compareClasses.has(cls) ? 'ring-2 ring-navy shadow-sm' : 'opacity-60 hover:opacity-80'}`}
                    style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>
                    {cls}
                  </button>
                ))}
              </div>

              {/* Compare columns */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid divide-x divide-border" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
                  {selectedArr.map(cls => {
                    const clsTrack = tracks.find(t => t.english_class === cls && t.name === compareModal.trackName)
                    const cellData = allCells[`${cls}::${compareModal.grade}`]
                    const cell = clsTrack ? cellData?.[`${clsTrack.id}::${compareModal.periodId}`] : undefined
                    const content = cell?.content || ''

                    return (
                      <div key={cls} className="p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-border">
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</span>
                          <span className="text-[10px] text-text-tertiary font-medium">Gr {compareModal.grade}</span>
                        </div>
                        {content ? (
                          <div className="text-[12px] leading-relaxed text-text-primary break-words" dangerouslySetInnerHTML={{ __html: renderCellContent(content) }} />
                        ) : (
                          <p className="text-[12px] text-text-tertiary italic">No content</p>
                        )}
                      </div>
                    )
                  })}
                  {selectedArr.length === 0 && (
                    <div className="p-8 text-center text-[13px] text-text-tertiary col-span-full">Click a class above to compare</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })()}
      {/* HOVER POPOVER — full content preview */}
      {popover && !editModal && (() => {
        const [trackId, periodId] = popover.key.split('::')
        const cell = cells[popover.key]
        if (!cell?.content) return null
        const track = classTracks.find(t => t.id === trackId)
        const period = periods.find(p => p.id === periodId)
        // Position: below the cell, clamped to viewport
        const top = Math.min(popover.rect.bottom + 4, window.innerHeight - 300)
        const left = Math.max(8, Math.min(popover.rect.left, window.innerWidth - 340))
        return (
          <div className="fixed z-[90] w-[320px] max-h-[280px] overflow-y-auto bg-surface border border-border rounded-xl shadow-xl"
            style={{ top, left }}
            onMouseEnter={cancelPopoverClose}
            onMouseLeave={schedulePopoverClose}
          >
            <div className="px-3 py-2 border-b border-border/60 flex items-center gap-2">
              <span className="text-[10px] font-bold text-navy">{track?.name}</span>
              <span className="text-[9px] text-text-tertiary">·</span>
              <span className="text-[10px] font-semibold" style={{ color: period?.color ? '#1B2A4A' : undefined }}>{period?.name}</span>
            </div>
            <div className="px-3 py-2.5 text-[11px] leading-relaxed text-text-primary break-words"
              dangerouslySetInnerHTML={{ __html: renderCellContent(cell.content) }} />
          </div>
        )
      })()}

      {/* EDIT MODAL */}
      {editModal && (() => {
        const track = classTracks.find(t => t.id === editModal.trackId)
        const period = periods.find(p => p.id === editModal.periodId)
        const canGoUp = editModal.trackIdx > 0
        const canGoDown = editModal.trackIdx < classTracks.length - 1
        const canGoLeft = editModal.periodIdx > 0
        const canGoRight = editModal.periodIdx < periods.length - 1
        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6" onClick={() => { saveCell(editModal.trackId, editModal.periodId, editText); setEditModal(null) }}>
            <div className="bg-surface rounded-xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-display text-[15px] font-semibold text-navy">{track?.name}</h3>
                  <p className="text-[11px] text-text-secondary">{period?.name} -- {selectedClass} Grade {selectedGrade}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => navigatePeriod('left')} disabled={!canGoLeft} className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-20" title="Previous period"><ChevronLeft size={16} /></button>
                  <button onClick={() => navigateTrack('up')} disabled={!canGoUp} className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-20" title="Previous track"><ChevronUp size={16} /></button>
                  <button onClick={() => navigateTrack('down')} disabled={!canGoDown} className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-20" title="Next track"><ChevronDown size={16} /></button>
                  <button onClick={() => navigatePeriod('right')} disabled={!canGoRight} className="p-1.5 rounded-lg hover:bg-surface-alt disabled:opacity-20" title="Next period"><ChevronRight size={16} /></button>
                  <div className="w-px h-5 bg-border mx-1" />
                  <button onClick={() => { saveCell(editModal.trackId, editModal.periodId, editText); setEditModal(null) }} className="p-1.5 rounded-lg hover:bg-surface-alt"><X size={16} /></button>
                </div>
              </div>
              <div className="p-5">
                {/* Block editor */}
                <div className="border border-border rounded-xl overflow-hidden focus-within:border-navy focus-within:ring-1 focus-within:ring-navy/20">
                  <div className="max-h-[400px] overflow-y-auto px-1 py-2 space-y-0">
                    {blocks.map((block, idx) => {
                      if (block.type === 'divider') {
                        return (
                          <div key={block.id} className="flex items-center gap-2 px-2 py-1.5 group">
                            <button onClick={() => {
                              const types: BlockType[] = ['title', 'heading', 'text', 'bullet', 'divider']
                              const next = types[(types.indexOf(block.type) + 1) % types.length]
                              const nb = [...blocks]; nb[idx] = { ...block, type: next }; updateBlocks(nb)
                            }} className="w-6 h-6 rounded flex items-center justify-center text-text-tertiary hover:bg-surface-alt hover:text-navy shrink-0" title="Change type">
                              <Minus size={13} />
                            </button>
                            <div className="flex-1 border-t-2 border-border/60 my-2" />
                            <button onClick={() => { const nb = blocks.filter((_, i) => i !== idx); updateBlocks(nb.length ? nb : [newBlock()]) }}
                              className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-0.5 text-red-400 hover:text-red-600 shrink-0"><X size={12} /></button>
                          </div>
                        )
                      }
                      const typeIcon = block.type === 'title' ? 'T' : block.type === 'heading' ? 'H' : block.type === 'bullet' ? '\u2022' : '\u00b6'
                      const typeTitle = block.type === 'title' ? 'Title' : block.type === 'heading' ? 'Heading (bold)' : block.type === 'bullet' ? 'Bullet point' : 'Plain text'
                      return (
                        <div key={block.id} className={`flex items-start gap-1.5 px-2 group ${focusedBlockIdx === idx ? 'bg-navy/[0.03] rounded-lg' : ''}`}>
                          <button onClick={() => {
                            const types: BlockType[] = ['title', 'heading', 'text', 'bullet', 'divider']
                            const next = types[(types.indexOf(block.type) + 1) % types.length]
                            const nb = [...blocks]; nb[idx] = { ...block, type: next, text: next === 'divider' ? '' : block.text }; updateBlocks(nb)
                          }} className="w-6 h-6 mt-[5px] rounded flex items-center justify-center text-[11px] text-text-tertiary hover:bg-surface-alt hover:text-navy shrink-0 font-bold" title={`${typeTitle} -- click to cycle type`}>
                            {typeIcon}
                          </button>
                          <input
                            value={block.text}
                            onChange={e => { const nb = [...blocks]; nb[idx] = { ...block, text: e.target.value }; updateBlocks(nb) }}
                            onFocus={() => setFocusedBlockIdx(idx)}
                            placeholder={block.type === 'title' ? 'Section title...' : block.type === 'heading' ? 'Heading...' : block.type === 'bullet' ? 'List item...' : 'Type here...'}
                            className={`flex-1 px-2 py-1.5 text-[13px] bg-transparent outline-none border-b border-transparent focus:border-navy/20 transition-colors ${
                              block.type === 'title' ? 'font-extrabold text-navy text-[14px]' : block.type === 'heading' ? 'font-bold text-navy' : block.type === 'bullet' ? 'text-text-primary' : 'text-text-primary'
                            }`}
                            data-block-idx={idx}
                            autoFocus={idx === 0 && blocks.length === 1}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                                e.preventDefault()
                                const nb = [...blocks]
                                const inheritType = block.type === 'bullet' ? 'bullet' : 'text'
                                nb.splice(idx + 1, 0, newBlock(inheritType))
                                updateBlocks(nb)
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]')
                                  const target = inputs[idx + 1]
                                  if (target) { target.focus(); target.setSelectionRange(0, 0) }
                                }, 20)
                              }
                              if (e.key === 'Backspace' && !block.text && blocks.length > 1) {
                                e.preventDefault()
                                const nb = blocks.filter((_, i) => i !== idx)
                                updateBlocks(nb)
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]')
                                  const target = Math.max(0, idx - 1)
                                  const el = inputs[target]
                                  if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length) }
                                }, 20)
                              }
                              if (e.key === 'ArrowDown' && !e.metaKey && !e.ctrlKey) {
                                const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]')
                                if (idx < inputs.length - 1) { e.preventDefault(); inputs[idx + 1]?.focus() }
                              }
                              if (e.key === 'ArrowUp' && !e.metaKey && !e.ctrlKey) {
                                const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]')
                                if (idx > 0) { e.preventDefault(); inputs[idx - 1]?.focus() }
                              }
                              if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowDown') { e.preventDefault(); navigateTrack('down') }
                              if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowUp') { e.preventDefault(); navigateTrack('up') }
                              if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowLeft') { e.preventDefault(); navigatePeriod('left') }
                              if ((e.metaKey || e.ctrlKey) && e.key === 'ArrowRight') { e.preventDefault(); navigatePeriod('right') }
                              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); saveCell(editModal.trackId, editModal.periodId, editText); setEditModal(null) }
                              if (e.key === 'Escape') { saveCell(editModal.trackId, editModal.periodId, editText); setEditModal(null) }
                            }}
                          />
                          <button onClick={() => { const nb = blocks.filter((_, i) => i !== idx); updateBlocks(nb.length ? nb : [newBlock()]) }}
                            className="opacity-0 group-hover:opacity-40 hover:!opacity-100 p-1 mt-1 text-red-400 hover:text-red-600 shrink-0"><X size={12} /></button>
                        </div>
                      )
                    })}
                  </div>
                  {/* Block toolbar */}
                  <div className="px-3 py-2 border-t border-border/40 flex items-center gap-3">
                    {/* Change type of current block */}
                    {focusedBlockIdx != null && blocks[focusedBlockIdx] && (
                      <div className="flex items-center gap-1 pr-3 border-r border-border/40">
                        <span className="text-[9px] text-text-tertiary uppercase tracking-wider mr-1">Type:</span>
                        {([['title', 'T', 'Title'], ['heading', 'H', 'Heading'], ['text', '¶', 'Text'], ['bullet', '•', 'Bullet'], ['divider', '—', 'Divider']] as const).map(([type, icon, label]) => (
                          <button key={type} onClick={() => {
                            const nb = [...blocks]; nb[focusedBlockIdx] = { ...blocks[focusedBlockIdx], type: type as BlockType, text: type === 'divider' ? '' : blocks[focusedBlockIdx].text }; updateBlocks(nb)
                            // Re-focus the input
                            setTimeout(() => { const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]'); inputs[focusedBlockIdx]?.focus() }, 20)
                          }}
                            className={`w-6 h-6 rounded flex items-center justify-center text-[11px] font-bold transition-all ${blocks[focusedBlockIdx].type === type ? 'bg-navy text-white' : 'text-text-tertiary hover:bg-surface-alt hover:text-navy'}`}
                            title={label}>{icon}</button>
                        ))}
                      </div>
                    )}
                    {/* Insert new block after cursor */}
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-text-tertiary uppercase tracking-wider mr-1">Insert:</span>
                      {([['title', '+ Title'], ['heading', '+ Heading'], ['text', '+ Text'], ['bullet', '+ Bullet'], ['divider', '+ Divider']] as const).map(([type, label]) => (
                        <button key={type} onClick={() => {
                          const insertIdx = focusedBlockIdx != null ? focusedBlockIdx + 1 : blocks.length
                          const nb = [...blocks]
                          nb.splice(insertIdx, 0, newBlock(type as BlockType))
                          updateBlocks(nb)
                          setFocusedBlockIdx(insertIdx)
                          if (type !== 'divider') {
                            setTimeout(() => { const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]'); inputs[insertIdx]?.focus() }, 20)
                          }
                        }}
                          className="px-2 py-1 rounded-md text-[10px] font-medium text-text-tertiary hover:bg-surface-alt hover:text-navy">{label}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-[10px] text-text-tertiary">Enter = new line -- Backspace on empty = delete -- Arrow keys to move -- Cmd+Arrow to navigate cells</p>
                  <button onClick={() => { saveCell(editModal.trackId, editModal.periodId, editText); setEditModal(null) }}
                    className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark">Done</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
