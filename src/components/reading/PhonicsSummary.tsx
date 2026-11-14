'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { Student } from '@/types'
import { PHONICS_SKILLS, latestBySkill, phonicsBand, phonicsSkill, summarizeStudent, scoreText, type LatestBySkill, type PhonicsCheckRow } from '@/lib/phonics'
import { loadStudentPhonicsChecks } from '@/lib/phonicsData'
import { BAND_TONE, fmtLong } from '@/components/reading/phonicsTones'
import StudentProgressGrid from '@/components/reading/PhonicsProgress'
import PhonicsCellDetail from '@/components/reading/PhonicsCellDetail'

// ─── A student's decoding at a glance ────────────────────────────
// Shown in the Reading section of the student page: the latest result per
// sheet as a strip in packet order, the sheet to work on next, and under it
// the progress grid of every attempt. The link opens the Reading tab on
// this student with the check screen ready.

export function phonicsCheckHref(studentId: string, grade: number | string, englishClass: string): string {
  return `/reading?tab=phonics&student=${studentId}&grade=${grade}&class=${encodeURIComponent(englishClass)}`
}

export default function PhonicsSummary({ student, lang }: { student: Student; lang: 'en' | 'ko' }) {
  const [checks, setChecks] = useState<PhonicsCheckRow[] | null>(null)
  const [latest, setLatest] = useState<LatestBySkill>({})
  const [open, setOpen] = useState<{ skill: string; checkId: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setChecks(null)
    ;(async () => {
      const rows = await loadStudentPhonicsChecks(student.id)
      if (cancelled) return
      setChecks(rows)
      setLatest(latestBySkill(rows))
    })()
    return () => { cancelled = true }
  }, [student.id])

  const sum = checks ? summarizeStudent(latest) : null
  const href = phonicsCheckHref(student.id, student.grade, student.english_class)

  return (
    <div className="mb-6 border border-rule-2 rounded-md bg-surface px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <h3 className="eyebrow">{lang === 'ko' ? '파닉스 · 해독' : 'Phonics · decoding'}</h3>
        <Link href={href} className="text-[12px] text-accent hover:underline">{sum && sum.tested > 0 ? (lang === 'ko' ? '다시 점검 →' : 'Check again →') : (lang === 'ko' ? '해독 점검하기 →' : 'Check decoding →')}</Link>
      </div>
      {!checks || !sum ? <div className="py-3"><Loader2 size={14} className="animate-spin text-ink-3" /></div>
      : sum.tested === 0 ? (
        <p className="text-[12.5px] text-ink-3 mt-1.5">{lang === 'ko' ? '아직 파닉스 점검이 없습니다. 해독만 평가하며 성적에 들어가지 않습니다.' : 'No phonics check yet. A check hears the student decode the words on the quick-check sheets you pick; it is never graded.'}</p>
      ) : (
        <>
          <p className="text-[12.5px] text-ink-2 mt-1">
            {sum.frontier
              ? <>{lang === 'ko' ? '현재 과제: ' : 'Working on: '}<b className="text-ink">{phonicsSkill(sum.frontier)?.label}</b></>
              : <span className="text-good">{lang === 'ko' ? '점검한 시트 모두 완성' : 'Every checked sheet mastered'}</span>}
            <span className="text-ink-3"> · {sum.secure} {lang === 'ko' ? '완성' : 'mastered'} · {sum.developing} {lang === 'ko' ? '발달 중' : 'developing'} · {sum.beginning} {lang === 'ko' ? '시작 단계' : 'beginning'}{sum.lastDate ? ` · ${lang === 'ko' ? '최근' : 'last'} ${fmtLong(sum.lastDate, lang)}` : ''} · {checks.length} {lang === 'ko' ? '회' : checks.length === 1 ? 'check' : 'checks'}</span>
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {PHONICS_SKILLS.map(s => {
              const l = latest[s.id]
              const b = l ? phonicsBand(l.score) : null
              return (
                <button key={s.id} onClick={() => l && setOpen({ skill: s.id, checkId: l.checkId })} disabled={!l}
                  title={`${s.label}${l ? ` · ${scoreText(l.score)} · ${fmtLong(l.date, lang)}` : ` · ${lang === 'ko' ? '미점검' : 'not checked'}`}`}
                  className={`inline-flex flex-col items-center min-w-[58px] px-1.5 py-1 rounded-sm text-[10.5px] leading-tight ${b ? BAND_TONE[b] : 'bg-paper-2 text-ink-3/70'} disabled:cursor-default`}>
                  <span className="font-medium whitespace-nowrap">{s.short}</span>
                  <span className="tabular-nums font-semibold">{l ? scoreText(l.score) : '·'}</span>
                </button>
              )
            })}
          </div>
          <details className="mt-3" open={checks.length > 1}>
            <summary className="text-[12px] text-ink-2 cursor-pointer hover:text-ink">{lang === 'ko' ? '시도별 진전' : 'Progress across attempts'}</summary>
            <div className="mt-2">
              <StudentProgressGrid student={student} checks={checks} lang={lang} compact onCell={(skill, checkId) => setOpen({ skill, checkId })} />
            </div>
          </details>
        </>
      )}
      {open && checks && (
        <PhonicsCellDetail student={student} skill={open.skill} checks={checks} lang={lang} initialCheckId={open.checkId} onClose={() => setOpen(null)}
          onRecheck={() => { window.location.href = href }} onEdit={() => { window.location.href = href }} />
      )}
    </div>
  )
}
