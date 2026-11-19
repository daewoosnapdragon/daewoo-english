import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { answerStepText, jobsForEvent, newId, parseJob, parseRoutineJob, parseStepLines, type AdminEvent, type AdminJob, type AdminJobHistory, type AdminJobQuestion, type AdminRoutine, type AdminRoutineJob, type JobDraft, type JobStatus, type JobStep } from '@/lib/adminJobs'

// ─── Admin jobs: reading and writing ─────────────────────────────
// Every write also leaves a line in admin_job_history (who did what to the
// job) and, for the things that matter to the rest of the staff, a row in
// the shared activity log. The pages are for the two admin accounts; the
// app gates by account (src/lib/adminAuth.ts).

export const isAdminJobsMissing = (message: string | null | undefined) => !!message && /admin_jobs|admin_routines/.test(message)
const nowIso = () => new Date().toISOString()

type Who = { id: string; name: string } | null | undefined

async function history(job_id: string, action: string, who: Who, extra: { from_id?: string | null; to_id?: string | null; note?: string } = {}) {
  try { await supabase.from('admin_job_history').insert({ job_id, action, by_id: who?.id || null, from_id: extra.from_id ?? null, to_id: extra.to_id ?? null, note: extra.note || '' }) } catch { /* the job itself is saved */ }
}

// ── Jobs ──

export async function fetchJobs(): Promise<{ jobs: AdminJob[]; error: string | null }> {
  const { data, error } = await supabase.from('admin_jobs').select('*').order('due_date', { ascending: true, nullsFirst: false }).order('created_at')
  return { jobs: ((data || []) as any[]).map(parseJob), error: error?.message || null }
}

export async function addJob(d: JobDraft, who: Who): Promise<{ job: AdminJob | null; error: string | null }> {
  const { data, error } = await supabase.from('admin_jobs').insert({ ...d, created_by_id: who?.id || d.created_by_id || null }).select('*').single()
  if (error || !data) return { job: null, error: error?.message || 'Could not add the job' }
  const job = parseJob(data)
  await history(job.id, 'created', who, { to_id: job.owner_id })
  logActivity('created', `Job: ${job.title}`)
  return { job, error: null }
}

/** Save a set of fields. `action` names the history line; 'edited' by default. */
export async function updateJob(job: AdminJob, patch: Partial<AdminJob>, who: Who, action = 'edited', note = ''): Promise<string | null> {
  const { error } = await supabase.from('admin_jobs').update({ ...patch, updated_at: nowIso() }).eq('id', job.id)
  if (error) return error.message
  await history(job.id, action, who, { note })
  return null
}

export async function setStatus(job: AdminJob, status: JobStatus, who: Who, waitingOn = ''): Promise<string | null> {
  const done = status === 'done'
  const patch: Partial<AdminJob> = { status, waiting_on: status === 'waiting' ? waitingOn : '', completed_by_id: done ? who?.id || null : null, completed_at: done ? nowIso() : null }
  const { error } = await supabase.from('admin_jobs').update({ ...patch, updated_at: nowIso() }).eq('id', job.id)
  if (error) return error.message
  if (done) { await history(job.id, 'done', who); logActivity('done', `Job: ${job.title}${job.category ? ` · ${job.category}` : ''}`) }
  else if (job.status === 'done') await history(job.id, 'reopened', who)
  else await history(job.id, 'status', who, { note: status === 'waiting' && waitingOn ? `${status}: ${waitingOn}` : status })
  return null
}

export async function assignJob(job: AdminJob, toId: string | null, who: Who): Promise<string | null> {
  if (toId === job.owner_id) return null
  const { error } = await supabase.from('admin_jobs').update({ owner_id: toId, updated_at: nowIso() }).eq('id', job.id)
  if (error) return error.message
  await history(job.id, job.owner_id ? 'reassigned' : 'assigned', who, { from_id: job.owner_id, to_id: toId })
  return null
}

export async function saveSteps(job: AdminJob, steps: JobStep[], who: Who, note = ''): Promise<string | null> {
  const { error } = await supabase.from('admin_jobs').update({ steps, updated_at: nowIso() }).eq('id', job.id)
  if (error) return error.message
  if (note) await history(job.id, 'step', who, { note })
  return null
}

