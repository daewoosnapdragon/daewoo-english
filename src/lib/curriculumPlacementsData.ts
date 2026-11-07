import { supabase } from '@/lib/supabase'
import { pacingPatchesJson, tryRpc } from '@/lib/curriculumRpc'
import { fetchAll } from '@/lib/fetchAll'
import { logActivity } from '@/lib/activity'
import type { CurriculumUnit } from '@/lib/curriculumCore'
import type { CurriculumBlock, CurriculumHere, CurriculumPacing, CurriculumPlacement, CurriculumPlanReview, Term } from '@/lib/curriculumPacing'

// ─── Placements and pacing: the reads and writes ─────────────────
// A placement is created with a pacing row for every unit of its book, in
// the book's order, each with the unit's default weeks. Admin then changes
// weeks, reorders, drops a unit the class will not do, or puts one back.
// Errors come back as a message (null when it worked).

const msg = (e: { message?: string } | null | undefined) => e?.message || null
const PATH = '/curriculum'

export async function fetchPlacements(): Promise<{ placements: CurriculumPlacement[]; pacing: CurriculumPacing[]; blocks: CurriculumBlock[]; here: CurriculumHere[]; reviews: CurriculumPlanReview[]; error: string | null; plansError: string | null }> {
  // Paged: pacing passes Supabase's 1000-row cap within a year (see fetchAll.ts).
  const [p, c, b, h, r] = await Promise.all([
    fetchAll<any>((f, t) => supabase.from('curriculum_placements').select('*').order('created_at').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_pacing').select('*').order('sort_order').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_blocks').select('*').order('start_week').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_here').select('*').order('set_at', { ascending: false }).order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_plan_reviews').select('*').order('id').range(f, t)),
  ])
  return {
    placements: (p.data || []) as CurriculumPlacement[],
    pacing: ((c.data || []) as any[]).map(x => ({ ...x, weeks: Number(x.weeks), gap_before: Number(x.gap_before || 0), teacher_id: x.teacher_id || null, owner: x.owner || 'master', fixed: !!x.fixed, done_at: x.done_at || null })) as CurriculumPacing[],
    blocks: ((b.data || []) as any[]).map(x => ({ ...x, start_week: Number(x.start_week), weeks: Number(x.weeks), skill_tags: x.skill_tags || [] })) as CurriculumBlock[],
    here: ((h.data || []) as any[]).map(x => ({ ...x, week: Number(x.week) })) as CurriculumHere[],
    reviews: (r.data || []) as CurriculumPlanReview[],
    error: p.error?.message || c.error?.message || null,
    plansError: b.error?.message || h.error?.message || r.error?.message || null,
  }
}

export interface PlacementDraft { book_id: string; english_class: string; grade: number; academic_year: string; term: Term }

/** Places a book with the given units (every unit of a sequence book, the chosen stories of an anthology), each with the unit's default weeks. */
export async function createPlacement(d: PlacementDraft, units: CurriculumUnit[], teacherId: string, label: string): Promise<{ id: string | null; error: string | null }> {
  // In one transaction when the database has the function: never a placement without its units.
  const rowsJson = [...units].sort((a, b) => a.sort_order - b.sort_order).map((u, i) => ({ unit_id: u.id, sort_order: i + 1, weeks: u.default_weeks || 2 }))
  const r = await tryRpc<string>('curriculum_create_placement', { p_book: d.book_id, p_class: d.english_class, p_grade: d.grade, p_year: d.academic_year, p_term: d.term, p_by: teacherId, p_rows: rowsJson })
  if (!r.missing) {
    if (r.error) return { id: null, error: /duplicate|unique/i.test(r.error) ? 'That book is already placed here for this term.' : r.error }
    logActivity('created', `Placed ${label} in ${d.english_class} G${d.grade}, ${d.term} ${d.academic_year}`, { path: PATH })
    return { id: r.data, error: null }
  }
  const { data, error } = await supabase.from('curriculum_placements').insert({ ...d, is_master: true, created_by: teacherId }).select('id').single()
  if (error) return { id: null, error: /duplicate|unique/i.test(error.message) ? 'That book is already placed here for this term.' : error.message }
  const rows = [...units].sort((a, b) => a.sort_order - b.sort_order).map((u, i) => ({ placement_id: data.id, unit_id: u.id, sort_order: i + 1, weeks: u.default_weeks || 2, owner: 'master' }))
  if (rows.length) {
    const { error: e } = await supabase.from('curriculum_pacing').insert(rows)
    if (e) return { id: data.id, error: e.message }
  }
  logActivity('created', `Placed ${label} in ${d.english_class} G${d.grade}, ${d.term} ${d.academic_year}`, { path: PATH })
  return { id: data.id, error: null }
}

