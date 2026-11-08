'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Loader2, Minus, Plus, X } from 'lucide-react'
import { useApp } from '@/lib/context'
import { ENGLISH_CLASSES, type EnglishClass } from '@/types'
import { getKSTDateString } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import { BOOK_COLORS, bookName, type CurriculumBook, type CurriculumSeries } from '@/lib/curriculumCore'
import { HALVES, academicYears, termDates } from '@/lib/curriculumPacing'
import { lessonSyncFor } from '@/lib/lessonSync'
import { emptySetup, partDays, seriesParts, typicalUnitDays, weeksFor, withPart, type ClassSetup, type Recipe, type StandingItem } from '@/lib/classSetup'
import { createGradeSetup, deleteGradeSetup, fetchSetups, isSetupMissing, saveSetupField } from '@/lib/classSetupData'
import { usePlanner } from '@/components/curriculum-planner/usePlanner'

// ─── Class setup ─────────────────────────────────────────────────
// Set once per class (or per grade when one differs): the usual weekdays of
// each book series, how the class teaches a unit of each series, and what goes
// on the same day every week. The Lesson Plans tray and the board read it.
// Lives at /lesson-plans/setup?class=Snapdragon. Only classes with the new
// lesson planning switched on (LESSON_SYNC_CLASSES) can use it.

const WD = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const WDL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
type Field = 'days' | 'recipes' | 'standing'

