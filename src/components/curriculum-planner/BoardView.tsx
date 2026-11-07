'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classToColor, getKSTDateString } from '@/lib/utils'
import { loadAwayDays, type AwayDay } from '@/lib/calendarDays'
import { STRAND_LABEL, bookName, type CurriculumLesson, type CurriculumUnit } from '@/lib/curriculumCore'
import { TERM_LABEL, academicYears, boardLanes, halfOf, holidayWeeks, todayPosition, yearWeeks, type Half, type Lane } from '@/lib/curriculumPacing'
import { usePlanner } from './usePlanner'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'

// ─── Class board ─────────────────────────────────────────────────
// One class and grade for one half of the year, week by week: a lane per
// strand, each placed book's units as bars where the master's weeks put
// them, the holidays hatched and today marked. Click a bar for the unit's
// lessons and files. Read-only: this is the master. The teacher's own
// copy, "we're here" pins and drag come next.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
const LANE_H = 64

type Picked = Lane['bars'][number]

export default function BoardView() {
  const { currentTeacher, language, semesters, activeSemester } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
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
  const [away, setAway] = useState<AwayDay[]>([])
  const [picked, setPicked] = useState<Picked | null>(null)
  useEffect(() => {
    if (!weeks.length) { setAway([]); return }
    let on = true
    loadAwayDays(weeks[0].monday, weeks[weeks.length - 1].friday, grade).then(a => { if (on) setAway(a) })
    return () => { on = false }
  }, [weeks, grade])
  useEffect(() => { setPicked(null) }, [cls, grade, theYear, view])

  const placements = p.placements.filter(x => x.english_class === cls && x.grade === grade && x.academic_year === theYear && x.is_master)
  const lanes = useMemo(() => boardLanes(placements, p.pacing, p.units, p.books, p.series, view, yw), [placements, p.pacing, p.units, p.books, p.series, view, yw])
  const holidays = useMemo(() => holidayWeeks(away, weeks), [away, weeks])
  const todayPos = todayPosition(weeks, today)
  const N = weeks.length

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Admin runs supabase/migration-curriculum-catalogue.sql first.' : 'Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-4">
        <label className="text-[11px] text-ink-3">{ko ? '반' : 'Class'}<br />
          <select value={cls} onChange={e => setCls(e.target.value)} className={sel} disabled={!isAdmin && false}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
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
        <span className="text-[12px] text-ink-3 pb-2">{N ? `${N} ${ko ? '주' : 'weeks'} · ${fmtDay(weeks[0].monday, ko)} – ${fmtDay(weeks[N - 1].friday, ko)}` : (ko ? '이 학기의 날짜가 설정에 없습니다' : 'No dates for this half: set the grading periods’ dates in Settings')}</span>
      </div>

      {N > 0 && lanes.length === 0 && (
        <p className="text-[12.5px] text-ink-3 mb-4">{ko ? '이 반, 학년, 학기에 배치된 책이 없습니다.' : `Nothing placed for ${cls} Grade ${grade} this ${view}.`}{isAdmin && <> {ko ? '배치 탭에서 책을 놓으세요.' : 'Place books on the Placements tab.'}</>}</p>
      )}

      {N > 0 && (
        <div className="flex gap-5 items-start flex-wrap">
          <div className="flex-[999_1_640px] min-w-0 border border-rule rounded overflow-hidden bg-surface">
            <div className="overflow-x-auto">
              <div style={{ minWidth: Math.max(720, N * 44) }}>
                {/* Week header */}
                <div className="flex border-b border-rule">
                  <div className="w-[104px] shrink-0 px-3 py-2 text-[10.5px] uppercase tracking-wide text-ink-3 self-end">{ko ? '영역' : 'Strand'}</div>
                  <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
                    {weeks.map(w => {
                      const hol = holidays.get(w.n)
                      const isNow = todayPos !== null && Math.floor(todayPos) === w.n
                      return (
                        <div key={w.n} className={`border-l border-rule px-0.5 py-1.5 text-center ${isNow ? 'bg-accent-soft' : hol ? 'bg-paper-2' : ''}`} title={hol || `${fmtDay(w.monday, ko)} – ${fmtDay(w.friday, ko)}`}>
                          <div className={`text-[11.5px] font-semibold ${isNow ? 'text-accent' : 'text-ink'}`}>W{w.n}</div>
                          <div className="text-[9.5px] text-ink-3 truncate">{hol ? hol : fmtDay(w.monday, ko)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                {/* Lanes */}
                <div className="relative">
                  {lanes.map(lane => (
                    <div key={lane.strand} className="flex border-b border-rule last:border-b-0" style={{ height: LANE_H }}>
                      <div className="w-[104px] shrink-0 px-3 flex items-center text-[12px] font-semibold text-ink-2 border-r border-rule">{ko ? STRAND_LABEL[lane.strand].ko : STRAND_LABEL[lane.strand].en}</div>
                      <div className="flex-1 relative" style={{ backgroundImage: 'linear-gradient(90deg, rgb(var(--rule)) 1px, transparent 1px)', backgroundSize: `${100 / N}% 100%` }}>
                        {Array.from(holidays.keys()).map(n => <div key={n} className="absolute inset-y-0 pointer-events-none" style={{ left: `${(n - 1) / N * 100}%`, width: `${100 / N}%`, backgroundImage: 'repeating-linear-gradient(135deg, rgb(var(--paper-3)) 0 3px, transparent 3px 7px)' }} />)}
                        {lane.bars.map(b => {
                          const on = picked?.pacing.id === b.pacing.id
                          return (
                            <button key={b.pacing.id} onClick={() => setPicked(on ? null : b)} title={`${b.unit.title} · wk ${num(b.viewStart)}–${num(b.viewEnd)}`}
                              className={`absolute text-left text-white px-2 flex items-center gap-1.5 overflow-hidden ${b.cutLeft ? 'rounded-l-none' : 'rounded-l'} ${b.cutRight ? 'rounded-r-none' : 'rounded-r'} ${on ? 'ring-2 ring-ink ring-offset-1 ring-offset-surface' : ''}`}
                              style={{ left: `${(b.viewStart - 1) / N * 100}%`, width: `calc(${(b.viewEnd - b.viewStart + 1) / N * 100}% - 4px)`, marginLeft: 2, top: 11, height: LANE_H - 22, background: b.color, opacity: b.unit.confirmed_at ? 1 : 0.8 }}>
                              <span className="text-[10px] font-bold shrink-0 opacity-80">{b.book.level_number}</span>
                              <span className="min-w-0">
                                <span className="block text-[11.5px] font-semibold truncate">{b.unit.title}</span>
                                <span className="block text-[10px] opacity-85 truncate">{b.series?.name}{!b.unit.confirmed_at ? (ko ? ' · 미확인' : ' · not confirmed') : ''}</span>
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                  {todayPos !== null && lanes.length > 0 && (
                    <div className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `calc(104px + (100% - 104px) * ${(todayPos - 1) / N})` }}>
                      <div className="w-[2px] h-full bg-accent" />
                      <div className="absolute -top-0 left-1/2 -translate-x-1/2 bg-accent text-white text-[9.5px] font-semibold px-1.5 rounded-b">{ko ? '오늘' : 'today'}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="px-3 py-2 text-[11px] text-ink-3 border-t border-rule flex gap-4 flex-wrap">
              <span>{ko ? '빗금: 쉬는 주' : 'Hatched: a holiday week'}</span>
              <span>{ko ? '막대 클릭: 단원의 차시와 자료' : 'Click a bar for the unit’s lessons and files'}</span>
              <span className="ml-auto">{ko ? '마스터 계획 · 읽기 전용' : 'The master plan · read-only'}</span>
            </div>
          </div>
          {picked && <UnitPanel b={picked} lessons={p.lessons.filter(l => l.unit_id === picked.unit.id).sort((a, b) => a.sort_order - b.sort_order)} resources={p.resources} ko={ko} onClose={() => setPicked(null)} />}
        </div>
      )}
    </div>
  )
}

function UnitPanel({ b, lessons, resources, ko, onClose }: { b: Picked; lessons: CurriculumLesson[]; resources: { id: string; unit_id: string | null; lesson_id: string | null; name: string; kind: string; url: string; copies_hint: number | null }[]; ko: boolean; onClose: () => void }) {
  const unit: CurriculumUnit = b.unit
  const unitRes = resources.filter(r => r.unit_id === unit.id)
  return (
    <aside className="flex-[1_1_300px] max-w-[380px] border border-rule-2 rounded bg-surface" style={{ borderTop: `4px solid ${b.color}` }}>
      <div className="px-4 py-3 border-b border-rule flex items-start gap-3">
        <span className="font-display text-[28px] leading-none" style={{ color: b.color }}>{b.book.level_number || '·'}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink leading-tight">{unit.title}</p>
          <p className="text-[11.5px] text-ink-3">{bookName(b.book, b.series)} · {ko ? '주' : 'wk'} {num(b.viewStart)}–{num(b.viewEnd)} · {num(b.pacing.weeks)} {ko ? '주' : b.pacing.weeks === 1 ? 'week' : 'weeks'}</p>
          <p className={`text-[11px] mt-0.5 ${unit.confirmed_at ? 'text-good' : 'text-warn'}`}>{unit.confirmed_at ? (ko ? '확인됨' : 'Confirmed') : (ko ? 'Claude 제안, 미확인' : 'Suggested by Claude, not confirmed yet')}</p>
        </div>
        <button onClick={onClose} className="text-ink-3 hover:text-ink" aria-label="Close"><X size={14} /></button>
      </div>
      {unit.summary && <p className="px-4 pt-3 text-[12.5px] text-ink-2">{unit.summary}</p>}
      {(unit.skill_tags.length > 0 || unit.ccss_codes.length > 0) && (
        <div className="px-4 pt-2 flex flex-wrap gap-1">
          {unit.skill_tags.map(t => <span key={t} className="inline-flex h-5 px-1.5 rounded text-[10.5px] font-medium bg-info-soft text-info items-center">{t}</span>)}
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

export const laneClassColor = (cls: string) => classToColor(cls as any)
