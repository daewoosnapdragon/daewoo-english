'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { withoutAwayDays } from '@/lib/calendarDays'
import { EnglishClass, ENGLISH_CLASSES } from '@/types'
import { classToTextColor, classTint, classDot } from '@/lib/utils'
import { WIDA_LEVELS } from '@/lib/wida'
import { latestBySkill, orderSkills, phonicsBand, phonicsSkill, summarizeStudent, scoreText, type LatestBySkill } from '@/lib/phonics'
import { loadStudentPhonicsChecks } from '@/lib/phonicsData'

interface HoverData {
  grades: { domain: string; score: number }[]
  reading: { date: string; cwpm: number }[]
  wida: Record<string, number>
  attCounts: { present: number; absent: number; tardy: number }
  /** Latest phonics check per skill: where decoding stands, for the leveling meeting. */
  phonics: LatestBySkill
}

// Class averages for the current level test (passed from LevelingView)
interface ClassAvgData {
  oral: number | null
  writing: number | null
  mc: number | null
  comp: number | null
  composite: number | null
  count: number
}

interface LevelTestData {
  // This student's scores
  rawCwpm: number | null
  rawWriting: number | null
  rawMc: number | null
  rawComp: number | null
  passageLevel: string | null
  composite: number
  percentile: number | null
  suggestedClass: string | null
  // Class averages keyed by EnglishClass name
  classAverages: Record<string, ClassAvgData>
  // Grade-specific MC total
  mcTotal: number
}

