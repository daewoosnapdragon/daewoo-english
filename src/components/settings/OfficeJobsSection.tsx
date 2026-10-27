'use client'

import { logActivity } from '@/lib/activity'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { useTeachers } from '@/hooks/useData'
import { useOfficeJobs } from '@/components/dashboard/useOfficeJobs'
import { DEFAULT_OFFICE_JOBS_CONFIG, OFFICE_JOBS_KEY, fridayOf, type OfficeJobsConfig } from '@/lib/officeJobs'
import { ChevronDown, ChevronUp, Plus, X } from 'lucide-react'

// ─── Office jobs (Settings) ──────────────────────────────────────
// The Friday cleaning rotation: the people in order, the jobs with their
// descriptions, the first cleaning day, the weeks that are skipped, and the
// days everyone cleans together. The preview shows the next six cleaning
// days exactly as the dashboard will, days off from the calendar included.

const fmtDay = (iso: string, lang: string) => new Date(iso + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export default function OfficeJobsSection() {
  const { language, showToast, currentTeacher } = useApp()
  const ko = language === 'ko'
  const canEdit = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const { teachers } = useTeachers()
  const [draft, setDraft] = useState<OfficeJobsConfig | null>(null)
  const { saved, loading, days, today } = useOfficeJobs(draft)
  useEffect(() => { if (!loading && draft === null) setDraft(saved || DEFAULT_OFFICE_JOBS_CONFIG) }, [loading, saved, draft])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addId, setAddId] = useState('')
  const [skipDate, setSkipDate] = useState('')
  const [allDate, setAllDate] = useState('')

  const upd = (patch: Partial<OfficeJobsConfig>) => { if (!canEdit) return; setDraft(d => d ? { ...d, ...patch } : d); setDirty(true) }
  const nameOf = (id: string) => teachers.find(t => t.id === id)?.name || (ko ? '(교사 없음)' : '(not a teacher any more)')
  const swap = <T,>(arr: T[], i: number, j: number) => { if (j < 0 || j >= arr.length) return arr; const n = [...arr]; ;[n[i], n[j]] = [n[j], n[i]]; return n }
  const save = async () => {
    if (!draft) return
    setSaving(true)
    const clean = { ...draft, jobs: draft.jobs.filter(j => j.name.trim()).map(j => ({ ...j, name: j.name.trim(), description: j.description.trim() })) }
    const { error } = await supabase.from('app_settings').upsert({ key: OFFICE_JOBS_KEY, value: JSON.stringify(clean), updated_at: new Date().toISOString() }, { onConflict: 'key' })
    setSaving(false)
    if (error) showToast(`Error: ${error.message}`); else { showToast(ko ? '사무실 청소 순번 저장됨' : 'Office jobs saved'); setDirty(false); logActivity('settings', 'Office jobs') }
  }

  const field = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink disabled:text-ink-3'
  const iconBtn = 'w-6 h-6 rounded hover:bg-paper-2 text-ink-3 hover:text-ink flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent'
  const preview = days.filter(d => d.date >= today).slice(0, 6)
  const available = teachers.filter(t => !draft?.people.includes(t.id))

  return (
    <div id="set-office" className="mb-10 scroll-mt-[140px]">
      <div className="flex items-baseline justify-between border-b border-rule-2 pb-2 mb-3 gap-3">
        <div>
          <h3 className="font-display text-[22px] leading-none text-ink">{ko ? '사무실 청소' : 'Office jobs'}</h3>
          <p className="text-[12.5px] text-ink-3 mt-1">{ko ? '금요일 청소 순번. 청소일마다 각자 한 칸씩 다음 일로 옮겨갑니다. 금요일이 달력에서 쉬는 날이면 하루 앞당깁니다.' : 'The Friday cleaning rotation. On every cleaning day each person moves one job along. When the calendar has the school off on a Friday, the jobs move to the day before.'}</p>
        </div>
        {dirty && canEdit && <button onClick={save} disabled={saving} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 whitespace-nowrap">{ko ? '저장' : 'Save'}</button>}
      </div>
      {!draft ? null : (
        <div className="grid gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* People */}
            <div>
              <p className="eyebrow mb-1.5">{ko ? '순번 (순서대로)' : 'People, in rotation order'}</p>
              {draft.people.length === 0 && <p className="text-[12px] text-ink-3 mb-1.5">{ko ? '첫 청소일의 첫 번째 일을 맡는 사람부터 추가하세요.' : 'Add them starting with whoever has the first job on the first cleaning day.'}</p>}
              <ol className="divide-y divide-rule border-t border-b border-rule">
                {draft.people.map((id, i) => (
                  <li key={id} className="flex items-center gap-2 py-1 text-[12.5px]">
                    <span className="w-5 text-ink-3 tabular-nums">{i + 1}</span>
                    <span className="flex-1 text-ink">{nameOf(id)}</span>
                    <button onClick={() => upd({ people: swap(draft.people, i, i - 1) })} disabled={!canEdit || i === 0} className={iconBtn}><ChevronUp size={13} /></button>
                    <button onClick={() => upd({ people: swap(draft.people, i, i + 1) })} disabled={!canEdit || i === draft.people.length - 1} className={iconBtn}><ChevronDown size={13} /></button>
                    <button onClick={() => upd({ people: draft.people.filter(p => p !== id) })} disabled={!canEdit} className={`${iconBtn} hover:text-bad`}><X size={13} /></button>
                  </li>
                ))}
              </ol>
              {canEdit && available.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <select value={addId} onChange={e => setAddId(e.target.value)} className={field}>
                    <option value="">{ko ? '교사 추가…' : 'Add a teacher…'}</option>
                    {available.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <button onClick={() => { if (addId) { upd({ people: [...draft.people, addId] }); setAddId('') } }} disabled={!addId} className="h-8 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1"><Plus size={12} />{ko ? '추가' : 'Add'}</button>
                </div>
              )}
            </div>
            {/* Dates */}
            <div className="grid gap-4 content-start">
              <div>
                <label htmlFor="oj-start" className="eyebrow block mb-1.5">{ko ? '첫 청소일' : 'First cleaning day'}</label>
                <input id="oj-start" type="date" value={draft.start} disabled={!canEdit} onChange={e => upd({ start: e.target.value })} className={field} />
                <p className="text-[11px] text-ink-3 mt-1">{ko ? '그날 첫 번째 사람이 첫 번째 일을 맡습니다.' : 'On that day the first person has the first job, the second the second, and so on.'}</p>
              </div>
              <DateList label={ko ? '건너뛰는 주' : 'Weeks with no cleaning'} help={ko ? '그 주의 아무 날이나 넣으세요. 순번은 멈춰 기다립니다.' : 'Any day of the week will do; the rotation waits.'} dates={draft.skip} value={skipDate} setValue={setSkipDate} canEdit={canEdit} lang={language}
                onAdd={d => upd({ skip: Array.from(new Set([...draft.skip, fridayOf(d)])).sort() })} onRemove={d => upd({ skip: draft.skip.filter(x => x !== d) })} />
              <DateList label={ko ? '모두 함께 청소하는 날' : 'Days everyone cleans together'} help={ko ? '학기 마지막 청소처럼 전원이 함께하는 날. 순번은 넘어가지 않습니다.' : 'The end-of-semester clean, for example. The rotation does not move on.'} dates={draft.all} value={allDate} setValue={setAllDate} canEdit={canEdit} lang={language}
                onAdd={d => upd({ all: Array.from(new Set([...draft.all, fridayOf(d)])).sort() })} onRemove={d => upd({ all: draft.all.filter(x => x !== d) })} />
            </div>
          </div>

          {/* Jobs */}
          <div>
            <p className="eyebrow mb-1.5">{ko ? '일 (순서대로)' : 'Jobs, in rotation order'}</p>
            <div className="grid gap-2">
              {draft.jobs.map((j, i) => (
                <div key={j.key} className="grid grid-cols-[20px_200px_minmax(0,1fr)_auto] gap-2 items-start">
                  <span className="text-ink-3 tabular-nums text-[12.5px] pt-1.5">{i + 1}</span>
                  <input value={j.name} disabled={!canEdit} onChange={e => upd({ jobs: draft.jobs.map(x => x.key === j.key ? { ...x, name: e.target.value } : x) })} placeholder={ko ? '일 이름' : 'Job name'} className={field} />
                  <textarea value={j.description} disabled={!canEdit} rows={2} onChange={e => upd({ jobs: draft.jobs.map(x => x.key === j.key ? { ...x, description: e.target.value } : x) })} placeholder={ko ? '무엇을 하는지 (선택)' : 'What the job is (optional)'} className="px-2 py-1.5 bg-surface border border-rule-2 rounded text-[12px] text-ink leading-snug resize-y disabled:text-ink-3" />
                  <span className="flex items-center gap-0.5 pt-1">
                    <button onClick={() => upd({ jobs: swap(draft.jobs, i, i - 1) })} disabled={!canEdit || i === 0} className={iconBtn}><ChevronUp size={13} /></button>
                    <button onClick={() => upd({ jobs: swap(draft.jobs, i, i + 1) })} disabled={!canEdit || i === draft.jobs.length - 1} className={iconBtn}><ChevronDown size={13} /></button>
                    <button onClick={() => upd({ jobs: draft.jobs.filter(x => x.key !== j.key) })} disabled={!canEdit} className={`${iconBtn} hover:text-bad`}><X size={13} /></button>
                  </span>
                </div>
              ))}
            </div>
            {canEdit && <button onClick={() => upd({ jobs: [...draft.jobs, { key: `job${Date.now()}`, name: '', description: '' }] })} className="mt-2 h-8 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink inline-flex items-center gap-1"><Plus size={12} />{ko ? '일 추가' : 'Add a job'}</button>}
          </div>

          {/* Preview */}
          <div>
            <p className="eyebrow mb-1.5">{ko ? '미리보기 · 다음 청소일 6회' : 'Preview · the next six cleaning days'}</p>
            {preview.length === 0 ? (
              <p className="text-[12px] text-ink-3">{draft.people.length === 0 ? (ko ? '순번에 교사를 추가하면 여기에 표시됩니다.' : 'Add people to the rotation and the days show here.') : (ko ? '예정된 청소일이 없습니다.' : 'No cleaning days ahead.')}</p>
            ) : (
              <div className="border-t border-rule-2 divide-y divide-rule">
                {preview.map(d => (
                  <div key={d.date} className="grid grid-cols-[150px_minmax(0,1fr)] gap-3 py-1.5 text-[12.5px]">
                    <span className="text-ink tabular-nums">{fmtDay(d.date, language)}{d.moved && <span className="block text-[10.5px] text-warn">{ko ? `금요일 쉼: ${d.reason || ''}` : `Fri off: ${d.reason || ''}`}</span>}</span>
                    <span className="text-ink-2 flex flex-wrap gap-x-3 gap-y-0.5">
                      {d.everyone ? <span>{ko ? '모두 함께' : 'Everyone together'}</span> : d.assignments.map(a => <span key={a.job.key}><span className="text-ink-3">{a.job.name}:</span> {nameOf(a.personId)}</span>)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[11px] text-ink-3 mt-1.5">{ko ? '달력의 전교 휴일을 반영합니다. 종이 당번표와 다르면 건너뛰는 주를 조정하세요.' : 'Whole-school days off on the calendar are taken into account. If a date differs from the paper board, adjust the skipped weeks.'}</p>
          </div>
          {!canEdit && <p className="text-[11.5px] text-ink-3">{ko ? '관리자만 변경할 수 있습니다.' : 'Only an admin can change the rotation.'}</p>}
        </div>
      )}
    </div>
  )
}

function DateList({ label, help, dates, value, setValue, onAdd, onRemove, canEdit, lang }: { label: string; help: string; dates: string[]; value: string; setValue: (v: string) => void; onAdd: (d: string) => void; onRemove: (d: string) => void; canEdit: boolean; lang: string }) {
  return (
    <div>
      <p className="eyebrow mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {dates.length === 0 && <span className="text-[12px] text-ink-3">—</span>}
        {dates.map(d => (
          <span key={d} className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1 rounded-full border border-rule-2 bg-surface text-[12px] text-ink tabular-nums">{fmtDay(d, lang)}{canEdit && <button onClick={() => onRemove(d)} className="w-5 h-5 rounded-full hover:bg-paper-2 text-ink-3 hover:text-bad flex items-center justify-center"><X size={11} /></button>}</span>
        ))}
      </div>
      {canEdit && (
        <div className="flex items-center gap-2">
          <input type="date" value={value} onChange={e => setValue(e.target.value)} className="h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink" />
          <button onClick={() => { if (value) { onAdd(value); setValue('') } }} disabled={!value} className="h-8 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1"><Plus size={12} />{lang === 'ko' ? '추가' : 'Add'}</button>
        </div>
      )}
      <p className="text-[11px] text-ink-3 mt-1">{help}</p>
    </div>
  )
}
