'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classToColor } from '@/lib/utils'
import { STRAND_LABEL, bookName, colorHex, type CurriculumBook } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, layoutPacing, placementLength, totalWeeks, yearWeeks, type CurriculumPlacement, type Term } from '@/lib/curriculumPacing'
import { addPacing, copyPlacements, createPlacement, deletePlacement, dropPacing, movePacing, setPacingWeeks, updatePlacementTerm } from '@/lib/curriculumPlacementsData'
import { usePlanner, type Planner } from './usePlanner'
import { ArrowDown, ArrowUp, Check, Copy, Loader2, Plus, Trash2, X } from 'lucide-react'

// ─── Placements: the master plan ─────────────────────────────────
// Admin picks a class, grade and year and places books in it for a term:
// every unit of the book gets a pacing row with the book's default weeks.
// Then the weeks and the order are tuned, units the class will not do are
// dropped, and the total is checked against the term. Nothing here has
// dates: the board adds the weeks up from the term's start.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)

export default function PlacementsView() {
  const { currentTeacher, language, showToast, confirmDialog, semesters, activeSemester } = useApp()
  const ko = language === 'ko'
  const me = currentTeacher?.id || ''
  const p = usePlanner()
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])
  const [cls, setCls] = useState<string>(PLACED_ENGLISH_CLASSES[0])
  const [grade, setGrade] = useState<number>(1)
  const [year, setYear] = useState<string>(activeSemester?.academic_year || '')
  const [placing, setPlacing] = useState(false)
  const [copying, setCopying] = useState(false)
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const yw = useMemo(() => yearWeeks(semesters, year || activeSemester?.academic_year || ''), [semesters, year, activeSemester])
  const theYear = year || activeSemester?.academic_year || ''

  const mine = p.placements.filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master)
  const seriesOf = (b: CurriculumBook) => p.series.find(s => s.id === b.series_id)
  const label = (pl: CurriculumPlacement) => { const b = p.books.find(x => x.id === pl.book_id); return b ? bookName(b, seriesOf(b)) : '?' }

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Run supabase/migration-curriculum-catalogue.sql first.' : 'The placements tables are missing. Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <label className="text-[11px] text-ink-3">{ko ? '반' : 'Class'}<br />
          <select value={cls} onChange={e => setCls(e.target.value)} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년' : 'Grade'}<br />
          <select value={grade} onChange={e => setGrade(Number(e.target.value))} className={sel}>{GRADES.map(g => <option key={g} value={g}>{ko ? `${g}학년` : `Grade ${g}`}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <span className="text-[12px] text-ink-3 pb-2">{ko ? `가을 ${yw.fall.length}주 · 봄 ${yw.spring.length}주` : `Fall ${yw.fall.length} wk · Spring ${yw.spring.length} wk`}{(!yw.fall.length || !yw.spring.length) && <span className="text-warn"> · {ko ? '설정의 학기 날짜가 필요합니다' : 'set the grading periods’ dates in Settings for the missing half'}</span>}</span>
        <span className="flex-1" />
        <button onClick={() => setCopying(c => !c)} className={btn}><Copy size={13} />{ko ? '다른 곳에서 복사' : 'Copy from…'}</button>
        <button onClick={() => setPlacing(s => !s)} className={btnP}><Plus size={13} />{ko ? '책 배치' : 'Place a book'}</button>
      </div>

      {copying && <CopyForm p={p} ko={ko} me={me} years={years} to={{ english_class: cls, grade, academic_year: theYear }} fail={fail} onDone={() => { setCopying(false); p.reload() }} />}
      {placing && <PlaceForm p={p} ko={ko} me={me} cls={cls} grade={grade} year={theYear} existing={mine} fail={fail} onDone={() => { setPlacing(false); p.reload() }} />}

      {mine.length === 0 && !placing && (
        <p className="text-[12.5px] text-ink-3">{ko ? '아직 배치된 책이 없습니다.' : `Nothing placed for ${cls} Grade ${grade} in ${theYear} yet. Place a book, or copy another grade’s placements and adjust.`}</p>
      )}

      <div className="flex flex-col gap-4">
        {mine.map(pl => <PlacementCard key={pl.id} pl={pl} p={p} ko={ko} label={label(pl)} length={placementLength(pl.term, yw)} fail={fail} confirmDialog={confirmDialog} />)}
      </div>

      {mine.length > 0 && (
        <p className="text-[11.5px] text-ink-3 mt-5 leading-relaxed">{ko ? '주 수는 학기 시작일부터 차례로 더해집니다. 단원을 빼면 그 반은 그 단원을 건너뜁니다.' : 'Weeks are added up from the start of the term in this order, so a longer unit pushes everything after it. Dropping a unit means this class skips it; the unit stays in the catalogue. Teachers’ own changes, pins and blank blocks come in the next phase.'}</p>
      )}
    </div>
  )
}

