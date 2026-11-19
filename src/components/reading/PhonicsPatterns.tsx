'use client'

import { useMemo } from 'react'
import type { Student } from '@/types'
import { getDisplayName } from '@/lib/utils'
import { sheetError, phonicsSkill, PHONICS_SKILL_IDS, type LatestBySkill, type PhonicsCheckRow } from '@/lib/phonics'
import { MIN_TESTED } from '@/lib/phonicsCompare'
import {
  checkedCount, errorCounts, troubleCounts, missedWords, splitPatternKey, type TickCounts,
} from '@/lib/phonicsPatterns'

// ─── Error patterns across classes ───────────────────────────────
// Three tables over the students in scope, a column per class (or per grade
// in All grades) and one for everyone: what went wrong, the graphemes that
// gave trouble, and the words missed most with what was said instead.
// Everything from each student's latest result per sheet.

export interface PatternColumn { key: string; label: string; dot?: string; studentIds: string[]; total?: boolean }

const TOP_PATTERNS = 20
const TOP_ERRORS = 25

/** The keys ticked most across everyone, then in sheet order. */
function topKeys(t: TickCounts, n: number): string[] {
  return Object.entries(t.counts)
    .sort((a, b) => b[1] - a[1] || PHONICS_SKILL_IDS.indexOf(splitPatternKey(a[0]).sheet) - PHONICS_SKILL_IDS.indexOf(splitPatternKey(b[0]).sheet))
    .slice(0, n).map(([k]) => k)
}
const TOP_WORDS = 30

function shareTone(pct: number, of: number): string {
  if (of < MIN_TESTED) return 'text-ink-3'
  return pct >= 40 ? 'bg-bad-soft text-bad font-semibold' : pct >= 20 ? 'bg-warn-soft text-warn' : 'text-ink-2'
}

