'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOfficeJobs } from '@/components/dashboard/useOfficeJobs'
import { fetchSupplies } from '@/lib/suppliesData'
import { loadSuppliesSettings } from '@/lib/supplies'
import { DEFAULT_SUPPLIES_SETTINGS, fullCountStatus, isLow, isSuppliesMissing, type SuppliesSettings, type SupplyItem, type SupplyPurchase, type SupplyReceipt, type SupplyRequest } from '@/lib/suppliesCore'

// ─── Supplies, as the app sees them today ────────────────────────
// The stock, the requests, the receipts and their purchases, the settings, and what follows
// from them: which items are low, whose quick count it is this week and
// whether it is done, and whether the full count is due. The page and the
// dashboard card both read this.

export function useSupplies() {
  const [items, setItems] = useState<SupplyItem[]>([])
  const [requests, setRequests] = useState<SupplyRequest[]>([])
  const [receipts, setReceipts] = useState<SupplyReceipt[]>([])
  const [purchases, setPurchases] = useState<SupplyPurchase[]>([])
  const [settings, setSettings] = useState<SuppliesSettings>(DEFAULT_SUPPLIES_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const jobs = useOfficeJobs()

  const reload = useCallback(async () => {
    const [d, s] = await Promise.all([fetchSupplies(), loadSuppliesSettings()])
    if (d.error) { setMissing(isSuppliesMissing(d.error)); setLoading(false); return }
    setItems(d.items); setRequests(d.requests); setReceipts(d.receipts); setPurchases(d.purchases); setSettings(s); setMissing(false); setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])

  const active = useMemo(() => items.filter(i => i.is_active), [items])
  const low = useMemo(() => active.filter(isLow), [active])
  const needed = useMemo(() => requests.filter(r => r.status === 'needed'), [requests])
  const ordered = useMemo(() => requests.filter(r => r.status === 'ordered'), [requests])
  const full = useMemo(() => fullCountStatus(active, settings.fullCountDays), [active, settings.fullCountDays])

  // The quick count this week: whoever has the chosen job on the cleaning
  // day. Done when a quick count landed since the previous cleaning day.
  const week = useMemo(() => {
    const day = jobs.todays || jobs.next
    if (!day || day.everyone) return null
    const a = day.assignments.find(x => x.job.key === settings.countJobKey)
    if (!a) return null
    const prev = [...jobs.days].reverse().find(d => d.date < day.date)
    const since = prev ? prev.date + 'T00:00:00+09:00' : '1970-01-01'
    const done = active.filter(i => i.quick_check && i.last_count_kind === 'quick' && i.last_counted_at && i.last_counted_at >= since)
    const latest = done.map(i => i.last_counted_at as string).sort().pop() || null
    return { date: day.date, isToday: !!jobs.todays, personId: a.personId, job: a.job, done: done.length > 0, doneAt: latest, doneBy: latest ? done.find(i => i.last_counted_at === latest)?.last_counted_by || null : null }
  }, [jobs.todays, jobs.next, jobs.days, settings.countJobKey, active])

  return { items, active, requests, receipts, purchases, settings, setSettings, loading: loading || jobs.loading, missing, reload, low, needed, ordered, full, week, jobs }
}
