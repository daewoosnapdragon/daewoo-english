'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { GRADES, PLACED_ENGLISH_CLASSES } from '@/types'
import { classToColor } from '@/lib/utils'
import { STRANDS, STRAND_LABEL, bookName, colorHex, countBook, type Strand } from '@/lib/curriculumCore'
import { academicYears, ladderChecks, ladderRows, type Term } from '@/lib/curriculumPacing'
import { usePlanner } from './usePlanner'
import { Loader2 } from 'lucide-react'

// ─── Ladder ──────────────────────────────────────────────────────
// One level across Grades 1 to 5: a step per grade, Grade 5 at the top,
// each with the books placed for that grade in the year. The level number
// is the big numeral, so the series should read as a climb up the stairs.
// A teacher who teaches every grade of a level sees their whole load here.
// The checks on the right say where a series goes down a level, where a
// strand has a hole, and where one series hands over to another.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const TERM_CHIP: Record<Term, string> = { fall: 'Fall', spring: 'Spring', year: 'Year' }

export default function LadderView() {
  const { currentTeacher, language, semesters, activeSemester } = useApp()
  const ko = language === 'ko'
  const p = usePlanner()
  const ownClass = currentTeacher && (PLACED_ENGLISH_CLASSES as string[]).includes(currentTeacher.english_class) ? currentTeacher.english_class : PLACED_ENGLISH_CLASSES[0]
  const years = useMemo(() => { const ys = academicYears(semesters); if (activeSemester && !ys.includes(activeSemester.academic_year)) ys.unshift(activeSemester.academic_year); return ys }, [semesters, activeSemester])
  const [level, setLevel] = useState<string>(ownClass)
  const [year, setYear] = useState<string>(activeSemester?.academic_year || '')
  const [strand, setStrand] = useState<Strand | 'all'>('all')
  const theYear = year || activeSemester?.academic_year || years[0] || ''
  const rows = useMemo(() => ladderRows(level, theYear, p.placements, p.books, p.series, GRADES as number[]), [level, theYear, p.placements, p.books, p.series])
  const checks = useMemo(() => ladderChecks(rows, p.series), [rows, p.series])
  const any = rows.some(r => r.books.length)

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing) return <p className="text-[12.5px] text-warn">{p.missing === 'catalogue' ? 'Admin runs supabase/migration-curriculum-catalogue.sql first.' : 'Admin runs supabase/migration-curriculum-placements.sql once.'}</p>

  return (
    <div>
      <div className="flex items-end gap-3 flex-wrap mb-5">
        <label className="text-[11px] text-ink-3">{ko ? '레벨' : 'Level'}<br />
          <select value={level} onChange={e => setLevel(e.target.value)} className={sel}>{PLACED_ENGLISH_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}</select>
        </label>
        <label className="text-[11px] text-ink-3">{ko ? '학년도' : 'Year'}<br />
          <select value={theYear} onChange={e => setYear(e.target.value)} className={sel}>{years.map(y => <option key={y} value={y}>{y}</option>)}</select>
        </label>
        <div role="group" className="inline-flex rounded border border-rule-2 overflow-hidden">
          <button onClick={() => setStrand('all')} className={`h-8 px-3 text-[12.5px] ${strand === 'all' ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{ko ? '전체' : 'All books'}</button>
          {STRANDS.filter(s => rows.some(r => r.books.some(b => (b.series?.strand || 'other') === s))).map(s => <button key={s} onClick={() => setStrand(s)} className={`h-8 px-3 text-[12.5px] border-l border-rule-2 ${strand === s ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink'}`}>{ko ? STRAND_LABEL[s].ko : STRAND_LABEL[s].en}</button>)}
        </div>
      </div>

      {!any && <p className="text-[12.5px] text-ink-3">{ko ? '이 레벨에 배치된 책이 없습니다.' : `Nothing placed for ${level} in ${theYear} yet.`}</p>}

      {any && (
        <div className="flex gap-6 items-start flex-wrap">
          <div className="flex-[999_1_600px] min-w-0 flex flex-col gap-2">
            {rows.map((r, i) => {
              const books = r.books.filter(b => strand === 'all' || (b.series?.strand || 'other') === strand)
              return (
                <div key={r.grade} className="flex" style={{ marginLeft: (rows.length - 1 - i) * 0 }}>
                  <div className="w-[120px] shrink-0 rounded-l px-3 py-3 text-paper flex flex-col gap-0.5" style={{ background: 'rgb(var(--ink-block))', borderLeft: `4px solid ${classToColor(level as any)}` }}>
                    <span className="font-display text-[22px] leading-none">{ko ? `${r.grade}학년` : `Grade ${r.grade}`}</span>
                    <span className="text-[10.5px] opacity-70">{books.length ? `${books.length} ${ko ? '권' : books.length === 1 ? 'book' : 'books'}` : (ko ? '없음' : 'nothing placed')}</span>
                  </div>
                  <div className="flex-1 min-w-0 border border-rule rounded-r bg-surface p-2 flex gap-2 flex-wrap">
                    {books.length === 0 && <span className="text-[12px] text-ink-3 self-center px-2">{strand === 'all' ? (ko ? '배치된 책 없음' : 'No books placed for this grade.') : (ko ? '이 영역의 책 없음' : `No ${STRAND_LABEL[strand as Strand].en.toLowerCase()} book at this grade.`)}</span>}
                    {books.map(lb => {
                      const units = p.units.filter(u => u.book_id === lb.book.id)
                      const c = countBook(units, p.lessons)
                      const color = colorHex(lb.series?.color || 'slate')
                      const skills = Array.from(new Set(units.flatMap(u => u.skill_tags))).slice(0, 6)
                      return (
                        <div key={lb.book.id} className="flex-[1_1_170px] min-w-0 rounded bg-paper p-2.5 flex flex-col gap-1.5" style={{ borderTop: `4px solid ${color}`, boxShadow: '0 0 0 1px rgb(var(--rule))' }}>
                          <div className="flex items-baseline gap-2">
                            <span className="font-display text-[28px] leading-none" style={{ color }}>{lb.book.level_number || '·'}</span>
                            <div className="min-w-0">
                              <p className="text-[10px] uppercase tracking-wide text-ink-3">{lb.series ? (ko ? STRAND_LABEL[lb.series.strand].ko : STRAND_LABEL[lb.series.strand].en) : ''}</p>
                              <p className="text-[12.5px] font-semibold text-ink truncate">{bookName(lb.book, lb.series)}</p>
                            </div>
                          </div>
                          {strand !== 'all' && skills.length > 0 && <p className="text-[11px] text-ink-2 leading-snug">{skills.join(' · ')}</p>}
                          {strand === 'all' && <p className="text-[11px] text-ink-3 leading-snug">{c.units ? `${c.units} ${ko ? '단원' : 'units'}` : (ko ? '색인 안 됨' : 'not indexed')}</p>}
                          <div className="flex gap-1 mt-auto">
                            {lb.terms.map(t => <span key={t} className="inline-flex h-5 px-1.5 rounded text-[10px] font-semibold bg-ink text-paper items-center">{TERM_CHIP[t]}</span>)}
                            {lb.book.status === 'retired' && <span className="inline-flex h-5 px-1.5 rounded text-[10px] bg-paper-3 text-ink-3 items-center">{ko ? '사용 안 함' : 'retired'}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <p className="text-[11.5px] text-ink-3 mt-1">{ko ? '숫자는 시리즈의 레벨입니다. 위로 갈수록 올라가야 합니다.' : 'The numerals are the series level. Read them up the stairs: they should climb.'}</p>
          </div>
          <aside className="flex-[1_1_280px] max-w-[360px] flex flex-col gap-3">
            <div className="border border-rule rounded p-4">
              <p className="eyebrow mb-2">{ko ? '점검' : 'Checks on this ladder'}</p>
              {checks.length === 0 && <p className="text-[12.5px] text-ink-2">{ko ? '시리즈가 모두 올라가고, 빈 학년과 시리즈 교체가 없습니다.' : 'Every series climbs, no strand has a hole, and no series hands over to another.'}</p>}
              <div className="flex flex-col gap-2">
                {checks.map((c, i) => (
                  <div key={i} className={`text-[12.5px] leading-snug px-3 py-2 rounded border-l-[3px] ${c.kind === 'drop' ? 'bg-bad-soft border-bad text-ink' : c.kind === 'gap' ? 'bg-warn-soft border-warn text-ink' : 'bg-paper-2 border-ink-3 text-ink'}`}>{c.text}</div>
                ))}
              </div>
            </div>
            <p className="text-[11.5px] text-ink-3 leading-relaxed">{ko ? '기능의 나선과 반복, 학생 경로는 다음 단계에서 추가됩니다.' : 'Skill spirals versus repeats, and a student’s path across levels, come in a later phase once lessons carry tags.'}</p>
          </aside>
        </div>
      )}
    </div>
  )
}
