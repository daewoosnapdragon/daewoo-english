'use client'

import { useCallback, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import type { Band } from '@/components/curriculum/rubric-library'
import type { ImportResult } from '@/lib/rubricImport'
import type { RubricDraft } from './RubricBuilder'
import { X, Upload, Loader2, AlertTriangle, Info, ArrowLeft, Pencil } from 'lucide-react'

// ─── Rubric import ───────────────────────────────────────────────
// Drop a PDF or a photo of a rubric. The server reads it into the app's
// four-level shape and sends back what it had to change. The review step
// shows the result with every issue next to the criterion it concerns, then
// hands the draft to the builder, where the teacher fixes and saves.

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp'

interface Props { grade: number; englishClass: string; band: Band; onClose: () => void; onDraft: (draft: RubricDraft, notes: string[]) => void }

export default function RubricImportDialog({ grade, englishClass, band, onClose, onDraft }: Props) {
  const { language: lang } = useApp()
  const ko = lang === 'ko'
  const [step, setStep] = useState<'pick' | 'reading' | 'review'>('pick')
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const read = useCallback(async (file: File) => {
    setError(null); setFileName(file.name); setStep('reading')
    const body = new FormData()
    body.append('file', file); body.append('grade', String(grade))
    try {
      const res = await fetch('/api/rubric-import', { method: 'POST', body })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Upload failed (${res.status})`)
      setResult(json as ImportResult); setStep('review')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setStep('pick')
    }
  }, [grade])

  const onFiles = (files: FileList | null) => { const f = files?.[0]; if (f) read(f) }

  const fixes = result?.issues.filter(i => i.level === 'fix') || []
  const checks = result?.issues.filter(i => i.level === 'check') || []
  const issuesFor = (i: number) => result?.issues.filter(x => x.criterion === i) || []
  const general = result?.issues.filter(x => x.criterion === null) || []

  const toBuilder = () => {
    if (!result) return
    const notes = result.issues.map(i => (i.criterion === null ? '' : `${result.criteria[i.criterion]?.label || `Criterion ${i.criterion + 1}`}: `) + i.message)
    onDraft({ name: result.name, task: null, band: result.band, criteria: result.criteria, english_class: englishClass }, [...notes, ...result.notes.map(n => (ko ? '문서 메모: ' : 'From the paper: ') + n)])
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-3xl max-h-[88vh] grid grid-rows-[auto_minmax(0,1fr)_auto]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-center justify-between">
          <div>
            <h3 className="font-display text-[22px] leading-none text-ink">{ko ? '내 루브릭 가져오기' : 'Import your own rubric'}</h3>
            <p className="text-[12px] text-ink-3 mt-1">{step === 'review' ? fileName : (ko ? 'PDF 또는 사진을 올리면 앱 형식(기준당 4단계)으로 변환합니다.' : 'Upload a PDF or a photo. It is read into the app’s four-level format, then you check it.')}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {step === 'pick' && (
            <div className="space-y-3">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
                onClick={() => inputRef.current?.click()}
                className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-rule-2 hover:border-ink-3'}`}>
                <Upload size={28} className="mx-auto text-ink-3 mb-3" />
                <p className="text-[14px] text-ink font-medium">{ko ? '여기에 파일을 놓거나 클릭해서 선택' : 'Drop the rubric here, or click to choose a file'}</p>
                <p className="text-[12px] text-ink-3 mt-1">{ko ? 'PDF, PNG, JPEG, WebP · 15 MB까지' : 'PDF, PNG, JPEG or WebP · up to 15 MB'}</p>
                <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = '' }} />
              </div>
              {error && <div className="flex gap-2 rounded border border-bad/40 bg-bad-soft px-3 py-2 text-[13px] text-ink"><AlertTriangle size={15} className="shrink-0 text-bad mt-0.5" /><span>{error}</span></div>}
              <div className="text-[12px] text-ink-3 space-y-1">
                <p>{ko ? '가장 잘 읽히는 파일: 기준이 행, 단계가 열인 표. 사진은 정면에서 밝게 찍어 주세요.' : 'Reads best: a table with one row per criterion and one column per level. Photos should be straight on and well lit.'}</p>
                <p>{ko ? '앱은 기준당 1–4 단계를 사용합니다. 3단계나 5단계 루브릭은 맞춰 넣고, 바뀐 부분을 알려 드립니다.' : 'The app uses levels 1–4 per criterion. A 3- or 5-level rubric is fitted to that, and you are told exactly what changed.'}</p>
              </div>
            </div>
          )}

          {step === 'reading' && (
            <div className="py-16 text-center">
              <Loader2 size={28} className="mx-auto animate-spin text-ink-3 mb-3" />
              <p className="text-[14px] text-ink">{ko ? `${fileName} 읽는 중…` : `Reading ${fileName}…`}</p>
              <p className="text-[12px] text-ink-3 mt-1">{ko ? '보통 30초 안팎 걸립니다.' : 'This usually takes under a minute.'}</p>
            </div>
          )}

          {step === 'review' && result && (
            <div className="space-y-4">
              <div className={`rounded border px-3 py-2.5 text-[13px] ${fixes.length ? 'border-warn/50 bg-warn-soft' : 'border-good/40 bg-good-soft'}`}>
                <p className="font-semibold text-ink">
                  {fixes.length
                    ? (ko ? `${result.criteria.length}개 기준을 읽었습니다 · 저장 전에 ${fixes.length}곳을 고쳐야 합니다` : `${result.criteria.length} criteria read · ${fixes.length} thing${fixes.length === 1 ? '' : 's'} to fix before it can be saved`)
                    : (ko ? `${result.criteria.length}개 기준을 읽었습니다 · 형식에 맞습니다` : `${result.criteria.length} criteria read · fits the app’s format`)}
                  {checks.length > 0 && <span className="font-normal text-ink-2"> · {ko ? `확인할 곳 ${checks.length}` : `${checks.length} to check`}</span>}
                </p>
                {general.map((i, k) => <p key={k} className="mt-1 text-ink-2 flex gap-1.5"><AlertTriangle size={13} className={`shrink-0 mt-0.5 ${i.level === 'fix' ? 'text-warn' : 'text-ink-3'}`} />{i.message}</p>)}
              </div>

              <div className="flex items-baseline justify-between gap-3">
                <h4 className="font-display text-[22px] leading-none text-ink">{result.name || <span className="text-ink-3 font-sans text-[14px]">{ko ? '(제목 없음)' : '(no title found)'}</span>}</h4>
                <span className="eyebrow">{ko ? (result.band === 'k2' ? 'K–2 문구' : '3–5 문구') : (result.band === 'k2' ? 'K–2 wording' : '3–5 wording')} · {result.criteria.length * 4} {ko ? '점' : 'points'}</span>
              </div>

              <div className="divide-y divide-rule">
                {result.criteria.map((c, i) => {
                  const mine = issuesFor(i)
                  const hasFix = mine.some(x => x.level === 'fix')
                  return (
                    <div key={c.key} className={`py-2.5 ${hasFix ? '-mx-2 px-2 rounded bg-warn-soft/60' : ''}`}>
                      <div className="flex items-baseline justify-between gap-2"><span className="text-[14px] font-semibold text-ink">{c.label}</span>{c.standard && <span className="text-[11px] text-info">{c.standard}</span>}</div>
                      {mine.map((x, k) => <p key={k} className="mt-1 text-[12px] text-ink-2 flex gap-1.5"><AlertTriangle size={12} className={`shrink-0 mt-0.5 ${x.level === 'fix' ? 'text-warn' : 'text-ink-3'}`} />{x.message}</p>)}
                      <div className="grid grid-cols-4 gap-2 mt-1.5">
                        {c.levels.map((l, li) => (
                          <div key={li} className="text-[11.5px] leading-snug">
                            <span className="text-ink-3 font-semibold mr-1">{li + 1}</span>
                            {l ? <span className="text-ink-2">{l}</span> : <span className="italic text-warn">{ko ? '비어 있음' : 'empty'}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              {result.notes.length > 0 && (
                <div className="rounded border border-rule-2 bg-paper-2 px-3 py-2 text-[12px] text-ink-2 space-y-1">
                  <p className="eyebrow flex items-center gap-1"><Info size={12} />{ko ? '문서에서 읽은 메모' : 'Noted from the paper'}</p>
                  {result.notes.map((n, k) => <p key={k}>{n}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-rule-2 flex items-center justify-between gap-3">
          <div>
            {step === 'review' && <button onClick={() => { setStep('pick'); setResult(null) }} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><ArrowLeft size={13} />{ko ? '다른 파일' : 'Different file'}</button>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{ko ? '취소' : 'Cancel'}</button>
            {step === 'review' && result && (
              <button onClick={toBuilder} disabled={result.criteria.length === 0} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5">
                <Pencil size={13} />{fixes.length ? (ko ? '편집기에서 고치기' : 'Fix in the builder') : (ko ? '편집기에서 확인하고 저장' : 'Check in the builder and save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
