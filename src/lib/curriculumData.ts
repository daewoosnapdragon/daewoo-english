import { supabase } from '@/lib/supabase'
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
  const [s, b, u, l, r, k] = await Promise.all([
    supabase.from('curriculum_series').select('*').order('sort_order').order('name'),
    supabase.from('curriculum_books').select('*').order('level_number'),
    supabase.from('curriculum_units').select('*').order('sort_order'),
    supabase.from('curriculum_lessons').select('*').order('sort_order'),
    supabase.from('curriculum_resources').select('*').order('created_at'),
    supabase.from('curriculum_skills').select('*').order('strand').order('sort_order').order('label'),
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
