'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { CRITERIA, criterionFor, type Band, type RubricCriterion } from '@/components/curriculum/rubric-library'
import { X, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react'

// ─── Rubric builder ──────────────────────────────────────────────
// Add criteria from the library (descriptors prefilled for the grade band),
// reorder, rename, edit any level, and save for your class or the school.

export interface RubricDraft { id?: string; name: string; task: string | null; band: Band; criteria: RubricCriterion[]; english_class: string | null }

export default function RubricBuilder({ draft, grade, englishClass, onClose, onSaved }: { draft: RubricDraft; grade: number; englishClass: string; onClose: () => void; onSaved: (r: { id: string }) => void }) {
  const { currentTeacher, language: lang, showToast } = useApp()
  const [name, setName] = useState(draft.name)
  const [band, setBand] = useState<Band>(draft.band)
  const [criteria, setCriteria] = useState<RubricCriterion[]>(draft.criteria)
  const [shareSchool, setShareSchool] = useState(draft.english_class === null && !!draft.id)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)

  const available = useMemo(() => CRITERIA.filter(c => !criteria.some(x => x.key === c.key)), [criteria])
  const groups = useMemo(() => Array.from(new Set(available.map(c => c.group))), [available])

  const add = (key: string) => { const c = criterionFor(key, band, grade); if (c) setCriteria(prev => [...prev, c]); setAdding(false) }
  const addBlank = () => { setCriteria(prev => [...prev, { key: `custom_${Date.now()}`, label: lang === 'ko' ? '새 기준' : 'New criterion', levels: ['', '', '', ''] }]); setAdding(false) }
  const move = (i: number, d: -1 | 1) => setCriteria(prev => { const n = [...prev]; const j = i + d; if (j < 0 || j >= n.length) return prev; [n[i], n[j]] = [n[j], n[i]]; return n })
  const patch = (i: number, p: Partial<RubricCriterion>) => setCriteria(prev => prev.map((c, k) => k === i ? { ...c, ...p } : c))
  const setLevel = (i: number, li: number, text: string) => setCriteria(prev => prev.map((c, k) => { if (k !== i) return c; const levels = [...c.levels] as RubricCriterion['levels']; levels[li] = text; return { ...c, levels } }))
  const switchBand = (b: Band) => {
    setBand(b)
    // Re-pull library wording for the new band; custom criteria keep their text.
    setCriteria(prev => prev.map(c => criterionFor(c.key, b, grade) || c))
  }

  const save = async () => {
    if (!name.trim()) { showToast(lang === 'ko' ? '루브릭 이름을 입력하세요' : 'Give the rubric a name'); return }
    if (criteria.length === 0) { showToast(lang === 'ko' ? '기준을 하나 이상 추가하세요' : 'Add at least one criterion'); return }
    setSaving(true)
    const row = { name: name.trim(), task: draft.task, band, criteria, english_class: shareSchool ? null : englishClass, updated_at: new Date().toISOString() }
    const res = draft.id
      ? await supabase.from('rubrics').update(row).eq('id', draft.id).select('id').single()
      : await supabase.from('rubrics').insert({ ...row, created_by: currentTeacher?.id || null }).select('id').single()
    setSaving(false)
    if (res.error) { showToast(`Error: ${res.error.message}${res.error.message.includes('rubrics') ? ' · run supabase/migration-rubrics.sql' : ''}`); return }
    showToast(lang === 'ko' ? '루브릭 저장됨' : `Saved "${name.trim()}"`)
    onSaved(res.data as { id: string })
  }

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] grid grid-rows-[auto_minmax(0,1fr)_auto]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-center gap-4">
          <input id="rb-name" value={name} onChange={e => setName(e.target.value)} placeholder={lang === 'ko' ? '루브릭 이름' : 'Rubric name'} className="flex-1 h-9 px-3 bg-paper-2 border border-rule-2 rounded font-display text-[18px] text-ink placeholder:text-ink-3 placeholder:font-sans placeholder:text-[14px]" />
          <div className="flex items-center gap-1.5"><span className="eyebrow mr-1">{lang === 'ko' ? '문구' : 'Wording'}</span><button onClick={() => switchBand('k2')} className={chip(band === 'k2')}>K–2</button><button onClick={() => switchBand('g35')} className={chip(band === 'g35')}>3–5</button></div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto p-5 space-y-3">
          {criteria.length === 0 && <p className="text-[13px] text-ink-3">{lang === 'ko' ? '아래에서 기준을 추가하세요.' : 'Add criteria from the library below, or write your own.'}</p>}
          {criteria.map((c, i) => (
            <div key={c.key} className="border border-rule-2 rounded p-3 grid gap-2">
              <div className="flex items-center gap-2">
                <input value={c.label} onChange={e => patch(i, { label: e.target.value })} className="flex-1 h-8 px-2.5 bg-surface border border-rule-2 rounded text-[14px] font-semibold text-ink" />
                <input value={c.standard || ''} onChange={e => patch(i, { standard: e.target.value || undefined })} placeholder="W.3.1" className="w-24 h-8 px-2 bg-surface border border-rule-2 rounded text-[12px] text-info placeholder:text-ink-3" />
                <button onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded hover:bg-paper-2 text-ink-3 disabled:opacity-30 flex items-center justify-center"><ChevronUp size={14} /></button>
                <button onClick={() => move(i, 1)} disabled={i === criteria.length - 1} className="w-7 h-7 rounded hover:bg-paper-2 text-ink-3 disabled:opacity-30 flex items-center justify-center"><ChevronDown size={14} /></button>
                <button onClick={() => setCriteria(prev => prev.filter((_, k) => k !== i))} className="w-7 h-7 rounded hover:bg-bad-soft text-ink-3 hover:text-bad flex items-center justify-center"><Trash2 size={14} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {c.levels.map((l, li) => (
                  <label key={li} className="grid gap-1">
                    <span className="eyebrow">{li + 1} · {['Needs guidance', 'Developing', 'Meets', 'Exceeds'][li]}</span>
                    <textarea value={l} onChange={e => setLevel(i, li, e.target.value)} rows={3} className="px-2 py-1.5 bg-surface border border-rule-2 rounded text-[12px] leading-snug text-ink resize-y" />
                  </label>
                ))}
              </div>
            </div>
          ))}
          {adding ? (
            <div className="border border-rule-2 rounded p-3 bg-paper-2 space-y-3">
              {groups.map(g => (
                <div key={g}><p className="eyebrow mb-1">{g}</p><div className="flex flex-wrap gap-1.5">{available.filter(c => c.group === g).map(c => <button key={c.key} onClick={() => add(c.key)} className={chip(false)}>{c.label}</button>)}</div></div>
              ))}
              <div className="flex gap-2 pt-1"><button onClick={addBlank} className={chip(false)}>{lang === 'ko' ? '+ 직접 작성' : '+ Write my own'}</button><button onClick={() => setAdding(false)} className="text-[12px] text-ink-3 hover:text-ink px-2">{lang === 'ko' ? '닫기' : 'Close'}</button></div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="w-full py-2.5 rounded border border-dashed border-rule-2 text-[13px] text-ink-2 hover:text-ink hover:border-ink-3 inline-flex items-center justify-center gap-2"><Plus size={14} />{lang === 'ko' ? '기준 추가' : 'Add a criterion'}</button>
          )}
        </div>
        <div className="px-5 py-3 border-t border-rule-2 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={shareSchool} onChange={e => setShareSchool(e.target.checked)} />{lang === 'ko' ? '학교 전체와 공유' : 'Share with the whole school'}{!shareSchool && <span className="text-ink-3">· {englishClass} {lang === 'ko' ? '전용' : 'only'}</span>}</label>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-ink-3">{criteria.length} {lang === 'ko' ? '기준' : 'criteria'} · {criteria.length * 4} {lang === 'ko' ? '점' : 'points'}</span>
            <button onClick={onClose} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{lang === 'ko' ? '취소' : 'Cancel'}</button>
            <button onClick={save} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60">{lang === 'ko' ? '저장' : 'Save rubric'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
