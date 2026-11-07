import { supabase } from '@/lib/supabase'
import { tryRpc } from '@/lib/curriculumRpc'
import { fetchAll } from '@/lib/fetchAll'
import { logActivity } from '@/lib/activity'
import { normalizeStatus, normalizeTag, type BookStatus, type CurriculumBook, type CurriculumLesson, type CurriculumResource, type CurriculumSeries, type CurriculumSkill, type CurriculumUnit, type ParsedUnit, type ResourceKind, type Strand } from '@/lib/curriculumCore'

// ─── Curriculum catalogue: the reads and writes ──────────────────
// Every change goes through here so the activity log gets a line. Errors
// come back as a message (null when it worked); the page shows them as
// toasts. Skill tags that the vocabulary does not know yet are added to
// curriculum_skills as they are saved, so the list grows from use.

const msg = (e: { message?: string } | null | undefined) => e?.message || null
const PATH = '/curriculum'

export interface Catalogue { series: CurriculumSeries[]; books: CurriculumBook[]; units: CurriculumUnit[]; lessons: CurriculumLesson[]; resources: CurriculumResource[]; skills: CurriculumSkill[] }

export async function fetchCatalogue(): Promise<{ data: Catalogue; error: string | null }> {
  // Paged: the lessons alone are past Supabase's 1000-row cap (see fetchAll.ts).
  const [s, b, u, l, r, k] = await Promise.all([
    fetchAll<any>((f, t) => supabase.from('curriculum_series').select('*').order('sort_order').order('name').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_books').select('*').order('level_number').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_units').select('*').order('sort_order').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_lessons').select('*').order('sort_order').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_resources').select('*').order('created_at').order('id').range(f, t)),
    fetchAll<any>((f, t) => supabase.from('curriculum_skills').select('*').order('strand').order('sort_order').order('label').order('code').range(f, t)),
  ])
  const error = s.error?.message || b.error?.message || u.error?.message || l.error?.message || r.error?.message || k.error?.message || null
  return {
    data: {
      series: ((s.data || []) as any[]).map(x => ({ ...x, kind: x.kind === 'anthology' ? 'anthology' : 'sequence' })) as CurriculumSeries[],
      books: ((b.data || []) as any[]).map(x => ({ ...x, status: normalizeStatus(x.status) })) as CurriculumBook[],
      units: ((u.data || []) as any[]).map(x => ({ ...x, default_weeks: Number(x.default_weeks), skill_tags: x.skill_tags || [], ccss_codes: x.ccss_codes || [] })) as CurriculumUnit[],
      lessons: ((l.data || []) as any[]).map(x => ({ ...x, skill_tags: x.skill_tags || [], ccss_codes: x.ccss_codes || [] })) as CurriculumLesson[],
      resources: ((r.data || []) as any[]).map(x => ({ ...x, copies_hint: x.copies_hint === null || x.copies_hint === undefined ? null : Number(x.copies_hint) })) as CurriculumResource[],
      skills: (k.data || []) as CurriculumSkill[],
    },
    error,
  }
}

// ─── What a delete would take with it ────────────────────────────
// Deleting a series, book or unit cascades in the database into every
// class's placements, pacing, pins and taught history. So before any of
// those, the app asks what uses it, and refuses while a class plan does:
// take the book out of those classes on Planning → Books by class first, or
// retire it, which keeps everything.

export interface Usage { placements: { english_class: string; grade: number; academic_year: string }[]; pacing: number }

/** The placements of these books, and the pacing rows (master and teachers') that use these units. */
export async function usageOf(bookIds: string[], unitIds: string[]): Promise<{ usage: Usage; error: string | null }> {
  const usage: Usage = { placements: [], pacing: 0 }
  if (bookIds.length) {
    const { data, error } = await fetchAll<any>((f, t) => supabase.from('curriculum_placements').select('english_class, grade, academic_year').in('book_id', bookIds).order('id').range(f, t))
    if (error) return { usage, error: error.message }
    usage.placements = data
  }
  if (unitIds.length) {
    // In slices, so the id list stays well inside a URL.
    for (let i = 0; i < unitIds.length; i += 150) {
      const { count, error } = await supabase.from('curriculum_pacing').select('id', { count: 'exact', head: true }).in('unit_id', unitIds.slice(i, i + 150))
      if (error) return { usage, error: error.message }
      usage.pacing += count || 0
    }
  }
  return { usage, error: null }
}

