// ─── Office supplies ─────────────────────────────────────────────
// Stock, requests, receipts and counts, see supabase/migration-supplies.sql.
// The pure parts (reading pasted receipt lines, matching a line to a stock
// item, deciding what is low and whether the full count is due) are here so
// they can be tested; the page and the dashboard card call them.

export interface SupplyItem {
  id: string; name: string; unit: string; category: string; on_hand: number; par: number; quick_check: boolean
  link: string; aliases: string[]; notes: string
  low_flagged_at: string | null; low_flagged_by: string | null
  last_counted_at: string | null; last_counted_by: string | null; last_count_kind: string | null
  is_active: boolean; created_at: string; updated_at: string
}
export type RequestStatus = 'needed' | 'ordered' | 'arrived' | 'dropped'
export interface SupplyRequest {
  id: string; item_id: string | null; name: string; quantity: number; unit: string; purpose: string; link: string
  requested_by: string | null; requesters: string[]; status: RequestStatus
  ordered_by: string | null; ordered_at: string | null; arrived_by: string | null; arrived_at: string | null
  created_at: string; updated_at: string
}
export interface SupplyReceipt { id: string; date: string; note: string; source: string; lines: ReceiptLine[]; applied_by: string | null; applied_at: string }
export interface ReceiptLine { name: string; qty: number; item_id?: string | null; raw?: string }

export interface SuppliesSettings {
  /** The office job whose holder does the quick count on the cleaning day (a key from the office jobs rotation). */
  countJobKey: string
  /** Days between full counts before one is due. */
  fullCountDays: number
}
export const SUPPLIES_KEY = 'supplies'
export const DEFAULT_SUPPLIES_SETTINGS: SuppliesSettings = { countJobKey: 'garden', fullCountDays: 30 }

export const isSuppliesMissing = (message: string | undefined | null) => !!message && /supply_items|supply_requests|supply_receipts|supply_movements/.test(message)

/** Low: under par, or someone pressed Low since the last count. */
export function isLow(item: Pick<SupplyItem, 'on_hand' | 'par' | 'low_flagged_at' | 'last_counted_at'>): boolean {
  if (Number(item.on_hand) < Number(item.par)) return true
  if (!item.low_flagged_at) return false
  return !item.last_counted_at || item.low_flagged_at > item.last_counted_at
}

/** When the last full count was, and whether the next one is due. */
export function fullCountStatus(items: Pick<SupplyItem, 'last_counted_at' | 'last_count_kind'>[], days: number, now: Date = new Date()): { last: string | null; due: boolean; daysAgo: number | null } {
  const dates = items.filter(i => i.last_count_kind === 'full' && i.last_counted_at).map(i => i.last_counted_at as string).sort()
  const last = dates.length ? dates[dates.length - 1] : null
  if (!last) return { last: null, due: items.length > 0, daysAgo: null }
  const daysAgo = Math.floor((now.getTime() - new Date(last).getTime()) / 86400000)
  return { last, due: daysAgo >= days, daysAgo }
}

const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.,·()]+/g, ' ').trim()

/**
 * Read pasted receipt lines. One item per line, in any of these shapes:
 *   "A4 paper | 2"   "A4 paper, 2"   "A4 paper x2"   "2 x A4 paper"   "A4 paper 2 boxes"   "복사용지 3개"
 * A line with no number is one of that thing. Prices and dates are ignored.
 */
export function parseReceiptLines(text: string): ReceiptLine[] {
  const out: ReceiptLine[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim()
    if (!raw || /^(item|name|qty|quantity)\b/i.test(raw) && /[|,\t]/.test(raw) && !/\d/.test(raw)) continue
    let name = '', qty = NaN
    const parts = raw.split(/\s*[|\t]\s*|\s*,\s*/).map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const qi = parts.findIndex((p, i) => i > 0 && /^\s*[x×]?\s*\d+([.,]\d+)?\s*(개|box(es)?|packs?|rolls?|bottles?|ea|pcs?)?\s*$/i.test(p))
      if (qi > 0) { qty = parseFloat(parts[qi].replace(/[^\d.]/g, '')); name = parts[0] }
    }
    if (!name) {
      let m = raw.match(/^(\d+([.,]\d+)?)\s*[x×]\s*(.+)$/i)
      if (m) { qty = parseFloat(m[1].replace(',', '.')); name = m[3] }
      else if ((m = raw.match(/^(.+?)\s*[x×]\s*(\d+([.,]\d+)?)\s*(개|box(es)?|packs?|rolls?|bottles?|ea|pcs?)?\s*$/i))) { name = m[1]; qty = parseFloat(m[2].replace(',', '.')) }
      else if ((m = raw.match(/^(.+?)\s+(\d+([.,]\d+)?)\s*(개|box(es)?|packs?|rolls?|bottles?|ea|pcs?)?$/i))) { name = m[1]; qty = parseFloat(m[2].replace(',', '.')) }
      else if ((m = raw.match(/^(\d+([.,]\d+)?)\s*(개|box(es)?|packs?|rolls?|bottles?)?\s+(.+)$/i))) { qty = parseFloat(m[1].replace(',', '.')); name = m[4] }
      else { name = raw; qty = 1 }
    }
    // A trailing price ("A4 paper 2 boxes 25,000원") is not a quantity.
    name = name.replace(/\s*[\d,.]+\s*(원|₩|won|krw)\s*$/i, '').trim()
    if (!Number.isFinite(qty) || qty <= 0) qty = 1
    if (name) out.push({ name, qty, raw })
  }
  return out
}

/** The stock item a receipt line most likely means: an exact name or alias first, then the longest name or alias contained in the line, then the line contained in a name. */
export function matchItem(line: string, items: Pick<SupplyItem, 'id' | 'name' | 'aliases'>[]): string | null {
  const l = norm(line)
  if (!l) return null
  let best: { id: string; score: number } | null = null
  for (const it of items) {
    const names = [it.name, ...(it.aliases || [])].map(norm).filter(Boolean)
    for (const n of names) {
      let score = 0
      if (n === l) score = 1000
      else if (l.includes(n)) score = 100 + n.length
      else if (n.includes(l) && l.length >= 3) score = 50 + l.length
      if (score > (best?.score ?? 0)) best = { id: it.id, score }
    }
  }
  return best?.id || null
}

export const REQUEST_LABELS: Record<RequestStatus, { en: string; ko: string }> = {
  needed: { en: 'Needed', ko: '필요' }, ordered: { en: 'Ordered', ko: '주문함' }, arrived: { en: 'Arrived', ko: '도착' }, dropped: { en: 'Dropped', ko: '취소' },
}
