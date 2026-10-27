import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { type SupplyItem, type SupplyRequest, type SupplyReceipt, type SupplyPurchase, type SupplyBudget, type RequestStatus, type PurchaseKind } from '@/lib/suppliesCore'

// ─── Office supplies: the writes ─────────────────────────────────
// Every change to an on-hand number goes through here, so each one leaves a
// movement row and the activity log gets a line. Errors come back as a
// message (null when it worked); the pages show them as toasts.

const msg = (e: { message?: string } | null | undefined) => e?.message || null
const n = (x: unknown) => x === null || x === undefined ? null : Number(x)

const rowToItem = (x: any): SupplyItem => ({ ...x, on_hand: Number(x.on_hand), par: Number(x.par), pack_size: n(x.pack_size), pack_name: x.pack_name || '', cabinet: x.cabinet || '', shelf: x.shelf || '', last_price: n(x.last_price), aliases: x.aliases || [] })
const rowToPurchase = (x: any): SupplyPurchase => ({ ...x, qty: Number(x.qty), price: Number(x.price) })

export async function fetchSupplies(): Promise<{ items: SupplyItem[]; requests: SupplyRequest[]; receipts: SupplyReceipt[]; purchases: SupplyPurchase[]; error: string | null }> {
  const [i, r, c, p] = await Promise.all([
    supabase.from('supply_items').select('*').order('category').order('name'),
    supabase.from('supply_requests').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('supply_receipts').select('*').order('date', { ascending: false }).order('applied_at', { ascending: false }).limit(100),
    supabase.from('supply_purchases').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(1500),
  ])
  const error = i.error?.message || r.error?.message || c.error?.message || p.error?.message || null
  return {
    items: ((i.data || []) as any[]).map(rowToItem),
    requests: ((r.data || []) as any[]).map(x => ({ ...x, quantity: Number(x.quantity), requesters: x.requesters || [] })) as SupplyRequest[],
    receipts: ((c.data || []) as any[]).map(x => ({ ...x, total: Number(x.total || 0) })) as SupplyReceipt[],
    purchases: ((p.data || []) as any[]).map(rowToPurchase),
    error,
  }
}

export type ItemDraft = Pick<SupplyItem, 'name' | 'unit' | 'category' | 'par' | 'quick_check' | 'link' | 'aliases' | 'notes' | 'pack_size' | 'pack_name' | 'cabinet' | 'shelf'> & { on_hand?: number }

export async function saveItem(id: string | null, d: ItemDraft, teacherId: string): Promise<{ id: string | null; error: string | null }> {
  const packs = d.pack_size && Number(d.pack_size) > 1
  const row = {
    name: d.name.trim(), unit: d.unit.trim() || 'each', category: d.category.trim() || 'office', par: Number(d.par) || 0, quick_check: !!d.quick_check,
    pack_size: packs ? Number(d.pack_size) : null, pack_name: packs ? (d.pack_name.trim() || 'pack') : '',
    cabinet: (d.cabinet || '').trim(), shelf: (d.shelf || '').trim(),
    link: d.link.trim(), aliases: d.aliases.map(a => a.trim()).filter(Boolean), notes: d.notes.trim(), updated_at: new Date().toISOString(),
  }
  if (!row.name) return { id: null, error: 'Name required' }
  if (id) {
    const { error } = await supabase.from('supply_items').update(row).eq('id', id)
    if (!error) logActivity('edited', `Supply item: ${row.name}`, { key: id, path: '/supplies' })
    return { id, error: msg(error) }
  }
  const { data, error } = await supabase.from('supply_items').insert({ ...row, on_hand: Number(d.on_hand) || 0 }).select('id').single()
  if (error) return { id: null, error: error.message }
  const newId = (data as any).id as string
  if (Number(d.on_hand) > 0) await supabase.from('supply_movements').insert({ item_id: newId, kind: 'count', qty: Number(d.on_hand), on_hand_after: Number(d.on_hand), note: 'first number', by: teacherId })
  logActivity('created', `Supply item: ${row.name}`, { key: newId, path: '/supplies' })
  return { id: newId, error: null }
}

export async function setItemActive(id: string, name: string, active: boolean): Promise<string | null> {
  const { error } = await supabase.from('supply_items').update({ is_active: active, updated_at: new Date().toISOString() }).eq('id', id)
  if (!error) logActivity(active ? 'edited' : 'deleted', `Supply item ${active ? 'restored' : 'removed'}: ${name}`, { path: '/supplies' })
  return msg(error)
}

/** Anyone can say an item is running low; the flag clears at the next count. */
export async function flagLow(item: SupplyItem, teacherId: string): Promise<string | null> {
  const { error } = await supabase.from('supply_items').update({ low_flagged_at: new Date().toISOString(), low_flagged_by: teacherId, updated_at: new Date().toISOString() }).eq('id', item.id)
  if (!error) logActivity('edited', `Marked low: ${item.name}`, { key: `low:${item.id}`, path: '/supplies' })
  return msg(error)
}