/** The refusal to show when something is in use, or null when it is free to go. */
export function inUseMessage(what: string, u: Usage): string | null {
  if (u.placements.length) {
    const names = Array.from(new Set(u.placements.map(p => `${p.english_class} G${p.grade}${p.academic_year ? ` (${p.academic_year})` : ''}`)))
    const list = names.length > 6 ? `${names.slice(0, 6).join(', ')} and ${names.length - 6} more` : names.join(', ')
    return `${what} is placed for ${list}. Deleting it would wipe those class plans and their taught history. Take it out of those classes on Planning → Books by class first, or mark the book Retired instead.`
  }
  if (u.pacing) return `${what} is in ${u.pacing} class ${u.pacing === 1 ? 'plan' : 'plans'}. Deleting it would wipe those weeks and their taught history. Skip it in those plans or take it out of the placements first.`
  return null
}

const unitIdsOfBooks = async (bookIds: string[]) => {
  const { data, error } = await fetchAll<{ id: string }>((f, t) => supabase.from('curriculum_units').select('id').in('book_id', bookIds).order('id').range(f, t))
  return { ids: data.map(x => x.id), error: error?.message || null }
}

// ─── Series and books ────────────────────────────────────────────

export interface SeriesDraft { name: string; publisher: string; strand: Strand; color: string; kind?: 'sequence' | 'anthology' }
export async function saveSeries(id: string | null, d: SeriesDraft): Promise<{ id: string | null; error: string | null }> {
  const row = { name: d.name.trim(), publisher: d.publisher.trim(), strand: d.strand, color: d.color, kind: d.kind || 'sequence' }
  if (!row.name) return { id: null, error: 'Series name required' }
  if (id) {
    const { error } = await supabase.from('curriculum_series').update(row).eq('id', id)
    if (!error) logActivity('edited', `Series: ${row.name}`, { key: id, path: PATH })
    return { id, error: msg(error) }
  }
  const { data, error } = await supabase.from('curriculum_series').insert(row).select('id').single()
  if (error) return { id: null, error: error.message }
  logActivity('created', `Series: ${row.name}`, { path: PATH })
  return { id: data.id, error: null }
}

export async function deleteSeries(id: string, name: string): Promise<string | null> {
  const books = await supabase.from('curriculum_books').select('id').eq('series_id', id)
  if (books.error) return books.error.message
  const bookIds = (books.data || []).map((b: any) => b.id as string)
  const units = await unitIdsOfBooks(bookIds)
  if (units.error) return units.error
  const u = await usageOf(bookIds, units.ids)
  if (u.error) return u.error
  const refuse = inUseMessage(name, u.usage)
  if (refuse) return refuse
  const { error } = await supabase.from('curriculum_series').delete().eq('id', id)
  if (!error) logActivity('deleted', `Series: ${name}`, { path: PATH })
  return msg(error)
}

export interface BookDraft { series_id: string; level_number: string; title: string; status: BookStatus; drive_folder_url: string; notes: string }
export async function saveBook(id: string | null, d: BookDraft, label: string): Promise<{ id: string | null; error: string | null }> {
  const row = { series_id: d.series_id, level_number: d.level_number.trim(), title: d.title.trim(), status: d.status, drive_folder_url: d.drive_folder_url.trim(), notes: d.notes.trim(), updated_at: new Date().toISOString() }
  if (!row.series_id) return { id: null, error: 'Pick a series' }
  if (id) {
    const { error } = await supabase.from('curriculum_books').update(row).eq('id', id)
    if (!error) logActivity('edited', `Book: ${label}`, { key: id, path: PATH })
    return { id, error: msg(error) }
  }
  const { data, error } = await supabase.from('curriculum_books').insert(row).select('id').single()
  if (error) return { id: null, error: error.message }
  logActivity('created', `Book: ${label}`, { path: PATH })
  return { id: data.id, error: null }
}

export async function deleteBook(id: string, label: string): Promise<string | null> {
  const units = await unitIdsOfBooks([id])
  if (units.error) return units.error
  const u = await usageOf([id], units.ids)
  if (u.error) return u.error
  const refuse = inUseMessage(label, u.usage)
  if (refuse) return refuse
  const { error } = await supabase.from('curriculum_books').delete().eq('id', id)
  if (!error) logActivity('deleted', `Book: ${label}`, { path: PATH })
  return msg(error)
}

// ─── Skills ──────────────────────────────────────────────────────

/** Adds any tag the vocabulary does not have yet, under the given strand. */
export async function ensureSkills(tags: string[], known: CurriculumSkill[], strand: Strand): Promise<string | null> {
  const have = new Set(known.map(k => k.code))
  const fresh = Array.from(new Set(tags.map(normalizeTag))).filter(t => t && !have.has(t))
  if (!fresh.length) return null
  const base = known.filter(k => k.strand === strand).reduce((m, k) => Math.max(m, k.sort_order), 0)
  const rows = fresh.map((code, i) => ({ code, label: code.charAt(0).toUpperCase() + code.slice(1), strand, sort_order: base + 10 + i }))
  const { error } = await supabase.from('curriculum_skills').upsert(rows, { onConflict: 'code', ignoreDuplicates: true })
  return msg(error)
}

