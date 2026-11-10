'use client'

import { useState } from 'react'
import type { Student } from '@/types'
import { getDisplayName } from '@/lib/utils'
import {
  PHONICS_BAND_LABELS, DECODING_OBSERVATIONS, PATTERN_PREFIX,
  phonicsSkill, phonicsBand, scoreSkill, sortChecksAsc, wordHistory,
  type PhonicsCheckRow,
} from '@/lib/phonics'
import { BAND_TONE, BAND_CHIP, fmtShort, fmtLong } from '@/components/reading/phonicsTones'
import { Check, Pencil, X } from 'lucide-react'

// ─── One sheet, one student: every attempt ───────────────────────
// Opened from a heat map cell or a progress grid cell. Shows the attempt
// picked (words as read, what was heard, the observations), the other
// attempts as chips to flip between, and how each missed word went across
// all of them.

export default function PhonicsCellDetail({ student, skill, checks, lang, initialCheckId, onClose, onRecheck, onEdit }: {
  student: Student; skill: string; checks: PhonicsCheckRow[]; lang: 'en' | 'ko'; initialCheckId?: string
  onClose: () => void; onRecheck: () => void; onEdit: (c: PhonicsCheckRow) => void
}) {
  const sk = phonicsSkill(skill)
  // Newest first for the chips; the grid of words runs oldest first.
  const history = sortChecksAsc(checks.filter(c => c.student_id === student.id && c.skills.includes(skill))).reverse()
  const [showingId, setShowingId] = useState<string | null>(initialCheckId || history[0]?.id || null)
  const showing = history.find(c => c.id === showingId) || history[0]
  if (!sk || !showing) return null
  const score = scoreSkill(showing, skill)!
  const band = phonicsBand(score)
  const marks = showing.results[skill] || {}
  const heard = showing.heard?.[skill] || {}
  const obs = showing.observations?.[skill] || []
  const how = obs.filter(o => !o.startsWith(PATTERN_PREFIX)).map(o => DECODING_OBSERVATIONS.find(d => d.id === o)).filter(Boolean)
  const trouble = obs.filter(o => o.startsWith(PATTERN_PREFIX)).map(o => o.slice(PATTERN_PREFIX.length))
  const words = wordHistory(history, skill)
  const attemptsAsc = [...history].reverse()

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{getDisplayName(student)} · {student.korean_name}</p>
            <h3 className="font-display text-[22px] leading-tight text-ink mt-1">{lang === 'ko' ? sk.label_ko : sk.label}</h3>
            <p className="text-[12.5px] text-ink-2 mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold mr-2 ${BAND_TONE[band]}`} title={PHONICS_BAND_LABELS[band].means}>{PHONICS_BAND_LABELS[band][lang]}</span>
              {score.correct} / {score.total} · {score.pct}% · {fmtLong(showing.date, lang)}{score.unread > 0 && <span className="text-ink-3"> · {score.unread} {lang === 'ko' ? '미읽음' : 'not read'}</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          {history.length > 1 && (
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '시도' : 'Attempts'} · {history.length}</p>
              <div className="flex flex-wrap gap-1.5">
                {history.map(c => { const s = scoreSkill(c, skill)!; const b = phonicsBand(s); return (
                  <button key={c.id} onClick={() => setShowingId(c.id)} className={`px-2 py-1 rounded border text-[11.5px] tabular-nums ${c.id === showing.id ? 'ring-2 ring-ink/40' : ''} ${BAND_CHIP[b]}`}>{fmtShort(c.date, lang)} · {s.correct}/{s.total}</button>
                ) })}
              </div>
            </div>
          )}
          <div>
            {history.length > 1 && <p className="eyebrow mb-1.5">{lang === 'ko' ? '이 시도의 단어' : 'Words on this attempt'} · {fmtShort(showing.date, lang)}</p>}
            <div className="flex flex-wrap gap-1.5">
              {[...sk.words, ...Object.keys(marks).filter(w => !sk.words.includes(w))].map(w => {
                const m = marks[w]
                return (
                  <span key={w} className={`inline-flex flex-col items-center px-2.5 py-1 rounded border font-serif text-[15px] leading-tight ${m === 'correct' ? 'bg-good-soft border-good/30 text-good' : m === 'error' ? 'bg-bad-soft border-bad/30 text-bad' : 'bg-paper-2 border-rule text-ink-3'}`}>
                    <span className="inline-flex items-center gap-1">{w}{m === 'correct' ? <Check size={11} /> : m === 'error' ? <X size={11} /> : null}</span>
                    {m === 'error' && heard[w] && <span className="font-sans text-[10.5px] italic opacity-80">“{heard[w]}”</span>}
                  </span>
                )
              })}
            </div>
          </div>
          {(how.length > 0 || trouble.length > 0) && (
            <div className="text-[12.5px] text-ink-2 space-y-1">
              {how.length > 0 && <p><span className="eyebrow mr-1.5">{lang === 'ko' ? '해독 방식' : 'How they decoded'}</span>{how.map(d => lang === 'ko' ? d!.label_ko : d!.label).join(' · ')}</p>}
              {trouble.length > 0 && <p><span className="eyebrow mr-1.5">{lang === 'ko' ? '어려운 패턴' : 'Trouble with'}</span>{trouble.join(', ')}</p>}
            </div>
          )}
          {showing.notes && <p className="text-[12.5px] text-ink-2 italic">“{showing.notes}”</p>}

          {/* Which words keep tripping the student, across every attempt. */}
          {history.length > 1 && words.length > 0 && (
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '시도별 틀린 단어' : 'Missed words across attempts'}</p>
              <table className="text-[12px] tabular-nums border-collapse">
                <thead>
                  <tr>
                    <th className="text-left pr-3 pb-1 text-[10.5px] font-semibold text-ink-3">{lang === 'ko' ? '단어' : 'Word'}</th>
                    {attemptsAsc.map(c => <th key={c.id} className={`px-1 pb-1 text-[10.5px] font-semibold whitespace-nowrap ${c.id === showing.id ? 'text-ink' : 'text-ink-3'}`}>{fmtShort(c.date, lang)}</th>)}
                    <th className="pl-3 pb-1 text-[10.5px] font-semibold text-ink-3 text-right">{lang === 'ko' ? '틀림' : 'Missed'}</th>
                  </tr>
                </thead>
                <tbody>
                  {words.map(h => (
                    <tr key={h.word} className="border-t border-rule">
                      <td className="pr-3 py-1 font-serif text-[14px] text-ink">{h.word}</td>
                      {h.marks.map((m, i) => (
                        <td key={i} className="px-1 py-1 text-center">
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-sm ${m === 'correct' ? 'bg-good-soft text-good' : m === 'error' ? 'bg-bad-soft text-bad' : 'bg-paper-2 text-ink-3/50'}`}>
                            {m === 'correct' ? <Check size={11} /> : m === 'error' ? <X size={11} /> : '·'}
                          </span>
                        </td>
                      ))}
                      <td className={`pl-3 py-1 text-right font-semibold ${h.misses >= 2 ? 'text-bad' : 'text-ink-2'}`}>{h.misses}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-rule-2 flex items-center gap-2">
          <button onClick={onRecheck} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover">{lang === 'ko' ? '이 시트 다시 점검' : 'Recheck this sheet'}</button>
          <button onClick={() => onEdit(showing)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><Pencil size={12} /> {lang === 'ko' ? '이 시도 수정' : 'Edit this attempt'}</button>
        </div>
      </div>
    </div>
  )
}
