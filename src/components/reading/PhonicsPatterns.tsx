'use client'

import { useMemo } from 'react'
import type { Student } from '@/types'
import { getDisplayName } from '@/lib/utils'
import { DECODING_OBSERVATIONS, phonicsSkill, PHONICS_SKILL_IDS, type LatestBySkill, type PhonicsCheckRow } from '@/lib/phonics'
import { MIN_TESTED } from '@/lib/phonicsCompare'
import {
  CONCERN_OBSERVATIONS, STRENGTH_OBSERVATIONS, observationCounts, troubleCounts, missedWords, splitPatternKey,
} from '@/lib/phonicsPatterns'

// ─── Error patterns across classes ───────────────────────────────
// Three tables over the students in scope, a column per class (or per grade
// in All grades) and one for everyone: how they decoded, the graphemes that
// gave trouble, and the words missed most with what was said instead.
// Everything from each student's latest result per sheet.

export interface PatternColumn { key: string; label: string; dot?: string; studentIds: string[]; total?: boolean }

const TOP_PATTERNS = 20
const TOP_WORDS = 30

function shareTone(pct: number, kind: 'concern' | 'strength' | 'neutral', of: number): string {
  if (of < MIN_TESTED) return 'text-ink-3'
  if (kind === 'concern') return pct >= 40 ? 'bg-bad-soft text-bad font-semibold' : pct >= 20 ? 'bg-warn-soft text-warn' : 'text-ink-2'
  if (kind === 'strength') return pct >= 60 ? 'bg-good-soft text-good font-semibold' : 'text-ink-2'
  return pct >= 40 ? 'bg-paper-2 text-ink font-semibold' : 'text-ink-2'
}