export async function saveSkill(code: string, d: { label: string; strand: Strand }): Promise<string | null> {
  const { error } = await supabase.from('curriculum_skills').update({ label: d.label.trim() || code, strand: d.strand }).eq('code', code)
  if (!error) logActivity('edited', `Skill tag: ${code}`, { key: code, path: PATH })
  return msg(error)
}

export async function deleteSkill(code: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_skills').delete().eq('code', code)
  if (!error) logActivity('deleted', `Skill tag: ${code}`, { path: PATH })
  return msg(error)
}

// ─── Units and lessons ───────────────────────────────────────────

/**
 * Saves a pasted draft as suggested (unconfirmed) units and lessons at the
 * end of the book. `replace` first removes the book's existing units, for
 * re-drafting a book that had nothing confirmed yet.
 */
export async function appendDraft(bookId: string, units: ParsedUnit[], opts: { replace: boolean; after: number; label: string; strand: Strand; known: CurriculumSkill[] }): Promise<string | null> {
  if (opts.replace) {
    // Replacing deletes every unit, which would wipe any class plan built on them.
    const units = await unitIdsOfBooks([bookId])
    if (units.error) return units.error
    const u = await usageOf([bookId], units.ids)
    if (u.error) return u.error
    const refuse = inUseMessage(opts.label, u.usage)
    if (refuse) return `${refuse} To change units a class already uses, edit them one by one, or add the new ones without replacing.`
    const { error } = await supabase.from('curriculum_units').delete().eq('book_id', bookId)
    if (error) return error.message
  }
  const tags = units.flatMap(u => [...u.skill_tags, ...u.lessons.flatMap(l => l.skill_tags)])
  const e0 = await ensureSkills(tags, opts.known, opts.strand)
  if (e0) return e0
  let order = opts.replace ? 0 : opts.after
  for (const u of units) {
    order += 1
    const { data, error } = await supabase.from('curriculum_units').insert({
      book_id: bookId, sort_order: order, title: u.title, summary: u.summary, skill_tags: u.skill_tags, ccss_codes: u.ccss_codes, default_weeks: u.default_weeks, source: 'claude',
    }).select('id').single()
    if (error) return error.message
    if (u.lessons.length) {
      const rows = u.lessons.map((l, i) => ({ unit_id: data.id, sort_order: i + 1, title: l.title, objective: l.objective, notes: l.notes, ccss_codes: l.ccss_codes, skill_tags: l.skill_tags, source: 'claude' }))
      const { error: e } = await supabase.from('curriculum_lessons').insert(rows)
      if (e) return e.message
    }
  }
  const n = units.reduce((a, u) => a + u.lessons.length, 0)
  logActivity('created', `Draft for ${opts.label}: ${units.length} units, ${n} lessons`, { path: PATH })
  return null
}

export interface UnitDraft { title: string; summary: string; default_weeks: number; skill_tags: string[]; ccss_codes: string[]; drive_folder_url: string }
export async function saveUnit(id: string | null, bookId: string, d: UnitDraft, opts: { after: number; label: string; strand: Strand; known: CurriculumSkill[] }): Promise<{ id: string | null; error: string | null }> {
  const row = { title: d.title.trim(), summary: d.summary.trim(), default_weeks: Number(d.default_weeks) || 1, skill_tags: d.skill_tags.map(normalizeTag).filter(Boolean), ccss_codes: d.ccss_codes, drive_folder_url: d.drive_folder_url.trim(), updated_at: new Date().toISOString() }
  if (!row.title) return { id: null, error: 'Unit title required' }
  const e0 = await ensureSkills(row.skill_tags, opts.known, opts.strand)
  if (e0) return { id: null, error: e0 }
  if (id) {
    const { error } = await supabase.from('curriculum_units').update(row).eq('id', id)
    if (!error) logActivity('edited', `Unit: ${opts.label} · ${row.title}`, { key: id, path: PATH })
    return { id, error: msg(error) }
  }
  const { data, error } = await supabase.from('curriculum_units').insert({ ...row, book_id: bookId, sort_order: opts.after + 1, source: 'teacher' }).select('id').single()
  if (error) return { id: null, error: error.message }
  logActivity('created', `Unit: ${opts.label} · ${row.title}`, { path: PATH })
  return { id: data.id, error: null }
}

export async function deleteUnit(id: string, label: string): Promise<string | null> {
  const u = await usageOf([], [id])
  if (u.error) return u.error
  const refuse = inUseMessage(label, u.usage)
  if (refuse) return refuse
  const { error } = await supabase.from('curriculum_units').delete().eq('id', id)
  if (!error) logActivity('deleted', `Unit: ${label}`, { path: PATH })
  return msg(error)
}

