// ─── The two admin accounts ──────────────────────────────────────
// The admin jobs pages and the dashboard card are for the Snapdragon
// teacher and the admin account. The app gates by account, the way Activity
// and Overtime do; the tables themselves have the open policy every other
// table here has.

/** Who may see the admin jobs: the admin account and the Snapdragon teacher. */
export function canSeeAdminJobs(t: { role?: string; english_class?: string } | null | undefined): boolean {
  return !!t && (t.role === 'admin' || t.english_class === 'Snapdragon')
}
