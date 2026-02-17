'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, EnglishClass, Grade } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { Plus, X, Loader2, Trash2, Pencil, Check } from 'lucide-react'

interface Period { id: string; name: string; sort_order: number; color: string }
interface Track { id: string; english_class: string; name: string; sort_order: number }
interface Cell { id?: string; content: string; standard_codes: string[] }

export default function YearlyPlanView() {
  const { currentTeacher, showToast } = useApp()
  const isAdmin = currentTeacher?.role === 'admin'
  const teacherClass = currentTeacher?.english_class as EnglishClass
  const [viewMode, setViewMode] = useState<'class' | 'program'>(isAdmin ? 'program' : 'class')
  const [selectedClass, setSelectedClass] = useState<EnglishClass>(teacherClass || 'Snapdragon')
  const [selectedGrade, setSelectedGrade] = useState<Grade>(3)
  // Program view filters
  const [progGrade, setProgGrade] = useState<Grade | 'all'>('all')
  const [progClass, setProgClass] = useState<EnglishClass | 'all'>('all')

  const [periods, setPeriods] = useState<Period[]>([])
  const [tracks, setTracks] = useState<Track[]>([])
  const [cells, setCells] = useState<Record<string, Cell>>({})
  const [allCells, setAllCells] = useState<Record<string, Record<string, Cell>>>({})
  const [loading, setLoading] = useState(true)
  const [editCell, setEditCell] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
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
      // Deduplicate periods by name (fix double Spring A/Spring B columns)
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

  const saveCell = async (trackId: string, periodId: string, content: string) => {
    const key = `${trackId}::${periodId}`
    const existing = cells[key]
    const row = { english_class: selectedClass, grade: selectedGrade, track_id: trackId, period_id: periodId, content: content.trim(), updated_by: currentTeacher?.id, updated_at: new Date().toISOString() }
    const { data, error } = await supabase.from('yearly_plan_cells').upsert(row, { onConflict: 'english_class,grade,track_id,period_id' }).select().single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setCells(prev => ({ ...prev, [key]: { id: data.id, content: content.trim(), standard_codes: existing?.standard_codes || [] } }))
    setEditCell(null); setEditText('')
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

  // Program view: which classes/grades to show
  const progClasses = progClass === 'all' ? ENGLISH_CLASSES : [progClass]
  const progGrades = progGrade === 'all' ? GRADES : [progGrade]

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
          <table className="w-full min-w-[800px]">
            <thead>
              <tr>
                <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-text-secondary font-semibold w-44 bg-surface-alt border-b border-border">Track</th>
                {periods.map(p => <th key={p.id} className="text-center px-4 py-3 text-[12px] font-bold border-b border-border" style={{ backgroundColor: p.color, color: '#1B2A4A' }}>{p.name}</th>)}
              </tr>
            </thead>
            <tbody>
              {classTracks.map(track => (
                <tr key={track.id} className="border-t border-border group hover:bg-surface-alt/30">
                  <td className="px-4 py-3 text-[12px] font-semibold text-navy whitespace-nowrap">
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
                    const key = `${track.id}::${period.id}`; const cell = cells[key]; const isEditing = editCell === key
                    return (
                      <td key={period.id} className="px-3 py-2 border-l border-border align-top min-w-[180px]">
                        {isEditing ? (
                          <div>
                            <textarea value={editText} onChange={e => setEditText(e.target.value)} autoFocus rows={3} className="w-full px-2 py-1.5 text-[11px] border border-navy rounded-lg outline-none resize-none" />
                            <p className="text-[8px] text-text-tertiary mt-0.5">**bold**, *italic*, - bullet</p>
                            <div className="flex gap-1 mt-1">
                              <button onClick={() => saveCell(track.id, period.id, editText)} className="px-2 py-0.5 rounded bg-navy text-white text-[10px] font-medium">Save</button>
                              <button onClick={() => { setEditCell(null); setEditText('') }} className="px-2 py-0.5 rounded bg-surface-alt text-text-secondary text-[10px]">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div onClick={() => { if (canEdit) { setEditCell(key); setEditText(cell?.content || '') } }}
                            className={`min-h-[40px] rounded-lg px-2 py-1.5 text-[11px] leading-snug transition-all ${canEdit ? 'cursor-pointer hover:bg-surface-alt' : ''} ${cell?.content ? 'text-text-primary' : 'text-text-tertiary italic'}`}
                            dangerouslySetInnerHTML={cell?.content ? { __html: cell.content
                              .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                              .replace(/\*(.+?)\*/g, '<em>$1</em>')
                              .replace(/^- (.+)$/gm, '<span style="display:block;padding-left:8px">• $1</span>')
                              .replace(/\n/g, '<br>')
                            } : undefined}>
                            {!cell?.content ? (canEdit ? 'Click to edit' : '') : undefined}
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

      {/* PROGRAM VIEW */}
      {viewMode === 'program' && (
        <div className="space-y-6">
          {progClasses.map(cls => {
            const clsTracks = tracks.filter(t => t.english_class === cls)
            if (clsTracks.length === 0) return null
            return (
              <div key={cls}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex px-3 py-1 rounded-lg text-[12px] font-bold" style={{ backgroundColor: classToColor(cls), color: classToTextColor(cls) }}>{cls}</span>
                </div>
                <div className="bg-surface border border-border rounded-xl overflow-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr>
                        <th className="text-left px-3 py-2 text-[9px] uppercase tracking-wider text-text-secondary font-semibold w-32 bg-surface-alt border-b border-border">Track</th>
                        {periods.map(p => <th key={p.id} className="text-center px-3 py-2 text-[11px] font-bold border-b border-border" style={{ backgroundColor: p.color, color: '#1B2A4A' }}>{p.name}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {clsTracks.map(track => (
                        <tr key={track.id} className="border-t border-border">
                          <td className="px-3 py-2 text-[10px] font-semibold text-navy whitespace-nowrap">{track.name}</td>
                          {periods.map(period => {
                            const contents: string[] = []
                            progGrades.forEach(g => {
                              const cellData = allCells[`${cls}::${g}`]
                              const cell = cellData?.[`${track.id}::${period.id}`]
                              if (cell?.content) contents.push(`${progGrade === 'all' ? `G${g}: ` : ''}${cell.content}`)
                            })
                            return (
                              <td key={period.id} className="px-2 py-1.5 border-l border-border align-top text-[10px] leading-snug text-text-primary min-w-[160px]">
                                {contents.length > 0 ? contents.map((c, i) => <div key={i} className={i > 0 ? 'mt-1 pt-1 border-t border-border/50' : ''}>{c}</div>) : <span className="text-text-tertiary italic">--</span>}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