export async function toggleStep(job: AdminJob, stepId: string, who: Who): Promise<string | null> {
  const steps = job.steps.map(s => s.id === stepId ? { ...s, done: !s.done, done_by_id: !s.done ? who?.id || null : null, done_at: !s.done ? nowIso() : null } : s)
  const s = job.steps.find(x => x.id === stepId)
  return saveSteps(job, steps, who, s ? `${s.done ? 'unticked' : 'ticked'}: ${s.text}` : '')
}

/** One step per line; a pasted numbered list becomes several steps. */
export async function addSteps(job: AdminJob, text: string, who: Who): Promise<string | null> {
  const lines = parseStepLines(text); if (!lines.length) return null
  return saveSteps(job, [...job.steps, ...lines.map(t => ({ id: newId(), text: t, done: false, done_by_id: null, done_at: null, owner_id: null }))], who, lines.length === 1 ? `added: ${lines[0]}` : `added ${lines.length} steps`)
}

/** Give one step to a person, or back to whoever owns the job. */
export async function setStepOwner(job: AdminJob, stepId: string, ownerId: string | null, who: Who, ownerName = ''): Promise<string | null> {
  const s = job.steps.find(x => x.id === stepId)
  return saveSteps(job, job.steps.map(x => x.id === stepId ? { ...x, owner_id: ownerId } : x), who, s ? `${ownerId ? ownerName || 'someone' : 'nobody'}: ${s.text}` : '')
}

export async function deleteJob(job: AdminJob, who: Who): Promise<string | null> {
  const { error } = await supabase.from('admin_jobs').delete().eq('id', job.id)
  if (error) return error.message
  logActivity('deleted', `Job: ${job.title}`)
  return null
}

export async function fetchHistory(jobId: string): Promise<AdminJobHistory[]> {
  const { data } = await supabase.from('admin_job_history').select('*').eq('job_id', jobId).order('at')
  return (data || []) as AdminJobHistory[]
}

// ── Stuck ──

export async function fetchQuestions(jobId: string): Promise<AdminJobQuestion[]> {
  const { data } = await supabase.from('admin_job_questions').select('*').eq('job_id', jobId).order('created_at')
  return (data || []) as AdminJobQuestion[]
}
export async function fetchOpenQuestions(): Promise<AdminJobQuestion[]> {
  const { data } = await supabase.from('admin_job_questions').select('*').is('answer', null).order('created_at')
  return (data || []) as AdminJobQuestion[]
}

export async function askQuestion(job: AdminJob, question: string, who: Who): Promise<string | null> {
  const q = question.trim(); if (!q) return null
  const { error } = await supabase.from('admin_job_questions').insert({ job_id: job.id, asked_by_id: who?.id || null, question: q })
  if (error) return error.message
  await history(job.id, 'asked', who, { note: q })
  return null
}

/** Answer a question; the pair becomes a step on the job and on the routine job it came from. */
export async function answerQuestion(job: AdminJob, q: AdminJobQuestion, answer: string, who: Who): Promise<string | null> {
  const a = answer.trim(); if (!a) return null
  const { error } = await supabase.from('admin_job_questions').update({ answer: a, answered_by_id: who?.id || null, answered_at: nowIso() }).eq('id', q.id)
  if (error) return error.message
  const text = answerStepText(q.question, a)
  await saveSteps(job, [...job.steps, { id: newId(), text, done: false, done_by_id: null, done_at: null, owner_id: null }], who)
  if (job.routine_job_id) {
    const { data } = await supabase.from('admin_routine_jobs').select('steps').eq('id', job.routine_job_id).single()
    if (data) await supabase.from('admin_routine_jobs').update({ steps: [...parseRoutineJob({ ...data, id: job.routine_job_id, routine_id: '' }).steps, { text }], updated_at: nowIso() }).eq('id', job.routine_job_id)
  }
  await history(job.id, 'answered', who, { note: a })
  return null
}

// ── Routines ──

