import { supabase } from '@/lib/supabase'

// ─── Curriculum saves in one transaction ─────────────────────────
// The functions in supabase/migration-curriculum-atomic.sql do multi-step
// saves (place a book with its units, adopt a plan, reorder, patch many
// rows) in one call, so a failure part way changes nothing. Until that
// migration is run they don't exist; `tryRpc` says so and the caller falls
// back to the step-by-step requests it used before.

type RpcError = { code?: string; message?: string } | null | undefined

/** True when the database has no such function yet (the migration has not been run). */
export const isRpcMissing = (e: RpcError) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function|function .* does not exist/i.test(e.message || ''))

/** Calls a curriculum function. `missing` means fall back; otherwise `error` is the message or null. */
export async function tryRpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<{ missing: boolean; error: string | null; data: T | null }> {
  const { data, error } = await supabase.rpc(fn, args)
  if (isRpcMissing(error)) return { missing: true, error: null, data: null }
  return { missing: false, error: error?.message || null, data: (data as T) ?? null }
}

/** Lengths as the JSON curriculum_patch_pacing takes, rounded to half weeks the way the app stores them. */
export const pacingPatchesJson = (patches: { id: string; weeks: number }[]) =>
  patches.map(p => ({ id: p.id, weeks: Math.max(0.5, Math.round(p.weeks * 2) / 2) }))
