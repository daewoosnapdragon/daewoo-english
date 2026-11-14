'use client'

import { Fragment, useState } from 'react'
import type { Student } from '@/types'
import { getDisplayName } from '@/lib/utils'
import {
  PHONICS_GROUPS, PHONICS_SKILLS, PHONICS_BAND_LABELS, DECODING_OBSERVATIONS, PATTERN_PREFIX,
  phonicsSkill, phonicsBand, scoreText, type LatestBySkill, type PhonicsCheckRow,
} from '@/lib/phonics'
import type { LevelFlag, MasteryPosition } from '@/lib/phonicsCompare'
import { BAND_TONE, fmtShort } from '@/components/reading/phonicsTones'
import { FlagChip } from '@/components/reading/PhonicsLevelingStrip'
import { AlertTriangle, X } from 'lucide-react'

// ─── Students side by side ───────────────────────────────────────
// Two to six students from any class or grade, for the leveling meeting:
// the sheets down the side, a column each, every cell their latest result
// on that sheet. Under it, how each one decoded across those sheets (the
// packet's teacher checkboxes, counted), so a fast guesser and a slow,
// accurate decoder with the same scores are told apart.

const CLASS_DOT: Record<string, string> = { Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy', Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon' }

export const MAX_COMPARE = 6

export default function PhonicsStudentCompare({ students, latestByStudent, checksById, pos, flags, lang, onClose, onRemove, onOpenStudent }: {
  students: Student[]; latestByStudent: Record<string, LatestBySkill>; checksById: Record<string, PhonicsCheckRow>
  pos: Record<string, MasteryPosition>; flags: Record<string, LevelFlag>; lang: 'en' | 'ko'
  onClose: () => void; onRemove: (id: string) => void; onOpenStudent: (s: Student) => void
}) {
  const [allSheets, setAllSheets] = useState(false)
  const checkedBySomeone = (id: string) => students.some(s => latestByStudent[s.id]?.[id])
  const sheets = allSheets ? PHONICS_SKILLS : PHONICS_SKILLS.filter(s => checkedBySomeone(s.id))

  // How each student decoded: the teacher checkboxes on their latest result for each sheet, counted.
  const howBy = Object.fromEntries(students.map(s => {
    const counts: Record<string, number> = {}
    const latest = latestByStudent[s.id] || {}
    Object.entries(latest).forEach(([sk, l]) => {
      (checksById[l.checkId]?.observations?.[sk] || []).forEach(o => { if (!o.startsWith(PATTERN_PREFIX)) counts[o] = (counts[o] || 0) + 1 })
    })
    return [s.id, Object.entries(counts).sort((a, b) => b[1] - a[1])]
  })) as Record<string, [string, number][]>

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">{lang === 'ko' ? '파닉스 비교' : 'Phonics, side by side'}</p>
            <h3 className="font-display text-[22px] leading-tight text-ink mt-0.5">{students.length} {lang === 'ko' ? '명' : 'students'}</h3>
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
              <input type="checkbox" checked={allSheets} onChange={e => setAllSheets(e.target.checked)} />
              {lang === 'ko' ? '점검 안 한 시트도 보기' : 'Show sheets nobody here was checked on'}
            </label>
            <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={15} /></button>
          </div>
        </div>
        <div className="overflow-auto">
          <table className="w-full text-[12px] tabular-nums border-collapse">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-rule-2">
                <th className="text-left px-4 py-2 align-bottom w-[180px] eyebrow font-semibold">{lang === 'ko' ? '시트' : 'Sheet'}</th>
                {students.map(s => {
                  const p = pos[s.id]; const f = flags[s.id]
                  return (
                    <th key={s.id} className="px-2 py-2 text-left align-top font-normal min-w-[130px] border-l border-rule">
                      <div className="flex items-start justify-between gap-1">
                        <button onClick={() => onOpenStudent(s)} className="text-left hover:underline">
                          <span className="block text-[13px] font-semibold text-ink leading-tight">{getDisplayName(s)}</span>
                          <span className="block text-[11px] text-ink-3">{s.korean_name}</span>
                        </button>
                        <button onClick={() => onRemove(s.id)} aria-label={`Remove ${s.english_name}`} className="text-ink-3 hover:text-ink"><X size={12} /></button>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-ink-2 mt-1"><span className={`w-2 h-2 rounded-full ${CLASS_DOT[s.english_class] || 'bg-ink-3'}`} />{lang === 'ko' ? `${s.grade}학년` : `G${s.grade}`} · {s.english_class}</span>
                      {p?.tested ? (
                        <span className="block text-[11px] text-ink mt-1" title={p.through ? `Mastered through ${phonicsSkill(p.through)?.label}` : ''}>
                          <span className="font-semibold">{p.position}</span>/20 {p.through ? phonicsSkill(p.through)?.short : ''}
                          {p.gaps.length > 0 && <AlertTriangle size={10} className="inline text-warn ml-1" />}
                          <span className="text-ink-3"> · {lang === 'ko' ? `${p.testedThrough}번까지` : `to ${p.testedThrough}`}</span>
                        </span>
                      ) : <span className="block text-[11px] text-ink-3 mt-1">{lang === 'ko' ? '미점검' : 'Not checked'}</span>}
                      {f && <span className="block mt-1"><FlagChip f={f} lang={lang} /></span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {PHONICS_GROUPS.map(g => {
                const rows = sheets.filter(s => s.group === g.id)
                if (rows.length === 0) return null
                return (
                  <Fragment key={g.id}>
                    <tr className="bg-paper-2"><td colSpan={students.length + 1} className="px-4 py-1 eyebrow font-semibold">{lang === 'ko' ? g.label_ko : g.label}</td></tr>
                    {rows.map(sk => (
                      <tr key={sk.id} className="border-t border-rule">
                        <td className="px-4 py-1 text-ink truncate" title={sk.covers}><span className="text-ink-3 text-[10.5px] mr-1.5">{PHONICS_SKILLS.indexOf(sk) + 1}</span>{lang === 'ko' ? sk.label_ko : sk.label}</td>
                        {students.map(s => {
                          const l = latestByStudent[s.id]?.[sk.id]
                          if (!l) return <td key={s.id} className="px-2 py-1 border-l border-rule"><span className="block h-7 rounded-sm bg-paper-2/60 text-ink-3/50 text-center leading-7">·</span></td>
                          const band = phonicsBand(l.score)
                          const trouble = (checksById[l.checkId]?.observations?.[sk.id] || []).filter(o => o.startsWith(PATTERN_PREFIX)).map(o => o.slice(PATTERN_PREFIX.length))
                          return (
                            <td key={s.id} className="px-2 py-1 border-l border-rule">
                              <div className={`h-7 rounded-sm px-2 flex items-center justify-between gap-1 ${BAND_TONE[band]}`}
                                title={`${sk.label}: ${scoreText(l.score)} · ${PHONICS_BAND_LABELS[band].en} · ${fmtShort(l.date, lang)}${trouble.length ? `\nTrouble: ${trouble.join(', ')}` : ''}`}>
                                <span className="font-semibold">{l.score.pct}%</span>
                                <span className="text-[10px] opacity-75">{scoreText(l.score)}</span>
                              </div>
                              {trouble.length > 0 && <span className="block text-[10px] text-ink-3 truncate mt-0.5" title={trouble.join(', ')}>{trouble.join(', ')}</span>}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </Fragment>
                )
              })}
              <tr className="border-t-2 border-rule-2 align-top">
                <td className="px-4 py-2 text-ink font-semibold">{lang === 'ko' ? '해독 방식' : 'How they decoded'}<span className="block text-[10.5px] font-normal text-ink-3">{lang === 'ko' ? '시트 수' : 'sheets ticked'}</span></td>
                {students.map(s => (
                  <td key={s.id} className="px-2 py-2 border-l border-rule text-[11px] leading-snug">
                    {howBy[s.id].length === 0 ? <span className="text-ink-3">—</span> : howBy[s.id].map(([o, n]) => {
                      const d = DECODING_OBSERVATIONS.find(x => x.id === o)
                      const tone = o === 'guessing' || o === 'omitted' || o === 'vowel_confusion' ? 'text-bad' : o === 'automatic' || o === 'flexible' ? 'text-good' : 'text-ink-2'
                      return <span key={o} className={`block ${tone}`}>{d ? (lang === 'ko' ? d.label_ko : d.label) : o} <span className="text-ink-3">×{n}</span></span>
                    })}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
