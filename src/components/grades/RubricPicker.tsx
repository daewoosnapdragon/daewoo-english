'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { TEMPLATES, buildFromTemplate, bandForGrade, type RubricCriterion, type Band } from '@/components/curriculum/rubric-library'
import RubricBuilder, { type RubricDraft } from './RubricBuilder'
import { X, Pencil, Plus } from 'lucide-react'

// ─── Rubric picker ───────────────────────────────────────────────
// Templates by task on the left, the school's and your class's saved rubrics
// beneath them, a preview on the right. Use as is, or customise in the
// builder. Returns the criteria to snapshot onto the assessment.

export interface SavedRubric { id: string; name: string; task: string | null; band: Band; criteria: RubricCriterion[]; english_class: string | null; created_by: string | null }

interface Props { grade: number; englishClass: string; onClose: () => void; onUse: (r: { rubric_id: string | null; name: string; band: Band; criteria: RubricCriterion[] }) => void }

export default function RubricPicker({ grade, englishClass, onClose, onUse }: Props) {
  const { currentTeacher, language: lang, showToast, confirmDialog } = useApp()
  const [saved, setSaved] = useState<SavedRubric[]>([])
  const [tableMissing, setTableMissing] = useState(false)
  const [sel, setSel] = useState<{ kind: 'template'; key: string } | { kind: 'saved'; id: string } | null>(null)
  const [building, setBuilding] = useState<RubricDraft | null>(null)
  const band = bandForGrade(grade)

  const load = async () => {
    const { data, error } = await supabase.from('rubrics').select('*').order('updated_at', { ascending: false })
    if (error) { setTableMissing(true); return }
    setTableMissing(false)
    setSaved(((data || []) as SavedRubric[]).filter(r => !r.english_class || r.english_class === englishClass))
  }
  useEffect(() => { load() }, [englishClass])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !building) onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose, building])

  const preview = useMemo(() => {
    if (!sel) return null
    if (sel.kind === 'template') { const b = buildFromTemplate(sel.key, grade); return b ? { name: b.name, band: b.band, criteria: b.criteria, rubric_id: null as string | null, task: b.task } : null }
    const r = saved.find(x => x.id === sel.id); return r ? { name: r.name, band: r.band, criteria: r.criteria, rubric_id: r.id, task: r.task } : null
  }, [sel, saved, grade])

  const templates = TEMPLATES.filter(t => t.bands.includes(band))
  const mine = saved.filter(r => r.english_class === englishClass)
  const school = saved.filter(r => !r.english_class)

  const remove = async (r: SavedRubric) => {
    if (!await confirmDialog({ title: lang === 'ko' ? `"${r.name}" 루브릭을 삭제할까요?` : `Delete the rubric "${r.name}"?`, message: lang === 'ko' ? '이미 채점된 평가에는 영향이 없습니다.' : 'Assessments already scored with it keep their copy.', danger: true, confirmLabel: lang === 'ko' ? '삭제' : 'Delete' })) return
    await supabase.from('rubrics').delete().eq('id', r.id)
    if (sel?.kind === 'saved' && sel.id === r.id) setSel(null)
    load()
  }

  const row = (on: boolean) => `w-full text-left px-3 py-2 rounded flex items-center justify-between gap-2 ${on ? 'bg-ink text-paper' : 'hover:bg-paper-2 text-ink'}`

  if (building) {
    return <RubricBuilder draft={building} grade={grade} englishClass={englishClass}
      onClose={() => setBuilding(null)}
      onSaved={r => { setBuilding(null); load(); setSel({ kind: 'saved', id: r.id }) }} />
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] grid grid-rows-[auto_minmax(0,1fr)_auto]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-center justify-between">
          <div><h3 className="font-display text-[22px] leading-none text-ink">{lang === 'ko' ? '루브릭 선택' : 'Choose a rubric'}</h3><p className="text-[12px] text-ink-3 mt-1">{lang === 'ko' ? `${grade}학년 · 1–4 척도, 0 = 해당 없음` : `Grade ${grade} · levels 1–4, 0 for N/A`}</p></div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>
        <div className="grid grid-cols-[280px_minmax(0,1fr)] min-h-0">
          <div className="border-r border-rule-2 overflow-y-auto p-3 space-y-4 text-[13px]">
            <div>
              <p className="eyebrow px-3 mb-1">{lang === 'ko' ? '템플릿' : 'Templates'}</p>
              {templates.map(t => <button key={t.key} onClick={() => setSel({ kind: 'template', key: t.key })} className={row(sel?.kind === 'template' && sel.key === t.key)}><span><span className="block font-medium">{t.name}</span><span className={`block text-[11px] ${sel?.kind === 'template' && sel.key === t.key ? 'text-paper/70' : 'text-ink-3'}`}>{t.description}</span></span></button>)}
            </div>
            {tableMissing ? (
              <p className="px-3 text-[12px] text-warn">{lang === 'ko' ? '저장된 루브릭 표가 없습니다. supabase/migration-rubrics.sql을 실행하세요.' : 'Saved rubrics need supabase/migration-rubrics.sql run once.'}</p>
            ) : (
              <>
                {mine.length > 0 && <div><p className="eyebrow px-3 mb-1">{englishClass}</p>{mine.map(r => <button key={r.id} onClick={() => setSel({ kind: 'saved', id: r.id })} className={row(sel?.kind === 'saved' && sel.id === r.id)}><span className="font-medium truncate">{r.name}</span><span className="text-[11px] opacity-70">{r.criteria.length}</span></button>)}</div>}
                {school.length > 0 && <div><p className="eyebrow px-3 mb-1">{lang === 'ko' ? '학교 공용' : 'Whole school'}</p>{school.map(r => <button key={r.id} onClick={() => setSel({ kind: 'saved', id: r.id })} className={row(sel?.kind === 'saved' && sel.id === r.id)}><span className="font-medium truncate">{r.name}</span><span className="text-[11px] opacity-70">{r.criteria.length}</span></button>)}</div>}
              </>
            )}
            <button onClick={() => setBuilding({ name: '', task: null, band, criteria: [], english_class: englishClass })} className="w-full px-3 py-2 rounded border border-dashed border-rule-2 text-ink-2 hover:text-ink hover:border-ink-3 text-left inline-flex items-center gap-2"><Plus size={13} />{lang === 'ko' ? '빈 루브릭 만들기' : 'New blank rubric'}</button>
          </div>
          <div className="overflow-y-auto p-5">
            {!preview ? (
              <p className="text-[13px] text-ink-3">{lang === 'ko' ? '왼쪽에서 템플릿이나 저장된 루브릭을 선택하세요.' : 'Pick a template or a saved rubric to preview it.'}</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <h4 className="font-display text-[22px] leading-none text-ink">{preview.name}</h4>
                  <span className="eyebrow">{preview.criteria.length} {lang === 'ko' ? '기준' : 'criteria'} · {preview.criteria.length * 4} {lang === 'ko' ? '점' : 'points'}</span>
                </div>
                <div className="divide-y divide-rule">
                  {preview.criteria.map(c => (
                    <div key={c.key} className="py-2.5">
                      <div className="flex items-baseline justify-between gap-2"><span className="text-[14px] font-semibold text-ink">{c.label}</span>{c.standard && <span className="text-[11px] text-info">{c.standard}</span>}</div>
                      <div className="grid grid-cols-4 gap-2 mt-1.5">
                        {c.levels.map((l, i) => <div key={i} className="text-[11.5px] text-ink-2 leading-snug"><span className="text-ink-3 font-semibold mr-1">{i + 1}</span>{l}</div>)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {preview && <button onClick={() => setBuilding({ id: preview.rubric_id || undefined, name: preview.name, task: preview.task, band: preview.band, criteria: preview.criteria, english_class: sel?.kind === 'saved' ? (saved.find(x => x.id === sel.id)?.english_class ?? englishClass) : englishClass })} className="h-9 px-3.5 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><Pencil size={13} />{sel?.kind === 'saved' ? (lang === 'ko' ? '편집' : 'Edit') : (lang === 'ko' ? '수정해서 저장' : 'Customize and save')}</button>}
            {sel?.kind === 'saved' && <button onClick={() => { const r = saved.find(x => x.id === sel.id); if (r) remove(r) }} className="h-9 px-3 rounded text-[13px] text-ink-3 hover:text-bad">{lang === 'ko' ? '삭제' : 'Delete'}</button>}
          </div>
          <button disabled={!preview || preview.criteria.length === 0} onClick={() => preview && onUse({ rubric_id: preview.rubric_id, name: preview.name, band: preview.band, criteria: preview.criteria })} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50">{lang === 'ko' ? '이 루브릭으로 채점' : 'Use this rubric'}</button>
        </div>
      </div>
    </div>
  )
}
