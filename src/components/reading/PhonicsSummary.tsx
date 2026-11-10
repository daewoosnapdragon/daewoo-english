'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { PHONICS_SKILLS, latestBySkill, phonicsBand, phonicsSkill, summarizeStudent, type LatestBySkill, type PhonicsBand } from '@/lib/phonics'
import { loadStudentPhonicsChecks } from '@/lib/phonicsData'

// ─── A student's decoding at a glance ────────────────────────────
// Shown in the Reading section of the student page: the latest result per
// sheet as a strip in packet order, and the sheet to work on next. The link
// opens the Reading tab on this student with the check screen ready.

export function phonicsCheckHref(studentId: string, grade: number | string, englishClass: string): string {
  return `/reading?tab=phonics&student=${studentId}&grade=${grade}&class=${encodeURIComponent(englishClass)}`
}

/** Heat map and chip colours for the packet's four bands. */
export const BAND_TONE: Record<PhonicsBand, string> = {
  mastered: 'bg-good text-white',
  proficient: 'bg-good-soft text-good',
  developing: 'bg-warn-soft text-warn',
  beginning: 'bg-bad-soft text-bad',
}
export const BAND_CHIP: Record<PhonicsBand, string> = {
  mastered: 'bg-good text-white border-good',
  proficient: 'bg-good-soft text-good border-good/30',
  developing: 'bg-warn-soft text-warn border-warn/30',
  beginning: 'bg-bad-soft text-bad border-bad/30',
}
export const BAND_TEXT: Record<PhonicsBand, string> = { mastered: 'text-good', proficient: 'text-good', developing: 'text-warn', beginning: 'text-bad' }
export const BAND_DOT: Record<PhonicsBand, string> = { mastered: 'bg-good', proficient: 'bg-good/60', developing: 'bg-warn', beginning: 'bg-bad' }

export default function PhonicsSummary({ studentId, grade, englishClass, lang }: { studentId: string; grade: number | string; englishClass: string; lang: 'en' | 'ko' }) {
  const [latest, setLatest] = useState<LatestBySkill | null>(null)
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLatest(null)
    ;(async () => {
      const rows = await loadStudentPhonicsChecks(studentId)
      if (cancelled) return
      setCount(rows.length)
      setLatest(latestBySkill(rows))
    })()
    return () => { cancelled = true }
  }, [studentId])

  const sum = latest ? summarizeStudent(latest) : null
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const href = phonicsCheckHref(studentId, grade, englishClass)

  return (
    <div className="mb-6 border border-rule-2 rounded-md bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="eyebrow">{lang === 'ko' ? '파닉스 · 해독' : 'Phonics · decoding'}</h3>
        <Link href={href} className="text-[12px] text-accent hover:underline">{sum && sum.tested > 0 ? (lang === 'ko' ? '다시 점검 →' : 'Check again →') : (lang === 'ko' ? '해독 점검하기 →' : 'Check decoding →')}</Link>
      </div>
      {!latest || !sum ? <div className="py-3"><Loader2 size={14} className="animate-spin text-ink-3" /></div>
      : sum.tested === 0 ? (
        <p className="text-[12.5px] text-ink-3 mt-1.5">{lang === 'ko' ? '아직 파닉스 점검이 없습니다. 해독만 평가하며 성적에 들어가지 않습니다.' : 'No phonics check yet. A check hears the student decode the words on the quick-check sheets you pick; it is never graded.'}</p>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-2 mt-1">
            {sum.frontier
              ? <>{lang === 'ko' ? '현재 과제: ' : 'Working on: '}<b className="text-ink">{phonicsSkill(sum.frontier)?.label}</b></>
              : <span className="text-good">{lang === 'ko' ? '점검한 시트 모두 숙달' : 'Every checked sheet proficient'}</span>}
            <span className="text-ink-3"> · {sum.secure} {lang === 'ko' ? '숙달' : 'proficient'} · {sum.developing} {lang === 'ko' ? '발달 중' : 'developing'} · {sum.beginning} {lang === 'ko' ? '시작 단계' : 'beginning'}{sum.lastDate ? ` · ${lang === 'ko' ? '최근' : 'last'} ${fmt(sum.lastDate)}` : ''} · {count} {lang === 'ko' ? '회' : count === 1 ? 'check' : 'checks'}</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {PHONICS_SKILLS.map(s => {
              const l = latest[s.id]
              const b = l ? phonicsBand(l.score) : null
              return (
                <span key={s.id} title={`${s.label}${l ? ` · ${l.score.correct}/${l.score.total} · ${fmt(l.date)}` : ` · ${lang === 'ko' ? '미점검' : 'not checked'}`}`}
                  className={`inline-flex flex-col items-center min-w-[58px] px-1.5 py-1 rounded-sm text-[10.5px] leading-tight ${b ? BAND_TONE[b] : 'bg-paper-2 text-ink-3/70'}`}>
                  <span className="font-medium whitespace-nowrap">{s.short}</span>
                  <span className="tabular-nums font-semibold">{l ? `${l.score.correct}/${l.score.total}` : '·'}</span>
                </span>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
