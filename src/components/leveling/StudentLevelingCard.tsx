'use client'

import { useMemo } from 'react'
import { Student, EnglishClass, ENGLISH_CLASSES } from '@/types'
import { classToColor, classToTextColor } from '@/lib/utils'
import { CheckCircle2, Circle, AlertTriangle, Star } from 'lucide-react'

// ============================================================================
// TYPES
// ============================================================================

interface StudentLevelingCardProps {
  student: Student
  scoreRow: any // level_test_scores row: { raw_scores, calculated_metrics, composite_index, composite_band, previous_class }
  anecdotal?: any // teacher_anecdotal_ratings row
  semGrades?: any[] // semester_grades rows
  autoPlacement?: EnglishClass | null
  currentPlacement?: EnglishClass | null
  grade: number | string
  rank?: number
  compact?: boolean // for print mode - slightly smaller
}

// ============================================================================
// CLASS COLORS (inline to avoid needing app CSS vars)
// ============================================================================

const CLS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Lily: { bg: '#fce4ec', text: '#880e4f', border: '#f48fb1' },
  Camellia: { bg: '#fff3e0', text: '#e65100', border: '#ffcc80' },
  Daisy: { bg: '#fffde7', text: '#f57f17', border: '#fff176' },
  Sunflower: { bg: '#e8f5e9', text: '#2e7d32', border: '#a5d6a7' },
  Marigold: { bg: '#e3f2fd', text: '#1565c0', border: '#90caf9' },
  Snapdragon: { bg: '#ede7f6', text: '#4527a0', border: '#b39ddb' },
}

// ============================================================================
// G1 STANDARDS (duplicated from Grade1ScoreEntry to avoid circular imports)
// ============================================================================

const G1_STANDARDS = [
  { code: 'RF.K.1d', short: 'Letter Names' },
  { code: 'RF.K.3a', short: 'Letter Sounds' },
  { code: 'RF.K.2', short: 'Phon Awareness' },
  { code: 'RF.K.3c', short: 'HF Words (K)' },
  { code: 'RF.1.3g', short: 'HF Words (1)' },
  { code: 'SL.K.2', short: 'Listening' },
  { code: 'RL.K.1', short: 'Key Details' },
  { code: 'W.K.2', short: 'Writing (K)' },
  { code: 'W.1.2', short: 'Writing (1)' },
  { code: 'L.K.2d', short: 'Spelling' },
  { code: 'RF.1.4', short: 'Fluency' },
]

const G1_WRITTEN_SECTIONS = [
  { key: 'w_letter_names', label: 'Letter Names', max: 5 },
  { key: 'w_letter_sounds', label: 'Letter Sounds', max: 5 },
  { key: 'w_word_picture', label: 'Word-Picture', max: 10 },
  { key: 'w_passage_comp', label: 'Passage Comp', max: 5 },
  { key: 'w_writing', label: 'Writing', max: 5 },
]

const PASSAGE_TITLES: Record<string, string> = {
  A: 'Oral Interview', B: 'HF Word List', C: 'Simple Sentences',
  D: 'My Cat', E: 'Lunch Time', F: 'Rainy Day',
}

const NAEP_LABELS: Record<number, string> = {
  1: 'Word-by-word', 2: 'Choppy phrases', 3: 'Appropriate phrasing', 4: 'Smooth & expressive',
}

