'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { ALL_ENGLISH_CLASSES, DOMAINS, DOMAIN_LABELS, type Domain, type EnglishClass, type QuestionMapItem } from '@/types'
import { parseAnswerKey, keyToString, keyTotal, parseRange, rangeLabel } from '@/lib/answerKey'
import { splitPossible, isMultiDomain } from '@/lib/domainSplit'
import { DOMAIN_LABELS as DL } from '@/types'
import { CCSS_STANDARDS } from '@/components/curriculum/ccss-standards'
import StandardPicker from './StandardPicker'
import RubricPicker from './RubricPicker'
import type { Band } from '@/components/curriculum/rubric-library'
import { ArrowRight, Check, X } from 'lucide-react'

// ─── New assessment: set up → answer key → score ─────────────────
// One way in. The key is typed as a string ("ACBDA BDCAB TF 2 2 3") and builds
// the same question_map the grades screen already stores; standards are tagged
// by question range. Without a key, the total is typed and scoring is the
// plain list. Editing an existing assessment still uses the full modal.

const CATEGORIES = [
  { value: 'formative', label: 'Formative', ko: '형성평가', hint: 'quizzes, exit tickets, classwork' },
  { value: 'summative', label: 'Summative', ko: '총괄평가', hint: 'unit tests, midterms, finals' },
  { value: 'performance_task', label: 'Performance task', ko: '수행과제', hint: 'projects, presentations, writing tasks' },
] as const

interface Props {
  grade: number; englishClass: EnglishClass; domain: Domain; semesterId: string | null
  onClose: () => void
  onCreated: (assessment: any, scoring: 'key' | 'rubric' | 'points') => void
}

