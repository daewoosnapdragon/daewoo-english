// ─── Office supplies ─────────────────────────────────────────────
// Stock, requests, receipts, purchases and budgets, see
// supabase/migration-supplies.sql. The pure parts (reading pasted receipt
// lines, matching a line to a stock item, pack arithmetic, deciding what is
// low and whether the full count is due, adding purchases up against the
// budgets) are here so they can be tested; the pages call them.

export interface SupplyItem {
  id: string; name: string; unit: string; category: string; on_hand: number; par: number; quick_check: boolean
  pack_size: number | null; pack_name: string; cabinet: string; shelf: string
  link: string; aliases: string[]; notes: string
  last_price: number | null; last_price_at: string | null
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
export interface SupplyReceipt { id: string; date: string; note: string; source: string; total: number; applied_by: string | null; applied_at: string }
export type PurchaseKind = 'stock' | 'oneoff'
export interface SupplyPurchase {
  id: string; receipt_id: string; date: string; kind: PurchaseKind; name: string; qty: number; as_bought: string; price: number
  item_id: string | null; request_id: string | null; for_teacher_id: string | null; purpose: string; created_at: string
}
export interface SupplyBudget { id: string; semester_id: string; teacher_id: string | null; amount: number; note: string; updated_at: string }
/** One pasted line, read. `unit` is the word after the number when there was one ("2 boxes"). */
export interface ReceiptLine { name: string; qty: number; unit?: string; price?: number; raw?: string }

export interface SuppliesSettings {
  /** The office job whose holder does the quick count on the cleaning day (a key from the office jobs rotation). */
  countJobKey: string
  /** Days between full counts before one is due. */
  fullCountDays: number
}
export const SUPPLIES_KEY = 'supplies'
export const DEFAULT_SUPPLIES_SETTINGS: SuppliesSettings = { countJobKey: 'garden', fullCountDays: 30 }

export const isSuppliesMissing = (message: string | undefined | null) => !!message && /supply_items|supply_requests|supply_receipts|supply_movements|supply_purchases|supply_budgets/.test(message)

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

// ─── Packs ───────────────────────────────────────────────────────
type Packed = Pick<SupplyItem, 'unit' | 'pack_size' | 'pack_name'>
export const hasPacks = (i: Packed) => !!i.pack_size && Number(i.pack_size) > 1
const PACK_WORDS = ['box', 'boxes', 'pack', 'packs', 'bag', 'bags', 'carton', 'cartons', 'case', 'cases', 'set', 'sets', '박스', '팩', '묶음', '세트', '상자', '봉지']
const UNIT_WORD = '(?:boxes|box|packs?|rolls?|bottles?|bags?|reams?|cartons?|cases?|sets?|pads?|sticks?|pcs?|ea|개|박스|팩|통|묶음|권|자루|롤|병|장|세트|상자|봉지|개입|매)'
const plural = (w: string, n: number) => { if (n === 1 || !/^[a-z]+$/i.test(w)) return w; if (/(x|s|ch|sh)$/i.test(w)) return w + 'es'; return w + 's' }

/** Whether a unit word on a receipt line means a pack of this item. */
export function isPackWord(i: Packed, word: string | undefined): boolean {
  if (!word || !hasPacks(i)) return false
  const w = word.toLowerCase().trim()
  const pn = (i.pack_name || '').toLowerCase().trim()
  if (pn && (w === pn || w === plural(pn, 2))) return true
  return PACK_WORDS.includes(w)
}

/** A quantity as bought, in single units: "2 boxes" of a box-of-5 item is 10. */
export function toSingles(i: Packed, qty: number, unitWord?: string): number {
  return isPackWord(i, unitWord) ? qty * Number(i.pack_size) : qty
}

export function splitPacks(i: Packed, n: number): { packs: number; loose: number } {
  if (!hasPacks(i)) return { packs: 0, loose: n }
  const ps = Number(i.pack_size)
  const packs = Math.floor(n / ps)
  return { packs, loose: Math.round((n - packs * ps) * 100) / 100 }
}

const numStr = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)

