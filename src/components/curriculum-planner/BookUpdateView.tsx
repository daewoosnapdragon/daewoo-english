'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { needsUpdate } from '@/lib/dbUpdate'
import { planBook, planSplit, type BookPlan, type CatalogueEntry, type SplitPlan, type UpdateDb } from '@/lib/catalogueUpdate'
import { loadUpdateDb, replaceBook, splitBook } from '@/lib/catalogueUpdateData'
import { Check, Loader2, RefreshCw, X } from 'lucide-react'

// ─── Update the books (admin) ────────────────────────────────────
// Every book in src/data/catalogue.json (built from scripts/catalogue/books),
// with what updating it would do: which classes use it, and any old unit that
// has no match (it comes out of those classes' plans, with its files). Update
// swaps one book in one transaction; Update all does every book that needs it,
// then moves Science of Reading classes onto the level books. Nothing here
// asks anyone to confirm content: the catalogue is the source.
// Design: docs/superpowers/specs/2026-11-28-book-rebuild-design.md

const btn = 'h-8 px-3 rounded border border-rule-2 text-[length:calc(12.5px*var(--ts))] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const chip = 'inline-flex items-center h-5 px-1.5 rounded text-[length:calc(11.5px*var(--ts))] font-semibold'
const SPLIT_SERIES = 'Science of Reading'

const bookLabel = (e: CatalogueEntry) => [e.book.series, e.book.level, e.book.title ? `· ${e.book.title}` : ''].filter(Boolean).join(' ')

