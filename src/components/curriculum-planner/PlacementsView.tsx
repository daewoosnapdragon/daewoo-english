'use client'

import Loading from '@/components/brand/Loading'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classDot } from '@/lib/utils'
import { STRAND_LABEL, bookName, colorHex, levelShort, splitUnitTitle, type CurriculumBook, type CurriculumUnit } from '@/lib/curriculumCore'
import { TERMS, TERM_LABEL, academicYears, groupByModule, layoutPacing, masterRows, placementLength, reviewOf, termsFor, totalWeeks, yearWeeks, holidayWeeks, termDates, type HolidayCounts, type CurriculumPlacement, type Term, type YearWeeks } from '@/lib/curriculumPacing'
import { addPacingMany, copyPlacements, createPlacement, deletePlacement, dropPacing, dropPacingMany, movePacing, setReviewWeeks, setAimDate, setPacingWeeks, updatePlacementTerm } from '@/lib/curriculumPlacementsData'
import { usePlanner, type Planner } from './usePlanner'
import PeriodsLine from './PeriodsLine'
import StoryPicker from './StoryPicker'
import { ArrowDown, ArrowUp, Check, Copy, Loader2, Plus, Scissors, Trash2, X } from 'lucide-react'
import { unitsInRange } from '@/lib/yearPlan'
import { needsUpdate } from '@/lib/dbUpdate'

// ─── Books by class: every class plan at a glance (admin) ───────────────────
// One grid for the year: a row per level, a column per grade, each book as
// a chip. Placing a book opens its contents as a checklist; the ticked units
// or stories go in the book's order at their suggested lengths. Click a chip
// for its list: change a length, reorder, drop or add units, set an aim
// date. Copy brings another grade's books over. Class plans shows the same
// plans as a timeline. The opened book shows right under its row.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[length:calc(12.5px*var(--ts))] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnSBase = 'h-7 px-2 rounded border text-[length:calc(11.5px*var(--ts))] disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const btnS = `${btnSBase} border-rule-2 text-ink-2 hover:text-ink`
/** A small toggle that is on: ink fill with paper text (btnS's ink-2 text would win and hide the label). */
const btnSOn = `${btnSBase} bg-ink text-paper border-ink`
const badge = 'inline-flex items-center h-4 px-1 rounded bg-paper-3 text-ink-3 text-[length:calc(11.5px*var(--ts))] font-semibold tracking-wide shrink-0'
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const rowKey = (cls: string, grade: number) => `${cls}|${grade}`

