'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { getKSTDateString } from '@/lib/utils'
import { teacherForClass } from '@/lib/classTeacher'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRANDS, STRAND_LABEL, bookName, parseTags, splitUnitTitle, type CurriculumLesson, type CurriculumUnit, type Strand } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, applyPatches, barsForView, blockBars, boardLanes, halfOf, hasOwnPlan, holidayWeeks, lagWeeks, layoutPacing, masterRows, placementLength, reflowTo, teacherRows, todayPosition, yearWeeks, type CurriculumBlock, type CurriculumPacing, type Half, type Lane } from '@/lib/curriculumPacing'
import { addOwnUnit, deleteBlock, dropOwnUnit, ensureOwnPlan, patchOwnRows, revertToMaster, saveBlock, setHere, type BlockDraft } from '@/lib/curriculumPlanData'
import { usePlanner } from './usePlanner'
import PeriodsLine from './PeriodsLine'
import WeekView from './WeekView'
import { coverage, type LogRow } from '@/lib/curriculumWeek'
import { fetchLogs } from '@/lib/curriculumWeekData'
import { CCSS_DOMAINS } from '@/components/curriculum/ccss-standards'
import { Check, ExternalLink, Flag, Loader2, Minus, Plus, Trash2, Undo2, X } from 'lucide-react'

// ─── Class board ─────────────────────────────────────────────────
// One class and grade for one half of the year, week by week. A row per
// placed book, grouped by strand, each unit as a bar where the plan's weeks
// put it, holidays hatched, today marked. Everyone can look at any class.
// The class's teacher sees their own plan, which starts as the master and
// becomes theirs the first time they change it: drag a bar to move it,
// drag its right edge to make it longer, or open it and say "we're here".
// A thin rail under each row shows the master; its ticks turn red where
// this plan differs. "Our class" at the bottom holds the teacher's own
// blocks, things from no book. Admin reads every plan and reviews the
// differences on the Curriculum map.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-full'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const lbl = 'block text-[11px] text-ink-3 mb-1'
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const ROW_H = 62
const LABEL_W = 150

type Bar = Lane['bars'][number]
interface Row { key: string; strand: Lane['strand']; first: boolean; bar0: Bar; bars: Bar[]; ticks: { at: number; off: boolean }[]; overBy: number }
type Drag = { id: string; mode: 'move' | 'resize'; dx: number; moved: boolean }

