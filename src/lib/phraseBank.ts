// ─── The phrase bank, loaded once ────────────────────────────────
// comment_phrases rows, shared by the Phrases drawer and the comment
// builder. Loaded once per page and kept; the bank changes rarely.

import { supabase } from '@/lib/supabase'
import type { Band, Tier } from '@/lib/phrases'

export interface Phrase {
  id: string
  kind: 'sentence' | 'opener' | 'closer' | 'ladder'
  area: string | null
  tier: Tier | null
  category: string | null
  grades: '1-2' | '3-5' | 'all'
  doc: 'both' | 'mid' | 'end'
  audience: 'student' | 'parents' | null
  band: Band | null
  rung: string | null
  text: string
  home1: string | null
  home2: string | null
  sort_order: number
}

export const AREA_LABEL: Record<string, string> = { reading: 'Reading', phonics: 'Phonics', writing: 'Writing', speaking: 'Speaking & Listening', language: 'Language', behavior: 'Behavior' }
export const TIER_LABEL: Record<Tier, string> = { strong: 'strong', 'on track': 'on track', 'needs support': 'working on it', 'change over time': 'change over time' }

let cache: Phrase[] | null = null
let cacheError: string | null = null

export async function loadPhraseBank(): Promise<{ rows: Phrase[]; error: string | null }> {
  if (cache) return { rows: cache, error: null }
  if (cacheError) return { rows: [], error: cacheError }
  const { data, error } = await supabase.from('comment_phrases').select('*').eq('is_active', true).order('sort_order', { ascending: true })
  if (error) {
    cacheError = error.code === '42P01' || /comment_phrases/.test(error.message || '') ? 'The phrase bank is not set up yet: run supabase/migration-comment-phrases.sql, then seed-comment-phrases.sql.' : error.message
    return { rows: [], error: cacheError }
  }
  cache = (data || []) as Phrase[]
  return { rows: cache, error: null }
}

/** The rows that fit this document and grade band. */
export function usablePhrases(rows: Phrase[], doc: 'report_card' | 'progress_report', gradeBand: '1-2' | '3-5'): Phrase[] {
  return rows.filter(p => (p.doc === 'both' || (doc === 'report_card' ? p.doc === 'end' : p.doc === 'mid')) && (p.grades === 'all' || p.grades === gradeBand))
}