export default function PhonicsPatterns({ columns, latestByStudent, checksById, studentById, lang, onOpenStudent }: {
  columns: PatternColumn[]; latestByStudent: Record<string, LatestBySkill>; checksById: Record<string, PhonicsCheckRow>
  studentById: Record<string, Student>; lang: 'en' | 'ko'; onOpenStudent: (s: Student) => void
}) {
  const everyone = columns.find(c => c.total) || columns[0]
  const checked = useMemo(() => columns.map(c => checkedCount(c.studentIds, latestByStudent)), [columns, latestByStudent])
  const errors = useMemo(() => columns.map(c => errorCounts(c.studentIds, latestByStudent, checksById)), [columns, latestByStudent, checksById])
  const trouble = useMemo(() => columns.map(c => troubleCounts(c.studentIds, latestByStudent, checksById)), [columns, latestByStudent, checksById])
  const at = columns.indexOf(everyone)
  const topErrors = useMemo(() => topKeys(errors[at], TOP_ERRORS), [errors, at])
  const topPatterns = useMemo(() => topKeys(trouble[at], TOP_PATTERNS), [trouble, at])
  const words = useMemo(() => missedWords(everyone.studentIds, latestByStudent, checksById).slice(0, TOP_WORDS), [everyone, latestByStudent, checksById])
  // Across grades, a class name alone would merge Grade 1 Lily with Grade 3 Lily.
  const manyGrades = new Set(everyone.studentIds.map(id => studentById[id]?.grade)).size > 1
  const classOf = (sid: string) => { const s = studentById[sid]; return s ? (manyGrades ? `G${s.grade} ${s.english_class}` : s.english_class) : '' }

  if (checked[at] === 0) return <p className="text-[length:calc(13px*var(--ts))] text-ink-3 py-6">{lang === 'ko' ? '점검 기록이 없습니다.' : 'No checks yet.'}</p>

  const head = (first: string) => (
    <thead><tr className="bg-paper-2">
      <th className="text-left px-3 py-2 eyebrow font-semibold border-b border-rule-2">{first}</th>
      {columns.map((c, i) => (
        <th key={c.key} className={`px-2 py-2 border-b border-rule-2 text-[length:calc(11.5px*var(--ts))] font-semibold text-ink text-center whitespace-nowrap ${c.total ? 'border-l-2 border-l-rule-2' : ''}`}>
          {c.dot && <span className={`inline-block w-2 h-2 rounded-full mr-1 ${c.dot}`} />}{c.label}
          <span className="block text-[length:calc(10px*var(--ts))] font-normal text-ink-3">{checked[i]} {lang === 'ko' ? '명 점검' : 'checked'}</span>
        </th>
      ))}
    </tr></thead>
  )

  // A row per sheet|tick, a column per class: students with it ticked, of those checked on that sheet.
  const tickTable = (first: string, keys: string[], counts: TickCounts[], label: (sheet: string, tick: string) => string) => (
    <div className="border border-rule-2 rounded-md overflow-x-auto">
      <table className="w-full text-[length:calc(12px*var(--ts))] tabular-nums border-collapse">
        {head(first)}
        <tbody className="divide-y divide-rule">
          {keys.map(k => {
            const { sheet, pattern: tick } = splitPatternKey(k)
            return (
              <tr key={k}>
                <td className="px-3 py-1.5 text-ink"><span className="text-ink-3 text-[length:calc(11px*var(--ts))]">{phonicsSkill(sheet)?.short || sheet} · </span><span className="font-medium">{label(sheet, tick)}</span></td>
                {columns.map((c, i) => {
                  const n = counts[i].counts[k] || 0; const of = counts[i].checkedBySheet[sheet] || 0
                  const pct = of ? Math.round((n / of) * 100) : 0
                  return <td key={c.key} className={`px-1 py-1 text-center ${c.total ? 'border-l-2 border-l-rule-2' : ''}`}>
                    {of === 0 ? <span className="text-ink-3/50">·</span> : n === 0 ? <span className="text-ink-3/60">0/{of}</span>
                      : <span className={`inline-block min-w-[52px] px-1.5 py-0.5 rounded-sm ${shareTone(pct, of)}`} title={`${n} of ${of} checked on ${phonicsSkill(sheet)?.label}`}>{n}/{of}</span>}
                  </td>
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="space-y-8">
      <section>
        <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '오류' : 'What went wrong'}</h3>
        <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 mb-2">{lang === 'ko'
          ? `가장 많이 체크된 ${TOP_ERRORS}개, 시트별. 칸 = 그 시트를 점검한 학생 중 이 오류가 체크된 학생 수. ${MIN_TESTED}명 미만은 색 없음.`
          : `The ${TOP_ERRORS} ticked most, sheet by sheet. Each cell: students with it ticked on their latest check, of those checked on that sheet. No colour from fewer than ${MIN_TESTED} students.`}</p>
        {topErrors.length === 0 ? <p className="text-[length:calc(12px*var(--ts))] text-ink-3">{lang === 'ko' ? '체크된 오류가 없습니다.' : 'No errors ticked yet.'}</p>
          : tickTable(lang === 'ko' ? '시트 · 오류' : 'Sheet · error', topErrors, errors, (sheet, id) => { const e = sheetError(sheet, id); return e ? (lang === 'ko' ? e.label_ko : e.label) : id })}
      </section>

      <section>
        <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '어려워한 패턴' : 'Patterns that gave trouble'}</h3>
        <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 mb-2">{lang === 'ko'
          ? `가장 많이 체크된 ${TOP_PATTERNS}개. 칸 = 그 시트를 점검한 학생 중 이 패턴이 체크된 학생 수.`
          : `The ${TOP_PATTERNS} ticked most often. Each cell: students with it ticked, of those checked on that sheet.`}</p>
        {topPatterns.length === 0 ? <p className="text-[length:calc(12px*var(--ts))] text-ink-3">{lang === 'ko' ? '체크된 패턴이 없습니다.' : 'No patterns ticked yet.'}</p>
          : tickTable(lang === 'ko' ? '시트 · 패턴' : 'Sheet · pattern', topPatterns, trouble, (_, p) => p)}
      </section>

      <section>
        <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '가장 많이 틀린 단어' : 'Words missed most'}</h3>
        <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3 mb-2">{lang === 'ko'
          ? '두 명 이상이 틀린 단어. 학생이 대신 읽은 것은 교사가 연필로 적은 것입니다.'
          : 'Missed by two or more students. “Said instead” is what teachers wrote with the pencil.'}</p>
        {words.length === 0 ? <p className="text-[length:calc(12px*var(--ts))] text-ink-3">{lang === 'ko' ? '두 명 이상 틀린 단어가 없습니다.' : 'No word missed by two or more students yet.'}</p> : (
          <div className="border border-rule-2 rounded-md overflow-x-auto">
            <table className="w-full min-w-[720px] text-[length:calc(12px*var(--ts))] tabular-nums border-collapse">
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
                      <td className="px-3 py-1.5 font-display text-[length:calc(16px*var(--ts))] text-ink">{w.word}</td>
                      <td className="px-2 py-1.5 text-ink-2">{phonicsSkill(w.sheet)?.short}</td>
                      <td className="px-2 py-1.5 whitespace-nowrap"><span className="font-semibold text-bad">{w.missed}</span><span className="text-ink-3">/{w.read} · {Math.round((w.missed / w.read) * 100)}%</span></td>
                      <td className="px-2 py-1.5 text-ink-2">{w.heard.length ? w.heard.slice(0, 4).map(([said, n]) => <span key={said} className="inline-block mr-2"><span className="italic">“{said}”</span>{n > 1 && <span className="text-ink-3 text-[length:calc(11px*var(--ts))]"> ×{n}</span>}</span>) : <span className="text-ink-3">—</span>}</td>
                      <td className="px-2 py-1.5 text-[length:calc(11px*var(--ts))] text-ink-2">
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
