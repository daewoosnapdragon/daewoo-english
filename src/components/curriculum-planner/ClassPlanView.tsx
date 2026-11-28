'use client'

import Loading from '@/components/brand/Loading'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { getKSTDateString } from '@/lib/utils'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { changedWeeks, moveBoundary, teachingAtColumnOpen, unitLabels } from '@/lib/yearPlan'
import { STRANDS, bookName, bookTone, colorHex, splitUnitTitle } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, aimWeek, barsForView, halfOf, holidayWeeks, layoutPacing, masterRows, placementLength, teachingToColumns, termDates, todayPosition, totalWeeks, viewWeeks, viewsFor, yearWeeks, type CurriculumPlacement, type View } from '@/lib/curriculumPacing'
import { unitBank } from '@/lib/planLinks'
import { patchMasterRows } from '@/lib/curriculumPlacementsData'
import { standardInfo, standardTitle } from '@/lib/standardText'
import { usePlanner } from './usePlanner'
import { Check, ExternalLink, X } from 'lucide-react'

// ─── Class plans ─────────────────────────────────────────────────
// One class and grade: a lane per book, each unit a bar at its suggested
// length, end to end from the start of the term. Holiday weeks from the
// school calendar are hatched and skipped. A line marks today and a flag
// each book's aim date. Click a unit for its lessons, objectives and files.
// Drag a unit's right end to make it longer or shorter; the units after it
// move along. Teachers drag their own class, admin any class. The rows are the
// same ones the Year plan draws, so it follows. Books are added on the Year
// plan or Books by class. Design: docs/superpowers/specs/2026-11-28-curriculum-page-cleanup-design.md

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(12.5px*var(--ts))] text-ink'
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const fmtDay = (iso: string) => new Date(iso + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
const LABEL_W = 190
const COL_MIN = 34
const GRADE_KEY = 'daewoo_plan_grade'

/** A drag on a unit's right end: the book's lengths when it started, the unit, and where the pointer and that end were. */
interface Drag { plId: string; k: number; w0: number[]; x0: number; col0: number; colW: number; name: string }

/** The class, grade, year and view a link asks for: #plans?cls=Daisy&grade=2&year=2026&view=fall. */
function readLink(): { cls?: string; grade?: number; year?: string; view?: string } {
  if (typeof window === 'undefined') return {}
  const q = (window.location.hash || '').split('?')[1]
  if (!q) return {}
  const sp = new URLSearchParams(q)
  return { cls: sp.get('cls') || undefined, grade: Number(sp.get('grade')) || undefined, year: sp.get('year') || undefined, view: sp.get('view') || undefined }
}

export default function ClassPlanView() {
  const { currentTeacher, language, semesters, activeSemester, showToast, sp } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const today = getKSTDateString()
  const ownClass = currentTeacher && (PLACED_ENGLISH_CLASSES as string[]).includes(currentTeacher.english_class) ? currentTeacher.english_class : PLACED_ENGLISH_CLASSES[0]
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])

  const [cls, setCls] = useState<string>(ownClass)
  const [grade, setGrade] = useState<number>(() => { try { const g = Number(localStorage.getItem(GRADE_KEY)); return (GRADES as number[]).includes(g) ? g : 1 } catch { return 1 } })
  const [year, setYear] = useState<string>('')
  const [viewPick, setViewPick] = useState<View | null>(null)
  useEffect(() => { try { localStorage.setItem(GRADE_KEY, String(grade)) } catch { /* private mode */ } }, [grade])
  // A link from All classes this week opens on its class, grade, year and view.
  useEffect(() => {
    const apply = () => {
      const l = readLink()
      if (l.cls && (PLACED_ENGLISH_CLASSES as string[]).includes(l.cls)) setCls(l.cls)
      if (l.grade && (GRADES as number[]).includes(l.grade)) setGrade(l.grade)
      if (l.year) setYear(l.year)
      if (l.view === 'spring' || l.view === 'fall' || l.view === 'year') setViewPick(l.view)
    }
    apply(); window.addEventListener('hashchange', apply); return () => window.removeEventListener('hashchange', apply)
  }, [])
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  const views = useMemo(() => viewsFor(yw), [yw])
  const view: View = viewPick && views.includes(viewPick) ? viewPick : views.includes(halfOf(semesters, theYear, today)) ? halfOf(semesters, theYear, today) : views[0]
  const weeks = useMemo(() => viewWeeks(yw, view), [yw, view])
  const N = weeks.length

  // This grade's days off for the year: three or more in a week make it a holiday week.
  const [away, setAway] = useState<AwayDay[]>([])
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!from || !to) { setAway([]); return }
    let on = true
    loadAwayDays(from, to, grade).then(a => { if (on) setAway(a) })
    return () => { on = false }
  }, [semesters, theYear, grade])
  const hol = useMemo(() => {
    const hs = holidayWeeks(away, yw.spring), hf = holidayWeeks(away, yw.fall)
    const names = new Map<number, string>()
    weeks.forEach(w => { const h = w.half || 'fall'; const key = view === 'year' && h === 'fall' ? w.n - yw.spring.length : w.n; const nm = (h === 'spring' ? hs : hf).get(key); if (nm) names.set(w.n, nm) })
    return { hc: { spring: hs.size, fall: hf.size }, sets: { spring: new Set(hs.keys()), fall: new Set(hf.keys()) }, names, cols: new Set(names.keys()) }
  }, [away, yw, weeks, view])

  const placements = useMemo(() => p.placements
    .filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master)
    .map(pl => { const book = p.books.find(b => b.id === pl.book_id); const series = book ? p.series.find(s => s.id === book.series_id) : undefined; return { pl, book, series } })
    .sort((a, b) => STRANDS.indexOf(a.series?.strand || 'other') - STRANDS.indexOf(b.series?.strand || 'other') || (a.series?.name || '').localeCompare(b.series?.name || '')),
  [p.placements, p.books, p.series, cls, grade, theYear])
  // ─── Dragging a unit's end ───
  const [drag, setDrag] = useState<Drag | null>(null)
  const [draft, setDraftState] = useState<{ id: string; weeks: number[] } | null>(null)
  const draftRef = useRef<{ id: string; weeks: number[] } | null>(null)
  const setDraft = (d: { id: string; weeks: number[] } | null) => { draftRef.current = d; setDraftState(d) }
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)
  const [saving, setSaving] = useState(false)
  const canDrag = canManage || currentTeacher?.english_class === cls
  const sortedRows = (plId: string) => masterRows(p.pacing, plId).sort((a, b) => a.sort_order - b.sort_order)

  const lanes = useMemo(() => placements.map(({ pl, book, series }) => {
    const base = sortedRows(pl.id)
    const rows = draft && draft.id === pl.id ? base.map((r, i) => ({ ...r, weeks: draft.weeks[i] ?? r.weeks })) : base
    const bars = teachingToColumns(barsForView(layoutPacing(rows, p.units), pl.term, view, yw, hol.hc), hol.cols, N)
    const length = placementLength(pl.term, yw, hol.hc)
    const total = totalWeeks(rows)
    const aimW = aimWeek(pl.aim_date, pl.term, yw, hol.sets)
    return { pl, book, series, color: colorHex(series?.color || 'slate'), tone: bookTone(series?.color), bars, rows, length, total, aimW, aimPos: pl.aim_date ? todayPosition(weeks, pl.aim_date) : null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [placements, p.pacing, p.units, view, yw, hol, N, weeks, draft])
  const done = useMemo(() => new Set(p.done.map(d => `${d.placement_id}|${d.unit_id}`)), [p.done])
  const todayPos = todayPosition(weeks, today)
  const [openBar, setOpenBar] = useState<{ placement: string; unit: string } | null>(null)
  useEffect(() => { setOpenBar(null) }, [cls, grade, theYear, view])
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  const save = async (pl: CurriculumPlacement, next: number[]) => {
    const patches = changedWeeks(sortedRows(pl.id), next)
    if (!patches.length) { setDraft(null); return }
    setSaving(true)
    const err = await patchMasterRows(patches, `${labelOf(pl)} · ${pl.english_class} G${pl.grade} a unit's length changed on the class plan`)
    if (!fail(err)) await p.reload()
    setDraft(null)
    setSaving(false)
  }
  /** Starts a drag on unit `k`'s right end. `col0` is that end in columns of the view. */
  const startDrag = (e: React.PointerEvent, pl: CurriculumPlacement, k: number, col0: number, name: string) => {
    if (!canDrag || saving) return
    e.preventDefault(); e.stopPropagation()
    const track = (e.currentTarget as HTMLElement).closest('[data-lanes]') as HTMLElement | null
    if (!track) return
    const colW = (track.getBoundingClientRect().width - LABEL_W) / Math.max(1, N)
    setDrag({ plId: pl.id, k, w0: sortedRows(pl.id).map(r => Math.max(0.5, Number(r.weeks) || 0)), x0: e.clientX, col0, colW, name })
    setTip({ x: e.clientX, y: e.clientY })
  }
  useEffect(() => {
    if (!drag) return
    const pl = p.placements.find(x => x.id === drag.plId)
    const move = (e: PointerEvent) => {
      // Measured from where the end was, in teaching weeks: holiday columns count for nothing.
      const delta = teachingAtColumnOpen(drag.col0 + (e.clientX - drag.x0) / drag.colW, hol.cols, N) - teachingAtColumnOpen(drag.col0, hol.cols, N)
      setDraft({ id: drag.plId, weeks: moveBoundary(drag.w0, drag.k, delta) })
      setTip({ x: e.clientX, y: e.clientY })
    }
    const up = () => {
      setDrag(null); setTip(null)
      const d = draftRef.current
      if (pl && d && d.id === pl.id) void save(pl, d.weeks)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    document.body.style.userSelect = 'none'
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); document.body.style.userSelect = '' }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag])
  /** The arrow keys on a unit's end: half a week longer or shorter. */
  const nudge = (pl: CurriculumPlacement, k: number, by: number) => {
    if (!canDrag || saving) return
    const w = sortedRows(pl.id).map(r => Math.max(0.5, Number(r.weeks) || 0))
    void save(pl, moveBoundary(w, k, by))
  }

  if (p.loading) return <Loading rows={5} />
  if (p.missing) return <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '아직 준비되지 않았습니다.' : 'Class plans are not set up yet.'}</p>

  const viewLabel = (v: View) => v === 'year' ? (ko ? '한 해' : 'Whole year') : (ko ? TERM_LABEL[v].ko : TERM_LABEL[v].en)
  const labelOf = (pl: CurriculumPlacement) => { const b = p.books.find(x => x.id === pl.book_id); return b ? bookName(b, p.series.find(s => s.id === b.series_id)) : '?' }
  const left = (at: number) => `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${at / Math.max(1, N)})`
  const opened = openBar ? lanes.find(l => l.pl.id === openBar.placement) : undefined
  const openedUnit = opened ? p.units.find(u => u.id === openBar!.unit) : undefined

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-3 flex-wrap">
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '반' : 'Class'}<br />
          <select value={cls} onChange={e => setCls(e.target.value)} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '학년' : 'Grade'}<br />
          <select value={grade} onChange={e => setGrade(Number(e.target.value))} className={sel}>{GRADES.map(g => <option key={g} value={g}>{ko ? `${g}학년` : `Grade ${g}`}</option>)}</select>
        </label>
        <label className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <div className="flex gap-1 pb-px">
          {views.map(v => <button key={v} onClick={() => setViewPick(v)} className={`h-8 px-3 rounded text-[length:calc(12.5px*var(--ts))] ${view === v ? 'bg-ink text-paper' : 'border border-rule-2 text-ink-2 hover:text-ink'}`}>{viewLabel(v)}</button>)}
        </div>
      </div>

      {N === 0 ? (
        <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '이 학년도의 학기 날짜가 아직 없습니다.' : 'This year has no term dates yet.'}</p>
      ) : lanes.length === 0 ? (
        <p className="text-[length:calc(13px*var(--ts))] text-ink-2">{ko ? `${cls} ${grade}학년의 ${theYear} 계획이 아직 없습니다.` : `No books in ${cls} Grade ${grade}'s plan for ${theYear} yet.`}</p>
      ) : (
        <div className="border border-rule rounded bg-surface overflow-x-auto">
          <div data-lanes className="relative" style={{ minWidth: LABEL_W + N * COL_MIN }}>
            {/* Week columns: holidays hatched */}
            {weeks.map((w, i) => hol.cols.has(w.n) && (
              <div key={'h' + w.n} title={hol.names.get(w.n)} className="absolute top-0 bottom-0" style={{ left: left(i), width: `calc((100% - ${LABEL_W}px) / ${N})`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 6px, transparent 6px 10px)' }} />
            ))}
            <div className="relative flex h-9 border-b border-rule">
              <div className="shrink-0 px-3 flex items-center text-[length:calc(12px*var(--ts))] text-ink-2" style={{ width: LABEL_W }}>{ko ? '교재' : 'Book'}</div>
              <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                {weeks.map((w, i) => {
                  const newMonth = i === 0 || w.monday.slice(5, 7) !== weeks[i - 1].monday.slice(5, 7)
                  return <div key={w.n} title={`${fmtDay(w.monday)}${hol.names.get(w.n) ? ` · ${hol.names.get(w.n)}` : ''}`} className="border-l border-rule/60 text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-tight px-0.5 pt-1 truncate">{newMonth ? fmtDay(w.monday) : w.monday.slice(8, 10).replace(/^0/, '')}</div>
                })}
              </div>
            </div>
            {lanes.map(l => {
              const overTerm = l.length > 0 && l.total > l.length + 0.01
              const pastAim = l.aimW !== null && l.total > l.aimW + 0.01
              return (
                <div key={l.pl.id} className="relative h-[64px] border-b border-rule last:border-b-0">
                  <div className="absolute left-0 top-0 bottom-0 px-3 py-2 flex flex-col justify-center bg-surface border-r border-rule z-[1]" style={{ width: LABEL_W }}>
                    <span className="text-[length:calc(12.5px*var(--ts))] font-semibold text-ink truncate inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: l.tone.alt, boxShadow: `inset 0 0 0 1px ${l.tone.text}` }} />{labelOf(l.pl)}</span>
                    <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3 leading-snug pl-[9px]">
                      {l.rows.length} {l.series?.kind === 'anthology' ? (l.rows.length === 1 ? 'story' : 'stories') : (l.rows.length === 1 ? 'unit' : 'units')} · {num(l.total)} wk{overTerm ? ` · ${num(l.total - l.length)} past the term` : ''}
                      {l.pl.aim_date ? <><br />{ko ? '목표' : 'aim'} {fmtDay(l.pl.aim_date)}{pastAim ? ` · ${num(l.total - l.aimW!)} wk after it` : ''}</> : null}
                    </span>
                  </div>
                  {l.bars.map(b => {
                    const t = splitUnitTitle(b.unit.title)
                    // Phonics bars lead with the pattern ("sh", "a b t s m"), its short form, then the section.
                    const phonicsLabels = l.series?.strand === 'phonics' ? unitLabels(b.unit.title, true) : null
                    const name = phonicsLabels ? phonicsLabels[phonicsLabels.length - 1] : t.name
                    const isDone = done.has(`${l.pl.id}|${b.unit.id}`)
                    const on = openBar?.placement === l.pl.id && openBar.unit === b.unit.id
                    const place = { left: `calc(${left(b.viewStart - 1)} + 1px)`, width: `calc((100% - ${LABEL_W}px) * ${(b.viewEnd - b.viewStart + 1) / N} - 2px)` }
                    // Review weeks after a unit: a striped block in the book's colour.
                    if (b.review) return (
                      <div key={b.pacing.id + 'r'} title={`${ko ? '복습' : 'Review'}: ${b.unit.title} · ${num(b.end - b.start + 1)} wk`}
                        className="absolute top-3 h-[40px] rounded-sm px-1.5 text-[length:calc(11.5px*var(--ts))] leading-[40px] font-semibold overflow-hidden whitespace-nowrap"
                        style={{ ...place, color: l.tone.text, boxShadow: `inset 0 0 0 1px ${l.tone.edge}`, backgroundImage: `repeating-linear-gradient(135deg, ${l.tone.alt} 0 5px, ${l.tone.fill} 5px 10px)` }}>{ko ? '복습' : 'Review'}</div>
                    )
                    const k = l.rows.findIndex(r => r.id === b.pacing.id)
                    const grip = canDrag && !b.cutRight && k >= 0
                    return (
                      <Fragment key={b.pacing.id}>
                      <button onClick={() => setOpenBar(on ? null : { placement: l.pl.id, unit: b.unit.id })}
                        title={`${b.unit.title} · ${num(b.pacing.weeks)} wk${isDone ? ' · done' : ''}`}
                        className={`absolute top-3 h-[40px] rounded-sm px-1.5 text-left text-[length:calc(11.5px*var(--ts))] leading-tight overflow-hidden ${on ? 'ring-2 ring-ink ring-offset-1' : ''}`}
                        style={{ ...place, background: l.tone.fill, color: l.tone.text, boxShadow: `inset 0 0 0 1px ${l.tone.edge}`, opacity: isDone ? 0.5 : 1 }}>
                        <span className="block truncate font-semibold">{isDone && <Check size={10} className="inline mr-0.5 -mt-px" />}{name}</span>
                        {t.badge && <span className="block truncate opacity-80 text-[length:calc(11.5px*var(--ts))]">{t.badge}</span>}
                      </button>
                      {grip && (
                        <button aria-label={ko ? `${name} 길이 조절` : `Make ${name} longer or shorter`} title={ko ? '끌어서 길이 조절 (←/→ 키도 됨). 뒤 단원은 함께 이동' : 'Drag to make this unit longer or shorter (or use ← →); the units after it move along'}
                          onPointerDown={e => startDrag(e, l.pl, k, b.viewEnd, name)}
                          onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); nudge(l.pl, k, e.key === 'ArrowRight' ? 0.5 : -0.5) } }}
                          className="absolute top-3 h-[40px] w-[12px] -ml-[6px] z-[2] cursor-col-resize touch-none group flex justify-center rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                          style={{ left: left(b.viewEnd) }}>
                          <span className={`w-[3px] my-1.5 rounded ${drag?.plId === l.pl.id && drag.k === k ? 'opacity-90' : 'opacity-0 group-hover:opacity-70 group-focus-visible:opacity-70'}`} style={{ background: l.tone.text }} />
                        </button>
                      )}
                      </Fragment>
                    )
                  })}
                  {l.aimPos !== null && (
                    <div title={`${ko ? '목표' : 'Aim'}: ${fmtDay(l.pl.aim_date!)}`} className="absolute top-1 bottom-1 w-0 border-l-2 border-dashed border-ink-2 z-[2]" style={{ left: left(l.aimPos - 1) }} />
                  )}
                </div>
              )
            })}
            {todayPos !== null && <div title={ko ? '오늘' : 'Today'} className="absolute top-0 bottom-0 w-0 border-l-2 border-accent z-[3] pointer-events-none" style={{ left: left(todayPos - 1) }} />}
          </div>
        </div>
      )}
      {lanes.length > 0 && N > 0 && canDrag && <p className="-mt-2 text-[length:calc(12px*var(--ts))] text-ink-3">{ko ? '단원을 눌러 자세히 보고, 오른쪽 끝을 끌어 길이를 바꾸세요. 연간 계획에도 바로 반영됩니다.' : 'Click a unit to see it. Drag its right end to make it longer or shorter; the Year plan changes with it.'}{saving ? (ko ? ' · 저장 중…' : ' · Saving…') : ''}</p>}
      {drag && tip && draft && (
        <div className="fixed z-50 pointer-events-none rounded bg-ink text-paper px-2 py-1 text-[length:calc(12px*var(--ts))] shadow" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          {drag.name}: {num(draft.weeks[drag.k])} {ko ? '주' : 'wk'}{draft.weeks[drag.k] !== drag.w0[drag.k] ? ` (${draft.weeks[drag.k] > drag.w0[drag.k] ? '+' : ''}${num(draft.weeks[drag.k] - drag.w0[drag.k])})` : ''}
        </div>
      )}

      {opened && openedUnit && (() => {
        const t = splitUnitTitle(openedUnit.title)
        const lessons = p.lessons.filter(x => x.unit_id === openedUnit.id).sort((a, b) => a.sort_order - b.sort_order)
        // The unit's objective bank only: never lessons' objectives, which for some books came from teachers' plans.
        const bank = unitBank(p.objectives.filter(o => o.unit_id === openedUnit.id), [])
        const ids = new Set(lessons.map(x => x.id))
        const files = p.resources.filter(r => (r.unit_id === openedUnit.id || (r.lesson_id && ids.has(r.lesson_id))) && !!r.url)
        const row = opened.rows.find(r => r.unit_id === openedUnit.id)
        const bar = layoutPacing(opened.rows, p.units).find(b => b.unit.id === openedUnit.id)
        const codes = Array.from(new Set([...bank.flatMap(o => o.ccss), ...openedUnit.ccss_codes]))
        const isDone = done.has(`${opened.pl.id}|${openedUnit.id}`)
        return (
          <section className="border border-rule rounded bg-surface p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[length:calc(15px*var(--ts))] font-semibold text-ink">{t.name}</p>
                <p className="text-[length:calc(12px*var(--ts))] text-ink-3">{labelOf(opened.pl)}{t.badge ? ` · ${t.badge}` : ''} · {lessons.length} {lessons.length === 1 ? 'lesson' : 'lessons'} · {row ? `${num(row.weeks)} wk` : ''}{bar ? ` · ${bar.start === bar.end ? `week ${num(bar.start)}` : `weeks ${num(bar.start)}–${num(bar.end)}`} of the term` : ''}{isDone ? ' · done' : ''}</p>
              </div>
              <button onClick={() => setOpenBar(null)} className="text-ink-3 hover:text-ink" aria-label="Close"><X size={14} /></button>
            </div>
            {openedUnit.summary && <p className="mt-2 text-[length:calc(12.5px*var(--ts))] text-ink-2 leading-snug whitespace-pre-line">{sp(openedUnit.summary)}</p>}
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[length:calc(12px*var(--ts))] font-semibold text-ink-2 mb-1">{ko ? '학습 목표' : 'Objectives'}</p>
                {bank.length > 0
                  ? <ul className="space-y-1">{bank.map(o => <li key={o.text} className="text-[length:calc(12.5px*var(--ts))] text-ink-2"><span className="italic text-ink-3">Students will</span> {sp(o.text)}</li>)}</ul>
                  : <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '이 단원의 학습 목표는 아직 없습니다.' : 'Objectives for this unit are not written yet.'}</p>}
              </div>
              {lessons.length > 0 && (
                <div>
                  <p className="text-[length:calc(12px*var(--ts))] font-semibold text-ink-2 mb-1">{ko ? '차시' : 'Lessons'}</p>
                  <ol className="space-y-0.5 text-[length:calc(12.5px*var(--ts))] text-ink-2">{lessons.map((x, i) => <li key={x.id}>{i + 1}. {sp(x.title)}</li>)}</ol>
                </div>
              )}
            </div>
            {codes.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">{codes.map(c => { const s = standardInfo(c); return <span key={c} title={standardTitle(c)} className="text-[length:calc(11.5px*var(--ts))] px-1.5 py-0.5 rounded border border-rule text-ink-2 cursor-help">{s.code}{s.plain ? ` · ${s.plain}` : ''}</span> })}</div>
            )}
            {files.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">{files.map(f => <li key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="text-[length:calc(12.5px*var(--ts))] text-accent inline-flex items-center gap-1 hover:underline"><ExternalLink size={11} />{f.name || 'File'}</a></li>)}</ul>
            )}
          </section>
        )
      })()}
    </div>
  )
}
