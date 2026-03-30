'use client'

import { useState, useEffect } from 'react'
import { Clock, CalendarDays } from 'lucide-react'

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const

interface Period {
  time: string
  startHour: number
  startMin: number
  endHour: number
  endMin: number
  slots: Record<string, { label: string; note?: string }>
}

// Parse "1:20" or "12:30" to 24h { h, m }
function parseTime(t: string, isPM: boolean): { h: number; m: number } {
  const [hStr, mStr] = t.split(':')
  let h = parseInt(hStr)
  // Times 1-8 are PM (school hours), 9-11 are AM
  if (h <= 8 && isPM) h += 12
  return { h, m: parseInt(mStr) }
}

const SCHEDULE: Period[] = (() => {
  const raw: [string, string, string, string, string, string][] = [
    ['9:10-11:30', 'prep', '', '', '', ''],
    ['11:40-12:20', '', 'lunch', 'g5', 'lunch', 'g4|release 12:15'],
    ['12:30-1:10', 'lunch', 'g3', 'lunch', 'g2', 'lunch'],
    ['1:20-2:00', 'g2', 'g4', 'g1|release 1:55', 'g1|release 1:55', 'g1|release 1:55'],
    ['2:10-2:50', 'g1|release 2:45', 'g2', 'g3', 'g4', 'g2'],
    ['3:00-3:40', 'g3', 'g1|release 3:35', 'g2', 'g3', 'g3'],
    ['3:50-4:30', 'g4', 'g5', 'g4', 'g5', 'g5'],
  ]

  return raw.map(([timeRange, mon, tue, wed, thu, fri]) => {
    const [startStr, endStr] = timeRange.split('-')
    const start = parseTime(startStr, false)
    const end = parseTime(endStr, true)

    function parseSlot(val: string): { label: string; note?: string } {
      if (!val || val === '') return { label: 'Prep' }
      if (val === 'lunch') return { label: 'Lunch' }
      if (val === 'prep') return { label: 'Prep' }
      const parts = val.split('|')
      const grade = parts[0].replace('g', 'Grade ')
      const note = parts[1]?.trim()
      return { label: grade, note }
    }

    return {
      time: timeRange,
      startHour: start.h,
      startMin: start.m,
      endHour: end.h,
      endMin: end.m,
      slots: {
        monday: parseSlot(mon),
        tuesday: parseSlot(tue),
        wednesday: parseSlot(wed),
        thursday: parseSlot(thu),
        friday: parseSlot(fri),
      },
    }
  })
})()

function getKSTNow(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
}

function getGradeColor(label: string): { bg: string; text: string; border: string } {
  if (label === 'Lunch') return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' }
  if (label === 'Prep') return { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200' }
  if (label.includes('1')) return { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' }
  if (label.includes('2')) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
  if (label.includes('3')) return { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200' }
  if (label.includes('4')) return { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' }
  if (label.includes('5')) return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' }
  return { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' }
}

export default function WeeklySchedule() {
  const [now, setNow] = useState(getKSTNow)
  const kstDay = now.getDay() // 0=Sun, 1=Mon...
  const isWeekday = kstDay >= 1 && kstDay <= 5
  const todayIndex = isWeekday ? kstDay - 1 : 0
  const [selectedDay, setSelectedDay] = useState(todayIndex)

  useEffect(() => {
    const interval = setInterval(() => setNow(getKSTNow()), 30_000)
    return () => clearInterval(interval)
  }, [])

  // Update selected day when date changes
  useEffect(() => {
    const d = getKSTNow().getDay()
    if (d >= 1 && d <= 5) setSelectedDay(d - 1)
  }, [now.getDate()])

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const dayKey = DAYS[selectedDay]
  const isToday = isWeekday && selectedDay === kstDay - 1

  // Find active period
  const activePeriodIndex = isToday
    ? SCHEDULE.findIndex(p => {
        const start = p.startHour * 60 + p.startMin
        const end = p.endHour * 60 + p.endMin
        return currentMinutes >= start && currentMinutes < end
      })
    : -1

  // Find next period if not in any
  const nextPeriodIndex = isToday && activePeriodIndex === -1
    ? SCHEDULE.findIndex(p => {
        const start = p.startHour * 60 + p.startMin
        return currentMinutes < start
      })
    : -1

  return (
    <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col" style={{ minHeight: 320 }}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border bg-gradient-to-r from-navy/5 to-transparent">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-navy" />
          <h3 className="font-display text-[12px] font-semibold text-navy">Weekly Schedule</h3>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex border-b border-border">
        {DAYS.map((day, i) => {
          const isSelected = selectedDay === i
          const isDayToday = isWeekday && i === kstDay - 1
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(i)}
              className={`flex-1 py-1.5 text-[10px] font-semibold transition-all relative ${
                isSelected
                  ? 'text-navy bg-navy/5'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-surface-alt/50'
              }`}
            >
              {DAY_LABELS[i]}
              {isDayToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-navy" />
              )}
            </button>
          )
        })}
      </div>

      {/* Schedule Rows */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1">
        {SCHEDULE.map((period, idx) => {
          const slot = period.slots[dayKey]
          const isActive = idx === activePeriodIndex
          const isNext = idx === nextPeriodIndex
          const colors = getGradeColor(slot.label)
          const isClass = slot.label !== 'Lunch' && slot.label !== 'Prep'
          const [startTime] = period.time.split('-')

          return (
            <div
              key={period.time}
              className={`relative flex items-center gap-2 px-2 py-2 rounded-lg transition-all ${
                isActive
                  ? 'bg-navy/8 ring-1 ring-navy/20 shadow-sm'
                  : isNext
                  ? 'bg-amber-50/60 ring-1 ring-amber-200/50'
                  : 'hover:bg-surface-alt/40'
              }`}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-navy" />
              )}
              {isNext && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-amber-400" />
              )}

              {/* Time */}
              <div className="w-[42px] flex-shrink-0 text-right">
                <p className={`text-[9px] font-mono leading-tight ${isActive ? 'text-navy font-bold' : 'text-text-tertiary'}`}>
                  {startTime}
                </p>
              </div>

              {/* Content */}
              <div className={`flex-1 flex items-center gap-1.5 px-2 py-1 rounded-md border ${colors.border} ${colors.bg}`}>
                {isActive && (
                  <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-navy opacity-50" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-navy" />
                  </span>
                )}
                {isNext && !isActive && (
                  <Clock size={9} className="text-amber-500 flex-shrink-0" />
                )}
                <span className={`text-[11px] font-semibold ${isActive ? 'text-navy' : colors.text}`}>
                  {slot.label}
                </span>
                {slot.note && (
                  <span className="text-[8px] text-text-tertiary ml-auto flex-shrink-0">{slot.note}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer: current time */}
      {isToday && (
        <div className="px-3 py-1.5 border-t border-border bg-surface-alt/30 flex items-center justify-center gap-1.5">
          <Clock size={10} className="text-text-tertiary" />
          <span className="text-[9px] text-text-tertiary font-mono">
            {now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Seoul' })} KST
          </span>
        </div>
      )}
    </div>
  )
}
