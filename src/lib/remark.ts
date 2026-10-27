import type { QuestionMapItem, ItemResponse } from '@/types'
import { isChoiceItem, markChoice } from '@/lib/answerKey'
import { rubricScore } from '@/components/curriculum/rubric-library'

// ─── Scoring saved answers against a changed key ─────────────────
// A paper is saved as the student's answers, so when a letter in the key is
// corrected, a point value changed, or a standard retagged, every marked
// paper can be scored again from what the student wrote. A question added
// to the key is left unmarked on those papers; one removed is dropped.

/** Score the old answers against the new map. Pure. */
export function remarkResponses(map: QuestionMapItem[], old: ItemResponse[] | null | undefined): ItemResponse[] {
  const prevOf = (num: number) => (old || []).find(r => r.q === num)
  return map.map(it => {
    const prev = prevOf(it.num)
    const base = { q: it.num, type: it.type, max: it.max_points, ...(it.standard ? { standard: it.standard } : {}) }
    if (!prev) return base as ItemResponse
    if (isChoiceItem(it)) {
      const answer = prev.answer || undefined
      const blank = !!prev.blank
      if (!answer && !blank) return base as ItemResponse
      return { ...base, answer, correct: !blank && answer === it.answer_key, points: blank ? 0 : markChoice(it, answer), ...(blank ? { blank: true } : {}) } as ItemResponse
    }
    if (it.type === 'rubric' && it.rubric?.criteria?.length && prev.levels) {
      const levels = prev.levels
      return { ...base, levels, points: rubricScore(levels, it.rubric.criteria.length, it.max_points) ?? 0 } as ItemResponse
    }
    if (prev.blank) return { ...base, points: 0, blank: true } as ItemResponse
    if (prev.points == null && prev.answer == null && !prev.levels) return base as ItemResponse
    return { ...base, points: Math.max(0, Math.min(it.max_points, Number(prev.points) || 0)) } as ItemResponse
  })
}