/** "1 box + 2 reams", "3 packs", "7 markers", "0". With `singles`, the single-unit total follows in brackets. */
export function fmtQty(i: Packed, n: number, singles = false): string {
  if (!hasPacks(i)) return `${numStr(n)} ${plural(i.unit || 'each', n)}`.trim()
  const { packs, loose } = splitPacks(i, n)
  const parts: string[] = []
  if (packs > 0) parts.push(`${numStr(packs)} ${plural(i.pack_name || 'pack', packs)}`)
  if (loose > 0) parts.push(`${numStr(loose)} ${plural(i.unit || 'each', loose)}`)
  const s = parts.length ? parts.join(' + ') : '0'
  return singles && packs > 0 ? `${s} (${numStr(n)} ${plural(i.unit || 'each', n)})` : s
}

// ─── Receipt lines ───────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/[\s\-_.,·()]+/g, ' ').trim()
const PRICE_RE = /(?:₩|krw|won|\$)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:원|won|krw)?/i
const readPrice = (s: string): number | undefined => {
  const t = s.trim(); if (!t) return undefined
  const m = t.match(/^\s*(?:₩|krw|won)?\s*(\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*(?:원|won|krw)?\s*$/i)
  return m ? Number(m[1].replace(/,/g, '')) : undefined
}
const readQty = (s: string): { qty: number; unit?: string } | null => {
  const m = s.trim().match(new RegExp(`^[x×]?\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_WORD})?\\s*$`, 'i'))
  if (!m) return null
  return { qty: parseFloat(m[1].replace(',', '.')), unit: m[2] ? m[2].toLowerCase() : undefined }
}

/**
 * Read pasted receipt lines. One item per line, in any of these shapes:
 *   "A4 paper | 2 boxes | 45,000"   "A4 paper | 2 | 45000원"   "Markers, 3 packs, 12000"
 *   "Tape x2"   "2 x Glue sticks"   "Sticky notes 4 packs 8,000원"   "복사용지 3개"   "Milk"
 * A line with no number is one of that thing. A trailing amount in won is
 * the price, not a quantity. Dates and totals are ignored.
 */
export function parseReceiptLines(text: string): ReceiptLine[] {
  const out: ReceiptLine[] = []
  for (const rawLine of text.split(/\r?\n/)) {
    const raw = rawLine.trim().replace(/^[-•*]\s+/, '')
    if (!raw) continue
    if (/^(item|name|품목)\b/i.test(raw) && /[|,\t]/.test(raw) && !/\d/.test(raw)) continue   // a header row
    if (/^(total|합계|subtotal|소계|tax|부가세|vat)\b/i.test(raw)) continue
    let name = '', qty = NaN, unit: string | undefined, price: number | undefined
    const parts = raw.split(/\s*[|\t]\s*|\s*,\s*(?!\d{3}\b)/).map(p => p.trim()).filter(Boolean)
    if (parts.length >= 2) {
      const q = readQty(parts[1])
      if (q) {
        name = parts[0]; qty = q.qty; unit = q.unit
        if (parts.length >= 3) price = readPrice(parts[2])
      } else if (parts.length === 2 && readPrice(parts[1]) !== undefined) {
        name = parts[0]; qty = 1; price = readPrice(parts[1])
      }
    }
    if (!name) {
      let rest = raw
      // A trailing amount in won is the price.
      const pm = rest.match(/\s+(?:₩|krw|won)?\s*(\d{1,3}(?:,\d{3})+|\d{4,})\s*(?:원|won|krw)?\s*$/i)
      if (pm) { price = Number(pm[1].replace(/,/g, '')); rest = rest.slice(0, pm.index).trim() }
      let m = rest.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*[x×]\\s*(.+)$`, 'i'))
      if (m) { qty = parseFloat(m[1].replace(',', '.')); name = m[2] }
      else if ((m = rest.match(new RegExp(`^(.+?)\\s*[x×]\\s*(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_WORD})?\\s*$`, 'i')))) { name = m[1]; qty = parseFloat(m[2].replace(',', '.')); unit = m[3]?.toLowerCase() }
      else if ((m = rest.match(new RegExp(`^(.+?)\\s+(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_WORD})?$`, 'i')))) { name = m[1]; qty = parseFloat(m[2].replace(',', '.')); unit = m[3]?.toLowerCase() }
      else if ((m = rest.match(new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNIT_WORD})?\\s+(.+)$`, 'i')))) { qty = parseFloat(m[1].replace(',', '.')); unit = m[2]?.toLowerCase(); name = m[3] }
      else { name = rest; qty = 1 }
    }
    name = name.replace(/\s*[\d,.]+\s*(원|₩|won|krw)\s*$/i, '').trim()
    if (!Number.isFinite(qty) || qty <= 0) qty = 1
    if (name) out.push({ name, qty, unit, price, raw })
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