export default function NewAssessmentFlow({ grade, englishClass, domain, semesterId, onClose, onCreated }: Props) {
  const { currentTeacher, language: lang, showToast } = useApp()
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
  const [keyText, setKeyText] = useState('')
  const [map, setMap] = useState<QuestionMapItem[]>([])
  const [rangeText, setRangeText] = useState('')
  const [rangePoints, setRangePoints] = useState('')
  const [picking, setPicking] = useState<null | { nums: number[] }>(null)
  const [pickingRubricFor, setPickingRubricFor] = useState<number | null>(null)
  const [editingQ, setEditingQ] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { (step === 1 ? nameRef : keyRef).current?.focus() }, [step])

  const onKeyChange = (text: string) => { setKeyText(text); setMap(parseAnswerKey(text, map)) }
  const total = map.length ? keyTotal(map) : Number(points) || 0

  const stdText = (code: string) => CCSS_STANDARDS.find(s => s.code === code)?.text || ''
  const groups = useMemo(() => {
    // Standards grouped by the questions they cover, for the range chips.
    const by: Record<string, number[]> = {}
    map.forEach(q => { if (q.standard) (by[q.standard] ||= []).push(q.num) })
    return Object.entries(by)
  }, [map])

  const tagRange = (nums: number[], code: string | null) => {
    setMap(prev => prev.map(q => nums.includes(q.num) ? { ...q, standard: code || undefined } : q))
  }
  const setQ = (num: number, patch: Partial<QuestionMapItem>) => setMap(prev => prev.map(q => q.num === num ? { ...q, ...patch } : q))

  const create = async (withKey: boolean, rubric?: { rubric_id: string | null; name: string; band: Band; criteria: any[] }) => {
    if (!name.trim()) { showToast(lang === 'ko' ? '이름을 입력하세요' : 'Give the assessment a name'); setStep(1); return }
    const finalMap = withKey && map.length ? map : null
    const maxScore = rubric ? rubric.criteria.length * 4 : finalMap ? keyTotal(finalMap) : Number(points)
    if (!maxScore || maxScore <= 0) { showToast(lang === 'ko' ? '총점을 입력하세요' : 'Set the total points'); return }
    setSaving(true)
    const codes = Array.from(new Set([...(finalMap || []).map(q => q.standard), ...(rubric?.criteria || []).map((c: any) => c.standard)].filter(Boolean))) as string[]
    const standards = codes.map(code => ({ code, dok: 0, description: stdText(code) }))
    const split = finalMap && routeByStandard ? splitPossible(finalMap, dom) : null
    const mixed = !!split && isMultiDomain(split)
    const base = {
      name: name.trim(), domain: dom, max_score: maxScore, grade, type: category, date: date || null, description: notes.trim(),
      created_by: currentTeacher?.id || null, semester_id: semesterId, standards, sections: null, question_map: finalMap,
      ...(routeByStandard && finalMap ? { mixed, domain_split: split } : {}),
      ...(rubric ? { rubric: { name: rubric.name, band: rubric.band, criteria: rubric.criteria }, rubric_id: rubric.rubric_id } : {}),
    }
    let { data, error } = await supabase.from('assessments').insert({ ...base, english_class: englishClass }).select().single()
    // The routing columns need supabase/migration-mixed-assessments.sql. If
    // they are missing, still create the assessment (without routing) rather
    // than throw away the key the teacher just typed.
    if (error && /domain_split|mixed/.test(error.message)) {
      const { mixed: _m, domain_split: _d, ...plain } = base as any
      ;({ data, error } = await supabase.from('assessments').insert({ ...plain, english_class: englishClass }).select().single())
      if (!error) showToast(lang === 'ko' ? '영역별 배분 없이 생성됨: supabase/migration-mixed-assessments.sql을 실행하세요' : 'Created without domain routing: run supabase/migration-mixed-assessments.sql, then NOTIFY pgrst, \'reload schema\'')
    }
    if (error) { setSaving(false); showToast(`Error: ${error.message}`); return }
    if (share.size) await supabase.from('assessments').insert(Array.from(share).map(cls => ({ ...base, english_class: cls })))
    setSaving(false)
    showToast(lang === 'ko' ? `"${name}" 생성됨` : `Created "${name}"${share.size ? ` · shared with ${share.size} more` : ''}`)
    onCreated(data, rubric ? 'rubric' : finalMap ? 'key' : 'points')
  }

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const field = 'h-9 px-3 bg-surface border border-rule-2 rounded text-[13.5px] text-ink placeholder:text-ink-3 w-full'
  const label = 'eyebrow block mb-1.5'
  const typeLabel: Record<string, string> = { mc: 'MC', true_false: 'T/F', short_answer: 'Written', open_ended: 'Open', rubric: 'Rubric' }

  return (
    <div className="border border-rule-2 rounded-lg bg-surface">
      {/* Steps */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-rule-2">
        <div className="flex items-center gap-6 text-[13px]">
          {[[1, lang === 'ko' ? '설정' : 'Set up'], [2, scoring === 'rubric' ? (lang === 'ko' ? '루브릭' : 'Rubric') : scoring === 'points' ? (lang === 'ko' ? '총점' : 'Points') : (lang === 'ko' ? '정답 키' : 'Answer key')]].map(([n, l]) => (
            <button key={n} onClick={() => setStep(n as 1 | 2)} className={`flex items-center gap-2 ${step === n ? 'text-ink font-semibold' : 'text-ink-3'}`}>
              <span className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center ${step === n ? 'bg-accent text-white' : step > (n as number) ? 'bg-good text-white' : 'border border-rule-2'}`}>{step > (n as number) ? <Check size={11} /> : n}</span>{l}
            </button>
          ))}
          <span className="flex items-center gap-2 text-ink-3"><span className="w-5 h-5 rounded-full border border-rule-2 text-[11px] flex items-center justify-center">3</span>{lang === 'ko' ? '채점' : 'Score'}</span>
        </div>
        <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={15} /></button>
      </div>

      {step === 1 && (
        <div className="p-5 grid gap-4 max-w-[760px]">
          <div>
            <label htmlFor="na-name" className={label}>{lang === 'ko' ? '이름' : 'Name'}</label>
            <input ref={nameRef} id="na-name" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setStep(2) }} placeholder={lang === 'ko' ? '예: Unit 3 Comprehension Quiz' : 'e.g. Unit 3 Comprehension Quiz'} className={field} />
          </div>
          <div>
            <span className={label}>{lang === 'ko' ? '영역' : 'Domain'}</span>
            <div className="flex flex-wrap gap-1.5">{DOMAINS.map(d => <button key={d} onClick={() => setDom(d)} className={chip(dom === d)}>{DOMAIN_LABELS[d][lang === 'ko' ? 'ko' : 'en']}</button>)}</div>
          </div>
          <div>
            <span className={label}>{lang === 'ko' ? '유형' : 'Category'}</span>
            <div className="flex flex-wrap gap-1.5">{CATEGORIES.map(c => <button key={c.value} onClick={() => setCategory(c.value)} title={c.hint} className={chip(category === c.value)}>{lang === 'ko' ? c.ko : c.label}</button>)}</div>
          </div>
          <div>
            <span className={label}>{lang === 'ko' ? '채점 방식' : 'How will you score it?'}</span>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setScoring('key')} className={chip(scoring === 'key')} title={lang === 'ko' ? '정답 키를 입력하고 답안지로 채점' : 'Type the key, then bubble in answers'}>{lang === 'ko' ? '정답 키' : 'Answer key'}</button>
              <button onClick={() => setScoring('rubric')} className={chip(scoring === 'rubric')} title={lang === 'ko' ? '기준별 1–4 척도' : 'Criteria on a 1–4 scale'}>{lang === 'ko' ? '루브릭' : 'Rubric'}</button>
              <button onClick={() => setScoring('points')} className={chip(scoring === 'points')} title={lang === 'ko' ? '학생별 점수 하나' : 'One score per student'}>{lang === 'ko' ? '점수만' : 'Points only'}</button>
            </div>
          </div>
          <div className="grid grid-cols-[160px_140px_1fr] gap-4">
            <div><label htmlFor="na-date" className={label}>{lang === 'ko' ? '날짜' : 'Date'}</label><input id="na-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={field} /></div>
            <div><label htmlFor="na-points" className={label}>{lang === 'ko' ? '총점' : 'Total points'}</label><input id="na-points" type="number" min={1} value={scoring === 'key' && map.length ? String(keyTotal(map)) : points} disabled={scoring !== 'points'} onChange={e => setPoints(e.target.value)} className={`${field} tabular-nums disabled:text-ink-3`} />{scoring !== 'points' && <p className="text-[11px] text-ink-3 mt-1">{scoring === 'rubric' ? (lang === 'ko' ? '기준당 4점' : '4 per criterion') : (lang === 'ko' ? '정답 키에서 계산됨' : 'From the answer key')}</p>}</div>
            <div><label htmlFor="na-notes" className={label}>{lang === 'ko' ? '메모' : 'Notes'}</label><input id="na-notes" value={notes} onChange={e => setNotes(e.target.value)} className={field} placeholder={lang === 'ko' ? '선택' : 'optional'} /></div>
          </div>
          <div>
            <span className={label}>{lang === 'ko' ? '다른 반과 공유' : 'Also create for'}</span>
            <div className="flex flex-wrap gap-1.5">
              {ALL_ENGLISH_CLASSES.filter(c => c !== 'Unplaced' && c !== englishClass).map(c => (
                <button key={c} onClick={() => setShare(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n })} className={chip(share.has(c))}>{c}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            {scoring === 'points'
              ? <button onClick={() => create(false)} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5 disabled:opacity-60">{lang === 'ko' ? '생성 후 점수 입력' : 'Create and enter scores'} <ArrowRight size={13} /></button>
              : <button onClick={() => setStep(2)} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5">{scoring === 'rubric' ? (lang === 'ko' ? '루브릭 선택' : 'Next: choose a rubric') : (lang === 'ko' ? '정답 키 입력' : 'Next: answer key')} <ArrowRight size={13} /></button>}
          </div>
        </div>
      )}

      {step === 2 && scoring === 'rubric' && (
        <div className="p-5">
          <p className="text-[13px] text-ink-2 mb-3">{lang === 'ko' ? '템플릿이나 저장된 루브릭을 고르면 평가가 만들어지고 바로 채점할 수 있습니다.' : 'Pick a template or a saved rubric. The assessment is created with it and scoring opens right away.'}</p>
          <RubricPicker grade={grade} englishClass={englishClass} onClose={() => setStep(1)} onUse={r => create(false, r)} />
        </div>
      )}
      {step === 2 && scoring === 'key' && (
        <div className="p-5 grid gap-4">
          <div>
            <label htmlFor="na-key" className={label}>{lang === 'ko' ? '정답 키 입력 · 문자, T/F, 또는 서술형 점수' : 'Type the key · letters, T/F, or a number of points for written items'}</label>
            <textarea ref={keyRef} id="na-key" value={keyText} onChange={e => onKeyChange(e.target.value)} rows={2} spellCheck={false}
              placeholder="ACBDA BDCAB TF 2 2 3"
              className="w-full max-w-[760px] px-3 py-2 bg-paper-2 border border-rule-2 rounded font-mono text-[20px] tracking-[0.3em] text-ink placeholder:text-ink-3 placeholder:tracking-[0.3em]" />
            <p className="text-[12px] text-ink-2 mt-1.5">
              {lang === 'ko' ? '공백은 무시됩니다. ' : 'Spaces are ignored. '}<code className="px-1 bg-paper-2 border border-rule rounded">A–D</code> {lang === 'ko' ? '= 객관식 1점' : 'is a multiple-choice item worth 1 point'} · <code className="px-1 bg-paper-2 border border-rule rounded">T</code>/<code className="px-1 bg-paper-2 border border-rule rounded">F</code> {lang === 'ko' ? '= 참/거짓' : 'is true or false'} · <code className="px-1 bg-paper-2 border border-rule rounded">3</code> {lang === 'ko' ? '= 서술형 3점' : 'is a written item worth 3 points'} · <code className="px-1 bg-paper-2 border border-rule rounded">4r</code> {lang === 'ko' ? '= 루브릭 4점' : 'is rubric-scored out of 4'}. {lang === 'ko' ? '아래 항목을 클릭해 점수나 유형을 바꿀 수 있습니다.' : 'Click an item below to change its points or type.'}
            </p>
          </div>

          {map.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {map.map(q => (
                  <div key={q.num} className="relative">
                    <button onClick={() => setEditingQ(editingQ === q.num ? null : q.num)}
                      className={`min-w-[58px] border rounded text-center overflow-hidden ${editingQ === q.num ? 'border-accent' : 'border-rule-2'}`}>
                      <span className="block text-[10px] text-ink-3 bg-paper-2 tracking-wide">Q{q.num}{q.max_points !== 1 || !q.answer_key ? ` · ${q.max_points}pt` : ''}</span>
                      <span className={`block font-mono font-bold ${q.answer_key ? 'text-[15px]' : 'text-[10.5px] font-sans font-medium text-ink-2'} py-0.5 px-1 truncate max-w-[120px]`}>{q.answer_key || (q.type === 'rubric' && q.rubric ? q.rubric.name : typeLabel[q.type])}</span>
                      <span className="block text-[9.5px] text-info px-1 pb-0.5 min-h-[14px]">{q.standard || ''}</span>
                    </button>
                    {editingQ === q.num && (
                      <div className="absolute z-20 top-full left-0 mt-1 w-[220px] bg-surface border border-rule-2 rounded shadow-lg p-3 grid gap-2 text-[12px]">
                        <label className="grid gap-1"><span className="eyebrow">Points</span><input type="number" min={0} step={0.5} value={q.max_points} onChange={e => setQ(q.num, { max_points: Number(e.target.value) })} className="h-7 px-2 bg-surface border border-rule-2 rounded tabular-nums" /></label>
                        <label className="grid gap-1"><span className="eyebrow">Type</span>
                          <select value={q.type} onChange={e => setQ(q.num, { type: e.target.value as any, answer_key: (e.target.value === 'mc' || e.target.value === 'true_false') ? q.answer_key : undefined })} className="h-7 px-2 bg-surface border border-rule-2 rounded">
                            <option value="mc">Multiple choice</option><option value="true_false">True / false</option><option value="short_answer">Written · short answer</option><option value="open_ended">Written · open response</option><option value="rubric">Rubric</option>
                          </select></label>
                        {q.type === 'rubric' && (
                          <div className="grid gap-1"><span className="eyebrow">Rubric</span>
                            <div className="flex gap-1.5"><button onClick={() => setPickingRubricFor(q.num)} className="h-7 px-2 border border-rule-2 rounded text-ink-2 hover:text-ink flex-1 text-left truncate">{q.rubric ? `${q.rubric.name} · ${q.rubric.criteria.length} criteria` : (lang === 'ko' ? '루브릭 선택…' : 'Pick a rubric…')}</button>{q.rubric && <button onClick={() => setQ(q.num, { rubric: null })} className="h-7 px-2 border border-rule-2 rounded text-ink-3 hover:text-bad">×</button>}</div>
                            <span className="text-[10.5px] text-ink-3">{lang === 'ko' ? '기준당 4점. 루브릭 없이는 0–4 점수 하나.' : 'Scored criterion by criterion, 4 each. Without one, a single 0–4 mark.'}</span>
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

              <label className="flex items-start gap-2.5 text-[13px] text-ink cursor-pointer">
                <input type="checkbox" checked={routeByStandard} onChange={e => setRouteByStandard(e.target.checked)} className="mt-1" />
                <span>
                  <span className="font-medium">{lang === 'ko' ? '기준에 따라 영역별로 점수 배분' : 'Route each question to its standard’s domain'}</span>
                  <span className="block text-[12px] text-ink-3">{lang === 'ko' ? `RL/RI → 읽기, RF → 파닉스, W → 쓰기, SL → 말하기·듣기, L → 언어. 태그 없는 문항은 ${DL[dom][lang === 'ko' ? 'ko' : 'en']}로.` : `RL/RI to Reading, RF to Phonics, W to Writing, SL to Speaking & Listening, L to Language. Untagged questions go to ${DL[dom].en}.`}{routeByStandard && map.length ? ` · ${Object.entries(splitPossible(map, dom)).map(([d, n]) => `${DL[d as keyof typeof DL]?.[lang === 'ko' ? 'ko' : 'en'] || d} ${n}`).join(', ')}` : ''}</span>
                </span>
              </label>
              <div className="grid gap-2">
                <span className={label}>{lang === 'ko' ? '문항 범위별 배점' : 'Points by question range'}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-ink-3">Q</span>
                  <input id="na-prange" value={rangeText} onChange={e => setRangeText(e.target.value)} placeholder="1-10" className="h-7 w-[72px] px-2 bg-surface border border-rule-2 rounded text-[12px] tabular-nums" />
                  <span className="text-[12px] text-ink-3">{lang === 'ko' ? '문항당' : 'worth'}</span>
                  <input id="na-ppts" type="number" min={0} step={0.5} value={rangePoints} onChange={e => setRangePoints(e.target.value)} placeholder="2" className="h-7 w-[64px] px-2 bg-surface border border-rule-2 rounded text-[12px] tabular-nums" />
                  <span className="text-[12px] text-ink-3">{lang === 'ko' ? '점' : 'points each'}</span>
                  <button onClick={() => { const nums = parseRange(rangeText, map.length); const pts = Number(rangePoints); if (!nums.length || !(pts >= 0)) { showToast(lang === 'ko' ? '범위와 점수를 입력하세요' : 'Type a range and the points first'); return } setMap(prev => prev.map(q => nums.includes(q.num) && !(q.type === 'rubric' && q.rubric) ? { ...q, max_points: pts } : q)); setRangePoints('') }} className="h-7 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink">{lang === 'ko' ? '적용' : 'Apply'}</button>
                  <span className="text-[11.5px] text-ink-3">{lang === 'ko' ? '예: 객관식 2점, 서술형 5점. 루브릭 문항은 기준당 4점.' : 'e.g. multiple choice worth 2, a written item worth 5. Rubric items stay at 4 per criterion.'}</span>
                </div>
                <span className={label}>{lang === 'ko' ? '문항 범위별 기준 태그' : 'Tag standards by question range'}</span>
                <div className="flex flex-wrap items-center gap-2">
                  {groups.map(([code, nums]) => (
                    <span key={code} className="inline-flex items-center gap-1.5 border border-rule-2 rounded-full pl-2.5 pr-1 h-7 text-[12px] bg-surface" title={stdText(code)}>
                      <span className="text-info font-semibold">Q{rangeLabel(nums)}</span><span className="text-ink-2 truncate max-w-[220px]">{code} · {stdText(code).slice(0, 48)}{stdText(code).length > 48 ? '…' : ''}</span>
                      <button onClick={() => tagRange(nums, null)} className="w-5 h-5 rounded-full hover:bg-paper-2 text-ink-3 hover:text-bad flex items-center justify-center">×</button>
                    </span>
                  ))}
                  <span className="inline-flex items-center gap-1">
                    <span className="text-[12px] text-ink-3">Q</span>
                    <input id="na-range" value={rangeText} onChange={e => setRangeText(e.target.value)} placeholder="1-5" className="h-7 w-[72px] px-2 bg-surface border border-rule-2 rounded text-[12px] tabular-nums"
                      onKeyDown={e => { if (e.key === 'Enter') { const nums = parseRange(rangeText, map.length); if (nums.length) setPicking({ nums }) } }} />
                    <button onClick={() => { const nums = parseRange(rangeText, map.length); if (nums.length) setPicking({ nums }); else showToast(lang === 'ko' ? '범위를 입력하세요 (예: 1-5)' : 'Type a range like 1-5 first') }} className="h-7 px-2.5 rounded border border-rule-2 text-[12px] text-ink-2 hover:text-ink">+ {lang === 'ko' ? '기준 선택' : 'Pick standard'}</button>
                  </span>
                </div>
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-1 border-t border-rule">
            <p className="text-[12.5px] text-ink-3 pt-3">
              {map.length ? `${map.length} ${lang === 'ko' ? '문항' : 'items'} · ${keyTotal(map)} ${lang === 'ko' ? '점' : 'points'}` : (lang === 'ko' ? '키 없음: 총점을 직접 입력하고 학생별 점수를 입력합니다.' : 'No key: enter one score per student, the way it works today.')}
            </p>
            <div className="flex items-center gap-2 pt-3">
              <button onClick={() => setStep(1)} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{lang === 'ko' ? '뒤로' : 'Back'}</button>
              {map.length
                ? <button onClick={() => create(true)} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5 disabled:opacity-60">{lang === 'ko' ? '키 저장 후 채점 시작' : 'Save key and start scoring'} <ArrowRight size={13} /></button>
                : <button onClick={() => create(false)} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60">{lang === 'ko' ? '키 없이 생성' : 'Create without a key'}</button>}
            </div>
          </div>
        </div>
      )}

      {pickingRubricFor != null && <RubricPicker grade={grade} englishClass={englishClass} onClose={() => setPickingRubricFor(null)}
        onUse={r => { setQ(pickingRubricFor, { rubric: { name: r.name, criteria: r.criteria }, max_points: r.criteria.length * 4 }); setPickingRubricFor(null) }} />}
      {picking && <StandardPicker grade={grade} domain={dom} englishClass={englishClass} onClose={() => setPicking(null)} onPick={s => { tagRange(picking.nums, s.code); setPicking(null); setRangeText('') }} />}
    </div>
  )
}