const ANECDOTAL_DIMS = [
  { key: 'receptive_language', short: 'Recep' },
  { key: 'productive_language', short: 'Prod' },
  { key: 'engagement_pace', short: 'Engage' },
  { key: 'placement_recommendation', short: 'Place' },
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function StudentLevelingCard({
  student, scoreRow, anecdotal, semGrades, autoPlacement, currentPlacement, grade, rank, compact,
}: StudentLevelingCardProps) {
  const raw = scoreRow?.raw_scores || {}
  const calc = scoreRow?.calculated_metrics || {}
  const isG1 = String(grade) === '1'
  const numGrade = Number(grade)

  // Determine placement info
  const teacherImpression = isG1 ? (raw.wave1_class_impression || null) : null
  const algoSuggested = scoreRow?.composite_band || autoPlacement || null
  const currentCls = currentPlacement || student.english_class

  // For G1, the "teacher impression" is the class impression from oral test
  // For G2-5, we use the anecdotal teacher_recommends
  const teacherLabel = isG1 ? teacherImpression : currentCls
  const algoLabel = algoSuggested

  const disagree = isG1
    ? (teacherImpression && algoSuggested && teacherImpression !== algoSuggested)
    : (algoSuggested && algoSuggested !== currentCls)

  // Composite
  const composite = isG1
    ? (scoreRow?.composite_index != null ? Math.round(scoreRow.composite_index) : null)
    : (calc.composite != null ? Math.round((typeof calc.composite === 'number' && calc.composite <= 1 ? calc.composite * 100 : calc.composite)) : null)

  // Passage info
  const passageLevel = isG1 ? (raw.o_passage_level || calc.passage_level || null) : (raw.passage_level || calc.passage_level || null)
  const passageTitle = passageLevel ? (PASSAGE_TITLES[passageLevel] || `Level ${passageLevel}`) : null

  // CWPM / accuracy
  const cwpm = isG1 ? calc.cwpm : (calc.weighted_cwpm ?? calc.cwpm ?? null)
  const accuracy = isG1 ? null : (calc.accuracy_pct ?? null)
  const naep = isG1 ? raw.o_naep : raw.naep

  // Watchlist
  const isWatchlist = anecdotal?.is_watchlist || false

  // Notes
  const testNotes = isG1 ? raw.teacher_notes : raw.notes
  const anecNotes = anecdotal?.notes

  // Previous attempts
  const prevAttempts = isG1 ? (raw.passages_attempted || []) : (calc.passages_attempted || raw.passages_attempted || [])

  const clsColor = CLS_COLORS[teacherLabel || currentCls] || CLS_COLORS.Lily

  return (
    <div className={`bg-surface border border-border rounded-xl overflow-hidden ${compact ? '' : 'shadow-sm'}`}
      style={{ pageBreakInside: 'avoid' }}>

      {/* ── TOP BAR ── */}
      <div className="flex items-stretch">
        <div className="w-1.5 flex-shrink-0" style={{ backgroundColor: clsColor.text }} />
        <div className="flex-1 px-4 py-3 flex items-center justify-between border-b border-border">
          <div className="flex items-baseline gap-2">
            {rank != null && <span className="text-[9px] text-text-tertiary font-bold">#{rank}</span>}
            <span className="text-[16px] font-display font-bold text-navy">{student.english_name}</span>
            <span className="text-[11px] text-text-tertiary">{student.korean_name}</span>
            {isWatchlist && (
              <span className="text-[8px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Watchlist</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Teacher / algo badges */}
            {isG1 && teacherImpression && (
              <div className="text-center">
                <div className="text-[7px] text-text-tertiary uppercase tracking-wider mb-0.5">Teacher</div>
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: CLS_COLORS[teacherImpression]?.bg, color: CLS_COLORS[teacherImpression]?.text, border: `1px solid ${CLS_COLORS[teacherImpression]?.border}` }}>
                  {teacherImpression}
                </span>
              </div>
            )}
            {!isG1 && (
              <div className="text-center">
                <div className="text-[7px] text-text-tertiary uppercase tracking-wider mb-0.5">Current</div>
                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold"
                  style={{ backgroundColor: classToColor(currentCls as EnglishClass), color: classToTextColor(currentCls as EnglishClass) }}>
                  {currentCls}
                </span>
              </div>
            )}
            {algoLabel && (
              <div className="text-center">
                <div className="text-[7px] uppercase tracking-wider mb-0.5" style={{ color: disagree ? '#dc2626' : '#16a34a' }}>
                  {disagree ? 'Algo' : 'Agrees'}
                </div>
                {disagree ? (
                  <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold"
                    style={{ backgroundColor: CLS_COLORS[algoLabel]?.bg, color: CLS_COLORS[algoLabel]?.text, border: `1px solid ${CLS_COLORS[algoLabel]?.border}` }}>
                    {algoLabel}
                  </span>
                ) : (
                  <CheckCircle2 size={14} className="text-green-500 mx-auto" />
                )}
              </div>
            )}
            {/* Composite */}
            {composite != null && (
              <div className="bg-navy text-white rounded-lg px-3 py-1.5 text-center ml-1">
                <div className="text-[7px] text-gold uppercase tracking-wider">Composite</div>
                <div className="text-[20px] font-bold leading-none">{composite}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── THREE COLUMNS ── */}
      <div className="grid grid-cols-3 divide-x divide-border">

        {/* Column 1: Oral Test */}
        <div className="p-3.5">
          <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-2">Oral Test</div>

          {/* Passage info box */}
          {passageLevel && (
            <div className="bg-surface-alt rounded-lg p-2.5 mb-2.5">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-navy">Level {passageLevel}</span>
                <span className="text-[9px] text-text-tertiary">{passageTitle}</span>
              </div>
              {cwpm != null && (
                <div className="flex gap-3 mt-1.5 text-[10px]">
                  <span><strong className="text-navy">{cwpm}</strong> <span className="text-text-tertiary">CWPM</span></span>
                  {accuracy != null && (
                    <span>
                      <strong className={accuracy >= 95 ? 'text-green-600' : accuracy >= 90 ? 'text-amber-600' : 'text-red-600'}>{accuracy}%</strong>
                      <span className="text-text-tertiary"> acc</span>
                    </span>
                  )}
                  {naep != null && (
                    <span><strong className="text-navy">{naep}</strong><span className="text-text-tertiary">/4</span></span>
                  )}
                </div>
              )}
              {naep != null && (
                <div className="text-[9px] text-text-tertiary mt-1">{NAEP_LABELS[naep]}</div>
              )}
              {/* Level A interview */}
              {isG1 && passageLevel === 'A' && (
                <div className="text-[10px] mt-1.5">
                  <span className="text-text-secondary">Interview: </span>
                  <strong className="text-navy">{(raw.o_a_q1 ?? 0) + (raw.o_a_q2 ?? 0) + (raw.o_a_q3 ?? 0) + (raw.o_a_q4 ?? 0) + (raw.o_a_q5 ?? 0)}/20</strong>
                  <div className="flex gap-1 mt-1">
                    {[raw.o_a_q1, raw.o_a_q2, raw.o_a_q3, raw.o_a_q4, raw.o_a_q5].map((q, i) => (
                      <span key={i} className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                        q != null && q >= 3 ? 'bg-green-100 text-green-700' : q != null && q >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-surface text-text-tertiary'
                      }`}>{q ?? '-'}</span>
                    ))}
                  </div>
                </div>
              )}
              {/* Level B word reading */}
              {isG1 && passageLevel === 'B' && raw.o_orf_raw != null && (
                <div className="text-[10px] mt-1.5 text-text-secondary">Words: <strong className="text-navy">{raw.o_orf_raw}/20</strong></div>
              )}
              {/* Level C sentence reading */}
              {isG1 && passageLevel === 'C' && raw.o_orf_raw != null && (
                <div className="text-[10px] mt-1.5 text-text-secondary">Sentence words: <strong className="text-navy">{raw.o_orf_raw}/11</strong></div>
              )}
            </div>
          )}

          {/* Component scores */}
          <div className="space-y-0.5">
            {isG1 ? (
              <>
                <ScoreLine label="Letter Names" value={raw.o_alpha_names} max={16} />
                <ScoreLine label="Letter Sounds" value={raw.o_alpha_sounds} max={16} />
                <ScoreLine label="Words Given" value={raw.o_alpha_words} max={5} />
                <ScoreLine label="Phoneme" value={raw.o_phoneme} max={20} />
                <ScoreLine label="Open Response" value={raw.o_open_response} max={5} />
              </>
            ) : (
              <>
                {numGrade === 2 && (
                  <>
                    <ScoreLine label="Phonics" value={calc.phonics_total} max={25} />
                    <ScoreLine label="Sentences" value={calc.sentence_total} max={35} />
                  </>
                )}
                {raw.word_reading_correct != null && (
                  <ScoreLine label="Word Reading" value={raw.word_reading_correct} max={raw.word_reading_attempted || 20} />
                )}
              </>
            )}
          </div>

          {/* Comprehension breakdown */}
          {(() => {
            const compKeys = isG1
              ? [raw.o_comp_q1, raw.o_comp_q2, raw.o_comp_q3, raw.o_comp_q4, raw.o_comp_q5]
              : [raw.comp_1, raw.comp_2, raw.comp_3, raw.comp_4, raw.comp_5]
            const compVals = compKeys.filter(v => v != null)
            if (compVals.length === 0) return null
            const compTotal = compVals.reduce((a, b) => a + b, 0)
            const compMax = isG1 ? (calc.comp_max || compVals.length * 2) : (calc.comp_max || 15)
            return (
              <div className="mt-2.5 bg-surface-alt rounded-lg p-2.5">
                <div className="text-[9px] font-bold text-text-secondary mb-1.5">COMPREHENSION {compTotal}/{compMax}</div>
                <div className="flex gap-1">
                  {compKeys.map((q, i) => q != null ? (
                    <span key={i} className={`w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center ${
                      isG1
                        ? (q === 2 ? 'bg-green-100 text-green-700' : q === 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600')
                        : (q >= 3 ? 'bg-green-100 text-green-700' : q === 2 ? 'bg-blue-100 text-blue-700' : q === 1 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600')
                    }`}>{q}</span>
                  ) : null)}
                </div>
              </div>
            )
          })()}

          {/* Previous attempts */}
          {prevAttempts.length > 0 && (
            <div className="mt-2 text-[9px] text-text-tertiary italic">
              Prev: {prevAttempts.map((a: any, i: number) => {
                const label = `Lv ${a.level}`
                const detail = a.cwpm ? `${a.cwpm} CWPM` : a.o_orf_raw != null ? `${a.o_orf_raw}` : a.orf_words_read != null && a.orf_errors != null && a.orf_time_seconds ? `${Math.round(((a.orf_words_read - a.orf_errors) / (a.orf_time_seconds || 60)) * 60)} CWPM` : ''
                return <span key={i}>{i > 0 && ', '}{label}{detail ? ` (${detail})` : ''}</span>
              })}
            </div>
          )}
        </div>

        {/* Column 2: Written Test + Standards + Teacher Ratings */}
        <div className="p-3.5">
          {/* Written test */}
          {isG1 ? (
            <>
              <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-2">
                Written Test <span className="text-text-tertiary font-normal">{G1_WRITTEN_SECTIONS.reduce((a, s) => a + ((raw as any)[s.key] ?? 0), 0)}/30</span>
              </div>
              <div className="space-y-0.5 mb-3">
                {G1_WRITTEN_SECTIONS.map(sec => (
                  <ScoreLine key={sec.key} label={sec.label} value={(raw as any)[sec.key]} max={sec.max} />
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-2">Written Test</div>
              <div className="space-y-0.5 mb-3">
                {raw.writing != null && <ScoreLine label="Writing Rubric" value={raw.writing} max={20} />}
                {raw.written_mc != null && <ScoreLine label="Multiple Choice" value={raw.written_mc} max={numGrade === 2 ? 30 : numGrade === 3 ? 35 : numGrade === 4 ? 40 : 45} />}
              </div>
            </>
          )}

          {/* Teacher Ratings (G2-5 anecdotal) */}
          {anecdotal && ANECDOTAL_DIMS.some(d => anecdotal[d.key] != null) && (
            <div className="mb-3">
              <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-1.5">Teacher Rating</div>
              <div className="flex gap-1.5">
                {ANECDOTAL_DIMS.map(d => {
                  const v = anecdotal[d.key]
                  if (v == null) return null
                  return (
                    <div key={d.key} className="text-center flex-1">
                      <div className={`w-full py-1 rounded text-[11px] font-bold ${
                        v >= 4 ? 'bg-green-100 text-green-700' : v === 3 ? 'bg-blue-100 text-blue-700' : v === 2 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>{v}</div>
                      <div className="text-[7px] text-text-tertiary mt-0.5">{d.short}</div>
                    </div>
                  )
                })}
              </div>
              {anecdotal.teacher_recommends && (
                <div className={`mt-1.5 text-[9px] font-bold ${
                  anecdotal.teacher_recommends === 'move_up' ? 'text-green-600' : anecdotal.teacher_recommends === 'move_down' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  Rec: {anecdotal.teacher_recommends === 'keep' ? 'KEEP' : anecdotal.teacher_recommends === 'move_up' ? 'MOVE UP' : 'MOVE DOWN'}
                </div>
              )}
            </div>
          )}

          {/* Standards */}
          {isG1 && calc.standards_baseline && (
            <div>
              <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-1.5">
                Standards <span className="text-text-tertiary font-normal">{calc.standards_baseline.filter((s: any) => s.met).length}/{calc.standards_baseline.length} met</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {calc.standards_baseline.map((std: any) => (
                  <span key={std.code} className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${
                    std.met ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-surface-alt text-text-tertiary border border-border'
                  }`}>
                    {std.code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* G2-5 Standards */}
          {!isG1 && calc.standards_baseline && Array.isArray(calc.standards_baseline) && (
            <div>
              <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-1.5">
                Standards <span className="text-text-tertiary font-normal">{calc.standards_baseline.filter((s: any) => s.met).length}/{calc.standards_baseline.length} met</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {calc.standards_baseline.map((std: any) => (
                  <span key={std.code} className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${
                    std.met ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-surface-alt text-text-tertiary border border-border'
                  }`}>
                    {std.code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Semester grades (if available) */}
          {semGrades && semGrades.length > 0 && (
            <div className="mt-2.5">
              <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-1.5">Semester Grades</div>
              <div className="grid grid-cols-3 gap-1">
                {semGrades.slice(0, 6).map((g: any, i: number) => (
                  <div key={i} className="bg-surface-alt rounded px-2 py-1 text-center">
                    <div className="text-[8px] text-text-tertiary truncate capitalize">{g.domain || g.subject}</div>
                    <div className={`text-[11px] font-bold ${
                      (g.score ?? g.final_grade ?? 0) >= 80 ? 'text-green-600' : (g.score ?? g.final_grade ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'
                    }`}>{Math.round(g.score ?? g.final_grade ?? 0)}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Column 3: Notes + Decision */}
        <div className="p-3.5 flex flex-col">
          <div className="text-[8px] font-bold text-gold uppercase tracking-widest mb-2">Notes & Decision</div>

          {/* Test notes */}
          {testNotes && (
            <div className="text-[10px] text-text-secondary leading-relaxed mb-2">
              {testNotes}
            </div>
          )}

          {/* Anecdotal notes (separate from test notes) */}
          {anecNotes && anecNotes !== testNotes && (
            <div className="text-[10px] text-text-secondary leading-relaxed mb-2 bg-surface-alt rounded-lg px-2.5 py-2 italic">
              "{anecNotes}"
            </div>
          )}

          {/* No notes fallback */}
          {!testNotes && !anecNotes && (
            <div className="text-[10px] text-text-tertiary italic mb-2">No testing notes recorded.</div>
          )}

          <div className="flex-1" />

          {/* Disagreement callout */}
          {disagree && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 mb-2.5 flex items-start gap-1.5">
              <AlertTriangle size={12} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="text-[9px] text-amber-800 leading-relaxed">
                <strong>Disagreement:</strong>{' '}
                {isG1
                  ? `Teacher says ${teacherImpression}, algorithm says ${algoLabel}.`
                  : `Current class is ${currentCls}, algorithm suggests ${algoLabel}.`
                }
              </div>
            </div>
          )}

          {/* Final placement write-in (for print) */}
          <div className="border-t border-border pt-2.5">
            <div className="text-[8px] font-bold text-text-tertiary uppercase tracking-wider mb-1.5">Final Placement</div>
            <div className="border-2 border-dashed border-border rounded-lg px-3 py-2.5 text-[10px] text-text-tertiary italic min-h-[32px] flex items-center">
              write in...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// PRINT DOSSIER WRAPPER
// ============================================================================

export function PrintDossier({ students, scores, anecdotals, semGrades, autoPlacements, placements, grade, levelTestName }: {
  students: Student[]
  scores: Record<string, any>
  anecdotals?: Record<string, any>
  semGrades?: Record<string, any[]>
  autoPlacements?: Record<string, EnglishClass>
  placements?: Record<string, EnglishClass>
  grade: number | string
  levelTestName?: string
}) {
  // Sort by composite (high to low)
  const sorted = useMemo(() => {
    return [...students].map(s => {
      const sc = scores[s.id]
      const composite = sc?.composite_index ?? sc?.calculated_metrics?.composite ?? 0
      return { student: s, composite: typeof composite === 'number' && composite <= 1 ? composite * 100 : composite }
    }).sort((a, b) => b.composite - a.composite)
  }, [students, scores])

  return (
    <div className="bg-surface min-h-screen">
      {/* Header */}
      <div className="bg-navy text-white px-8 py-5 print:px-6 print:py-4" style={{ borderBottom: '3px solid #c9a84c' }}>
        <div className="text-[10px] uppercase tracking-[3px] opacity-40 mb-1">Daewoo Elementary English Program</div>
        <h1 className="font-display text-[22px] font-bold">Student Leveling Dossier</h1>
        <div className="text-[12px] opacity-50 italic mt-0.5">
          {levelTestName || `Grade ${grade}`} -- {sorted.length} students -- sorted by composite
        </div>
      </div>

      {/* Cards */}
      <div className="px-8 py-5 print:px-4 print:py-3 space-y-4 print:space-y-3">
        {sorted.map((item, i) => (
          <div key={item.student.id}>
            <StudentLevelingCard
              student={item.student}
              scoreRow={scores[item.student.id]}
              anecdotal={anecdotals?.[item.student.id]}
              semGrades={semGrades?.[item.student.id]}
              autoPlacement={autoPlacements?.[item.student.id]}
              currentPlacement={placements?.[item.student.id]}
              grade={grade}
              rank={i + 1}
              compact
            />
            {/* Page break hint every 2 cards */}
            {(i + 1) % 2 === 0 && i < sorted.length - 1 && (
              <div className="hidden print:block" style={{ pageBreakAfter: 'always' }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================================
// HELPERS
// ============================================================================

function ScoreLine({ label, value, max }: { label: string; value: number | null | undefined; max: number }) {
  if (value == null) return null
  const pct = max > 0 ? value / max : 0
  const barColor = pct >= 0.8 ? '#16a34a' : pct >= 0.5 ? '#ca8a04' : pct > 0 ? '#dc2626' : '#e5e7eb'
  return (
    <div className="flex items-center gap-1.5 h-5">
      <span className="w-20 text-[9px] text-text-secondary flex-shrink-0 truncate">{label}</span>
      <div className="flex-1 h-1 bg-surface-alt rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct * 100}%`, backgroundColor: barColor }} />
      </div>
      <span className="text-[9px] font-bold text-navy min-w-[28px] text-right">{value}/{max}</span>
    </div>
  )
}