function PlacementCard({ pl, p, ko, label, length, fail, confirmDialog }: { pl: CurriculumPlacement; p: Planner; ko: boolean; label: string; length: number; fail: (e: string | null) => boolean; confirmDialog: (o: { title: string; message: string; confirmLabel?: string }) => Promise<boolean> }) {
  const book = p.books.find(b => b.id === pl.book_id)
  const series = book ? p.series.find(s => s.id === book.series_id) : undefined
  const rows = p.pacing.filter(r => r.placement_id === pl.id).sort((a, b) => a.sort_order - b.sort_order)
  const units = p.units.filter(u => u.book_id === pl.book_id).sort((a, b) => a.sort_order - b.sort_order)
  const bars = layoutPacing(rows, units)
  const total = totalWeeks(rows)
  const left = p.units.filter(u => u.book_id === pl.book_id && !rows.some(r => r.unit_id === u.id)).sort((a, b) => a.sort_order - b.sort_order)
  const [adding, setAdding] = useState('')
  const over = length > 0 && total > length
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '배치 삭제' : 'Remove this placement', message: ko ? `${label}을(를) ${pl.english_class} ${pl.grade}학년에서 뺍니다.` : `${label} comes out of ${pl.english_class} Grade ${pl.grade} for ${TERM_LABEL[pl.term].en.toLowerCase()} ${pl.academic_year}. Its pacing goes with it.`, confirmLabel: ko ? '삭제' : 'Remove' })) return
    if (!fail(await deletePlacement(pl.id, label))) p.reload()
  }
  return (
    <section className="border border-rule rounded">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-rule flex-wrap">
        <span className="font-display text-[26px] leading-none w-8 text-center" style={{ color: colorHex(series?.color || 'slate') }}>{book?.level_number || '·'}</span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{label}</p>
          <p className="text-[11.5px] text-ink-3">{series ? (ko ? STRAND_LABEL[series.strand].ko : STRAND_LABEL[series.strand].en) : ''} · {rows.length} {ko ? '단원' : rows.length === 1 ? 'unit' : 'units'} · <span className={over ? 'text-bad font-medium' : total === length && length ? 'text-good' : ''}>{num(total)} {ko ? '주' : 'wk'}{length ? ` / ${length}` : ''}</span>{over && <span className="text-bad"> · {ko ? `${num(total - length)}주 초과` : `${num(total - length)} wk over the term`}</span>}</p>
        </div>
        <span className="flex-1" />
        <select value={pl.term} onChange={async e => { if (!fail(await updatePlacementTerm(pl.id, e.target.value as Term, label))) p.reload() }} className={sel}>
          {(['fall', 'spring', 'year'] as Term[]).map(t => <option key={t} value={t}>{ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en}</option>)}
        </select>
        <button onClick={remove} className={btnS} aria-label="Remove placement"><Trash2 size={11} /></button>
      </div>
      {rows.length === 0 && <p className="px-4 py-3 text-[12.5px] text-ink-3">{ko ? '이 책에는 아직 단원이 없습니다. 책꽂이에서 먼저 색인하세요.' : 'This book has no units yet. Index it on the Bookshelf first, then add its units here.'}</p>}
      {rows.length > 0 && (
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wide text-ink-3"><th className="text-left font-medium px-4 py-1.5 w-10">#</th><th className="text-left font-medium py-1.5">{ko ? '단원' : 'Unit'}</th><th className="text-left font-medium py-1.5 w-28">{ko ? '주' : 'Weeks'}</th><th className="text-left font-medium py-1.5 w-28">{ko ? '위치' : 'Lands in'}</th><th className="w-40" /></tr></thead>
          <tbody>
            {bars.map((b, i) => (
              <tr key={b.pacing.id} className="border-t border-rule">
                <td className="px-4 py-1.5 text-ink-3">{i + 1}</td>
                <td className="py-1.5"><span className="text-ink">{b.unit.title}</span>{!b.unit.confirmed_at && <span className="ml-2 text-[10.5px] text-ink-3">{ko ? '미확인' : 'not confirmed'}</span>}</td>
                <td className="py-1.5"><WeeksInput value={b.pacing.weeks} onSave={async w => { if (!fail(await setPacingWeeks(b.pacing.id, w, `${label} · ${b.unit.title}`))) p.reload() }} /></td>
                <td className="py-1.5 tabular-nums text-ink-2">{b.start === b.end ? `wk ${num(b.start)}` : `wk ${num(b.start)}–${num(b.end)}`}{length && b.end > length ? <span className="text-bad"> ✕</span> : null}</td>
                <td className="py-1.5 pr-3 text-right">
                  <span className="inline-flex gap-1">
                    <button onClick={async () => { if (!fail(await movePacing(rows, b.pacing.id, -1))) p.reload() }} disabled={i === 0} className={btnS} aria-label="Up"><ArrowUp size={11} /></button>
                    <button onClick={async () => { if (!fail(await movePacing(rows, b.pacing.id, 1))) p.reload() }} disabled={i === bars.length - 1} className={btnS} aria-label="Down"><ArrowDown size={11} /></button>
                    <button onClick={async () => { if (!fail(await dropPacing(b.pacing.id, `${label} · ${b.unit.title}`))) p.reload() }} className={btnS} title={ko ? '이 반은 건너뜀' : 'This class skips this unit'}><X size={11} />{ko ? '빼기' : 'Drop'}</button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {left.length > 0 && (
        <div className="px-4 py-2 border-t border-rule flex items-center gap-2 flex-wrap text-[12px] text-ink-2">
          <span>{ko ? '빠진 단원' : 'Not in this plan'}:</span>
          <select value={adding} onChange={e => setAdding(e.target.value)} className={sel}><option value="">{ko ? '단원 고르기…' : 'Pick a unit…'}</option>{left.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select>
          <button disabled={!adding} onClick={async () => { const u = left.find(x => x.id === adding); if (!u) return; if (!fail(await addPacing(pl.id, u, rows.reduce((m, r) => Math.max(m, r.sort_order), 0), `${label} · ${u.title}`))) { setAdding(''); p.reload() } }} className={btnS}><Plus size={11} />{ko ? '추가' : 'Add'}</button>
        </div>
      )}
    </section>
  )
}

function WeeksInput({ value, onSave }: { value: number; onSave: (w: number) => Promise<void> }) {
  const [v, setV] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const commit = async () => { const w = parseFloat(v); if (Number.isNaN(w) || w === value) { setV(String(value)); return } setSaving(true); await onSave(w); setSaving(false) }
  return (
    <span className="inline-flex items-center gap-1">
      <input value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} inputMode="decimal" className="h-7 w-14 px-1.5 bg-surface border border-rule-2 rounded text-[12.5px] text-ink tabular-nums" />
      {saving && <Loader2 size={11} className="animate-spin text-ink-3" />}
    </span>
  )
}

function PlaceForm({ p, ko, me, cls, grade, year, existing, fail, onDone }: { p: Planner; ko: boolean; me: string; cls: string; grade: number; year: string; existing: CurriculumPlacement[]; fail: (e: string | null) => boolean; onDone: () => void }) {
  const [bookId, setBookId] = useState('')
  const [term, setTerm] = useState<Term>('year')
  const [saving, setSaving] = useState(false)
  const choices = p.books.filter(b => b.status !== 'retired').map(b => ({ b, s: p.series.find(s => s.id === b.series_id) })).sort((x, y) => (x.s?.sort_order || 0) - (y.s?.sort_order || 0) || (x.s?.name || '').localeCompare(y.s?.name || '') || x.b.level_number.localeCompare(y.b.level_number, undefined, { numeric: true }))
  const chosen = choices.find(c => c.b.id === bookId)
  const unitCount = chosen ? p.units.filter(u => u.book_id === chosen.b.id).length : 0
  const dup = chosen && existing.some(e => e.book_id === chosen.b.id && (e.term === term || e.term === 'year' || term === 'year'))
  const save = async () => {
    if (!chosen) return
    setSaving(true)
    const r = await createPlacement({ book_id: chosen.b.id, english_class: cls, grade, academic_year: year, term }, p.units.filter(u => u.book_id === chosen.b.id), me, bookName(chosen.b, chosen.s))
    setSaving(false)
    if (!fail(r.error)) onDone()
  }
  return (
    <div className="border border-rule-2 rounded p-4 mb-4 flex items-end gap-3 flex-wrap">
      <label className="text-[11px] text-ink-3">{ko ? '책' : 'Book'}<br />
        <select value={bookId} onChange={e => setBookId(e.target.value)} className={`${sel} min-w-[240px]`}>
          <option value="">{ko ? '책 고르기…' : 'Pick a book…'}</option>
          {choices.map(({ b, s }) => <option key={b.id} value={b.id}>{bookName(b, s)}{b.status === 'polled' ? (ko ? ' (투표 중)' : ' (in the poll)') : ''}</option>)}
        </select>
      </label>
      <label className="text-[11px] text-ink-3">{ko ? '기간' : 'Term'}<br />
        <select value={term} onChange={e => setTerm(e.target.value as Term)} className={sel}>{(['year', 'fall', 'spring'] as Term[]).map(t => <option key={t} value={t}>{ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en}</option>)}</select>
      </label>
      <span className="text-[12px] text-ink-3 pb-2">{chosen ? (unitCount ? (ko ? `단원 ${unitCount}개가 기본 주 수로 들어갑니다` : `${unitCount} units come in with their default weeks`) : (ko ? '단원 없음: 먼저 색인하세요' : 'no units yet; index it on the Bookshelf first')) : ''}{dup && <span className="text-warn"> · {ko ? '이미 배치됨' : 'already placed for this term'}</span>}</span>
      <span className="flex-1" />
      <button onClick={save} disabled={!chosen || saving || !!dup} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '배치' : 'Place'} · {cls} G{grade}</button>
      <button onClick={onDone} className={btn}>{ko ? '취소' : 'Cancel'}</button>
    </div>
  )
}

function CopyForm({ p, ko, me, years, to, fail, onDone }: { p: Planner; ko: boolean; me: string; years: string[]; to: { english_class: string; grade: number; academic_year: string }; fail: (e: string | null) => boolean; onDone: () => void }) {
  const { showToast } = useApp()
  const [from, setFrom] = useState({ english_class: to.english_class, grade: to.grade === 1 ? 2 : to.grade - 1, academic_year: to.academic_year })
  const [saving, setSaving] = useState(false)
  const n = p.placements.filter(x => x.english_class === from.english_class && x.grade === from.grade && x.academic_year === from.academic_year && x.is_master).length
  const same = from.english_class === to.english_class && from.grade === to.grade && from.academic_year === to.academic_year
  const go = async () => {
    setSaving(true)
    const r = await copyPlacements(from, to, p.placements, p.pacing, me)
    setSaving(false)
    if (!fail(r.error)) { showToast(ko ? `${r.copied}개 복사됨` : `${r.copied} placements copied`); onDone() }
  }
  return (
    <div className="border border-rule-2 rounded p-4 mb-4 flex items-end gap-3 flex-wrap">
      <span className="text-[12.5px] text-ink-2 pb-2">{ko ? '복사 원본:' : 'Copy the placements and pacing of'}</span>
      <select value={from.english_class} onChange={e => setFrom({ ...from, english_class: e.target.value })} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <select value={from.grade} onChange={e => setFrom({ ...from, grade: Number(e.target.value) })} className={sel}>{GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
      <select value={from.academic_year} onChange={e => setFrom({ ...from, academic_year: e.target.value })} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
      <span className="text-[12.5px] text-ink-2 pb-2">{ko ? `→ ${to.english_class} ${to.grade}학년 ${to.academic_year}` : `into ${to.english_class} Grade ${to.grade}, ${to.academic_year}`} <span className="text-ink-3">({n} {ko ? '개' : n === 1 ? 'placement' : 'placements'}{same ? (ko ? ', 같은 곳' : ', the same place') : ''})</span></span>
      <span className="flex-1" />
      <button onClick={go} disabled={saving || !n || same} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}{ko ? '복사' : 'Copy'}</button>
      <button onClick={onDone} className={btn}>{ko ? '취소' : 'Cancel'}</button>
    </div>
  )
}

export const classDot = (cls: string) => classToColor(cls as any)
