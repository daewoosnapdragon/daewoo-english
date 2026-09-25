'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ALL_ENGLISH_CLASSES, DOMAINS, DOMAIN_LABELS, type Domain, type EnglishClass, type QuestionMapItem } from '@/types'
import { parseAnswerKey, keyTotal, parseRange, rangeLabel } from '@/lib/answerKey'
import { splitPossible, isMultiDomain } from '@/lib/domainSplit'
import { DOMAIN_LABELS as DL } from '@/types'
import { CCSS_STANDARDS } from '@/components/curriculum/ccss-standards'
import { plainName as plainNameOf } from '@/components/curriculum/standards-plain'
import StandardPicker from './StandardPicker'
import RubricPicker from './RubricPicker'
import type { Band, RubricCriterion } from '@/components/curriculum/rubric-library'
import { ArrowRight, Check, ChevronDown, ChevronUp, X } from 'lucide-react'

// ─── New assessment: set up → answer key → score ─────────────────
// The paper is described as sections (multiple choice ×10, short answer ×2
// worth 5, writing with a rubric). Letters are typed only where letters
// belong, so nothing is ever silently dropped. The question map is derived
// from the sections; per-question overrides sit on top for the rare case.

type SectionType = 'mc' | 'true_false' | 'short_answer' | 'open_ended' | 'rubric'
interface Section { id: number; type: SectionType; count: number; points: number; key: string; standard?: string; rubric?: { name: string; criteria: RubricCriterion[] } | null }

const CATEGORIES = [
  { value: 'formative', label: 'Formative', ko: '형성평가', hint: 'quizzes, exit tickets, classwork' },
  { value: 'summative', label: 'Summative', ko: '총괄평가', hint: 'unit tests, midterms, finals' },
  { value: 'performance_task', label: 'Performance task', ko: '수행과제', hint: 'projects, presentations, writing tasks' },
] as const

const SECTION_TYPES: { value: SectionType; en: string; ko: string; hintEn: string; hintKo: string }[] = [
  { value: 'mc', en: 'Multiple choice', ko: '객관식', hintEn: 'Type the correct letter for each question, in order. Spaces are fine.', hintKo: '정답 글자를 순서대로 입력하세요. 띄어쓰기는 무시됩니다.' },
  { value: 'true_false', en: 'True / false', ko: '참/거짓', hintEn: 'Type T or F for each question, in order.', hintKo: '문항마다 T 또는 F를 순서대로 입력하세요.' },
  { value: 'short_answer', en: 'Short answer', ko: '단답형', hintEn: 'Say how many questions and the points each. You type each student’s score while grading, half points allowed.', hintKo: '문항 수와 문항당 점수를 정하세요. 채점할 때 학생별 점수를 입력합니다 (반점 가능).' },
  { value: 'open_ended', en: 'Extended writing', ko: '서술형', hintEn: 'A longer written response with a points score. Choose “Rubric-scored” instead if you want criteria.', hintKo: '점수로 채점하는 긴 서술형. 기준별 채점이 필요하면 “루브릭 채점”을 고르세요.' },
  { value: 'rubric', en: 'Rubric-scored', ko: '루브릭 채점', hintEn: 'Pick a rubric. Each criterion is marked 0–4 while grading, and the points add up on their own.', hintKo: '루브릭을 고르세요. 채점할 때 기준마다 0–4로 표시하면 점수가 자동으로 합산됩니다.' },
]
const isChoiceType = (t: SectionType) => t === 'mc' || t === 'true_false'
const lettersOf = (sec: Section) => isChoiceType(sec.type) ? sec.key.toUpperCase().replace(/[^A-E TF]/g, '').replace(/\s/g, '') : ''
const countOf = (sec: Section) => isChoiceType(sec.type) ? lettersOf(sec).length : Math.max(0, Math.floor(sec.count))
const defaultPoints = (t: SectionType) => t === 'short_answer' ? 5 : t === 'open_ended' ? 10 : 1

