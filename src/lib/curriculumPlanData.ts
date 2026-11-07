import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import type { CurriculumUnit, Strand } from '@/lib/curriculumCore'
import { masterRows, planSignature, teacherRows, type CurriculumBlock, type CurriculumPacing, type Half, type RowPatch } from '@/lib/curriculumPacing'

// ─── Teachers' own plans: the writes ─────────────────────────────
// A teacher's first change to a placement copies the master's rows for
// them; every change after that edits their rows. Admin's review queue
// can mark a plan seen, leave a comment, put it back to the master, or
// make it the master. Errors come back as a message (null when it worked).

const msg = (e: { message?: string } | null | undefined) => e?.message || null
const PATH = '/curriculum'

/** Makes sure the teacher has their own rows for the placement; returns them (fresh from the database when just copied). */
export async function ensureOwnPlan(pacing: CurriculumPacing[], placementId: string, teacherId: string): Promise<{ rows: CurriculumPacing[]; error: string | null }> {
  const mine = teacherRows(pacing, placementId, teacherId)
  if (mine.length) return { rows: mine, error: null }
  const master = masterRows(pacing, placementId)
  if (!master.length) return { rows: [], error: 'Nothing to copy: the master has no units here.' }
  const rows = master.map(r => ({ placement_id: placementId, unit_id: r.unit_id, sort_order: r.sort_order, weeks: r.weeks, gap_before: r.gap_before || 0, fixed: !!r.fixed, owner: 'teacher', teacher_id: teacherId }))
  const { data, error } = await supabase.from('curriculum_pacing').insert(rows).select('*')
  if (error) return { rows: [], error: error.message }
  logActivity('created', 'Own plan started from the master', { key: placementId, path: PATH })
  return { rows: ((data || []) as any[]).map(x => ({ ...x, weeks: Number(x.weeks), gap_before: Number(x.gap_before || 0), fixed: !!x.fixed, done_at: x.done_at || null })) as CurriculumPacing[], error: null }
}

/** Applies weeks and gap patches to the teacher's rows. */
export async function patchOwnRows(patches: RowPatch[], label: string): Promise<string | null> {
  for (const p of patches) {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (p.weeks !== undefined) patch.weeks = Math.max(0.5, Math.round(p.weeks * 2) / 2)
    if (p.gap_before !== undefined) patch.gap_before = Math.max(0, Math.round(p.gap_before * 2) / 2)
    if (p.fixed !== undefined) patch.fixed = p.fixed
    const { error } = await supabase.from('curriculum_pacing').update(patch).eq('id', p.id)
    if (error) return error.message
  }
  if (patches.length) logActivity('edited', `Own plan: ${label}`, { key: label, path: PATH })
  return null
}

/** Ticks a story done (or not) on the teacher's row. */
export async function setOwnDone(rowId: string, done: boolean, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_pacing').update({ done_at: done ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', rowId)
  if (!error) logActivity('saved', `${done ? 'Done' : 'Not done'}: ${label}`, { key: rowId, path: PATH })
  return msg(error)
}

export async function dropOwnUnit(rowId: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_pacing').delete().eq('id', rowId)
  if (!error) logActivity('edited', `Own plan: dropped ${label}`, { path: PATH })
  return msg(error)
}

export async function addOwnUnit(placementId: string, teacherId: string, unit: CurriculumUnit, after: number, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_pacing').insert({ placement_id: placementId, unit_id: unit.id, sort_order: after + 1, weeks: unit.default_weeks || 2, gap_before: 0, owner: 'teacher', teacher_id: teacherId })
  if (!error) logActivity('edited', `Own plan: added ${label}`, { path: PATH })
  return msg(error)
}

/** Moves one of the teacher's rows up or down, renumbering so no two share an order. */
export async function moveOwnRow(rows: CurriculumPacing[], id: string, dir: -1 | 1): Promise<string | null> {
  const sorted = [...rows].sort((a, b) => a.sort_order - b.sort_order)
  const i = sorted.findIndex(r => r.id === id), j = i + dir
  if (i < 0 || j < 0 || j >= sorted.length) return null
  const next = sorted.map((r, k) => ({ id: r.id, sort_order: k + 1 }))
  const t = next[i].sort_order; next[i].sort_order = next[j].sort_order; next[j].sort_order = t
  for (const r of next) { const { error } = await supabase.from('curriculum_pacing').update({ sort_order: r.sort_order }).eq('id', r.id); if (error) return error.message }
  return null
}

