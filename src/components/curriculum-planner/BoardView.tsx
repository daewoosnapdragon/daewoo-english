'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { getKSTDateString } from '@/lib/utils'
import { teacherForClass } from '@/lib/classTeacher'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, STRAND_LABEL, bookName, levelShort, parseTags, splitUnitTitle, type CurriculumLesson, type CurriculumUnit, type Strand } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, columnToTeaching, snapWeeks, viewShift, viewsFor, anthologyProgress, applyPatches, barsForView, blockBars, boardLanes, freezeProjection, halfOf, hasOwnPlan, holidayWeeks, lagWeeks, layoutPacing, masterRows, placementLength, projectAnthology, reflowTo, teacherRows, teachingToColumns, termDates, todayPosition, viewWeeks, yearWeeks, type CurriculumBlock, type CurriculumPlacement, type CurriculumPacing, type HolidayCounts, type Lane, type RowPatch, type View } from '@/lib/curriculumPacing'
import { addOwnUnit, deleteBlock, dropOwnUnit, ensureOwnPlan, patchOwnRows, revertToMaster, saveBlock, setHere, setOwnDone, type BlockDraft } from '@/lib/curriculumPlanData'
import { coverage, type LogRow } from '@/lib/curriculumWeek'
import { fetchLogs } from '@/lib/curriculumWeekData'
import { followsPlans, planFollower, type LinkedDay } from '@/lib/lessonSync'
import { fetchLinked } from '@/lib/lessonSyncData'
import { CCSS_DOMAINS } from '@/components/curriculum/ccss-standards'
import { standardInfo, standardTitle } from '@/lib/standardText'
import { usePlanner } from './usePlanner'
import PeriodsLine from './PeriodsLine'
import WeekView from './WeekView'
import { Check, ExternalLink, Flag, Loader2, Minus, Plus, Trash2, Undo2, X } from 'lucide-react'

// ─── Class board ─────────────────────────────────────────────────
// One class and grade, week by week: a half of the year or the whole year
// with the summer between. A row per placed book, grouped by strand, each
// unit as a bar where the plan puts it. Holiday weeks from the school
// calendar are hatched and do not count as teaching weeks, so a unit that
// spans one is drawn across it. The class's own teacher drags bars to move
// them, drags the right edge to stretch, clicks a unit for "we're here" or,
// on a reading list, Done. The first drag pins every unit at its shared
// length so the rest stop re-sharing. A thin rail under a row is the
// master where the plan differs. "Our class" holds the teacher's blocks.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-full'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const lbl = 'block text-[11px] text-ink-3 mb-1'
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const ROW_H = 78
// How many weeks fill the board's width: 8 or 12 around today, or the whole term.
type Zoom = '8' | '12' | 'term'
const ZOOM_KEY = 'daewoo_board_zoom'
const readZoom = (): Zoom => { try { const z = localStorage.getItem(ZOOM_KEY); return z === '8' || z === '12' || z === 'term' ? z : '8' } catch { return '8' } }
const LABEL_W = 150
const stickyLabel: React.CSSProperties = { width: LABEL_W, position: 'sticky', left: 0, zIndex: 4, background: 'rgb(var(--white))' }

type Bar = Lane['bars'][number]
interface Row { key: string; strand: Lane['strand']; first: boolean; bar0: Bar; bars: Bar[]; ticks: { at: number; off: boolean }[]; overBy: number; anthology: boolean; progress: string | null }
type Drag = { id: string; mode: 'move' | 'resize'; dx: number; moved: boolean; colW: number; from: number; saving?: boolean }

