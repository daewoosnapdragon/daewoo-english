'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { classToColor, classToTextColor, domainLabel } from '@/lib/utils'
import { EnglishClass } from '@/types'
import WIDABadge from '@/components/shared/WIDABadge'
import { loadWIDACache } from '@/components/shared/WIDABadge'
import { WIDA_LEVELS, WIDA_DOMAINS } from '@/components/curriculum/CurriculumView'
import { TrendingUp, TrendingDown, Minus, Star, ArrowUp, ArrowDown, Loader2 } from 'lucide-react'

interface StudentHoverCardProps {
  studentId: string
  studentName: string
  koreanName: string
  englishClass: string
  grade: number
  children: React.ReactNode
  /** Extra data already loaded (avoids re-fetch in leveling) */
  preloadedData?: {
    grades?: any[]
    reading?: any[]
    anecdotal?: any
    scores?: any
  }
}

interface CardData {
  domainGrades: { domain: string; score: number }[]
  reading: { date: string; cwpm: number }[]
  attCounts: { present: number; absent: number; tardy: number }
  wida: Record<string, number>
  anecdotal: any
  behaviorCount: number
}

export default function StudentHoverCard({ studentId, studentName, koreanName, englishClass, grade, children, preloadedData }: StudentHoverCardProps) {
  const [show, setShow] = useState(false)
  const [data, setData] = useState<CardData | null>(null)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<any>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    if (data) return // already loaded
    setLoading(true)

    // If preloaded data exists, use it
    if (preloadedData) {
      const widaCache = await loadWIDACache()
      setData({
        domainGrades: (preloadedData.grades || []).map((g: any) => ({ domain: g.domain, score: g.score })),
        reading: (preloadedData.reading || []).slice(0, 3).map((r: any) => ({ date: r.date, cwpm: r.cwpm ? Math.round(r.cwpm) : 0 })),
        attCounts: { present: 0, absent: 0, tardy: 0 },
        wida: widaCache[studentId] || {},
        anecdotal: preloadedData.anecdotal || null,
        behaviorCount: 0,
      })
      setLoading(false)
      return
    }

    const [{ data: sg }, { data: rd }, { data: at }, { data: bh }] = await Promise.all([
      supabase.from('semester_grades').select('domain, score').eq('student_id', studentId).order('created_at', { ascending: false }).limit(10),
      supabase.from('reading_assessments').select('date, cwpm').eq('student_id', studentId).order('date', { ascending: false }).limit(3),
      supabase.from('attendance').select('status').eq('student_id', studentId),
      supabase.from('behavior_logs').select('id', { count: 'exact', head: true }).eq('student_id', studentId),
    ])

    const attCounts = { present: 0, absent: 0, tardy: 0 }
    at?.forEach((a: any) => { if (attCounts[a.status as keyof typeof attCounts] !== undefined) attCounts[a.status as keyof typeof attCounts]++ })

    // Deduplicate grades by domain (keep most recent)
    const seenDomains = new Set<string>()
    const domainGrades = (sg || []).filter((g: any) => { if (seenDomains.has(g.domain)) return false; seenDomains.add(g.domain); return true })

    const widaCache = await loadWIDACache()

    setData({
      domainGrades: domainGrades.map((g: any) => ({ domain: g.domain, score: g.score })),
      reading: (rd || []).map((r: any) => ({ date: r.date, cwpm: r.cwpm ? Math.round(r.cwpm) : 0 })),
      attCounts,
      wida: widaCache[studentId] || {},
      anecdotal: null,
      behaviorCount: bh || 0,
    })
    setLoading(false)
  }, [studentId, data, preloadedData])

  const handleEnter = () => {
    timerRef.current = setTimeout(() => { setShow(true); fetchData() }, 200)
  }
  const handleLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShow(false), 150)
  }
  const handleCardEnter = () => { if (timerRef.current) clearTimeout(timerRef.current) }
  const handleCardLeave = () => { timerRef.current = setTimeout(() => setShow(false), 150) }

  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current) } }, [])

  // Position card
  const [pos, setPos] = useState<'above' | 'below'>('below')
  useEffect(() => {
    if (show && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setPos(rect.top > window.innerHeight * 0.6 ? 'above' : 'below')
    }
  }, [show])

  const widaVals = data?.wida ? Object.values(data.wida).filter((v): v is number => v != null && v > 0) : []
  const widaAvg = widaVals.length > 0 ? Math.round((widaVals.reduce((a, b) => a + b, 0) / widaVals.length) * 10) / 10 : null
  const widaRounded = widaAvg != null ? Math.round(widaAvg) : null
  const widaInfo = widaRounded ? WIDA_LEVELS.find(w => w.level === widaRounded) : null

  const readingTrend = data?.reading && data.reading.length >= 2
    ? data.reading[0].cwpm > data.reading[1].cwpm ? 'up' : data.reading[0].cwpm < data.reading[1].cwpm ? 'down' : 'flat'
    : null

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div onMouseEnter={handleEnter} onMouseLeave={handleLeave}>{children}</div>
      {show && (
        <div ref={cardRef} onMouseEnter={handleCardEnter} onMouseLeave={handleCardLeave}
          className={`absolute z-[95] w-[340px] bg-white rounded-xl shadow-2xl border border-border overflow-hidden ${pos === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'} left-0`}
          style={{ animation: 'fadeIn 0.15s ease-out' }}>

          {/* Header */}
          <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-navy/5 to-transparent">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] font-bold text-navy">{studentName}</p>
                <p className="text-[11px] text-text-tertiary">{koreanName} -- Grade {grade}</p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: classToColor(englishClass as EnglishClass), color: classToTextColor(englishClass as EnglishClass) }}>{englishClass}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-6 text-center"><Loader2 size={16} className="animate-spin text-navy mx-auto" /></div>
          ) : data ? (
            <div className="p-3 space-y-3">
              {/* WIDA Row */}
              {widaInfo && (
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg" style={{ backgroundColor: widaInfo.bg }}>
                  <span className="text-[18px] font-bold" style={{ color: widaInfo.color }}>L{widaRounded}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold" style={{ color: '#374151' }}>{widaInfo.name}</p>
                    <div className="flex gap-2 text-[9px] text-text-secondary mt-0.5">
                      {WIDA_DOMAINS.map(d => {
                        const v = data.wida[d]
                        const label = d === 'listening' ? 'L' : d === 'speaking' ? 'S' : d === 'reading' ? 'R' : 'W'
                        return v ? <span key={d}><b>{label}:</b>{v}</span> : null
                      })}
                    </div>
                  </div>
                  <p className="text-[8px] text-text-tertiary max-w-[120px] leading-tight">{widaInfo.scaffolds.split('.')[0]}.</p>
                </div>
              )}

              {/* Domain Grades */}
              {data.domainGrades.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold mb-1.5">Current Grades</p>
                  <div className="flex gap-1.5">
                    {data.domainGrades.slice(0, 5).map((g, i) => (
                      <div key={i} className={`flex-1 text-center rounded-lg py-1.5 px-1 border ${g.score >= 80 ? 'bg-green-50 border-green-200' : g.score >= 65 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                        <p className="text-[8px] text-text-tertiary uppercase truncate">{domainLabel(g.domain).slice(0, 4)}</p>
                        <p className={`text-[13px] font-bold ${g.score >= 80 ? 'text-green-700' : g.score >= 65 ? 'text-amber-700' : 'text-red-700'}`}>{g.score.toFixed(0)}%</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Reading Fluency */}
              {data.reading.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <p className="text-[9px] uppercase tracking-wider text-text-tertiary font-semibold">Reading Fluency</p>
                    {readingTrend === 'up' && <TrendingUp size={11} className="text-green-500" />}
                    {readingTrend === 'down' && <TrendingDown size={11} className="text-red-500" />}
                    {readingTrend === 'flat' && <Minus size={11} className="text-text-tertiary" />}
                  </div>
                  <div className="flex gap-1.5">
                    {data.reading.map((r, i) => (
                      <div key={i} className="flex-1 text-center bg-surface-alt rounded-lg py-1.5">
                        <p className="text-[8px] text-text-tertiary">{new Date(r.date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                        <p className="text-[14px] font-bold text-navy">{r.cwpm}</p>
                        <p className="text-[7px] text-text-tertiary">CWPM</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher recommendation if present */}
              {data.anecdotal?.teacher_recommends && (
                <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                  data.anecdotal.teacher_recommends === 'move_up' ? 'bg-green-50 text-green-700' :
                  data.anecdotal.teacher_recommends === 'move_down' ? 'bg-red-50 text-red-700' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {data.anecdotal.teacher_recommends === 'move_up' && <><ArrowUp size={13} /> Teacher recommends moving up</>}
                  {data.anecdotal.teacher_recommends === 'move_down' && <><ArrowDown size={13} /> Teacher recommends moving down</>}
                  {data.anecdotal.teacher_recommends === 'keep' && <><Minus size={13} /> Teacher recommends keeping in place</>}
                  {data.anecdotal.is_watchlist && <Star size={11} className="text-amber-500 fill-amber-500 ml-auto" />}
                </div>
              )}

              {data.anecdotal?.notes && (
                <p className="text-[10px] text-text-tertiary italic px-1 leading-snug">"{data.anecdotal.notes}"</p>
              )}
            </div>
          ) : null}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(${pos === 'above' ? '4px' : '-4px'}); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  )
}
