'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Search, BookOpen, Users, AlertTriangle, ChevronDown, ChevronRight, FileText } from 'lucide-react'

interface Passage {
  id: string
  title: string
  text: string
  word_count: number
  level: string | null // e.g. "450L", "BR100L"
  grade_range: string | null
  source: string | null
  created_at: string
}

interface UsageRecord {
  student_name: string
  english_class: string
  date: string
  cwpm: number | null
  accuracy_rate: number | null
}

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (passage: Passage) => void
  passages: Passage[]
  currentStudentId?: string | null
  currentStudentName?: string | null
}

// Parse a lexile string to a number: "450L" -> 450, "BR100L" -> -100, "BR" -> -200
function parseLexile(s: string | null): number | null {
  if (!s) return null
  const cleaned = s.trim().toUpperCase().replace(/L$/, '')
  if (cleaned.startsWith('BR')) {
    const num = parseInt(cleaned.replace('BR', '')) || 0
    return -num // BR100 = -100, BR = -200
  }
  const n = parseInt(cleaned)
  return isNaN(n) ? null : n
}

// Parse a range query: "200-400", "BR-100L", "BR100-200", "450", "450L"
function parseRange(query: string): { min: number; max: number } | null {
  const q = query.trim().toUpperCase().replace(/\s+/g, '')
  if (!q) return null

  // Range: "200-400", "BR100-200", "BR-100"
  const rangeMatch = q.match(/^(BR?\d*)-(\d+)L?$/)
  if (rangeMatch) {
    const min = parseLexile(rangeMatch[1]) ?? -999
    const max = parseInt(rangeMatch[2])
    if (!isNaN(max)) return { min, max }
  }

  // Single value: "450" or "450L"
  const single = parseLexile(q)
  if (single !== null) return { min: single - 50, max: single + 50 }

  return null
}

