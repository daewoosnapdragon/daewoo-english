import { supabase } from '@/lib/supabase'

// ─── Activity log ────────────────────────────────────────────────
// Who did what, when. The app records it because only the app knows who is
// signed in: a row per sign-in, sign-out, page opened and saved action.
// Saving the same thing again within ten minutes (the next student on a
// sheet, attendance re-saved) updates that row's count instead of adding
// another, so a scoring session is one line, not forty. Nothing here may
// ever break the app: every failure is swallowed, and a missing table turns
// logging off until the next reload. Read on /activity.

export type ActivityAction = 'login' | 'logout' | 'visit' | 'scored' | 'saved' | 'created' | 'edited' | 'deleted' | 'printed' | 'posted' | 'settings'

export const ACTION_LABELS: Record<ActivityAction, { en: string; ko: string }> = {
  login: { en: 'Signed in', ko: '로그인' }, logout: { en: 'Signed out', ko: '로그아웃' }, visit: { en: 'Opened', ko: '열람' },
  scored: { en: 'Scored', ko: '채점' }, saved: { en: 'Saved', ko: '저장' }, created: { en: 'Created', ko: '생성' },
  edited: { en: 'Edited', ko: '수정' }, deleted: { en: 'Deleted', ko: '삭제' }, printed: { en: 'Printed', ko: '인쇄' },
  posted: { en: 'Posted', ko: '게시' }, settings: { en: 'Changed settings', ko: '설정 변경' },
}

/** Admin, the head teacher and the Snapdragon teacher can read the log. */
export function canViewActivity(t: { role?: string; english_class?: string; is_head_teacher?: boolean } | null | undefined): boolean {
  return !!t && (t.role === 'admin' || !!t.is_head_teacher || t.english_class === 'Snapdragon')
}

let actor: { id: string; name: string } | null = null
/** Set by the app context whenever the signed-in teacher changes. */
export function setActivityActor(t: { id: string; name: string } | null) { actor = t }

const FOLD_MS = 10 * 60 * 1000
const recent: Record<string, { id: string; at: number; count: number }> = {}
let off = false

/**
 * Record an action. `key` folds repeats: the same actor, action and key
 * within ten minutes update the earlier row's detail and count.
 */
export async function logActivity(action: ActivityAction, detail = '', opts: { key?: string; path?: string } = {}): Promise<void> {
  const who = actor
  if (!who || off) return
  const path = opts.path ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  const key = opts.key ? `${who.id}|${action}|${opts.key}` : null
  const now = Date.now()
  try {
    if (key && recent[key] && now - recent[key].at < FOLD_MS) {
      const r = recent[key]
      r.at = now; r.count += 1
      const { error } = await supabase.from('activity_log').update({ detail, count: r.count, updated_at: new Date(now).toISOString() }).eq('id', r.id)
      if (!error) return
    }
    const { data, error } = await supabase.from('activity_log').insert({ teacher_id: who.id, action, detail, path }).select('id').single()
    if (error) { if (/activity_log/.test(error.message || '')) off = true; return }
    if (key && data) recent[key] = { id: data.id, at: now, count: 1 }
  } catch { /* logging must never break the app */ }
}
