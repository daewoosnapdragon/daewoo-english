import { describe, it, expect, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { isRpcMissing, pacingPatchesJson } from '../curriculumRpc'

describe('curriculum functions', () => {
  it('knows when the migration has not been run', () => {
    expect(isRpcMissing({ code: 'PGRST202', message: 'Could not find the function public.curriculum_set_order' })).toBe(true)
    expect(isRpcMissing({ message: 'function curriculum_set_order(text, uuid[]) does not exist' })).toBe(true)
    expect(isRpcMissing({ message: 'duplicate key value violates unique constraint' })).toBe(false)
    expect(isRpcMissing(null)).toBe(false)
  })
  it('rounds patches and leaves out what does not change', () => {
    expect(pacingPatchesJson([{ id: 'a', weeks: 2.3 }, { id: 'b', gap_before: -1, fixed: true }])).toEqual([{ id: 'a', weeks: 2.5 }, { id: 'b', gap_before: 0, fixed: true }])
  })
})