export default function PhonicsPatterns({ columns, latestByStudent, checksById, studentById, lang, onOpenStudent }: {
  columns: PatternColumn[]; latestByStudent: Record<string, LatestBySkill>; checksById: Record<string, PhonicsCheckRow>
  studentById: Record<string, Student>; lang: 'en' | 'ko'; onOpenStudent: (s: Student) => void
}) {
  const everyone = columns.find(c => c.total) || columns[0]
  const obs = useMemo(() => columns.map(c => observationCounts(c.studentIds, latestByStudent, checksById)), [columns, latestByStudent, checksById])
  const trouble = useMemo(() => columns.map(c => troubleCounts(c.studentIds, latestByStudent, checksById)), [columns, latestByStudent, checksById])
  const allTrouble = trouble[columns.indexOf(everyone)]
  const topPatterns = useMemo(() => Object.entries(allTrouble.counts)
    .sort((a, b) => b[1] - a[1] || PHONICS_SKILL_IDS.indexOf(splitPatternKey(a[0]).sheet) - PHONICS_SKILL_IDS.indexOf(splitPatternKey(b[0]).sheet))
    .slice(0, TOP_PATTERNS).map(([k]) => k), [allTrouble])
  const words = useMemo(() => missedWords(everyone.studentIds, latestByStudent, checksById).slice(0, TOP_WORDS), [everyone, latestByStudent, checksById])
  // Across grades, a class name alone would merge Grade 1 Lily with Grade 3 Lily.
  const manyGrades = new Set(everyone.studentIds.map(id => studentById[id]?.grade)).size > 1
  const classOf = (sid: string) => { const s = studentById[sid]; return s ? (manyGrades ? `G${s.grade} ${s.english_class}` : s.english_class) : '' }

  if (obs[columns.indexOf(everyone)].checked === 0) return <p className="text-[13px] text-ink-3 py-6">{lang === 'ko' ? '점검 기록이 없습니다.' : 'No checks yet.'}</p>

  const head = (first: string) => (
    <thead><tr className="bg-paper-2">
      <th className="text-left px-3 py-2 eyebrow font-semibold border-b border-rule-2">{first}</th>
      {columns.map((c, i) => (
        <th key={c.key} className={`px-2 py-2 border-b border-rule-2 text-[11.5px] font-semibold text-ink text-center whitespace-nowrap ${c.total ? 'border-l-2 border-l-rule-2' : ''}`}>
          {c.dot && <span className={`inline-block w-2 h-2 rounded-full mr-1 ${c.dot}`} />}{c.label}
          <span className="block text-[10px] font-normal text-ink-3">{obs[i].checked} {lang === 'ko' ? '명 점검' : 'checked'}</span>
        </th>
      ))}
    </tr></thead>
  )

  return (
    <div className="space-y-8">
      <section>
        <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '해독 방식' : 'How they decoded'}</h3>
        <p className="text-[11.5px] text-ink-3 mb-2">{lang === 'ko'
          ? `점검한 학생 중, 최근 시트 하나 이상에서 이 항목이 체크된 비율. 빨강은 걱정 신호, 초록은 강점. ${MIN_TESTED}명 미만은 색 없음.`
          : `Of the students checked, the share with this box ticked on at least one of their latest sheets. Red marks a concern, green a strength; no colour from fewer than ${MIN_TESTED} students.`}</p>
        <div className="border border-rule-2 rounded-md overflow-x-auto">
          <table className="w-full text-[12px] tabular-nums border-collapse">
            {head(lang === 'ko' ? '체크 항목' : 'Teacher checkbox')}
            <tbody className="divide-y divide-rule">
              {DECODING_OBSERVATIONS.map(o => {
                const kind = CONCERN_OBSERVATIONS.includes(o.id) ? 'concern' : STRENGTH_OBSERVATIONS.includes(o.id) ? 'strength' : 'neutral'
                return (
                  <tr key={o.id}>
                    <td className={`px-3 py-1.5 ${kind === 'concern' ? 'text-bad' : kind === 'strength' ? 'text-good' : 'text-ink'}`}>{lang === 'ko' ? o.label_ko : o.label}</td>
                    {columns.map((c, i) => {
                      const n = obs[i].counts[o.id] || 0; const of = obs[i].checked
                      const pct = of ? Math.round((n / of) * 100) : 0
                      return <td key={c.key} className={`px-1 py-1 text-center ${c.total ? 'border-l-2 border-l-rule-2' : ''}`}>
                        {of === 0 ? <span className="text-ink-3/50">·</span> : n === 0 ? <span className="text-ink-3/60">—</span>
                          : <span className={`inline-block min-w-[52px] px-1.5 py-0.5 rounded-sm ${shareTone(pct, kind, of)}`} title={`${n} of ${of} students`}>{pct}% <span className="text-[10px] font-normal opacity-70">{n}</span></span>}
                      </td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '어려워한 패턴' : 'Patterns that gave trouble'}</h3>
        <p className="text-[11.5px] text-ink-3 mb-2">{lang === 'ko'
          ? `가장 많이 체크된 ${TOP_PATTERNS}개. 칸 = 그 시트를 점검한 학생 중 이 패턴이 체크된 학생 수.`
          : `The ${TOP_PATTERNS} ticked most often. Each cell: students with it ticked, of those checked on that sheet.`}</p>
        {topPatterns.length === 0 ? <p className="text-[12px] text-ink-3">{lang === 'ko' ? '체크된 패턴이 없습니다.' : 'No patterns ticked yet.'}</p> : (
          <div className="border border-rule-2 rounded-md overflow-x-auto">
            <table className="w-full text-[12px] tabular-nums border-collapse">
              {head(lang === 'ko' ? '시트 · 패턴' : 'Sheet · pattern')}
              <tbody className="divide-y divide-rule">
                {topPatterns.map(k => {
                  const { sheet, pattern } = splitPatternKey(k)
                  return (
                    <tr key={k}>
                      <td className="px-3 py-1.5 text-ink"><span className="font-semibold">{pattern}</span> <span className="text-ink-3 text-[11px]">· {phonicsSkill(sheet)?.short || sheet}</span></td>
                      {columns.map((c, i) => {
                        const n = trouble[i].counts[k] || 0; const of = trouble[i].checkedBySheet[sheet] || 0
                        const pct = of ? Math.round((n / of) * 100) : 0
                        return <td key={c.key} className={`px-1 py-1 text-center ${c.total ? 'border-l-2 border-l-rule-2' : ''}`}>
                          {of === 0 ? <span className="text-ink-3/50">·</span> : n === 0 ? <span className="text-ink-3/60">0/{of}</span>
                            : <span className={`inline-block min-w-[52px] px-1.5 py-0.5 rounded-sm ${shareTone(pct, 'concern', of)}`} title={`${n} of ${of} checked on ${phonicsSkill(sheet)?.label}`}>{n}/{of}</span>}
                        </td>
                      })}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '가장 많이 틀린 단어' : 'Words missed most'}</h3>
        <p className="text-[11.5px] text-ink-3 mb-2">{lang === 'ko'
          ? '두 명 이상이 틀린 단어. 학생이 대신 읽은 것은 교사가 연필로 적은 것입니다.'
          : 'Missed by two or more students. “Said instead” is what teachers wrote with the pencil.'}</p>
        {words.length === 0 ? <p className="text-[12px] text-ink-3">{lang === 'ko' ? '두 명 이상 틀린 단어가 없습니다.' : 'No word missed by two or more students yet.'}</p> : (
          <div className="border border-rule-2 rounded-md overflow-x-auto">
            <table className="w-full min-w-[720px] text-[12px] tabular-nums border-collapse">
              <thead><tr className="bg-paper-2 text-left">
                <th className="px-3 py-2 eyebrow font-semibold">{lang === 'ko' ? '단어' : 'Word'}</th>
                <th className="px-2 py-2 eyebrow font-semibold">{lang === 'ko' ? '시트' : 'Sheet'}</th>
                <th className="px-2 py-2 eyebrow font-semibold">{lang === 'ko' ? '틀림' : 'Missed'}</th>
                <th className="px-2 py-2 eyebrow font-semibold">{lang === 'ko' ? '대신 읽음' : 'Said instead'}</th>
                <th className="px-2 py-2 eyebrow font-semibold">{lang === 'ko' ? '반별' : 'By class'}</th>
              </tr></thead>
              <tbody className="divide-y divide-rule">
                {words.map(w => {
                  const byClass: Record<string, number> = {}
                  w.studentIds.forEach(sid => { const c = classOf(sid); byClass[c] = (byClass[c] || 0) + 1 })
                  return (
                    <tr key={`${w.sheet}|${w.word}`}>
                      <td className="px-3 py-1.5 font-display text-[16px] text-ink">{w.word}</td>
                      <td className="px-2 py-1.5 text-ink-2">{phonicsSkill(w.sheet)?.short}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><span className="font-semibold text-bad">{w.missed}</span><span className="text-ink-3">/{w.read} · {Math.round((w.missed / w.read) * 100)}%</span></td>
                      <td className="px-2 py-1.5 text-ink-2">{w.heard.length ? w.heard.slice(0, 4).map(([said, n]) => <span key={said} className="inline-block mr-2"><span className="italic">“{said}”</span>{n > 1 && <span className="text-ink-3 text-[11px]"> ×{n}</span>}</span>) : <span className="text-ink-3">—</span>}</td>
                      <td className="px-2 py-1.5 text-[11px] text-ink-2">
                        {Object.entries(byClass).map(([c, n]) => <span key={c} className="inline-block mr-2">{c} {n}</span>)}
                        <span className="block text-ink-3 truncate max-w-[260px]" title={w.studentIds.map(id => studentById[id]?.english_name).join(', ')}>
                          {w.studentIds.slice(0, 4).map((id, i) => <button key={id} onClick={() => studentById[id] && onOpenStudent(studentById[id])} className="hover:underline">{i ? ', ' : ''}{studentById[id] ? getDisplayName(studentById[id]) : ''}</button>)}
                          {w.studentIds.length > 4 ? ` +${w.studentIds.length - 4}` : ''}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