/** A count: every number given becomes the on-hand number (single units); the rest are untouched. */
export async function applyCount(kind: 'quick' | 'full', counts: { item: SupplyItem; qty: number }[], teacherId: string): Promise<string | null> {
  const at = new Date().toISOString()
  for (const { item, qty } of counts) {
    const { error } = await supabase.from('supply_items').update({ on_hand: qty, last_counted_at: at, last_counted_by: teacherId, last_count_kind: kind, updated_at: at }).eq('id', item.id)
    if (error) return error.message
    if (qty !== item.on_hand) await supabase.from('supply_movements').insert({ item_id: item.id, kind: 'count', qty, on_hand_after: qty, note: `${kind} count (was ${item.on_hand})`, by: teacherId, at })
  }
  logActivity('saved', `${kind === 'quick' ? 'Quick' : 'Full'} supply count: ${counts.length} items`, { path: '/supplies' })
  return null
}

/** One receipt line, checked and ready to apply. `qty` is in single units; `as_bought` is how the receipt put it. */
export interface PurchaseDraft { name: string; qty: number; as_bought: string; price: number; kind: PurchaseKind; item_id: string | null; request_id: string | null; for_teacher_id: string | null; purpose: string }

/** A receipt: stock lines add to their item, every line is a purchase, and a line that answers a request marks it arrived. */
export async function applyReceipt(date: string, note: string, source: string, lines: PurchaseDraft[], items: SupplyItem[], teacherId: string): Promise<string | null> {
  const total = lines.reduce((a, l) => a + (Number(l.price) || 0), 0)
  const { data, error } = await supabase.from('supply_receipts').insert({ date, note, source, total, applied_by: teacherId }).select('id').single()
  if (error) return error.message
  const receiptId = (data as any).id as string
  const at = new Date().toISOString()
  const { error: pe } = await supabase.from('supply_purchases').insert(lines.map(l => ({
    receipt_id: receiptId, date, kind: l.kind, name: l.name, qty: Number(l.qty) || 0, as_bought: l.as_bought, price: Number(l.price) || 0,
    item_id: l.kind === 'stock' ? l.item_id : null, request_id: l.request_id, for_teacher_id: l.kind === 'oneoff' ? l.for_teacher_id : null, purpose: l.purpose,
  })))
  if (pe) return pe.message
  // Several lines may hit the same item; add them up first. The latest price per single unit is kept on the item.
  const add = new Map<string, { qty: number; price: number }>()
  for (const l of lines) if (l.kind === 'stock' && l.item_id && l.qty > 0) { const a = add.get(l.item_id) || { qty: 0, price: 0 }; a.qty += l.qty; a.price += Number(l.price) || 0; add.set(l.item_id, a) }
  for (const [itemId, a] of Array.from(add.entries())) {
    const item = items.find(i => i.id === itemId)
    if (!item) continue
    const after = item.on_hand + a.qty
    const patch: Record<string, unknown> = { on_hand: after, updated_at: at }
    if (a.price > 0) { patch.last_price = Math.round((a.price / a.qty) * 100) / 100; patch.last_price_at = date }
    const { error: e } = await supabase.from('supply_items').update(patch).eq('id', itemId)
    if (e) return e.message
    await supabase.from('supply_movements').insert({ item_id: itemId, kind: 'receipt', qty: a.qty, on_hand_after: after, note: note || date, receipt_id: receiptId, by: teacherId, at })
  }
  const reqIds = Array.from(new Set(lines.map(l => l.request_id).filter((x): x is string => !!x)))
  if (reqIds.length) await supabase.from('supply_requests').update({ status: 'arrived', arrived_by: teacherId, arrived_at: at, updated_at: at }).in('id', reqIds).neq('status', 'arrived')
  logActivity('saved', `Receipt ${date}${note ? ` (${note})` : ''}: ${lines.length} lines, ${total.toLocaleString('en-US')} won`, { path: '/supplies' })
  return null
}

export type RequestDraft = { name: string; quantity: number; unit: string; purpose: string; link: string; item_id: string | null }

export async function createRequest(d: RequestDraft, teacherId: string): Promise<string | null> {
  const name = d.name.trim()
  if (!name) return 'Name required'
  const { error } = await supabase.from('supply_requests').insert({ item_id: d.item_id, name, quantity: Number(d.quantity) || 1, unit: d.unit.trim(), purpose: d.purpose.trim(), link: d.link.trim(), requested_by: teacherId, requesters: [teacherId] })
  if (!error) logActivity('created', `Request: ${name} ×${Number(d.quantity) || 1}`, { path: '/supplies' })
  return msg(error)
}