/** Records a "we're here" pin after the plan has been re-flowed to it. */
export async function setHere(placementId: string, teacherId: string, unitId: string | null, week: number, note: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_here').insert({ placement_id: placementId, teacher_id: teacherId, unit_id: unitId, week, note })
  if (!error) logActivity('saved', `We're here: ${label} at week ${week}`, { key: placementId, path: PATH })
  return msg(error)
}

/** Deletes the teacher's rows and pins for a placement; the master applies again. */
export async function revertToMaster(placementId: string, teacherId: string, label: string, by: 'teacher' | 'admin'): Promise<string | null> {
  const r1 = await supabase.from('curriculum_pacing').delete().eq('placement_id', placementId).eq('owner', 'teacher').eq('teacher_id', teacherId)
  if (r1.error) return r1.error.message
  await supabase.from('curriculum_here').delete().eq('placement_id', placementId).eq('teacher_id', teacherId)
  await supabase.from('curriculum_plan_reviews').delete().eq('placement_id', placementId).eq('teacher_id', teacherId)
  logActivity('edited', `${by === 'admin' ? 'Reverted' : 'Went back'} to the master: ${label}`, { path: PATH })
  return null
}

/** Makes a teacher's plan the master: the master's rows take the teacher's order, weeks and gaps, and the teacher's copy goes. */
export async function adoptAsMaster(pacing: CurriculumPacing[], placementId: string, teacherId: string, label: string): Promise<string | null> {
  const mine = teacherRows(pacing, placementId, teacherId)
  if (!mine.length) return 'This teacher has no plan of their own here.'
  const r0 = await supabase.from('curriculum_pacing').delete().eq('placement_id', placementId).eq('owner', 'master')
  if (r0.error) return r0.error.message
  const rows = mine.map(r => ({ placement_id: placementId, unit_id: r.unit_id, sort_order: r.sort_order, weeks: r.weeks, gap_before: r.gap_before || 0, fixed: !!r.fixed, owner: 'master' }))
  const r1 = await supabase.from('curriculum_pacing').insert(rows)
  if (r1.error) return r1.error.message
  await supabase.from('curriculum_pacing').delete().eq('placement_id', placementId).eq('owner', 'teacher').eq('teacher_id', teacherId)
  await supabase.from('curriculum_plan_reviews').delete().eq('placement_id', placementId).eq('teacher_id', teacherId)
  logActivity('edited', `Adopted as the master: ${label}`, { path: PATH })
  return null
}

/** Admin marks a plan seen as it is now, with a comment the teacher sees. */
export async function reviewPlan(pacing: CurriculumPacing[], placementId: string, teacherId: string, adminId: string, comment: string, label: string): Promise<string | null> {
  const signature = planSignature(teacherRows(pacing, placementId, teacherId))
  const { error } = await supabase.from('curriculum_plan_reviews').upsert({ placement_id: placementId, teacher_id: teacherId, signature, comment: comment.trim(), seen_by: adminId, seen_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: 'placement_id,teacher_id' })
  if (!error) logActivity('saved', `Reviewed plan: ${label}${comment.trim() ? ' (with a comment)' : ''}`, { key: placementId, path: PATH })
  return msg(error)
}

// ─── Blank blocks ────────────────────────────────────────────────

export interface BlockDraft { title: string; strand: Strand; skill_tags: string[]; start_week: number; weeks: number; notes: string }

export async function saveBlock(id: string | null, where: { teacher_id: string; english_class: string; grade: number; academic_year: string; term: Half }, d: BlockDraft): Promise<string | null> {
  const row = { ...where, title: d.title.trim(), strand: d.strand, skill_tags: d.skill_tags, start_week: Math.max(1, Math.round(d.start_week * 2) / 2), weeks: Math.max(0.5, Math.round(d.weeks * 2) / 2), notes: d.notes.trim(), updated_at: new Date().toISOString() }
  if (!row.title) return 'Give the block a name'
  if (id) {
    const { error } = await supabase.from('curriculum_blocks').update(row).eq('id', id)
    if (!error) logActivity('edited', `Block: ${row.title}`, { key: id, path: PATH })
    return msg(error)
  }
  const { error } = await supabase.from('curriculum_blocks').insert(row)
  if (!error) logActivity('created', `Block: ${row.title}`, { path: PATH })
  return msg(error)
}

export async function deleteBlock(b: CurriculumBlock): Promise<string | null> {
  const { error } = await supabase.from('curriculum_blocks').delete().eq('id', b.id)
  if (!error) logActivity('deleted', `Block: ${b.title}`, { path: PATH })
  return msg(error)
}
