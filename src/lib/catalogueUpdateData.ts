import { supabase } from '@/lib/supabase'
import { fetchAll } from '@/lib/fetchAll'
import { tryRpc } from '@/lib/curriculumRpc'
import { logActivity } from '@/lib/activity'
import type { BookPlan, CatalogueEntry, SplitPlan, UpdateDb } from '@/lib/catalogueUpdate'

// Reads and writes for Update the books (BookUpdateView). The swaps run in the
// database functions from supabase/migration-curriculum-book-update.sql, one
// transaction per book; without that migration the page says so.

const PATH = '/curriculum#bookshelf'

/** Everything planBook and planSplit need. `missing` when the migration has not been run. */
export async function loadUpdateDb(): Promise<{ db: UpdateDb | null; missing: boolean; error: string | null }> {
  const [s, b, u, p, pc, r, l] = await Promise.all([
    fetchAll<any>((f, t) => supabase.from('curriculum_series').select('id, name').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_books').select('id, series_id, level_number, catalogue_version, status').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_units').select('id, book_id, title, sort_order').order('book_id').order('sort_order').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_placements').select('id, book_id, english_class, grade, academic_year, term, is_master').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_pacing').select('placement_id, unit_id, owner').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_resources').select('unit_id, lesson_id').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_lessons').select('id, unit_id').order('id').range(f, t)),
  ])
  if (b.error && /catalogue_version/.test(b.error.message)) return { db: null, missing: true, error: null }
  const error = s.error?.message || b.error?.message || u.error?.message || p.error?.message || pc.error?.message || r.error?.message || l.error?.message || null
  if (error) return { db: null, missing: false, error }
  return { db: { series: s.data, books: b.data, units: u.data, placements: p.data, pacing: pc.data, resources: r.data, lessons: l.data }, missing: false, error: null }
}

const nameOf = (e: CatalogueEntry) => `${e.book.series} ${e.book.level}`.trim()

/** Swaps one book's units for the catalogue's, moving classes onto the matches. */
export async function replaceBook(entry: CatalogueEntry, plan: BookPlan): Promise<string | null> {
  const { book } = entry
  const res = await tryRpc<string>('curriculum_replace_book', {
    p_series: { name: book.series, strand: book.strand, color: book.color, kind: book.kind },
    p_level: book.level, p_title: book.title || '', p_version: entry.version,
    p_units: book.units, p_map: plan.pairs, p_absorb: plan.absorbIds,
  })
  if (res.missing) return 'The book update functions are not in the database yet (migration-curriculum-book-update.sql).'
  if (!res.error) logActivity('edited', `Bookshelf: ${nameOf(entry)} updated from ${book.source} (${book.units.length} units${plan.unmatched.length ? `, ${plan.unmatched.length} old units without a match removed` : ''})`, { key: entry.key, path: PATH })
  return res.error
}

/** Moves classes off the old single book onto its level books. */
export async function splitBook(seriesName: string, split: SplitPlan): Promise<string | null> {
  const res = await tryRpc<number>('curriculum_split_book', { p_old_book: split.oldBookId, p_map: split.pairs })
  if (res.missing) return 'The book update functions are not in the database yet (migration-curriculum-book-update.sql).'
  if (!res.error) logActivity('edited', `Bookshelf: ${seriesName} classes moved onto its level books (${split.classes.length} classes)`, { key: `${seriesName}|split`, path: PATH })
  return res.error
}