export default function BookUpdateView({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) {
  const { language, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const [catalogue, setCatalogue] = useState<CatalogueEntry[] | null>(null)
  const [db, setDb] = useState<UpdateDb | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)       // the key being updated, or 'all'
  const [progress, setProgress] = useState('')

  const reload = useCallback(async () => {
    const r = await loadUpdateDb()
    setMissing(r.missing); if (r.error) showToast(r.error); setDb(r.db)
    return r.db
  }, [showToast])
  useEffect(() => {
    import('@/data/catalogue.json').then(m => setCatalogue((m.default || m) as unknown as CatalogueEntry[]))
    void reload()
  }, [reload])

  const plans = useMemo(() => catalogue && db ? catalogue.map(e => ({ e, p: planBook(e, db) })) : [], [catalogue, db])
  const split = useMemo(() => catalogue && db ? planSplit(SPLIT_SERIES, catalogue.filter(e => e.book.series === SPLIT_SERIES), db) : null, [catalogue, db])
  const waiting = plans.filter(x => x.p.status !== 'up-to-date')

  const runOne = async (e: CatalogueEntry, p: BookPlan) => {
    const err = await replaceBook(e, p)
    if (err) { showToast(`${bookLabel(e)}: ${err}`); return false }
    return true
  }
  const updateOne = async (e: CatalogueEntry, p: BookPlan) => {
    setBusy(e.key)
    if (await runOne(e, p)) { showToast(ko ? `${bookLabel(e)} 업데이트됨` : `${bookLabel(e)} updated`); onChanged() }
    await reload(); setBusy(null)
  }
  const runSplit = async (s: SplitPlan) => {
    setBusy('split')
    const err = await splitBook(SPLIT_SERIES, s)
    if (err) showToast(err); else { showToast(ko ? '반을 단계별 책으로 옮겼습니다' : 'Classes moved onto the level books'); onChanged() }
    await reload(); setBusy(null)
  }
  const updateAll = async () => {
    const lost = waiting.reduce((a, x) => a + x.p.unmatched.filter(u => u.classes.length || u.files).length, 0)
    if (!await confirmDialog({
      title: ko ? '모두 업데이트' : 'Update all the books',
      message: ko ? `책 ${waiting.length}권을 바꿉니다.` : `${waiting.length} ${waiting.length === 1 ? 'book is' : 'books are'} replaced from the publishers' materials. Every class keeps its place on the matching units.${lost ? ` ${lost} old ${lost === 1 ? 'unit has' : 'units have'} no match and ${lost === 1 ? 'comes' : 'come'} out of the plans listed.` : ''}`,
      confirmLabel: ko ? '업데이트' : 'Update all',
    })) return
    setBusy('all')
    let fresh = db, i = 0
    for (const { e } of waiting) {
      i += 1; setProgress(`${i} / ${waiting.length}`)
      // Re-plan against the latest database: an earlier book may have changed what this one sees.
      const p = fresh ? planBook(e, fresh) : null
      if (p && p.status !== 'up-to-date' && !(await runOne(e, p))) break
      fresh = await reload()
    }
    const s = fresh && catalogue ? planSplit(SPLIT_SERIES, catalogue.filter(e => e.book.series === SPLIT_SERIES), fresh) : null
    if (s?.ready) { setProgress(SPLIT_SERIES); const err = await splitBook(SPLIT_SERIES, s); if (err) showToast(err); await reload() }
    setProgress(''); setBusy(null); onChanged()
    showToast(ko ? '업데이트를 마쳤습니다' : 'The books are up to date')
  }

  const loading = !catalogue || (!db && !missing)
  return (
    <section className="border border-rule-2 rounded bg-surface p-4 mb-6">
      <div className="flex items-start gap-3 flex-wrap mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-[length:calc(15px*var(--ts))] font-semibold text-ink">{ko ? '책 업데이트' : 'Update the books'}</p>
          <p className="text-[length:calc(12.5px*var(--ts))] text-ink-2 mt-0.5 max-w-[70ch]">{ko
            ? '각 책의 단원, 차시, 학습 목표를 출판사 자료에서 가져옵니다. 반의 진도, 완료 표시, 자료, 수업 계획 연결은 같은 단원으로 옮겨집니다.'
            : 'Each book’s units, lessons and objectives come from the publisher’s materials. Every class keeps its place: unit lengths, done ticks, files and lesson-plan links move to the matching unit.'}</p>
        </div>
        <button onClick={() => void reload()} disabled={!!busy} className={btn}><RefreshCw size={13} />{ko ? '새로고침' : 'Refresh'}</button>
        {!missing && waiting.length > 0 && <button onClick={updateAll} disabled={!!busy} className={btnP}>{busy === 'all' ? <><Loader2 size={13} className="animate-spin" />{progress}</> : (ko ? `모두 업데이트 (${waiting.length})` : `Update all (${waiting.length})`)}</button>}
        <button onClick={onClose} className="text-ink-3 hover:text-ink mt-1" aria-label="Close"><X size={15} /></button>
      </div>

      {missing && <p className="text-[length:calc(12.5px*var(--ts))] text-warn">{needsUpdate({ en: 'book update', ko: '책 업데이트' }, ko)}</p>}
      {loading && <p className="text-[length:calc(12.5px*var(--ts))] text-ink-3 inline-flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중…' : 'Loading…'}</p>}
      {!loading && !missing && (
        <ul className="divide-y divide-rule border-t border-rule">
          {plans.map(({ e, p }) => (
            <li key={e.key} className="py-2.5 flex items-start gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[length:calc(13px*var(--ts))] font-semibold text-ink">{bookLabel(e)}</span>
                  {p.status === 'up-to-date' && <span className={`${chip} bg-good-soft text-good`}><Check size={10} className="mr-0.5" />{ko ? '최신' : 'Up to date'}</span>}
                  {p.status === 'replace' && <span className={`${chip} bg-paper-3 text-ink-2`}>{ko ? '바뀜' : 'Will be replaced'}</span>}
                  {p.status === 'new' && <span className={`${chip} bg-info-soft text-info`}>{ko ? '새 책' : 'New'}</span>}
                  <span className="text-[length:calc(12px*var(--ts))] text-ink-3">{e.book.units.length} {ko ? '단원' : e.book.units.length === 1 ? 'unit' : 'units'} · {e.book.source}</span>
                </div>
                {p.classes.length > 0 && <p className="text-[length:calc(12px*var(--ts))] text-ink-3 mt-0.5">{ko ? '사용 반: ' : 'Used by '}{p.classes.join(', ')}</p>}
                {p.absorbIds.length > 0 && <p className="text-[length:calc(12px*var(--ts))] text-ink-2 mt-0.5">{ko ? `${(e.book.absorbs || []).join(', ')} 책이 합쳐집니다` : `Folds in ${e.book.series} ${(e.book.absorbs || []).join(', ')}, whose classes move here.`}</p>}
                <UnmatchedList list={p.unmatched} ko={ko} />
              </div>
              {p.status !== 'up-to-date' && <button onClick={() => updateOne(e, p)} disabled={!!busy} className={btn}>{busy === e.key ? <Loader2 size={13} className="animate-spin" /> : null}{ko ? '업데이트' : 'Update'}</button>}
            </li>
          ))}
          {split && (
            <li className="py-2.5 flex items-start gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <p className="text-[length:calc(13px*var(--ts))] font-semibold text-ink">{ko ? `${SPLIT_SERIES}: 반을 단계별 책으로` : `${SPLIT_SERIES}: move classes onto the level books`}</p>
                <p className="text-[length:calc(12px*var(--ts))] text-ink-3 mt-0.5">{split.ready
                  ? (ko ? '' : `Each class gets one book per level its patterns fall in, with the same order, weeks and done ticks. The old single book is retired.${split.classes.length ? ` Classes: ${split.classes.join(', ')}.` : ''}`)
                  : (ko ? '먼저 단계별 책을 모두 업데이트하세요.' : 'Update every level book first.')}</p>
                <UnmatchedList list={split.unmatched} ko={ko} />
              </div>
              <button onClick={() => runSplit(split)} disabled={!!busy || !split.ready} className={btn}>{busy === 'split' ? <Loader2 size={13} className="animate-spin" /> : null}{ko ? '옮기기' : 'Move classes'}</button>
            </li>
          )}
        </ul>
      )}
    </section>
  )
}

/** Old units with no match: only the ones a class plans with or that hold files are worth naming. */
function UnmatchedList({ list, ko }: { list: BookPlan['unmatched']; ko: boolean }) {
  const shown = list.filter(u => u.classes.length || u.files)
  if (!shown.length) return null
  return (
    <div className="mt-1 text-[length:calc(12px*var(--ts))] text-ink-2">
      <p>{ko ? '맞는 새 단원이 없는 옛 단원 (계획에서 빠집니다):' : `${shown.length === 1 ? 'An old unit has' : `${shown.length} old units have`} no match and ${shown.length === 1 ? 'comes' : 'come'} out of these plans:`}</p>
      <ul className="list-disc pl-5">{shown.map(u => <li key={u.unitId}>{u.title}{u.classes.length ? ` — ${u.classes.join(', ')}` : ''}{u.files ? ` · ${u.files} ${u.files === 1 ? 'file' : 'files'}` : ''}</li>)}</ul>
    </div>
  )
}
