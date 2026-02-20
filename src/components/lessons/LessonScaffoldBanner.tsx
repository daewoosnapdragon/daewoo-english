'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { EnglishClass, Grade } from '@/types'
import { WIDA_LEVELS } from '@/components/curriculum/CurriculumView'
import { ChevronDown, ChevronRight, Lightbulb, Users } from 'lucide-react'

interface Props {
  englishClass: EnglishClass
  grade: Grade
}

interface WIDADistribution {
  level: number
  count: number
}

export default function LessonScaffoldBanner({ englishClass, grade }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [showAllScaffolds, setShowAllScaffolds] = useState(false)
  const [distribution, setDistribution] = useState<WIDADistribution[]>([])
  const [commonScaffolds, setCommonScaffolds] = useState<{ domain: string; text: string; count: number }[]>([])
  const [studentCount, setStudentCount] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    ;(async () => {
      // Get students in this class/grade
      const { data: students } = await supabase.from('students')
        .select('id')
        .eq('english_class', englishClass)
        .eq('grade', grade)
        .eq('is_active', true)
      
      if (!students || students.length === 0) { setLoaded(true); return }
      setStudentCount(students.length)
      const sids = students.map(s => s.id)

      // Get WIDA levels for these students
      const { data: widaData } = await supabase.from('student_wida_levels')
        .select('student_id, wida_level')
        .in('student_id', sids)

      // Calculate distribution (use average level per student)
      const studentLevels: Record<string, number[]> = {}
      widaData?.forEach((w: any) => {
        if (!studentLevels[w.student_id]) studentLevels[w.student_id] = []
        studentLevels[w.student_id].push(w.wida_level)
      })
      const levelCounts: Record<number, number> = {}
      Object.values(studentLevels).forEach(levels => {
        const avg = Math.round(levels.reduce((a, b) => a + b, 0) / levels.length)
        levelCounts[avg] = (levelCounts[avg] || 0) + 1
      })
      setDistribution(
        Object.entries(levelCounts)
          .map(([level, count]) => ({ level: Number(level), count }))
          .sort((a, b) => a.level - b.level)
      )

      // Get most common scaffolds for this class
      const { data: scaffolds } = await supabase.from('student_scaffolds')
        .select('domain, scaffold_text')
        .in('student_id', sids)
        .eq('is_active', true)

      const scaffoldCounts: Record<string, { domain: string; text: string; count: number }> = {}
      scaffolds?.forEach((s: any) => {
        const key = s.scaffold_text
        if (!scaffoldCounts[key]) scaffoldCounts[key] = { domain: s.domain, text: s.scaffold_text, count: 0 }
        scaffoldCounts[key].count++
      })
      setCommonScaffolds(
        Object.values(scaffoldCounts)
          .sort((a, b) => b.count - a.count)
      )

      setLoaded(true)
    })()
  }, [englishClass, grade])

  if (!loaded || distribution.length === 0) return null

  const noWIDA = studentCount - distribution.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="mb-4 bg-blue-50/60 border border-blue-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-blue-50 transition-colors">
        <Lightbulb size={14} className="text-blue-600 flex-shrink-0" />
        <span className="text-[11px] font-semibold text-blue-900">WIDA Scaffolding Reminder</span>
        <span className="text-[10px] text-blue-700 ml-1">--</span>
        <div className="flex items-center gap-1 ml-1">
          {distribution.map(d => {
            const info = WIDA_LEVELS.find(w => w.level === d.level)
            return (
              <span key={d.level} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold"
                style={{ backgroundColor: info?.bg || '#f0f0f0', color: info?.color ? '#333' : '#666' }}>
                L{d.level}: {d.count}
              </span>
            )
          })}
          {noWIDA > 0 && <span className="text-[9px] text-blue-500">({noWIDA} unset)</span>}
        </div>
        <div className="ml-auto">
          {expanded ? <ChevronDown size={14} className="text-blue-400" /> : <ChevronRight size={14} className="text-blue-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-3 border-t border-blue-200 pt-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-blue-800 font-semibold mb-2">
                <Users size={10} className="inline mr-1" />Class WIDA Distribution ({studentCount} students)
              </p>
              <div className="space-y-1">
                {distribution.map(d => {
                  const info = WIDA_LEVELS.find(w => w.level === d.level)
                  const pct = Math.round((d.count / studentCount) * 100)
                  return (
                    <div key={d.level} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold w-6" style={{ color: info?.color || '#666' }}>L{d.level}</span>
                      <div className="flex-1 h-4 bg-white rounded-full border border-blue-100 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: info?.color || '#ccc' }} />
                      </div>
                      <span className="text-[10px] text-blue-700 font-medium w-16">{d.count} ({pct}%)</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[9px] text-blue-600 mt-2 italic">
                {distribution.some(d => d.level <= 2) && distribution.some(d => d.level >= 4)
                  ? 'Wide range -- plan 3 tiers of scaffolding (Heavy / Moderate / Light).'
                  : distribution.every(d => d.level <= 2)
                  ? 'Class is primarily L1-L2 -- plan with heavy scaffolding throughout.'
                  : distribution.every(d => d.level >= 4)
                  ? 'Class is L4+ -- focus on academic extension and enrichment.'
                  : 'Moderate range -- plan with 2 tiers of support.'
                }
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-blue-800 font-semibold mb-2">
                <Lightbulb size={10} className="inline mr-1" />Most Common Scaffolds in This Class
              </p>
              {commonScaffolds.length === 0 ? (
                <p className="text-[10px] text-blue-600 italic">No scaffolds assigned yet. Visit Curriculum {'>'} WIDA/CCSS Guide {'>'} Assign to Students.</p>
              ) : (
                <div className="space-y-1">
                  {(showAllScaffolds ? commonScaffolds : commonScaffolds.slice(0, 5)).map((s, i) => (
                    <div key={i} className="flex items-start gap-1.5 px-2 py-1 rounded bg-white border border-blue-100">
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-blue-100 text-blue-700 uppercase flex-shrink-0 mt-px">{s.domain.slice(0, 4)}</span>
                      <p className="text-[9px] text-blue-800 leading-snug flex-1">{s.text}</p>
                      <span className="text-[8px] text-blue-500 flex-shrink-0 mt-px">{s.count}x</span>
                    </div>
                  ))}
                  {commonScaffolds.length > 5 && (
                    <button onClick={() => setShowAllScaffolds(!showAllScaffolds)}
                      className="text-[9px] font-medium text-blue-600 hover:text-blue-800 mt-1">
                      {showAllScaffolds ? 'Show fewer' : `Show ${commonScaffolds.length - 5} more...`}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