export default function BoardView() {
  const { currentTeacher, language, semesters, activeSemester, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const { teachers } = useTeachers()
  const isAdmin = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const ownClass = currentTeacher && (PLACED_ENGLISH_CLASSES as string[]).includes(currentTeacher.english_class) ? currentTeacher.english_class : PLACED_ENGLISH_CLASSES[0]
  const today = getKSTDateString()
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])
  const [cls, setCls] = useState<string>(ownClass)
  const [grade, setGrade] = useState<number>(1)
  const [year, setYear] = useState<string>(activeSemester?.academic_year || '')
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const [half, setHalf] = useState<Half | null>(null)
  const view: Half = half || halfOf(semesters, theYear, today)
  const yw = useMemo(() => yearWeeks(semesters, theYear), [semesters, theYear])
  const weeks = yw[view]
  const N = weeks.length
  const [planMode, setPlanMode] = useState<'mine' | 'master'>('mine')
  const [away, setAway] = useState<AwayDay[]>([])
  const [picked, setPicked] = useState<Bar | null>(null)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [busy, setBusy] = useState(false)
  const [blockForm, setBlockForm] = useState<CurriculumBlock | 'new' | null>(null)
  const [weekN, setWeekN] = useState<number | null>(null)
  const [logs, setLogs] = useState<LogRow[]>([])
  const [hiCode, setHiCode] = useState<string | null>(null)
  const areaRef = useRef<HTMLDivElement | null>(null)
  const dragRef = useRef<{ bar: Bar; mode: 'move' | 'resize'; x0: number; colW: number } | null>(null)

  // Whose plan this is: the class's teacher. Their own when they look; the master otherwise.
  const classTeacher = teacherForClass(teachers, cls)
  const planTeacherId = classTeacher?.id || null
  const isOwn = !!currentTeacher && planTeacherId === currentTeacher.id
  const plansOn = !p.plansMissing
  const viewTeacher = planMode === 'mine' && plansOn ? planTeacherId : null
  const canEdit = isOwn && plansOn && planMode === 'mine' && N > 0

  useEffect(() => {
    if (!weeks.length) { setAway([]); return }
    let on = true
    loadAwayDays(weeks[0].monday, weeks[weeks.length - 1].friday, grade).then(a => { if (on) setAway(a) })
    return () => { on = false }
  }, [weeks, grade])
  useEffect(() => { setPicked(null); setBlockForm(null); setWeekN(null); setHiCode(null) }, [cls, grade, theYear, view, planMode])
  const loadLogs = useMemo(() => () => { if (p.plansMissing) return; fetchLogs(cls, grade).then(setLogs) }, [cls, grade, p.plansMissing])
  useEffect(() => { loadLogs() }, [loadLogs])

  const placements = useMemo(() => p.placements.filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master), [p.placements, cls, grade, theYear])
  const lanes = useMemo(() => boardLanes(placements, p.pacing, p.units, p.books, p.series, view, yw, viewTeacher), [placements, p.pacing, p.units, p.books, p.series, view, yw, viewTeacher])
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const lane of lanes) {
      const byPl = new Map<string, Bar[]>()
      for (const b of lane.bars) { if (!byPl.has(b.placement.id)) byPl.set(b.placement.id, []); byPl.get(b.placement.id)!.push(b) }
      let first = true
      Array.from(byPl.entries()).forEach(([key, bars]) => {
        const pl = bars[0].placement
        const own = viewTeacher ? teacherRows(p.pacing, pl.id, viewTeacher) : []
        const ticks: Row['ticks'] = []
        if (own.length) {
          const mb = barsForView(layoutPacing(masterRows(p.pacing, pl.id), p.units), pl.term, view, yw)
          for (const m of mb) {
            const t = bars.find(b => b.unit.id === m.unit.id)
            const offStart = !t || Math.abs(t.viewStart - m.viewStart) >= 0.5, offEnd = !t || Math.abs(t.viewEnd - m.viewEnd) >= 0.5
            if (!m.cutLeft) ticks.push({ at: m.viewStart - 1, off: offStart })
            if (!m.cutRight) ticks.push({ at: m.viewEnd, off: offEnd })
          }
        }
        const all = layoutPacing(own.length ? own : masterRows(p.pacing, pl.id), p.units)
        const len = placementLength(pl.term, yw)
        const last = all.length ? all[all.length - 1].end : 0
        out.push({ key, strand: lane.strand, first, bar0: bars[0], bars, ticks, overBy: len && last > len ? Math.round((last - len) * 2) / 2 : 0 })
        first = false
      })
    }
    return out
  }, [lanes, p.pacing, p.units, view, yw, viewTeacher])
  const holidays = useMemo(() => holidayWeeks(away, weeks), [away, weeks])
  const todayPos = todayPosition(weeks, today)
  const blocks = useMemo(() => blockBars(p.blocks, cls, grade, theYear, view, viewTeacher, N), [p.blocks, cls, grade, theYear, view, viewTeacher, N])
  const pins = useMemo(() => {
    if (!viewTeacher) return new Map<string, { week: number; lag: number; set_at: string }>()
    const m = new Map<string, { week: number; lag: number; set_at: string }>()
    for (const r of rows) {
      const pl = r.bar0.placement
      const h = p.here.find(x => x.placement_id === pl.id && x.teacher_id === viewTeacher)
      if (!h) continue
      const offset = pl.term === 'year' && view === 'spring' ? yw.fall.length : 0
      const wk = h.week - offset
      if (wk < 1 || wk > N) continue
      m.set(pl.id, { week: wk, lag: lagWeeks(h, todayPos, weeks), set_at: h.set_at })
    }
    return m
  }, [rows, p.here, viewTeacher, view, yw, N, todayPos, weeks])
  // Standards: every code on a unit or lesson in this plan, and how many lessons with it were imported and done.
  const standards = useMemo(() => {
    const inPlan = new Set<string>()
    for (const r of rows) for (const b of r.bars) { b.unit.ccss_codes.forEach(c => inPlan.add(c)); p.lessons.filter(l => l.unit_id === b.unit.id).forEach(l => l.ccss_codes.forEach(c => inPlan.add(c))) }
    const cov = new Map(coverage(logs, p.lessons).map(c => [c.code, c]))
    const codes = Array.from(new Set([...Array.from(inPlan), ...Array.from(cov.keys())])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    return CCSS_DOMAINS.map(d => ({ key: d.key, label: d.label, codes: codes.filter(c => c.startsWith(d.key + '.')).map(c => ({ code: c, inPlan: inPlan.has(c), taught: cov.get(c)?.taught || 0, planned: cov.get(c)?.planned || 0 })) })).filter(d => d.codes.length)
  }, [rows, p.lessons, logs])
  const unitHas = (u: CurriculumUnit, code: string) => u.ccss_codes.includes(code) || p.lessons.some(l => l.unit_id === u.id && l.ccss_codes.includes(code))
  const review = useMemo(() => isOwn && viewTeacher ? p.reviews.filter(r => r.teacher_id === viewTeacher && placements.some(pl => pl.id === r.placement_id) && r.comment) : [], [p.reviews, isOwn, viewTeacher, placements])
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  // ── Editing ──
  const offsetOf = (b: Bar) => b.placement.term === 'year' && view === 'spring' ? yw.fall.length : 0
  const own = async (b: Bar) => { setBusy(true); const r = await ensureOwnPlan(p.pacing, b.placement.id, currentTeacher!.id); if (r.error) { setBusy(false); fail(r.error) }; return r }
  const moveTo = async (b: Bar, targetStart: number, pin = false) => {
    const r = await own(b); if (r.error) return
    const patches = reflowTo(r.rows, p.units, b.unit.id, targetStart)
    const label = `${bookName(b.book, b.series)} · ${b.unit.title}`
    if (patches.length && fail(await patchOwnRows(patches, label))) { setBusy(false); return }
    if (pin && fail(await setHere(b.placement.id, currentTeacher!.id, b.unit.id, targetStart, '', label))) { setBusy(false); return }
    await p.reload(); setBusy(false); setPicked(null)
  }
  const resize = async (b: Bar, weeksNew: number) => {
    const r = await own(b); if (r.error) return
    const mine = r.rows.find(x => x.unit_id === b.unit.id)
    if (mine && !fail(await patchOwnRows([{ id: mine.id, weeks: Math.max(0.5, weeksNew) }], `${bookName(b.book, b.series)} · ${b.unit.title}`))) { await p.reload() }
    setBusy(false)
  }
  const hereNow = async (b: Bar) => {
    if (todayPos === null) { showToast(ko ? '오늘이 이 학기 밖입니다' : 'Today is outside this half of the year'); return }
    await moveTo(b, Math.floor(todayPos) + offsetOf(b), true)
  }
  const dropUnit = async (b: Bar) => {
    if (!await confirmDialog({ title: ko ? '단원 빼기' : 'Skip this unit', message: ko ? `${b.unit.title}을(를) 내 계획에서 뺍니다.` : `${b.unit.title} comes out of your plan. The master keeps it, and you can add it back.`, confirmLabel: ko ? '빼기' : 'Skip' })) return
    const r = await own(b); if (r.error) return
    const mine = r.rows.find(x => x.unit_id === b.unit.id)
    if (mine && !fail(await dropOwnUnit(mine.id, b.unit.title))) await p.reload()
    setBusy(false); setPicked(null)
  }
  const addBack = async (b: Bar, unit: CurriculumUnit) => {
    const r = await own(b); if (r.error) return
    if (!fail(await addOwnUnit(b.placement.id, currentTeacher!.id, unit, r.rows.reduce((m, x) => Math.max(m, x.sort_order), 0), unit.title))) await p.reload()
    setBusy(false)
  }
  const backToMaster = async (b: Bar) => {
    if (!await confirmDialog({ title: ko ? '마스터로 되돌리기' : 'Back to the master', message: ko ? `${bookName(b.book, b.series)}의 내 변경을 모두 버립니다.` : `Your changes to ${bookName(b.book, b.series)} go, and the master applies again.`, confirmLabel: ko ? '되돌리기' : 'Go back' })) return
    setBusy(true)
    if (!fail(await revertToMaster(b.placement.id, currentTeacher!.id, bookName(b.book, b.series), 'teacher'))) await p.reload()
    setBusy(false); setPicked(null)
  }

  // ── Drag ──
  const startDrag = (e: React.PointerEvent, b: Bar, mode: 'move' | 'resize') => {
    if (!canEdit || busy || !areaRef.current) return
    e.preventDefault(); e.stopPropagation()
    const colW = areaRef.current.getBoundingClientRect().width / N
    dragRef.current = { bar: b, mode, x0: e.clientX, colW }
    setDrag({ id: b.pacing.id, mode, dx: 0, moved: false })
    const onMove = (ev: PointerEvent) => { const d = dragRef.current; if (!d) return; const dx = ev.clientX - d.x0; setDrag({ id: d.bar.pacing.id, mode: d.mode, dx, moved: Math.abs(dx) > 4 }) }
    const onUp = async (ev: PointerEvent) => {
      window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp)
      const d = dragRef.current; dragRef.current = null; setDrag(null)
      if (!d) return
      const dw = Math.round((ev.clientX - d.x0) / d.colW * 2) / 2
      if (Math.abs(dw) < 0.5) return
      if (d.mode === 'move') await moveTo(d.bar, d.bar.start + dw)
      else await resize(d.bar, d.bar.pacing.weeks + dw)
    }
    window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp)
  }
  const previewStyle = (b: Bar): React.CSSProperties => {
    if (!drag || drag.id !== b.pacing.id || !areaRef.current) return {}
    if (drag.mode === 'move') return { transform: `translateX(${drag.dx}px)`, opacity: 0.85, zIndex: 5 }
    return { width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 4px + ${drag.dx}px)`, zIndex: 5 }
  }

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Admin runs supabase/migration-curriculum-catalogue.sql first.' : 'Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  const lagLines = rows.map(r => ({ r, pin: pins.get(r.bar0.placement.id) })).filter(x => x.pin && x.pin.lag >= 0.5)
  const overRows = rows.filter(r => r.overBy > 0)

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
        <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden">
          {(['fall', 'spring'] as Half[]).map(h => <button key={h} onClick={() => setHalf(h)} className={`h-8 px-3 text-[12.5px] ${view === h ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{ko ? TERM_LABEL[h].ko : TERM_LABEL[h].en}</button>)}
        </div>
        {plansOn && (
          <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden">
            <button onClick={() => setPlanMode('mine')} className={`h-8 px-3 text-[12.5px] ${planMode === 'mine' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{isOwn ? (ko ? '내 계획' : 'My plan') : (classTeacher ? `${classTeacher.name.split(' ')[0]}${ko ? '의 계획' : '’s plan'}` : (ko ? '교사 계획' : 'Teacher’s plan'))}</button>
            <button onClick={() => setPlanMode('master')} className={`h-8 px-3 text-[12.5px] border-l border-rule-2 ${planMode === 'master' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{ko ? '마스터' : 'Master'}</button>
          </div>
        )}
        <span className="text-[12px] text-ink-3 pb-2">{N ? `${N} ${ko ? '주' : 'weeks'} · ${fmtDay(weeks[0].monday, ko)} – ${fmtDay(weeks[N - 1].friday, ko)}` : (ko ? '이 학기의 날짜가 없습니다' : 'No weeks for this half yet')}</span>
      </div>
      {(isAdmin || !N) && <div className="mb-3"><PeriodsLine year={theYear} /></div>}
      {p.plansMissing && isAdmin && <p className="text-[12px] text-warn mb-3">{ko ? 'supabase/migration-curriculum-teacher-plans.sql을 실행하면 교사 계획, 핀, 블록이 켜집니다.' : 'Run supabase/migration-curriculum-teacher-plans.sql to turn on teachers’ own plans, pins and blocks.'}</p>}

      {(lagLines.length > 0 || overRows.length > 0 || review.length > 0) && (
        <div className="flex flex-wrap gap-2 mb-3">
          {lagLines.map(({ r, pin }) => <span key={r.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 bg-paper-2 px-2.5 py-1 rounded"><Flag size={11} className="text-accent" />{r.bar0.series?.name} {r.bar0.book.level_number}: {num(pin!.lag)} {ko ? '주 뒤처짐 (핀 기준)' : `wk since you said "we’re here"`}</span>)}
          {overRows.map(r => <span key={r.key} className="inline-flex items-center gap-1.5 text-[12px] text-bad bg-bad-soft px-2.5 py-1 rounded">{r.bar0.series?.name} {r.bar0.book.level_number}: {ko ? `학기보다 ${num(r.overBy)}주 김` : `runs ${num(r.overBy)} wk past the term`}</span>)}
          {review.map(rv => <span key={rv.id} className="inline-flex items-center gap-1.5 text-[12px] text-ink bg-accent-soft px-2.5 py-1 rounded" title={rv.seen_at ? fmtDay(rv.seen_at.slice(0, 10), ko) : ''}>{ko ? '관리자' : 'From admin'}: {rv.comment}</span>)}
        </div>
      )}

      {N > 0 && rows.length === 0 && (
        <p className="text-[12.5px] text-ink-3 mb-4 mt-2">{ko ? '이 반, 학년, 학기에 배치된 책이 없습니다.' : `Nothing placed for ${cls} Grade ${grade} this ${view}.`}{isAdmin && <> {ko ? '교육과정 지도에서 책을 놓으세요.' : 'Place books on the Curriculum map.'}</>}</p>
      )}

      {N > 0 && weekN !== null && weeks[weekN - 1] && currentTeacher && (
        <WeekView cls={cls} grade={grade} week={weeks[weekN - 1]} bars={rows.flatMap(r => r.bars)} units={p.units} lessons={p.lessons} canEdit={canEdit && !p.plansMissing} teacherId={currentTeacher.id} today={today} holiday={holidays.get(weekN)} onBack={() => setWeekN(null)} onChanged={loadLogs} />
      )}
      {N > 0 && weekN === null && (rows.length > 0 || canEdit || blocks.length > 0) && (
        <div className="flex gap-5 items-start flex-wrap mt-2">
          <div className="flex-[999_1_640px] min-w-0 border border-rule rounded overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <div style={{ minWidth: LABEL_W + N * 64 }}>
                {/* Week header */}
                <div className="flex border-b border-rule">
                  <div className="shrink-0 px-3 py-2 text-[10.5px] uppercase tracking-wide text-ink-3 self-end" style={{ width: LABEL_W }}>{ko ? '영역 · 책' : 'Strand · book'}</div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                    {weeks.map(w => {
                      const hol = holidays.get(w.n)
                      const isNow = todayPos !== null && Math.floor(todayPos) === w.n
                      return (
                        <button key={w.n} onClick={() => setWeekN(w.n)} className={`border-l border-rule px-0.5 py-1.5 text-center hover:bg-paper-2 ${isNow ? 'bg-accent-soft' : hol ? 'bg-paper-2' : ''}`} title={(hol ? hol + ' · ' : '') + (ko ? '이 주 열기' : 'Open this week')}>
                          <div className={`text-[11.5px] font-semibold ${isNow ? 'text-accent' : 'text-ink'}`}>W{w.n}</div>
                          <div className="text-[9.5px] text-ink-3 truncate">{hol ? hol : fmtDay(w.monday, ko)}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>
                {/* Rows */}
                <div className="relative" ref={areaRef as any}>
                  {rows.map(r => {
                    const pin = pins.get(r.bar0.placement.id)
                    return (
                      <div key={r.key} className={`flex ${r.first ? 'border-t border-rule-2' : 'border-t border-rule'} first:border-t-0`} style={{ height: ROW_H }}>
                        <div className="shrink-0 px-3 flex flex-col justify-center border-r border-rule gap-0.5" style={{ width: LABEL_W }}>
                          {r.first && <span className="text-[9.5px] uppercase tracking-wide text-ink-3">{ko ? STRAND_LABEL[r.strand].ko : STRAND_LABEL[r.strand].en}</span>}
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="font-display text-[17px] leading-none" style={{ color: r.bar0.color }}>{r.bar0.book.level_number || '·'}</span>
                            <span className="text-[12px] font-medium text-ink truncate">{r.bar0.series?.name}</span>
                          </span>
                          {r.ticks.length > 0 && <span className="text-[9.5px] text-ink-3">{r.ticks.some(t => t.off) ? (ko ? '마스터와 다름' : 'differs from master') : (ko ? '마스터와 같음' : 'same as master')}</span>}
                        </div>
                        <div className="flex-1 relative" style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--rule)) 1px, transparent 1px)', backgroundSize: `${100 / N}% 100%` }}>
                          {Array.from(holidays.keys()).map(n => <div key={n} className="absolute inset-y-0 pointer-events-none" style={{ left: `${(n - 1) / N * 100}%`, width: `${100 / N}%`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 3px, transparent 3px 7px)' }} />)}
                          {/* master rail */}
                          {r.ticks.length > 0 && <>
                            <div className="absolute left-0 right-0 pointer-events-none" style={{ bottom: 5, height: 2, background: 'rgb(var(--rule-2))' }} />
                            {r.ticks.map((t, i) => <div key={i} className="absolute pointer-events-none" style={{ left: `calc(${t.at / N * 100}% - 1px)`, bottom: 2, width: 2, height: 9, background: t.off ? 'rgb(var(--accent))' : 'rgb(var(--ink-3))' }} />)}
                          </>}
                          {r.bars.map(b => {
                            const on = picked?.pacing.id === b.pacing.id
                            const t = splitUnitTitle(b.unit.title)
                            return (
                              <button key={b.pacing.id} onPointerDown={e => startDrag(e, b, 'move')} onClick={() => { if (drag?.moved) return; setPicked(on ? null : b) }} title={`${b.unit.title} · ${ko ? '주' : 'wk'} ${num(b.viewStart)}–${num(b.viewEnd)}`}
                                className={`absolute text-left text-white px-2 flex flex-col justify-center overflow-hidden select-none ${b.cutLeft ? 'rounded-l-none' : 'rounded-l'} ${b.cutRight ? 'rounded-r-none' : 'rounded-r'} ${on ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''} ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
                                style={{ left: `${(b.viewStart - 1) / N * 100}%`, width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 4px)`, marginLeft: 2, top: 8, height: ROW_H - (r.ticks.length ? 24 : 16), background: b.color, opacity: hiCode ? (unitHas(b.unit, hiCode) ? 1 : 0.25) : (b.unit.confirmed_at ? 1 : 0.82), touchAction: 'none', ...previewStyle(b) }}>
                                <span className="block text-[11.5px] font-semibold leading-tight truncate">{t.name}</span>
                                <span className="block text-[9.5px] opacity-85 leading-tight truncate">{t.badge ? `${t.badge} · ` : ''}{num(b.pacing.weeks)} {ko ? '주' : 'wk'}{!b.unit.confirmed_at ? (ko ? ' · 미확인' : ' · not confirmed') : ''}</span>
                                {canEdit && !b.cutRight && <span onPointerDown={e => startDrag(e, b, 'resize')} className="absolute top-0 bottom-0 right-0 w-2.5 cursor-ew-resize hover:bg-white/25" aria-hidden="true" />}
                              </button>
                            )
                          })}
                          {pin && (
                            <div className="absolute top-0 pointer-events-none" style={{ left: `${(pin.week - 1) / N * 100}%` }} title={ko ? `핀: ${fmtDay(pin.set_at.slice(0, 10), ko)}` : `Pinned ${fmtDay(pin.set_at.slice(0, 10), ko)}`}>
                              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-accent -translate-x-1/2" />
                              {pin.lag >= 0.5 && todayPos !== null && <div className="absolute top-[3px] border-t-2 border-dotted border-accent opacity-80" style={{ left: 0, width: `calc(${(todayPos - pin.week) / N * 100}% )` }} />}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Our class: blocks */}
                  {(blocks.length > 0 || canEdit) && (
                    <div className="flex border-t border-rule-2" style={{ height: ROW_H }}>
                      <div className="shrink-0 px-3 flex flex-col justify-center border-r border-rule gap-0.5" style={{ width: LABEL_W }}>
                        <span className="text-[9.5px] uppercase tracking-wide text-ink-3">{ko ? '우리 반' : 'Our class'}</span>
                        <span className="text-[12px] font-medium text-ink">{ko ? '자체 블록' : 'Own blocks'}</span>
                        {canEdit && <button onClick={() => setBlockForm('new')} className="text-[11px] text-accent text-left inline-flex items-center gap-1"><Plus size={10} />{ko ? '블록 추가' : 'Add a block'}</button>}
                      </div>
                      <div className="flex-1 relative" style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--rule)) 1px, transparent 1px)', backgroundSize: `${100 / N}% 100%` }}>
                        {blocks.map(b => (
                          <button key={b.id} onClick={() => canEdit && setBlockForm(b)} title={b.title}
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
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `calc(${LABEL_W}px + (100% - ${LABEL_W}px) * ${(todayPos - 1) / N})` }}>
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
                  <span className="text-[10.5px] text-ink-3">{ko ? '코드를 누르면 그 표준을 가르치는 단원만 밝게 보입니다' : 'Click a code to light the units that teach it'}</span>
                  {hiCode && <button onClick={() => setHiCode(null)} className="text-[10.5px] text-accent">{ko ? '해제' : 'Clear'}</button>}
                </div>
                <div className="flex flex-col gap-1">
                  {standards.map(d => (
                    <div key={d.key} className="flex items-start gap-2 text-[11px]">
                      <span className="w-[104px] shrink-0 text-ink-3 truncate pt-0.5" title={d.label}>{d.key} · {d.label}</span>
                      <span className="flex flex-wrap gap-1">
                        {d.codes.map(c => (
                          <button key={c.code} onClick={() => setHiCode(hiCode === c.code ? null : c.code)} title={`${c.code}: ${c.taught} ${ko ? '가르침' : 'taught'}, ${c.planned} ${ko ? '날짜에 들어감' : 'in a day'}${c.inPlan ? '' : (ko ? ', 이 계획에 없음' : ', not in this plan')}`}
                            className={`h-5 px-1.5 rounded text-[10px] font-semibold tabular-nums ${c.taught ? 'bg-ink-2 text-paper' : c.inPlan ? 'border-[1.5px] border-ink-2 text-ink-2' : 'border border-rule-2 text-ink-3'} ${hiCode === c.code ? 'ring-2 ring-accent' : ''}`}>{c.code.replace(/^(RL|RI|RF|W|SL|L)\./, '')}{c.taught ? ` ·${c.taught}` : ''}</button>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="px-3 py-2 text-[11px] text-ink-3 border-t border-rule flex gap-4 flex-wrap">
              <span>{ko ? '빗금: 쉬는 주 · 주 번호를 누르면 그 주를 엽니다' : 'Hatched: a holiday week · click a week number to open it'}</span>
              {canEdit ? <span>{ko ? '막대를 끌어 옮기고, 오른쪽 끝을 끌어 늘리세요. 막대를 눌러 "여기까지 왔어요"를 표시하세요.' : 'Drag a bar to move it, drag its right edge to make it longer, click it to say "we’re here". The rail underneath is the master; red ticks are where yours differs.'}</span> : <span>{ko ? '막대 클릭: 단원의 차시와 자료' : 'Click a bar for the unit’s lessons and files'}</span>}
              <span className="ml-auto">{viewTeacher ? (isOwn ? (ko ? '내 계획' : 'Your plan') : (ko ? '교사 계획 · 읽기 전용' : 'The teacher’s plan · read-only')) : (ko ? '마스터 계획 · 읽기 전용' : 'The master plan · read-only')}</span>
            </div>
          </div>
          {picked && <UnitPanel b={picked} lessons={p.lessons.filter(l => l.unit_id === picked.unit.id).sort((a, b) => a.sort_order - b.sort_order)} resources={p.resources} ko={ko} busy={busy} canEdit={canEdit} ownPlan={!!viewTeacher && hasOwnPlan(p.pacing, picked.placement.id, viewTeacher)} todayWeek={todayPos !== null ? Math.floor(todayPos) : null}
            missing={p.units.filter(u => u.book_id === picked.book.id && !(viewTeacher ? teacherRows(p.pacing, picked.placement.id, viewTeacher) : masterRows(p.pacing, picked.placement.id)).some(r => r.unit_id === u.id)).sort((a, b) => a.sort_order - b.sort_order)}
            onClose={() => setPicked(null)} onHere={() => hereNow(picked)} onShift={d => moveTo(picked, picked.start + d)} onWeeks={w => resize(picked, w)} onDrop={() => dropUnit(picked)} onAddBack={u => addBack(picked, u)} onBack={() => backToMaster(picked)} />}
          {blockForm && canEdit && currentTeacher && (
            <BlockForm initial={blockForm === 'new' ? null : blockForm} ko={ko} n={N} todayWeek={todayPos !== null ? Math.floor(todayPos) : 1} onCancel={() => setBlockForm(null)}
              onSave={async d => { const e = await saveBlock(blockForm === 'new' ? null : blockForm.id, { teacher_id: currentTeacher.id, english_class: cls, grade, academic_year: theYear, term: view }, d); if (!fail(e)) { setBlockForm(null); p.reload() } }}
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
  ko: boolean; busy: boolean; canEdit: boolean; ownPlan: boolean; todayWeek: number | null; missing: CurriculumUnit[]
  onClose: () => void; onHere: () => void; onShift: (d: number) => void; onWeeks: (w: number) => void; onDrop: () => void; onAddBack: (u: CurriculumUnit) => void; onBack: () => void
}
function UnitPanel({ b, lessons, resources, ko, busy, canEdit, ownPlan, todayWeek, missing, onClose, onHere, onShift, onWeeks, onDrop, onAddBack, onBack }: PanelProps) {
  const unit: CurriculumUnit = b.unit
  const unitRes = resources.filter(r => r.unit_id === unit.id)
  const t = splitUnitTitle(unit.title)
  const [adding, setAdding] = useState('')
  return (
    <aside className="flex-[1_1_300px] max-w-[380px] border border-rule-2 rounded bg-surface" style={{ borderTop: `4px solid ${b.color}` }}>
      <div className="px-4 py-3 border-b border-rule flex items-start gap-3">
        <span className="font-display text-[28px] leading-none" style={{ color: b.color }}>{b.book.level_number || '·'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink leading-tight">{t.name}</p>
          <p className="text-[11.5px] text-ink-3">{t.badge ? `${t.badge} · ` : ''}{bookName(b.book, b.series)} · {ko ? '주' : 'wk'} {num(b.viewStart)}–{num(b.viewEnd)} · {num(b.pacing.weeks)} {ko ? '주' : b.pacing.weeks === 1 ? 'week' : 'weeks'}</p>
          <p className={`text-[11px] mt-0.5 ${unit.confirmed_at ? 'text-good' : 'text-warn'}`}>{unit.confirmed_at ? (ko ? '확인됨' : 'Confirmed') : (ko ? 'Claude 제안, 미확인' : 'Suggested by Claude, not confirmed yet')}</p>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close"><X size={14} /></button>
      </div>
      {canEdit && (
        <div className="px-4 py-3 border-b border-rule flex flex-col gap-2 bg-paper-2">
          <button onClick={onHere} disabled={busy || todayWeek === null || todayWeek === Math.floor(b.viewStart)} className={btnP}>{busy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}{ko ? `여기까지 왔어요: 이 단원을 ${todayWeek ?? '?'}주에 시작` : `We’re here: this unit starts in week ${todayWeek ?? '?'}`}</button>
          <p className="text-[11px] text-ink-3 leading-snug">{ko ? '뒤처졌으면 이 단원 앞에 빈 주가 생기고, 앞섰으면 이전 단원이 짧아집니다. 뒤의 단원은 따라 움직입니다.' : 'Behind: a gap opens before this unit. Ahead: the units before it get shorter. Everything after moves with it.'}</p>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => onShift(-1)} disabled={busy} className={btnS}>{ko ? '1주 앞으로' : '1 wk earlier'}</button>
            <button onClick={() => onShift(1)} disabled={busy} className={btnS}>{ko ? '1주 뒤로' : '1 wk later'}</button>
            <span className="inline-flex items-center gap-1 ml-auto">
              <button onClick={() => onWeeks(b.pacing.weeks - 0.5)} disabled={busy || b.pacing.weeks <= 0.5} className={btnS} aria-label="Shorter"><Minus size={11} /></button>
              <span className="text-[12px] text-ink tabular-nums w-12 text-center">{num(b.pacing.weeks)} {ko ? '주' : 'wk'}</span>
              <button onClick={() => onWeeks(b.pacing.weeks + 0.5)} disabled={busy} className={btnS} aria-label="Longer"><Plus size={11} /></button>
            </span>
          </div>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button onClick={onDrop} disabled={busy} className={btnS}><X size={11} />{ko ? '이 단원 건너뛰기' : 'Skip this unit'}</button>
            {missing.length > 0 && <>
              <select value={adding} onChange={e => setAdding(e.target.value)} className="h-7 px-1.5 bg-surface border border-rule-2 rounded text-[11.5px] text-ink max-w-[170px]"><option value="">{ko ? '빠진 단원 추가…' : 'Add a skipped unit…'}</option>{missing.map(u => <option key={u.id} value={u.id}>{u.title}</option>)}</select>
              <button onClick={() => { const u = missing.find(x => x.id === adding); if (u) { onAddBack(u); setAdding('') } }} disabled={busy || !adding} className={btnS}><Plus size={11} /></button>
            </>}
            {ownPlan && <button onClick={onBack} disabled={busy} className={`${btnS} ml-auto`} title={ko ? '이 책의 내 변경을 모두 버림' : 'Drop all your changes to this book'}><Undo2 size={11} />{ko ? '마스터로' : 'Back to master'}</button>}
          </div>
        </div>
      )}
      {unit.summary && <p className="px-4 pt-3 text-[12.5px] text-ink-2">{unit.summary}</p>}
      {(unit.skill_tags.length > 0 || unit.ccss_codes.length > 0) && (
        <div className="px-4 pt-2 flex flex-wrap gap-1">
          {unit.skill_tags.map(x => <span key={x} className="inline-flex h-5 px-1.5 rounded text-[10.5px] font-medium bg-info-soft text-info items-center">{x}</span>)}
          {unit.ccss_codes.map(c => <span key={c} className="inline-flex h-5 px-1.5 rounded text-[10.5px] border border-rule-2 text-ink-2 items-center">{c}</span>)}
        </div>
      )}
      <div className="px-4 py-3">
        <p className="eyebrow mb-1.5">{ko ? '차시' : 'Lessons'}</p>
        {lessons.length === 0 && <p className="text-[12px] text-ink-3">{ko ? '차시 없음' : 'No lessons indexed yet.'}</p>}
        <ol className="flex flex-col gap-2">
          {lessons.map((l, i) => {
            const res = resources.filter(r => r.lesson_id === l.id)
            return (
              <li key={l.id} className="text-[12.5px]">
                <div className="flex items-start gap-2">
                  <span className="text-ink-3 w-4 text-right shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-ink font-medium">{l.title}{l.confirmed_at && <Check size={11} className="inline ml-1 text-good" />}</p>
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
      <p className="text-[10.5px] text-ink-3">{ko ? `이 학기는 ${n}주입니다.` : `This half has ${n} weeks.`}</p>
      <div className="flex gap-2 mt-1">
        <button onClick={submit} disabled={saving || !d.title.trim()} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button>
        <button onClick={onCancel} className={btn}>{ko ? '취소' : 'Cancel'}</button>
        {onDelete && <button onClick={onDelete} className={`${btn} ml-auto`}><Trash2 size={13} /></button>}
      </div>
    </aside>
  )
}
