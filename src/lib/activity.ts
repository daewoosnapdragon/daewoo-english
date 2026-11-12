import { supabase } from '@/lib/supabase'

// ─── Activity log ────────────────────────────────────────────────
// Who did what, when. The app records it because only the app knows who is
// signed in: a row per sign-in, sign-out, page opened and saved action.
// Saving the same thing again within ten minutes (the next student on a
// sheet, attendance re-saved) updates that row's count instead of adding
// another, so a scoring session is one line, not forty. Nothing here may
// ever break the app: every failure is swallowed, and a missing table turns
// logging off until the next reload. Read on /activity.
//
// Page opens are two-step. The masthead writes "Opened Grades" the moment a
// page opens, since it is the only thing that always knows. A page that
// knows what is on it (which class and grade, which sheet, which student)
// then calls logView with the specifics: the first call rewrites that
// generic row, and every later change of what is on screen adds a row of
// its own, so the log says "Grades · Snapdragon · Grade 4 · Unit 3 Quiz
// score sheet" rather than "Opened Grades".

export type ActivityAction = 'login' | 'logout' | 'visit' | 'scored' | 'saved' | 'created' | 'edited' | 'deleted' | 'printed' | 'posted' | 'settings'

export const ACTION_LABELS: Record<ActivityAction, { en: string; ko: string }> = {
  login: { en: 'Signed in', ko: '로그인' }, logout: { en: 'Signed out', ko: '로그아웃' }, visit: { en: 'Opened', ko: '열람' },
  scored: { en: 'Scored', ko: '채점' }, saved: { en: 'Saved', ko: '저장' }, created: { en: 'Created', ko: '생성' },
  edited: { en: 'Edited', ko: '수정' }, deleted: { en: 'Deleted', ko: '삭제' }, printed: { en: 'Printed', ko: '인쇄' },
  posted: { en: 'Posted', ko: '게시' }, settings: { en: 'Changed settings', ko: '설정 변경' },
}

/** Only the Snapdragon teacher's account can read the log. */
export function canViewActivity(t: { role?: string; english_class?: string; is_head_teacher?: boolean } | null | undefined): boolean {
  return !!t && t.english_class === 'Snapdragon'
}

let actor: { id: string; name: string } | null = null
/** Set by the app context whenever the signed-in teacher changes. */
export function setActivityActor(t: { id: string; name: string } | null) { actor = t }

const FOLD_MS = 10 * 60 * 1000
interface Recent { id: string; at: number; count: number; refined?: boolean }
const recent: Record<string, Recent> = {}
// Page-open inserts still in flight, so a page's specifics wait for the row they rewrite.
const pendingOpen: Record<string, Promise<void>> = {}
let off = false

async function insertRow(who: { id: string }, action: ActivityAction, detail: string, path: string): Promise<string | null> {
  const { data, error } = await supabase.from('activity_log').insert({ teacher_id: who.id, action, detail, path }).select('id').single()
  if (error) { if (/activity_log/.test(error.message || '')) off = true; return null }
  return data?.id || null
}

async function patchRow(id: string, patch: { detail?: string; count?: number }, at: number): Promise<boolean> {
  const { error } = await supabase.from('activity_log').update({ ...patch, updated_at: new Date(at).toISOString() }).eq('id', id)
  return !error
}

const currentPath = () => (typeof window !== 'undefined' ? window.location.pathname : '')

/**
 * Record an action. `key` folds repeats: the same actor, action and key
 * within ten minutes update the earlier row's detail and count.
 */
export async function logActivity(action: ActivityAction, detail = '', opts: { key?: string; path?: string } = {}): Promise<void> {
  const who = actor
  if (!who || off) return
  const path = opts.path ?? currentPath()
  const key = opts.key ? `${who.id}|${action}|${opts.key}` : null
  const now = Date.now()
  try {
    if (key && recent[key] && now - recent[key].at < FOLD_MS) {
      const r = recent[key]
      r.at = now; r.count += 1
      if (await patchRow(r.id, { detail, count: r.count }, now)) return
    }
    const id = await insertRow(who, action, detail, path)
    if (key && id) recent[key] = { id, at: now, count: 1 }
  } catch { /* logging must never break the app */ }
}

const openKey = (whoId: string, path: string) => `${whoId}|visit|${path}`

/**
 * A page was opened. Written by the masthead for every address. Opening the
 * same page again within ten minutes folds, unless the earlier row has
 * already been rewritten with what was on screen, in which case this open
 * gets a row of its own for the page to rewrite in turn.
 */
export function logPageOpen(title: string, path: string): Promise<void> {
  const who = actor
  if (!who || off) return Promise.resolve()
  const base = openKey(who.id, path)
  const now = Date.now()
  const run = (async () => {
    try {
      const r = recent[base]
      if (r && !r.refined && now - r.at < FOLD_MS) {
        r.at = now; r.count += 1
        if (await patchRow(r.id, { detail: title, count: r.count }, now)) return
      }
      const id = await insertRow(who, 'visit', title, path)
      if (id) recent[base] = { id, at: now, count: 1, refined: false }
    } catch { /* never breaks the app */ }
  })()
  pendingOpen[base] = run
  run.finally(() => { if (pendingOpen[base] === run) delete pendingOpen[base] })
  return run
}

/**
 * What exactly is on screen now: "Grades · Snapdragon · Grade 4 · Unit 3
 * Quiz score sheet". The first call after a page open rewrites the generic
 * "Opened" row; later calls add a row per distinct thing looked at, folding
 * a return to the same thing within ten minutes.
 */
export async function logView(detail: string, opts: { path?: string } = {}): Promise<void> {
  const who = actor
  if (!who || off || !detail) return
  const path = opts.path ?? currentPath()
  const base = openKey(who.id, path)
  const fine = `${base}|${detail}`
  try {
    if (pendingOpen[base]) await pendingOpen[base]
    const now = Date.now()
    const r = recent[base]
    if (r && !r.refined && now - r.at < FOLD_MS) {
      r.refined = true; r.at = now
      recent[fine] = r
      if (await patchRow(r.id, { detail }, now)) return
    }
    const f = recent[fine]
    if (f && now - f.at < FOLD_MS) {
      f.at = now; f.count += 1
      if (await patchRow(f.id, { count: f.count }, now)) return
    }
    const id = await insertRow(who, 'visit', detail, path)
    if (id) recent[fine] = { id, at: now, count: 1, refined: true }
  } catch { /* never breaks the app */ }
}

/** For tests: forget folded rows and pending opens. */
export function _resetActivityForTests() {
  for (const k of Object.keys(recent)) delete recent[k]
  for (const k of Object.keys(pendingOpen)) delete pendingOpen[k]
  off = false
}
