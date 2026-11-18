import { supabase } from '@/lib/supabase'

// ─── The two admin accounts ──────────────────────────────────────
// The admin jobs tables are locked in the database to a signed-in Supabase
// Auth user, and only the Snapdragon teacher and the admin account have one
// (teachers.auth_email says which rows). Everyone else signs in with the
// name picker and never touches those tables. The app also hides the pages
// from everyone else, but that is manners; the database is the lock.

/** Who may see the admin jobs pages: the admin account and the Snapdragon teacher. */
export function canSeeAdminJobs(t: { role?: string; english_class?: string } | null | undefined): boolean {
  return !!t && (t.role === 'admin' || t.english_class === 'Snapdragon')
}

/** Sign the browser in to Supabase Auth, so the admin tables answer. */
export async function signInAdmin(email: string, password: string): Promise<string | null> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? error.message : null
  } catch (e: any) { return e?.message || 'Could not sign in' }
}

/** True while this browser holds a Supabase Auth session. */
export async function hasAdminSession(): Promise<boolean> {
  try { const { data } = await supabase.auth.getSession(); return !!data.session } catch { return false }
}

export async function signOutAdmin(): Promise<void> {
  try { const { data } = await supabase.auth.getSession(); if (data.session) await supabase.auth.signOut() } catch { /* nothing to undo */ }
}