export default function MapView() {
  const { currentTeacher, language, showToast, confirmDialog, semesters, activeSemester } = useApp()
  const ko = language === 'ko'
  const me = currentTeacher?.id || ''
  const p = usePlanner()
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])
  const [year, setYear] = useState<string>(activeSemester?.academic_year || '')
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  // A half with no dates in Settings is not offered, and its tags are not shown.
  const terms = useMemo(() => termsFor(yw), [yw])
  // Holiday weeks per grade, so a placement's length here is the teaching weeks the board counts.
  const [away, setAway] = useState<Record<number, AwayDay[]>>({})
  useEffect(() => {
    const sp = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = sp.start || f.start, to = f.end || sp.end
    if (!from || !to) { setAway({}); return }
    let on = true
    Promise.all(GRADES.map(g => loadAwayDays(from, to, g).then(a => [g, a] as const))).then(all => { if (on) setAway(Object.fromEntries(all)) })
    return () => { on = false }
  }, [semesters, theYear])
  const hcOf = (grade: number): HolidayCounts => { const a = away[grade] || []; return { spring: holidayWeeks(a, yw.spring).size, fall: holidayWeeks(a, yw.fall).size } }
  const [open, setOpen] = useState<string | null>(null)        // a placement id
  const [placing, setPlacing] = useState<string | null>(null)  // a cell key
  const [copying, setCopying] = useState<string | null>(null)  // a cell key
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const seriesOf = (b: CurriculumBook) => p.series.find(s => s.id === b.series_id)
  const label = (pl: CurriculumPlacement) => { const b = p.books.find(x => x.id === pl.book_id); return b ? bookName(b, seriesOf(b)) : '?' }
  const masters = p.placements.filter(x => x.academic_year === theYear && x.is_master)
  const cellOf = (key: string) => { const [cls, g] = key.split('|'); return { cls, grade: Number(g) } }
  const activeKey = placing || copying || (open ? (() => { const pl = masters.find(x => x.id === open); return pl ? rowKey(pl.english_class, pl.grade) : null })() : null)
  // Bring the panel into view when it opens (it sits under its row, so this is usually a small nudge or nothing).
  const panelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => { panelRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [activeKey, open])

  if (p.loading) return <Loading rows={5} />
  if (p.missing) return <p className="text-[length:calc(12.5px*var(--ts))] text-warn">{/* supabase/migration-curriculum-catalogue.sql, supabase/migration-curriculum-placements.sql */}{p.missing === 'catalogue' ? needsUpdate({ en: 'curriculum catalog', ko: '교재 목록' }, ko) : needsUpdate({ en: 'curriculum placements', ko: '교재 배치' }, ko)}</p>

  const TERM_TAG: Record<Term, string> = { spring: ko ? '봄' : 'Sp', fall: ko ? '가을' : 'F', year: ko ? '한 해' : 'Yr' }
  const showTags = terms.length > 1 || masters.some(x => !terms.includes(x.term))
  const chip = (pl: CurriculumPlacement) => {
    const book = p.books.find(b => b.id === pl.book_id)
    const se = book ? seriesOf(book) : undefined
    const rows = masterRows(p.pacing, pl.id)
    const length = placementLength(pl.term, yw, hcOf(pl.grade))
    const total = totalWeeks(rows)
    const over = length > 0 && total > length + 0.01
    const on = open === pl.id
    const color = colorHex(se?.color || 'slate')
    const what = se?.kind === 'anthology' ? (ko ? `${rows.length}편` : `${rows.length} ${rows.length === 1 ? 'story' : 'stories'}`) : (ko ? `${rows.length}개` : `${rows.length} ${rows.length === 1 ? 'unit' : 'units'}`)
    return (
      <button key={pl.id} onClick={() => { setOpen(on ? null : pl.id); setPlacing(null); setCopying(null) }}
        className={`w-full flex items-center gap-1.5 rounded px-1.5 py-1 text-left border ${on ? 'border-ink bg-paper-2' : 'border-rule hover:border-rule-2 bg-surface'}`} style={{ borderLeft: `3px solid ${color}` }} title={`${label(pl)} · ${TERM_LABEL[pl.term].en}`}>
        <span className="font-display text-[length:calc(15px*var(--ts))] leading-none shrink-0" style={{ color }}>{levelShort(book?.level_number) || '·'}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[length:calc(11.5px*var(--ts))] font-medium text-ink truncate">{se?.name || '?'}</span>
          <span className="block text-[length:calc(11.5px*var(--ts))] truncate text-ink-3">{book && levelShort(book.level_number) !== book.level_number ? `${book.level_number} · ` : ''}{what}{over ? (ko ? ` · ${num(total - length)}주 초과` : ` · ${num(total - length)} wk over`) : ''}</span>
        </span>
        {showTags && <span className={`shrink-0 text-[length:calc(11.5px*var(--ts))] font-semibold px-1 rounded ${pl.term === 'year' ? 'bg-ink text-paper' : 'bg-paper-3 text-ink-2'}`}>{TERM_TAG[pl.term]}</span>}
      </button>
    )
  }

  const opened = open ? masters.find(x => x.id === open) : undefined
  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-2">
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => { setYear(e.target.value); setOpen(null); setPlacing(null); setCopying(null) }} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <span className="text-[length:calc(12px*var(--ts))] text-ink-3 pb-2">{terms.filter(t => t !== 'year').map(t => `${ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en} ${yw[t as 'spring' | 'fall'].length}${ko ? '주' : ' wk'}`).join(' · ')} · {masters.length} {ko ? '개 배치' : masters.length === 1 ? 'book placed' : 'books placed'}</span>
      </div>
      <div className="mb-4"><PeriodsLine year={theYear} /></div>

      <div className="border border-rule rounded overflow-hidden bg-surface">
        <div className="grid border-b border-rule text-[length:calc(12px*var(--ts))] text-ink-2" style={{ gridTemplateColumns: `130px repeat(${GRADES.length}, minmax(0, 1fr))` }}>
          <div className="px-3 py-2">{ko ? '레벨' : 'Level'}</div>
          {GRADES.map(g => <div key={g} className="px-2 py-2 border-l border-rule">{ko ? `${g}학년` : `Grade ${g}`}</div>)}
        </div>
        {PLACED_ENGLISH_CLASSES.map(cls => (
          <Fragment key={cls}>
          <div className="grid border-b border-rule last:border-b-0" style={{ gridTemplateColumns: `130px repeat(${GRADES.length}, minmax(0, 1fr))` }}>
            <div className="px-3 py-2 flex items-start gap-2 pt-3">
              <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ background: classDot(cls as any) }} />
              <span className="text-[length:calc(12.5px*var(--ts))] font-semibold text-ink">{cls}</span>
            </div>
            {GRADES.map(grade => {
              const key = rowKey(cls, grade)
              const mine = masters.filter(x => x.english_class === cls && x.grade === grade).sort((a, b) => TERMS.indexOf(a.term) - TERMS.indexOf(b.term))
              const active = activeKey === key
              return (
                <div key={key} className={`border-l border-rule p-1.5 flex flex-col gap-1 min-h-[64px] ${active ? 'bg-paper-2' : ''}`}>
                  {mine.map(chip)}
                  <div className="flex gap-1 mt-auto pt-0.5">
                    <button onClick={() => { setPlacing(placing === key ? null : key); setCopying(null); setOpen(null) }} className={`h-6 px-1.5 rounded text-[length:calc(11.5px*var(--ts))] inline-flex items-center gap-1 ${placing === key ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink hover:bg-paper-2'}`}><Plus size={10} />{ko ? '배치' : 'Place'}</button>
                    <button onClick={() => { setCopying(copying === key ? null : key); setPlacing(null); setOpen(null) }} className={`h-6 px-1.5 rounded text-[length:calc(11.5px*var(--ts))] inline-flex items-center ${copying === key ? 'bg-ink text-paper' : 'text-ink-3 hover:text-ink hover:bg-paper-2'}`} title={ko ? '다른 곳에서 복사' : 'Copy another grade\u2019s books here'}><Copy size={10} /></button>
                  </div>
                </div>
              )
            })}
          </div>
          {/* The opened book, or the place and copy forms, right under the row that was clicked. */}
          {(placing || copying || opened) && activeKey && cellOf(activeKey).cls === cls && (
        <div ref={panelRef} className="border-b border-rule bg-paper-2 p-3 flex flex-col gap-2">
          <p className="text-[length:calc(12px*var(--ts))] text-ink-2">{(() => { const k = activeKey ? cellOf(activeKey) : null; return k ? `${k.cls} · ${ko ? `${k.grade}학년` : `Grade ${k.grade}`}` : '' })()}</p>
          {placing && <PlaceForm terms={terms} p={p} ko={ko} me={me} cls={cellOf(placing).cls} grade={cellOf(placing).grade} year={theYear} existing={masters.filter(x => x.english_class === cellOf(placing).cls && x.grade === cellOf(placing).grade)} fail={fail} onDone={() => { setPlacing(null); p.reload() }} />}
          {copying && <CopyForm p={p} ko={ko} me={me} years={years} to={{ english_class: cellOf(copying).cls, grade: cellOf(copying).grade, academic_year: theYear }} fail={fail} onDone={() => { setCopying(null); p.reload() }} />}
          {opened && <PlacementCard terms={terms} hc={hcOf(opened.grade)} pl={opened} p={p} ko={ko} label={label(opened)} yw={yw} fail={fail} confirmDialog={confirmDialog} onRemoved={() => setOpen(null)} />}
        </div>
          )}
          </Fragment>
        ))}
      </div>

      <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 mt-4 leading-relaxed">{ko ? '칩을 누르면 목록을 봅니다.' : `Click a chip for its list.${showTags ? ' Sp and F are the spring and fall halves; Yr runs across both.' : ''}`}</p>
    </div>
  )
}