export async function updateRequest(r: SupplyRequest, patch: Partial<Pick<SupplyRequest, 'name' | 'quantity' | 'unit' | 'purpose' | 'link' | 'item_id'>>): Promise<string | null> {
  const { error } = await supabase.from('supply_requests').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', r.id)
  if (!error) logActivity('edited', `Request: ${patch.name || r.name}`, { key: r.id, path: '/supplies' })
  return msg(error)
}

/** "I need this too": adds you to the requesters; pressing again takes you off. */
export async function toggleRequester(r: SupplyRequest, teacherId: string): Promise<string | null> {
  const has = r.requesters.includes(teacherId)
  const requesters = has ? r.requesters.filter(x => x !== teacherId) : [...r.requesters, teacherId]
  if (requesters.length === 0) return 'The last person cannot leave; drop the request instead'
  const { error } = await supabase.from('supply_requests').update({ requesters, updated_at: new Date().toISOString() }).eq('id', r.id)
  if (!error) logActivity('edited', `${has ? 'No longer needs' : 'Also needs'}: ${r.name}`, { key: `req:${r.id}`, path: '/supplies' })
  return msg(error)
}

export async function setRequestStatus(r: SupplyRequest, status: RequestStatus, teacherId: string): Promise<string | null> {
  const at = new Date().toISOString()
  const patch: Record<string, unknown> = { status, updated_at: at }
  if (status === 'ordered') { patch.ordered_by = teacherId; patch.ordered_at = at }
  if (status === 'arrived') { patch.arrived_by = teacherId; patch.arrived_at = at }
  if (status === 'needed') { patch.ordered_by = null; patch.ordered_at = null; patch.arrived_by = null; patch.arrived_at = null }
  const { error } = await supabase.from('supply_requests').update(patch).eq('id', r.id)
  if (!error) logActivity('edited', `Request ${status}: ${r.name}`, { key: `req:${r.id}:${status}`, path: '/supplies' })
  return msg(error)
}

export async function fetchMovements(itemId: string, limit = 30) {
  const { data } = await supabase.from('supply_movements').select('id, kind, qty, on_hand_after, note, by, at').eq('item_id', itemId).order('at', { ascending: false }).limit(limit)
  return (data || []) as { id: string; kind: string; qty: number; on_hand_after: number; note: string; by: string | null; at: string }[]
}

// ─── Budgets ─────────────────────────────────────────────────────
export async function fetchBudget(semester: { id: string; start_date: string | null; end_date: string | null }): Promise<{ purchases: SupplyPurchase[]; budgets: SupplyBudget[]; error: string | null }> {
  let q = supabase.from('supply_purchases').select('*').order('date', { ascending: false }).order('created_at', { ascending: false }).limit(3000)
  if (semester.start_date) q = q.gte('date', semester.start_date)
  if (semester.end_date) q = q.lte('date', semester.end_date)
  const [p, b] = await Promise.all([q, supabase.from('supply_budgets').select('*').eq('semester_id', semester.id)])
  return { purchases: ((p.data || []) as any[]).map(rowToPurchase), budgets: ((b.data || []) as any[]).map(x => ({ ...x, amount: Number(x.amount) })) as SupplyBudget[], error: p.error?.message || b.error?.message || null }
}

export async function saveBudget(semesterId: string, teacherId: string | null, amount: number, note: string, existingId: string | null): Promise<string | null> {
  const row = { semester_id: semesterId, teacher_id: teacherId, amount: Number(amount) || 0, note, updated_at: new Date().toISOString() }
  const { error } = existingId ? await supabase.from('supply_budgets').update(row).eq('id', existingId) : await supabase.from('supply_budgets').insert(row)
  if (!error) logActivity('settings', `Budget: ${teacherId ? 'teacher' : 'office'} ${row.amount.toLocaleString('en-US')} won`, { key: `budget:${semesterId}:${teacherId || 'office'}`, path: '/budget' })
  return msg(error)
}

/** Move a purchase to another teacher or event, or fix its price. */
export async function updatePurchase(p: SupplyPurchase, patch: Partial<Pick<SupplyPurchase, 'for_teacher_id' | 'purpose' | 'price' | 'kind'>>): Promise<string | null> {
  const { error } = await supabase.from('supply_purchases').update(patch).eq('id', p.id)
  if (!error) {
    const { data } = await supabase.from('supply_purchases').select('price').eq('receipt_id', p.receipt_id)
    const total = ((data || []) as any[]).reduce((a, x) => a + Number(x.price || 0), 0)
    await supabase.from('supply_receipts').update({ total }).eq('id', p.receipt_id)
    logActivity('edited', `Purchase: ${p.name}`, { key: p.id, path: '/budget' })
  }
  return msg(error)
}
