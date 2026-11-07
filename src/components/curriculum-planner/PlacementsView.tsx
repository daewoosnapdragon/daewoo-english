'use client'

import { Fragment, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classToColor } from '@/lib/utils'
import { STRAND_LABEL, bookName, colorHex, splitUnitTitle, type CurriculumBook, type CurriculumUnit } from '@/lib/curriculumCore'
import { HALVES, TERMS, TERM_LABEL, academicYears, groupByModule, layoutPacing, placementLength, projectAnthology, totalWeeks, yearWeeks, type CurriculumPlacement, type Term, type YearWeeks } from '@/lib/curriculumPacing'
import { addPacingMany, clearPacingFixed, copyPlacements, createPlacement, deletePlacement, dropPacing, movePacing, setPacingWeeks, updatePlacementTerm } from '@/lib/curriculumPlacementsData'
import { usePlanner, type Planner } from './usePlanner'
import PeriodsLine from './PeriodsLine'
import StoryPicker from './StoryPicker'
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronRight, Copy, Loader2, Pin, PinOff, Plus, Trash2, X } from 'lucide-react'

// ─── Curriculum map: the master plan ─────────────────────────────
// One grid for the year: a row per class and grade, a column per half,
// each placed book as a chip. Placing a sequence book brings every unit in
// with the book's default weeks; placing an anthology opens its contents
// as a checklist and the ticked stories become a reading list with no
// weeks typed, the term shared across them. Click a chip for the detail:
// pacing for a sequence, the list for an anthology. Copy from… brings
// another grade's placements over. Nothing here has dates.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const badge = 'inline-flex items-center h-4 px-1 rounded bg-paper-3 text-ink-3 text-[9.5px] font-semibold tracking-wide shrink-0'
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
  const [open, setOpen] = useState<string | null>(null)
  const [placing, setPlacing] = useState<string | null>(null)
  const [copying, setCopying] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const seriesOf = (b: CurriculumBook) => p.series.find(s => s.id === b.series_id)
  const label = (pl: CurriculumPlacement) => { const b = p.books.find(x => x.id === pl.book_id); return b ? bookName(b, seriesOf(b)) : '?' }
  const masters = p.placements.filter(x => x.academic_year === theYear && x.is_master)

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Run supabase/migration-curriculum-catalogue.sql first.' : 'The placements tables are missing. Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  const chip = (pl: CurriculumPlacement, half: 'fall' | 'spring') => {
    const book = p.books.find(b => b.id === pl.book_id)
    const se = book ? seriesOf(book) : undefined
    const rows = p.pacing.filter(r => r.placement_id === pl.id && r.owner === 'master')
    const length = placementLength(pl.term, yw)
    const anthology = se?.kind === 'anthology'
    const total = totalWeeks(projectAnthology(rows, length))
    const over = length > 0 && total > length + 0.01
    const on = open === pl.id
    const carries = pl.term === 'year' && half === 'fall'
    const what = anthology ? (ko ? `이야기 ${rows.length}편` : `${rows.length} ${rows.length === 1 ? 'story' : 'stories'}`) : (ko ? `단원 ${rows.length}개` : `${rows.length} ${rows.length === 1 ? 'unit' : 'units'}`)
    const fit = !length ? '' : over ? (ko ? ` · ${num(total - length)}주 초과` : ` · ${num(total - length)} wk over`) : (ko ? ' · 맞음' : ' · fits')
    return (
      <button key={pl.id + half} onClick={() => { setOpen(on ? null : pl.id); setPlacing(null); setCopying(null) }}
        className={`inline-flex items-center gap-2 rounded px-2 py-1 text-left border ${on ? 'border-ink bg-paper-2' : 'border-rule hover:border-rule-2 bg-surface'} ${carries ? 'opacity-70' : ''}`}
        style={{ borderLeft: `4px solid ${colorHex(se?.color || 'slate')}` }} title={label(pl)}>
        <span className="font-display text-[18px] leading-none" style={{ color: colorHex(se?.color || 'slate') }}>{book?.level_number || '·'}</span>
        <span className="min-w-0">
          <span className="block text-[12px] font-medium text-ink truncate max-w-[180px]">{se?.name || '?'}{book?.title && book.title !== `${se?.name} ${book.level_number}`.trim() ? ` · ${book.title}` : ''}</span>
          <span className={`block text-[10.5px] ${over ? 'text-bad' : 'text-ink-3'}`}>{what}{fit}{pl.term === 'year' ? (carries ? (ko ? ' · 이어짐' : ' · carries on') : (ko ? ' · 한 해' : ' · whole year')) : ''}</span>
        </span>
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-2">
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => { setYear(e.target.value); setOpen(null); setPlacing(null) }} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <span className="text-[12px] text-ink-3 pb-2">{ko ? `봄 ${yw.spring.length}주 · 가을 ${yw.fall.length}주` : `Spring ${yw.spring.length} wk · Fall ${yw.fall.length} wk`} · {masters.length} {ko ? '개 배치' : masters.length === 1 ? 'placement' : 'placements'}</span>
      </div>
      <div className="mb-5"><PeriodsLine year={theYear} /></div>

      <div className="border border-rule rounded overflow-hidden bg-surface">
        <div className="grid text-[10.5px] uppercase tracking-wide text-ink-3 border-b border-rule" style={{ gridTemplateColumns: '150px 1fr 1fr 170px' }}>
          <div className="px-3 py-2">{ko ? '반 · 학년' : 'Class · grade'}</div>
          {HALVES.map(h => <div key={h} className="px-3 py-2 border-l border-rule">{ko ? TERM_LABEL[h].ko : TERM_LABEL[h].en}{h === 'spring' ? (ko ? ' · 1학기' : ' · first half') : (ko ? ' · 2학기' : ' · second half')}</div>)}
          <div className="px-3 py-2 border-l border-rule" />
        </div>
        {PLACED_ENGLISH_CLASSES.map(cls => {
          const count = masters.filter(x => x.english_class === cls).length
          const isCollapsed = !!collapsed[cls]
          return (
            <Fragment key={cls}>
              <button onClick={() => setCollapsed(c => ({ ...c, [cls]: !c[cls] }))} className="w-full flex items-center gap-2 px-3 py-1.5 bg-paper-2 border-b border-rule text-left">
                {isCollapsed ? <ChevronRight size={13} className="text-ink-3" /> : <ChevronDown size={13} className="text-ink-3" />}
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: classToColor(cls as any) }} />
                <span className="text-[12.5px] font-semibold text-ink">{cls}</span>
                <span className="text-[11px] text-ink-3">{count ? `${count} ${ko ? '개' : count === 1 ? 'placement' : 'placements'}` : (ko ? '아직 없음' : 'nothing placed yet')}</span>
              </button>
              {!isCollapsed && GRADES.map(grade => {
                const key = rowKey(cls, grade)
                const mine = masters.filter(x => x.english_class === cls && x.grade === grade)
                const fall = mine.filter(x => x.term === 'fall' || x.term === 'year')
                const spring = mine.filter(x => x.term === 'spring' || x.term === 'year')
                const opened = mine.find(x => x.id === open)
                return (
                  <Fragment key={key}>
                    <div className="grid border-b border-rule" style={{ gridTemplateColumns: '150px 1fr 1fr 170px' }}>
                      <div className="px-3 py-2 text-[12.5px] text-ink-2 flex items-center">{ko ? `${grade}학년` : `Grade ${grade}`}</div>
                      <div className="px-3 py-2 border-l border-rule flex flex-wrap gap-1.5 items-center min-h-[44px]">{spring.map(pl => chip(pl, 'spring'))}{!spring.length && <span className="text-[11px] text-ink-3">—</span>}</div>
                      <div className="px-3 py-2 border-l border-rule flex flex-wrap gap-1.5 items-center min-h-[44px]">{fall.map(pl => chip(pl, 'fall'))}{!fall.length && <span className="text-[11px] text-ink-3">—</span>}</div>
                      <div className="px-3 py-2 border-l border-rule flex gap-1.5 items-center justify-end">
                        <button onClick={() => { setPlacing(placing === key ? null : key); setCopying(null); setOpen(null) }} className={`${btnS} ${placing === key ? 'bg-ink text-paper border-ink' : ''}`}><Plus size={11} />{ko ? '배치' : 'Place'}</button>
                        <button onClick={() => { setCopying(copying === key ? null : key); setPlacing(null); setOpen(null) }} className={btnS} title={ko ? '다른 곳에서 복사' : 'Copy another grade’s placements here'}><Copy size={11} /></button>
                      </div>
                    </div>
                    {placing === key && <div className="border-b border-rule bg-paper-2 px-3 py-3"><PlaceForm p={p} ko={ko} me={me} cls={cls} grade={grade} year={theYear} existing={mine} fail={fail} onDone={() => { setPlacing(null); p.reload() }} /></div>}
                    {copying === key && <div className="border-b border-rule bg-paper-2 px-3 py-3"><CopyForm p={p} ko={ko} me={me} years={years} to={{ english_class: cls, grade, academic_year: theYear }} fail={fail} onDone={() => { setCopying(null); p.reload() }} /></div>}
                    {opened && <div className="border-b border-rule bg-paper-2 px-3 py-3"><PlacementCard pl={opened} p={p} ko={ko} label={label(opened)} yw={yw} fail={fail} confirmDialog={confirmDialog} onRemoved={() => setOpen(null)} /></div>}
                  </Fragment>
                )
              })}
            </Fragment>
          )
        })}
      </div>

      <p className="text-[11.5px] text-ink-3 mt-4 leading-relaxed">{ko ? '칩을 누르면 자세히 봅니다. 선집(Into Reading)은 고른 이야기의 목록이고 주 수는 학기에 맞춰 나뉩니다. 순서 교재는 단원마다 주 수를 둡니다.' : 'Click a chip for the detail. An anthology (Into Reading) is a reading list: the stories you picked, in order, with the term shared across them, no weeks to type. A sequence book has weeks per unit; Fit to term shares them evenly. Dropping a unit or story means this class skips it; it stays on the Bookshelf.'}</p>
    </div>
  )
}

