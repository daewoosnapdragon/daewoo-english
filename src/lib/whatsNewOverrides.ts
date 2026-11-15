import type { WhatsNewEntry } from '@/content/whats-new'

// ─── What's new: admin overrides ─────────────────────────────────
// Entries live in the code with a release date. Admin can change that
// from the What's new page without a deploy: move an entry's date, or
// turn it off so it never shows. The changes sit in one app_settings
// row, keyed by entry id, and apply everywhere entries are read: the
// page, the first-visit popup, the masthead dot and ⌘K.

export const WHATS_NEW_OVERRIDES_KEY = 'whats_new_overrides'

export interface WhatsNewOverride {
  /** A release date that replaces the one in the code (YYYY-MM-DD). */
  date?: string
  /** True hides the entry from everyone, released or not. */
  off?: boolean
}

export type WhatsNewOverrides = Record<string, WhatsNewOverride>

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)

/** The stored JSON, or anything else, as a clean table. */
export function parseOverrides(raw: unknown): WhatsNewOverrides {
  let v: unknown = raw
  if (typeof v === 'string') { try { v = JSON.parse(v) } catch { return {} } }
  if (!v || typeof v !== 'object' || Array.isArray(v)) return {}
  const out: WhatsNewOverrides = {}
  for (const [id, o] of Object.entries(v as Record<string, unknown>)) {
    if (!o || typeof o !== 'object') continue
    const { date, off } = o as Record<string, unknown>
    const clean: WhatsNewOverride = {}
    if (isDate(date)) clean.date = date
    if (off === true) clean.off = true
    if (clean.date || clean.off) out[id] = clean
  }
  return out
}

/** Set one entry's override; an empty override drops the row. */
export function setOverride(all: WhatsNewOverrides, id: string, patch: Partial<WhatsNewOverride>): WhatsNewOverrides {
  const next: WhatsNewOverride = { ...all[id], ...patch }
  if (!isDate(next.date)) delete next.date
  if (!next.off) delete next.off
  const out = { ...all }
  if (next.date || next.off) out[id] = next; else delete out[id]
  return out
}

/** What each entry carries once overrides are applied. */
export interface EffectiveEntry extends WhatsNewEntry {
  /** The date written in the code, kept so admin can see what changed and put it back. */
  codeDate: string
  off: boolean
  /** True when the date or the switch differs from the code. */
  overridden: boolean
}

/** Every entry with its overrides applied, in code order. Off entries are kept; filter with `visibleEntries`. */
export function applyOverrides(entries: WhatsNewEntry[], overrides: WhatsNewOverrides): EffectiveEntry[] {
  return entries.map(e => {
    const o = overrides[e.id]
    const date = o?.date || e.date
    const off = !!o?.off
    return { ...e, date, codeDate: e.date, off, overridden: date !== e.date || off }
  })
}

/** Entries that are on, newest first: released ones and, when `includeScheduled`, those still held. */
export function visibleEntries(entries: EffectiveEntry[], today: string, includeScheduled = false): EffectiveEntry[] {
  return entries.filter(e => !e.off && (includeScheduled || e.date <= today)).sort((a, b) => b.date.localeCompare(a.date))
}

/** Released entries, newest first: what teachers see. */
export const releasedWith = (entries: WhatsNewEntry[], overrides: WhatsNewOverrides, today: string) =>
  visibleEntries(applyOverrides(entries, overrides), today)
