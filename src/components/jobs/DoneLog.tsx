'use client'

import { doneByDay, termSummary, fmtDay, type AdminJob, type JobSize } from '@/lib/adminJobs'
import type { Semester, Teacher } from '@/types'

// ─── What got done ───────────────────────────────────────────────
// The log: every finished job by the day it was finished, newest first,
// with who did it. The term: a count per person and category, and the
// sizes, for the semester shown. Numbers only; no hours, no commentary.

export function DoneLogList({ jobs, ko, nameOf }: { jobs: AdminJob[]; ko: boolean; nameOf: (id: string | null | undefined) => string }) {
  const days = doneByDay(jobs)
  if (days.length === 0) return <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '아직 완료된 일이 없습니다.' : 'Nothing finished yet.'}</p>
  return (
    <div className="grid gap-4">
      {days.map(d => (
        <div key={d.day}>
          <p className="eyebrow mb-1">{fmtDay(d.day, ko)} <span className="text-ink-3 normal-case tracking-normal">· {d.jobs.length}</span></p>
          <ul className="divide-y divide-rule border-t border-b border-rule">
            {d.jobs.map(j => (
              <li key={j.id} className="grid grid-cols-[minmax(0,1fr)_110px_50px_120px] gap-3 py-1.5 text-[length:calc(12.5px*var(--ts))]">
                <span className="text-ink truncate">{j.title}</span>
                <span className="text-ink-3 truncate">{j.category || '—'}</span>
                <span className="text-ink-3 tabular-nums">{j.size}</span>
                <span className="text-ink-2 truncate text-right">{nameOf(j.completed_by_id)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function TermSummary({ jobs, ko, teachers, semester, nameOf }: { jobs: AdminJob[]; ko: boolean; teachers: Teacher[]; semester: Semester | null; nameOf: (id: string | null | undefined) => string }) {
  if (!semester?.start_date) return <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '학기 날짜가 설정에 없습니다.' : 'The semester has no dates in Settings.'}</p>
  const to = semester.end_date || '9999-12-31'
  const s = termSummary(jobs, semester.start_date, to)
  const people = Object.keys(s.byPerson).sort((a, b) => s.byPerson[b].total - s.byPerson[a].total)
  const sizes: JobSize[] = ['XS', 'S', 'M', 'L']
  if (people.length === 0) return <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3">{ko ? '이 학기에 완료된 일이 없습니다.' : 'Nothing finished this semester yet.'}</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[length:calc(12.5px*var(--ts))]">
        <thead><tr className="text-left border-b border-rule-2">
          <th className="py-1.5 pr-3 font-semibold text-ink">{semester.name}</th>
          <th className="py-1.5 pr-3 font-semibold text-ink tabular-nums text-right">{ko ? '완료' : 'Done'}</th>
          {sizes.map(z => <th key={z} className="py-1.5 pr-3 font-semibold text-ink-3 tabular-nums text-right">{z}</th>)}
          {s.categories.map(c => <th key={c} className="py-1.5 pr-3 font-medium text-ink-3 text-right whitespace-nowrap">{c}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-rule">
          {people.map(p => <tr key={p}>
            <td className="py-1.5 pr-3 text-ink">{p === 'unknown' ? '—' : nameOf(p)}</td>
            <td className="py-1.5 pr-3 tabular-nums text-right font-semibold text-ink">{s.byPerson[p].total}</td>
            {sizes.map(z => <td key={z} className="py-1.5 pr-3 tabular-nums text-right text-ink-2">{s.byPerson[p].bySize[z] || '—'}</td>)}
            {s.categories.map(c => <td key={c} className="py-1.5 pr-3 tabular-nums text-right text-ink-2">{s.byPerson[p].byCategory[c] || '—'}</td>)}
          </tr>)}
        </tbody>
      </table>
      <p className="text-[length:calc(11px*var(--ts))] text-ink-3 mt-2">{ko ? `${teachers.length}명 중 완료 기록이 있는 사람만 표시됩니다.` : 'Only people with a finished job are listed.'}</p>
    </div>
  )
}