// ─── One placement ───────────────────────────────────────────────
export function PlacementCard({ pl, p, ko, label, yw, fail, confirmDialog, onRemoved }: { pl: CurriculumPlacement; p: Planner; ko: boolean; label: string; yw: YearWeeks; fail: (e: string | null) => boolean; confirmDialog: (o: { title: string; message: string; confirmLabel?: string }) => Promise<boolean>; onRemoved: () => void }) {
  const book = p.books.find(b => b.id === pl.book_id)
  const series = book ? p.series.find(s => s.id === book.series_id) : undefined
  const anthology = series?.kind === 'anthology'
  const rows = p.pacing.filter(r => r.placement_id === pl.id && r.owner === 'master').sort((a, b) => a.sort_order - b.sort_order)
  const units = p.units.filter(u => u.book_id === pl.book_id).sort((a, b) => a.sort_order - b.sort_order)
  const length = placementLength(pl.term, yw)
  const laid = projectAnthology(rows, length)
  const bars = layoutPacing(laid, units)
  const total = totalWeeks(laid)
  const left = units.filter(u => !rows.some(r => r.unit_id === u.id))
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [fixing, setFixing] = useState<string | null>(null)
  const over = length > 0 && total > length + 0.01
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '배치 삭제' : 'Remove this placement', message: ko ? `${label}을(를) ${pl.english_class} ${pl.grade}학년에서 뺍니다.` : `${label} comes out of ${pl.english_class} Grade ${pl.grade} for ${TERM_LABEL[pl.term].en.toLowerCase()} ${pl.academic_year}. Its ${anthology ? 'reading list' : 'pacing'} goes with it.`, confirmLabel: ko ? '삭제' : 'Remove' })) return
    if (!fail(await deletePlacement(pl.id, label))) { onRemoved(); p.reload() }
  }
  const shareAgain = async () => { setBusy(true); for (const r of rows.filter(x => x.fixed)) { if (fail(await clearPacingFixed(r.id, label))) break } await p.reload(); setBusy(false) }
  const addPicked = async () => { setBusy(true); const chosen = units.filter(u => picked.has(u.id)); if (!fail(await addPacingMany(pl.id, chosen, rows, label))) { setPicking(false); setPicked(new Set()); await p.reload() } setBusy(false) }
  const groups = groupByModule(bars.map(b => ({ ...b, title: b.unit.title, sort_order: b.pacing.sort_order })))
  const showGroups = groups.length > 1 || (groups[0] && groups[0].label !== 'Other')
  const noun = (k: number) => anthology ? (ko ? '편' : k === 1 ? 'story' : 'stories') : (ko ? '단원' : k === 1 ? 'unit' : 'units')
  let n = 0
  return (
    <section className="border border-rule rounded bg-surface">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-rule flex-wrap">
        <span className="font-display text-[26px] leading-none w-8 text-center" style={{ color: colorHex(series?.color || 'slate') }}>{book?.level_number || '·'}</span>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-ink">{label}<span className="ml-2 text-[11px] font-normal text-ink-3">{anthology ? (ko ? '읽기 목록' : 'reading list') : (ko ? '단원 목록' : 'unit list')}</span></p>
          <p className="text-[11.5px] text-ink-3">{series ? (ko ? STRAND_LABEL[series.strand].ko : STRAND_LABEL[series.strand].en) : ''} · {rows.length} {noun(rows.length)} · <span className={over ? 'text-bad font-medium' : ''}>{num(total)} {ko ? '주' : 'wk'}{length ? ` / ${length}` : ''}</span>{over && <span className="text-bad"> · {ko ? `${num(total - length)}주 초과` : `${num(total - length)} wk over the term`}</span>}{!over && length > 0 && <span className="text-ink-3"> · {rows.some(r => r.fixed) ? (ko ? '고정한 것 빼고 나눔' : 'shared around the pinned ones') : (ko ? '학기에 맞춰 나눔' : 'shared across the term')}</span>}</p>
        </div>
        <span className="flex-1" />
        {rows.some(r => r.fixed) && <button onClick={shareAgain} disabled={busy} className={btnS} title={ko ? '고정을 모두 풀고 다시 나눔' : 'Unpin every length and share the term evenly again'}><PinOff size={11} />{ko ? '다시 나누기' : 'Share evenly'}</button>}
        {left.length > 0 && <button onClick={() => { setPicking(s => !s); setPicked(new Set()) }} className={`${btnS} ${picking ? 'bg-ink text-paper border-ink' : ''}`}><Plus size={11} />{anthology ? (ko ? '이야기 추가' : 'Add stories') : (ko ? '단원 추가' : 'Add units')}</button>}
        <select value={pl.term} onChange={async e => { if (!fail(await updatePlacementTerm(pl.id, e.target.value as Term, label))) p.reload() }} className={sel}>
          {TERMS.map(t => <option key={t} value={t}>{ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en}</option>)}
        </select>
        <button onClick={remove} className={btnS} aria-label="Remove placement"><Trash2 size={11} />{ko ? '배치 삭제' : 'Remove'}</button>
      </div>
      {picking && (
        <div className="px-4 py-3 border-b border-rule bg-paper-2 flex flex-col gap-2">
          <StoryPicker units={left} selected={picked} onChange={setPicked} ko={ko} />
          <div className="flex gap-2"><button onClick={addPicked} disabled={busy || !picked.size} className={btnP}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{ko ? `${picked.size}개 추가` : `Add ${picked.size} ${noun(picked.size)}`}</button><button onClick={() => setPicking(false)} className={btn}>{ko ? '취소' : 'Cancel'}</button></div>
        </div>
      )}
      {rows.length === 0 && <p className="px-4 py-3 text-[12.5px] text-ink-3">{units.length ? (ko ? '아직 고른 것이 없습니다. 추가를 누르세요.' : `Nothing picked yet. Press Add ${anthology ? 'stories' : 'units'}.`) : (ko ? '이 책에는 아직 단원이 없습니다. 책꽂이에서 먼저 색인하세요.' : 'This book has no units yet. Index it on the Bookshelf first.')}</p>}
      {rows.length > 0 && (
        <table className="w-full text-[12.5px]">
          <thead><tr className="text-[10.5px] uppercase tracking-wide text-ink-3"><th className="text-left font-medium px-4 py-1.5 w-10">#</th><th className="text-left font-medium py-1.5">{anthology ? (ko ? '이야기' : 'Story') : (ko ? '단원' : 'Unit')}</th><th className="text-left font-medium py-1.5 w-36">{ko ? '주' : 'Weeks'}</th><th className="text-left font-medium py-1.5 w-28">{ko ? '위치' : 'Lands in'}</th><th className="w-48" /></tr></thead>
          <tbody>
            {groups.map(g => (
              <Fragment key={g.key}>
                {showGroups && <tr className="border-t border-rule bg-paper"><td colSpan={5} className="px-4 py-1 text-[10.5px] uppercase tracking-wide text-ink-3">{g.label}</td></tr>}
                {g.units.map(b => {
                  n += 1; const i = n - 1
                  const t = splitUnitTitle(b.unit.title)
                  const isFixed = b.pacing.fixed
                  return (
                    <tr key={b.pacing.id} className="border-t border-rule">
                      <td className="px-4 py-1.5 text-ink-3">{i + 1}</td>
                      <td className="py-1.5"><span className="inline-flex items-center gap-2 min-w-0">{t.badge && !showGroups && <span className={badge}>{t.badge}</span>}{t.badge && showGroups && /^M\d+/i.test(t.badge) && <span className={badge}>{t.badge}</span>}<span className="text-ink">{t.name}</span>{!b.unit.confirmed_at && <span className="text-[10.5px] text-ink-3">{ko ? '미확인' : 'not confirmed'}</span>}</span></td>
                      <td className="py-1.5">
                        {fixing === b.pacing.id || isFixed ? (
                            <span className="inline-flex items-center gap-1">
                              <WeeksInput value={b.pacing.weeks} onSave={async w => { if (!fail(await setPacingWeeks(b.pacing.id, w, `${label} · ${b.unit.title}`, true))) { setFixing(null); p.reload() } }} />
                              <button onClick={async () => { if (!fail(await clearPacingFixed(b.pacing.id, `${label} · ${b.unit.title}`))) { setFixing(null); p.reload() } }} className="text-ink-3 hover:text-ink" title={ko ? '다시 나누기' : 'Share the term again'}><PinOff size={11} /></button>
                            </span>
                          ) : <span className="inline-flex items-center gap-1.5 text-ink-2 tabular-nums">≈ {num(b.pacing.weeks)} <button onClick={() => setFixing(b.pacing.id)} className="text-ink-3 hover:text-ink" title={ko ? '주 수 고정' : 'Give this one a fixed length'}><Pin size={11} /></button></span>}
                      </td>
                      <td className="py-1.5 tabular-nums text-ink-2">{b.start === b.end ? `wk ${num(b.start)}` : `wk ${num(b.start)}–${num(b.end)}`}{length && b.end > length + 0.01 ? <span className="text-bad"> ✕</span> : null}</td>
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
      <input value={v} onChange={e => setV(e.target.value)} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }} inputMode="decimal" className="h-7 w-14 px-1.5 bg-surface border border-rule-2 rounded text-[12.5px] text-ink tabular-nums" />
      {saving && <Loader2 size={11} className="animate-spin text-ink-3" />}
    </span>
  )
}

// ─── Place a book ────────────────────────────────────────────────
export function PlaceForm({ p, ko, me, cls, grade, year, existing, fail, onDone }: { p: Planner; ko: boolean; me: string; cls: string; grade: number; year: string; existing: CurriculumPlacement[]; fail: (e: string | null) => boolean; onDone: () => void }) {
  const [bookId, setBookId] = useState('')
  const [term, setTerm] = useState<Term>('year')
  const [picked, setPicked] = useState<Set<string>>(new Set())
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
        <span className="text-[12.5px] text-ink pb-2 font-medium">{cls} · {ko ? `${grade}학년` : `Grade ${grade}`}</span>
        <label className="text-[11px] text-ink-3">{ko ? '책' : 'Book'}<br />
          <select value={bookId} onChange={e => { setBookId(e.target.value); setPicked(new Set()) }} className={`${sel} min-w-[240px]`} autoFocus>
            <option value="">{ko ? '책 고르기…' : 'Pick a book…'}</option>
            {choices.map(({ b, s }) => <option key={b.id} value={b.id}>{bookName(b, s)}{s?.kind === 'anthology' ? (ko ? ' (선집)' : ' (anthology)') : ''}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '기간' : 'Term'}<br />
          <select value={term} onChange={e => setTerm(e.target.value as Term)} className={sel}>{TERMS.map(t => <option key={t} value={t}>{ko ? TERM_LABEL[t].ko : TERM_LABEL[t].en}</option>)}</select>
        </label>
        <span className="text-[12px] text-ink-3 pb-2">{chosen && !units.length ? (ko ? '단원 없음: 먼저 색인하세요' : 'no units yet; index it on the Bookshelf first') : ''}{dup && <span className="text-warn"> · {ko ? '이미 배치됨' : 'already placed for this term'}</span>}</span>
        <span className="flex-1" />
        <button onClick={save} disabled={!chosen || saving || !!dup || !picked.size} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? `${picked.size}개 배치` : `Place ${picked.size} ${anthology ? (picked.size === 1 ? 'story' : 'stories') : (picked.size === 1 ? 'unit' : 'units')}`}</button>
        <button onClick={onDone} className={btn}>{ko ? '취소' : 'Cancel'}</button>
      </div>
      {chosen && units.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[12px] text-ink-2">{anthology ? (ko ? '이 반이 읽을 이야기를 고르세요. 순서는 책의 순서이고, 주 수는 학기에 맞춰 나뉩니다.' : 'Tick the stories this class will read. The order is the book’s, and the term is shared across them; no weeks to type.') : (ko ? '이 반이 할 단원을 고르세요. 순서는 책의 순서이고, 주 수는 학기에 맞춰 나뉩니다. 보드에서 단원을 끌거나 늘리면 그 단원만 고정됩니다.' : 'Tick the units this class will do, or press All units. The order is the book’s and the term is shared across them. On the board, dragging or stretching a unit pins its length; the rest re-share.')}</p>
          <StoryPicker units={units} selected={picked} onChange={setPicked} ko={ko} presets={presets} />
        </div>
      )}
    </div>
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
    if (!fail(r.error)) { showToast(ko ? `${r.copied}개 복사됨` : `${r.copied} placements copied`); onDone() }
  }
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <span className="text-[12.5px] text-ink-2 pb-2">{ko ? '복사 원본:' : 'Copy the placements of'}</span>
      <select value={from.english_class} onChange={e => setFrom({ ...from, english_class: e.target.value })} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <select value={from.grade} onChange={e => setFrom({ ...from, grade: Number(e.target.value) })} className={sel}>{GRADES.map(g => <option key={g} value={g}>Grade {g}</option>)}</select>
      <select value={from.academic_year} onChange={e => setFrom({ ...from, academic_year: e.target.value })} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
      <span className="text-[12.5px] text-ink-2 pb-2">{ko ? `→ ${to.english_class} ${to.grade}학년` : `into ${to.english_class} Grade ${to.grade}`} <span className="text-ink-3">({n} {ko ? '개' : n === 1 ? 'placement' : 'placements'}{same ? (ko ? ', 같은 곳' : ', the same place') : ''})</span></span>
      <span className="flex-1" />
      <button onClick={go} disabled={saving || !n || same} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}{ko ? '복사' : 'Copy'}</button>
      <button onClick={onDone} className={btn}>{ko ? '취소' : 'Cancel'}</button>
    </div>
  )
}
