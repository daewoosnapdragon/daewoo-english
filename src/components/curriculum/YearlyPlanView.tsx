'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, Trash2, Pencil, Check, Minus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

interface Period { id: string; name: string; sort_order: number; color: string }
interface Track { id: string; english_class: string; name: string; sort_order: number }
interface Cell { id?: string; content: string; standard_codes: string[] }

// Render cell content with markdown-like formatting
function renderCellContent(content: string): string {
  if (!content) return ''
  return content
    .replace(/---/g, '<hr style="border:0;border-top:1px solid #e2e8f0;margin:4px 0">')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:12px;position:relative;margin:1px 0"><span style="position:absolute;left:2px">&#8226;</span>$1</div>')
    .replace(/\n/g, '<br>')
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
  const [editModal, setEditModal] = useState<{ trackId: string; periodId: string; trackIdx: number; periodIdx: number } | null>(null)
  const [editText, setEditText] = useState('')
  // Block editor state
  type BlockType = 'text' | 'heading' | 'bullet' | 'divider'
  interface Block { id: string; type: BlockType; text: string }
  const [blocks, setBlocks] = useState<Block[]>([])
  const blockIdCounter = useRef(0)
  const newBlock = (type: BlockType = 'text', text = ''): Block => ({ id: `b${++blockIdCounter.current}`, type, text })

  // Parse markdown string into blocks
  const parseToBlocks = (md: string): Block[] => {
    if (!md.trim()) return [newBlock()]
    return md.split('\n').map(line => {
      const trimmed = line.trim()
      if (trimmed === '---' || trimmed === '***' || trimmed === '___') return newBlock('divider')
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return newBlock('bullet', trimmed.slice(2))
      if (trimmed.startsWith('**') && trimmed.endsWith('**')) return newBlock('heading', trimmed.slice(2, -2))
      if (trimmed.startsWith('**')) return newBlock('heading', trimmed.replace(/\*\*/g, ''))
      return newBlock('text', line)
    }).filter((b, i, arr) => !(b.type === 'text' && !b.text && i === arr.length - 1 && arr.length > 1))
  }

  // Serialize blocks back to markdown
  const blocksToMarkdown = (bs: Block[]): string => {
    return bs.map(b => {
      if (b.type === 'divider') return '---'
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
  const [renamingTrack, setRenamingTrack] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')

  const canEdit = isAdmin || currentTeacher?.english_class === selectedClass

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

  const classTracks = useMemo(() => tracks.filter(t => t.english_class === selectedClass), [tracks, selectedClass])

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
    const { data, error } = await supabase.from('yearly_plan_tracks').insert({ english_class: selectedClass, name: newTrackName.trim(), sort_order: maxOrder + 1 }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setTracks(prev => [...prev, data]); setNewTrackName(''); setAddingTrack(false)
  }

  const deleteTrack = async (trackId: string) => {
    if (!confirm('Delete this track and all its content?')) return
    await supabase.from('yearly_plan_cells').delete().eq('track_id', trackId)
    await supabase.from('yearly_plan_tracks').delete().eq('id', trackId)
    setTracks(prev => prev.filter(t => t.id !== trackId)); showToast('Track deleted')
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
              {ENGLISH_CLASSES.map(c => (
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
              <col style={{ width: '140px' }} />
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
                <tr key={track.id} className="border-t border-border group">
                  <td className="px-4 py-3 text-[12px] font-semibold text-navy whitespace-nowrap align-top bg-surface-alt/30">
                    {renamingTrack === track.id ? (
                      <div className="flex items-center gap-1">
                        <input value={renameText} onChange={e => setRenameText(e.target.value)} className="px-2 py-1 border border-navy rounded text-[11px] outline-none w-28" autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') renameTrack(track.id); if (e.key === 'Escape') setRenamingTrack(null) }} />
                        <button onClick={() => renameTrack(track.id)} className="p-0.5 text-green-600"><Check size={12} /></button>
                        <button onClick={() => setRenamingTrack(null)} className="p-0.5 text-text-tertiary"><X size={12} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span>{track.name}</span>
                        {canEdit && (
                          <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            <button onClick={() => { setRenamingTrack(track.id); setRenameText(track.name) }} className="p-0.5 rounded text-text-tertiary hover:text-navy"><Pencil size={11} /></button>
                            <button onClick={() => deleteTrack(track.id)} className="p-0.5 rounded text-text-tertiary hover:text-red-500"><Trash2 size={11} /></button>
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  {periods.map(period => {
                    const key = `${track.id}::${period.id}`; const cell = cells[key]
                    return (
                      <td key={period.id} className="px-3 py-2 border-l border-border align-top">
                          <div onClick={() => { if (canEdit) openEditModal(track.id, period.id) }}
                            className={`min-h-[72px] rounded-lg px-2 py-1.5 text-[11px] leading-relaxed transition-all ${canEdit ? 'cursor-pointer hover:bg-surface-alt/50 hover:ring-1 hover:ring-navy/20' : ''} ${cell?.content ? 'text-text-primary' : 'text-text-tertiary italic'}`}
                            dangerouslySetInnerHTML={cell?.content ? { __html: renderCellContent(cell.content) } : undefined}>
                            {!cell?.content ? (canEdit ? 'Click to edit' : '') : undefined}
                          </div>
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

      {/* PROGRAM VIEW -- one row per grade per track for equal spacing */}
      {viewMode === 'program' && (
        <div className="space-y-8">
          {progClasses.map(cls => {
            const clsTracks = tracks.filter(t => t.english_class === cls)
            if (clsTracks.length === 0) return null
            return (
              <div key={cls}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex px-3 py-1 rounded-lg text-[12px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</span>
                  {progGrade === 'all' && <span className="text-[10px] text-text-tertiary">Grades {progGrades.join(', ')}</span>}
                </div>
                <div className="bg-surface border border-border rounded-xl overflow-auto">
                  <table className="w-full table-fixed min-w-[900px]">
                    <colgroup>
                      <col style={{ width: '120px' }} />
                      {progGrade === 'all' && <col style={{ width: '40px' }} />}
                      {periods.map(p => <col key={p.id} />)}
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold bg-surface-alt border-b border-border">Track</th>
                        {progGrade === 'all' && <th className="text-center px-1 py-2.5 text-[9px] uppercase tracking-wider text-text-secondary font-semibold bg-surface-alt border-b border-border">Gr</th>}
                        {periods.map(p => <th key={p.id} className="text-center px-3 py-2.5 text-[11px] font-bold border-b border-border" style={{ backgroundColor: p.color, color: '#1B2A4A' }}>{p.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {clsTracks.map(track => {
                        return progGrades.map((g, gi) => {
                          const cellData = allCells[`${cls}::${g}`]
                          const hasAnyContent = periods.some(p => cellData?.[`${track.id}::${p.id}`]?.content)
                          return (
                            <tr key={`${track.id}-${g}`} className={`${gi === 0 ? 'border-t-2 border-border' : 'border-t border-border/30'}`}>
                              {gi === 0 && (
                                <td rowSpan={progGrades.length} className="px-3 py-2.5 text-[11px] font-semibold text-navy whitespace-nowrap align-middle bg-surface-alt/20 border-r border-border">
                                  {track.name}
                                </td>
                              )}
                              {progGrade === 'all' && (
                                <td className="px-1 py-2 text-center text-[10px] font-bold text-navy border-r border-border/30">
                                  G{g}
                                </td>
                              )}
                              {periods.map(period => {
                                const periodCell = cellData?.[`${track.id}::${period.id}`]
                                return (
                                  <td key={period.id} className="px-2.5 py-2 border-l border-border/30 align-top" style={{ height: '44px' }}>
                                    {periodCell?.content ? (
                                      <div className="text-[10px] leading-relaxed text-text-primary overflow-hidden"
                                        dangerouslySetInnerHTML={{ __html: renderCellContent(periodCell.content) }} />
                                    ) : (
                                      <span className="text-text-tertiary/40 text-[10px]">--</span>
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
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
                  <div className="max-h-[400px] overflow-y-auto px-1 py-2 space-y-0.5">
                    {blocks.map((block, idx) => {
                      if (block.type === 'divider') {
                        return (
                          <div key={block.id} className="flex items-center gap-2 px-2 py-1.5 group">
                            <button onClick={() => {
                              const types: BlockType[] = ['text', 'heading', 'bullet', 'divider']
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
                      const typeIcon = block.type === 'heading' ? 'H' : block.type === 'bullet' ? '\u2022' : '\u00b6'
                      const typeTitle = block.type === 'heading' ? 'Heading (bold)' : block.type === 'bullet' ? 'Bullet point' : 'Plain text'
                      return (
                        <div key={block.id} className="flex items-start gap-1.5 px-2 group">
                          <button onClick={() => {
                            const types: BlockType[] = ['text', 'heading', 'bullet', 'divider']
                            const next = types[(types.indexOf(block.type) + 1) % types.length]
                            const nb = [...blocks]; nb[idx] = { ...block, type: next, text: next === 'divider' ? '' : block.text }; updateBlocks(nb)
                          }} className="w-6 h-6 mt-[5px] rounded flex items-center justify-center text-[11px] text-text-tertiary hover:bg-surface-alt hover:text-navy shrink-0 font-bold" title={`${typeTitle} -- click to cycle type`}>
                            {typeIcon}
                          </button>
                          <input
                            value={block.text}
                            onChange={e => { const nb = [...blocks]; nb[idx] = { ...block, text: e.target.value }; updateBlocks(nb) }}
                            placeholder={block.type === 'heading' ? 'Heading...' : block.type === 'bullet' ? 'List item...' : 'Type here...'}
                            className={`flex-1 px-2 py-1.5 text-[13px] bg-transparent outline-none border-b border-transparent focus:border-navy/20 transition-colors ${
                              block.type === 'heading' ? 'font-bold text-navy' : block.type === 'bullet' ? 'text-text-primary' : 'text-text-primary'
                            }`}
                            data-block-idx={idx}
                            autoFocus={idx === 0 && blocks.length === 1}
                            onKeyDown={e => {
                              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                                e.preventDefault()
                                // Insert new block after this one, inherit bullet type
                                const nb = [...blocks]
                                const inheritType = block.type === 'bullet' ? 'bullet' : 'text'
                                nb.splice(idx + 1, 0, newBlock(inheritType))
                                updateBlocks(nb)
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]')
                                  inputs[idx + 1]?.focus()
                                }, 20)
                              }
                              if (e.key === 'Backspace' && !block.text && blocks.length > 1) {
                                e.preventDefault()
                                const nb = blocks.filter((_, i) => i !== idx)
                                updateBlocks(nb)
                                setTimeout(() => {
                                  const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]')
                                  const target = Math.max(0, idx - 1)
                                  inputs[target]?.focus()
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
                  {/* Add block bar */}
                  <div className="px-3 py-2 border-t border-border/40 flex gap-1">
                    <button onClick={() => { updateBlocks([...blocks, newBlock('text')]); setTimeout(() => { const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]'); inputs[inputs.length - 1]?.focus() }, 20) }}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium text-text-tertiary hover:bg-surface-alt hover:text-navy">+ Text</button>
                    <button onClick={() => { updateBlocks([...blocks, newBlock('heading')]); setTimeout(() => { const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]'); inputs[inputs.length - 1]?.focus() }, 20) }}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium text-text-tertiary hover:bg-surface-alt hover:text-navy">+ Heading</button>
                    <button onClick={() => { updateBlocks([...blocks, newBlock('bullet')]); setTimeout(() => { const inputs = document.querySelectorAll<HTMLInputElement>('[data-block-idx]'); inputs[inputs.length - 1]?.focus() }, 20) }}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium text-text-tertiary hover:bg-surface-alt hover:text-navy">+ Bullet</button>
                    <button onClick={() => { updateBlocks([...blocks, newBlock('divider')]) }}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium text-text-tertiary hover:bg-surface-alt hover:text-navy">+ Divider</button>
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