/** The open request a receipt line most likely answers, by name. */
export function matchRequest(line: string, requests: Pick<SupplyRequest, 'id' | 'name' | 'status'>[]): string | null {
  const open = requests.filter(r => r.status === 'needed' || r.status === 'ordered').map(r => ({ id: r.id, name: r.name, aliases: [] as string[] }))
  return matchItem(line, open)
}

export const REQUEST_LABELS: Record<RequestStatus, { en: string; ko: string }> = {
  needed: { en: 'Needed', ko: '필요' }, ordered: { en: 'Ordered', ko: '주문함' }, arrived: { en: 'Arrived', ko: '도착' }, dropped: { en: 'Dropped', ko: '취소' },
}

// ─── Money ───────────────────────────────────────────────────────
export const won = (n: number, ko = false) => { const v = Math.round(Number(n) || 0).toLocaleString('en-US'); return ko ? `${v}원` : `₩${v}` }
export const monthKey = (date: string) => date.slice(0, 7)

export interface BudgetLine { teacherId: string | null; allowance: number; spent: number; remaining: number; count: number }
export interface BudgetSummary {
  /** One line per teacher given, allowance from the budgets, spent from one-off purchases charged to them. */
  teachers: BudgetLine[]
  /** The office: stock purchases and one-offs with no teacher (events), against the office allowance. */
  office: { allowance: number; stock: number; events: number; spent: number; remaining: number }
  /** By month, oldest first. */
  months: { key: string; stock: number; oneoff: number; total: number }[]
  total: number
}

/** Add the purchases up against the budgets. Pass the purchases already limited to the semester. */
export function budgetSummary(purchases: Pick<SupplyPurchase, 'date' | 'kind' | 'price' | 'for_teacher_id'>[], budgets: Pick<SupplyBudget, 'teacher_id' | 'amount'>[], teacherIds: string[]): BudgetSummary {
  const allowance = (tid: string | null) => Number(budgets.find(b => (b.teacher_id || null) === tid)?.amount || 0)
  const teachers = teacherIds.map(tid => {
    const mine = purchases.filter(p => p.kind === 'oneoff' && p.for_teacher_id === tid)
    const spent = mine.reduce((a, p) => a + Number(p.price || 0), 0)
    const a = allowance(tid)
    return { teacherId: tid, allowance: a, spent, remaining: a - spent, count: mine.length }
  })
  const stock = purchases.filter(p => p.kind === 'stock').reduce((a, p) => a + Number(p.price || 0), 0)
  const events = purchases.filter(p => p.kind === 'oneoff' && !p.for_teacher_id).reduce((a, p) => a + Number(p.price || 0), 0)
  const oa = allowance(null)
  const byMonth = new Map<string, { stock: number; oneoff: number }>()
  for (const p of purchases) {
    const k = monthKey(p.date)
    const m = byMonth.get(k) || { stock: 0, oneoff: 0 }
    m[p.kind === 'stock' ? 'stock' : 'oneoff'] += Number(p.price || 0)
    byMonth.set(k, m)
  }
  const months = Array.from(byMonth.entries()).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([key, m]) => ({ key, ...m, total: m.stock + m.oneoff }))
  const total = purchases.reduce((a, p) => a + Number(p.price || 0), 0)
  return { teachers, office: { allowance: oa, stock, events, spent: stock + events, remaining: oa - stock - events }, months, total }
}
