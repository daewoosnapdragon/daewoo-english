// ─── Answer keys as a typed string ───────────────────────────────
// "ACBDA BDCAB TF 2 2 3r" builds a whole question map:
//   A–E        one multiple-choice item worth 1 point, keyed to that letter
//   T / F      one true-or-false item worth 1 point
//   a number   one written item worth that many points (short answer)
//   number + r a rubric-scored item worth that many points ("3r")
// Spaces and case are ignored, so a key can be typed in groups of five.

import type { QuestionMapItem } from '@/types'

export const MC_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const

export function parseAnswerKey(text: string, existing: QuestionMapItem[] = []): QuestionMapItem[] {
  const items: QuestionMapItem[] = []
  const tokens = text.trim().split(/\s+/).filter(Boolean)
  for (const tok of tokens) {
    const rubric = /^(\d+(?:\.\d+)?)r$/i.exec(tok)
    if (rubric) { items.push({ num: items.length + 1, type: 'rubric', max_points: Number(rubric[1]) }); continue }
    if (/^\d+(?:\.\d+)?$/.test(tok)) { items.push({ num: items.length + 1, type: 'short_answer', max_points: Number(tok) }); continue }
    for (const ch of tok.toUpperCase()) {
      if ((MC_LETTERS as readonly string[]).includes(ch)) items.push({ num: items.length + 1, type: 'mc', max_points: 1, answer_key: ch })
      else if (ch === 'T' || ch === 'F') items.push({ num: items.length + 1, type: 'true_false', max_points: 1, answer_key: ch })
      // anything else is a typo; skipped rather than guessed at
    }
  }
  // Keep standards and point overrides a teacher already set on the same
  // question numbers, so retyping the key does not throw away the tagging.
  return items.map(it => {
    const prev = existing.find(e => e.num === it.num)
    if (!prev) return it
    const samePoints = prev.type === it.type && prev.type !== 'short_answer' && prev.type !== 'rubric'
    return { ...it, standard: prev.standard, max_points: samePoints ? prev.max_points : it.max_points }
  })
}

/** The string form of a question map, in groups of five, for editing. */
export function keyToString(map: QuestionMapItem[]): string {
  const parts: string[] = []
  let run = ''
  const flush = () => { if (run) { parts.push(run); run = '' } }
  for (const q of map) {
    if (q.type === 'mc' || q.type === 'true_false') {
      run += q.answer_key || '?'
      if (run.length === 5) flush()
    } else {
      flush()
      parts.push(q.type === 'rubric' ? `${q.max_points}r` : String(q.max_points))
    }
  }
  flush()
  return parts.join(' ')
}

export function keyTotal(map: QuestionMapItem[]): number {
  return map.reduce((s, q) => s + (Number(q.max_points) || 0), 0)
}

/** Whether an item is answered by choosing a letter (auto-marked) rather than by typing points. */
export function isChoiceItem(q: Pick<QuestionMapItem, 'type'>): boolean {
  return q.type === 'mc' || q.type === 'true_false'
}

export function choicesFor(q: Pick<QuestionMapItem, 'type'>): string[] {
  return q.type === 'true_false' ? ['T', 'F'] : [...MC_LETTERS.slice(0, 4)]
}

/** Points earned for an answer on a choice item. */
export function markChoice(q: QuestionMapItem, answer: string | undefined): number {
  if (!answer || !q.answer_key) return 0
  return answer.toUpperCase() === q.answer_key.toUpperCase() ? q.max_points : 0
}

/** Parse a range like "1-5", "6–10", "3" into question numbers, clipped to 1..count. */
export function parseRange(text: string, count: number): number[] {
  const out = new Set<number>()
  for (const part of text.split(',')) {
    const m = /^\s*(\d+)\s*(?:[-–]\s*(\d+))?\s*$/.exec(part)
    if (!m) continue
    const a = Number(m[1]), b = m[2] ? Number(m[2]) : a
    for (let i = Math.min(a, b); i <= Math.max(a, b); i++) if (i >= 1 && i <= count) out.add(i)
  }
  return Array.from(out).sort((x, y) => x - y)
}

/** "1–5, 8" for a set of question numbers. */
export function rangeLabel(nums: number[]): string {
  const s = [...nums].sort((a, b) => a - b)
  const parts: string[] = []
  let i = 0
  while (i < s.length) {
    let j = i
    while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++
    parts.push(j > i ? `${s[i]}–${s[j]}` : String(s[i]))
    i = j + 1
  }
  return parts.join(', ')
}