export async function updatePlacementTerm(id: string, term: Term, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_placements').update({ term, updated_at: new Date().toISOString() }).eq('id', id)
  if (!error) logActivity('edited', `Placement: ${label} now ${term}`, { key: id, path: PATH })
  return msg(error)
}

export async function deletePlacement(id: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_placements').delete().eq('id', id)
  if (!error) logActivity('deleted', `Placement: ${label}`, { path: PATH })
  return msg(error)
}

export async function setPacingWeeks(id: string, weeks: number, label: string, fixed?: boolean): Promise<string | null> {
  const w = Math.max(0.5, Math.round((Number(weeks) || 0) * 2) / 2)
  const patch: Record<string, unknown> = { weeks: w, updated_at: new Date().toISOString() }
  if (fixed !== undefined) patch.fixed = fixed
  const { error } = await supabase.from('curriculum_pacing').update(patch).eq('id', id)
  if (!error) logActivity('edited', `Pacing: ${label} · ${w} wk`, { key: id, path: PATH })
  return msg(error)
}

/** Moves one pacing row up or down among the placement's rows. */
export async function movePacing(rows: CurriculumPacing[], id: string, dir: -1 | 1): Promise<string | null> {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const i = sorted.findIndex(r => r.id === id), j = i + dir
  if (i < 0 || j < 0 || j >= sorted.length) return null
  // Renumber everything so two rows never share an order.
  const next = sorted.map((r, k) => ({ id: r.id, sort_order: k + 1 }))
  const t = next[i].sort_order; next[i].sort_order = next[j].sort_order; next[j].sort_order = t
  const ids = [...next].sort((a, b) => a.sort_order - b.sort_order).map(r => r.id)
  const rpc = await tryRpc('curriculum_set_order', { p_table: 'curriculum_pacing', p_ids: ids })
  if (!rpc.missing) return rpc.error
  for (const r of next) {
    const { error } = await supabase.from('curriculum_pacing').update({ sort_order: r.sort_order }).eq('id', r.id)
    if (error) return error.message
  }
  return null
}

/** Drops a unit from the pacing: the class will not do it. The unit stays in the catalogue. */
export async function dropPacing(id: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_pacing').delete().eq('id', id)
  if (!error) logActivity('edited', `Pacing: dropped ${label}`, { path: PATH })
  return msg(error)
}

/** Puts a unit (back) into the pacing at the end. */
export async function addPacing(placementId: string, unit: CurriculumUnit, after: number, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_pacing').insert({ placement_id: placementId, unit_id: unit.id, sort_order: after + 1, weeks: unit.default_weeks || 2, owner: 'master' })
  if (!error) logActivity('edited', `Pacing: added ${label}`, { path: PATH })
  return msg(error)
}

/** Adds several units to the master at the end, in the order given, skipping any already there. */
export async function addPacingMany(placementId: string, units: CurriculumUnit[], existing: { unit_id: string; sort_order: number }[], label: string): Promise<string | null> {
  let order = existing.reduce((m, r) => Math.max(m, r.sort_order), 0)
  const have = new Set(existing.map(r => r.unit_id))
  const rows = units.filter(u => !have.has(u.id)).map(u => ({ placement_id: placementId, unit_id: u.id, sort_order: ++order, weeks: u.default_weeks || 2, gap_before: 0, owner: 'master' }))
  if (!rows.length) return null
  const { error } = await supabase.from('curriculum_pacing').insert(rows)
  if (!error) logActivity('edited', `Pacing: added ${rows.length} to ${label}`, { path: PATH })
  return msg(error)
}

