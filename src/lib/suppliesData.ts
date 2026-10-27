import { supabase } from '@/lib/supabase'
import { logActivity } from '@/lib/activity'
import { type SupplyItem, type SupplyRequest, type SupplyReceipt, type ReceiptLine, type RequestStatus } from '@/lib/suppliesCore'

// ─── Office supplies: the writes ─────────────────────────────────
// Every change to an on-hand number goes through here, so each one leaves a
// movement row and the activity log gets a line. Errors come back as a
// message (null when it worked); the page shows them as toasts.

const msg = (e: { message?: string } | null | undefined) => e?.message || null

export async function fetchSupplies(): Promise<{ items: SupplyItem[]; requests: SupplyRequest[]; receipts: SupplyReceipt[]; error: string | null }> {
  const [i, r, c] = await Promise.all([
    supabase.from('supply_items').select('*').order('category').order('name'),
    supabase.from('supply_requests').select('*').order('created_at', { ascending: false }).limit(300),
    supabase.from('supply_receipts').select('*').order('date', { ascending: false }).order('applied_at', { ascending: false }).limit(60),
  ])
  const error = i.error?.message || r.error?.message || c.error?.message || null
  return {
    items: ((i.data || []) as any[]).map(x => ({ ...x, on_hand: Number(x.on_hand), par: Number(x.par), aliases: x.aliases || [] })) as SupplyItem[],
    requests: ((r.data || []) as any[]).map(x => ({ ...x, quantity: Number(x.quantity), requesters: x.requesters || [] })) as SupplyRequest[],
    receipts: ((c.data || []) as any[]).map(x => ({ ...x, lines: Array.isArray(x.lines) ? x.lines : [] })) as SupplyReceipt[],
    error,
  }
}

export type ItemDraft = Pick<SupplyItem, 'name' | 'unit' | 'category' | 'par' | 'quick_check' | 'link' | 'aliases' | 'notes'> & { on_hand?: number }

export async function saveItem(id: string | null, d: ItemDraft, teacherId: string): Promise<{ id: string | null; error: string | null }> {
  const row = { name: d.name.trim(), unit: d.unit.trim() || 'each', category: d.category.trim() || 'office', par: Number(d.par) || 0, quick_check: !!d.quick_check, link: d.link.trim(), aliases: d.aliases.map(a => a.trim()).filter(Boolean), notes: d.notes.trim(), updated_at: new Date().toISOString() }
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

/** A count: every number given becomes the on-hand number; the rest are untouched. */
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

/** A receipt: each line adds to its item. Lines with no item are kept on the receipt but add nothing. */
export async function applyReceipt(date: string, note: string, source: string, lines: ReceiptLine[], items: SupplyItem[], teacherId: string): Promise<string | null> {
  const { data, error } = await supabase.from('supply_receipts').insert({ date, note, source, lines: lines.map(l => ({ name: l.name, qty: l.qty, item_id: l.item_id || null })), applied_by: teacherId }).select('id').single()
  if (error) return error.message
  const receiptId = (data as any).id as string
  const at = new Date().toISOString()
  // Several lines may hit the same item; add them up first.
  const add = new Map<string, number>()
  for (const l of lines) if (l.item_id) add.set(l.item_id, (add.get(l.item_id) || 0) + l.qty)
  for (const [itemId, qty] of Array.from(add.entries())) {
    const item = items.find(i => i.id === itemId)
    if (!item) continue
    const after = item.on_hand + qty
    const { error: e } = await supabase.from('supply_items').update({ on_hand: after, updated_at: at }).eq('id', itemId)
    if (e) return e.message
    await supabase.from('supply_movements').insert({ item_id: itemId, kind: 'receipt', qty, on_hand_after: after, note: note || date, receipt_id: receiptId, by: teacherId, at })
  }
  logActivity('saved', `Receipt ${date}: ${lines.length} lines, ${add.size} items`, { path: '/supplies' })
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
