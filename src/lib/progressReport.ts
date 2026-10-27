// ─── Progress report sizing and packing ──────────────────────────
// A progress report prints as a half page (two to an A4 sheet, cut across
// the middle) whenever the comment fits in a few lines or there is none,
// and as a full page when the comment is longer. Nothing is ever shrunk
// to fit a half page: the length decides the size, not the other way
// round. The packing puts half pages two to a sheet in roster order and
// gives every full page a sheet of its own.

export type ProgressSize = 'full' | 'half'

/** The most characters a half page's comment box holds at its print size (about five lines). */
export const HALF_COMMENT_MAX = 380

export function progressSizeFor(comment: string, skipped: boolean): ProgressSize {
  if (skipped) return 'half'
  return comment.trim().length <= HALF_COMMENT_MAX ? 'half' : 'full'
}

export type Sheet<T> = { kind: 'full'; item: T } | { kind: 'halves'; top: T; bottom: T | null }

/** Sheets in order: a half page waits for the next half page; a full page takes a sheet at once. */
export function packSheets<T>(items: { size: ProgressSize; item: T }[]): Sheet<T>[] {
  const out: Sheet<T>[] = []
  let pending: T | null = null
  for (const { size, item } of items) {
    if (size === 'full') { out.push({ kind: 'full', item }); continue }
    if (pending == null) { pending = item; continue }
    out.push({ kind: 'halves', top: pending, bottom: item })
    pending = null
  }
  if (pending != null) out.push({ kind: 'halves', top: pending, bottom: null })
  return out
}

export function sheetSummary<T>(sheets: Sheet<T>[]): { sheets: number; fullPages: number; halfPages: number } {
  let fullPages = 0, halfPages = 0
  for (const s of sheets) { if (s.kind === 'full') fullPages++; else halfPages += s.bottom ? 2 : 1 }
  return { sheets: sheets.length, fullPages, halfPages }
}
