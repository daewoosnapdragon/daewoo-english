'use client'

import { useState, useEffect } from 'react'
import { PanelRightClose } from 'lucide-react'

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

function gradeDot(label: string): string {
  if (label === 'Lunch') return 'bg-good'
  if (label === 'Prep') return 'bg-ink-3'
  if (label.includes('1')) return 'bg-level-lily'
  if (label.includes('2')) return 'bg-level-camellia'
  if (label.includes('3')) return 'bg-level-marigold'
  if (label.includes('4')) return 'bg-level-snapdragon'
  if (label.includes('5')) return 'bg-level-sunflower'
  return 'bg-ink-3'
}

export default function WeeklySchedule({ onCollapse }: { onCollapse?: () => void } = {}) {
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
    <div className="flex flex-col">
      <div className="flex items-baseline justify-between border-b border-rule-2 pb-1.5 mb-1">
        <h3 className="font-display text-[18px] leading-none text-ink">Weekly schedule</h3>
        <div className="flex items-center gap-2">
          {isToday && <span className="eyebrow">{now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Seoul' })}</span>}
          {onCollapse && (
            <button onClick={onCollapse} title="Hide schedule" className="w-6 h-6 rounded flex items-center justify-center text-ink-3 hover:text-ink hover:bg-paper-2">
              <PanelRightClose size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Day tabs */}
      <div className="flex border-b border-rule">
        {DAYS.map((day, i) => {
          const isSelected = selectedDay === i
          const isDayToday = isWeekday && i === kstDay - 1
          return (
            <button key={day} onClick={() => setSelectedDay(i)}
              className={`flex-1 py-1.5 text-[11px] font-semibold relative ${isSelected ? 'text-ink' : 'text-ink-3 hover:text-ink-2'}`}>
              {DAY_LABELS[i]}
              {isSelected && <span className="absolute left-2 right-2 bottom-0 h-[2px] bg-accent" />}
              {isDayToday && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />}
            </button>
          )
        })}
      </div>

      {/* Periods */}
      <div className="divide-y divide-rule">
        {SCHEDULE.map((period, idx) => {
          const slot = period.slots[dayKey]
          const isActive = idx === activePeriodIndex
          const isNext = idx === nextPeriodIndex
          const [startTime] = period.time.split('-')
          return (
            <div key={period.time}
              className={`grid grid-cols-[44px_1fr] gap-2 items-center py-1.5 px-1 -mx-1 ${isActive ? 'bg-accent-soft' : ''}`}>
              <span className={`text-[11px] tabular-nums text-right ${isActive ? 'text-accent font-semibold' : 'text-ink-3'}`}>{startTime}</span>
              <span className="flex items-center gap-2 min-w-0">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${gradeDot(slot.label)}`} />
                <span className={`text-[13px] ${isActive ? 'font-semibold text-ink' : slot.label === 'Prep' || slot.label === 'Lunch' ? 'text-ink-3' : 'text-ink'}`}>{slot.label}</span>
                {isActive && <span className="eyebrow eyebrow-accent">now</span>}
                {isNext && !isActive && <span className="eyebrow">next</span>}
                {slot.note && <span className="text-[10.5px] text-accent ml-auto flex-shrink-0">{slot.note}</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
