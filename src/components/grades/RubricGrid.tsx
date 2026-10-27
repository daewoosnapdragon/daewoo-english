'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { rubricScore } from '@/components/curriculum/rubric-library'
import { ClipboardEdit, Loader2 } from 'lucide-react'

// ─── Rubric class grid ───────────────────────────────────────────
// What a rubric assessment lands on: every student across every criterion,
// the levels marked so far, the totals, and the class average per
// criterion. Marking happens on the full-screen rubric sheet, opened from
// the button or by clicking a student, never just by selecting the
// assessment.

interface StudentRow { id: string; english_name: string; korean_name: string }
type Flags = { absent: boolean; exempt: boolean }
interface Props {
  assessment: { id: string; name: string; max_score: number; rubric: { name: string; criteria: { key: string; label: string; standard?: string }[] } }
  students: StudentRow[]
  /** Bumped by the parent when the sheet closes, so the grid shows what was just marked. */
  refreshKey?: number
  onOpen: (studentIdx: number) => void
}

export default function RubricGrid({ assessment, students, refreshKey = 0, onOpen }: Props) {
  const { language: lang } = useApp()
  const ko = lang === 'ko'
  const criteria = assessment.rubric.criteria
  const [levels, setLevels] = useState<Record<string, Record<string, number>>>({})
  const [flags, setFlags] = useState<Record<string, Flags>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('grades').select('student_id, rubric_scores, is_absent, is_exempt').eq('assessment_id', assessment.id)
      if (cancelled) return
      const l: Record<string, Record<string, number>> = {}
      const f: Record<string, Flags> = {}
      ;(data || []).forEach((g: any) => {
        if (g.rubric_scores && typeof g.rubric_scores === 'object') l[g.student_id] = g.rubric_scores
        if (g.is_absent || g.is_exempt) f[g.student_id] = { absent: !!g.is_absent, exempt: !!g.is_exempt }
      })
      setLevels(l); setFlags(f); setLoading(false)
    })()
    return () => { cancelled = true }
  }, [assessment.id, refreshKey])

  const complete = (sid: string) => !!flags[sid]?.absent || !!flags[sid]?.exempt || criteria.every(c => (levels[sid] || {})[c.key] != null)
  const started = (sid: string) => Object.keys(levels[sid] || {}).length > 0
  const scoreOf = (sid: string) => rubricScore(levels[sid] || {}, criteria.length, assessment.max_score)
  const doneCount = students.filter(s => complete(s.id)).length
  const firstOpen = students.findIndex(s => !complete(s.id))
  const classAvg = useMemo(() => criteria.map(c => {
    const vals = students.map(s => levels[s.id]?.[c.key]).filter((v): v is number => v != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }), [criteria, students, levels])
  const scores = students.map(s => flags[s.id] ? null : scoreOf(s.id)).filter((v): v is number => v != null)
  const classScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null
  const tone = (v: number) => v === 0 ? 'bg-ink-3 text-paper' : v === 1 ? 'bg-bad text-white' : v === 2 ? 'bg-warn text-white' : v === 3 ? 'bg-good-soft text-good' : 'bg-good text-white'
  const fmt = (n: number) => Number.isInteger(n) ? String(n) : n.toFixed(1)

  if (loading) return <div className="p-10 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>

  return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <span className="text-[13px] text-ink-2 tabular-nums">{doneCount} / {students.length} {ko ? '완료' : 'done'} · {assessment.rubric.name} · {criteria.length} {ko ? '기준' : 'criteria'}</span>
        <button onClick={() => onOpen(firstOpen < 0 ? 0 : firstOpen)} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5">
          <ClipboardEdit size={13} />{doneCount < students.length ? (ko ? '루브릭으로 채점' : 'Score with the rubric') : (ko ? '루브릭 시트 열기' : 'Open the rubric sheet')}
        </button>
      </div>
      <div className="border border-rule-2 rounded-lg overflow-x-auto">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="bg-paper-2 text-[10.5px] uppercase tracking-wider text-ink-3">
              <th className="text-left px-3 py-2 font-semibold">{ko ? '학생' : 'Student'}</th>
              {criteria.map(c => <th key={c.key} className="px-2 py-2 font-semibold text-center" title={c.standard || undefined}><span className="block truncate max-w-[120px] mx-auto">{c.label}</span>{c.standard && <span className="block text-[9.5px] text-info normal-case tracking-normal">{c.standard}</span>}</th>)}
              <th className="text-right px-3 py-2 font-semibold whitespace-nowrap">/{assessment.max_score}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s, i) => {
              const fl = flags[s.id]
              const done = complete(s.id)
              const sc = scoreOf(s.id)
              return (
                <tr key={s.id} onClick={() => onOpen(i)} className="border-t border-rule cursor-pointer hover:bg-paper-2/60" title={ko ? '클릭하면 루브릭 시트에서 채점' : 'Click to mark on the rubric sheet'}>
                  <td className="px-3 py-1.5 whitespace-nowrap"><span className="font-medium text-ink">{s.english_name}</span><span className="text-ink-3 ml-2 text-[11.5px]">{s.korean_name}</span></td>
                  {criteria.map(c => {
                    const v = levels[s.id]?.[c.key]
                    return <td key={c.key} className="px-2 py-1.5 text-center">{fl ? <span className="text-ink-3">—</span> : v == null ? <span className="text-ink-3">·</span> : <span className={`inline-flex w-6 h-6 rounded items-center justify-center text-[11px] font-bold ${tone(v)}`}>{v}</span>}</td>
                  })}
                  <td className={`px-3 py-1.5 text-right tabular-nums whitespace-nowrap ${fl?.absent ? 'text-warn' : fl?.exempt ? 'text-info' : done ? 'text-good' : started(s.id) ? 'text-warn' : 'text-ink-3'}`}>{fl?.absent ? 'ABS' : fl?.exempt ? 'EXM' : done && sc != null ? `${fmt(sc)} ✓` : started(s.id) && sc != null ? `${fmt(sc)} ~` : ''}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-paper-2 border-t border-rule-2 text-[11.5px]">
              <td className="px-3 py-1.5 text-ink-2">{ko ? '반 평균' : 'Class average'}</td>
              {classAvg.map((v, i) => <td key={i} className="px-2 py-1.5 text-center tabular-nums text-ink-2">{v != null ? v.toFixed(1) : '—'}</td>)}
              <td className="px-3 py-1.5 text-right tabular-nums text-ink-2">{classScore != null ? fmt(Math.round(classScore * 10) / 10) : '—'}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-ink-3 mt-2">{ko ? '학생을 클릭하면 전체 화면 루브릭 시트에서 채점합니다. 0–4 단계, 기준당 4점.' : 'Click a student to mark their work on the full-screen rubric sheet. Levels 0–4, 4 points per criterion.'}</p>
    </div>
  )
}
