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
  it('rounds lengths to half weeks, never under half a week', () => {
    expect(pacingPatchesJson([{ id: 'a', weeks: 2.3 }, { id: 'b', weeks: 0 }])).toEqual([{ id: 'a', weeks: 2.5 }, { id: 'b', weeks: 0.5 }])
  })
})
