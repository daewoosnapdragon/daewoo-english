'use client'

import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { getKSTDateString } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import { saveSuppliesSettings } from '@/lib/supplies'
import { fmtQty, hasPacks, isLow, isPackWord, matchItem, matchRequest, parseReceiptLines, splitPacks, won, REQUEST_LABELS, type ReceiptLine, type RequestStatus, type SupplyItem, type SupplyRequest } from '@/lib/suppliesCore'
import { applyCount, applyReceipt, createRequest, fetchMovements, flagLow, saveItem, setItemActive, setRequestStatus, toggleRequester, updateRequest, type ItemDraft, type PurchaseDraft, type RequestDraft } from '@/lib/suppliesData'
import { printCountSheet } from './countSheet'
import { useSupplies } from './useSupplies'
import { AlertTriangle, Check, ClipboardCheck, Copy, ExternalLink, History, Loader2, Package, Plus, Printer, Receipt, RefreshCw, ShoppingCart, X } from 'lucide-react'

// ─── Supplies ────────────────────────────────────────────────────
// Four things on one page. Stock: the staples with an on-hand number (kept
// in single units, shown as packs and loose) and a par level; anyone
// presses Low. Requests: what someone needs, who else needs it, and
// whether it is ordered or here. Receipts: the lines from a receipt, with
// prices, pasted in; stock lines add to the stock and one-off lines are
// charged to a teacher or an event, and every line is a purchase the Budget
// page adds up. The box above them is the prompt to give Claude with the
// scan so it writes the lines in the right shape. Count: the weekly quick
// count by whoever has the chosen office job that week, the monthly full
// count, and the sheet to print for the clipboard. Nobody records what
// they take; the counts put the numbers right.

const KST = 'Asia/Seoul'
const fmtDay = (iso: string, ko: boolean) => new Date(iso.length === 10 ? iso + 'T12:00:00+09:00' : iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric' })
const fmtWhen = (iso: string, ko: boolean) => new Date(iso).toLocaleString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
const CATEGORIES = ['office', 'classroom', 'kitchen', 'cleaning', 'other']
const CAT_LABEL: Record<string, { en: string; ko: string }> = { office: { en: 'Office', ko: '사무' }, classroom: { en: 'Classroom', ko: '교실' }, kitchen: { en: 'Kitchen', ko: '주방' }, cleaning: { en: 'Cleaning', ko: '청소' }, other: { en: 'Other', ko: '기타' } }
const UNITS = ['each', 'ream', 'marker', 'roll', 'bottle', 'pad', 'stick', 'box', 'pack', 'carton']
const PACKS = ['box', 'pack', 'bag', 'carton', 'set']
const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-full'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'

type Tab = 'stock' | 'requests' | 'receipts' | 'count'

export default function SuppliesView() {
  const { currentTeacher, language, showToast } = useApp()
  const ko = language === 'ko'
  const me = currentTeacher?.id || ''
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher || currentTeacher?.english_class === 'Snapdragon'
  const { teachers } = useTeachers()
  const s = useSupplies()
  const [tab, setTab] = useState<Tab>('stock')
  useEffect(() => {
    const fromHash = () => { const h = (window.location.hash || '').slice(1); if (['stock', 'requests', 'receipts', 'count'].includes(h)) setTab(h as Tab) }
    fromHash(); window.addEventListener('hashchange', fromHash); return () => window.removeEventListener('hashchange', fromHash)
  }, [])
  const nameOf = (id: string | null | undefined) => teachers.find(t => t.id === id)?.name || (ko ? '누군가' : 'someone')
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const props: SectionProps = { s, me, ko, canManage, nameOf, fail, teachers: teachers.map(t => ({ id: t.id, name: t.name })) }

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'stock', label: ko ? '재고' : 'Stock', icon: <Package size={13} />, badge: s.low.length },
    { id: 'requests', label: ko ? '요청' : 'Requests', icon: <ShoppingCart size={13} />, badge: s.needed.length },
    { id: 'receipts', label: ko ? '영수증' : 'Receipts', icon: <Receipt size={13} /> },
    { id: 'count', label: ko ? '재고 조사' : 'Count', icon: <ClipboardCheck size={13} />, badge: (s.week && !s.week.done && s.week.personId === me ? 1 : 0) + (s.full.due && canManage ? 1 : 0) },
  ]

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '사무실' : 'The office'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '비품' : 'Supplies'}</h1>
        </div>
        <button onClick={s.reload} className={btn}><RefreshCw size={13} />{ko ? '새로고침' : 'Refresh'}</button>
      </div>

      {s.missing && <p className="mb-4 text-[12.5px] text-warn">{ko ? 'supabase/migration-supplies.sql을 먼저 실행하세요.' : 'The supplies tables are missing or out of date. Admin runs supabase/migration-supplies.sql once.'}</p>}

      {!s.loading && !s.missing && (
        <p className="text-[13px] text-ink-2 mb-5 leading-relaxed">
          {s.low.length ? <span className="text-warn font-medium">{s.low.length} {ko ? '개 부족' : s.low.length === 1 ? 'item low' : 'items low'}: {s.low.map(i => i.name).join(', ')}</span> : <span>{ko ? '부족한 비품 없음' : 'Nothing is low'}</span>}
          {' · '}{s.needed.length ? `${s.needed.length} ${ko ? '건 요청 대기' : s.needed.length === 1 ? 'request waiting' : 'requests waiting'}` : (ko ? '대기 중인 요청 없음' : 'no requests waiting')}
          {s.ordered.length ? ` · ${s.ordered.length} ${ko ? '건 주문됨' : 'ordered'}` : ''}
          {s.week && <>{' · '}{ko ? '이번 주 간단 조사' : 'quick count'} {fmtDay(s.week.date, ko)} · {nameOf(s.week.personId)}{s.week.done ? ' ✓' : ''}</>}
          {s.full.due && canManage && <span className="text-warn">{' · '}{ko ? '전체 조사 필요' : 'full count due'}</span>}
        </p>
      )}

      <div className="flex gap-1.5 flex-wrap mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); history.replaceState(null, '', `#${t.id}`) }} className={`h-8 px-3 rounded text-[12.5px] inline-flex items-center gap-1.5 border ${tab === t.id ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>
            {t.icon}{t.label}{t.badge ? <span className={`ml-0.5 text-[10.5px] font-semibold rounded-full px-1.5 ${tab === t.id ? 'bg-paper text-ink' : 'bg-warn-soft text-warn'}`}>{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {s.loading ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : s.missing ? null : (
        <>
          {tab === 'stock' && <StockSection {...props} />}
          {tab === 'requests' && <RequestsSection {...props} />}
          {tab === 'receipts' && <ReceiptsSection {...props} />}
          {tab === 'count' && <CountSection {...props} />}
        </>
      )}
    </div>
  )
}

type S = ReturnType<typeof useSupplies>
interface SectionProps { s: S; me: string; ko: boolean; canManage: boolean; nameOf: (id: string | null | undefined) => string; fail: (e: string | null) => boolean; teachers: { id: string; name: string }[] }

const catLabel = (c: string, ko: boolean) => CAT_LABEL[c] ? (ko ? CAT_LABEL[c].ko : CAT_LABEL[c].en) : c
const placeOf = (i: SupplyItem, ko: boolean) => [i.cabinet, i.shelf].filter(Boolean).join(' · ') || (ko ? '자리 미정' : 'No place yet')