/** Turns a fixed story length off, so it shares the term with the others again. */
export async function clearPacingFixed(id: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_pacing').update({ fixed: false, updated_at: new Date().toISOString() }).eq('id', id)
  if (!error) logActivity('edited', `Pacing: ${label} shares the term again`, { key: id, path: PATH })
  return msg(error)
}

/** Writes several weeks patches to master rows. */
export async function patchMasterRows(patches: { id: string; weeks?: number; gap_before?: number }[], label: string): Promise<string | null> {
  if (!patches.length) return null
  const rpc = await tryRpc('curriculum_patch_pacing', { p_patches: pacingPatchesJson(patches) })
  if (!rpc.missing) { if (!rpc.error) logActivity('edited', `Pacing: ${label}`, { key: label, path: PATH }); return rpc.error }
  for (const pch of patches) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (pch.weeks !== undefined) patch.weeks = Math.max(0.5, Math.round(pch.weeks * 2) / 2)
    if (pch.gap_before !== undefined) patch.gap_before = Math.max(0, Math.round(pch.gap_before * 2) / 2)
    const { error } = await supabase.from('curriculum_pacing').update(patch).eq('id', pch.id)
    if (error) return error.message
  }
  if (patches.length) logActivity('edited', `Pacing: ${label}`, { key: label, path: PATH })
  return null
}

/** Copies a class and grade's placements and pacing to another grade, class or year, skipping any already there. */
export async function copyPlacements(from: { english_class: string; grade: number; academic_year: string }, to: { english_class: string; grade: number; academic_year: string }, placements: CurriculumPlacement[], pacing: CurriculumPacing[], teacherId: string): Promise<{ copied: number; error: string | null }> {
  const src = placements.filter(p => p.english_class === from.english_class && p.grade === from.grade && p.academic_year === from.academic_year && p.is_master)
  const existing = placements.filter(p => p.english_class === to.english_class && p.grade === to.grade && p.academic_year === to.academic_year && p.is_master)
  let copied = 0
  for (const p of src) {
    if (existing.some(e => e.book_id === p.book_id && e.term === p.term)) continue
    // Each copy in one transaction when the database has the function: a placement always comes with its rows.
    const rowsJson = pacing.filter(r => r.placement_id === p.id && r.owner === 'master').map(r => ({ unit_id: r.unit_id, sort_order: r.sort_order, weeks: r.weeks, gap_before: r.gap_before || 0, fixed: !!r.fixed }))
    const rpc = await tryRpc('curriculum_create_placement', { p_book: p.book_id, p_class: to.english_class, p_grade: to.grade, p_year: to.academic_year, p_term: p.term, p_by: teacherId, p_rows: rowsJson })
    if (!rpc.missing) { if (rpc.error) return { copied, error: rpc.error }; copied += 1; continue }
    const { data, error } = await supabase.from('curriculum_placements').insert({ book_id: p.book_id, english_class: to.english_class, grade: to.grade, academic_year: to.academic_year, term: p.term, is_master: true, created_by: teacherId }).select('id').single()
    if (error) return { copied, error: error.message }
    const rows = pacing.filter(r => r.placement_id === p.id && r.owner === 'master').map(r => ({ placement_id: data.id, unit_id: r.unit_id, sort_order: r.sort_order, weeks: r.weeks, gap_before: r.gap_before || 0, fixed: !!r.fixed, owner: 'master' }))
    if (rows.length) { const { error: e } = await supabase.from('curriculum_pacing').insert(rows); if (e) return { copied, error: e.message } }
    copied += 1
  }
  if (copied) logActivity('created', `Copied ${copied} placements from ${from.english_class} G${from.grade} ${from.academic_year} to ${to.english_class} G${to.grade} ${to.academic_year}`, { path: PATH })
  return { copied, error: null }
}