// ─── One book's plan ─────────────────────────────────────────────
export function PlacementCard({ pl, p, ko, label, yw, fail, confirmDialog, onRemoved, terms = TERMS, hc }: { terms?: Term[]; hc?: HolidayCounts; pl: CurriculumPlacement; p: Planner; ko: boolean; label: string; yw: YearWeeks; fail: (e: string | null) => boolean; confirmDialog: (o: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>; onRemoved: () => void }) {
  const book = p.books.find(b => b.id === pl.book_id)
  const series = book ? p.series.find(s => s.id === book.series_id) : undefined
  const anthology = series?.kind === 'anthology'
  const rows = masterRows(p.pacing, pl.id).sort((a, b) => a.sort_order - b.sort_order)
  const units = p.units.filter(u => u.book_id === pl.book_id).sort((a, b) => a.sort_order - b.sort_order)
  const length = placementLength(pl.term, yw, hc)
  // The unit rows of the list; review weeks show as a column, and move the weeks of the units after them.
  const bars = layoutPacing(rows, units).filter(b => !b.review)
  const total = totalWeeks(rows)
  const left = units.filter(u => !rows.some(r => r.unit_id === u.id))
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  // Keep a range: the units now in the list, so a long book (Science of Reading) is cut to this year's part in one go.
  const listed = rows.map(r => units.find(u => u.id === r.unit_id)).filter((u): u is CurriculumUnit => !!u)
  const [range, setRange] = useState<{ from: string; to: string } | null>(null)
  const kept = range ? unitsInRange(listed, range.from, range.to) : []
  const keptIds = new Set(kept.map(u => u.id))
  const keptWeeks = totalWeeks(rows.filter(r => keptIds.has(r.unit_id)))
  const keepRange = async () => {
    setBusy(true)
    if (!fail(await dropPacingMany(rows.filter(r => !keptIds.has(r.unit_id)).map(r => r.id), label))) { setRange(null); await p.reload() }
    setBusy(false)
  }
  const over = length > 0 && total > length + 0.01
  const done = new Set(p.done.filter(d => d.placement_id === pl.id).map(d => d.unit_id))
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '배치 삭제' : 'Take this book out', message: ko ? `${label}을(를) ${pl.english_class} ${pl.grade}학년에서 뺍니다.` : `${label} comes out of ${pl.english_class} Grade ${pl.grade} for ${TERM_LABEL[pl.term].en.toLowerCase()} ${pl.academic_year}, with its list of ${anthology ? 'stories' : 'units'}.`, confirmLabel: ko ? '삭제' : 'Remove' })) return
    if (!fail(await deletePlacement(pl.id, label))) { onRemoved(); p.reload() }
  }
  const addPicked = async () => { setBusy(true); const chosen = units.filter(u => picked.has(u.id)); if (!fail(await addPacingMany(pl.id, chosen, rows, label))) { setPicking(false); setPicked(new Set()); await p.reload() } setBusy(false) }
  const groups = groupByModule(bars.map(b => ({ ...b, title: b.unit.title, sort_order: b.pacing.sort_order })))
  const showGroups = groups.length > 1 || (groups[0] && groups[0].label !== 'Other')
  const noun = (k: number) => anthology ? (ko ? '편' : k === 1 ? 'story' : 'stories') : (ko ? '단원' : k === 1 ? 'unit' : 'units')
  let n = 0
  return (
    <section className="border border-rule rounded bg-surface">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-rule flex-wrap">
        <span className="font-display text-[length:calc(26px*var(--ts))] leading-none min-w-8 text-center" style={{ color: colorHex(series?.color || 'slate') }}>{levelShort(book?.level_number) || '·'}</span>
        <div className="min-w-0">
          <p className="text-[length:calc(14px*var(--ts))] font-semibold text-ink">{label}</p>
          <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{series ? (ko ? STRAND_LABEL[series.strand].ko : STRAND_LABEL[series.strand].en) : ''} · {rows.length} {noun(rows.length)} · {num(total)} {ko ? '주' : 'wk'}{length ? (ko ? ` / 학기 ${length}주` : ` of ${length} in the term`) : ''}{over ? (ko ? ` · ${num(total - length)}주 넘침` : ` · runs ${num(total - length)} wk past it`) : ''}</p>
        </div>
        <span className="flex-1" />
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3 inline-flex items-center gap-1.5">{ko ? '목표일' : 'Aim to finish by'}
          <input type="date" value={pl.aim_date || ''} onChange={async e => { if (!fail(await setAimDate(pl.id, e.target.value || null, label))) p.reload() }} className={`${sel} w-[140px]`} />
        </label>
        {!anthology && listed.length > 2 && <button onClick={() => { setRange(r => r ? null : { from: listed[0].id, to: listed[listed.length - 1].id }); setPicking(false) }} className={range ? btnSOn : btnS} title={ko ? '처음과 끝 단원을 골라 그 사이만 남깁니다' : 'Pick a first and last unit; the units outside them come out'}><Scissors size={11} />{ko ? '범위만 남기기' : 'Keep a range'}</button>}
        {left.length > 0 && <button onClick={() => { setPicking(s => !s); setPicked(new Set()); setRange(null) }} className={picking ? btnSOn : btnS}><Plus size={11} />{anthology ? (ko ? '이야기 추가' : 'Add stories') : (ko ? '단원 추가' : 'Add units')}</button>}
        <select value={pl.term} onChange={async e => { if (!fail(await updatePlacementTerm(pl.id, e.target.value as Term, label))) p.reload() }} className={sel}>
          {(terms.includes(pl.term) ? terms : [pl.term, ...terms]).map(t => <option key={t} value={t}>{ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en}</option>)}
        </select>
        <button onClick={remove} className={btnS} aria-label="Remove this book"><Trash2 size={11} />{ko ? '배치 삭제' : 'Remove'}</button>
      </div>
      {range && (
        <div className="px-4 py-3 border-b border-rule bg-paper-2 flex items-center gap-x-3 gap-y-2 flex-wrap">
          <UnitRange units={listed} from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} ko={ko} />
          <span className="text-[length:calc(12px*var(--ts))] text-ink-2 tabular-nums">{ko ? `${kept.length}개 남김 · ${num(keptWeeks)}주` : `Keeps ${kept.length} ${noun(kept.length)}, ${num(keptWeeks)} wk${length ? ` of ${length} in the term` : ''}; ${listed.length - kept.length} come out`}</span>
          <span className="flex-1" />
          <button onClick={keepRange} disabled={busy || !kept.length || kept.length === listed.length} className={btnP}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Scissors size={13} />}{ko ? `${kept.length}개만 남기기` : `Keep these ${kept.length}`}</button>
          <button onClick={() => setRange(null)} className={btn}>{ko ? '취소' : 'Cancel'}</button>
        </div>
      )}
      {picking && (
        <div className="px-4 py-3 border-b border-rule bg-paper-2 flex flex-col gap-2">
          <StoryPicker units={left} selected={picked} onChange={setPicked} ko={ko} />
          <div className="flex gap-2"><button onClick={addPicked} disabled={busy || !picked.size} className={btnP}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{ko ? `${picked.size}개 추가` : `Add ${picked.size} ${noun(picked.size)}`}</button><button onClick={() => setPicking(false)} className={btn}>{ko ? '취소' : 'Cancel'}</button></div>
        </div>
      )}
      {rows.length === 0 && <p className="px-4 py-3 text-[length:calc(12.5px*var(--ts))] text-ink-3">{units.length ? (ko ? '아직 고른 것이 없습니다. 추가를 누르세요.' : `Nothing picked yet. Press Add ${anthology ? 'stories' : 'units'}.`) : (ko ? '이 책에는 아직 단원이 없습니다. 책꽂이에서 먼저 색인하세요.' : 'This book has no units yet. Add them on the Bookshelf first.')}</p>}
      {rows.length > 0 && (
        <table className="w-full text-[length:calc(12.5px*var(--ts))]">
          <thead><tr className="text-[length:calc(12px*var(--ts))] text-ink-2"><th className="text-left font-medium px-4 py-1.5 w-10">#</th><th className="text-left font-medium py-1.5">{anthology ? (ko ? '이야기' : 'Story') : (ko ? '단원' : 'Unit')}</th><th className="text-left font-medium py-1.5 w-28">{ko ? '주' : 'Weeks'}</th><th className="text-left font-medium py-1.5 w-28">{ko ? '위치' : 'Weeks of the term'}</th><th className="text-left font-medium py-1.5 w-24">{ko ? '뒤 복습' : 'Review after'}</th><th className="w-48" /></tr></thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.key}>
                {showGroups && <tr className="border-t border-rule bg-paper"><td colSpan={6} className="px-4 py-1 text-[length:calc(12px*var(--ts))] text-ink-2">{g.label}</td></tr>}
                {g.units.map(b => {
                  n += 1; const i = n - 1
                  const t = splitUnitTitle(b.unit.title)
                  return (
                    <tr key={b.pacing.id} className="border-t border-rule">
                      <td className="px-4 py-1.5 text-ink-3">{i + 1}</td>
                      <td className="py-1.5"><span className="inline-flex items-center gap-2 min-w-0">{t.badge && !showGroups && <span className={badge}>{t.badge}</span>}{t.badge && showGroups && /^M\d+/i.test(t.badge) && <span className={badge}>{t.badge}</span>}<span className="text-ink">{t.name}</span>{done.has(b.unit.id) && <span className="text-[length:calc(11.5px*var(--ts))] text-good inline-flex items-center gap-0.5"><Check size={10} />{ko ? '끝남' : 'done'}</span>}</span></td>
                      <td className="py-1.5"><WeeksInput key={`${b.pacing.id}-${b.pacing.weeks}`} value={b.pacing.weeks} onSave={async w => { if (!fail(await setPacingWeeks(b.pacing.id, w, `${label} · ${b.unit.title}`))) p.reload() }} /></td>
                      <td className="py-1.5 tabular-nums text-ink-2">{b.start === b.end ? `${num(b.start)}` : `${num(b.start)}–${num(b.end)}`}{length && b.end > length + 0.01 ? <span className="text-ink-3">{ko ? ' (학기 뒤)' : ' (after the term)'}</span> : null}</td>
                      <td className="py-1.5">
                        <select aria-label={ko ? `${t.name} 뒤 복습` : `Review after ${t.name}`} value={String(reviewOf(b.pacing))} onChange={async e => { if (!fail(await setReviewWeeks([{ id: b.pacing.id, review_weeks: Number(e.target.value) }], `${label} · ${b.unit.title}`))) p.reload() }}
                          className={`h-7 px-1 bg-surface border rounded text-[length:calc(12px*var(--ts))] ${reviewOf(b.pacing) ? 'border-ink text-ink font-semibold' : 'border-rule-2 text-ink-3'}`}>
                          {[0, 0.5, 1, 2].map(x => <option key={x} value={String(x)}>{x === 0 ? '—' : x === 0.5 ? (ko ? '½주' : '½ wk') : `${x} ${ko ? '주' : 'wk'}`}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 pr-3 text-right">
                        <span className="inline-flex gap-1">
                          <button onClick={async () => { if (!fail(await movePacing(rows, b.pacing.id, -1))) p.reload() }} disabled={i === 0} className={btnS} aria-label="Up"><ArrowUp size={11} /></button>
                          <button onClick={async () => { if (!fail(await movePacing(rows, b.pacing.id, 1))) p.reload() }} disabled={i === bars.length - 1} className={btnS} aria-label="Down"><ArrowDown size={11} /></button>
                          <button onClick={async () => { if (!fail(await dropPacing(b.pacing.id, `${label} · ${b.unit.title}`))) p.reload() }} className={btnS} title={ko ? '이 반은 건너뜀' : 'This class skips it'}><X size={11} />{ko ? '빼기' : 'Drop'}</button>
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

export function WeeksInput({ value, onSave }: { value: number; onSave: (w: number) => Promise<void> }) {
  const [v, setV] = useState(String(value))
  const [saving, setSaving] = useState(false)
  const commit = async () => { const w = parseFloat(v); if (Number.isNaN(w) || w === value) { setV(String(value)); return } setSaving(true); await onSave(w); setSaving(false) }
  return (
    <span className="inline-flex items-center gap-1">
      <input value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} inputMode="decimal" className="h-7 w-14 px-1.5 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink tabular-nums" />
      {saving && <Loader2 size={11} className="animate-spin text-ink-3" />}
    </span>
  )
}

// ─── Place a book ────────────────────────────────────────────────
export function PlaceForm({ p, ko, me, cls, grade, year, existing, fail, onDone, terms = TERMS, initialBookId = '', initialTerm }: { terms?: Term[]; p: Planner; ko: boolean; me: string; cls: string; grade: number; year: string; existing: CurriculumPlacement[]; fail: (e: string | null) => boolean; onDone: () => void; initialBookId?: string; initialTerm?: Term }) {
  const [bookId, setBookId] = useState(initialBookId)
  const [term, setTerm] = useState<Term>(initialTerm && terms.includes(initialTerm) ? initialTerm : terms.includes('year') ? 'year' : terms[0])
  // A suggested sequence book starts with all its units ticked; an anthology's stories are still picked by hand.
  const [picked, setPicked] = useState<Set<string>>(() => {
    const b = initialBookId ? p.books.find(x => x.id === initialBookId) : undefined
    const s = b ? p.series.find(x => x.id === b.series_id) : undefined
    return b && s?.kind !== 'anthology' ? new Set(p.units.filter(u => u.book_id === b.id).map(u => u.id)) : new Set()
  })
  const [saving, setSaving] = useState(false)
  const choices = p.books.filter(b => b.status !== 'retired').map(b => ({ b, s: p.series.find(s => s.id === b.series_id) })).sort((x, y) => (x.s?.sort_order || 0) - (y.s?.sort_order || 0) || (x.s?.name || '').localeCompare(y.s?.name || '') || x.b.level_number.localeCompare(y.b.level_number, undefined, { numeric: true }))
  const chosen = choices.find(c => c.b.id === bookId)
  const anthology = chosen?.s?.kind === 'anthology'
  const units = useMemo(() => chosen ? p.units.filter(u => u.book_id === chosen.b.id).sort((a, b) => a.sort_order - b.sort_order) : [], [chosen, p.units])
  const dup = chosen && existing.some(e => e.book_id === chosen.b.id && (e.term === term || e.term === 'year' || term === 'year'))
  // Other placements of the same book, as starting points for the pick.
  const presets = useMemo(() => {
    if (!chosen) return []
    const all = anthology ? [] : [{ label: ko ? '모든 단원' : 'All units', ids: units.map(u => u.id) }]
    return all.concat(p.placements.filter(x => x.book_id === chosen.b.id && x.is_master && !(x.english_class === cls && x.grade === grade && x.academic_year === year))
      .map(x => ({ label: `${x.english_class} G${x.grade}${x.academic_year !== year ? ` ${x.academic_year}` : ''}`, ids: p.pacing.filter(r => r.placement_id === x.id && r.owner === 'master').map(r => r.unit_id) }))
      .filter(x => x.ids.length).slice(0, 4))
  }, [chosen, anthology, units, p.placements, p.pacing, cls, grade, year, ko])
  const toPlace: CurriculumUnit[] = units.filter(u => picked.has(u.id))
  const save = async () => {
    if (!chosen) return
    setSaving(true)
    const r = await createPlacement({ book_id: chosen.b.id, english_class: cls, grade, academic_year: year, term }, toPlace, me, bookName(chosen.b, chosen.s))
    setSaving(false)
    if (!fail(r.error)) onDone()
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end gap-3 flex-wrap">
        <span className="text-[length:calc(12.5px*var(--ts))] text-ink pb-2 font-medium">{cls} · {ko ? `${grade}학년` : `Grade ${grade}`}</span>
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '책' : 'Book'}<br />
          <select value={bookId} onChange={e => { setBookId(e.target.value); setPicked(new Set()) }} className={`${sel} min-w-[240px]`} autoFocus>
            <option value="">{ko ? '책 고르기…' : 'Pick a book…'}</option>
            {choices.map(({ b, s }) => <option key={b.id} value={b.id}>{bookName(b, s)}{s?.kind === 'anthology' ? (ko ? ' (선집)' : ' (anthology)') : ''}</option>)}
          </select>
        </label>
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '기간' : 'Term'}<br />
          <select value={term} onChange={e => setTerm(e.target.value as Term)} className={sel}>{terms.map(t => <option key={t} value={t}>{ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en}</option>)}</select>
        </label>
        <span className="text-[length:calc(12px*var(--ts))] text-ink-3 pb-2">{chosen && !units.length ? (ko ? '단원 없음: 먼저 색인하세요' : 'no units yet; index it on the Bookshelf first') : ''}{dup && <span className="text-warn"> · {ko ? '이미 배치됨' : 'already placed for this term'}</span>}</span>
        <span className="flex-1" />
        <button onClick={save} disabled={!chosen || saving || !!dup || !picked.size} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? `${picked.size}개 배치` : `Place ${picked.size} ${anthology ? (picked.size === 1 ? 'story' : 'stories') : (picked.size === 1 ? 'unit' : 'units')}`}</button>
        <button onClick={onDone} className={btn}>{ko ? '취소' : 'Cancel'}</button>
      </div>
      {chosen && units.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[length:calc(12px*var(--ts))] text-ink-2">{anthology ? (ko ? '이 반이 읽을 이야기를 고르세요. 책의 순서대로, 제안된 길이로 들어갑니다.' : 'Tick the stories this class will read. They go in the book’s order at their suggested lengths; change any length in the list.') : (ko ? '이 반이 할 단원을 고르세요. 책의 순서대로, 제안된 길이로 들어갑니다.' : 'Tick the units this class will do, or press All units. They go in the book’s order at their suggested lengths; change any length in the list.')}</p>
          {!anthology && units.length > 2 && (() => {
            const ticked = units.filter(u => picked.has(u.id))
            const from = ticked[0]?.id || units[0].id, to = ticked[ticked.length - 1]?.id || units[units.length - 1].id
            return <div className="flex items-center gap-3 flex-wrap">
              <UnitRange units={units} from={from} to={to} onChange={(f, t) => setPicked(new Set(unitsInRange(units, f, t).map(u => u.id)))} ko={ko} />
              <span className="text-[length:calc(12px*var(--ts))] text-ink-3 tabular-nums">{ko ? `${ticked.length}개 · ${num(ticked.reduce((a, u) => a + (u.default_weeks || 2), 0))}주` : `${ticked.length} ${ticked.length === 1 ? 'unit' : 'units'}, ${num(ticked.reduce((a, u) => a + (u.default_weeks || 2), 0))} wk`}</span>
            </div>
          })()}
          <StoryPicker units={units} selected={picked} onChange={setPicked} ko={ko} presets={presets} />
        </div>
      )}
    </div>
  )
}

/** "Units from [first] to [last]": a run of a sequence book's units in two picks, numbered as in the book. */
function UnitRange({ units, from, to, onChange, ko }: { units: CurriculumUnit[]; from: string; to: string; onChange: (from: string, to: string) => void; ko: boolean }) {
  const opts = units.map(u => <option key={u.id} value={u.id}>{u.sort_order}. {splitUnitTitle(u.title).name}</option>)
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap text-[length:calc(12px*var(--ts))] text-ink-2">
      {ko ? '단원' : 'Units from'}
      <select aria-label={ko ? '첫 단원' : 'First unit'} value={from} onChange={e => onChange(e.target.value, to)} className={`${sel} max-w-[280px]`}>{opts}</select>
      {ko ? '부터' : 'to'}
      <select aria-label={ko ? '마지막 단원' : 'Last unit'} value={to} onChange={e => onChange(from, e.target.value)} className={`${sel} max-w-[280px]`}>{opts}</select>
      {ko ? '까지' : ''}
    </span>
  )
}

export function CopyForm({ p, ko, me, years, to, fail, onDone }: { p: Planner; ko: boolean; me: string; years: string[]; to: { english_class: string; grade: number; academic_year: string }; fail: (e: string | null) => boolean; onDone: () => void }) {
  const { showToast } = useApp()
  const [from, setFrom] = useState({ english_class: to.english_class, grade: to.grade === 1 ? 2 : to.grade - 1, academic_year: to.academic_year })
  const [saving, setSaving] = useState(false)
  const n = p.placements.filter(x => x.english_class === from.english_class && x.grade === from.grade && x.academic_year === from.academic_year && x.is_master).length
  const same = from.english_class === to.english_class && from.grade === to.grade && from.academic_year === to.academic_year
  const go = async () => {
    setSaving(true)
    const r = await copyPlacements(from, to, p.placements, p.pacing, me)
    setSaving(false)
    if (!fail(r.error)) { showToast(ko ? `${r.copied}개 복사됨` : `${r.copied} books copied`); onDone() }
  }
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <span className="text-[length:calc(12.5px*var(--ts))] text-ink-2 pb-2">{ko ? '복사 원본:' : 'Copy the books of'}</span>
      <select value={from.english_class} onChange={e => setFrom({ ...from, english_class: e.target.value })} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <select value={from.grade} onChange={e => setFrom({ ...from, grade: Number(e.target.value) })} className={sel}>{GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
      <select value={from.academic_year} onChange={e => setFrom({ ...from, academic_year: e.target.value })} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
      <span className="text-[length:calc(12.5px*var(--ts))] text-ink-2 pb-2">{ko ? `→ ${to.english_class} ${to.grade}학년` : `into ${to.english_class} Grade ${to.grade}`} <span className="text-ink-3">({n} {ko ? '개' : n === 1 ? 'book' : 'books'}{same ? (ko ? ', 같은 곳' : ', the same place') : ''})</span></span>
      <span className="flex-1" />
      <button onClick={go} disabled={saving || !n || same} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}{ko ? '복사' : 'Copy'}</button>
      <button onClick={onDone} className={btn}>{ko ? '취소' : 'Cancel'}</button>
    </div>
  )
}
