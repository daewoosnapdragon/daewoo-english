'use client'

import { useMemo } from 'react'
import type { Student } from '@/types'
import {
  PHONICS_SKILLS, PHONICS_BAND_LABELS,
  phonicsSkill, phonicsBand, scoreSkill, sortChecksAsc, attemptsBySkill, latestDelta, latestBySkill, summarizeStudent, orderSkills, scoreText,
  type PhonicsCheckRow,
} from '@/lib/phonics'
import { BAND_TONE, fmtShort } from '@/components/reading/phonicsTones'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

// ─── One student's progress: sheets × attempts ───────────────────
// The sheets the student has ever been checked on down the side, every
// sitting across the top in date order, each cell that attempt's accuracy
// in the band colour. Blank where the sheet was not read that day. The last
// column is the change since the attempt before. Click a cell for the words.

export default function StudentProgressGrid({ student, checks, lang, onCell, compact }: {
  student: Student; checks: PhonicsCheckRow[]; lang: 'en' | 'ko'; onCell: (skill: string, checkId: string) => void
  /** Smaller type and tighter rows, for the student page. */
  compact?: boolean
}) {
  const own = useMemo(() => sortChecksAsc(checks.filter(c => c.student_id === student.id)), [checks, student.id])
  const attempts = useMemo(() => attemptsBySkill(own), [own])
  const skills = useMemo(() => orderSkills(Object.keys(attempts)), [attempts])
  const latest = useMemo(() => latestBySkill(own), [own])
  const sum = summarizeStudent(latest)

  if (own.length === 0) {
    return <p className="text-[13px] text-ink-3 py-6">{lang === 'ko' ? '아직 이 학생의 파닉스 점검이 없습니다.' : 'No phonics checks for this student yet.'}</p>
  }

  const cell = compact ? 'h-6 text-[10.5px]' : 'h-7 text-[11px]'

  return (
    <div>
      <div className="flex items-baseline gap-3 flex-wrap mb-2 text-[12px] text-ink-2">
        <span>{own.length} {lang === 'ko' ? '회 점검' : own.length === 1 ? 'check' : 'checks'} · {fmtShort(own[0].date, lang)} – {fmtShort(own[own.length - 1].date, lang)}</span>
        <span>·</span>
        <span>{sum.frontier ? <>{lang === 'ko' ? '현재 과제: ' : 'Working on: '}<b className="text-ink">{phonicsSkill(sum.frontier)?.label}</b></> : <span className="text-good">{lang === 'ko' ? '점검한 시트 모두 숙달' : 'Every checked sheet proficient'}</span>}</span>
        <span className="ml-auto text-ink-3">{lang === 'ko' ? '셀을 클릭하면 그 시도의 단어가 보입니다' : 'click a cell for that attempt’s words'}</span>
      </div>
      <div className="border border-rule-2 rounded-md overflow-hidden">
        <table className="w-full table-fixed text-[12px] tabular-nums border-collapse">
          <colgroup>
            <col style={{ width: compact ? 150 : 190 }} />
            {own.map(c => <col key={c.id} />)}
            <col style={{ width: 72 }} />
          </colgroup>
          <thead>
            <tr className="bg-paper-2">
              <th className="text-left px-3 py-2 eyebrow font-semibold border-b border-r border-rule-2">{lang === 'ko' ? '시트' : 'Sheet'}</th>
              {own.map((c, i) => (
                <th key={c.id} className={`px-0.5 py-2 border-b border-rule-2 text-center align-bottom ${i > 0 ? 'border-l border-rule' : ''}`} title={`${fmtShort(c.date, lang)} · ${c.skills.length} ${c.skills.length === 1 ? 'sheet' : 'sheets'}${c.notes ? `\n${c.notes}` : ''}`}>
                  <span className="block text-[10.5px] font-semibold text-ink-2 whitespace-nowrap overflow-hidden text-ellipsis">{fmtShort(c.date, lang)}</span>
                  <span className="block text-[10px] text-ink-3">{c.skills.length}</span>
                </th>
              ))}
              <th className="px-2 py-2 border-b border-l border-rule-2 eyebrow font-semibold text-right align-bottom">{lang === 'ko' ? '변화' : 'Change'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {skills.map(id => {
              const sk = phonicsSkill(id)!
              const delta = latestDelta(attempts[id])
              return (
                <tr key={id}>
                  <td className="px-3 py-1 border-r border-rule-2 overflow-hidden"><span className={`block truncate text-ink ${compact ? 'text-[11.5px]' : ''}`} title={sk.covers}>{lang === 'ko' ? sk.label_ko : sk.label}</span></td>
                  {own.map((c, i) => {
                    const s = c.skills.includes(id) ? scoreSkill(c, id) : null
                    const b = s ? phonicsBand(s) : null
                    return (
                      <td key={c.id} className={`p-[3px] ${i > 0 ? 'border-l border-rule' : ''}`}>
                        {s ? (
                          <button onClick={() => onCell(id, c.id)} title={`${sk.label} · ${fmtShort(c.date, lang)}: ${scoreText(s)} · ${PHONICS_BAND_LABELS[b!].en}${s.unread ? ` · ${s.unread} not read` : ''}`}
                            className={`w-full ${cell} rounded-sm font-semibold ${BAND_TONE[b!]}`}>{s.pct}</button>
                        ) : <span className={`block w-full ${cell} rounded-sm bg-paper-2/40`} />}
                      </td>
                    )
                  })}
                  <td className="px-2 py-1 border-l border-rule-2 text-right">
                    {delta == null ? <span className="text-ink-3">—</span>
                      : <span className={`inline-flex items-center gap-0.5 font-semibold ${delta > 0 ? 'text-good' : delta < 0 ? 'text-bad' : 'text-ink-3'}`}>{delta > 0 ? <ArrowUp size={11} /> : delta < 0 ? <ArrowDown size={11} /> : <Minus size={11} />}{Math.abs(delta)}</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {skills.length < PHONICS_SKILLS.length && (
        <p className="text-[11px] text-ink-3 mt-1.5">{lang === 'ko' ? `미점검 시트 ${PHONICS_SKILLS.length - skills.length}개는 표시하지 않습니다.` : `${PHONICS_SKILLS.length - skills.length} sheets never checked are not shown.`}</p>
      )}
    </div>
  )
}