export default function BoardView() {
  const { currentTeacher, language, semesters, activeSemester, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const { teachers } = useTeachers()
  const isAdmin = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const ownClass = currentTeacher && (PLACED_ENGLISH_CLASSES as string[]).includes(currentTeacher.english_class) ? currentTeacher.english_class : PLACED_ENGLISH_CLASSES[0]
  const today = getKSTDateString()
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])
  // A link from the program map carries the class and grade to open on.
  const fromLink = (() => { if (typeof window === 'undefined') return null; const q = (window.location.hash || '').split('?')[1]; if (!q) return null; const sp = new URLSearchParams(q); return { cls: sp.get('cls'), grade: Number(sp.get('grade')), year: sp.get('year'), view: sp.get('view'), week: Number(sp.get('week')) || null } })()
  const [cls, setCls] = useState<string>(fromLink?.cls && (PLACED_ENGLISH_CLASSES as string[]).includes(fromLink.cls) ? fromLink.cls : ownClass)
  const [grade, setGrade] = useState<number>(fromLink?.grade && (GRADES as number[]).includes(fromLink.grade) ? fromLink.grade : 1)
  const [year, setYear] = useState<string>(fromLink?.year || activeSemester?.academic_year || '')
  // A week the link asked for: the board centres on it and marks its column, instead of today.
  const [focusWeek, setFocusWeek] = useState<number | null>(fromLink?.week || null)
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const [viewPick, setViewPick] = useState<View | null>(fromLink?.view === 'spring' || fromLink?.view === 'fall' || fromLink?.view === 'year' ? fromLink.view : null)
  useEffect(() => {
    const onTarget = (e: Event) => {
      const d = (e as CustomEvent).detail || {}
      if (d.cls && (PLACED_ENGLISH_CLASSES as string[]).includes(d.cls)) setCls(d.cls)
      const g = Number(d.grade); if ((GRADES as number[]).includes(g)) setGrade(g)
      if (d.year) setYear(d.year)
      if (d.view === 'spring' || d.view === 'fall' || d.view === 'year') setViewPick(d.view)
      setFocusWeek(Number(d.week) || null)
    }
    window.addEventListener('daewoo:board-target', onTarget); return () => window.removeEventListener('daewoo:board-target', onTarget)
  }, [])
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  // A half with no dates is not offered; neither is Year unless both have them.
  const views = useMemo(() => viewsFor(yw), [yw])
  const view: View = viewPick && views.includes(viewPick) ? viewPick : views.includes(halfOf(semesters, theYear, today)) ? halfOf(semesters, theYear, today) : views[0]
  const half = view === 'year' ? 'spring' : view
  const weeks = useMemo(() => viewWeeks(yw, view), [yw, view])
  const N = weeks.length
  const [planMode, setPlanMode] = useState<'mine' | 'master'>('mine')
  const [away, setAway] = useState<AwayDay[]>([])
  // The open unit, by placement and unit, so the panel is always drawn from the current bars (a stored copy went stale after every edit).
  const [pickedKey, setPickedKey] = useState<{ pl: string; unit: string } | null>(null)
  const setPicked = (b: Bar | null) => setPickedKey(b ? { pl: b.placement.id, unit: b.unit.id } : null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [busy, setBusy] = useState(false)
  const [blockForm, setBlockForm] = useState<CurriculumBlock | 'new' | null>(null)
  const [weekN, setWeekN] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [hiCode, setHiCode] = useState<string | null>(null)
  const [hoverCode, setHoverCode] = useState<string | null>(null)
  const [zoom, setZoomState] = useState<Zoom>('8')
  useEffect(() => { setZoomState(readZoom()) }, [])
  const setZoom = (z: Zoom) => { setZoomState(z); try { localStorage.setItem(ZOOM_KEY, z) } catch { /* private mode */ } }
  // My plan draws like the master; the comparison rail shows only when asked for.
  const [compare, setCompare] = useState(false)
  const areaRef = useRef<HTMLDivElement | null>(null)
  // The scrolling box, measured so a zoom can fill its width.
  const [boxW, setBoxW] = useState(0)
  const scrollEl = useRef<HTMLDivElement | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)
  const setScrollEl = useCallback((el: HTMLDivElement | null) => {
    roRef.current?.disconnect(); scrollEl.current = el
    if (el && typeof ResizeObserver !== 'undefined') { const ro = new ResizeObserver(() => setBoxW(el.clientWidth)); ro.observe(el); roRef.current = ro; setBoxW(el.clientWidth) }
  }, [])
  const dragRef = useRef<{ bar: Bar; mode: 'move' | 'resize'; x0: number; colW: number } | null>(null)
  // Set when a pointer-up ends a real drag, so the click that follows does not also open the panel.
  const justDragged = useRef(false)

  // Whose plan this is: the class's teacher. Their own when they look; the master otherwise.
  const classTeacher = teacherForClass(teachers, cls)
  const planTeacherId = classTeacher?.id || null
  const isOwn = !!currentTeacher && planTeacherId === currentTeacher.id
  const plansOn = !p.plansMissing
  const viewTeacher = planMode === 'mine' && plansOn ? planTeacherId : null
  const canEdit = isOwn && plansOn && planMode === 'mine' && N > 0

  // Away days for the whole year, once; holiday weeks come from them per half.
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!from || !to) { setAway([]); return }
    let on = true
    loadAwayDays(from, to, grade).then(a => { if (on) setAway(a) })
    return () => { on = false }
  }, [semesters, theYear, grade])
  useEffect(() => { setPicked(null); setBlockForm(null); setWeekN(null); setHiCode(null) }, [cls, grade, theYear, view, planMode])
  const loadLogs = useMemo(() => () => { if (p.plansMissing) return; fetchLogs(cls, grade).then(setLogs) }, [cls, grade, p.plansMissing])
  useEffect(() => { loadLogs() }, [loadLogs])
  // Lesson plans that name a unit, for a class whose board follows its plans.
  const [linked, setLinked] = useState<LinkedDay[]>([])
  useEffect(() => {
    const s = termDates(semesters, theYear, 'spring'), f = termDates(semesters, theYear, 'fall')
    const from = s.start || f.start, to = f.end || s.end
    if (!followsPlans(cls) || !from || !to) { setLinked([]); return }
    let on = true
    fetchLinked(cls, grade, from, to).then(l => { if (on) setLinked(l) })
    return () => { on = false }
  }, [cls, grade, semesters, theYear])

  const holSpring = useMemo(() => holidayWeeks(away, yw.spring), [away, yw.spring])
  const holFall = useMemo(() => holidayWeeks(away, yw.fall), [away, yw.fall])
  const hc: HolidayCounts = useMemo(() => ({ spring: holSpring.size, fall: holFall.size }), [holSpring, holFall])
  // Holiday columns of this view, with their names.
  const holidays = useMemo(() => {
    const m = new Map<number, string>()
    weeks.forEach(w => {
      const h = w.half || half
      const key = view === 'year' && h === 'fall' ? w.n - yw.spring.length : w.n
      const name = (h === 'spring' ? holSpring : holFall).get(key)
      if (name) m.set(w.n, name)
    })
    return m
  }, [weeks, view, half, holSpring, holFall, yw.spring.length])
  const holSet = useMemo(() => new Set(holidays.keys()), [holidays])
  const toCols = useMemo(() => <T extends { viewStart: number; viewEnd: number }>(bars: T[]) => teachingToColumns(bars, holSet, N), [holSet, N])
  // The teacher's plan is drawn from their lesson plans where they name a unit; the master never is.
  const follower = useMemo(() => viewTeacher && linked.length ? planFollower(linked, yw, new Set(holSpring.keys()), new Set(holFall.keys())) : undefined, [viewTeacher, linked, yw, holSpring, holFall])
  const fromPlans = useMemo(() => new Set(follower ? linked.map(l => l.unit_id) : []), [follower, linked])
  // For a class that plans in Lesson Plans (LESSON_SYNC_CLASSES), lessons go into days there only, and the
  // plans say where the class is: the week view only shows, and "we're here" is not offered.
  const planInLessons = followsPlans(cls)

  const placements = useMemo(() => p.placements.filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master), [p.placements, cls, grade, theYear])
  const lanes = useMemo(() => boardLanes(placements, p.pacing, p.units, p.books, p.series, view, yw, viewTeacher, hc, follower), [placements, p.pacing, p.units, p.books, p.series, view, yw, viewTeacher, hc, follower])
  const todayPos = todayPosition(weeks, today)
  // Zoomed in, the board opens with today in the middle.
  useEffect(() => {
    const el = scrollEl.current
    if (!el || !boxW || !N) return
    const sp = zoom === 'term' ? N : Math.min(N, Number(zoom))
    const at = focusWeek && focusWeek <= N ? focusWeek - 0.5 : todayPos
    if (sp >= N || at === null) { el.scrollLeft = 0; return }
    const cw = Math.max(84, (boxW - LABEL_W) / sp)
    el.scrollLeft = Math.max(0, (at - 1) * cw + cw / 2 - (boxW - LABEL_W) / 2)
  }, [zoom, view, cls, grade, theYear, boxW > 0, weekN, N, focusWeek]) // eslint-disable-line react-hooks/exhaustive-deps
  /** Today as a teaching week of a placement, with the fraction of the week gone: holiday columns before it are not counted. */
  const todayPlacement = (term: CurriculumPlacement['term']) => todayPos === null ? null : todayPos - Array.from(holSet).filter(h => h < Math.floor(todayPos)).length - viewShift(term, view, yw, hc)
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const lane of lanes) {
      const byPl = new Map<string, Bar[]>()
      for (const b of lane.bars) { if (!byPl.has(b.placement.id)) byPl.set(b.placement.id, []); byPl.get(b.placement.id)!.push(b) }
      let first = true
      Array.from(byPl.entries()).forEach(([key, rawBars]) => {
        const bars = toCols(rawBars)
        const pl = bars[0].placement
        const own = viewTeacher ? teacherRows(p.pacing, pl.id, viewTeacher) : []
        const anthology = bars[0].series?.kind === 'anthology'
        const len = placementLength(pl.term, yw, hc)
        const ticks: Row['ticks'] = []
        if (own.length) {
          const mb = toCols(barsForView(layoutPacing(projectAnthology(masterRows(p.pacing, pl.id), len), p.units), pl.term, view, yw, hc))
          for (const m of mb) {
            const t = bars.find(b => b.unit.id === m.unit.id)
            const offStart = !t || Math.abs(t.viewStart - m.viewStart) >= 0.5, offEnd = !t || Math.abs(t.viewEnd - m.viewEnd) >= 0.5
            if (!m.cutLeft) ticks.push({ at: m.viewStart - 1, off: offStart })
            if (!m.cutRight) ticks.push({ at: m.viewEnd, off: offEnd })
          }
        }
        const effective = own.length ? own : masterRows(p.pacing, pl.id)
        const shared = projectAnthology(effective, len)
        const drawn = follower ? follower(pl, shared) : shared
        const all = layoutPacing(drawn, p.units)
        const last = all.length ? all[all.length - 1].end : 0
        const progress = anthology ? anthologyProgress(drawn, len, todayPlacement(pl.term)).text : null
        out.push({ key, strand: lane.strand, first, bar0: bars[0], bars, ticks, overBy: len && last > len + 0.01 ? Math.round((last - len) * 2) / 2 : 0, anthology, progress })
        first = false
      })
    }
    return out
  }, [lanes, p.pacing, p.units, view, half, yw, viewTeacher, hc, toCols, todayPos, follower, holSet]) // eslint-disable-line react-hooks/exhaustive-deps
  // A unit the lesson plans have reached (named, or before the latest named unit of its book) is placed by the plans, not by dragging.
  const reachedTo = useMemo(() => {
    const m = new Map<string, number>()
    if (!follower) return m
    for (const r of rows) for (const b of r.bars) if (fromPlans.has(b.unit.id)) m.set(b.placement.id, Math.max(m.get(b.placement.id) ?? -Infinity, b.start))
    return m
  }, [rows, follower, fromPlans])
  const locked = (b: Bar) => fromPlans.has(b.unit.id) || (reachedTo.has(b.placement.id) && b.start <= reachedTo.get(b.placement.id)!)
  const picked = useMemo(() => pickedKey ? rows.flatMap(r => r.bars).find(b => b.placement.id === pickedKey.pl && b.unit.id === pickedKey.unit) || null : null, [pickedKey, rows])
  // Blocks are kept per half. The year view shows both, the fall's after the spring's teaching weeks.
  const blocks = useMemo(() => {
    if (view !== 'year') return toCols(blockBars(p.blocks, cls, grade, theYear, half, viewTeacher, N))
    const shift = yw.spring.length - hc.spring
    const fall = blockBars(p.blocks, cls, grade, theYear, 'fall', viewTeacher, N).map(b => ({ ...b, viewStart: b.viewStart + shift, viewEnd: b.viewEnd + shift }))
    return toCols([...blockBars(p.blocks, cls, grade, theYear, 'spring', viewTeacher, N), ...fall])
  }, [p.blocks, cls, grade, theYear, half, view, viewTeacher, N, toCols, yw.spring.length, hc.spring])
  const pins = useMemo(() => {
    const m = new Map<string, { week: number; lag: number; set_at: string }>()
    // Classes that plan in Lesson Plans have no "we're here" pins: the plans are where they are.
    if (!viewTeacher || planInLessons) return m
    for (const r of rows) {
      const pl = r.bar0.placement
      const h = p.here.find(x => x.placement_id === pl.id && x.teacher_id === viewTeacher)
      if (!h) continue
      const teaching = h.week + viewShift(pl.term, view, yw, hc)
      const wk = toCols([{ viewStart: teaching, viewEnd: teaching }])[0].viewStart
      if (wk < 1 || wk > N) continue
      m.set(pl.id, { week: wk, lag: lagWeeks(h, todayPos, weeks), set_at: h.set_at })
    }
    return m
  }, [rows, p.here, viewTeacher, view, yw, hc, N, todayPos, weeks, toCols, planInLessons])
  const review = useMemo(() => isOwn && viewTeacher ? p.reviews.filter(r => r.teacher_id === viewTeacher && placements.some(pl => pl.id === r.placement_id) && r.comment) : [], [p.reviews, isOwn, viewTeacher, placements])
  const standards = useMemo(() => {
    const inPlan = new Set<string>()
    for (const r of rows) for (const b of r.bars) { b.unit.ccss_codes.forEach(c => inPlan.add(c)); p.lessons.filter(l => l.unit_id === b.unit.id).forEach(l => l.ccss_codes.forEach(c => inPlan.add(c))) }
    // A lesson named in the lesson plans counts as taught once its day has passed.
    const fromDays: LogRow[] = linked.filter(l => l.lesson_id && !logs.some(x => x.lesson_id === l.lesson_id && x.date === l.date)).map(l => ({ id: `plan-${l.date}-${l.lesson_id}`, lesson_id: l.lesson_id!, unit_id: l.unit_id, english_class: cls, grade, date: l.date, teacher_id: null, done: l.date < today, done_at: null, created_at: '' }))
    const cov = new Map(coverage([...logs, ...fromDays], p.lessons).map(c => [c.code, c]))
    const codes = Array.from(new Set([...Array.from(inPlan), ...Array.from(cov.keys())])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    return CCSS_DOMAINS.map(d => ({ key: d.key, label: d.label, codes: codes.filter(c => c.startsWith(d.key + '.')).map(c => ({ code: c, inPlan: inPlan.has(c), taught: cov.get(c)?.taught || 0, planned: cov.get(c)?.planned || 0 })) })).filter(d => d.codes.length)
  }, [rows, p.lessons, logs, linked, cls, grade, today])
  const unitHas = (u: CurriculumUnit, code: string) => u.ccss_codes.includes(code) || p.lessons.some(l => l.unit_id === u.id && l.ccss_codes.includes(code))
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  // ── Editing ──
  const lengthOf = (b: Bar) => placementLength(b.placement.term, yw, hc)
  const label = (b: Bar) => `${bookName(b.book, b.series)} · ${b.unit.title}`
  /** The teacher's rows, frozen at their shared lengths the first time anything is dragged. */
  const own = async (b: Bar): Promise<{ rows: CurriculumPacing[]; pre: RowPatch[]; error: string | null }> => {
    setBusy(true)
    const r = await ensureOwnPlan(p.pacing, b.placement.id, currentTeacher!.id)
    if (r.error) { setBusy(false); fail(r.error); return { rows: [], pre: [], error: r.error } }
    const pre = freezeProjection(r.rows, lengthOf(b))
    return { rows: applyPatches(r.rows, pre), pre, error: null }
  }
  const moveTo = async (b: Bar, targetStart: number, pin = false) => {
    const r = await own(b); if (r.error) return
    // The bar is drawn where the board shows it, which can differ from the stored plan
    // (the lesson plans move named units): move the stored unit by the same amount.
    const stored = layoutPacing(r.rows, p.units).find(x => x.unit.id === b.unit.id)
    const patches = [...r.pre, ...reflowTo(r.rows, p.units, b.unit.id, stored ? stored.start + (targetStart - b.start) : targetStart)]
    if (patches.length && fail(await patchOwnRows(patches, label(b)))) { setBusy(false); return }
    if (pin && fail(await setHere(b.placement.id, currentTeacher!.id, b.unit.id, targetStart, '', label(b)))) { setBusy(false); return }
    await p.reload(); setBusy(false)
  }
  const resize = async (b: Bar, weeksNew: number) => {
    const r = await own(b); if (r.error) return
    const mine = r.rows.find(x => x.unit_id === b.unit.id)
    const patches = [...r.pre.filter(x => x.id !== mine?.id), ...(mine ? [{ id: mine.id, weeks: Math.max(0.5, weeksNew), fixed: true }] : [])]
    if (!fail(await patchOwnRows(patches, label(b)))) await p.reload()
    setBusy(false)
  }
  /** Today's column as a teaching week of the placement. */
  const todayTeaching = (b: Bar) => { const t = todayPlacement(b.placement.term); return t === null ? null : Math.floor(t) }
  const hereNow = async (b: Bar) => {
    const t = todayTeaching(b)
    if (t === null) { showToast(ko ? '오늘이 이 기간 밖입니다' : 'Today is outside this view'); return }
    await moveTo(b, t, true)
  }
  const tickDone = async (b: Bar, done: boolean) => {
    setBusy(true)
    const r = await ensureOwnPlan(p.pacing, b.placement.id, currentTeacher!.id)
    if (r.error) { setBusy(false); fail(r.error); return }
    const mine = r.rows.find(x => x.unit_id === b.unit.id)
    if (mine && !fail(await setOwnDone(mine.id, done, label(b)))) await p.reload()
    setBusy(false)
  }
  const dropUnit = async (b: Bar) => {
    if (!await confirmDialog({ title: ko ? '건너뛰기' : 'Skip this one', message: ko ? `${b.unit.title}을(를) 내 계획에서 뺍니다.` : `${splitUnitTitle(b.unit.title).name} comes out of your plan. The school plan keeps it, and you can add it back.`, confirmLabel: ko ? '빼기' : 'Skip' })) return
    setBusy(true)
    const r = await ensureOwnPlan(p.pacing, b.placement.id, currentTeacher!.id)
    if (r.error) { setBusy(false); fail(r.error); return }
    const mine = r.rows.find(x => x.unit_id === b.unit.id)
    if (mine && !fail(await dropOwnUnit(mine.id, b.unit.title))) await p.reload()
    setBusy(false); setPicked(null)
  }
  const addBack = async (b: Bar, unit: CurriculumUnit) => {
    setBusy(true)
    const r = await ensureOwnPlan(p.pacing, b.placement.id, currentTeacher!.id)
    if (r.error) { setBusy(false); fail(r.error); return }
    if (!fail(await addOwnUnit(b.placement.id, currentTeacher!.id, unit, r.rows.reduce((m, x) => Math.max(m, x.sort_order), 0), unit.title))) await p.reload()
    setBusy(false)
  }
  const backToMaster = async (b: Bar) => {
    if (!await confirmDialog({ title: ko ? '학교 계획으로 되돌리기' : 'Back to the school plan', message: ko ? `${bookName(b.book, b.series)}의 내 변경을 모두 버립니다.` : `Your changes to ${bookName(b.book, b.series)} go, and the school plan applies again.`, confirmLabel: ko ? '되돌리기' : 'Go back' })) return
    setBusy(true)
    if (!fail(await revertToMaster(b.placement.id, currentTeacher!.id, bookName(b.book, b.series), 'teacher'))) await p.reload()
    setBusy(false); setPicked(null)
  }

  // ── Drag ──
  const startDrag = (e: React.PointerEvent, b: Bar, mode: 'move' | 'resize') => {
    if (!canEdit || busy || !areaRef.current || locked(b)) return
    e.preventDefault(); e.stopPropagation()
    const colW = areaRef.current.getBoundingClientRect().width / N
    dragRef.current = { bar: b, mode, x0: e.clientX, colW }
    const from = mode === 'move' ? b.viewStart : b.viewEnd
    setDrag({ id: b.pacing.id, mode, dx: 0, moved: false, colW, from })
    const onMove = (ev: PointerEvent) => { const d = dragRef.current; if (!d) return; const dx = ev.clientX - d.x0; setDrag({ id: d.bar.pacing.id, mode: d.mode, dx, moved: Math.abs(dx) > 4, colW: d.colW, from }) }
    const onUp = async (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp)
      const d = dragRef.current; dragRef.current = null
      if (!d) { setDrag(null); return }
      const dx = ev.clientX - d.x0
      if (Math.abs(dx) > 4) { justDragged.current = true; setTimeout(() => { justDragged.current = false }, 0) }
      // Bars snap to whole weeks: the plan is an estimate, not a timetable.
      // Columns become teaching weeks, so a drag across a holiday week is not counted twice.
      const dc = Math.round(dx / d.colW)
      if (!dc) { setDrag(null); return }
      // The preview stays where it was dropped until the saved plan comes back, so the bar does not jump back meanwhile.
      setDrag({ id: d.bar.pacing.id, mode: d.mode, dx: dc * d.colW, moved: true, colW: d.colW, from, saving: true })
      const teach = (c: number) => columnToTeaching(c, holSet)
      try {
        if (d.mode === 'move') { const f = Math.round(d.bar.viewStart); await moveTo(d.bar, Math.round(d.bar.start) + teach(f + dc) - teach(f)) }
        else { const end = Math.round(d.bar.viewEnd); await resize(d.bar, snapWeeks(d.bar.pacing.weeks + teach(end + dc) - teach(end))) }
      } finally { setDrag(null) }
    }
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp)
  }
  const previewStyle = (b: Bar): React.CSSProperties => {
    if (!drag || drag.id !== b.pacing.id) return {}
    // Once the saved plan has come back the bar is already in its new place.
    if (drag.saving && (drag.mode === 'move' ? b.viewStart : b.viewEnd) !== drag.from) return {}
    // The preview jumps a column at a time, so it is clear where the bar will land.
    const snapped = Math.round(drag.dx / drag.colW) * drag.colW
    if (drag.mode === 'move') return { transform: `translateX(${snapped}px)`, opacity: 0.85, zIndex: 5, transition: 'transform 80ms ease-out' }
    return { width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 4px + ${snapped}px)`, zIndex: 5, transition: 'width 80ms ease-out' }
  }

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Admin runs supabase/migration-curriculum-catalogue.sql first.' : 'Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  const lagLines = rows.map(r => ({ r, pin: pins.get(r.bar0.placement.id) })).filter(x => x.pin && x.pin.lag >= 0.5)
  const overRows = rows.filter(r => r.overBy > 0)
  const span = zoom === 'term' ? N : Math.min(N, Number(zoom))
  const fitW = boxW > LABEL_W && span ? (boxW - LABEL_W) / span : 0
  const colW = Math.max(zoom === 'term' ? 28 : 84, fitW || (view === 'year' ? 48 : 84))
  const zoomLabel = (z: Zoom) => z === 'term' ? (ko ? '학기 전체' : view === 'year' ? 'Whole year' : 'Whole term') : (ko ? `${z}주` : `${z} weeks`)
  const summerAt = view === 'year' ? weeks.findIndex(w => w.half === 'fall') : -1
  const viewLabel = (v: View) => v === 'year' ? (ko ? '한 해' : 'Year') : (ko ? TERM_LABEL[v].ko : TERM_LABEL[v].en)
  const rangeText = N ? `${N} ${ko ? '주' : 'weeks'} · ${fmtDay(weeks[0].monday, ko)} – ${fmtDay(weeks[N - 1].friday, ko)}${holidays.size ? ` · ${holidays.size} ${ko ? '쉬는 주' : holidays.size === 1 ? 'holiday week' : 'holiday weeks'}` : ''}` : (ko ? '이 기간의 날짜가 없습니다' : 'No weeks for this view yet')
  const weekLabel = (w: typeof weeks[number]) => view === 'year' ? (w.half === 'fall' ? `F${w.n - yw.spring.length}` : `S${w.n}`) : `W${w.n}`

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-2">
        <label className="text-[11px] text-ink-3">{ko ? '반' : 'Class'}<br />
          <select value={cls} onChange={e => setCls(e.target.value)} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}{c === ownClass ? (ko ? ' (내 반)' : ' (mine)') : ''}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년' : 'Grade'}<br />
          <select value={grade} onChange={e => setGrade(Number(e.target.value))} className={sel}>{GRADES.map(g => <option key={g} value={g}>{ko ? `${g}학년` : `Grade ${g}`}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        {views.length > 1 && <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden">
          {views.map((v, i) => <button key={v} onClick={() => setViewPick(v)} className={`h-8 px-3 text-[12.5px] ${i ? 'border-l border-rule-2' : ''} ${view === v ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{viewLabel(v)}</button>)}
        </div>}
        {plansOn && (
          <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden">
            <button onClick={() => setPlanMode('mine')} className={`h-8 px-3 text-[12.5px] ${planMode === 'mine' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{isOwn ? (ko ? '내 계획' : 'My plan') : (classTeacher ? `${classTeacher.name.split(' ')[0]}${ko ? '의 계획' : '’s plan'}` : (ko ? '교사 계획' : 'Teacher’s plan'))}</button>
            <button onClick={() => setPlanMode('master')} className={`h-8 px-3 text-[12.5px] border-l border-rule-2 ${planMode === 'master' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{ko ? '학교 계획' : 'School plan'}</button>
          </div>
        )}
        {N > 0 && <div role="group" aria-label={ko ? '확대' : 'Zoom'} className="inline-flex rounded border border-rule-2 overflow-hidden">
          {(['8', '12', 'term'] as Zoom[]).map((z, i) => <button key={z} onClick={() => setZoom(z)} className={`h-8 px-3 text-[12.5px] ${i ? 'border-l border-rule-2' : ''} ${zoom === z ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{zoomLabel(z)}</button>)}
        </div>}
        {plansOn && planMode === 'mine' && viewTeacher && <label className="h-8 inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 cursor-pointer"><input type="checkbox" checked={compare} onChange={e => setCompare(e.target.checked)} />{ko ? '학교 계획과 비교' : 'Compare with the school plan'}</label>}
        <span className="text-[12px] text-ink-3 pb-2">{rangeText}</span>
      </div>
      {(isAdmin || !N) && <div className="mb-3"><PeriodsLine year={theYear} /></div>}
      {p.plansMissing && isAdmin && <p className="text-[12px] text-warn mb-3">{ko ? 'supabase/migration-curriculum-teacher-plans.sql을 실행하면 교사 계획, 핀, 블록이 켜집니다.' : 'Run supabase/migration-curriculum-teacher-plans.sql to turn on teachers’ own plans, pins and blocks.'}</p>}

      {(lagLines.length > 0 || overRows.length > 0 || review.length > 0 || rows.some(r => r.anthology && r.progress)) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {rows.filter(r => r.anthology && r.progress).map(r => <span key={r.key + 'p'} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 bg-paper-2 px-2.5 py-1 rounded"><span className="w-2 h-2 rounded-sm" style={{ background: r.bar0.color }} />{r.bar0.series?.name} {r.bar0.book.level_number}: {r.progress}</span>)}
          {lagLines.map(({ r, pin }) => <span key={r.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 bg-paper-2 px-2.5 py-1 rounded"><Flag size={11} className="text-accent" />{r.bar0.series?.name} {r.bar0.book.level_number}: {num(pin!.lag)} {ko ? '주 전 핀' : `wk since "we’re here"`}</span>)}
          {overRows.map(r => <span key={r.key} className="inline-flex items-center gap-1.5 text-[12px] text-bad bg-bad-soft px-2.5 py-1 rounded">{r.bar0.series?.name} {r.bar0.book.level_number}: {ko ? `학기보다 ${num(r.overBy)}주 김` : `runs ${num(r.overBy)} wk past the term`}</span>)}
          {review.map(rv => <span key={rv.id} className="inline-flex items-center gap-1.5 text-[12px] text-ink bg-accent-soft px-2.5 py-1 rounded" title={rv.seen_at ? fmtDay(rv.seen_at.slice(0, 10), ko) : ''}>{ko ? '관리자' : 'From admin'}: {rv.comment}</span>)}
        </div>
      )}

      {N > 0 && rows.length === 0 && (
        <p className="text-[12.5px] text-ink-3 mb-4 mt-2">{ko ? '이 반, 학년, 기간에 배치된 책이 없습니다.' : `Nothing placed for ${cls} Grade ${grade} in this view.`}{isAdmin && <> {ko ? '교육과정 지도에서 책을 놓으세요.' : 'Place books on Planning → Books by class.'}</>}</p>
      )}

      {N > 0 && weekN !== null && weeks[weekN - 1] && currentTeacher && (
        <WeekView cls={cls} grade={grade} week={weeks[weekN - 1]} label={weekLabel(weeks[weekN - 1]).replace(/^W/, '')} bars={rows.flatMap(r => r.bars)} units={p.units} lessons={p.lessons} canEdit={canEdit && !p.plansMissing && !planInLessons} planInLessons={planInLessons} teacherId={currentTeacher.id} today={today} holiday={holidays.get(weekN)} onBack={() => setWeekN(null)} onChanged={loadLogs} />
      )}
      {N > 0 && weekN === null && (rows.length > 0 || canEdit || blocks.length > 0) && (
        <div className="flex gap-5 items-start flex-wrap mt-2">
          <div className="flex-[999_1_640px] min-w-0 border border-rule rounded overflow-hidden bg-surface">
            <div className="overflow-x-auto" ref={setScrollEl}>
              <div style={{ width: Math.max(LABEL_W + N * colW, boxW || 0) }}>
                {/* Week header */}
                <div className="flex border-b border-rule">
                  <div className="shrink-0 px-3 py-2 text-[10.5px] uppercase tracking-wide text-ink-3 self-end border-r border-rule" style={stickyLabel}>{ko ? '영역 · 책' : 'Strand · book'}</div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                    {weeks.map((w, i) => {
                      const hol = holidays.get(w.n)
                      const isNow = todayPos !== null && Math.floor(todayPos) === w.n
                      return (
                        <button key={w.n} onClick={() => setWeekN(w.n)} className={`px-0.5 py-1.5 text-center hover:bg-paper-2 ${i === summerAt ? 'border-l-[3px] border-ink-3' : 'border-l border-rule'} ${isNow ? 'bg-accent-soft' : hol ? 'bg-paper-2' : ''} ${focusWeek === w.n ? 'ring-2 ring-inset ring-ink' : ''}`} title={(hol ? hol + ' · ' : '') + (ko ? '이 주 열기' : 'Open this week')}>
                          <div className={`text-[11px] font-semibold ${isNow ? 'text-accent' : 'text-ink'}`}>{weekLabel(w)}</div>
                          <div className="text-[9.5px] text-ink-3 truncate">{hol ? hol : fmtDay(w.monday, ko)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* Rows */}
                <div className="relative">
                  {rows.map((r, ri) => {
                    const pin = pins.get(r.bar0.placement.id)
                    return (
                      <div key={r.key} className={`flex ${r.first ? 'border-t border-rule-2' : 'border-t border-rule'} first:border-t-0`} style={{ height: ROW_H }}>
                        <div className="shrink-0 px-3 flex flex-col justify-center border-r border-rule gap-0.5" style={stickyLabel}>
                          {r.first && <span className="text-[9.5px] uppercase tracking-wide text-ink-3">{ko ? STRAND_LABEL[r.strand].ko : STRAND_LABEL[r.strand].en}</span>}
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-display text-[17px] leading-none" style={{ color: r.bar0.color }}>{levelShort(r.bar0.book.level_number) || '·'}</span>
                            <span className="text-[12px] font-medium text-ink truncate" title={bookName(r.bar0.book, r.bar0.series)}>{r.bar0.series?.name}</span>
                          </span>
                          {r.ticks.length > 0 && <span className="text-[9.5px] text-ink-3">{r.ticks.some(t => t.off) ? (ko ? '학교 계획과 다름' : 'differs from the school plan') : (ko ? '학교 계획과 같음' : 'same as the school plan')}</span>}
                        </div>
                        <div className="flex-1 relative" ref={ri === 0 ? areaRef : undefined} style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--rule)) 1px, transparent 1px)', backgroundSize: `${100 / N}% 100%` }}>
                          {Array.from(holidays.keys()).map(n => <div key={n} className="absolute inset-y-0 pointer-events-none" style={{ left: `${(n - 1) / N * 100}%`, width: `${100 / N}%`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 3px, transparent 3px 7px)' }} />)}
                          {summerAt > 0 && <div className="absolute inset-y-0 pointer-events-none border-l-[3px] border-ink-3" style={{ left: `${summerAt / N * 100}%` }} />}
                          {compare && r.ticks.length > 0 && <>
                            <div className="absolute left-0 right-0 pointer-events-none" style={{ bottom: 5, height: 2, background: 'rgb(var(--rule-2))' }} />
                            {r.ticks.map((t, i) => <div key={i} className="absolute pointer-events-none" style={{ left: `calc(${t.at / N * 100}% - 1px)`, bottom: 2, width: 2, height: 9, background: t.off ? 'rgb(var(--accent))' : 'rgb(var(--ink-3))' }} />)}
                          </>}
                          {r.bars.map(b => {
                            const on = picked?.pacing.id === b.pacing.id
                            const t = splitUnitTitle(b.unit.title)
                            const open = r.anthology && !b.pacing.done_at
                            // A one-week bar has room for the name on two lines and nothing else.
                            const narrow = b.viewEnd - b.viewStart < 1.5
                            return (
                              <button key={b.pacing.id} onPointerDown={e => startDrag(e, b, 'move')} onClick={() => { if (justDragged.current) return; setPicked(on ? null : b) }} title={`${b.unit.title} · ${ko ? '주' : 'wk'} ${num(b.viewStart)}–${num(b.viewEnd)}`}
                                className={`absolute text-left px-2 flex flex-col justify-center overflow-hidden select-none ${b.cutLeft ? 'rounded-l-none' : 'rounded-l'} ${b.cutRight ? 'rounded-r-none' : 'rounded-r'} ${on ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''} ${canEdit && !locked(b) ? 'cursor-grab active:cursor-grabbing' : ''} ${open ? 'text-ink' : 'text-white'}`}
                                style={{ left: `${(b.viewStart - 1) / N * 100}%`, width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 4px)`, marginLeft: 2, top: 8, height: ROW_H - (compare && r.ticks.length ? 24 : 16), background: open ? `${b.color}33` : b.color, boxShadow: open ? `inset 0 0 0 2px ${b.color}` : undefined, opacity: hiCode ? (unitHas(b.unit, hiCode) ? 1 : 0.25) : 1, touchAction: 'none', ...previewStyle(b) }}>
                                <span className={`block font-semibold leading-snug break-words line-clamp-2 ${narrow ? 'text-[11.5px]' : 'text-[12.5px]'}`} style={{ paddingRight: b.pacing.done_at ? 10 : 0 }}>{t.name}</span>
                                {!narrow && <span className="block text-[9.5px] opacity-85 leading-tight truncate">{t.badge ? `${t.badge} · ` : ''}{b.pacing.fixed ? '' : '≈ '}{num(b.pacing.weeks)} {ko ? '주' : 'wk'}</span>}
                                {b.pacing.done_at && <Check size={10} strokeWidth={3} className="absolute top-1 right-1 opacity-90" aria-label={ko ? '완료' : 'done'} />}
                                {canEdit && !b.cutRight && !locked(b) && <span onPointerDown={e => startDrag(e, b, 'resize')} className="absolute top-0 bottom-0 right-0 w-2.5 cursor-ew-resize hover:bg-white/25" aria-hidden="true" />}
                              </button>
                            )
                          })}
                          {pin && (
                            <>
                              <div className="absolute top-0 pointer-events-none" style={{ left: `${(pin.week - 1) / N * 100}%` }}>
                                <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-accent -translate-x-1/2" />
                              </div>
                              {/* From the pin to today, measured across the row, not inside the pin. */}
                              {pin.lag >= 0.5 && todayPos !== null && todayPos > pin.week && <div className="absolute top-[3px] border-t-2 border-dotted border-accent opacity-80 pointer-events-none" style={{ left: `${(pin.week - 1) / N * 100}%`, width: `${(todayPos - pin.week) / N * 100}%` }} />}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Our class: blocks */}
                  {(blocks.length > 0 || canEdit) && (
                    <div className="flex border-t border-rule-2" style={{ height: ROW_H }}>
                      <div className="shrink-0 px-3 flex flex-col justify-center border-r border-rule gap-0.5" style={stickyLabel}>
                        <span className="text-[9.5px] uppercase tracking-wide text-ink-3">{ko ? '우리 반' : 'Our class'}</span>
                        <span className="text-[12px] font-medium text-ink">{ko ? '자체 블록' : 'Own blocks'}</span>
                        {canEdit && view === 'year' && <span className="text-[10.5px] text-ink-3">{ko ? '봄이나 가을에서 추가' : 'Add in Spring or Fall'}</span>}
                        {canEdit && view !== 'year' && <button onClick={() => setBlockForm('new')} className="text-[11px] text-accent text-left inline-flex items-center gap-1"><Plus size={10} />{ko ? '블록 추가' : 'Add a block'}</button>}
                      </div>
                      <div className="flex-1 relative" ref={rows.length === 0 ? areaRef : undefined} style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--rule)) 1px, transparent 1px)', backgroundSize: `${100 / N}% 100%` }}>
                        {blocks.map(b => (
                          <button key={b.id} onClick={() => canEdit && view !== 'year' && setBlockForm(b)} title={b.title}
                            className="absolute text-left px-2 flex flex-col justify-center overflow-hidden rounded border-[1.5px] border-dashed border-ink-3 bg-paper text-ink"
                            style={{ left: `${(b.viewStart - 1) / N * 100}%`, width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 4px)`, marginLeft: 2, top: 8, height: ROW_H - 16 }}>
                            <span className="block text-[11.5px] font-semibold leading-tight truncate">{b.title}</span>
                            <span className="block text-[9.5px] text-ink-3 leading-tight truncate">{num(b.weeks)} {ko ? '주' : 'wk'}{b.skill_tags.length ? ` · ${b.skill_tags.join(', ')}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {todayPos !== null && (rows.length > 0 || blocks.length > 0 || canEdit) && (
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(todayPos - 1) / N})`, zIndex: 3 }}>
                      <div className="w-[2px] h-full bg-accent" />
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-accent text-white text-[9.5px] font-semibold px-1.5 rounded-b">{ko ? '오늘' : 'today'}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {standards.length > 0 && (
              <div className="border-t border-rule px-3 py-2 bg-paper">
                <div className="flex items-center gap-3 flex-wrap mb-1.5">
                  <span className="text-[10.5px] uppercase tracking-wide text-ink-3">{ko ? '이 계획의 표준' : 'Standards in this plan'}</span>
                  <span className="text-[10.5px] text-ink-3 inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-ink-2" />{ko ? '가르침' : 'taught'}</span>
                  <span className="text-[10.5px] text-ink-3 inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm border-[1.5px] border-ink-2" />{ko ? '계획됨' : 'in the plan'}</span>
                  <span className="text-[10.5px] text-ink-3">{ko ? '코드를 누르면 그 표준을 가르치는 단원만 밝게 보입니다' : 'Hover a code to read it, click to light the units that teach it'}</span>
                  {hiCode && <button onClick={() => setHiCode(null)} className="text-[10.5px] text-accent">{ko ? '해제' : 'Clear'}</button>}
                </div>
                {(hoverCode || hiCode) && (() => { const i = standardInfo((hoverCode || hiCode)!); return (
                  <div className="mb-2 px-3 py-2 rounded bg-surface border border-rule text-[12px] leading-snug">
                    <span className="font-semibold text-ink">{i.code}</span>{i.plain && <span className="text-ink"> · {i.plain}</span>}
                    {i.text && <span className="block text-ink-2 mt-0.5">{i.text}</span>}
                  </div>) })()}
                <div className="flex flex-col gap-1">
                  {standards.map(d => (
                    <div key={d.key} className="flex items-start gap-2 text-[11px]">
                      <span className="w-[150px] shrink-0 text-ink-3 truncate pt-0.5" title={d.label}>{d.key} · {d.label}</span>
                      <span className="flex flex-wrap gap-1">
                        {d.codes.map(c => (
                          <button key={c.code} onClick={() => setHiCode(hiCode === c.code ? null : c.code)} onMouseEnter={() => setHoverCode(c.code)} onMouseLeave={() => setHoverCode(h => h === c.code ? null : h)} onFocus={() => setHoverCode(c.code)} onBlur={() => setHoverCode(h => h === c.code ? null : h)} title={`${standardTitle(c.code)} · ${c.taught} ${ko ? '가르침' : 'taught'}, ${c.planned} ${ko ? '날짜에 들어감' : 'planned'}`}
                            className={`h-5 px-1.5 rounded text-[10px] font-semibold tabular-nums ${c.taught ? 'bg-ink-2 text-paper' : c.inPlan ? 'border-[1.5px] border-ink-2 text-ink-2' : 'border border-rule-2 text-ink-3'} ${hiCode === c.code ? 'ring-2 ring-accent' : ''}`}>{c.code.replace(/^(RL|RI|RF|W|SL|L)\./, '')}{c.taught ? ` ·${c.taught}` : ''}</button>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="px-3 py-2 text-[11px] text-ink-3 border-t border-rule flex gap-4 flex-wrap">
              <span>{ko ? '빗금: 학교 달력의 쉬는 주, 수업 주로 세지 않음 · 주 번호를 누르면 그 주를 엽니다' : 'Hatched: a holiday week from the school calendar, not counted as teaching · click a week number to open it'}</span>
              {canEdit ? <span>{ko ? '막대를 끌어 옮기고, 오른쪽 끝을 끌어 늘리세요. 처음 끌면 모든 단원의 길이가 고정됩니다.' : 'Drag a bar to move it, drag its right edge to stretch it; bars snap to whole weeks. The first drag pins every unit at its current length so the others stay put.'}</span> : <span>{ko ? '막대 클릭: 단원의 차시와 자료' : 'Click a bar for the unit’s lessons and files'}</span>}
              {follower && <span>{ko ? '수업 계획에 적힌 단원은 그 날짜대로 그려집니다' : 'Units your lesson plans name are drawn where the plans put them'}</span>}
              <span className="ml-auto">{viewTeacher ? (isOwn ? (ko ? '내 계획' : 'Your plan') : (ko ? '교사 계획 · 읽기 전용' : 'The teacher’s plan · read-only')) : (ko ? '학교 계획 · 읽기 전용' : 'The school plan · read-only')}</span>
            </div>
          </div>
          {picked && <UnitPanel b={picked} anthology={picked.series?.kind === 'anthology'} onDone={d => tickDone(picked, d)} lessons={p.lessons.filter(l => l.unit_id === picked.unit.id).sort((a, b) => a.sort_order - b.sort_order)} resources={p.resources} ko={ko} busy={busy} canEdit={canEdit} fromPlans={locked(picked)} noHere={planInLessons} ownPlan={!!viewTeacher && hasOwnPlan(p.pacing, picked.placement.id, viewTeacher)} todayWeek={todayPos !== null ? Math.floor(todayPos) : null}
            missing={p.units.filter(u => u.book_id === picked.book.id && !(viewTeacher ? teacherRows(p.pacing, picked.placement.id, viewTeacher) : masterRows(p.pacing, picked.placement.id)).some(r => r.unit_id === u.id)).sort((a, b) => a.sort_order - b.sort_order)}
            onClose={() => setPicked(null)} onHere={() => hereNow(picked)} onShift={d => moveTo(picked, picked.start + d)} onWeeks={w => resize(picked, w)} onDrop={() => dropUnit(picked)} onAddBack={u => addBack(picked, u)} onBack={() => backToMaster(picked)} />}
          {blockForm && canEdit && view !== 'year' && currentTeacher && (
            <BlockForm initial={blockForm === 'new' ? null : blockForm} ko={ko} n={N} todayWeek={todayPos !== null ? columnToTeaching(Math.floor(todayPos), holSet) : 1} onCancel={() => setBlockForm(null)}
              onSave={async d => { const e = await saveBlock(blockForm === 'new' ? null : blockForm.id, { teacher_id: currentTeacher.id, english_class: cls, grade, academic_year: theYear, term: half }, d); if (!fail(e)) { setBlockForm(null); p.reload() } }}
              onDelete={blockForm === 'new' ? undefined : async () => { if (!fail(await deleteBlock(blockForm))) { setBlockForm(null); p.reload() } }} />
          )}
        </div>
      )}
    </div>
  )
}

// ─── The open unit ───────────────────────────────────────────────
interface PanelProps {
  b: Bar; lessons: CurriculumLesson[]; resources: { id: string; unit_id: string | null; lesson_id: string | null; name: string; kind: string; url: string; copies_hint: number | null }[]
  ko: boolean; busy: boolean; canEdit: boolean; fromPlans: boolean; noHere?: boolean; ownPlan: boolean; todayWeek: number | null; missing: CurriculumUnit[]; anthology: boolean; onDone: (done: boolean) => void
  onClose: () => void; onHere: () => void; onShift: (d: number) => void; onWeeks: (w: number) => void; onDrop: () => void; onAddBack: (u: CurriculumUnit) => void; onBack: () => void
}
function UnitPanel({ b, lessons, resources, ko, busy, canEdit, fromPlans, noHere, ownPlan, todayWeek, missing, anthology, onDone, onClose, onHere, onShift, onWeeks, onDrop, onAddBack, onBack }: PanelProps) {
  const unit: CurriculumUnit = b.unit
  const unitRes = resources.filter(r => r.unit_id === unit.id)
  const t = splitUnitTitle(unit.title)
  const [adding, setAdding] = useState('')
  const noun = anthology ? (ko ? '이야기' : 'story') : (ko ? '단원' : 'unit')
  return (
    <aside className="flex-[1_1_300px] max-w-[380px] border border-rule-2 rounded bg-surface" style={{ borderTop: `4px solid ${b.color}` }}>
      <div className="px-4 py-3 border-b border-rule flex items-start gap-3">
        <span className="font-display text-[28px] leading-none" style={{ color: b.color }}>{levelShort(b.book.level_number) || '·'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink leading-tight">{t.name}</p>
          <p className="text-[11.5px] text-ink-3">{t.badge ? `${t.badge} · ` : ''}{bookName(b.book, b.series)} · {ko ? '주' : 'wk'} {num(b.viewStart)}–{num(b.viewEnd)} · {b.pacing.fixed ? '' : '≈ '}{num(b.pacing.weeks)} {ko ? '주' : b.pacing.weeks === 1 ? 'week' : 'weeks'}</p>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close"><X size={14} /></button>
      </div>
      {canEdit && fromPlans && (
        <p className="px-4 py-3 border-b border-rule bg-paper-2 text-[11.5px] text-ink-2 leading-snug">{ko ? '이 단원의 주는 수업 계획에서 옵니다. 수업 계획에서 날짜를 바꾸면 여기도 바뀝니다.' : 'Your lesson plans have reached this unit, so its weeks come from them. Move the days in Lesson Plans (Move a day later or earlier) and the bar moves with them.'}</p>
      )}
      {canEdit && !fromPlans && (
        <div className="px-4 py-3 border-b border-rule flex flex-col gap-2 bg-paper-2">
          {anthology ? (
            <>
              <button onClick={() => onDone(!b.pacing.done_at)} disabled={busy} className={b.pacing.done_at ? btn : btnP}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{b.pacing.done_at ? (ko ? '완료 취소' : 'Not done after all') : (ko ? '이 이야기 완료' : 'Done with this story')}</button>
              <p className="text-[11px] text-ink-3 leading-snug">{ko ? '읽기 목록은 이야기 수로 진도를 봅니다. 끝낸 이야기를 표시하세요.' : 'A reading list counts stories. Tick each one as you finish it and the line above the board says where you stand.'}</p>
            </>
          ) : noHere ? (
            <p className="text-[11px] text-ink-3 leading-snug">{ko ? '수업 계획이 반이 어디까지 왔는지 정합니다. 단원을 날짜에 넣으면 보드가 따라옵니다.' : 'Your lesson plans say where the class is: put this unit into days in Lesson Plans and the board follows. Here you can move or stretch units the plans have not reached yet.'}</p>
          ) : (
            <>
              <button onClick={onHere} disabled={busy || todayWeek === null || todayWeek === Math.floor(b.viewStart)} className={btnP}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}{ko ? `여기까지 왔어요: 이 단원을 ${todayWeek ?? '?'}주에 시작` : `We’re here: this unit starts in week ${todayWeek ?? '?'}`}</button>
              <p className="text-[11px] text-ink-3 leading-snug">{ko ? '뒤처졌으면 이 단원 앞에 빈 주가 생기고, 앞섰으면 이전 단원이 짧아집니다.' : 'Behind: a gap opens before this unit. Ahead: the units before it get shorter. Everything after moves with it.'}</p>
            </>
          )}
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => onShift(-1)} disabled={busy} className={btnS}>{ko ? '1주 앞으로' : '1 wk earlier'}</button>
            <button onClick={() => onShift(1)} disabled={busy} className={btnS}>{ko ? '1주 뒤로' : '1 wk later'}</button>
            <span className="inline-flex items-center gap-1 ml-auto">
              <button onClick={() => onWeeks(b.pacing.weeks > 1 ? Math.round(b.pacing.weeks) - 1 : 0.5)} disabled={busy || b.pacing.weeks <= 0.5} className={btnS} aria-label="Shorter"><Minus size={11} /></button>
              <span className="text-[12px] text-ink tabular-nums w-12 text-center">{num(b.pacing.weeks)} {ko ? '주' : 'wk'}</span>
              <button onClick={() => onWeeks(b.pacing.weeks < 1 ? 1 : Math.round(b.pacing.weeks) + 1)} disabled={busy} className={btnS} aria-label="Longer"><Plus size={11} /></button>
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={onDrop} disabled={busy} className={btnS}><X size={11} />{ko ? `이 ${noun} 건너뛰기` : `Skip this ${noun}`}</button>
            {missing.length > 0 && <>
              <select value={adding} onChange={e => setAdding(e.target.value)} className="h-7 px-1.5 bg-surface border border-rule-2 rounded text-[11.5px] text-ink max-w-[170px]"><option value="">{ko ? `${noun} 추가…` : `Add a ${noun}…`}</option>{missing.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select>
              <button onClick={() => { const u = missing.find(x => x.id === adding); if (u) { onAddBack(u); setAdding('') } }} disabled={busy || !adding} className={btnS}><Plus size={11} /></button>
            </>}
            {ownPlan && <button onClick={onBack} disabled={busy} className={`${btnS} ml-auto`} title={ko ? '이 책의 내 변경을 모두 버림' : 'Drop all your changes to this book'}><Undo2 size={11} />{ko ? '학교 계획으로' : 'Back to the school plan'}</button>}
          </div>
        </div>
      )}
      {unit.summary && <p className="px-4 pt-3 text-[12.5px] text-ink-2">{unit.summary}</p>}
      {(unit.skill_tags.length > 0 || unit.ccss_codes.length > 0) && (
        <div className="px-4 pt-2 flex flex-wrap gap-1">
          {unit.skill_tags.map(x => <span key={x} className="inline-flex h-5 px-1.5 rounded text-[10.5px] font-medium bg-info-soft text-info items-center">{x}</span>)}
          {unit.ccss_codes.map(c => <span key={c} title={standardTitle(c)} className="inline-flex h-5 px-1.5 rounded text-[10.5px] border border-rule-2 text-ink-2 items-center cursor-help">{c}</span>)}
        </div>
      )}
      <div className="px-4 py-3">
        <p className="eyebrow mb-1.5">{ko ? '차시' : 'Lessons'}</p>
        {lessons.length === 0 && <p className="text-[12px] text-ink-3">{ko ? '차시 없음' : 'No lessons yet.'}</p>}
        <ol className="flex flex-col gap-2">
          {lessons.map((l, i) => {
            const res = resources.filter(r => r.lesson_id === l.id)
            return (
              <li key={l.id} className="text-[12.5px]">
                <div className="flex items-start gap-2">
                  <span className="text-ink-3 w-4 text-right shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-ink font-medium">{l.title}</p>
                    {l.objective && <p className="text-ink-2">{l.objective}</p>}
                    {res.map(r => <a key={r.id} href={r.url || undefined} target="_blank" rel="noreferrer" className="block text-[11.5px] text-accent truncate"><ExternalLink size={10} className="inline mr-1" />{r.name}{r.copies_hint ? ` × ${r.copies_hint}` : ''}</a>)}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
      {(unitRes.length > 0 || unit.drive_folder_url) && (
        <div className="px-4 pb-3">
          <p className="eyebrow mb-1.5">{ko ? '자료' : 'Files'}</p>
          {unit.drive_folder_url && <a href={unit.drive_folder_url} target="_blank" rel="noreferrer" className="block text-[12px] text-accent"><ExternalLink size={10} className="inline mr-1" />{ko ? '단원 Drive 폴더' : 'Unit folder in Drive'}</a>}
          {unitRes.map(r => <a key={r.id} href={r.url || undefined} target="_blank" rel="noreferrer" className="block text-[12px] text-accent truncate"><ExternalLink size={10} className="inline mr-1" />{r.name}{r.copies_hint ? ` × ${r.copies_hint}` : ''}</a>)}
        </div>
      )}
    </aside>
  )
}

// ─── A block of the teacher's own ────────────────────────────────
function BlockForm({ initial, ko, n, todayWeek, onSave, onCancel, onDelete }: { initial: CurriculumBlock | null; ko: boolean; n: number; todayWeek: number; onSave: (d: BlockDraft) => Promise<void>; onCancel: () => void; onDelete?: () => Promise<void> }) {
  const [d, setD] = useState({ title: initial?.title || '', strand: (initial?.strand || 'other') as Strand, tags: initial?.skill_tags.join(', ') || '', start: String(initial?.start_week || todayWeek), weeks: String(initial?.weeks || 1), notes: initial?.notes || '' })
  const [saving, setSaving] = useState(false)
  const submit = async () => { setSaving(true); await onSave({ title: d.title, strand: d.strand, skill_tags: parseTags(d.tags), start_week: parseFloat(d.start) || 1, weeks: parseFloat(d.weeks) || 1, notes: d.notes }); setSaving(false) }
  return (
    <aside className="flex-[1_1_300px] max-w-[380px] border border-rule-2 rounded bg-surface p-4 flex flex-col gap-2">
      <p className="text-[13px] font-semibold text-ink">{initial ? (ko ? '블록 수정' : 'Edit the block') : (ko ? '우리 반 블록' : 'A block of our own')}</p>
      <p className="text-[11.5px] text-ink-3 leading-snug">{ko ? '교재에 없는, 우리 반이 하는 것. 영역과 기능 태그를 달면 지도와 사다리에 보입니다.' : 'Something this class does that is in no book. Tag a strand and a skill and it shows on the map and the ladder beside everyone else’s.'}</p>
      <div><span className={lbl}>{ko ? '이름' : 'Name'}</span><input value={d.title} onChange={e => setD({ ...d, title: e.target.value })} className={inp} autoFocus placeholder={ko ? '예: 할로윈 낭독극' : 'Halloween readers’ theatre'} /></div>
      <div className="grid grid-cols-2 gap-2">
        <div><span className={lbl}>{ko ? '시작 주' : 'Starts in week'}</span><input value={d.start} onChange={e => setD({ ...d, start: e.target.value })} className={inp} inputMode="decimal" /></div>
        <div><span className={lbl}>{ko ? '주' : 'Weeks'}</span><input value={d.weeks} onChange={e => setD({ ...d, weeks: e.target.value })} className={inp} inputMode="decimal" /></div>
        <div><span className={lbl}>{ko ? '영역 (선택)' : 'Strand, optional'}</span><select value={d.strand} onChange={e => setD({ ...d, strand: e.target.value as Strand })} className={`${sel} w-full`}>{STRANDS.map(s => <option key={s} value={s}>{ko ? STRAND_LABEL[s].ko : STRAND_LABEL[s].en}</option>)}</select></div>
        <div><span className={lbl}>{ko ? '기능 태그 (선택)' : 'Skill tags, optional'}</span><input value={d.tags} onChange={e => setD({ ...d, tags: e.target.value })} className={inp} placeholder="fluency, presenting" /></div>
      </div>
      <div><span className={lbl}>{ko ? '메모' : 'Notes'}</span><input value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} className={inp} /></div>
      <p className="text-[10.5px] text-ink-3">{ko ? `이 기간은 ${n}주입니다.` : `This view has ${n} weeks.`}</p>
      <div className="flex gap-2 mt-1">
        <button onClick={submit} disabled={saving || !d.title.trim()} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button>
        <button onClick={onCancel} className={btn}>{ko ? '취소' : 'Cancel'}</button>
        {onDelete && <button onClick={onDelete} className={`${btn} ml-auto`}><Trash2 size={13} /></button>}
      </div>
    </aside>
  )
}