// A number box that lets you clear it. Typing keeps a text draft, so
// backspacing a 0 works; the parsed value flows out as you type.
function NumField({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) {
  const [text, setText] = useState(String(value))
  const last = useRef(value)
  useEffect(() => { if (value !== last.current) { last.current = value; setText(String(value)) } }, [value])
  return (
    <input type="text" inputMode="decimal" value={text}
      onChange={e => { const t = e.target.value; if (!/^\d*\.?\d*$/.test(t)) return; setText(t); const n = parseFloat(t); const v = Number.isFinite(n) ? n : 0; last.current = v; onChange(v) }}
      onBlur={() => setText(String(value))} onFocus={e => e.target.select()}
      className={className} />
  )
}

interface Props {
  grade: number; englishClass: EnglishClass; domain: Domain; semesterId: string | null
  onClose: () => void
  onCreated: (assessment: any, scoring: 'key' | 'rubric' | 'points') => void
}

export default function NewAssessmentFlow({ grade, englishClass, domain, semesterId, onClose, onCreated }: Props) {
  const { currentTeacher, language: lang, showToast } = useApp()
  const ko = lang === 'ko'
  const [step, setStep] = useState<1 | 2>(1)
  // How it will be scored decides what step 2 is.
  const [scoring, setScoring] = useState<'key' | 'rubric' | 'points'>('key')
  // Route each question's points to the domain its standard implies; untagged
  // questions go to the domain chosen above.
  const [routeByStandard, setRouteByStandard] = useState(false)
  const [name, setName] = useState('')
  const [dom, setDom] = useState<Domain>(domain)
  const [category, setCategory] = useState<string>('formative')
  const [date, setDate] = useState('')
  const [notes, setNotes] = useState('')
  const [points, setPoints] = useState<string>('10')
  const [share, setShare] = useState<Set<string>>(new Set())
  const [sections, setSections] = useState<Section[]>([{ id: 1, type: 'mc', count: 0, points: 1, key: '' }])
  const [overrides, setOverrides] = useState<Record<number, Partial<QuestionMapItem>>>({})
  const [textMode, setTextMode] = useState(false)
  const [keyText, setKeyText] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const map = useMemo<QuestionMapItem[]>(() => {
    if (textMode) return parseAnswerKey(keyText)
    const out: QuestionMapItem[] = []
    for (const sec of sections) {
      const isChoice = isChoiceType(sec.type)
      const letters = lettersOf(sec)
      const n = countOf(sec)
      for (let i = 0; i < n; i++) {
        const num = out.length + 1
        const base: QuestionMapItem = sec.type === 'rubric' && sec.rubric
          ? { num, type: 'rubric', max_points: sec.rubric.criteria.length * 4, standard: sec.standard, rubric: sec.rubric }
          : { num, type: sec.type, max_points: sec.points, standard: sec.standard, ...(isChoice ? { answer_key: letters[i] } : {}) }
        out.push({ ...base, ...(overrides[num] || {}) })
      }
    }
    return out
  }, [sections, overrides, textMode, keyText])
  const setSection = (id: number, patch: Partial<Section>) => setSections(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x))
  const addSection = (type: SectionType) => setSections(prev => [...prev, { id: Date.now(), type, count: 1, points: defaultPoints(type), key: '' }])
  // Moving a section renumbers its questions, so any per-question overrides
  // travel with it.
  const moveSection = (id: number, dir: -1 | 1) => {
    const i = sections.findIndex(s => s.id === id); const j = i + dir
    if (i < 0 || j < 0 || j >= sections.length) return
    const next = [...sections]; ;[next[i], next[j]] = [next[j], next[i]]
    const starts = (list: Section[]) => { const out: Record<number, number> = {}; let n = 1; for (const s of list) { out[s.id] = n; n += countOf(s) } return out }
    const oldStart = starts(sections), newStart = starts(next)
    setOverrides(prev => { const o: Record<number, Partial<QuestionMapItem>> = {}; for (const s of next) for (let k = 0; k < countOf(s); k++) { const v = prev[oldStart[s.id] + k]; if (v) o[newStart[s.id] + k] = v } return o })
    setSections(next)
  }
  const [pickingSectionStd, setPickingSectionStd] = useState<number | 'all' | null>(null)
  const [pickingSectionRubric, setPickingSectionRubric] = useState<number | null>(null)
  const [rangeText, setRangeText] = useState('')
  const [rangePoints, setRangePoints] = useState('')
  const [picking, setPicking] = useState<null | { nums: number[] }>(null)
  const [pickingRubricFor, setPickingRubricFor] = useState<number | null>(null)
  const [editingQ, setEditingQ] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    ;(step === 1 ? nameRef : keyRef).current?.focus({ preventScroll: true })
  }, [step])

  const total = map.length ? keyTotal(map) : Number(points) || 0

  const stdText = (code: string) => CCSS_STANDARDS.find(s => s.code === code)?.text || ''
  const groups = useMemo(() => {
    // Standards grouped by the questions they cover, for the range chips.
    const by: Record<string, number[]> = {}
    map.forEach(q => { if (q.standard) (by[q.standard] ||= []).push(q.num) })
    return Object.entries(by)
  }, [map])
  // Only offer domain routing once a tagged standard points somewhere other
  // than the chosen domain; before that it is noise.
  const split = useMemo(() => map.length ? splitPossible(map, dom) : null, [map, dom])
  const crossesDomains = !!split && isMultiDomain(split)

  const tagRange = (nums: number[], code: string | null) => {
    setOverrides(prev => { const n = { ...prev }; nums.forEach(num => { n[num] = { ...(n[num] || {}), standard: code || undefined } }); return n })
  }
  const setQ = (num: number, patch: Partial<QuestionMapItem>) => setOverrides(prev => ({ ...prev, [num]: { ...(prev[num] || {}), ...patch } }))

  const create = async (withKey: boolean, rubric?: { rubric_id: string | null; name: string; band: Band; criteria: any[] }) => {
    if (!name.trim()) { showToast(ko ? '이름을 입력하세요' : 'Give the assessment a name'); setStep(1); return }
    const finalMap = withKey && map.length ? map : null
    const maxScore = rubric ? rubric.criteria.length * 4 : finalMap ? keyTotal(finalMap) : Number(points)
    if (!maxScore || maxScore <= 0) { showToast(ko ? '총점을 입력하세요' : 'Set the total points'); return }
    setSaving(true)
    const codes = Array.from(new Set([...(finalMap || []).map(q => q.standard), ...(rubric?.criteria || []).map((c: any) => c.standard)].filter(Boolean))) as string[]
    const standards = codes.map(code => ({ code, dok: 0, description: stdText(code) }))
    const finalSplit = finalMap && routeByStandard ? splitPossible(finalMap, dom) : null
    const mixed = !!finalSplit && isMultiDomain(finalSplit)
    const base = {
      name: name.trim(), domain: dom, max_score: maxScore, grade, type: category, date: date || null, description: notes.trim(),
      created_by: currentTeacher?.id || null, semester_id: semesterId, standards, sections: null, question_map: finalMap,
      ...(routeByStandard && finalMap ? { mixed, domain_split: finalSplit } : {}),
      ...(rubric ? { rubric: { name: rubric.name, band: rubric.band, criteria: rubric.criteria }, rubric_id: rubric.rubric_id } : {}),
    }
    let { data, error } = await supabase.from('assessments').insert({ ...base, english_class: englishClass }).select().single()
    // The routing columns need supabase/migration-mixed-assessments.sql. If
    // they are missing, still create the assessment (without routing) rather
    // than throw away the key the teacher just typed.
    if (error && /domain_split|mixed/.test(error.message)) {
      const { mixed: _m, domain_split: _d, ...plain } = base as any
      ;({ data, error } = await supabase.from('assessments').insert({ ...plain, english_class: englishClass }).select().single())
      if (!error) showToast(ko ? '영역별 배분 없이 생성됨: supabase/migration-mixed-assessments.sql을 실행하세요' : 'Created without domain routing: run supabase/migration-mixed-assessments.sql, then NOTIFY pgrst, \'reload schema\'')
    }
    if (error) { setSaving(false); showToast(`Error: ${error.message}`); return }
    if (share.size) await supabase.from('assessments').insert(Array.from(share).map(cls => ({ ...base, english_class: cls })))
    setSaving(false)
    showToast(ko ? `"${name}" 생성됨` : `Created "${name}"${share.size ? ` · shared with ${share.size} more` : ''}`)
    onCreated(data, rubric ? 'rubric' : finalMap ? 'key' : 'points')
  }

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const field = 'h-9 px-3 bg-surface border border-rule-2 rounded text-[13.5px] text-ink placeholder:text-ink-3 w-full'
  const label = 'eyebrow block mb-1.5'
  const numBox = 'w-16 h-8 px-2 bg-surface border border-rule-2 rounded text-[13.5px] tabular-nums text-center text-ink focus:border-ink-3'
  const iconBtn = 'w-7 h-7 rounded hover:bg-paper-2 text-ink-3 hover:text-ink flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent'
  const typeLabel: Record<string, string> = { mc: 'MC', true_false: 'T/F', short_answer: 'Written', open_ended: 'Open', rubric: 'Rubric' }
  const summary = useMemo(() => {
    const parts: string[] = []
    for (const sec of sections) { const n = countOf(sec); if (!n) continue; const t = SECTION_TYPES.find(x => x.value === sec.type)!; parts.push(`${n} ${ko ? t.ko : t.en.toLowerCase()}`) }
    return parts.join(' · ')
  }, [sections, ko])
  const otherSections = (id: number) => sections.filter(s => s.id !== id)

  return (
    <div className="border border-rule-2 rounded-lg bg-surface">
      {/* Steps */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-rule-2">
        <div className="flex items-center gap-6 text-[13px]">
          {[[1, ko ? '설정' : 'Set up'], [2, scoring === 'rubric' ? (ko ? '루브릭' : 'Rubric') : scoring === 'points' ? (ko ? '총점' : 'Points') : (ko ? '정답 키' : 'Answer key')]].map(([n, l]) => (
            <button key={n} onClick={() => setStep(n as 1 | 2)} className={`flex items-center gap-2 ${step === n ? 'text-ink font-semibold' : 'text-ink-3'}`}>
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step === n ? 'bg-accent text-white' : step > (n as number) ? 'bg-good text-white' : 'border border-rule-2'}`}>{step > (n as number) ? <Check size={11} /> : n}</span>{l}
            </button>
          ))}
          <span className="flex items-center gap-2 text-ink-3"><span className="w-5 h-5 rounded-full border border-rule-2 text-[11px] flex items-center justify-center">3</span>{ko ? '채점' : 'Score'}</span>
        </div>
        <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={15} /></button>
      </div>

      {step === 1 && (
        <div className="p-5 grid gap-4 max-w-[760px]">
          <div>
            <label htmlFor="na-name" className={label}>{ko ? '이름' : 'Name'}</label>
            <input ref={nameRef} id="na-name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setStep(2) }} placeholder={ko ? '예: Unit 3 Comprehension Quiz' : 'e.g. Unit 3 Comprehension Quiz'} className={field} />
          </div>
          <div>
            <span className={label}>{ko ? '영역' : 'Domain'}</span>
            <div className="flex flex-wrap gap-1.5">{DOMAINS.map(d => <button key={d} onClick={() => setDom(d)} className={chip(dom === d)}>{DOMAIN_LABELS[d][ko ? 'ko' : 'en']}</button>)}</div>
          </div>
          <div>
            <span className={label}>{ko ? '유형' : 'Category'}</span>
            <div className="flex flex-wrap gap-1.5">{CATEGORIES.map(c => <button key={c.value} onClick={() => setCategory(c.value)} title={c.hint} className={chip(category === c.value)}>{ko ? c.ko : c.label}</button>)}</div>
          </div>
          <div>
            <span className={label}>{ko ? '채점 방식' : 'How will you score it?'}</span>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setScoring('key')} className={chip(scoring === 'key')} title={ko ? '정답 키를 입력하고 답안지로 채점' : 'Type the key, then bubble in answers'}>{ko ? '정답 키' : 'Answer key'}</button>
              <button onClick={() => setScoring('rubric')} className={chip(scoring === 'rubric')} title={ko ? '기준별 0–4 척도' : 'Criteria on a 0–4 scale'}>{ko ? '루브릭' : 'Rubric'}</button>
              <button onClick={() => setScoring('points')} className={chip(scoring === 'points')} title={ko ? '학생별 점수 하나' : 'One score per student'}>{ko ? '점수만' : 'Points only'}</button>
            </div>
            <p className="text-[12px] text-ink-3 mt-1.5">{scoring === 'key' ? (ko ? '문항별로 채점합니다: 객관식은 정답 키로, 서술형은 점수로, 쓰기는 루브릭으로. 섹션을 섞을 수 있습니다.' : 'Grade question by question: multiple choice against a key, written answers by points, writing with a rubric. Mix them on one paper.') : scoring === 'rubric' ? (ko ? '시험지 전체를 루브릭 하나로 채점합니다.' : 'The whole assessment is one rubric, marked criterion by criterion.') : (ko ? '학생마다 총점 하나만 입력합니다.' : 'Just one total per student.')}</p>
          </div>
          <div className="grid grid-cols-[160px_140px_1fr] gap-4">
            <div><label htmlFor="na-date" className={label}>{ko ? '날짜' : 'Date'}</label><input id="na-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={field} /></div>
            <div><label htmlFor="na-points" className={label}>{ko ? '총점' : 'Total points'}</label><input id="na-points" type="number" min={1} value={scoring === 'key' && map.length ? String(keyTotal(map)) : points} disabled={scoring !== 'points'} onChange={e => setPoints(e.target.value)} className={`${field} tabular-nums disabled:text-ink-3`} />{scoring !== 'points' && <p className="text-[11px] text-ink-3 mt-1">{scoring === 'rubric' ? (ko ? '기준당 4점' : '4 per criterion') : (ko ? '정답 키에서 계산됨' : 'Adds up from the key')}</p>}</div>
            <div><label htmlFor="na-notes" className={label}>{ko ? '메모' : 'Notes'}</label><input id="na-notes" value={notes} onChange={e => setNotes(e.target.value)} className={field} placeholder={ko ? '선택' : 'optional'} /></div>
          </div>
          <div>
            <span className={label}>{ko ? '다른 반과 공유' : 'Also create for'}</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ENGLISH_CLASSES.filter(c => c !== 'Unplaced' && c !== englishClass).map(c => (
                <button key={c} onClick={() => setShare(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })} className={chip(share.has(c))}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {scoring === 'points'
              ? <button onClick={() => create(false)} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5 disabled:opacity-60">{ko ? '생성 후 점수 입력' : 'Create and enter scores'} <ArrowRight size={13} /></button>
              : <button onClick={() => setStep(2)} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5">{scoring === 'rubric' ? (ko ? '루브릭 선택' : 'Next: choose a rubric') : (ko ? '정답 키 입력' : 'Next: answer key')} <ArrowRight size={13} /></button>}
          </div>
        </div>
      )}

      {step === 2 && scoring === 'rubric' && (
        <div className="p-5">
          <p className="text-[13px] text-ink-2 mb-3">{ko ? '템플릿이나 저장된 루브릭을 고르면 평가가 만들어지고 바로 채점할 수 있습니다.' : 'Pick a template or a saved rubric. The assessment is created with it and scoring opens right away.'}</p>
          <RubricPicker grade={grade} englishClass={englishClass} onClose={() => setStep(1)} onUse={r => create(false, r)} />
        </div>
      )}
      {step === 2 && scoring === 'key' && (
        <div className="p-5 grid gap-5">
          {textMode ? (
            <div>
              <div className="flex items-baseline justify-between"><label htmlFor="na-key" className={label}>{ko ? '정답 키를 한 줄로' : 'The whole key as one line'}</label><button onClick={() => setTextMode(false)} className="text-[12px] text-accent hover:underline">{ko ? '섹션으로 만들기' : 'Build it as sections instead'}</button></div>
              <input ref={keyRef} id="na-key" value={keyText} onChange={e => setKeyText(e.target.value)} spellCheck={false} placeholder="ACBDA BDCAB TF 5 5 12r"
                className="w-full max-w-[760px] h-12 px-3 bg-paper-2 border border-rule-2 rounded font-mono text-[20px] tracking-[0.3em] text-ink placeholder:text-ink-3 placeholder:tracking-[0.3em]" />
              <p className="text-[12px] text-ink-2 mt-1.5">{ko ? '문자 = 객관식 1점 · T/F = 참/거짓 · 숫자 = 서술형 점수 · 12r = 루브릭. 항목 사이에 공백을 넣으세요.' : 'Letters are multiple choice worth 1 · T/F is true or false · a number is a written item worth that many points · 12r is a rubric item. Put a space between items: 3 4r is two items, 34r is one.'}</p>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h3 className="font-display text-[20px] text-ink leading-tight">{ko ? '시험지에 무엇이 있나요?' : 'What is on the paper?'}</h3>
                  <p className="text-[13px] text-ink-2 mt-1 max-w-[640px]">{ko ? '섹션별로 적어 주세요. 객관식은 정답 글자를 입력하고, 서술형은 문항 수를 적으면 됩니다. 배점과 기준은 나중에 바꿔도 됩니다.' : 'Describe it section by section. For multiple choice, type the answers. For written questions, just say how many. Points and standards can be changed any time.'}</p>
                </div>
                <button onClick={() => setTextMode(true)} className="text-[12px] text-ink-3 hover:text-ink whitespace-nowrap">{ko ? '한 줄로 입력' : 'Type it as one line instead'}</button>
              </div>
              <div className="grid gap-3">
                {sections.map((sec, si) => {
                  const isChoice = isChoiceType(sec.type)
                  const raw = isChoice ? sec.key.toUpperCase().replace(/\s/g, '') : ''
                  const bad = isChoice ? raw.replace(sec.type === 'mc' ? /[A-E]/g : /[TF]/g, '') : ''
                  const startNum = sections.slice(0, si).reduce((n, x) => n + countOf(x), 0) + 1
                  const n = countOf(sec)
                  const t = SECTION_TYPES.find(x => x.value === sec.type)!
                  const others = otherSections(sec.id)
                  const canSpread = !!sec.standard && others.length > 0 && others.some(o => o.standard !== sec.standard)
                  return (
                    <div key={sec.id} className="border border-rule-2 rounded-md bg-surface">
                      <div className="flex items-center gap-3 px-4 h-10 border-b border-rule bg-paper-2/60 rounded-t-md">
                        <span className="eyebrow">{ko ? `섹션 ${si + 1}` : `Section ${si + 1}`}</span>
                        <span className="text-[12px] text-ink-3 tabular-nums">{n ? `Q${startNum}${n > 1 ? `–${startNum + n - 1}` : ''} · ${n} ${ko ? '문항' : n === 1 ? 'question' : 'questions'} · ${sec.type === 'rubric' ? (sec.rubric ? sec.rubric.criteria.length * 4 * n : 4 * n) : sec.points * n} ${ko ? '점' : 'pt'}` : (ko ? '아직 문항 없음' : 'no questions yet')}</span>
                        <div className="ml-auto flex items-center gap-0.5">
                          <button onClick={() => moveSection(sec.id, -1)} disabled={si === 0} title={ko ? '위로' : 'Move up'} className={iconBtn}><ChevronUp size={15} /></button>
                          <button onClick={() => moveSection(sec.id, 1)} disabled={si === sections.length - 1} title={ko ? '아래로' : 'Move down'} className={iconBtn}><ChevronDown size={15} /></button>
                          <button onClick={() => setSections(prev => prev.filter(x => x.id !== sec.id))} title={ko ? '섹션 제거' : 'Remove section'} className={`${iconBtn} hover:text-bad`}><X size={15} /></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-[170px_minmax(0,1fr)] gap-x-5 gap-y-3 px-4 py-3.5">
                        <div>
                          <span className="eyebrow block mb-1">{ko ? '문항 종류' : 'Question type'}</span>
                          <select value={sec.type} onChange={e => { const nt = e.target.value as SectionType; setSection(sec.id, { type: nt, points: isChoiceType(nt) === isChoice && sec.type !== 'rubric' ? sec.points : defaultPoints(nt), count: Math.max(1, sec.count) }) }} className="h-9 w-full px-2 bg-surface border border-rule-2 rounded text-[13px] text-ink">
                            {SECTION_TYPES.map(x => <option key={x.value} value={x.value}>{ko ? x.ko : x.en}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-2 min-w-0">
                          <p className="text-[12px] text-ink-3">{ko ? t.hintKo : t.hintEn}</p>
                          {isChoice ? (
                            <>
                              <input ref={si === 0 ? keyRef : undefined} value={sec.key} onChange={e => setSection(sec.id, { key: e.target.value })} spellCheck={false} autoComplete="off"
                                placeholder={sec.type === 'mc' ? (ko ? '정답을 입력하세요, 예: ACBDA BDCAB' : 'Type the answers here, e.g. ACBDA BDCAB') : (ko ? '예: TFTTF' : 'Type T or F for each, e.g. TFTTF')}
                                className={`h-11 px-3 bg-paper-2 border rounded font-mono text-[18px] tracking-[0.3em] text-ink placeholder:font-sans placeholder:text-[13px] placeholder:tracking-normal placeholder:text-ink-3 ${bad ? 'border-bad' : 'border-rule-2 focus:border-ink-3'}`} />
                              {bad && <p className="text-[12px] text-bad">{ko ? `사용할 수 없는 글자: ${bad}` : `Only ${sec.type === 'mc' ? 'A to E' : 'T or F'} count here. These were skipped: ${bad}`}</p>}
                              <div className="flex items-center gap-2 text-[13px] text-ink-2">
                                <span>{ko ? '문항당' : 'Each question is worth'}</span>
                                <NumField value={sec.points} onChange={v => setSection(sec.id, { points: v })} className={numBox} />
                                <span>{ko ? '점' : sec.points === 1 ? 'point' : 'points'}</span>
                              </div>
                            </>
                          ) : sec.type === 'rubric' ? (
                            <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                              <button onClick={() => setPickingSectionRubric(sec.id)} className={`h-9 px-3 border rounded text-left ${sec.rubric ? 'border-rule-2 text-ink' : 'border-accent text-accent font-medium'}`}>{sec.rubric ? `${sec.rubric.name} · ${sec.rubric.criteria.length} ${ko ? '기준' : 'criteria'} · ${sec.rubric.criteria.length * 4} ${ko ? '점' : 'pt'}` : (ko ? '루브릭 선택…' : 'Choose a rubric…')}</button>
                              {sec.rubric && <button onClick={() => setSection(sec.id, { rubric: null })} className="text-ink-3 hover:text-bad text-[12px]">{ko ? '제거' : 'remove'}</button>}
                              <span className="ml-1">{ko ? '×' : 'for'}</span>
                              <NumField value={sec.count} onChange={v => setSection(sec.id, { count: v })} className={numBox} />
                              <span>{ko ? '개 과제' : sec.count === 1 ? 'task' : 'tasks'}</span>
                              {!sec.rubric && <span className="text-ink-3 text-[12px] basis-full">{ko ? '루브릭 없이 만들면 과제당 0–4 점수 하나만 매깁니다.' : 'Without a rubric, each task gets a single 0–4 mark.'}</span>}
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
                              <NumField value={sec.count} onChange={v => setSection(sec.id, { count: v })} className={numBox} />
                              <span>{ko ? '문항, 문항당' : sec.count === 1 ? 'question, worth' : 'questions, each worth'}</span>
                              <NumField value={sec.points} onChange={v => setSection(sec.id, { points: v })} className={numBox} />
                              <span>{ko ? '점' : sec.points === 1 ? 'point' : 'points'}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-[12.5px] pt-1">
                            <span className="text-ink-3">{ko ? '기준' : 'Standard'}</span>
                            {sec.standard
                              ? <span className="inline-flex items-center gap-1.5 h-7 pl-2.5 pr-1 rounded-full border border-rule-2 bg-surface"><span className="font-mono text-[11px] text-info">{sec.standard}</span><span className="text-ink-2 truncate max-w-[280px]">{plainNameOf(sec.standard)}</span><button onClick={() => setSection(sec.id, { standard: undefined })} title={ko ? '기준 제거' : 'Remove standard'} className="w-5 h-5 rounded-full hover:bg-paper-2 text-ink-3 hover:text-bad flex items-center justify-center"><X size={11} /></button></span>
                              : <button onClick={() => setPickingSectionStd(sec.id)} className="h-7 px-2.5 rounded-full border border-dashed border-rule-2 text-ink-2 hover:text-ink hover:border-ink-3">{ko ? '기준 선택… (선택)' : 'Tag a standard… (optional)'}</button>}
                            {sec.standard && <button onClick={() => setPickingSectionStd(sec.id)} className="text-ink-3 hover:text-ink">{ko ? '변경' : 'change'}</button>}
                            {canSpread && <button onClick={() => setSections(prev => prev.map(x => ({ ...x, standard: sec.standard })))} className="text-accent hover:underline">{ko ? '모든 섹션에 적용' : 'Use for every section'}</button>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <span className="text-[12.5px] text-ink-2 mr-1">{ko ? '섹션 추가:' : 'Add another section:'}</span>
                {SECTION_TYPES.map(x => <button key={x.value} onClick={() => addSection(x.value)} className={chip(false)}>+ {ko ? x.ko : x.en}</button>)}
                {sections.length > 1 && <button onClick={() => setPickingSectionStd('all')} className="ml-auto text-[12px] text-ink-3 hover:text-ink">{ko ? '모든 섹션에 기준 하나 태그…' : 'Tag every section with one standard…'}</button>}
              </div>
            </div>
          )}

          {crossesDomains && (
            <label className="flex items-start gap-2.5 text-[13px] text-ink cursor-pointer border border-info/40 bg-info-soft/40 rounded-md px-4 py-3">
              <input type="checkbox" checked={routeByStandard} onChange={e => setRouteByStandard(e.target.checked)} className="mt-1" />
              <span>
                <span className="font-medium">{ko ? '기준에 따라 영역별로 점수 배분' : 'Send each question’s points to its standard’s domain'}</span>
                <span className="block text-[12px] text-ink-2">{ko ? `태그된 기준이 여러 영역에 걸쳐 있습니다. 태그 없는 문항은 ${DL[dom].ko}로 갑니다.` : `Some tagged standards belong to another domain. Untagged questions still count toward ${DL[dom].en}.`}{routeByStandard && split ? ` · ${Object.entries(split).map(([d, v]) => `${DL[d as keyof typeof DL]?.[ko ? 'ko' : 'en'] || d} ${v}`).join(', ')}` : ''}</span>
              </span>
            </label>
          )}

          {map.length > 0 && (
            <div>
              <button onClick={() => setShowAdvanced(v => !v)} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink">{showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}{ko ? '문항별 세부 조정' : 'Fine-tune individual questions'}<span className="text-ink-3 font-normal">{ko ? ' · 배점, 종류, 기준을 문항 단위로' : ' · points, type, or standard for just one question'}</span></button>
              {showAdvanced && (
                <div className="grid gap-4 mt-3 border border-rule rounded-md p-4 bg-paper-2/40">
                  <div className="grid gap-2">
                    <span className={label}>{ko ? '문항 · 클릭해 개별 수정' : 'Questions · click one to change just that question'}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {map.map(q => (
                        <div key={q.num} className="relative">
                          <button onClick={() => setEditingQ(editingQ === q.num ? null : q.num)}
                            className={`min-w-[58px] border rounded text-center overflow-hidden bg-surface ${editingQ === q.num ? 'border-accent' : 'border-rule-2'}`}>
                            <span className="block text-[10px] text-ink-3 bg-paper-2 tracking-wide">Q{q.num}{q.max_points !== 1 || !q.answer_key ? ` · ${q.max_points}pt` : ''}</span>
                            <span className={`block font-mono font-bold ${q.answer_key ? 'text-[15px]' : 'text-[10.5px] font-sans font-medium text-ink-2'} py-0.5 px-1 truncate max-w-[120px]`}>{q.answer_key || (q.type === 'rubric' && q.rubric ? q.rubric.name : typeLabel[q.type])}</span>
                            <span className="block text-[9.5px] text-info px-1 pb-0.5 min-h-[14px]">{q.standard || ''}</span>
                          </button>
                          {editingQ === q.num && (
                            <div className="absolute z-20 top-full left-0 mt-1 w-[220px] bg-surface border border-rule-2 rounded shadow-lg p-3 grid gap-2 text-[12px]">
                              <label className="grid gap-1"><span className="eyebrow">Points</span><NumField value={q.max_points} onChange={v => setQ(q.num, { max_points: v })} className="h-7 px-2 bg-surface border border-rule-2 rounded tabular-nums" /></label>
                              <label className="grid gap-1"><span className="eyebrow">Type</span>
                                <select value={q.type} onChange={e => setQ(q.num, { type: e.target.value as any, answer_key: (e.target.value === 'mc' || e.target.value === 'true_false') ? q.answer_key : undefined })} className="h-7 px-2 bg-surface border border-rule-2 rounded">
                                  <option value="mc">Multiple choice</option><option value="true_false">True / false</option><option value="short_answer">Written · short answer</option><option value="open_ended">Written · open response</option><option value="rubric">Rubric</option>
                                </select></label>
                              {q.type === 'rubric' && (
                                <div className="grid gap-1"><span className="eyebrow">Rubric</span>
                                  <div className="flex gap-1.5"><button onClick={() => setPickingRubricFor(q.num)} className="h-7 px-2 border border-rule-2 rounded text-ink-2 hover:text-ink flex-1 text-left truncate">{q.rubric ? `${q.rubric.name} · ${q.rubric.criteria.length} criteria` : (ko ? '루브릭 선택…' : 'Pick a rubric…')}</button>{q.rubric && <button onClick={() => setQ(q.num, { rubric: null })} className="h-7 px-2 border border-rule-2 rounded text-ink-3 hover:text-bad">×</button>}</div>
                                  <span className="text-[10.5px] text-ink-3">{ko ? '기준당 4점. 루브릭 없이는 0–4 점수 하나.' : 'Scored criterion by criterion, 4 each. Without one, a single 0–4 mark.'}</span>
                                </div>
                              )}
                              <div className="grid gap-1"><span className="eyebrow">Standard</span>
                                <div className="flex gap-1.5"><button onClick={() => { setPicking({ nums: [q.num] }) }} className="h-7 px-2 border border-rule-2 rounded text-ink-2 hover:text-ink flex-1 text-left truncate">{q.standard || 'Pick…'}</button>{q.standard && <button onClick={() => tagRange([q.num], null)} className="h-7 px-2 border border-rule-2 rounded text-ink-3 hover:text-bad">×</button>}</div></div>
                              <button onClick={() => setEditingQ(null)} className="h-7 rounded bg-ink text-paper text-[12px] font-semibold">Done</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <span className={label}>{ko ? '문항 범위별 배점' : 'Points by question range'}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[12px] text-ink-3">Q</span>
                      <input id="na-prange" value={rangeText} onChange={e => setRangeText(e.target.value)} placeholder="1-10" className="h-7 w-[72px] px-2 bg-surface border border-rule-2 rounded text-[12px] tabular-nums" />
                      <span className="text-[12px] text-ink-3">{ko ? '문항당' : 'worth'}</span>
                      <input id="na-ppts" type="text" inputMode="decimal" value={rangePoints} onChange={e => { if (/^\d*\.?\d*$/.test(e.target.value)) setRangePoints(e.target.value) }} placeholder="2" className="h-7 w-[64px] px-2 bg-surface border border-rule-2 rounded text-[12px] tabular-nums" />
                      <span className="text-[12px] text-ink-3">{ko ? '점' : 'points each'}</span>
                      <button onClick={() => { const nums = parseRange(rangeText, map.length); const pts = Number(rangePoints); if (!nums.length || !(pts >= 0)) { showToast(ko ? '범위와 점수를 입력하세요' : 'Type a range and the points first'); return } setOverrides(prev => { const n = { ...prev }; nums.forEach(num => { const q = map.find(x => x.num === num); if (q && !(q.type === 'rubric' && q.rubric)) n[num] = { ...(n[num] || {}), max_points: pts } }); return n }); setRangePoints('') }} className="h-7 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink">{ko ? '적용' : 'Apply'}</button>
                    </div>
                    <span className={label}>{ko ? '문항 범위별 기준 태그' : 'Tag standards by question range'}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {groups.map(([code, nums]) => (
                        <span key={code} className="inline-flex items-center gap-1.5 border border-rule-2 rounded-full pl-2.5 pr-1 h-7 text-[12px] bg-surface" title={stdText(code)}>
                          <span className="text-info font-semibold">Q{rangeLabel(nums)}</span><span className="text-ink-2 truncate max-w-[220px]">{code} · {plainNameOf(code)}</span>
                          <button onClick={() => tagRange(nums, null)} className="w-5 h-5 rounded-full hover:bg-paper-2 text-ink-3 hover:text-bad flex items-center justify-center">×</button>
                        </span>
                      ))}
                      <span className="inline-flex items-center gap-1">
                        <span className="text-[12px] text-ink-3">Q</span>
                        <input id="na-range" value={rangeText} onChange={e => setRangeText(e.target.value)} placeholder="1-5" className="h-7 w-[72px] px-2 bg-surface border border-rule-2 rounded text-[12px] tabular-nums"
                          onKeyDown={e => { if (e.key === 'Enter') { const nums = parseRange(rangeText, map.length); if (nums.length) setPicking({ nums }) } }} />
                        <button onClick={() => { const nums = parseRange(rangeText, map.length); if (nums.length) setPicking({ nums }); else showToast(ko ? '범위를 입력하세요 (예: 1-5)' : 'Type a range like 1-5 first') }} className="h-7 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink">+ {ko ? '기준 선택' : 'Pick standard'}</button>
                      </span>
                    </div>
                  </div>
                  {!crossesDomains && (
                    <label className="flex items-start gap-2.5 text-[12.5px] text-ink-2 cursor-pointer">
                      <input type="checkbox" checked={routeByStandard} onChange={e => setRouteByStandard(e.target.checked)} className="mt-0.5" />
                      <span>{ko ? '기준에 따라 영역별로 점수 배분 (RL/RI → 읽기, RF → 파닉스, W → 쓰기, SL → 말하기·듣기, L → 언어)' : 'Route points by standard: RL/RI to Reading, RF to Phonics, W to Writing, SL to Speaking & Listening, L to Language.'}</span>
                    </label>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-3 border-t border-rule">
            <p className="text-[13px] text-ink-2">
              {map.length
                ? <><span className="font-semibold text-ink tabular-nums">{map.length} {ko ? '문항' : map.length === 1 ? 'question' : 'questions'} · {total} {ko ? '점' : 'points'}</span>{summary ? <span className="text-ink-3"> · {summary}</span> : null}</>
                : <span className="text-ink-3">{ko ? '위에 문항을 추가하면 여기에 합계가 표시됩니다.' : 'Add questions above and the total shows here.'}</span>}
            </p>
            <div className="flex items-center gap-3">
              {!map.length && <button onClick={() => create(false)} disabled={saving} className="text-[12px] text-ink-3 hover:text-ink underline-offset-2 hover:underline">{ko ? '키 없이 만들기 (학생별 총점만 입력)' : 'Skip the key: one total per student'}</button>}
              <button onClick={() => setStep(1)} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{ko ? '뒤로' : 'Back'}</button>
              <button onClick={() => create(true)} disabled={saving || !map.length} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5 disabled:opacity-50">{ko ? '저장 후 채점 시작' : 'Save and start scoring'} <ArrowRight size={13} /></button>
            </div>
          </div>
        </div>
      )}

      {pickingSectionStd != null && <StandardPicker grade={grade} domain={dom} englishClass={englishClass} onClose={() => setPickingSectionStd(null)}
        onPick={st => { if (pickingSectionStd === 'all') setSections(prev => prev.map(x => ({ ...x, standard: st.code }))); else setSection(pickingSectionStd, { standard: st.code }); setPickingSectionStd(null) }} />}
      {pickingSectionRubric != null && <RubricPicker grade={grade} englishClass={englishClass} onClose={() => setPickingSectionRubric(null)} onUse={r => { setSection(pickingSectionRubric, { rubric: { name: r.name, criteria: r.criteria } }); setPickingSectionRubric(null) }} />}
      {pickingRubricFor != null && <RubricPicker grade={grade} englishClass={englishClass} onClose={() => setPickingRubricFor(null)}
        onUse={r => { setQ(pickingRubricFor, { rubric: { name: r.name, criteria: r.criteria }, max_points: r.criteria.length * 4 }); setPickingRubricFor(null) }} />}
      {picking && <StandardPicker grade={grade} domain={dom} englishClass={englishClass} onClose={() => setPicking(null)} onPick={s => { tagRange(picking.nums, s.code); setPicking(null); setRangeText('') }} />}
    </div>
  )
}