export default function LevelingHoverCard({ studentId, studentName, koreanName, className, grade, trigger, levelTestData }: {
  studentId: string; studentName: string; koreanName: string; className: string; grade: number; trigger: React.ReactNode
  levelTestData?: LevelTestData
}) {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<HoverData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLSpanElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<'left' | 'right' | 'center'>('left')

  const loadData = async () => {
    if (loaded) return
    const [{ data: sg }, { data: rd }, { data: wd }, { data: at }, phonicsRows] = await Promise.all([
      supabase.from('semester_grades').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
      supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(4),
      supabase.from('student_wida_levels').select('*').eq('student_id', studentId),
      supabase.from('attendance').select('status, date').eq('student_id', studentId),
      loadStudentPhonicsChecks(studentId).catch(() => []),
    ])
    const attCounts = { present: 0, absent: 0, tardy: 0 }
    at?.forEach((a: any) => { if (attCounts[a.status as keyof typeof attCounts] !== undefined) attCounts[a.status as keyof typeof attCounts]++ })
    const wida: Record<string, number> = {}
    wd?.forEach((w: any) => { wida[w.domain] = w.wida_level })
    const gradeMap: Record<string, number> = {}
    sg?.forEach((g: any) => { if (g.score != null && !gradeMap[g.domain]) gradeMap[g.domain] = g.score })
    setData({
      grades: Object.entries(gradeMap).map(([domain, score]) => ({ domain, score })),
      reading: (rd || []).map((r: any) => ({ date: r.date, cwpm: r.cwpm })),
      wida, attCounts,
      phonics: latestBySkill(phonicsRows || []),
    })
    setLoaded(true)
  }

  const computePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const viewW = window.innerWidth
    // If trigger is in the right third of the screen, open card to the left
    if (rect.left > viewW * 0.65) setPosition('right')
    // If trigger is in the left third, open card to the right
    else if (rect.left < viewW * 0.35) setPosition('left')
    else setPosition('center')
  }, [])

  const handleEnter = () => { timerRef.current = setTimeout(() => { computePosition(); setShow(true); loadData() }, 250) }
  const handleLeave = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setShow(false), 150) }
  const handleCardEnter = () => { if (timerRef.current) clearTimeout(timerRef.current) }
  const handleCardLeave = () => { timerRef.current = setTimeout(() => setShow(false), 150) }

  const widaVals = data ? Object.values(data.wida).filter(v => v > 0) : []
  const widaAvg = widaVals.length > 0 ? Math.floor((widaVals.reduce((a, b) => a + b, 0) / widaVals.length) * 10) / 10 : null
  const widaInfo = widaAvg ? WIDA_LEVELS.find(w => w.level === Math.floor(widaAvg)) : null
  const domainLabels: Record<string, string> = { listening: 'L', speaking: 'S', reading: 'R', writing: 'W' }

  const readings = data?.reading || []
  const readTrend = readings.length >= 2
    ? readings[0].cwpm > readings[1].cwpm ? 'up' : readings[0].cwpm < readings[1].cwpm ? 'down' : 'flat'
    : 'flat'

  // Adjacent classes for comparison
  const classIdx = ENGLISH_CLASSES.indexOf(className as EnglishClass)
  const classBelow = classIdx > 0 ? ENGLISH_CLASSES[classIdx - 1] : null
  const classAbove = classIdx < ENGLISH_CLASSES.length - 1 ? ENGLISH_CLASSES[classIdx + 1] : null

  // Position styles
  const posStyles: Record<string, string> = {
    left: 'left-0',
    right: 'right-0',
    center: 'left-1/2 -translate-x-1/2',
  }

  return (
    <span ref={triggerRef} className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {trigger}
      {show && (
        <div ref={cardRef} onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}
          className={`absolute z-[200] top-full mt-1 ${posStyles[position]} ${levelTestData ? 'w-[380px]' : 'w-[320px]'} bg-surface border border-rule-2 rounded-xl shadow-xl overflow-hidden`}>

          {/* Header */}
          <div className="px-4 py-2.5 bg-paper-2 border-b border-rule">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[length:calc(13px*var(--ts))] font-bold text-ink">{studentName}</p>
                <p className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{koreanName} -- {className} -- Grade {grade}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {widaInfo && (
                  <span className="px-2 py-0.5 rounded-lg text-[length:calc(11.5px*var(--ts))] font-bold border"
                    style={{ backgroundColor: `var(--wida-${widaInfo.level})`, color: `var(--wida-${widaInfo.level}-ink)`, borderColor: `color-mix(in srgb, var(--wida-${widaInfo.level}-ink) 30%, transparent)` }}>
                    L{widaInfo.level}
                  </span>
                )}
                {levelTestData?.composite != null && (
                  <span className="px-2 py-0.5 rounded-lg text-[length:calc(11.5px*var(--ts))] font-bold bg-ink text-paper">
                    {(levelTestData.composite * 100).toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {!data ? (
            <div className="p-4 text-center text-[length:calc(11.5px*var(--ts))] text-text-tertiary">Loading...</div>
          ) : (
            <div className="p-3 space-y-2.5">

              {/* ── Level Test Comparison Bars ────────────────── */}
              {levelTestData && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-text-tertiary font-semibold mb-2">Level Test vs. Class Averages</p>
                  <ComparisonBars
                    studentScores={{
                      oral: levelTestData.rawCwpm,
                      writing: levelTestData.rawWriting,
                      mc: levelTestData.rawMc,
                      comp: levelTestData.rawComp,
                    }}
                    currentClass={className as EnglishClass}
                    classBelow={classBelow}
                    classAbove={classAbove}
                    classAverages={levelTestData.classAverages}
                    mcTotal={levelTestData.mcTotal}
                    passageLevel={levelTestData.passageLevel}
                  />
                </div>
              )}

              {/* ── Composite + Rank ─────────────────────────── */}
              {levelTestData && (
                <div className="flex gap-2">
                  {levelTestData.percentile != null && (
                    <div className="flex-1 bg-surface-alt rounded-lg px-2.5 py-1.5 text-center">
                      <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary font-semibold">RANK</p>
                      <p className="text-[length:calc(14px*var(--ts))] font-bold text-navy">{Math.round(levelTestData.percentile * 100)}%ile</p>
                    </div>
                  )}
                  {levelTestData.suggestedClass && (
                    <div className="flex-1 rounded-lg px-2.5 py-1.5 text-center border"
                      style={{ borderColor: classTint(levelTestData.suggestedClass as EnglishClass, 38), backgroundColor: classTint(levelTestData.suggestedClass as EnglishClass, 6) }}>
                      <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary font-semibold">SUGGESTED</p>
                      <p className="text-[length:calc(12px*var(--ts))] font-bold" style={{ color: classToTextColor(levelTestData.suggestedClass as EnglishClass) }}>{levelTestData.suggestedClass}</p>
                    </div>
                  )}
                  {levelTestData.passageLevel && (
                    <div className="flex-1 bg-surface-alt rounded-lg px-2.5 py-1.5 text-center">
                      <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary font-semibold">PASSAGE</p>
                      <p className="text-[length:calc(14px*var(--ts))] font-bold text-navy">{levelTestData.passageLevel}</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── WIDA domains ─────────────────────────────── */}
              {widaVals.length > 0 && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">WIDA Profile</p>
                  <div className="flex gap-1.5">
                    {Object.entries(data.wida).map(([d, v]) => {
                      const info = WIDA_LEVELS.find(w => w.level === Math.floor(v))
                      return (
                        <div key={d} className="flex-1 rounded-lg p-1.5 text-center border"
                          style={info ? { backgroundColor: `var(--wida-${info.level})`, borderColor: `color-mix(in srgb, var(--wida-${info.level}-ink) 30%, transparent)` } : { backgroundColor: 'rgb(var(--paper-2))', borderColor: 'rgb(var(--rule))' }}>
                          <p className="text-[length:calc(11.5px*var(--ts))] font-bold text-ink-2 uppercase">{domainLabels[d] || d}</p>
                          <p className="text-[length:calc(14px*var(--ts))] font-bold" style={{ color: info ? `var(--wida-${info.level}-ink)` : 'rgb(var(--ink-3))' }}>{v}</p>
                        </div>
                      )
                    })}
                  </div>
                  {widaInfo && <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary mt-1 italic">{widaInfo.desc}</p>}
                </div>
              )}

              {/* ── Phonics (decoding) ───────────────────────── */}
              {Object.keys(data.phonics).length > 0 && (() => {
                const sum = summarizeStudent(data.phonics)
                const tone = (b: string) => b === 'mastered' ? 'bg-good border-good text-white' : b === 'developing' ? 'bg-warn-soft border-warn/30 text-warn' : 'bg-bad-soft border-bad/30 text-bad'
                return (
                  <div>
                    <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">Phonics (decoding) · {sum.frontier ? `working on ${phonicsSkill(sum.frontier)?.label}` : 'every checked sheet mastered'}</p>
                    <div className="flex flex-wrap gap-1">
                      {orderSkills(Object.keys(data.phonics)).map(id => { const l = data.phonics[id]; return (
                        <span key={id} className={`px-1.5 py-0.5 rounded border text-[length:calc(11.5px*var(--ts))] font-semibold tabular-nums ${tone(phonicsBand(l.score))}`} title={`${phonicsSkill(id)?.label} · ${l.date}`}>{phonicsSkill(id)?.short} {scoreText(l.score)}</span>
                      ) })}
                    </div>
                  </div>
                )
              })()}

              {/* ── Semester Grades ──────────────────────────── */}
              {data.grades.length > 0 && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">Fall Semester Grades</p>
                  <div className="flex flex-wrap gap-1">
                    {data.grades.slice(0, 6).map((g, i) => (
                      <div key={i} className={`px-2 py-1 rounded-lg text-center min-w-[46px] ${g.score >= 80 ? 'bg-good-soft border border-good/30' : g.score >= 60 ? 'bg-warn-soft border border-warn/30' : 'bg-bad-soft border border-bad/30'}`}>
                        <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary capitalize truncate">{g.domain}</p>
                        <p className={`text-[length:calc(12px*var(--ts))] font-bold ${g.score >= 80 ? 'text-good' : g.score >= 60 ? 'text-warn' : 'text-bad'}`}>{g.score.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Reading trend ────────────────────────────── */}
              {readings.length > 0 && (
                <div>
                  <p className="text-[length:calc(11.5px*var(--ts))] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">Reading Fluency</p>
                  <div className="flex items-center gap-2">
                    {readings.slice(0, 3).map((r, i) => (
                      <div key={i} className="bg-surface-alt rounded-lg px-2.5 py-1.5 text-center flex-1">
                        <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-[length:calc(14px*var(--ts))] font-bold text-navy">{r.cwpm ? Math.round(r.cwpm) : '--'}</p>
                      </div>
                    ))}
                    <div className={`text-[length:calc(16px*var(--ts))] ${readTrend === 'up' ? 'text-good' : readTrend === 'down' ? 'text-bad' : 'text-text-tertiary'}`}>
                      {readTrend === 'up' ? '↑' : readTrend === 'down' ? '↓' : '→'}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Attendance ───────────────────────────────── */}
              <div className="flex gap-1.5 pt-1 border-t border-border">
                <div className="flex-1 text-center py-1 rounded bg-good-soft text-good text-[length:calc(11.5px*var(--ts))] font-medium">{data.attCounts.present}P</div>
                <div className="flex-1 text-center py-1 rounded bg-bad-soft text-bad text-[length:calc(11.5px*var(--ts))] font-medium">{data.attCounts.absent}A</div>
                <div className="flex-1 text-center py-1 rounded bg-warn-soft text-warn text-[length:calc(11.5px*var(--ts))] font-medium">{data.attCounts.tardy}T</div>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  )
}

// ── Comparison Bars Sub-component ───────────────────────────────
function ComparisonBars({ studentScores, currentClass, classBelow, classAbove, classAverages, mcTotal, passageLevel }: {
  studentScores: { oral: number | null; writing: number | null; mc: number | null; comp: number | null }
  currentClass: EnglishClass
  classBelow: EnglishClass | null
  classAbove: EnglishClass | null
  classAverages: Record<string, ClassAvgData>
  mcTotal: number
  passageLevel: string | null
}) {
  const metrics = [
    { key: 'oral', label: `Oral${passageLevel ? ` (${passageLevel})` : ''}`, value: studentScores.oral, maxAuto: null },
    { key: 'writing', label: 'Writing', value: studentScores.writing, maxAuto: 20 },
    { key: 'mc', label: 'MC', value: studentScores.mc, maxAuto: mcTotal },
    { key: 'comp', label: 'Comp', value: studentScores.comp, maxAuto: 15 },
  ].filter(m => m.value != null) as { key: string; label: string; value: number; maxAuto: number | null }[]

  if (metrics.length === 0) return <p className="text-[length:calc(11.5px*var(--ts))] text-text-tertiary italic">No level test scores yet.</p>

  // For each metric, determine max scale from all classes + student value
  const classesToShow = [classBelow, currentClass, classAbove].filter(Boolean) as EnglishClass[]

  return (
    <div className="space-y-2">
      {metrics.map(m => {
        // Gather all values to determine scale
        const allVals: number[] = [m.value]
        classesToShow.forEach(cls => {
          const avg = classAverages[cls]
          if (!avg) return
          const v = m.key === 'oral' ? avg.oral : m.key === 'writing' ? avg.writing : m.key === 'mc' ? avg.mc : avg.comp
          if (v != null) allVals.push(v)
        })
        const maxVal = m.maxAuto ?? Math.max(...allVals) * 1.2
        const scale = maxVal > 0 ? maxVal : 1

        return (
          <div key={m.key}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[length:calc(11.5px*var(--ts))] font-semibold text-text-secondary">{m.label}</span>
              <span className="text-[length:calc(11.5px*var(--ts))] font-bold text-navy">{Math.round(m.value)}{m.maxAuto ? `/${m.maxAuto}` : ''}</span>
            </div>
            <div className="space-y-0.5">
              {/* Class below average */}
              {classBelow && classAverages[classBelow] && (() => {
                const avg = m.key === 'oral' ? classAverages[classBelow].oral : m.key === 'writing' ? classAverages[classBelow].writing : m.key === 'mc' ? classAverages[classBelow].mc : classAverages[classBelow].comp
                if (avg == null) return null
                return (
                  <div className="flex items-center gap-1">
                    <span className="w-14 text-[length:calc(11.5px*var(--ts))] text-right text-text-tertiary truncate">{classBelow}</span>
                    <div className="flex-1 h-2 bg-paper-2 rounded-full overflow-hidden relative">
                      <div className="h-full rounded-full opacity-40" style={{ width: `${(avg / scale) * 100}%`, backgroundColor: classDot(classBelow) }} />
                    </div>
                    <span className="w-6 text-[length:calc(11.5px*var(--ts))] text-text-tertiary text-right">{Math.round(avg)}</span>
                  </div>
                )
              })()}
              {/* Current class average + student marker */}
              {(() => {
                const avg = m.key === 'oral' ? classAverages[currentClass]?.oral : m.key === 'writing' ? classAverages[currentClass]?.writing : m.key === 'mc' ? classAverages[currentClass]?.mc : classAverages[currentClass]?.comp
                return (
                  <div className="flex items-center gap-1">
                    <span className="w-14 text-[length:calc(11.5px*var(--ts))] text-right font-semibold truncate" style={{ color: classToTextColor(currentClass) }}>{currentClass}</span>
                    <div className="flex-1 h-3 bg-paper-2 rounded-full overflow-hidden relative">
                      {/* Class average bar */}
                      {avg != null && <div className="absolute h-full rounded-full opacity-25" style={{ width: `${(avg / scale) * 100}%`, backgroundColor: classDot(currentClass) }} />}
                      {/* Class average marker */}
                      {avg != null && <div className="absolute top-0 h-full w-0.5" style={{ left: `${(avg / scale) * 100}%`, backgroundColor: classDot(currentClass), opacity: 0.5 }} />}
                      {/* Student marker (diamond) */}
                      <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rotate-45 border-2 border-white shadow-sm" style={{ left: `${(m.value / scale) * 100}%`, transform: `translateX(-50%) translateY(-50%) rotate(45deg)`, backgroundColor: m.value >= (avg ?? 0) ? 'var(--c-good)' : 'var(--c-bad)' }} />
                    </div>
                    <span className="w-6 text-[length:calc(11.5px*var(--ts))] font-bold text-right" style={{ color: classToTextColor(currentClass) }}>{avg != null ? Math.round(avg) : '--'}</span>
                  </div>
                )
              })()}
              {/* Class above average */}
              {classAbove && classAverages[classAbove] && (() => {
                const avg = m.key === 'oral' ? classAverages[classAbove].oral : m.key === 'writing' ? classAverages[classAbove].writing : m.key === 'mc' ? classAverages[classAbove].mc : classAverages[classAbove].comp
                if (avg == null) return null
                return (
                  <div className="flex items-center gap-1">
                    <span className="w-14 text-[length:calc(11.5px*var(--ts))] text-right text-text-tertiary truncate">{classAbove}</span>
                    <div className="flex-1 h-2 bg-paper-2 rounded-full overflow-hidden relative">
                      <div className="h-full rounded-full opacity-40" style={{ width: `${(avg / scale) * 100}%`, backgroundColor: classDot(classAbove) }} />
                    </div>
                    <span className="w-6 text-[length:calc(11.5px*var(--ts))] text-text-tertiary text-right">{Math.round(avg)}</span>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })}
      {/* Legend */}
      <div className="flex items-center gap-3 text-[length:calc(11.5px*var(--ts))] text-text-tertiary pt-0.5">
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rotate-45 bg-good" /> Student (above avg)</span>
        <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rotate-45 bg-bad" /> Student (below avg)</span>
        <span className="flex items-center gap-0.5"><span className="w-3 h-0.5 bg-ink-3 opacity-50" /> Class avg</span>
      </div>
    </div>
  )
}
