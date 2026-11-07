'use client'

import { useApp } from '@/lib/context'
import { termDates } from '@/lib/curriculumPacing'

// ─── The grading periods the app sees for a year ──────────────────
// One line under the controls so admin can tell why a half has no weeks:
// the periods found for the year, each with its dates, and the fall and
// spring spans the board derives from them.

const fmt = (iso: string | null, ko: boolean) => iso ? new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' }) : '?'

export default function PeriodsLine({ year }: { year: string }) {
  const { semesters, language } = useApp()
  const ko = language === 'ko'
  const rows = semesters.filter(s => s.academic_year === year).sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
  const f = termDates(semesters, year, 'fall'), s = termDates(semesters, year, 'spring')
  if (!year) return null
  return (
    <p className="text-[11.5px] text-ink-3 leading-relaxed">
      {ko ? '설정의 학기: ' : 'Grading periods in Settings for this year: '}
      {rows.length === 0 ? <span className="text-warn">{ko ? '없음. 설정 → 학기에서 학년도를 같은 형식으로 적으세요.' : `none. Add them in Settings → Semesters with the academic year written exactly "${year}".`}</span>
        : rows.map((r, i) => <span key={r.id}>{i ? ' · ' : ''}{ko ? r.name_ko || r.name : r.name} ({fmt(r.start_date, ko)} – {fmt(r.end_date, ko)}{!r.start_date || !r.end_date ? <span className="text-warn">{ko ? ', 날짜 없음' : ', dates missing'}</span> : ''})</span>)}
      {rows.length > 0 && <> · {ko ? '가을' : 'fall'} {f.start ? `${fmt(f.start, ko)} – ${fmt(f.end, ko)}` : (ko ? '없음' : 'none')} · {ko ? '봄' : 'spring'} {s.start ? `${fmt(s.start, ko)} – ${fmt(s.end, ko)}` : (ko ? '없음' : 'none')}</>}
    </p>
  )
}
