'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { buildRubricPrintHtml, sheetCount, SLIPS_PER_SHEET, type PrintLayout, type PrintRubric, type PrintSlip, type ScoredByStudent } from './rubricPrint'
import { X, Printer } from 'lucide-react'

// ─── Print rubric dialog ─────────────────────────────────────────
// Pick a size (full, half or quarter page A4), how many copies or one per
// student, and what to show. Opens the browser's print dialog; "Save as PDF"
// there gives a file.

interface Props {
  rubric: PrintRubric
  /** Assessment name, printed above the rubric name. */
  title?: string
  subtitle?: string
  /** When given, slips can be printed one per student. */
  students?: { id: string; name: string }[]
  /** Marked levels by student id; when given, slips can carry the marks. */
  scored?: ScoredByStudent
  maxScore?: number
  onClose: () => void
}

export default function RubricPrintDialog({ rubric, title, subtitle, students, scored, maxScore, onClose }: Props) {
  const { language, showToast } = useApp()
  const ko = language === 'ko'
  const scoredCount = useMemo(() => students && scored ? students.filter(s => scored[s.id]?.levels || scored[s.id]?.note).length : 0, [students, scored])

  const [layout, setLayout] = useState<PrintLayout>('full')
  const [who, setWho] = useState<'blank' | 'students' | 'scored'>(scoredCount > 0 ? 'scored' : students?.length ? 'students' : 'blank')
  const [copies, setCopies] = useState(1)
  const [lang, setLang] = useState<'en' | 'ko'>(ko ? 'ko' : 'en')
  const [showStandards, setShowStandards] = useState(true)
  const [showZero, setShowZero] = useState(true)
  const [commentLine, setCommentLine] = useState(true)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const slipCount = who === 'blank' ? copies : who === 'students' ? (students?.length || 0) : scoredCount
  const sheets = sheetCount(layout, slipCount)

  const print = () => {
    let slips: PrintSlip[] | undefined
    if (who === 'students' && students) slips = students.map(s => ({ student: s.name }))
    if (who === 'scored' && students && scored) slips = students.filter(s => scored[s.id]?.levels || scored[s.id]?.note).map(s => ({ student: s.name, levels: scored[s.id].levels, score: scored[s.id].score, note: scored[s.id].note, maxScore }))
    const html = buildRubricPrintHtml(rubric, { layout, lang, title, subtitle, showStandards, showZero, commentLine, copies }, slips)
    const pw = window.open('', '_blank')
    if (!pw) { showToast(ko ? '팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.' : 'The print window was blocked. Allow pop-ups for this site and try again.'); return }
    pw.document.open(); pw.document.write(html); pw.document.close()
    onClose()
  }

  const layouts: { key: PrintLayout; name: string; hint: string }[] = [
    { key: 'full', name: ko ? '전체 페이지' : 'Full page', hint: ko ? 'A4 한 장에 루브릭 하나. 모든 설명 포함.' : 'One per A4 sheet, every descriptor.' },
    { key: 'half', name: ko ? '반 페이지' : 'Half page', hint: ko ? 'A4 한 장에 둘, 가로 A5. 설명 포함.' : 'Two per sheet, A5 landscape, descriptors kept.' },
    { key: 'quarter', name: ko ? '1/4 페이지' : 'Quarter page', hint: ko ? 'A4 한 장에 넷. 기준별로 0–4에 동그라미.' : 'Four per sheet. Circle 0–4 per criterion, no descriptors.' },
  ]
  const check = (on: boolean, set: (v: boolean) => void, label: string) => (
    <label className="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none"><input type="checkbox" checked={on} onChange={e => set(e.target.checked)} className="accent-[rgb(var(--accent))]" />{label}</label>
  )
  const radio = (on: boolean, onPick: () => void, label: string, hint?: string, disabled = false) => (
    <label className={`flex items-start gap-2 text-[12.5px] cursor-pointer select-none ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}><input type="radio" checked={on} disabled={disabled} onChange={onPick} className="mt-0.5 accent-[rgb(var(--accent))]" /><span><span className="block text-ink">{label}</span>{hint && <span className="block text-[11px] text-ink-3">{hint}</span>}</span></label>
  )

  return (
    <div className="fixed inset-0 z-[120] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-center justify-between">
          <div><h3 className="font-display text-[22px] leading-none text-ink">{ko ? '루브릭 인쇄' : 'Print rubric'}</h3><p className="text-[12px] text-ink-3 mt-1 truncate">{rubric.name} · {rubric.criteria.length} {ko ? '기준' : 'criteria'}</p></div>
          <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <p className="eyebrow mb-2">{ko ? '크기' : 'Size'}</p>
            <div className="grid grid-cols-3 gap-2">
              {layouts.map(l => (
                <button key={l.key} onClick={() => setLayout(l.key)} className={`text-left rounded border px-2.5 py-2 ${layout === l.key ? 'border-ink bg-paper-2' : 'border-rule-2 hover:border-ink-3'}`}>
                  <span className={`block mx-auto mb-1.5 border border-ink-3 ${l.key === 'quarter' ? 'w-9 h-6 grid grid-cols-2 grid-rows-2' : 'w-6 h-9 grid grid-cols-1'} ${l.key === 'half' ? 'grid-rows-2' : ''}`} aria-hidden>
                    {Array.from({ length: SLIPS_PER_SHEET[l.key] }).map((_, i) => <span key={i} className={`border-ink-3 ${l.key === 'half' && i === 0 ? 'border-b border-dashed' : ''} ${l.key === 'quarter' ? `${i < 2 ? 'border-b' : ''} ${i % 2 === 0 ? 'border-r' : ''} border-dashed` : ''}`} />)}
                  </span>
                  <span className="block text-[12.5px] font-semibold text-ink">{l.name}</span>
                  <span className="block text-[10.5px] text-ink-3 leading-snug mt-0.5">{l.hint}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">{ko ? '내용' : 'Copies'}</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {radio(who === 'blank', () => setWho('blank'), ko ? '빈 루브릭' : 'Blank')}
                <input type="number" min={1} max={200} value={copies} disabled={who !== 'blank'} onChange={e => setCopies(Math.max(1, Math.min(200, Number(e.target.value) || 1)))} className="h-7 w-16 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink tabular-nums disabled:text-ink-3" aria-label={ko ? '매수' : 'Copies'} />
                <span className="text-[11px] text-ink-3">{ko ? '매' : 'copies'}</span>
              </div>
              {students && students.length > 0 && radio(who === 'students', () => setWho('students'), ko ? `학생별 1장 (${students.length}명), 이름 인쇄` : `One per student (${students.length}), names filled in`)}
              {students && students.length > 0 && scored && radio(who === 'scored', () => setWho('scored'), ko ? `채점 결과 포함 (${scoredCount}명)` : `With marked levels (${scoredCount} students)`, ko ? '각 학생이 받은 단계를 표시하고 합계를 적습니다.' : 'Shades each student’s level and writes the total.', scoredCount === 0)}
            </div>
          </div>
          <div>
            <p className="eyebrow mb-2">{ko ? '표시' : 'Show'}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {check(showStandards, setShowStandards, ko ? '성취기준 코드' : 'Standard codes')}
              {check(showZero, setShowZero, ko ? '0 (없음) 열' : 'The 0 column')}
              {check(commentLine, setCommentLine, ko ? '코멘트 줄' : 'Comment lines')}
              <label className="flex items-center gap-2 text-[12.5px] text-ink-2 cursor-pointer select-none"><input type="checkbox" checked={lang === 'ko'} onChange={e => setLang(e.target.checked ? 'ko' : 'en')} className="accent-[rgb(var(--accent))]" />{ko ? '한국어 제목' : 'Korean headings'}</label>
            </div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-rule-2 flex items-center justify-between gap-3">
          <span className="text-[12px] text-ink-3 tabular-nums">{slipCount} {ko ? '장' : slipCount === 1 ? 'slip' : 'slips'} · {sheets} A4 {ko ? '매' : sheets === 1 ? 'sheet' : 'sheets'}</span>
          <button onClick={print} disabled={slipCount === 0} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50 inline-flex items-center gap-1.5"><Printer size={14} />{ko ? '인쇄' : 'Print'}</button>
        </div>
      </div>
    </div>
  )
}