export default function PassagePickerPanel({ open, onClose, onSelect, passages, currentStudentId, currentStudentName }: Props) {
  const [searchText, setSearchText] = useState('')
  const [lexileRange, setLexileRange] = useState('')
  const [usageData, setUsageData] = useState<Record<string, UsageRecord[]>>({})
  const [studentHistory, setStudentHistory] = useState<Set<string>>(new Set())
  const [loadingUsage, setLoadingUsage] = useState(false)
  const [expandedPassage, setExpandedPassage] = useState<string | null>(null)

  // Load usage data and student history
  useEffect(() => {
    if (!open) return
    setLoadingUsage(true)

    const loadUsage = async () => {
      // Get all reading assessments with student info
      const { data: assessments } = await supabase
        .from('reading_assessments')
        .select('passage_title, date, cwpm, accuracy_rate, student_id')
        .not('passage_title', 'is', null)
        .order('date', { ascending: false })

      if (assessments) {
        // Get unique student IDs
        const studentIds = Array.from(new Set(assessments.map((a: any) => a.student_id))) as string[]
        const { data: students } = await supabase
          .from('students')
          .select('id, english_name, english_class')
          .in('id', studentIds)

        const studentMap: Record<string, { name: string; class: string }> = {}
        students?.forEach(s => { studentMap[s.id] = { name: s.english_name, class: s.english_class } })

        // Group by passage_title
        const grouped: Record<string, UsageRecord[]> = {}
        assessments.forEach(a => {
          const s = studentMap[a.student_id]
          if (!s) return
          const key = (a.passage_title || '').toLowerCase()
          if (!grouped[key]) grouped[key] = []
          grouped[key].push({
            student_name: s.name,
            english_class: s.class,
            date: a.date,
            cwpm: a.cwpm,
            accuracy_rate: a.accuracy_rate,
          })
        })
        setUsageData(grouped)

        // Student history for current student
        if (currentStudentId) {
          const titles = new Set(
            assessments.filter(a => a.student_id === currentStudentId).map(a => (a.passage_title || '').toLowerCase())
          )
          setStudentHistory(titles)
        }
      }
      setLoadingUsage(false)
    }
    loadUsage()
  }, [open, currentStudentId])

  // Filter passages
  const filtered = useMemo(() => {
    let result = [...passages]

    // Text search
    if (searchText.trim()) {
      const q = searchText.toLowerCase()
      result = result.filter(p =>
        (p.title || '').toLowerCase().includes(q) ||
        (p.source || '').toLowerCase().includes(q)
      )
    }

    // Lexile range filter
    const range = parseRange(lexileRange)
    if (range) {
      result = result.filter(p => {
        const lex = parseLexile(p.level)
        if (lex === null) return false
        return lex >= range.min && lex <= range.max
      })
    }

    return result
  }, [passages, searchText, lexileRange])

  // Get usage info for a passage
  const getUsage = (title: string) => usageData[title.toLowerCase()] || []
  const getClassSummary = (usage: UsageRecord[]) => {
    const classes: Record<string, number> = {}
    usage.forEach(u => { classes[u.english_class] = (classes[u.english_class] || 0) + 1 })
    return Object.entries(classes).map(([cls, count]) => `${cls} (${count})`).join(', ')
  }

  const hasStudentRead = (title: string) => studentHistory.has(title.toLowerCase())

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Side panel */}
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-surface shadow-2xl flex flex-col"
        onClick={(e: any) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-border bg-accent-light shrink-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-[15px] font-semibold text-navy flex items-center gap-2">
              <BookOpen size={18} /> Passage Library
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-alt text-text-tertiary"><X size={18} /></button>
          </div>

          {/* Search */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
              <input value={searchText} onChange={e => setSearchText(e.target.value)}
                placeholder="Search by title..."
                className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-white" />
            </div>
            <div className="relative">
              <input value={lexileRange} onChange={e => setLexileRange(e.target.value)}
                placeholder="Lexile range (e.g. 200-400, BR-100, 450L)"
                className="w-full px-3 py-2 border border-border rounded-lg text-[12px] outline-none focus:border-navy bg-white" />
              {lexileRange && parseRange(lexileRange) && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-green-600 font-medium">
                  {parseRange(lexileRange)!.min}–{parseRange(lexileRange)!.max}L
                </span>
              )}
            </div>
          </div>

          <p className="text-[10px] text-text-tertiary mt-2">
            {filtered.length} passage{filtered.length !== 1 ? 's' : ''}
            {currentStudentName && <span> · Checking history for <strong>{currentStudentName}</strong></span>}
          </p>
        </div>

        {/* Passage list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
              <FileText size={28} className="mb-2 opacity-40" />
              <p className="text-[12px]">No passages found</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(p => {
                const usage = getUsage(p.title)
                const alreadyRead = hasStudentRead(p.title)
                const isExpanded = expandedPassage === p.id

                return (
                  <div key={p.id} className={`${alreadyRead ? 'bg-amber-50/40' : ''}`}>
                    {/* Main row */}
                    <div className="px-5 py-3 flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[12px] font-semibold text-navy truncate">{p.title}</span>
                          {p.level && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">{p.level}</span>
                          )}
                          <span className="text-[9px] text-text-tertiary shrink-0">{p.word_count}w</span>
                          {alreadyRead && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 shrink-0 flex items-center gap-0.5">
                              <AlertTriangle size={9} /> Already read
                            </span>
                          )}
                        </div>

                        {/* Usage tags */}
                        {usage.length > 0 && (
                          <div className="mt-1 flex items-center gap-1 flex-wrap">
                            <Users size={10} className="text-text-tertiary shrink-0" />
                            <span className="text-[9px] text-text-tertiary">{getClassSummary(usage)}</span>
                          </div>
                        )}

                        {p.source && <p className="text-[9px] text-text-tertiary mt-0.5">{p.source}</p>}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {usage.length > 0 && (
                          <button onClick={() => setExpandedPassage(isExpanded ? null : p.id)}
                            className="p-1 rounded hover:bg-surface-alt text-text-tertiary" title="View results">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                        <button onClick={() => { onSelect(p); onClose() }}
                          className="px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-navy text-white hover:bg-navy/90 transition-all">
                          Select
                        </button>
                      </div>
                    </div>

                    {/* Expanded usage detail */}
                    {isExpanded && usage.length > 0 && (
                      <div className="px-5 pb-3">
                        <div className="bg-surface-alt rounded-lg border border-border overflow-hidden">
                          <table className="w-full text-[10px]">
                            <thead>
                              <tr className="bg-surface border-b border-border">
                                <th className="text-left px-3 py-1.5 font-semibold text-text-secondary">Student</th>
                                <th className="text-left px-2 py-1.5 font-semibold text-text-secondary">Class</th>
                                <th className="text-center px-2 py-1.5 font-semibold text-text-secondary">Date</th>
                                <th className="text-center px-2 py-1.5 font-semibold text-text-secondary">CWPM</th>
                                <th className="text-center px-2 py-1.5 font-semibold text-text-secondary">Acc</th>
                              </tr>
                            </thead>
                            <tbody>
                              {usage.slice(0, 20).map((u, i) => (
                                <tr key={i} className="border-b border-border/50 last:border-0">
                                  <td className="px-3 py-1.5 text-text-primary font-medium">{u.student_name}</td>
                                  <td className="px-2 py-1.5 text-text-secondary">{u.english_class}</td>
                                  <td className="px-2 py-1.5 text-center text-text-tertiary">{u.date}</td>
                                  <td className="px-2 py-1.5 text-center font-bold text-navy">{u.cwpm ?? '—'}</td>
                                  <td className={`px-2 py-1.5 text-center font-medium ${
                                    (u.accuracy_rate ?? 0) >= 95 ? 'text-green-600' : (u.accuracy_rate ?? 0) >= 90 ? 'text-amber-600' : 'text-red-600'
                                  }`}>{u.accuracy_rate != null ? `${u.accuracy_rate}%` : '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {usage.length > 20 && (
                            <p className="text-[9px] text-text-tertiary text-center py-1">+ {usage.length - 20} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
