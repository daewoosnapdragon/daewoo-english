import { describe, it, expect } from 'vitest'
import { weightsFor } from '@/lib/assessmentWeights'
import { calculateWeightedAverage, DEFAULT_WEIGHTS } from '@/lib/utils'

describe('weightsFor', () => {
  const table = { '3': { formative: 50, summative: 30, performance_task: 20 }, '3-Snapdragon': { formative: 20, summative: 60, performance_task: 20 } }
  it('prefers the class override, then the grade, then the default', () => {
    expect(weightsFor(table, 3, 'Snapdragon')).toEqual({ weights: table['3-Snapdragon'], source: 'class' })
    expect(weightsFor(table, 3, 'Daisy')).toEqual({ weights: table['3'], source: 'grade' })
    expect(weightsFor(table, 4, 'Daisy')).toEqual({ weights: DEFAULT_WEIGHTS[4], source: 'default' })
    expect(weightsFor(null, 3, 'Daisy')).toEqual({ weights: DEFAULT_WEIGHTS[3], source: 'default' })
  })
  it('moves the average when the Settings table is passed through', () => {
    const items = [{ score: 8, maxScore: 10, assessmentType: 'formative' as const }, { score: 10, maxScore: 10, assessmentType: 'summative' as const }]
    expect(calculateWeightedAverage(items, 3)).toBeCloseTo((80 * 30 + 100 * 40) / 70, 6)
    expect(calculateWeightedAverage(items, 3, null, 'Snapdragon', table)).toBeCloseTo((80 * 20 + 100 * 60) / 80, 6)
    expect(calculateWeightedAverage(items, 3, null, 'Daisy', table)).toBeCloseTo((80 * 50 + 100 * 30) / 80, 6)
  })
})