// ─── Stock ───────────────────────────────────────────────────────
function StockSection({ s, me, ko, canManage, nameOf, fail }: SectionProps) {
  const { showToast, confirmDialog } = useApp()
  const [editing, setEditing] = useState<SupplyItem | 'new' | null>(null)
  const [history, setHistory] = useState<SupplyItem | null>(null)
  const [showRemoved, setShowRemoved] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)
  const placed = s.active.some(i => i.cabinet || i.shelf)
  const [by, setBy] = useState<'category' | 'place'>('category')
  const groups = useMemo(() => {
    const m = new Map<string, SupplyItem[]>()
    s.active.forEach(i => { const k = by === 'place' && placed ? placeOf(i, ko) : (i.category || 'other'); m.set(k, [...(m.get(k) || []), i]) })
    const keys = by === 'place' && placed ? Array.from(m.keys()).sort() : [...CATEGORIES.filter(c => m.has(c)), ...Array.from(m.keys()).filter(c => !CATEGORIES.includes(c))]
    return keys.map(k => ({ key: k, title: by === 'place' && placed ? k : catLabel(k, ko), items: m.get(k)!.sort((a, b) => a.name.localeCompare(b.name)) }))
  }, [s.active, by, placed, ko])
  const removed = s.items.filter(i => !i.is_active)
  const low = async (i: SupplyItem) => { setBusy(i.id); if (!fail(await flagLow(i, me))) { showToast(ko ? `${i.name}: 부족으로 표시` : `${i.name} marked low`); await s.reload() } setBusy(null) }
  const remove = async (i: SupplyItem) => {
    if (!await confirmDialog({ title: ko ? '목록에서 제거' : 'Remove from stock', message: ko ? `${i.name}을(를) 목록에서 뺍니다. 기록은 남습니다.` : `${i.name} comes off the list. Its history stays.`, confirmLabel: ko ? '제거' : 'Remove' })) return
    if (!fail(await setItemActive(i.id, i.name, false))) await s.reload()
  }
  return (
    <section>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <p className="text-[12.5px] text-ink-3">{ko ? '부족하면 "부족" 버튼을 누르세요. 다음 조사에서 지워집니다.' : 'Running out of something? Press Low. The flag clears at the next count.'}</p>
        <div className="flex items-center gap-2">
          {placed && <div className="flex gap-1">{(['category', 'place'] as const).map(k => <button key={k} onClick={() => setBy(k)} className={`h-7 px-2 rounded text-[11.5px] border ${by === k ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2'}`}>{k === 'category' ? (ko ? '분류별' : 'By category') : (ko ? '위치별' : 'By place')}</button>)}</div>}
          <button onClick={() => setEditing('new')} className={btn}><Plus size={13} />{ko ? '품목 추가' : 'Add an item'}</button>
        </div>
      </div>
      {s.active.length === 0 && <p className="text-[12.5px] text-ink-3">{ko ? '품목이 없습니다.' : 'No items yet.'}</p>}
      {groups.map(g => (
        <div key={g.key} className="mb-6">
          <p className="eyebrow mb-1.5">{g.title}</p>
          <table className="w-full text-[12.5px]">
            <thead><tr className="text-left text-ink-3 border-b border-rule-2"><th className="font-normal py-1 pr-3">{ko ? '품목' : 'Item'}</th><th className="font-normal py-1 pr-3 w-44">{ko ? '보유' : 'On hand'}</th><th className="font-normal py-1 pr-3 w-28">{ko ? '최소' : 'Keep'}</th><th className="font-normal py-1 pr-3 w-40">{ko ? '상태' : 'Status'}</th><th className="font-normal py-1 pr-3 hidden lg:table-cell">{ko ? '마지막 조사' : 'Last counted'}</th><th className="py-1 w-44"></th></tr></thead>
            <tbody className="divide-y divide-rule">
              {g.items.map(i => {
                const lowNow = isLow(i), under = i.on_hand < i.par
                return (
                  <tr key={i.id} className="table-row-hover">
                    <td className="py-1.5 pr-3">
                      <span className="text-ink font-medium">{i.name}</span>
                      {i.link && <a href={i.link} target="_blank" rel="noreferrer" className="ml-1.5 text-ink-3 hover:text-accent inline-flex align-middle" title={ko ? '구매 링크' : 'Where to buy'}><ExternalLink size={11} /></a>}
                      <span className="block text-[11px] text-ink-3">
                        {hasPacks(i) ? `${i.pack_name} of ${num(Number(i.pack_size))} ${i.unit}` : i.unit}
                        {i.last_price != null ? ` · ${won(i.last_price, ko)} ${ko ? '/' : 'a'} ${i.unit}${i.last_price_at ? ` · ${fmtDay(i.last_price_at, ko)}` : ''}` : ''}
                        {by !== 'place' && (i.cabinet || i.shelf) ? ` · ${placeOf(i, ko)}` : ''}
                        {i.notes ? ` · ${i.notes}` : ''}
                      </span>
                    </td>
                    <td className={`py-1.5 pr-3 tabular-nums ${under ? 'text-warn font-semibold' : 'text-ink'}`}>{fmtQty(i, i.on_hand)}{hasPacks(i) && i.on_hand >= Number(i.pack_size) ? <span className="block text-[11px] font-normal text-ink-3">{num(i.on_hand)} {i.unit}</span> : null}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-ink-3">{fmtQty(i, i.par)}</td>
                    <td className="py-1.5 pr-3">
                      {lowNow
                        ? <span className="inline-flex items-center gap-1 text-[11.5px] px-1.5 py-0.5 rounded bg-warn-soft text-warn"><AlertTriangle size={11} />{under ? (ko ? '최소 미만' : 'Under par') : (ko ? `${nameOf(i.low_flagged_by)} 표시 · ${fmtDay(i.low_flagged_at!, ko)}` : `Low · ${nameOf(i.low_flagged_by)}, ${fmtDay(i.low_flagged_at!, ko)}`)}</span>
                        : <span className="text-[11.5px] text-good">{ko ? '충분' : 'OK'}</span>}
                    </td>
                    <td className="py-1.5 pr-3 text-ink-3 hidden lg:table-cell">{i.last_counted_at ? `${fmtDay(i.last_counted_at, ko)} · ${nameOf(i.last_counted_by)} · ${i.last_count_kind === 'full' ? (ko ? '전체' : 'full') : (ko ? '간단' : 'quick')}` : (ko ? '아직 없음' : 'never')}</td>
                    <td className="py-1.5 text-right whitespace-nowrap">
                      <button onClick={() => low(i)} disabled={busy === i.id || lowNow} className={btnS} title={ko ? '부족으로 표시' : 'Say this is running low'}><AlertTriangle size={11} />{ko ? '부족' : 'Low'}</button>
                      <button onClick={() => setHistory(i)} className={`${btnS} ml-1`} title={ko ? '변동 기록' : 'Every change to this number'}><History size={11} /></button>
                      <button onClick={() => setEditing(i)} className={`${btnS} ml-1`}>{ko ? '수정' : 'Edit'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      {removed.length > 0 && (
        <div className="mt-2">
          <button onClick={() => setShowRemoved(v => !v)} className="text-[12px] text-ink-3 hover:text-ink">{showRemoved ? (ko ? '제거된 품목 숨기기' : 'Hide removed items') : `${removed.length} ${ko ? '개 제거된 품목 보기' : 'removed items'}`}</button>
          {showRemoved && <ul className="mt-1.5 text-[12.5px] text-ink-3 space-y-1">{removed.map(i => <li key={i.id} className="flex items-center gap-2">{i.name}{canManage && <button onClick={async () => { if (!fail(await setItemActive(i.id, i.name, true))) s.reload() }} className={btnS}>{ko ? '되돌리기' : 'Restore'}</button>}</li>)}</ul>}
        </div>
      )}
      {editing && <ItemModal item={editing === 'new' ? null : editing} ko={ko} canRemove={canManage && editing !== 'new'} onClose={() => setEditing(null)} onRemove={editing !== 'new' ? () => { const i = editing; setEditing(null); remove(i) } : undefined} onSave={async d => { const r = await saveItem(editing === 'new' ? null : editing.id, d, me); if (fail(r.error)) return false; setEditing(null); await s.reload(); return true }} />}
      {history && <HistoryModal item={history} ko={ko} nameOf={nameOf} onClose={() => setHistory(null)} />}
    </section>
  )
}

/** Packs and loose for a number in single units, as two inputs. */
function PackInputs({ item, value, onChange, ko }: { item: Pick<SupplyItem, 'unit' | 'pack_size' | 'pack_name'>; value: number; onChange: (n: number) => void; ko: boolean }) {
  const packs = hasPacks(item)
  const sp = splitPacks(item, value)
  const [p, setP] = useState(String(sp.packs)), [l, setL] = useState(String(sp.loose))
  useEffect(() => { const x = splitPacks(item, value); if (Number(p) * Number(item.pack_size || 1) + Number(l) !== value) { setP(String(x.packs)); setL(String(x.loose)) } }, [value]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!packs) return <div className="flex items-center gap-2"><input type="number" min={0} step="any" value={l} onFocus={e => e.target.select()} onChange={e => { setL(e.target.value); onChange(Math.max(0, Number(e.target.value) || 0)) }} className={`${inp} max-w-[90px] tabular-nums`} /><span className="text-[11.5px] text-ink-3">{item.unit}</span></div>
  const ps = Number(item.pack_size)
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input type="number" min={0} step="1" value={p} onFocus={e => e.target.select()} onChange={e => { setP(e.target.value); onChange(Math.max(0, (Number(e.target.value) || 0) * ps + (Number(l) || 0))) }} className={`${inp} max-w-[80px] tabular-nums`} /><span className="text-[11.5px] text-ink-3">{item.pack_name || 'packs'}</span>
      <span className="text-ink-3">+</span>
      <input type="number" min={0} step="any" value={l} onFocus={e => e.target.select()} onChange={e => { setL(e.target.value); onChange(Math.max(0, (Number(p) || 0) * ps + (Number(e.target.value) || 0))) }} className={`${inp} max-w-[80px] tabular-nums`} /><span className="text-[11.5px] text-ink-3">{item.unit}</span>
      <span className="text-[11.5px] text-ink-3">= {num(value)} {item.unit}</span>
    </div>
  )
}

function ItemModal({ item, ko, canRemove, onClose, onSave, onRemove }: { item: SupplyItem | null; ko: boolean; canRemove: boolean; onClose: () => void; onSave: (d: ItemDraft) => Promise<boolean>; onRemove?: () => void }) {
  const [d, setD] = useState<ItemDraft & { aliasText: string; packs: boolean }>({ name: item?.name || '', unit: item?.unit || 'each', category: item?.category || 'office', par: item?.par ?? 1, quick_check: item?.quick_check ?? true, link: item?.link || '', aliases: item?.aliases || [], aliasText: (item?.aliases || []).join(', '), notes: item?.notes || '', on_hand: item?.on_hand ?? 0, pack_size: item?.pack_size ?? null, pack_name: item?.pack_name || '', packs: !!item && hasPacks(item), cabinet: item?.cabinet || '', shelf: item?.shelf || '' })
  const [saving, setSaving] = useState(false)
  const row = 'grid grid-cols-[130px_1fr] items-center gap-3'
  const lbl = 'text-[12px] text-ink-3'
  const packed = { unit: d.unit || 'each', pack_size: d.packs ? d.pack_size : null, pack_name: d.pack_name }
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded shadow-xl w-full max-w-[560px] p-5 max-h-[92vh] overflow-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-[20px] leading-none text-ink">{item ? item.name : (ko ? '새 품목' : 'New item')}</h3><button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={16} /></button></div>
        <div className="space-y-2.5">
          <div className={row}><span className={lbl}>{ko ? '이름' : 'Name'}</span><input autoFocus value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className={inp} /></div>
          <div className={row}><span className={lbl}>{ko ? '분류' : 'Category'}</span><select value={d.category} onChange={e => setD({ ...d, category: e.target.value })} className={sel}>{CATEGORIES.map(c => <option key={c} value={c}>{catLabel(c, ko)}</option>)}</select></div>
          <div className={row}><span className={lbl}>{ko ? '낱개 단위' : 'Counted in'}</span><div className="flex gap-2 items-center"><input list="supply-units" value={d.unit} onChange={e => setD({ ...d, unit: e.target.value })} className={`${inp} max-w-[140px]`} /><datalist id="supply-units">{UNITS.map(u => <option key={u} value={u} />)}</datalist><span className="text-[11.5px] text-ink-3">{ko ? '낱개로 세는 단위: 연, 자루, 롤, 병' : 'the single thing you count: ream, marker, roll, bottle'}</span></div></div>
          <div className={row}><span className={lbl}>{ko ? '묶음' : 'Comes in packs'}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2"><input type="checkbox" checked={d.packs} onChange={e => setD({ ...d, packs: e.target.checked, pack_size: e.target.checked ? (d.pack_size || 10) : d.pack_size, pack_name: e.target.checked ? (d.pack_name || 'pack') : d.pack_name })} />{ko ? '예' : 'Yes'}</label>
              {d.packs && <><span className="text-[12px] text-ink-3">{ko ? '묶음 이름' : 'a'}</span><input list="supply-packs" value={d.pack_name} onChange={e => setD({ ...d, pack_name: e.target.value })} className={`${inp} max-w-[100px]`} /><datalist id="supply-packs">{PACKS.map(u => <option key={u} value={u} />)}</datalist><span className="text-[12px] text-ink-3">{ko ? '당' : 'of'}</span><input type="number" min={2} step="1" value={d.pack_size ?? ''} onChange={e => setD({ ...d, pack_size: Number(e.target.value) || null })} className={`${inp} max-w-[70px]`} /><span className="text-[12px] text-ink-3">{d.unit || 'each'}</span></>}
            </div>
          </div>
          {!item && <div className={row}><span className={lbl}>{ko ? '현재 보유' : 'On hand now'}</span><PackInputs item={packed} value={d.on_hand || 0} onChange={n => setD({ ...d, on_hand: n })} ko={ko} /></div>}
          <div className={row}><span className={lbl}>{ko ? '최소 보유' : 'Keep at least'}</span><PackInputs item={packed} value={d.par} onChange={n => setD({ ...d, par: n })} ko={ko} /></div>
          <div className={row}><span className={lbl}>{ko ? '간단 조사' : 'Quick count'}</span><label className="inline-flex items-center gap-2 text-[12.5px] text-ink-2"><input type="checkbox" checked={d.quick_check} onChange={e => setD({ ...d, quick_check: e.target.checked })} />{ko ? '주간 간단 조사에 포함' : 'in the weekly quick count'}</label></div>
          <div className={row}><span className={lbl}>{ko ? '구매 링크' : 'Link'}</span><input value={d.link} onChange={e => setD({ ...d, link: e.target.value })} placeholder="https://" className={inp} /></div>
          <div className={row}><span className={lbl}>{ko ? '다른 이름' : 'Also called'}</span><input value={d.aliasText} onChange={e => setD({ ...d, aliasText: e.target.value, aliases: e.target.value.split(/[,\n]/) })} placeholder={ko ? '영수증에 적히는 이름, 쉼표로 구분' : 'names receipts use, comma separated'} className={inp} /></div>
          <div className={row}><span className={lbl}>{ko ? '위치' : 'Where it lives'}</span><div className="flex gap-2 items-center flex-wrap"><input value={d.cabinet} onChange={e => setD({ ...d, cabinet: e.target.value })} placeholder={ko ? '캐비닛' : 'Cabinet'} className={`${inp} max-w-[130px]`} /><input value={d.shelf} onChange={e => setD({ ...d, shelf: e.target.value })} placeholder={ko ? '선반' : 'Shelf'} className={`${inp} max-w-[130px]`} /><span className="text-[11.5px] text-ink-3">{ko ? '정리 후에 채우세요' : 'fill in once the materials are organised'}</span></div></div>
          <div className={row}><span className={lbl}>{ko ? '메모' : 'Notes'}</span><input value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} className={inp} /></div>
          {item?.last_price != null && <div className={row}><span className={lbl}>{ko ? '최근 가격' : 'Last price'}</span><span className="text-[12.5px] text-ink-2">{won(item.last_price, ko)} {ko ? '/' : 'a'} {item.unit}{item.last_price_at ? ` · ${fmtDay(item.last_price_at, ko)}` : ''}</span></div>}
        </div>
        <div className="flex items-center justify-between gap-2 mt-5">
          {canRemove && onRemove ? <button onClick={onRemove} className={`${btn} text-bad`}>{ko ? '목록에서 제거' : 'Remove from stock'}</button> : <span />}
          <div className="flex gap-2"><button onClick={onClose} className={btn}>{ko ? '취소' : 'Cancel'}</button><button disabled={saving || !d.name.trim()} onClick={async () => { setSaving(true); const ok = await onSave({ ...d, pack_size: d.packs ? d.pack_size : null, pack_name: d.packs ? d.pack_name : '' }); if (!ok) setSaving(false) }} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button></div>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ item, ko, nameOf, onClose }: { item: SupplyItem; ko: boolean; nameOf: (id: string | null | undefined) => string; onClose: () => void }) {
  const [rows, setRows] = useState<Awaited<ReturnType<typeof fetchMovements>> | null>(null)
  useEffect(() => { fetchMovements(item.id).then(setRows) }, [item.id])
  const KIND: Record<string, { en: string; ko: string }> = { receipt: { en: 'Receipt', ko: '영수증' }, count: { en: 'Count', ko: '조사' }, adjust: { en: 'Adjusted', ko: '조정' } }
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded shadow-xl w-full max-w-[520px] p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-display text-[20px] leading-none text-ink">{item.name} <span className="text-ink-3 text-[14px] font-sans">· {ko ? '변동 기록' : 'history'}</span></h3><button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={16} /></button></div>
        {!rows ? <p className="text-[12.5px] text-ink-3">{ko ? '불러오는 중' : 'Loading'}</p> : rows.length === 0 ? <p className="text-[12.5px] text-ink-3">{ko ? '기록 없음' : 'No changes recorded yet.'}</p> : (
          <ul className="divide-y divide-rule text-[12.5px] max-h-[60vh] overflow-auto">
            {rows.map(r => <li key={r.id} className="py-1.5 flex items-baseline justify-between gap-3"><span className="text-ink-2"><span className="text-ink font-medium">{ko ? KIND[r.kind]?.ko || r.kind : KIND[r.kind]?.en || r.kind}</span>{r.kind === 'receipt' ? ` +${fmtQty(item, Number(r.qty))}` : ` → ${fmtQty(item, Number(r.on_hand_after))}`}{r.note ? <span className="text-ink-3"> · {r.note}</span> : null}</span><span className="text-ink-3 whitespace-nowrap">{fmtWhen(r.at, ko)} · {nameOf(r.by)}</span></li>)}
          </ul>
        )}
      </div>
    </div>
  )
}

// ─── Requests ────────────────────────────────────────────────────
function RequestsSection({ s, me, ko, canManage, nameOf, fail }: SectionProps) {
  const { showToast, confirmDialog } = useApp()
  const empty: RequestDraft = { name: '', quantity: 1, unit: '', purpose: '', link: '', item_id: null }
  const [d, setD] = useState<RequestDraft>(empty)
  const [adding, setAdding] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [editing, setEditing] = useState<SupplyRequest | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const linkTo = (name: string) => { const id = matchItem(name, s.active); const it = s.active.find(i => i.id === id); return { item_id: id, unit: it ? (hasPacks(it) ? it.pack_name : it.unit) : d.unit } }
  const add = async () => {
    setAdding(true)
    if (!fail(await createRequest(d, me))) { showToast(ko ? '요청을 적었습니다' : 'Request added'); setD(empty); await s.reload() }
    setAdding(false)
  }
  const move = async (r: SupplyRequest, status: RequestStatus) => {
    if (status === 'dropped' && !await confirmDialog({ title: ko ? '요청 취소' : 'Drop this request', message: `${r.name} ×${num(r.quantity)}`, confirmLabel: ko ? '취소하기' : 'Drop' })) return
    setBusy(r.id); if (!fail(await setRequestStatus(r, status, me))) await s.reload(); setBusy(null)
  }
  const meToo = async (r: SupplyRequest) => { setBusy(r.id); if (!fail(await toggleRequester(r, me))) await s.reload(); setBusy(null) }
  const open = s.requests.filter(r => r.status === 'needed' || r.status === 'ordered')
  const done = s.requests.filter(r => r.status === 'arrived' || r.status === 'dropped')
  const Row = ({ r }: { r: SupplyRequest }) => {
    const mine = r.requesters.includes(me)
    const item = r.item_id ? s.items.find(i => i.id === r.item_id) : null
    const bought = s.purchases.filter(p => p.request_id === r.id)
    return (
      <li className="py-2.5 flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] text-ink"><span className="font-medium">{r.name}</span> <span className="tabular-nums text-ink-2">× {num(r.quantity)}{r.unit ? ` ${r.unit}` : ''}</span>
            {r.link && <a href={r.link} target="_blank" rel="noreferrer" className="ml-1.5 text-ink-3 hover:text-accent inline-flex align-middle"><ExternalLink size={11} /></a>}
            <span className={`ml-2 text-[11px] px-1.5 py-0.5 rounded ${r.status === 'needed' ? 'bg-warn-soft text-warn' : r.status === 'ordered' ? 'bg-info-soft text-info' : r.status === 'arrived' ? 'bg-good-soft text-good' : 'bg-paper-2 text-ink-3'}`}>{ko ? REQUEST_LABELS[r.status].ko : REQUEST_LABELS[r.status].en}</span>
          </p>
          {r.purpose && <p className="text-[12px] text-ink-2 mt-0.5">{r.purpose}</p>}
          <p className="text-[11.5px] text-ink-3 mt-0.5">
            {ko ? '필요: ' : 'Needed by '}{r.requesters.map(nameOf).join(', ')} · {fmtDay(r.created_at, ko)}
            {r.status === 'ordered' && r.ordered_at ? ` · ${ko ? '주문' : 'ordered'} ${fmtDay(r.ordered_at, ko)} (${nameOf(r.ordered_by)})` : ''}
            {r.status === 'arrived' && r.arrived_at ? ` · ${ko ? '도착' : 'arrived'} ${fmtDay(r.arrived_at, ko)} (${nameOf(r.arrived_by)})` : ''}
            {bought.length ? ` · ${ko ? '구매' : 'bought'} ${bought.map(p => `${fmtDay(p.date, ko)} ${won(p.price, ko)}${p.kind === 'oneoff' ? ` → ${p.for_teacher_id ? nameOf(p.for_teacher_id) : (ko ? '사무실' : 'office')}` : ''}`).join(', ')}` : ''}
            {item && r.status !== 'arrived' ? ` · ${ko ? '재고' : 'in stock'}: ${fmtQty(item, item.on_hand)}` : ''}
          </p>
        </div>
        <div className="flex gap-1 flex-wrap justify-end">
          {(r.status === 'needed' || r.status === 'ordered') && <button onClick={() => meToo(r)} disabled={busy === r.id} className={`${btnS} ${mine ? 'text-ink' : ''}`}>{mine ? (ko ? '나도 필요 ✓' : 'Me too ✓') : (ko ? '나도 필요' : 'Me too')}</button>}
          {r.status === 'needed' && <button onClick={() => move(r, 'ordered')} disabled={busy === r.id} className={btnS}>{ko ? '주문함' : 'Ordered'}</button>}
          {r.status === 'ordered' && <button onClick={() => move(r, 'arrived')} disabled={busy === r.id} className={btnS}>{ko ? '도착' : 'Arrived'}</button>}
          {r.status === 'ordered' && <button onClick={() => move(r, 'needed')} disabled={busy === r.id} className={btnS} title={ko ? '주문 취소' : 'Not ordered after all'}>{ko ? '미주문' : 'Not ordered'}</button>}
          {(r.status === 'needed' || r.status === 'ordered') && (mine || canManage) && <button onClick={() => setEditing(r)} className={btnS}>{ko ? '수정' : 'Edit'}</button>}
          {(r.status === 'needed' || r.status === 'ordered') && (mine || canManage) && <button onClick={() => move(r, 'dropped')} disabled={busy === r.id} className={`${btnS} text-ink-3`}>{ko ? '취소' : 'Drop'}</button>}
          {r.status === 'dropped' && (mine || canManage) && <button onClick={() => move(r, 'needed')} disabled={busy === r.id} className={btnS}>{ko ? '다시 필요' : 'Needed again'}</button>}
        </div>
      </li>
    )
  }
  return (
    <section>
      <div className="border border-rule-2 rounded p-4 mb-6">
        <p className="eyebrow mb-2">{ko ? '필요한 것' : 'I need'}</p>
        <div className="grid grid-cols-1 md:grid-cols-[2fr_80px_100px_2fr] gap-2 mb-2">
          <div><input list="supply-names" value={d.name} onChange={e => setD({ ...d, name: e.target.value, ...linkTo(e.target.value) })} placeholder={ko ? '품목' : 'What'} className={inp} /><datalist id="supply-names">{s.active.map(i => <option key={i.id} value={i.name} />)}</datalist></div>
          <input type="number" min={0} step="any" value={d.quantity} onChange={e => setD({ ...d, quantity: Number(e.target.value) })} className={inp} title={ko ? '수량' : 'How many'} />
          <input list="supply-units" value={d.unit} onChange={e => setD({ ...d, unit: e.target.value })} placeholder={ko ? '단위' : 'unit'} className={inp} />
          <datalist id="supply-units">{[...PACKS, ...UNITS].map(u => <option key={u} value={u} />)}</datalist>
          <input value={d.purpose} onChange={e => setD({ ...d, purpose: e.target.value })} placeholder={ko ? '용도 (선택)' : 'What for (optional)'} className={inp} />
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <input value={d.link} onChange={e => setD({ ...d, link: e.target.value })} placeholder={ko ? '링크 (선택)' : 'Link to the item (optional)'} className={`${inp} flex-1 min-w-[200px]`} />
          <button onClick={add} disabled={adding || !d.name.trim()} className={btnP}>{adding ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{ko ? '요청' : 'Add request'}</button>
        </div>
        {d.item_id && <p className="text-[11.5px] text-ink-3 mt-1.5">{ko ? '재고 품목과 연결됨: ' : 'Matches a stock item: '}{s.active.find(i => i.id === d.item_id)?.name}</p>}
      </div>
      {open.length === 0 ? <p className="text-[12.5px] text-ink-3 mb-6">{ko ? '대기 중인 요청이 없습니다.' : 'Nothing is waiting.'}</p> : <ul className="divide-y divide-rule mb-6">{open.map(r => <Row key={r.id} r={r} />)}</ul>}
      {done.length > 0 && (
        <div>
          <button onClick={() => setShowDone(v => !v)} className="text-[12px] text-ink-3 hover:text-ink">{showDone ? (ko ? '완료된 요청 숨기기' : 'Hide arrived and dropped') : `${done.length} ${ko ? '건 완료·취소 보기' : 'arrived or dropped'}`}</button>
          {showDone && <ul className="divide-y divide-rule mt-1">{done.map(r => <Row key={r.id} r={r} />)}</ul>}
        </div>
      )}
      {editing && <RequestModal r={editing} ko={ko} items={s.active} onClose={() => setEditing(null)} onSave={async patch => { if (fail(await updateRequest(editing, patch))) return false; setEditing(null); await s.reload(); return true }} />}
    </section>
  )
}

function RequestModal({ r, ko, items, onClose, onSave }: { r: SupplyRequest; ko: boolean; items: SupplyItem[]; onClose: () => void; onSave: (p: Partial<Pick<SupplyRequest, 'name' | 'quantity' | 'unit' | 'purpose' | 'link' | 'item_id'>>) => Promise<boolean> }) {
  const [d, setD] = useState({ name: r.name, quantity: r.quantity, unit: r.unit, purpose: r.purpose, link: r.link, item_id: r.item_id })
  const [saving, setSaving] = useState(false)
  const row = 'grid grid-cols-[100px_1fr] items-center gap-3', lbl = 'text-[12px] text-ink-3'
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded shadow-xl w-full max-w-[480px] p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-[20px] leading-none text-ink">{ko ? '요청 수정' : 'Edit request'}</h3><button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={16} /></button></div>
        <div className="space-y-2.5">
          <div className={row}><span className={lbl}>{ko ? '품목' : 'What'}</span><input value={d.name} onChange={e => setD({ ...d, name: e.target.value, item_id: matchItem(e.target.value, items) })} className={inp} /></div>
          <div className={row}><span className={lbl}>{ko ? '수량' : 'How many'}</span><div className="flex gap-2"><input type="number" min={0} step="any" value={d.quantity} onChange={e => setD({ ...d, quantity: Number(e.target.value) })} className={`${inp} max-w-[90px]`} /><input value={d.unit} onChange={e => setD({ ...d, unit: e.target.value })} placeholder={ko ? '단위' : 'unit'} className={`${inp} max-w-[120px]`} /></div></div>
          <div className={row}><span className={lbl}>{ko ? '용도' : 'What for'}</span><input value={d.purpose} onChange={e => setD({ ...d, purpose: e.target.value })} className={inp} /></div>
          <div className={row}><span className={lbl}>{ko ? '링크' : 'Link'}</span><input value={d.link} onChange={e => setD({ ...d, link: e.target.value })} className={inp} /></div>
        </div>
        <div className="flex justify-end gap-2 mt-5"><button onClick={onClose} className={btn}>{ko ? '취소' : 'Cancel'}</button><button disabled={saving || !d.name.trim()} onClick={async () => { setSaving(true); const ok = await onSave({ ...d, name: d.name.trim() }); if (!ok) setSaving(false) }} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button></div>
      </div>
    </div>
  )
}

// ─── Receipts ────────────────────────────────────────────────────
/** A pasted line being checked. `goes` is where it lands; `packMode` means the quantity is in packs of the item. */
interface Draft extends ReceiptLine { goes: 'stock' | 'oneoff' | 'new' | 'skip'; item_id: string | null; packMode: boolean; request_id: string | null; for_teacher_id: string | null; purpose: string }

function ReceiptsSection({ s, me, ko, nameOf, fail, teachers }: SectionProps) {
  const { showToast } = useApp()
  const [date, setDate] = useState(getKSTDateString())
  const [note, setNote] = useState('')
  const [text, setText] = useState('')
  const [lines, setLines] = useState<Draft[] | null>(null)
  const [applying, setApplying] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const openReqs = s.requests.filter(r => r.status === 'needed' || r.status === 'ordered')
  const prompt = useMemo(() => {
    const names = s.active.map(i => `${i.name}${i.aliases.length ? ` (${i.aliases.join(', ')})` : ''}${hasPacks(i) ? ` [${i.pack_name} of ${num(Number(i.pack_size))}]` : ''}`).join('; ')
    return `Read this receipt and list every item on it, one per line, as "name | quantity | price". Quantity is how many were bought with its unit when the receipt shows one (2 boxes, 3 packs, 1). Price is that line's total in won, digits only, no currency sign. Where an item is one of these stock items, use that stock item's name exactly (other names it goes by are in brackets; what it comes in is in square brackets): ${names}. Anything else, write the name as it appears. No headings, no totals, no other text.`
  }, [s.active])
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { showToast(ko ? '복사할 수 없습니다' : 'Could not copy') } }
  const read = () => {
    const parsed = parseReceiptLines(text)
    if (parsed.length === 0) { showToast(ko ? '읽을 줄이 없습니다' : 'No lines to read'); return }
    setLines(parsed.map(l => {
      const reqId = matchRequest(l.name, openReqs)
      const req = reqId ? openReqs.find(r => r.id === reqId) : null
      const itemId = matchItem(l.name, s.active) || req?.item_id || null
      const item = itemId ? s.active.find(i => i.id === itemId) : null
      return { ...l, goes: item ? 'stock' : 'oneoff', item_id: item ? item.id : null, packMode: item ? isPackWord(item, l.unit) : false, request_id: reqId, for_teacher_id: req ? (req.requesters[0] || null) : null, purpose: req?.purpose || '' }
    }))
  }
  const upd = (i: number, patch: Partial<Draft>) => setLines(ls => ls!.map((x, j) => j === i ? { ...x, ...patch } : x))
  const total = (lines || []).filter(l => l.goes !== 'skip').reduce((a, l) => a + (Number(l.price) || 0), 0)
  const apply = async () => {
    if (!lines) return
    setApplying(true)
    let items = s.active
    const final: PurchaseDraft[] = []
    for (const l of lines) {
      if (l.goes === 'skip') continue
      let itemId = l.item_id
      if (l.goes === 'new') {
        const r = await saveItem(null, { name: l.name, unit: l.unit && !isPackWord({ unit: '', pack_size: 2, pack_name: '' }, l.unit) ? l.unit : 'each', category: 'office', par: 1, quick_check: true, link: '', aliases: [], notes: '', on_hand: 0, pack_size: null, pack_name: '', cabinet: '', shelf: '' }, me)
        if (fail(r.error)) { setApplying(false); return }
        itemId = r.id
        if (itemId) items = [...items, { id: itemId, name: l.name, on_hand: 0, unit: 'each', pack_size: null, pack_name: '' } as SupplyItem]
      }
      const item = itemId ? items.find(i => i.id === itemId) : null
      const stock = (l.goes === 'stock' || l.goes === 'new') && !!item
      const qty = stock && item && l.packMode ? l.qty * Number(item.pack_size) : l.qty
      const asBought = `${num(l.qty)} ${l.unit || (stock && item ? (l.packMode ? item.pack_name : item.unit) : '')}`.trim()
      final.push({ name: l.name, qty, as_bought: asBought, price: Number(l.price) || 0, kind: stock ? 'stock' : 'oneoff', item_id: stock ? itemId : null, request_id: l.request_id, for_teacher_id: stock ? null : l.for_teacher_id, purpose: l.purpose })
    }
    if (final.length === 0) { showToast(ko ? '남은 줄이 없습니다' : 'No lines left to add'); setApplying(false); return }
    if (!fail(await applyReceipt(date, note, text, final, items, me))) {
      const stockN = final.filter(l => l.kind === 'stock').length, oneN = final.length - stockN
      showToast(ko ? `영수증 저장: 재고 ${stockN}줄, 단건 ${oneN}줄, ${won(total, ko)}` : `Receipt saved: ${stockN} stock, ${oneN} one-off, ${won(total, ko)}`)
      setLines(null); setText(''); setNote('')
      await s.reload()
    }
    setApplying(false)
  }
  return (
    <section>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="border border-rule-2 rounded p-4">
          <p className="eyebrow mb-1.5">{ko ? '1. Claude에게 줄 지시문' : '1. What to tell Claude'}</p>
          <p className="text-[12.5px] text-ink-2 mb-2 leading-relaxed">{ko ? '스캔한 영수증을 Claude에 넣고 이 지시문을 붙여넣으세요. 재고 품목 이름이 들어 있어 Claude가 같은 이름으로 적어 줍니다.' : 'Put the scanned receipt into Claude with this text. It carries the stock names, so Claude writes the lines with the same names and they match on their own.'}</p>
          <textarea readOnly value={prompt} className="w-full h-28 p-2 bg-paper-2 border border-rule rounded text-[11.5px] text-ink-2 leading-snug resize-none" />
          <button onClick={copy} className={`${btn} mt-2`}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? (ko ? '복사됨' : 'Copied') : (ko ? '지시문 복사' : 'Copy the prompt')}</button>
        </div>
        <div className="border border-rule-2 rounded p-4">
          <p className="eyebrow mb-1.5">{ko ? '2. 줄을 붙여넣기' : '2. Paste the lines'}</p>
          <div className="flex gap-2 mb-2 flex-wrap">
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={sel} />
            <input value={note} onChange={e => setNote(e.target.value)} placeholder={ko ? '가게 / 메모' : 'Shop or note (optional)'} className={`${inp} flex-1 min-w-[160px]`} />
          </div>
          <textarea value={text} onChange={e => { setText(e.target.value); setLines(null) }} placeholder={'A4 paper | 2 boxes | 45000\nWhiteboard markers | 3 packs | 12000\nHalloween stickers | 1 | 8000'} className="w-full h-28 p-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink font-mono leading-snug" />
          <div className="flex items-center justify-between gap-2 mt-2">
            <span className="text-[11.5px] text-ink-3">{ko ? '한 줄에 하나: "이름 | 수량 | 가격". "이름 x2", "2 x 이름"도 됩니다.' : 'One per line: “name | quantity | price”. “name x2” and “2 x name” work too.'}</span>
            <button onClick={read} disabled={!text.trim()} className={btn}>{ko ? '줄 읽기' : 'Read the lines'}</button>
          </div>
        </div>
      </div>

      {lines && (
        <div className="border border-rule-2 rounded p-4 mb-8">
          <p className="eyebrow mb-1">{ko ? '3. 확인하고 저장' : '3. Check, then save'}</p>
          <p className="text-[12px] text-ink-3 mb-3">{ko ? '재고 줄은 품목에 더해지고 사무실 예산으로 잡힙니다. 단건 줄은 교사나 행사 예산으로 잡히고 재고는 건드리지 않습니다.' : 'A stock line adds to its item and goes on the office budget. A one-off line goes on a teacher’s budget, or an event’s, and leaves the stock alone.'}</p>
          <ul className="divide-y divide-rule">
            {lines.map((l, i) => {
              const it = l.item_id ? s.active.find(x => x.id === l.item_id) : null
              const stock = (l.goes === 'stock' && it) || l.goes === 'new'
              const singles = it && l.packMode ? l.qty * Number(it.pack_size) : l.qty
              return (
                <li key={i} className={`py-2.5 ${l.goes === 'skip' ? 'opacity-50' : ''}`}>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto] gap-2 md:gap-4 items-start">
                    <div className="min-w-0"><p className="text-[13px] text-ink font-medium">{l.name}</p>{l.raw && l.raw !== l.name && <p className="text-[11px] text-ink-3 font-mono truncate">{l.raw}</p>}</div>
                    <div className="flex items-center gap-1.5">
                      <input type="number" min={0} step="any" value={l.qty} onChange={e => upd(i, { qty: Number(e.target.value) })} className={`${inp} max-w-[70px] tabular-nums`} />
                      {it && hasPacks(it)
                        ? <select value={l.packMode ? 'pack' : 'unit'} onChange={e => upd(i, { packMode: e.target.value === 'pack' })} className={sel}><option value="pack">{it.pack_name} {ko ? `(${num(Number(it.pack_size))} ${it.unit})` : `of ${num(Number(it.pack_size))}`}</option><option value="unit">{it.unit}</option></select>
                        : <span className="text-[11.5px] text-ink-3 w-16">{l.unit || (it ? it.unit : '')}</span>}
                      {it && l.packMode && <span className="text-[11px] text-ink-3 whitespace-nowrap">= {num(singles)} {it.unit}</span>}
                    </div>
                    <div className="flex items-center gap-1.5"><span className="text-[11.5px] text-ink-3">{ko ? '가격' : 'Price'}</span><input type="number" min={0} step="1" value={l.price ?? ''} onChange={e => upd(i, { price: e.target.value === '' ? undefined : Number(e.target.value) })} placeholder="0" className={`${inp} max-w-[100px] tabular-nums`} /><span className="text-[11.5px] text-ink-3">{ko ? '원' : 'won'}</span></div>
                    <button onClick={() => setLines(ls => ls!.filter((_, j) => j !== i))} className="text-ink-3 hover:text-ink justify-self-end" title={ko ? '이 줄 빼기' : 'Leave this line out'}><X size={13} /></button>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <select value={l.goes === 'stock' ? (l.item_id || '') : l.goes} onChange={e => { const v = e.target.value; if (v === 'oneoff' || v === 'new' || v === 'skip') upd(i, { goes: v, item_id: v === 'oneoff' ? null : l.item_id }); else { const item = s.active.find(x => x.id === v); upd(i, { goes: 'stock', item_id: v, packMode: item ? isPackWord(item, l.unit) : false }) } }} className={`${sel} max-w-[280px]`}>
                      <option value="oneoff">{ko ? '단건 구매 (교사 또는 행사)' : 'One-off: a teacher or an event'}</option>
                      <option value="new">{ko ? `+ 새 재고 품목: ${l.name}` : `+ New stock item: ${l.name}`}</option>
                      <option value="skip">{ko ? '— 이 줄 건너뛰기 —' : '— skip this line —'}</option>
                      <optgroup label={ko ? '재고에 더하기' : 'Stock: add to'}>{s.active.map(x => <option key={x.id} value={x.id}>{x.name} · {fmtQty(x, x.on_hand)}</option>)}</optgroup>
                    </select>
                    {it && l.goes === 'stock' && <span className="text-[11px] text-ink-3">{fmtQty(it, it.on_hand)} → {fmtQty(it, it.on_hand + singles)}</span>}
                    {!stock && l.goes !== 'skip' && (
                      <>
                        <select value={l.for_teacher_id || ''} onChange={e => upd(i, { for_teacher_id: e.target.value || null })} className={sel}>
                          <option value="">{ko ? '사무실 / 행사' : 'Office or event (no teacher)'}</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <input value={l.purpose} onChange={e => upd(i, { purpose: e.target.value })} placeholder={ko ? '용도: 공개수업, 핼러윈 …' : 'What for: open class, Halloween…'} className={`${inp} max-w-[220px]`} />
                      </>
                    )}
                    {openReqs.length > 0 && l.goes !== 'skip' && (
                      <select value={l.request_id || ''} onChange={e => { const id = e.target.value || null; const req = id ? openReqs.find(r => r.id === id) : null; upd(i, { request_id: id, ...(req && !stock ? { for_teacher_id: l.for_teacher_id || req.requesters[0] || null, purpose: l.purpose || req.purpose } : {}) }) }} className={`${sel} max-w-[240px]`} title={ko ? '이 줄이 답하는 요청' : 'The request this line answers; it is marked arrived'}>
                        <option value="">{ko ? '요청 없음' : 'Not for a request'}</option>
                        {openReqs.map(r => <option key={r.id} value={r.id}>{ko ? '요청: ' : 'Answers: '}{r.name} ({r.requesters.map(nameOf).join(', ')})</option>)}
                      </select>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
            <span className="text-[13px] text-ink">{ko ? '합계' : 'Total'}: <span className="font-semibold tabular-nums">{won(total, ko)}</span></span>
            <div className="flex gap-2">
              <button onClick={() => setLines(null)} className={btn}>{ko ? '취소' : 'Cancel'}</button>
              <button onClick={apply} disabled={applying || lines.every(l => l.goes === 'skip')} className={btnP}>{applying ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '영수증 저장' : 'Save the receipt'}</button>
            </div>
          </div>
        </div>
      )}

      <div>
        <p className="eyebrow mb-2">{ko ? '입력한 영수증' : 'Receipts entered'}</p>
        {s.receipts.length === 0 ? <p className="text-[12.5px] text-ink-3">{ko ? '아직 없음' : 'None yet.'}</p> : (
          <ul className="divide-y divide-rule text-[12.5px]">
            {s.receipts.map(r => {
              const ps = s.purchases.filter(p => p.receipt_id === r.id)
              return (
                <li key={r.id} className="py-2">
                  <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="w-full text-left flex items-baseline justify-between gap-3">
                    <span className="text-ink">{fmtDay(r.date, ko)}{r.note ? <span className="text-ink-2"> · {r.note}</span> : null} <span className="text-ink-3">· {ps.length} {ko ? '줄' : ps.length === 1 ? 'line' : 'lines'}</span> <span className="font-semibold tabular-nums">{won(r.total, ko)}</span></span>
                    <span className="text-ink-3 whitespace-nowrap">{nameOf(r.applied_by)} · {fmtWhen(r.applied_at, ko)}</span>
                  </button>
                  {openId === r.id && <ul className="mt-1 pl-3 text-ink-2 space-y-0.5">{ps.map(p => <li key={p.id} className="flex justify-between gap-3"><span>{p.name} × {p.as_bought || num(p.qty)}<span className="text-ink-3"> · {p.kind === 'stock' ? (ko ? '재고' : 'stock') : `${ko ? '단건' : 'one-off'} → ${p.for_teacher_id ? nameOf(p.for_teacher_id) : (ko ? '사무실/행사' : 'office / event')}${p.purpose ? ` · ${p.purpose}` : ''}`}</span></span><span className="tabular-nums">{won(p.price, ko)}</span></li>)}</ul>}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}

// ─── Count ───────────────────────────────────────────────────────
function CountSection({ s, me, ko, canManage, nameOf, fail }: SectionProps) {
  const { showToast } = useApp()
  const [kind, setKind] = useState<'quick' | 'full'>(s.full.due && canManage ? 'full' : 'quick')
  const [vals, setVals] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [cfg, setCfg] = useState(s.settings)
  const [savingCfg, setSavingCfg] = useState(false)
  useEffect(() => { setCfg(s.settings) }, [s.settings])
  const rows = useMemo(() => (kind === 'quick' ? s.active.filter(i => i.quick_check) : s.active).slice().sort((a, b) => (a.cabinet + a.shelf + a.category).localeCompare(b.cabinet + b.shelf + b.category) || a.name.localeCompare(b.name)), [kind, s.active])
  useEffect(() => { setVals({}) }, [kind])
  const val = (i: SupplyItem) => vals[i.id] ?? i.on_hand
  const changed = rows.filter(i => vals[i.id] !== undefined && vals[i.id] !== i.on_hand).length
  const save = async () => {
    setSaving(true)
    const counts = rows.map(i => ({ item: i, qty: Math.max(0, val(i)) }))
    if (!fail(await applyCount(kind, counts, me))) { showToast(ko ? `${kind === 'quick' ? '간단' : '전체'} 조사 저장: ${counts.length}개 품목` : `${kind === 'quick' ? 'Quick' : 'Full'} count saved for ${counts.length} items`); setVals({}); await s.reload() }
    setSaving(false)
  }
  const saveCfg = async () => { setSavingCfg(true); if (!fail(await saveSuppliesSettings(cfg))) { s.setSettings(cfg); logActivity('settings', 'Supplies: count settings', { path: '/supplies' }); showToast(ko ? '저장됨' : 'Saved') } setSavingCfg(false) }
  const print = () => { printCountSheet(rows, kind, new Date().toLocaleDateString('en-US', { timeZone: KST, year: 'numeric', month: 'long', day: 'numeric' })); logActivity('printed', `Supply count sheet (${kind})`, { path: '/supplies' }) }
  const jobs = s.jobs.cfg?.jobs || []
  const w = s.week
  const placed = rows.some(i => i.cabinet || i.shelf)
  let lastGroup = ''
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border border-rule-2 rounded p-4">
          <p className="eyebrow mb-1">{ko ? '이번 주 간단 조사' : 'Quick count this week'}</p>
          {!w ? <p className="text-[12.5px] text-ink-3">{s.jobs.ready ? (ko ? '이번 주에는 담당이 없습니다.' : 'No one has it this week.') : (ko ? '사무실 청소 순번이 설정되면 담당이 정해집니다.' : 'Set up the office jobs rotation in Settings and the person is picked from it.')}</p> : (
            <>
              <p className="text-[14px] text-ink"><span className="font-medium">{nameOf(w.personId)}</span> <span className="text-ink-2">· {w.job.name} · {w.isToday ? (ko ? '오늘' : 'today') : fmtDay(w.date, ko)}</span></p>
              <p className={`text-[12px] mt-0.5 ${w.done ? 'text-good' : 'text-ink-3'}`}>{w.done ? `${ko ? '완료' : 'Done'} · ${nameOf(w.doneBy)} · ${fmtWhen(w.doneAt!, ko)}` : (ko ? '아직 안 함' : 'Not done yet')}</p>
            </>
          )}
        </div>
        <div className="border border-rule-2 rounded p-4">
          <p className="eyebrow mb-1">{ko ? '전체 조사' : 'Full count'}</p>
          <p className="text-[14px] text-ink">{s.full.last ? <>{ko ? '마지막' : 'Last'}: {fmtDay(s.full.last, ko)} <span className="text-ink-2">· {s.full.daysAgo} {ko ? '일 전' : 'days ago'}</span></> : (ko ? '아직 없음' : 'Never done')}</p>
          <p className={`text-[12px] mt-0.5 ${s.full.due ? 'text-warn' : 'text-ink-3'}`}>{s.full.due ? (ko ? '지금 할 때입니다' : 'Due now') : (ko ? `${s.settings.fullCountDays}일마다` : `every ${s.settings.fullCountDays} days`)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex gap-1.5 items-center">
          {(['quick', 'full'] as const).map(k => <button key={k} onClick={() => setKind(k)} className={`h-8 px-3 rounded text-[12.5px] border ${kind === k ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:text-ink'}`}>{k === 'quick' ? (ko ? '간단 조사' : 'Quick count') : (ko ? '전체 조사' : 'Full count')}</button>)}
          <button onClick={print} disabled={rows.length === 0} className={`${btn} ml-2`} title={ko ? '클립보드용 종이 조사표' : 'A sheet for the clipboard: the items with boxes to write the numbers in'}><Printer size={13} />{ko ? '조사표 인쇄' : 'Print the sheet'}</button>
        </div>
        <p className="text-[12px] text-ink-3">{kind === 'quick' ? (ko ? '자주 쓰는 것만. 실제 수를 넣고 저장하세요.' : 'Only the staples. Put the real numbers in and save; untouched rows keep their number.') : (ko ? '모든 품목. 실제 수를 넣고 저장하세요.' : 'Everything. Put the real numbers in and save; untouched rows keep their number.')}</p>
      </div>
      {rows.length === 0 ? <p className="text-[12.5px] text-ink-3">{ko ? '조사할 품목이 없습니다.' : 'Nothing to count.'}</p> : (
        <table className="w-full max-w-[760px] text-[13px] mb-4">
          <thead><tr className="text-left text-ink-3 border-b border-rule-2"><th className="font-normal py-1 pr-3">{ko ? '품목' : 'Item'}</th><th className="font-normal py-1 pr-3 w-36">{ko ? '기록' : 'Recorded'}</th><th className="font-normal py-1 pr-3">{ko ? '실제' : 'Counted'}</th></tr></thead>
          <tbody className="divide-y divide-rule">
            {rows.map(i => {
              const diff = vals[i.id] !== undefined && vals[i.id] !== i.on_hand
              const group = placed ? placeOf(i, ko) : catLabel(i.category || 'other', ko)
              const head = group !== lastGroup; lastGroup = group
              return (
                <RowGroup key={i.id} head={head ? group : null}>
                  <td className="py-1.5 pr-3 text-ink">{i.name} <span className="text-ink-3 text-[11.5px]">{hasPacks(i) ? `${i.pack_name} of ${num(Number(i.pack_size))}` : i.unit}</span>{isLow(i) && <span className="ml-2 text-[10.5px] px-1 rounded bg-warn-soft text-warn">{ko ? '부족' : 'low'}</span>}</td>
                  <td className="py-1.5 pr-3 tabular-nums text-ink-3">{fmtQty(i, i.on_hand)}</td>
                  <td className={`py-1.5 pr-3 ${diff ? 'text-ink font-semibold' : ''}`}><PackInputs item={i} value={val(i)} onChange={n => setVals(v => ({ ...v, [i.id]: n }))} ko={ko} /></td>
                </RowGroup>
              )
            })}
          </tbody>
        </table>
      )}
      {rows.length > 0 && (
        <div className="flex items-center gap-3 mb-10">
          <button onClick={save} disabled={saving} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <ClipboardCheck size={13} />}{kind === 'quick' ? (ko ? '간단 조사 저장' : 'Save the quick count') : (ko ? '전체 조사 저장' : 'Save the full count')}</button>
          <span className="text-[12px] text-ink-3">{changed ? `${changed} ${ko ? '개 바뀜' : changed === 1 ? 'number changed' : 'numbers changed'}` : (ko ? '바뀐 것 없음 · 저장하면 조사한 것으로 기록됩니다' : 'nothing changed · saving still records that you counted')}</span>
        </div>
      )}

      {canManage && (
        <div className="border-t border-rule-2 pt-4 max-w-[760px]">
          <p className="eyebrow mb-2">{ko ? '설정' : 'Settings'}</p>
          <div className="flex items-center gap-3 flex-wrap text-[12.5px] text-ink-2">
            <span>{ko ? '간단 조사 담당:' : 'The quick count goes with the office job'}</span>
            <select value={cfg.countJobKey} onChange={e => setCfg({ ...cfg, countJobKey: e.target.value })} className={sel}>{jobs.map(j => <option key={j.key} value={j.key}>{j.name}</option>)}{!jobs.some(j => j.key === cfg.countJobKey) && <option value={cfg.countJobKey}>{cfg.countJobKey}</option>}</select>
            <span>{ko ? '· 전체 조사 주기:' : '· full count every'}</span>
            <input type="number" min={7} max={365} value={cfg.fullCountDays} onChange={e => setCfg({ ...cfg, fullCountDays: Number(e.target.value) })} className={`${inp} max-w-[70px]`} /><span>{ko ? '일' : 'days'}</span>
            <button onClick={saveCfg} disabled={savingCfg || (cfg.countJobKey === s.settings.countJobKey && cfg.fullCountDays === s.settings.fullCountDays)} className={btn}>{ko ? '저장' : 'Save'}</button>
          </div>
        </div>
      )}
    </section>
  )
}

/** A table row, with a group heading row before it when the group changes. */
function RowGroup({ head, children }: { head: string | null; children: React.ReactNode }) {
  return (
    <>
      {head && <tr><td colSpan={3} className="pt-3 pb-1"><span className="eyebrow">{head}</span></td></tr>}
      <tr>{children}</tr>
    </>
  )
}
