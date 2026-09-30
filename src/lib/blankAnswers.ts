// ─── Blank answers on the answer sheet ───────────────────────────
// A question the student left blank is wrong: it earns 0 and the paper
// still counts as fully marked. The teacher can mark a blank on purpose
// (the — bubble, or the minus key), and any question left unmarked on a
// paper that has other marks becomes a blank when the teacher moves on
// to the next student or saves. An untouched paper stays untouched, so a
// student who has not been scored yet is never turned into all zeros.

import type { QuestionMapItem } from '@/types'
import { isChoiceItem } from '@/lib/answerKey'

export interface SheetResp { answer?: string; points?: number; levels?: Record<string, number>; blank?: boolean }

const hasRubric = (q: QuestionMapItem) => q.type === 'rubric' && !!q.rubric?.criteria?.length

/** Whether the teacher has put anything on this item: a letter, points, a rubric level, or a blank. */
export function isMarked(resp: SheetResp | undefined, item: QuestionMapItem): boolean {
  if (!resp) return false
  if (resp.blank) return true
  if (hasRubric(item)) return item.rubric!.criteria.some(c => resp.levels?.[c.key] != null)
  return isChoiceItem(item) ? !!resp.answer : resp.points != null
}

/** Whether the item is fully scored: every rubric criterion has a level, or a letter / points / blank is in. */
export function isAnswered(resp: SheetResp | undefined, item: QuestionMapItem): boolean {
  if (!resp) return false
  if (resp.blank) return true
  if (hasRubric(item)) return item.rubric!.criteria.every(c => resp.levels?.[c.key] != null)
  return isChoiceItem(item) ? !!resp.answer : resp.points != null
}

/** The response for a question the student did not answer: 0 points, and 0 on every rubric criterion. */
export function blankResponse(item: QuestionMapItem): SheetResp {
  if (hasRubric(item)) {
    const levels: Record<string, number> = {}
    item.rubric!.criteria.forEach(c => { levels[c.key] = 0 })
    return { blank: true, points: 0, levels }
  }
  return { blank: true, points: 0 }
}

/** Questions with no mark yet that sit before a later marked question, so the teacher passed over them. */
export function skippedItems(row: Record<number, SheetResp> | undefined, map: QuestionMapItem[]): QuestionMapItem[] {
  if (!row) return []
  let lastMarked = -1
  map.forEach((it, i) => { if (isMarked(row[it.num], it)) lastMarked = i })
  return map.filter((it, i) => i < lastMarked && !isMarked(row[it.num], it))
}

/**
 * Turn every unmarked question on a started paper into a blank. Returns the
 * same row when nothing changes: the paper is untouched, or already complete.
 */
export function finalizeBlanks(row: Record<number, SheetResp> | undefined, map: QuestionMapItem[]): Record<number, SheetResp> | undefined {
  if (!row) return row
  if (!map.some(it => isMarked(row[it.num], it))) return row
  const missing = map.filter(it => !isMarked(row[it.num], it))
  if (missing.length === 0) return row
  const next = { ...row }
  missing.forEach(it => { next[it.num] = blankResponse(it) })
  return next
}

/** How many questions on the paper are blanks. */
export function blankCount(row: Record<number, SheetResp> | undefined, map: QuestionMapItem[]): number {
  if (!row) return 0
  return map.filter(it => row[it.num]?.blank).length
}
