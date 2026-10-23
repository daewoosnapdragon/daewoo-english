'use client'

import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { useApp } from '@/lib/context'
import type { Band } from '@/components/curriculum/rubric-library'
import { normalizeExtractedRubric, type ImportResult } from '@/lib/rubricImport'
import { parseRubricSheet, parseDelimited, templateRows, instructionRows, templateAsText, CLAUDE_PROMPT, TEMPLATE_FILE_NAME } from '@/lib/rubricSheet'
import type { RubricDraft } from './RubricBuilder'
import { X, Upload, AlertTriangle, Info, ArrowLeft, Pencil, Download, Copy, Check, FileSpreadsheet } from 'lucide-react'

// ─── Rubric import ───────────────────────────────────────────────
// No server, no API. Step 1 hands the teacher a spreadsheet template and the
// message to give Claude with their PDF; step 2 takes the filled sheet back
// (a file or a paste), reads it with plain code, runs the format check, and
// shows every issue beside the criterion it concerns before the builder.

const ACCEPT = '.xlsx,.xls,.csv,.tsv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv,text/tab-separated-values,text/plain'

interface Props { grade: number; englishClass: string; band: Band; onClose: () => void; onDraft: (draft: RubricDraft, notes: string[]) => void }

export default function RubricImportDialog({ grade, englishClass, band, onClose, onDraft }: Props) {
  const { language: lang, showToast } = useApp()
  const ko = lang === 'ko'
  const [step, setStep] = useState<'pick' | 'review'>('pick')
  const [error, setError] = useState<string | null>(null)
  const [source, setSource] = useState('')
  const [pasted, setPasted] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragging, setDragging] = useState(false)
  const [copied, setCopied] = useState<'prompt' | 'template' | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(templateRows())
    ws['!cols'] = [{ wch: 26 }, { wch: 18 }, { wch: 44 }, { wch: 44 }, { wch: 44 }, { wch: 44 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Rubric')
    const how = XLSX.utils.aoa_to_sheet(instructionRows())
    how['!cols'] = [{ wch: 18 }, { wch: 110 }]
    XLSX.utils.book_append_sheet(wb, how, 'How to fill it in')
    XLSX.writeFile(wb, TEMPLATE_FILE_NAME)
  }

  const copy = async (what: 'prompt' | 'template') => {
    try {
      await navigator.clipboard.writeText(what === 'prompt' ? CLAUDE_PROMPT : templateAsText())
      setCopied(what); setTimeout(() => setCopied(null), 2000)
    } catch { showToast(ko ? '복사할 수 없습니다. 아래 내용을 직접 선택해 복사하세요.' : 'Could not copy. Select the text and copy it by hand.') }
  }

  const finish = (rows: unknown[][], label: string) => {
    const read = parseRubricSheet(rows)
    const r = normalizeExtractedRubric(read.rubric, band)
    // Shape problems from the sheet itself go first, as things to check.
    r.issues = [...read.problems.map(message => ({ level: 'check' as const, criterion: null, message })), ...r.issues]
    setResult(r); setSource(label); setError(null); setStep('review')
  }

  const readFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const sheetName = wb.SheetNames.find(n => /rubric|루브릭/i.test(n)) || wb.SheetNames[0]
      const ws = wb.Sheets[sheetName]
      if (!ws) throw new Error(ko ? '시트가 없습니다.' : 'The file has no sheet.')
      const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' })
      finish(rows, file.name)
    } catch (e) {
      setError((ko ? '파일을 읽을 수 없습니다: ' : 'Could not read the file: ') + (e instanceof Error ? e.message : String(e)))
    }
  }
  const onFiles = (files: FileList | null) => { const f = files?.[0]; if (f) readFile(f) }
  const readPasted = () => {
    const rows = parseDelimited(pasted)
    if (rows.length === 0) { setError(ko ? '붙여넣은 내용이 없습니다.' : 'Nothing was pasted.'); return }
    finish(rows, ko ? '붙여넣은 표' : 'Pasted table')
  }

  const fixes = result?.issues.filter(i => i.level === 'fix') || []
  const checks = result?.issues.filter(i => i.level === 'check') || []
  const issuesFor = (i: number) => result?.issues.filter(x => x.criterion === i) || []
  const general = result?.issues.filter(x => x.criterion === null) || []

  const toBuilder = () => {
    if (!result) return
    const notes = result.issues.map(i => (i.criterion === null ? '' : `${result.criteria[i.criterion]?.label || `Criterion ${i.criterion + 1}`}: `) + i.message)
    onDraft({ name: result.name, task: null, band: result.band, criteria: result.criteria, english_class: englishClass }, notes)
  }

  const btn = 'h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5'

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-3xl max-h-[88vh] grid grid-rows-[auto_minmax(0,1fr)_auto]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-center justify-between">
          <div>
            <h3 className="font-display text-[22px] leading-none text-ink">{ko ? '내 루브릭 가져오기' : 'Import your own rubric'}</h3>
            <p className="text-[12px] text-ink-3 mt-1">{step === 'review' ? source : (ko ? '템플릿에 옮겨 적은 루브릭을 올리면 앱 형식(기준당 4단계)으로 확인합니다.' : 'Put the rubric into the template, bring the sheet back, and the app checks it against its four-level format.')}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>

        <div className="overflow-y-auto p-5">
          {step === 'pick' && (
            <div className="space-y-5">
              <section className="space-y-2">
                <p className="eyebrow">{ko ? '1 · 템플릿 받기' : '1 · Get the template'}</p>
                <p className="text-[13px] text-ink-2">{ko
                  ? '템플릿을 받아 claude.ai에 루브릭 PDF(또는 사진)와 함께 첨부하고, 아래 메시지를 붙여넣으면 채워진 파일을 돌려줍니다. 직접 옮겨 적어도 됩니다.'
                  : 'Download the template, attach it to claude.ai with your rubric PDF or photo, paste the message, and you get the sheet back filled in. Or fill it in yourself.'}</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={downloadTemplate} className={btn}><Download size={13} />{ko ? '템플릿 받기 (.xlsx)' : 'Download template (.xlsx)'}</button>
                  <button onClick={() => copy('template')} className={btn}>{copied === 'template' ? <Check size={13} className="text-good" /> : <Copy size={13} />}{ko ? 'Google 시트용 복사' : 'Copy for Google Sheets'}</button>
                  <button onClick={() => copy('prompt')} className={btn}>{copied === 'prompt' ? <Check size={13} className="text-good" /> : <Copy size={13} />}{ko ? 'Claude에게 보낼 메시지 복사' : 'Copy the message for Claude'}</button>
                </div>
                <details className="text-[12px] text-ink-3">
                  <summary className="cursor-pointer hover:text-ink">{ko ? '메시지 내용 보기' : 'See the message'}</summary>
                  <pre className="mt-1.5 whitespace-pre-wrap font-sans text-ink-2 bg-paper-2 border border-rule-2 rounded p-3">{CLAUDE_PROMPT}</pre>
                </details>
              </section>

              <section className="space-y-2">
                <p className="eyebrow">{ko ? '2 · 채워진 시트 가져오기' : '2 · Bring the filled sheet back'}</p>
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }} onDragLeave={() => setDragging(false)}
                  onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files) }}
                  onClick={() => inputRef.current?.click()}
                  className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragging ? 'border-accent bg-accent/5' : 'border-rule-2 hover:border-ink-3'}`}>
                  <FileSpreadsheet size={24} className="mx-auto text-ink-3 mb-2" />
                  <p className="text-[14px] text-ink font-medium">{ko ? '여기에 파일을 놓거나 클릭해서 선택' : 'Drop the filled sheet here, or click to choose it'}</p>
                  <p className="text-[12px] text-ink-3 mt-1">{ko ? '.xlsx, .xls, .csv' : '.xlsx, .xls or .csv'}</p>
                  <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={e => { onFiles(e.target.files); e.target.value = '' }} />
                </div>
                <div className="grid gap-1.5">
                  <label htmlFor="rubric-paste" className="text-[12px] text-ink-3">{ko ? '또는 표를 여기에 붙여넣기 (시트, 문서, Claude 답변에서 복사)' : 'Or paste the table here (copied from a sheet, a document, or Claude’s reply)'}</label>
                  <textarea id="rubric-paste" value={pasted} onChange={e => setPasted(e.target.value)} rows={4} spellCheck={false}
                    placeholder={'Criterion\tStandard\tLevel 1\tLevel 2\tLevel 3\tLevel 4\nOpinion\tW.3.1\t…'}
                    className="px-3 py-2 bg-surface border border-rule-2 rounded text-[12px] font-mono leading-snug text-ink resize-y placeholder:text-ink-3" />
                  <div><button onClick={readPasted} disabled={!pasted.trim()} className={`${btn} disabled:opacity-50`}><Upload size={13} />{ko ? '붙여넣은 표 읽기' : 'Read the pasted table'}</button></div>
                </div>
                {error && <div className="flex gap-2 rounded border border-bad/40 bg-bad-soft px-3 py-2 text-[13px] text-ink"><AlertTriangle size={15} className="shrink-0 text-bad mt-0.5" /><span>{error}</span></div>}
              </section>
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
                <h4 className="font-display text-[22px] leading-none text-ink">{result.name || <span className="text-ink-3 font-sans text-[14px]">{ko ? '(제목 없음)' : '(no name in the sheet)'}</span>}</h4>
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
                  <p className="eyebrow flex items-center gap-1"><Info size={12} />{ko ? '메모' : 'Notes'}</p>
                  {result.notes.map((n, k) => <p key={k}>{n}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-rule-2 flex items-center justify-between gap-3">
          <div>
            {step === 'review' && <button onClick={() => { setStep('pick'); setResult(null) }} className={btn}><ArrowLeft size={13} />{ko ? '다른 파일' : 'Different file'}</button>}
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