export async function fetchRoutines(): Promise<{ routines: AdminRoutine[]; template: AdminRoutineJob[]; events: AdminEvent[]; error: string | null }> {
  const [r, t, e] = await Promise.all([
    supabase.from('admin_routines').select('*').order('sort_order').order('name'),
    supabase.from('admin_routine_jobs').select('*').order('sort_order').order('offset_days'),
    supabase.from('admin_events').select('*').order('event_date', { ascending: false }),
  ])
  return { routines: (r.data || []) as AdminRoutine[], template: ((t.data || []) as any[]).map(parseRoutineJob), events: (e.data || []) as AdminEvent[], error: r.error?.message || t.error?.message || e.error?.message || null }
}

export async function saveRoutine(r: Partial<AdminRoutine> & { name: string }, who: Who): Promise<{ routine: AdminRoutine | null; error: string | null }> {
  const row = { name: r.name.trim(), category: r.category || '', anchor: r.anchor || 'date', notes: r.notes || '', sort_order: r.sort_order ?? 0, updated_at: nowIso() }
  const q = r.id ? supabase.from('admin_routines').update(row).eq('id', r.id) : supabase.from('admin_routines').insert(row)
  const { data, error } = await q.select('*').single()
  if (!error) logActivity(r.id ? 'edited' : 'created', `Routine: ${row.name}`)
  return { routine: (data as AdminRoutine) || null, error: error?.message || null }
}

export async function deleteRoutine(r: AdminRoutine): Promise<string | null> {
  const { error } = await supabase.from('admin_routines').delete().eq('id', r.id)
  if (!error) logActivity('deleted', `Routine: ${r.name}`)
  return error?.message || null
}

export async function saveRoutineJob(t: Partial<AdminRoutineJob> & { routine_id: string; title: string }): Promise<{ job: AdminRoutineJob | null; error: string | null }> {
  const row = { routine_id: t.routine_id, title: t.title.trim(), offset_days: t.offset_days ?? 0, default_owner_id: t.default_owner_id ?? null, size: t.size || 'S', steps: t.steps || [], link_path: t.link_path || '', sort_order: t.sort_order ?? 0, updated_at: nowIso() }
  const q = t.id ? supabase.from('admin_routine_jobs').update(row).eq('id', t.id) : supabase.from('admin_routine_jobs').insert(row)
  const { data, error } = await q.select('*').single()
  return { job: data ? parseRoutineJob(data) : null, error: error?.message || null }
}

export async function deleteRoutineJob(id: string): Promise<string | null> {
  const { error } = await supabase.from('admin_routine_jobs').delete().eq('id', id)
  return error?.message || null
}

/** Set a routine's date for a term: one event row, and every template job dated from it. */
export async function createEvent(routine: AdminRoutine, template: AdminRoutineJob[], event_date: string, semester_id: string | null, label: string, who: Who): Promise<{ event: AdminEvent | null; made: number; error: string | null }> {
  const { data, error } = await supabase.from('admin_events').insert({ routine_id: routine.id, semester_id, label, event_date, created_by_id: who?.id || null }).select('*').single()
  if (error || !data) return { event: null, made: 0, error: error?.message || 'Could not save the date' }
  const ev = data as AdminEvent
  const drafts = jobsForEvent(routine, template.filter(t => t.routine_id === routine.id), ev, who?.id || null)
  let made = 0
  if (drafts.length) {
    const { data: rows, error: e2 } = await supabase.from('admin_jobs').insert(drafts).select('id, owner_id')
    if (e2) return { event: ev, made: 0, error: e2.message }
    made = rows?.length || 0
    await Promise.all((rows || []).map((r: any) => history(r.id, 'created', who, { to_id: r.owner_id, note: `${routine.name} · ${label || event_date}` })))
  }
  logActivity('created', `Routine dated: ${routine.name} · ${event_date} · ${made} jobs`)
  return { event: ev, made, error: null }
}

/** Remove an event and the jobs it made that are not done yet. */
export async function deleteEvent(ev: AdminEvent, routineName: string): Promise<string | null> {
  const { error: e1 } = await supabase.from('admin_jobs').delete().eq('event_id', ev.id).neq('status', 'done')
  if (e1) return e1.message
  const { error } = await supabase.from('admin_events').delete().eq('id', ev.id)
  if (!error) logActivity('deleted', `Routine date: ${routineName} · ${ev.event_date}`)
  return error?.message || null
}
