'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { WIDA_LEVELS } from '@/components/curriculum/CurriculumView'

interface HoverData {
  grades: { domain: string; score: number }[]
  reading: { date: string; cwpm: number }[]
  wida: Record<string, number>
  attCounts: { present: number; absent: number; tardy: number }
  notes: string
}

export default function LevelingHoverCard({ studentId, studentName, koreanName, className, grade, trigger }: {
  studentId: string; studentName: string; koreanName: string; className: string; grade: number; trigger: React.ReactNode
}) {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<HoverData | null>(null)
  const [loaded, setLoaded] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  const loadData = async () => {
    if (loaded) return
    const [{ data: sg }, { data: rd }, { data: wd }, { data: at }] = await Promise.all([
      supabase.from('semester_grades').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
      supabase.from('reading_assessments').select('*').eq('student_id', studentId).order('date', { ascending: false }).limit(4),
      supabase.from('student_wida_levels').select('*').eq('student_id', studentId),
      supabase.from('attendance').select('status').eq('student_id', studentId),
    ])
    const attCounts = { present: 0, absent: 0, tardy: 0 }
    at?.forEach((a: any) => { if (attCounts[a.status as keyof typeof attCounts] !== undefined) attCounts[a.status as keyof typeof attCounts]++ })
    const wida: Record<string, number> = {}
    wd?.forEach((w: any) => { wida[w.domain] = w.wida_level })
    // Group grades by domain, take latest per domain
    const gradeMap: Record<string, number> = {}
    sg?.forEach((g: any) => { if (g.score != null && !gradeMap[g.domain]) gradeMap[g.domain] = g.score })
    setData({
      grades: Object.entries(gradeMap).map(([domain, score]) => ({ domain, score })),
      reading: (rd || []).map((r: any) => ({ date: r.date, cwpm: r.cwpm })),
      wida, attCounts, notes: ''
    })
    setLoaded(true)
  }

  const handleEnter = () => { timerRef.current = setTimeout(() => { setShow(true); loadData() }, 200) }
  const handleLeave = () => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(() => setShow(false), 150) }
  const handleCardEnter = () => { if (timerRef.current) clearTimeout(timerRef.current) }
  const handleCardLeave = () => { timerRef.current = setTimeout(() => setShow(false), 150) }

  // WIDA summary
  const widaVals = data ? Object.values(data.wida).filter(v => v > 0) : []
  const widaAvg = widaVals.length > 0 ? Math.round((widaVals.reduce((a, b) => a + b, 0) / widaVals.length) * 10) / 10 : null
  const widaInfo = widaAvg ? WIDA_LEVELS.find(w => w.level === Math.round(widaAvg)) : null
  const domainLabels: Record<string, string> = { listening: 'L', speaking: 'S', reading: 'R', writing: 'W' }

  // Reading trend
  const readings = data?.reading || []
  const readTrend = readings.length >= 2
    ? readings[0].cwpm > readings[1].cwpm ? 'up' : readings[0].cwpm < readings[1].cwpm ? 'down' : 'flat'
    : 'flat'

  return (
    <span className="relative inline-block" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {trigger}
      {show && (
        <div ref={cardRef} onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}
          className="absolute z-[200] left-0 top-full mt-1 w-[320px] bg-white border border-border rounded-xl shadow-xl overflow-hidden animate-fade-in"
          style={{ filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.12))' }}>
          {/* Header */}
          <div className="px-4 py-2.5 bg-navy text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[13px] font-bold">{studentName}</p>
                <p className="text-[10px] text-blue-200/70">{koreanName} -- {className} -- Grade {grade}</p>
              </div>
              {widaInfo && (
                <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold"
                  style={{ backgroundColor: widaInfo.bg, color: '#374151', borderLeft: `3px solid ${widaInfo.color}` }}>
                  WIDA L{widaInfo.level}
                </span>
              )}
            </div>
          </div>

          {!data ? (
            <div className="p-4 text-center text-[11px] text-text-tertiary">Loading...</div>
          ) : (
            <div className="p-3 space-y-2.5">
              {/* WIDA domains */}
              {widaVals.length > 0 && (
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">WIDA Profile</p>
                  <div className="flex gap-1.5">
                    {Object.entries(data.wida).map(([d, v]) => {
                      const info = WIDA_LEVELS.find(w => w.level === v)
                      return (
                        <div key={d} className="flex-1 rounded-lg p-1.5 text-center border"
                          style={{ backgroundColor: info?.bg || '#f8fafc', borderColor: info?.color || '#e2e8f0' }}>
                          <p className="text-[8px] font-bold text-text-tertiary uppercase">{domainLabels[d] || d}</p>
                          <p className="text-[14px] font-bold" style={{ color: info?.color || '#64748b' }}>{v}</p>
                        </div>
                      )
                    })}
                  </div>
                  {widaInfo && <p className="text-[9px] text-text-tertiary mt-1 italic">{widaInfo.desc}</p>}
                </div>
              )}

              {/* Domain grades */}
              {data.grades.length > 0 && (
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">Semester Grades</p>
                  <div className="flex flex-wrap gap-1">
                    {data.grades.slice(0, 6).map((g, i) => (
                      <div key={i} className={`px-2 py-1 rounded-lg text-center min-w-[46px] ${g.score >= 80 ? 'bg-green-50 border border-green-200' : g.score >= 60 ? 'bg-amber-50 border border-amber-200' : 'bg-red-50 border border-red-200'}`}>
                        <p className="text-[7px] text-text-tertiary capitalize truncate">{g.domain}</p>
                        <p className={`text-[12px] font-bold ${g.score >= 80 ? 'text-green-600' : g.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>{g.score.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reading trend */}
              {readings.length > 0 && (
                <div>
                  <p className="text-[8px] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">Reading Fluency</p>
                  <div className="flex items-center gap-2">
                    {readings.slice(0, 3).map((r, i) => (
                      <div key={i} className="bg-surface-alt rounded-lg px-2.5 py-1.5 text-center flex-1">
                        <p className="text-[8px] text-text-tertiary">{new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-[14px] font-bold text-navy">{r.cwpm ? Math.round(r.cwpm) : '—'}</p>
                      </div>
                    ))}
                    <div className={`text-[16px] ${readTrend === 'up' ? 'text-green-500' : readTrend === 'down' ? 'text-red-500' : 'text-text-tertiary'}`}>
                      {readTrend === 'up' ? '↑' : readTrend === 'down' ? '↓' : '→'}
                    </div>
                  </div>
                </div>
              )}

              {/* Quick stats row */}
              <div className="flex gap-1.5 pt-1 border-t border-border">
                <div className="flex-1 text-center py-1 rounded bg-green-50 text-green-700 text-[10px] font-medium">{data.attCounts.present}P</div>
                <div className="flex-1 text-center py-1 rounded bg-red-50 text-red-700 text-[10px] font-medium">{data.attCounts.absent}A</div>
                <div className="flex-1 text-center py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-medium">{data.attCounts.tardy}T</div>
              </div>
            </div>
          )}
        </div>
      )}
    </span>
  )
}
