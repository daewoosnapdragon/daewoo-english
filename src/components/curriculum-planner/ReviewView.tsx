'use client'

import { useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { classToColor } from '@/lib/utils'
import { bookName, colorHex, levelShort } from '@/lib/curriculumCore'
import { deviations, masterRows, planSignature, teacherRows, type CurriculumPlacement } from '@/lib/curriculumPacing'
import { adoptAsMaster, reviewPlan, revertToMaster } from '@/lib/curriculumPlanData'
import { usePlanner } from './usePlanner'
import { Check, Loader2, Undo2, ArrowUpToLine } from 'lucide-react'

// ─── Review queue ────────────────────────────────────────────────
// Every teacher plan that differs from the master, one card per book:
// who, which class and grade, and the differences unit by unit. Admin
// marks it seen (with a comment the teacher sees on their board), puts it
// back to the master, or makes it the master. A plan changed since it was
// seen comes back to the top.

const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const btnP = 'h-7 px-2.5 rounded bg-ink text-paper text-[11.5px] font-medium hover:opacity-90 disabled:opacity-60 inline-flex items-center gap-1 whitespace-nowrap'
const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-full'
const fmtWhen = (iso: string, ko: boolean) => new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric' })

export default function ReviewView() {
  const { currentTeacher, language, showToast, confirmDialog } = useApp()
  const ko = language === 'ko'
  const me = currentTeacher?.id || ''
  const p = usePlanner()
  const { teachers } = useTeachers()
  const [busy, setBusy] = useState<string | null>(null)
  const [comments, setComments] = useState<Record<string, string>>({})
  const [showSeen, setShowSeen] = useState(false)
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }

  const items = useMemo(() => {
    const out: { key: string; pl: CurriculumPlacement; teacherId: string; teacherName: string; label: string; color: string; level: string; devs: ReturnType<typeof deviations>; seen: boolean; review: typeof p.reviews[number] | undefined }[] = []
    const seenPairs = new Set<string>()
    for (const r of p.pacing) {
      if (r.owner !== 'teacher' || !r.teacher_id) continue
      const key = `${r.placement_id}|${r.teacher_id}`
      if (seenPairs.has(key)) continue
      seenPairs.add(key)
      const pl = p.placements.find(x => x.id === r.placement_id)
      if (!pl) continue
      const mine = teacherRows(p.pacing, pl.id, r.teacher_id)
      const devs = deviations(masterRows(p.pacing, pl.id), mine, p.units)
      if (!devs.length) continue
      const book = p.books.find(b => b.id === pl.book_id)
      const se = book ? p.series.find(s => s.id === book.series_id) : undefined
      const review = p.reviews.find(x => x.placement_id === pl.id && x.teacher_id === r.teacher_id)
      const seen = !!review && review.signature === planSignature(mine)
      out.push({ key, pl, teacherId: r.teacher_id, teacherName: teachers.find(t => t.id === r.teacher_id)?.name || (ko ? '교사' : 'a teacher'), label: book ? bookName(book, se) : '?', color: colorHex(se?.color || 'slate'), level: book?.level_number || '', devs, seen, review })
    }
    return out.sort((a, b) => Number(a.seen) - Number(b.seen) || a.pl.english_class.localeCompare(b.pl.english_class) || a.pl.grade - b.pl.grade)
  }, [p.pacing, p.placements, p.units, p.books, p.series, p.reviews, teachers, ko])
  const open = items.filter(i => !i.seen)
  const shown = showSeen ? items : open

  if (p.loading) return <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p>
  if (p.missing || p.plansMissing) return <p className="text-[12.5px] text-warn">{p.plansMissing ? 'Run supabase/migration-curriculum-teacher-plans.sql once to turn on teachers’ own plans.' : 'Run the curriculum migrations first.'}</p>

  const act = async (key: string, fn: () => Promise<string | null>) => { setBusy(key); if (!fail(await fn())) await p.reload(); setBusy(null) }

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <p className="text-[13px] text-ink-2">{open.length ? (ko ? `확인할 계획 ${open.length}개` : `${open.length} ${open.length === 1 ? 'plan' : 'plans'} to look at`) : (ko ? '확인할 것이 없습니다.' : 'Nothing waiting. Every teacher plan either matches the master or has been seen as it is now.')}</p>
        {items.length > open.length && <label className="inline-flex items-center gap-2 text-[12px] text-ink-2 ml-auto"><input type="checkbox" checked={showSeen} onChange={e => setShowSeen(e.target.checked)} />{ko ? '확인한 것도 보기' : `Show the ${items.length - open.length} seen`}</label>}
      </div>
      <div className="flex flex-col gap-3">
        {shown.map(it => (
          <section key={it.key} className={`border rounded bg-surface ${it.seen ? 'border-rule opacity-80' : 'border-rule-2'}`}>
            <div className="flex items-center gap-3 px-4 py-3 border-b border-rule flex-wrap">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: classToColor(it.pl.english_class as any) }} />
              <span className="text-[13px] font-semibold text-ink">{it.pl.english_class} · {ko ? `${it.pl.grade}학년` : `Grade ${it.pl.grade}`}</span>
              <span className="text-[12px] text-ink-2">{it.teacherName}</span>
              <span className="font-display text-[20px] leading-none ml-2" style={{ color: it.color }}>{levelShort(it.level)}</span>
              <span className="text-[12.5px] text-ink">{it.label}</span>
              <span className="text-[11px] text-ink-3">{it.pl.term} {it.pl.academic_year}</span>
              {it.seen && it.review?.seen_at && <span className="text-[11px] text-good ml-auto inline-flex items-center gap-1"><Check size={11} />{ko ? '확인함' : 'Seen'} {fmtWhen(it.review.seen_at, ko)}</span>}
            </div>
            <ul className="px-4 py-2 text-[12.5px] text-ink-2 flex flex-col gap-0.5">
              {it.devs.map((d, i) => <li key={i} className="flex gap-2"><span className={`w-14 shrink-0 text-[10.5px] uppercase tracking-wide pt-0.5 ${d.kind === 'dropped' ? 'text-bad' : d.kind === 'added' ? 'text-good' : 'text-ink-3'}`}>{d.kind}</span><span>{d.text}</span></li>)}
            </ul>
            <div className="px-4 py-3 border-t border-rule flex items-end gap-2 flex-wrap">
              <div className="flex-1 min-w-[220px]"><span className="block text-[11px] text-ink-3 mb-1">{ko ? '교사에게 남길 말 (선택)' : 'A note the teacher will see on their board, optional'}</span><input value={comments[it.key] ?? it.review?.comment ?? ''} onChange={e => setComments({ ...comments, [it.key]: e.target.value })} className={inp} placeholder={ko ? '예: 좋아요, 12월에 다시 봅시다' : 'Looks fine, let’s look again in December'} /></div>
              <button disabled={busy === it.key} onClick={() => act(it.key, () => reviewPlan(p.pacing, it.pl.id, it.teacherId, me, comments[it.key] ?? it.review?.comment ?? '', `${it.pl.english_class} G${it.pl.grade} ${it.label}`))} className={btnP}>{busy === it.key ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}{it.seen ? (ko ? '메모 저장' : 'Save the note') : (ko ? '확인함' : 'Seen')}</button>
              <button disabled={busy === it.key} onClick={async () => { if (await confirmDialog({ title: ko ? '마스터로 채택' : 'Make this the master', message: ko ? `${it.teacherName}의 ${it.label} 계획이 마스터가 됩니다.` : `${it.teacherName}’s pacing of ${it.label} replaces the master for ${it.pl.english_class} Grade ${it.pl.grade}. Their copy goes, since it is the master now.`, confirmLabel: ko ? '채택' : 'Adopt' })) act(it.key, () => adoptAsMaster(p.pacing, it.pl.id, it.teacherId, `${it.pl.english_class} G${it.pl.grade} ${it.label}`)) }} className={btnS}><ArrowUpToLine size={11} />{ko ? '마스터로 채택' : 'Adopt as master'}</button>
              <button disabled={busy === it.key} onClick={async () => { if (await confirmDialog({ title: ko ? '마스터로 되돌리기' : 'Revert to the master', message: ko ? `${it.teacherName}의 ${it.label} 변경을 버립니다.` : `${it.teacherName}’s changes to ${it.label} go, and the master applies to their board again.`, confirmLabel: ko ? '되돌리기' : 'Revert' })) act(it.key, () => revertToMaster(it.pl.id, it.teacherId, `${it.pl.english_class} G${it.pl.grade} ${it.label}`, 'admin')) }} className={btnS}><Undo2 size={11} />{ko ? '되돌리기' : 'Revert'}</button>
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