export interface LessonDraft { title: string; objective: string; notes: string; ccss_codes: string[]; skill_tags: string[] }
export async function saveLesson(id: string | null, unitId: string, d: LessonDraft, opts: { after: number; label: string; strand: Strand; known: CurriculumSkill[] }): Promise<{ id: string | null; error: string | null }> {
  const row = { title: d.title.trim(), objective: d.objective.trim(), notes: d.notes.trim(), ccss_codes: d.ccss_codes, skill_tags: d.skill_tags.map(normalizeTag).filter(Boolean), updated_at: new Date().toISOString() }
  if (!row.title) return { id: null, error: 'Lesson title required' }
  const e0 = await ensureSkills(row.skill_tags, opts.known, opts.strand)
  if (e0) return { id: null, error: e0 }
  if (id) {
    const { error } = await supabase.from('curriculum_lessons').update(row).eq('id', id)
    if (!error) logActivity('edited', `Lesson: ${opts.label} · ${row.title}`, { key: id, path: PATH })
    return { id, error: msg(error) }
  }
  const { data, error } = await supabase.from('curriculum_lessons').insert({ ...row, unit_id: unitId, sort_order: opts.after + 1, source: 'teacher' }).select('id').single()
  if (error) return { id: null, error: error.message }
  logActivity('created', `Lesson: ${opts.label} · ${row.title}`, { path: PATH })
  return { id: data.id, error: null }
}

export async function deleteLesson(id: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_lessons').delete().eq('id', id)
  if (!error) logActivity('deleted', `Lesson: ${label}`, { path: PATH })
  return msg(error)
}

/** Marks units or lessons confirmed (or takes it back) by the signed-in teacher. */
export async function setConfirmed(table: 'curriculum_units' | 'curriculum_lessons', ids: string[], teacherId: string, confirmed: boolean, label: string): Promise<string | null> {
  if (!ids.length) return null
  const patch = confirmed ? { confirmed_by: teacherId, confirmed_at: new Date().toISOString() } : { confirmed_by: null, confirmed_at: null }
  const { error } = await supabase.from(table).update(patch).in('id', ids)
  if (!error) logActivity('saved', `${confirmed ? 'Confirmed' : 'Unconfirmed'} ${ids.length} ${table === 'curriculum_units' ? 'units' : 'lessons'}: ${label}`, { key: `${table}|${label}`, path: PATH })
  return msg(error)
}

/** Moves a unit or lesson one step up or down among its siblings. */
export async function reorder(table: 'curriculum_units' | 'curriculum_lessons', siblings: { id: string; sort_order: number }[], id: string, dir: -1 | 1): Promise<string | null> {
  const sorted = [...siblings].sort((a, b) => a.sort_order - b.sort_order)
  const i = sorted.findIndex(s => s.id === id)
  const j = i + dir
  if (i < 0 || j < 0 || j >= sorted.length) return null
  const a = sorted[i], b = sorted[j]
  // Renumber the whole list in one call when the database has the function, so no two share a position.
  const ids = sorted.map(x => x.id); ids[i] = b.id; ids[j] = a.id
  const rpc = await tryRpc('curriculum_set_order', { p_table: table, p_ids: ids })
  if (!rpc.missing) return rpc.error
  const r1 = await supabase.from(table).update({ sort_order: b.sort_order }).eq('id', a.id)
  if (r1.error) return r1.error.message
  const r2 = await supabase.from(table).update({ sort_order: a.sort_order }).eq('id', b.id)
  return msg(r2.error)
}

// ─── Resources ───────────────────────────────────────────────────

export interface ResourceDraft { name: string; kind: ResourceKind; url: string; copies_hint: number | null }
export async function addResource(target: { unit_id?: string; lesson_id?: string }, d: ResourceDraft, teacherId: string, label: string): Promise<string | null> {
  const row = { unit_id: target.unit_id || null, lesson_id: target.lesson_id || null, name: d.name.trim(), kind: d.kind, url: d.url.trim(), copies_hint: d.copies_hint, added_by: teacherId }
  if (!row.name) return 'Resource name required'
  const { error } = await supabase.from('curriculum_resources').insert(row)
  if (!error) logActivity('created', `Resource: ${label} · ${row.name}`, { path: PATH })
  return msg(error)
}

export async function deleteResource(id: string, label: string): Promise<string | null> {
  const { error } = await supabase.from('curriculum_resources').delete().eq('id', id)
  if (!error) logActivity('deleted', `Resource: ${label}`, { path: PATH })
  return msg(error)
}