/** The academic year today falls in, by the term dates; else the latest. */
function currentYear(semesters: Parameters<typeof termDates>[0]): string {
  const today = getKSTDateString()
  const years = academicYears(semesters)
  return years.find(y => HALVES.some(h => { const t = termDates(semesters, y, h); return !!t.start && !!t.end && today >= t.start && today <= t.end }))
    || years.find(y => HALVES.some(h => { const t = termDates(semesters, y, h); return !!t.start && t.start <= today }))
    || years[0] || ''
}

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export default function ClassSetupView() {
  const { currentTeacher, showToast, semesters } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Snapdragon'
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Snapdragon')
  const [grade, setGrade] = useState(0)
  // ?class= from the Lesson Plans link. Read in an effect, as GradesView does, to avoid a Suspense boundary.
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('class')
    if (c && (ENGLISH_CLASSES as string[]).includes(c)) setCls(c as EnglishClass)
  }, [])
  const on = lessonSyncFor(currentTeacher?.english_class, cls)
  const canEdit = on && (isAdmin || currentTeacher?.english_class === cls)
  const p = usePlanner(on)
  const year = useMemo(() => currentYear(semesters), [semesters])

  const [rows, setRows] = useState<ClassSetup[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const load = useCallback(async () => {
    const r = await fetchSetups()
    if (r.error) { setMissing(isSetupMissing(r.error)); if (!isSetupMissing(r.error)) showToast(`Could not load the class setup: ${r.error}`) }
    else { setMissing(false); setRows(r.rows) }
    setLoading(false)
  }, [showToast])
  useEffect(() => { if (on) load(); else setLoading(false) }, [on, load])

  // The row being edited: the grade's own, or the all-grades one. A grade
  // without its own row shows the all-grades setup and offers to split off.
  const own = grade > 0 ? rows.find(r => r.english_class === cls && r.grade === grade) : undefined
  const base = rows.find(r => r.english_class === cls && r.grade === 0) || emptySetup(cls, 0)
  const follows = grade > 0 && !own
  const setup = own || base
  const editable = canEdit && !follows

  // Saving: the screen changes at once; each part is written half a second after the last change to it.
  const timers = useRef<Partial<Record<Field, ReturnType<typeof setTimeout>>>>({})
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const edit = <F extends Field>(field: F, value: ClassSetup[F], what: string) => {
    if (!editable) return
    const g = setup.grade
    setRows(prev => {
      const i = prev.findIndex(r => r.english_class === cls && r.grade === g)
      const next = { ...(i >= 0 ? prev[i] : emptySetup(cls, g)), [field]: value }
      return i >= 0 ? prev.map((r, k) => (k === i ? next : r)) : [...prev, next]
    })
    setSaving('saving')
    clearTimeout(timers.current[field])
    timers.current[field] = setTimeout(async () => {
      const r = await saveSetupField(cls, g, field, value, currentTeacher?.id)
      if (r.error) { setSaving('error'); showToast(`Could not save: ${r.error}`); return }
      setSaving('saved')
      logActivity('saved', `Class setup · ${cls}${g ? ` · Grade ${g}` : ''}: ${what}`, { key: `classsetup|${cls}|${g}|${field}` })
    }, 500)
  }
  useEffect(() => () => { Object.values(timers.current).forEach(t => clearTimeout(t)) }, [])

  // The class's books on the board this year, by series.
  const seriesHere = useMemo(() => {
    const placed = p.placements.filter(x => x.english_class === cls && x.academic_year === year && x.is_master && (grade === 0 || x.grade === grade))
    const out: { series: CurriculumSeries; books: { book: CurriculumBook; grades: number[] }[] }[] = []
    for (const pl of placed) {
      const book = p.books.find(b => b.id === pl.book_id); const series = book && p.series.find(s => s.id === book.series_id)
      if (!book || !series) continue
      let s = out.find(x => x.series.id === series.id)
      if (!s) { s = { series, books: [] }; out.push(s) }
      let b = s.books.find(x => x.book.id === book.id)
      if (!b) { b = { book, grades: [] }; s.books.push(b) }
      if (!b.grades.includes(pl.grade)) b.grades.push(pl.grade)
    }
    out.forEach(s => s.books.forEach(b => b.grades.sort()))
    return out.sort((a, b) => a.series.sort_order - b.series.sort_order)
  }, [p.placements, p.books, p.series, cls, year, grade])

  const busy = loading || p.loading
  const gradeTabs = [0, 1, 2, 3, 4, 5]

  return (
    <div className="animate-fade-in bg-bg min-h-full">
      <div className="max-w-[1180px] mx-auto px-6 sm:px-8 py-7 space-y-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[300px] space-y-2">
            <Link href="/lesson-plans" className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-text-secondary hover:text-navy min-h-[32px]">
              <ArrowLeft size={16} /> Back to Lesson Plans
            </Link>
            <h1 className="font-display text-[32px] leading-tight font-semibold text-navy">Class setup · {cls}</h1>
            <p className="text-[15px] leading-relaxed text-text-secondary max-w-[760px]">Set this once. The lesson tray uses it to offer the right lessons on the right days, and the board works out how long each unit takes from it. Change it any time.</p>
          </div>
          <div className="flex items-center gap-3">
            {saving !== 'idle' && (
              <span className={`text-[14px] font-medium ${saving === 'error' ? 'text-bad' : 'text-text-secondary'}`} role="status">
                {saving === 'saving' ? 'Saving…' : saving === 'saved' ? 'Saved' : 'Not saved'}
              </span>
            )}
            {isAdmin && (
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-text-secondary">
                Class
                <select value={cls} onChange={e => { setCls(e.target.value as EnglishClass); setGrade(0) }}
                  className="text-[15px] px-3 py-2 rounded-lg border border-border bg-surface text-text-primary min-h-[44px]">
                  {ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
            )}
          </div>
        </div>

        {!on ? (
          <Card><p className="text-[15px] text-text-secondary leading-relaxed">Class setup comes with the new lesson planning, which is on for Snapdragon only while it is tried out. It opens for {cls} when that is switched on.</p></Card>
        ) : busy ? (
          <div className="flex items-center gap-2 text-[15px] text-text-secondary py-10"><Loader2 size={18} className="animate-spin" /> Loading…</div>
        ) : missing || p.missing ? (
          <Card>
            <p className="text-[15px] text-text-primary font-semibold">One step left before this works</p>
            <p className="text-[15px] text-text-secondary mt-1 leading-relaxed">Run <code className="text-[14px] bg-surface-alt px-1.5 py-0.5 rounded">{missing ? 'supabase/migration-class-setup.sql' : 'the curriculum migrations'}</code> in the Supabase SQL Editor, then reload this page.</p>
          </Card>
        ) : (
          <>
            {/* Grades */}
            <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Which grades">
              {gradeTabs.map(g => {
                const has = g === 0 || rows.some(r => r.english_class === cls && r.grade === g)
                return (
                  <button key={g} role="tab" aria-selected={grade === g} onClick={() => setGrade(g)}
                    className={`text-[15px] font-semibold px-4 rounded-full border min-h-[44px] transition-colors ${grade === g ? 'bg-navy text-white border-navy' : 'bg-surface text-text-primary border-border hover:border-navy'}`}>
                    {g === 0 ? 'All grades' : `Grade ${g}`}{g > 0 && has ? ' · own setup' : ''}
                  </button>
                )
              })}
            </div>
            {grade > 0 && (
              <Card>
                {follows ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 min-w-[260px] text-[15px] text-text-secondary leading-relaxed">Grade {grade} follows the all-grades setup below. Give it its own if Grade {grade} is taught differently.</p>
                    {canEdit && <button onClick={async () => { const r = await createGradeSetup(base, grade, currentTeacher?.id); if (r.error) showToast(`Could not do that: ${r.error}`); else { await load(); logActivity('saved', `Class setup · ${cls} · Grade ${grade}: own setup`) } }}
                      className="text-[15px] font-semibold px-4 rounded-lg bg-navy text-white min-h-[44px]">Set Grade {grade} up on its own</button>}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="flex-1 min-w-[260px] text-[15px] text-text-secondary leading-relaxed">Grade {grade} has its own setup. Changes here are for Grade {grade} only.</p>
                    {canEdit && <button onClick={async () => { const r = await deleteGradeSetup(cls, grade); if (r.error) showToast(`Could not do that: ${r.error}`); else { await load(); logActivity('saved', `Class setup · ${cls} · Grade ${grade}: follows all grades again`) } }}
                      className="text-[15px] font-semibold px-4 rounded-lg border border-border bg-surface min-h-[44px] hover:border-navy">Follow all grades again</button>}
                  </div>
                )}
              </Card>
            )}
            {!canEdit && <p className="text-[14px] text-text-secondary">Only {cls}’s teacher can change this.</p>}

            {/* 1. Usual days */}
            <Card>
              <SectionHead title="Usual days for each book" text="Where each book normally goes in your week. You can still put any lesson on any day." />
              {seriesHere.length === 0 ? (
                <NoBooks cls={cls} grade={grade} />
              ) : seriesHere.map(({ series, books }) => {
                const mine = setup.days[series.id] || []
                const color = BOOK_COLORS[series.color]?.hex || '#6B655B'
                return (
                  <div key={series.id} className="flex flex-wrap items-center gap-4 py-3 border-t border-border">
                    <SeriesName color={color} name={series.name} books={books} />
                    <div className="flex flex-wrap gap-2" role="group" aria-label={`Usual days for ${series.name}`}>
                      {WD.map((label, d) => {
                        const onDay = mine.includes(d)
                        return (
                          <button key={d} aria-pressed={onDay} disabled={!editable}
                            onClick={() => edit('days', { ...setup.days, [series.id]: onDay ? mine.filter(x => x !== d) : [...mine, d].sort() }, `${series.name} days`)}
                            style={onDay ? { background: color, borderColor: color } : undefined}
                            className={`w-16 min-h-[44px] rounded-lg border-2 text-[15px] font-semibold transition-colors disabled:cursor-default ${onDay ? 'text-white' : 'bg-surface text-text-secondary border-border enabled:hover:border-navy'}`}>
                            {label}
                          </button>
                        )
                      })}
                    </div>
                    <span className="text-[15px] text-text-secondary flex-1 min-w-[200px]">
                      {mine.length ? `${mine.length} day${mine.length > 1 ? 's' : ''} a week: ${mine.map(d => WDL[d]).join(', ')}` : 'No usual day yet'}
                    </span>
                  </div>
                )
              })}
            </Card>

            {/* 2. Recipes */}
            <Card>
              <SectionHead title="How you teach a unit" text="For each book: which parts of a unit you teach and how many days each takes. Every unit of the book follows it, so the tray offers the right lessons. Parts you leave as they are take one day, as the book has them." />
              {seriesHere.length === 0 ? <NoBooks cls={cls} grade={grade} /> : seriesHere.map(({ series, books }) => (
                <RecipeCard key={series.id} series={series} books={books} recipe={setup.recipes[series.id]} perWeek={(setup.days[series.id] || []).length}
                  units={p.units.filter(u => books.some(b => b.book.id === u.book_id))} lessons={p.lessons} editable={editable}
                  others={rows.filter(r => r.english_class !== cls && r.recipes[series.id] && Object.keys(r.recipes[series.id].parts).length > 0)}
                  onChange={(r, what) => edit('recipes', { ...setup.recipes, [series.id]: r }, `${series.name} ${what}`)} />
              ))}
            </Card>

            {/* 3. Every week */}
            <Card>
              <SectionHead title="Every week" text="Things that go on the same day each week by themselves, like a spelling test. You can take one off a single week on that day." />
              <Standing items={setup.standing} editable={editable} onChange={(s, what) => edit('standing', s, what)} />
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function Card({ children }: { children: React.ReactNode }) {
  return <section className="bg-surface border border-border rounded-2xl px-6 py-5 space-y-4">{children}</section>
}
function SectionHead({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-[20px] font-semibold text-text-primary">{title}</h2>
      <p className="text-[15px] leading-relaxed text-text-secondary max-w-[820px]">{text}</p>
    </div>
  )
}
function NoBooks({ cls, grade }: { cls: string; grade: number }) {
  return <p className="text-[15px] text-text-secondary leading-relaxed">No books are on the board for {cls}{grade ? ` Grade ${grade}` : ''} this year yet. Add them in Curriculum → Planning → Books by class, then come back.</p>
}
function SeriesName({ color, name, books }: { color: string; name: string; books: { book: CurriculumBook; grades: number[] }[] }) {
  return (
    <div className="w-[240px] shrink-0">
      <div className="flex items-center gap-2.5">
        <span className="w-3.5 h-3.5 rounded shrink-0" style={{ background: color }} />
        <span className="text-[17px] font-semibold text-text-primary">{name}</span>
      </div>
      <p className="text-[14px] text-text-secondary mt-0.5 pl-6">{books.map(b => `${b.book.level_number || bookName(b.book, undefined)} (Grade ${b.grades.join(', ')})`).join(' · ')}</p>
    </div>
  )
}

function RecipeCard({ series, books, recipe, perWeek, units, lessons, editable, others, onChange }: {
  series: CurriculumSeries; books: { book: CurriculumBook; grades: number[] }[]; recipe: Recipe | undefined; perWeek: number
  units: { id: string; book_id: string }[]; lessons: { unit_id: string; title: string; sort_order: number; notes: string }[]
  editable: boolean; others: ClassSetup[]; onChange: (r: Recipe, what: string) => void
}) {
  const color = BOOK_COLORS[series.color]?.hex || '#6B655B'
  const ids = useMemo(() => new Set(units.map(u => u.id)), [units])
  const mine = useMemo(() => lessons.filter(l => ids.has(l.unit_id)), [lessons, ids])
  const parts = useMemo(() => seriesParts(units, mine), [units, mine])
  const days = typicalUnitDays(units, mine, recipe)
  const weeks = weeksFor(days, perWeek)
  const lessonsPerUnit = parts.filter(pt => partDays(recipe, pt.key) > 0).length
  const asBook = !recipe || (Object.keys(recipe.parts).length === 0 && !Object.keys(recipe.joins || {}).length && !(recipe.skips || []).length)
  const singles = Object.keys(recipe?.joins || {}).length + (recipe?.skips || []).length
  return (
    <div className="rounded-xl bg-surface-alt/60 border border-border p-4 space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <SeriesName color={color} name={series.name} books={books} />
        <div className="flex-1 min-w-[260px] text-[15px] text-text-primary leading-relaxed">
          {parts.length ? <><strong>{lessonsPerUnit} parts</strong> in a typical unit, <strong>{days} class day{days === 1 ? '' : 's'}</strong>{weeks != null ? <> — about <strong>{weeks} week{weeks === 1 ? '' : 's'}</strong> a unit on your {perWeek} usual day{perWeek === 1 ? '' : 's'}</> : <span className="text-text-secondary"> · pick usual days above to see how many weeks</span>}</> : <span className="text-text-secondary">This book’s units have no lessons that repeat from unit to unit, so each lesson takes one day as the book has it.</span>}
        </div>
      </div>
      {parts.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] text-text-secondary mr-1">Start from</span>
            <button disabled={!editable || asBook} onClick={() => onChange({ parts: {} }, 'as the book has it')}
              className={`text-[14px] font-semibold px-3.5 rounded-full border min-h-[40px] ${asBook ? 'bg-navy text-white border-navy' : 'bg-surface border-border enabled:hover:border-navy'}`}>As the book has it</button>
            {others.map(o => (
              <button key={o.english_class + o.grade} disabled={!editable} onClick={() => onChange({ ...o.recipes[series.id], parts: { ...o.recipes[series.id].parts } }, `copied from ${o.english_class}`)}
                className="text-[14px] font-semibold px-3.5 rounded-full border border-border bg-surface min-h-[40px] enabled:hover:border-navy">
                Copy {o.english_class}{o.grade ? ` Grade ${o.grade}` : ''}’s
              </button>
            ))}
          </div>
          {singles > 0 && <p className="text-[14px] text-text-secondary">Also {Object.keys(recipe?.joins || {}).length ? `${Object.keys(recipe?.joins || {}).length} pair${Object.keys(recipe?.joins || {}).length > 1 ? 's' : ''} of lessons joined` : ''}{Object.keys(recipe?.joins || {}).length && (recipe?.skips || []).length ? ' and ' : ''}{(recipe?.skips || []).length ? `${(recipe?.skips || []).length} lesson${(recipe?.skips || []).length > 1 ? 's' : ''} skipped` : ''} in single units, from the lesson tray. “As the book has it” clears those too.</p>}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] bg-surface rounded-lg border border-border text-left">
              <thead>
                <tr className="text-[13px] uppercase tracking-wide text-text-secondary">
                  <th className="font-semibold px-4 py-3 border-b border-border">Part of the unit</th>
                  <th className="font-semibold px-4 py-3 border-b border-border w-[150px]">Teach it?</th>
                  <th className="font-semibold px-4 py-3 border-b border-border w-[180px]">Days</th>
                </tr>
              </thead>
              <tbody>
                {parts.map(pt => {
                  const n = partDays(recipe, pt.key); const taught = n > 0
                  const set = (v: number, what: string) => onChange(withPart(recipe, pt.key, v), what)
                  return (
                    <tr key={pt.key} className="border-b border-border last:border-b-0 align-middle">
                      <td className="px-4 py-3">
                        <p className={`text-[16px] font-semibold ${taught ? 'text-text-primary' : 'text-text-tertiary line-through'}`}>{pt.key}</p>
                        {pt.example && <p className="text-[14px] text-text-secondary mt-0.5 line-clamp-1" title={pt.example}>e.g. {pt.example.split(' / ').slice(0, 2).join(' / ')}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <button aria-pressed={taught} disabled={!editable} onClick={() => set(taught ? 0 : 1, `${pt.key} ${taught ? 'skipped' : 'taught'}`)}
                          className={`text-[15px] font-semibold min-w-[84px] min-h-[40px] rounded-lg border ${taught ? 'bg-good-soft border-good text-good' : 'bg-surface border-border text-text-secondary'}`}>{taught ? 'Yes' : 'Skip'}</button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button aria-label={`One day fewer for ${pt.key}`} disabled={!editable || !taught || n <= 1} onClick={() => set(n - 1, `${pt.key} ${n - 1} day`)}
                            className="w-10 h-10 rounded-lg border border-border bg-surface inline-flex items-center justify-center disabled:opacity-40"><Minus size={16} /></button>
                          <span className="text-[17px] font-semibold w-6 text-center">{taught ? n : '–'}</span>
                          <button aria-label={`One day more for ${pt.key}`} disabled={!editable || !taught || n >= 3} onClick={() => set(n + 1, `${pt.key} ${n + 1} days`)}
                            className="w-10 h-10 rounded-lg border border-border bg-surface inline-flex items-center justify-center disabled:opacity-40"><Plus size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function Standing({ items, editable, onChange }: { items: StandingItem[]; editable: boolean; onChange: (s: StandingItem[], what: string) => void }) {
  const [title, setTitle] = useState('')
  const [day, setDay] = useState(4)
  const add = () => { const t = title.trim(); if (!t) return; onChange([...items, { id: newId(), title: t, weekday: day }], `every ${WDL[day]}: ${t}`); setTitle('') }
  return (
    <div className="space-y-1">
      {items.length === 0 && <p className="text-[15px] text-text-secondary py-2">Nothing yet.</p>}
      {items.map(it => (
        <div key={it.id} className="flex flex-wrap items-center gap-3 py-3 border-t border-border">
          <span className="text-[17px] font-semibold flex-1 min-w-[200px]">{it.title}</span>
          <span className="text-[15px] text-text-secondary">every {WDL[it.weekday] || '?'}</span>
          {editable && (
            <button onClick={() => onChange(items.filter(x => x.id !== it.id), `removed ${it.title}`)} aria-label={`Remove ${it.title}`}
              className="inline-flex items-center gap-1.5 text-[15px] font-semibold px-3.5 rounded-lg border border-border bg-surface min-h-[44px] hover:border-navy"><X size={15} /> Remove</button>
          )}
        </div>
      ))}
      {editable && (
        <div className="flex flex-wrap items-end gap-3 pt-4 border-t border-border">
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-text-secondary flex-1 min-w-[240px]">
            What
            <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') add() }} placeholder="e.g. Spelling test"
              className="text-[16px] px-3 py-2.5 rounded-lg border border-border bg-surface text-text-primary min-h-[46px]" />
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-text-secondary">
            Day
            <select value={day} onChange={e => setDay(Number(e.target.value))} className="text-[16px] px-3 py-2.5 rounded-lg border border-border bg-surface text-text-primary min-h-[46px]">
              {WDL.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <button onClick={add} disabled={!title.trim()} className="text-[16px] font-semibold px-5 rounded-lg bg-navy text-white min-h-[46px] disabled:opacity-50">Add</button>
        </div>
      )}
    </div>
  )
}
