'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { budgetSummary, isSuppliesMissing, won, type SupplyBudget, type SupplyPurchase } from '@/lib/suppliesCore'
import { fetchBudget, saveBudget, updatePurchase } from '@/lib/suppliesData'
import { Check, Loader2, RefreshCw, X } from 'lucide-react'

// ─── Budget ──────────────────────────────────────────────────────
// What the office has spent this semester, from the receipts on the
// Supplies page: each teacher's one-off purchases against their allowance,
// the office's stock purchases and event spending against its own, and the
// totals by month. Admin, the head teacher and the Snapdragon teacher see
// everyone and set the allowances; a teacher sees their own line and the
// monthly totals.

const KST = 'Asia/Seoul'
const fmtDay = (iso: string, ko: boolean) => new Date(iso + 'T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric' })
const fmtMonth = (key: string, ko: boolean) => new Date(key + '-15T12:00:00+09:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, year: 'numeric', month: 'long' })
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100)
const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-full'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'

export default function BudgetView() {
  const { currentTeacher, language, semesters, activeSemester, showToast } = useApp()
  const ko = language === 'ko'
  const me = currentTeacher?.id || ''
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher || currentTeacher?.english_class === 'Snapdragon'
  const { teachers } = useTeachers()
  const [semId, setSemId] = useState<string>('')
  useEffect(() => { if (!semId && activeSemester) setSemId(activeSemester.id) }, [activeSemester, semId])
  const semester = semesters.find(s => s.id === semId) || activeSemester
  const [purchases, setPurchases] = useState<SupplyPurchase[]>([])
  const [budgets, setBudgets] = useState<SupplyBudget[]>([])
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [editing, setEditing] = useState<SupplyPurchase | null>(null)
  const [who, setWho] = useState<string>('all')   // all | office | teacher id
  const load = useCallback(async () => {
    if (!semester) return
    setLoading(true)
    const r = await fetchBudget(semester)
    if (r.error) { setMissing(isSuppliesMissing(r.error)); if (!isSuppliesMissing(r.error)) showToast(r.error); setLoading(false); return }
    setPurchases(r.purchases); setBudgets(r.budgets); setMissing(false); setLoading(false)
  }, [semester, showToast])
  useEffect(() => { load() }, [load])

  const staff = useMemo(() => teachers.filter(t => t.role !== 'admin' || canManage).map(t => ({ id: t.id, name: t.name })), [teachers, canManage])
  const summary = useMemo(() => budgetSummary(purchases, budgets, staff.map(t => t.id)), [purchases, budgets, staff])
  const nameOf = (id: string | null | undefined) => teachers.find(t => t.id === id)?.name || (ko ? '누군가' : 'someone')
  const mine = summary.teachers.find(t => t.teacherId === me)
  const shown = useMemo(() => {
    let rows = purchases
    if (!canManage) rows = rows.filter(p => p.kind === 'oneoff' && p.for_teacher_id === me)
    else if (who === 'office') rows = rows.filter(p => p.kind === 'stock' || (p.kind === 'oneoff' && !p.for_teacher_id))
    else if (who !== 'all') rows = rows.filter(p => p.kind === 'oneoff' && p.for_teacher_id === who)
    return rows
  }, [purchases, canManage, who, me])

  const Line = ({ label, allowance, spent, remaining, count, teacherId }: { label: string; allowance: number; spent: number; remaining: number; count: number; teacherId: string | null }) => {
    const b = budgets.find(x => (x.teacher_id || null) === teacherId) || null
    const over = allowance > 0 && remaining < 0
    const pct = allowance > 0 ? Math.min(100, Math.round(spent / allowance * 100)) : 0
    return (
      <tr className="table-row-hover">
        <td className="py-2 pr-3 text-ink font-medium">{label}</td>
        <td className="py-2 pr-3 tabular-nums">{canManage ? <AllowanceInput value={allowance} ko={ko} onSave={async v => { const e = await saveBudget(semester!.id, teacherId, v, b?.note || '', b?.id || null); if (e) showToast(e); else load() }} /> : won(allowance, ko)}</td>
        <td className="py-2 pr-3 tabular-nums text-ink">{won(spent, ko)}<span className="text-ink-3 text-[11px]"> · {count}</span></td>
        <td className={`py-2 pr-3 tabular-nums font-semibold ${over ? 'text-bad' : allowance > 0 ? 'text-good' : 'text-ink-3'}`}>{allowance > 0 ? won(remaining, ko) : '—'}</td>
        <td className="py-2 w-40 hidden md:table-cell">{allowance > 0 && <div className="h-2 bg-paper-2 rounded overflow-hidden"><div className={`h-full ${over ? 'bg-bad' : pct > 85 ? 'bg-warn' : 'bg-accent'}`} style={{ width: `${pct}%` }} /></div>}</td>
      </tr>
    )
  }

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{ko ? '사무실' : 'The office'}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">{ko ? '예산' : 'Budget'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <select value={semester?.id || ''} onChange={e => setSemId(e.target.value)} className={sel}>{semesters.map(s => <option key={s.id} value={s.id}>{ko ? s.name_ko || s.name : s.name}</option>)}</select>
          <button onClick={load} className={btn}><RefreshCw size={13} />{ko ? '새로고침' : 'Refresh'}</button>
        </div>
      </div>
      <p className="text-[12.5px] text-ink-3 mb-5">{ko ? '비품 페이지에 입력한 영수증이 여기에 합산됩니다. ' : 'Every receipt entered on the Supplies page lands here. '}<Link href="/supplies#receipts" className="text-accent hover:underline">{ko ? '영수증 입력' : 'Enter a receipt'}</Link>{semester?.start_date ? ` · ${fmtDay(semester.start_date, ko)}${semester.end_date ? ` – ${fmtDay(semester.end_date, ko)}` : ''}` : ''}</p>

      {missing && <p className="mb-4 text-[12.5px] text-warn">{ko ? 'supabase/migration-supplies.sql을 먼저 실행하세요.' : 'The supplies tables are missing or out of date. Admin runs supabase/migration-supplies.sql once.'}</p>}
      {loading ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : missing ? null : (
        <>
          <section className="mb-8">
            <div className="flex items-baseline justify-between gap-3 border-b border-rule-2 pb-2 mb-1">
              <h2 className="font-display text-[22px] leading-none text-ink">{canManage ? (ko ? '교사별' : 'By teacher') : (ko ? '내 예산' : 'My budget')}</h2>
              <span className="eyebrow">{ko ? '이번 학기 합계' : 'This semester'} · {won(summary.total, ko)}</span>
            </div>
            <table className="w-full text-[13px]">
              <thead><tr className="text-left text-ink-3 border-b border-rule"><th className="font-normal py-1 pr-3">{ko ? '누구' : 'Who'}</th><th className="font-normal py-1 pr-3 w-36">{ko ? '배정' : 'Allowance'}</th><th className="font-normal py-1 pr-3 w-36">{ko ? '사용' : 'Spent'}</th><th className="font-normal py-1 pr-3 w-32">{ko ? '남음' : 'Left'}</th><th className="py-1 hidden md:table-cell"></th></tr></thead>
              <tbody className="divide-y divide-rule">
                {canManage ? (
                  <>
                    {summary.teachers.map(t => <Line key={t.teacherId || 'office'} label={nameOf(t.teacherId)} teacherId={t.teacherId} allowance={t.allowance} spent={t.spent} remaining={t.remaining} count={t.count} />)}
                    <Line label={ko ? '사무실 (재고 + 행사)' : 'Office (stock + events)'} teacherId={null} allowance={summary.office.allowance} spent={summary.office.spent} remaining={summary.office.remaining} count={purchases.filter(p => p.kind === 'stock' || !p.for_teacher_id).length} />
                  </>
                ) : mine ? <Line label={nameOf(me)} teacherId={me} allowance={mine.allowance} spent={mine.spent} remaining={mine.remaining} count={mine.count} /> : null}
              </tbody>
            </table>
            {canManage && <p className="text-[11.5px] text-ink-3 mt-2">{ko ? `사무실: 재고 ${won(summary.office.stock, ko)} · 행사·기타 ${won(summary.office.events, ko)}. 배정액을 클릭해 수정하세요.` : `Office: stock ${won(summary.office.stock, ko)} · events and other one-offs ${won(summary.office.events, ko)}. Click an allowance to change it.`}</p>}
          </section>

          <section className="mb-8">
            <div className="border-b border-rule-2 pb-2 mb-1"><h2 className="font-display text-[22px] leading-none text-ink">{ko ? '월별' : 'By month'}</h2></div>
            {summary.months.length === 0 ? <p className="text-[12.5px] text-ink-3 py-2">{ko ? '이번 학기 구매 없음' : 'Nothing bought this semester yet.'}</p> : (
              <table className="w-full max-w-[560px] text-[13px]">
                <thead><tr className="text-left text-ink-3 border-b border-rule"><th className="font-normal py-1 pr-3">{ko ? '월' : 'Month'}</th><th className="font-normal py-1 pr-3 text-right">{ko ? '재고' : 'Stock'}</th><th className="font-normal py-1 pr-3 text-right">{ko ? '단건' : 'One-off'}</th><th className="font-normal py-1 text-right">{ko ? '합계' : 'Total'}</th></tr></thead>
                <tbody className="divide-y divide-rule">
                  {summary.months.map(m => <tr key={m.key}><td className="py-1.5 pr-3 text-ink">{fmtMonth(m.key, ko)}</td><td className="py-1.5 pr-3 text-right tabular-nums text-ink-2">{won(m.stock, ko)}</td><td className="py-1.5 pr-3 text-right tabular-nums text-ink-2">{won(m.oneoff, ko)}</td><td className="py-1.5 text-right tabular-nums font-semibold text-ink">{won(m.total, ko)}</td></tr>)}
                  <tr className="border-t border-rule-2"><td className="py-1.5 pr-3 text-ink font-medium">{ko ? '합계' : 'Semester'}</td><td className="py-1.5 pr-3 text-right tabular-nums">{won(summary.office.stock, ko)}</td><td className="py-1.5 pr-3 text-right tabular-nums">{won(summary.total - summary.office.stock, ko)}</td><td className="py-1.5 text-right tabular-nums font-semibold">{won(summary.total, ko)}</td></tr>
                </tbody>
              </table>
            )}
          </section>

          <section>
            <div className="flex items-baseline justify-between gap-3 flex-wrap border-b border-rule-2 pb-2 mb-2">
              <h2 className="font-display text-[22px] leading-none text-ink">{canManage ? (ko ? '구매 내역' : 'Purchases') : (ko ? '내 구매' : 'My purchases')}</h2>
              {canManage && (
                <select value={who} onChange={e => setWho(e.target.value)} className={sel}>
                  <option value="all">{ko ? '전체' : 'Everyone'}</option>
                  <option value="office">{ko ? '사무실 (재고 + 행사)' : 'Office (stock + events)'}</option>
                  {staff.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
            {shown.length === 0 ? <p className="text-[12.5px] text-ink-3">{ko ? '없음' : 'Nothing yet.'}</p> : (
              <table className="w-full text-[12.5px]">
                <thead><tr className="text-left text-ink-3 border-b border-rule"><th className="font-normal py-1 pr-3 w-24">{ko ? '날짜' : 'Date'}</th><th className="font-normal py-1 pr-3">{ko ? '품목' : 'What'}</th><th className="font-normal py-1 pr-3">{ko ? '누구 / 용도' : 'For'}</th><th className="font-normal py-1 pr-3 text-right w-28">{ko ? '금액' : 'Price'}</th>{canManage && <th className="py-1 w-16"></th>}</tr></thead>
                <tbody className="divide-y divide-rule">
                  {shown.map(p => (
                    <tr key={p.id} className="table-row-hover">
                      <td className="py-1.5 pr-3 text-ink-3 tabular-nums">{fmtDay(p.date, ko)}</td>
                      <td className="py-1.5 pr-3 text-ink">{p.name} <span className="text-ink-3">× {p.as_bought || num(p.qty)}</span></td>
                      <td className="py-1.5 pr-3 text-ink-2">{p.kind === 'stock' ? (ko ? '재고' : 'Stock') : (p.for_teacher_id ? nameOf(p.for_teacher_id) : (ko ? '사무실 / 행사' : 'Office / event'))}{p.purpose ? <span className="text-ink-3"> · {p.purpose}</span> : null}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-ink">{won(p.price, ko)}</td>
                      {canManage && <td className="py-1.5 text-right"><button onClick={() => setEditing(p)} className={btnS}>{ko ? '수정' : 'Edit'}</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
      {editing && <PurchaseModal p={editing} ko={ko} teachers={staff} onClose={() => setEditing(null)} onSave={async patch => { const e = await updatePurchase(editing, patch); if (e) { showToast(e); return false } setEditing(null); await load(); return true }} />}
    </div>
  )
}

function AllowanceInput({ value, ko, onSave }: { value: number; ko: boolean; onSave: (v: number) => Promise<void> }) {
  const [v, setV] = useState(String(value || ''))
  const [open, setOpen] = useState(false)
  useEffect(() => { setV(String(value || '')) }, [value])
  if (!open) return <button onClick={() => setOpen(true)} className="text-ink hover:text-accent tabular-nums" title={ko ? '수정' : 'Change'}>{value > 0 ? won(value, ko) : <span className="text-ink-3">{ko ? '배정 없음' : 'not set'}</span>}</button>
  return (
    <span className="inline-flex items-center gap-1">
      <input autoFocus type="number" min={0} step="1000" value={v} onChange={e => setV(e.target.value)} onKeyDown={async e => { if (e.key === 'Enter') { await onSave(Number(v) || 0); setOpen(false) } if (e.key === 'Escape') setOpen(false) }} className={`${inp} max-w-[120px] tabular-nums`} />
      <button onClick={async () => { await onSave(Number(v) || 0); setOpen(false) }} className="text-good"><Check size={14} /></button>
      <button onClick={() => setOpen(false)} className="text-ink-3"><X size={14} /></button>
    </span>
  )
}

function PurchaseModal({ p, ko, teachers, onClose, onSave }: { p: SupplyPurchase; ko: boolean; teachers: { id: string; name: string }[]; onClose: () => void; onSave: (patch: Partial<Pick<SupplyPurchase, 'for_teacher_id' | 'purpose' | 'price' | 'kind'>>) => Promise<boolean> }) {
  const [d, setD] = useState({ kind: p.kind, for_teacher_id: p.for_teacher_id, purpose: p.purpose, price: p.price })
  const [saving, setSaving] = useState(false)
  const row = 'grid grid-cols-[100px_1fr] items-center gap-3', lbl = 'text-[12px] text-ink-3'
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded shadow-xl w-full max-w-[460px] p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-[20px] leading-none text-ink">{p.name}</h3><button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={16} /></button></div>
        <p className="text-[12px] text-ink-3 mb-3">{fmtDay(p.date, ko)} · × {p.as_bought || num(p.qty)}{p.kind === 'stock' ? (ko ? ' · 재고 줄: 종류를 바꿔도 재고 수량은 그대로입니다' : ' · a stock line; changing it here does not move the stock number') : ''}</p>
        <div className="space-y-2.5">
          <div className={row}><span className={lbl}>{ko ? '종류' : 'Kind'}</span><select value={d.kind} onChange={e => setD({ ...d, kind: e.target.value as 'stock' | 'oneoff' })} className={sel}><option value="stock">{ko ? '재고 (사무실)' : 'Stock (office)'}</option><option value="oneoff">{ko ? '단건' : 'One-off'}</option></select></div>
          {d.kind === 'oneoff' && <div className={row}><span className={lbl}>{ko ? '누구' : 'For'}</span><select value={d.for_teacher_id || ''} onChange={e => setD({ ...d, for_teacher_id: e.target.value || null })} className={sel}><option value="">{ko ? '사무실 / 행사' : 'Office or event'}</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>}
          <div className={row}><span className={lbl}>{ko ? '용도' : 'What for'}</span><input value={d.purpose} onChange={e => setD({ ...d, purpose: e.target.value })} className={inp} /></div>
          <div className={row}><span className={lbl}>{ko ? '금액' : 'Price'}</span><div className="flex items-center gap-2"><input type="number" min={0} step="1" value={d.price} onChange={e => setD({ ...d, price: Number(e.target.value) })} className={`${inp} max-w-[140px] tabular-nums`} /><span className="text-[12px] text-ink-3">{ko ? '원' : 'won'}</span></div></div>
        </div>
        <div className="flex justify-end gap-2 mt-5"><button onClick={onClose} className={btn}>{ko ? '취소' : 'Cancel'}</button><button disabled={saving} onClick={async () => { setSaving(true); const ok = await onSave({ ...d, for_teacher_id: d.kind === 'oneoff' ? d.for_teacher_id : null }); if (!ok) setSaving(false) }} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5">{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button></div>
      </div>
    </div>
  )
}
