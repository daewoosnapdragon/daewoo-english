'use client'

import { Loader2 } from 'lucide-react'
import { WIDA_DOMAINS } from '@/lib/wida'

// ─── Class timeline ──────────────────────────────────────────────
// One column per month a level was recorded, plus the current levels, so a
// class's language growth reads left to right. Each cell is the overall
// average of the four domains; hover for the breakdown.

interface Props {
  students: { id: string; english_name: string; korean_name: string }[]
  historyData: { student_id: string; domain: string; wida_level: number; recorded_at: string }[]
  currentLevels: Record<string, Record<string, number>>
  loading: boolean
  lang: string
}

export default function WidaTimeline({ students, historyData, currentLevels, loading, lang }: Props) {
  const ko = lang === 'ko'
  if (loading) return <div className="py-12 text-center"><Loader2 size={18} className="animate-spin text-ink-3 mx-auto" /></div>

  const months = new Set<string>()
  const byStudentMonth: Record<string, Record<string, Record<string, number>>> = {}
  historyData.forEach(h => {
    const month = h.recorded_at.slice(0, 7)
    months.add(month)
    ;((byStudentMonth[h.student_id] ||= {})[month] ||= {})[h.domain] = h.wida_level
  })
  const sortedMonths = Array.from(months).sort()
  const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const columns = [...sortedMonths, 'current']
  const overallOf = (levels: Record<string, number> | undefined) => {
    if (!levels) return null
    const vals = Object.values(levels).filter(v => v > 0)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const tone = (o: number) => o <= 1.5 ? 'bg-bad-soft text-bad' : o <= 2.5 ? 'bg-warn-soft text-warn' : o <= 3.5 ? 'bg-warn-soft text-ink' : o <= 4.5 ? 'bg-good-soft text-good' : 'bg-paper-3 text-ink'

  if (!sortedMonths.length) {
    return (
      <div className="border border-rule-2 rounded-lg p-8 text-center">
        <p className="text-[13px] text-ink-2">{ko ? '이 반의 WIDA 이력이 아직 없습니다.' : 'No WIDA history for this class yet.'}</p>
        <p className="text-[12px] text-ink-3 mt-1">{ko ? '수준을 저장할 때마다 이력이 기록됩니다.' : 'A row is recorded each time a level is saved. Set some levels and the timeline starts here.'}</p>
      </div>
    )
  }

  return (
    <div className="border border-rule-2 rounded-lg overflow-auto">
      <table className="w-full text-[12.5px] tabular-nums">
        <thead>
          <tr className="bg-paper-2 border-b border-rule-2">
            <th className="text-left px-4 py-2.5 eyebrow font-semibold sticky left-0 bg-paper-2 min-w-[180px]">{ko ? '학생' : 'Student'}</th>
            {columns.map(col => {
              if (col === 'current') return <th key="current" className="text-center px-3 py-2.5 eyebrow font-semibold text-ink w-20">{ko ? '현재' : 'Now'}</th>
              const [y, m] = col.split('-')
              return <th key={col} className="text-center px-3 py-2.5 text-[11px] text-ink-3 font-medium w-16">{MONTH_NAMES[parseInt(m)]} {y.slice(2)}</th>
            })}
            <th className="text-center px-3 py-2.5 eyebrow font-semibold w-20">{ko ? '변화' : 'Change'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-rule">
          {students.map(s => {
            const first = overallOf(byStudentMonth[s.id]?.[sortedMonths[0]])
            const now = overallOf(currentLevels[s.id])
            const change = first != null && now != null ? now - first : null
            return (
              <tr key={s.id} className="hover:bg-paper-2/60">
                <td className="px-4 py-1.5 sticky left-0 bg-surface"><span className="text-ink">{s.english_name}</span><span className="text-[11px] text-ink-3 ml-1.5">{s.korean_name}</span></td>
                {columns.map(col => {
                  const levels = col === 'current' ? currentLevels[s.id] : byStudentMonth[s.id]?.[col]
                  const o = overallOf(levels)
                  if (o == null) return <td key={col} className="text-center px-3 py-1.5 text-ink-3">·</td>
                  return <td key={col} className="text-center px-3 py-1.5"><span className={`inline-block px-2 py-0.5 rounded text-[12px] font-semibold ${tone(o)}`} title={levels ? WIDA_DOMAINS.map(d => `${d} ${levels[d] || '?'}`).join(' · ') : ''}>{o.toFixed(1)}</span></td>
                })}
                <td className="text-center px-3 py-1.5">{change != null ? <span className={`font-semibold ${change > 0 ? 'text-good' : change < 0 ? 'text-bad' : 'text-ink-3'}`}>{change > 0 ? '+' : ''}{change.toFixed(1)}</span> : <span className="text-ink-3">·</span>}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="px-4 py-2.5 border-t border-rule text-[11px] text-ink-3">{ko ? '각 칸은 네 영역의 평균입니다. 마우스를 올리면 영역별 수준이 보입니다.' : 'Each cell is the average of the four domains. Hover for the breakdown.'}</p>
    </div>
  )
}
