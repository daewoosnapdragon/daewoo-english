'use client'

import type { Student } from '@/types'
import { getDisplayName } from '@/lib/utils'
import { PHONICS_SKILLS, phonicsSkill } from '@/lib/phonics'
import type { Lane, LevelFlag, MasteryPosition } from '@/lib/phonicsCompare'
import { ArrowDown, ArrowUp } from 'lucide-react'

// ─── Leveling strip ──────────────────────────────────────────────
// One grade: a lane per class, lowest class at the top, a dot per checked
// student at their mastery position (0 = nothing yet, 1–20 the sheets). The
// shaded band is the class's middle half, the bar its median. A dot ringed
// green reads like the class above; ringed red, like the class below.

const CLASS_DOT: Record<string, string> = { Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy', Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon' }
const DOT = 11
const x = (p: number) => `${(p / 20) * 100}%`

export default function PhonicsLevelingStrip({ title, lanes, students, pos, flags, basisWord, lang, onOpenStudent }: {
  title: string; lanes: Lane[]; students: Record<string, Student>; pos: Record<string, MasteryPosition>; flags: Record<string, LevelFlag>
  basisWord: string; lang: 'en' | 'ko'; onOpenStudent: (s: Student) => void
}) {
  return (
    <div className="border border-rule-2 rounded-md bg-surface px-3 pt-2 pb-1 mb-3">
      <p className="text-[12px] font-semibold text-ink mb-1">{title}</p>
      {lanes.map(lane => {
        // Stack students who share a position, so every one is visible.
        const stacks: Record<number, string[]> = {}
        lane.studentIds.filter(id => pos[id]?.tested).forEach(id => { (stacks[pos[id].position] ||= []).push(id) })
        Object.values(stacks).forEach(ids => ids.sort((a, b) => (flags[a] ? 0 : 1) - (flags[b] ? 0 : 1)))
        const tallest = Math.max(1, ...Object.values(stacks).map(s => s.length))
        const h = Math.max(26, tallest * (DOT + 2) + 8)
        return (
          <div key={lane.englishClass} className="grid grid-cols-[112px_1fr] items-center border-b border-rule last:border-b-0">
            <div className="text-[11.5px] text-ink pr-2 truncate">
              <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${CLASS_DOT[lane.englishClass] || 'bg-ink-3'}`} />{lane.englishClass}
              <span className="text-ink-3 text-[10.5px]"> {lane.tested}/{lane.studentIds.length}</span>
            </div>
            <div className="relative mx-[6px]" style={{ height: h }}>
              {/* sheet gridlines */}
              {Array.from({ length: 21 }, (_, p) => <span key={p} className={`absolute top-0 bottom-0 w-px ${p % 5 === 0 ? 'bg-rule-2' : 'bg-rule/60'}`} style={{ left: x(p) }} />)}
              {lane.range && (
                <span className="absolute top-1 bottom-1 rounded-sm bg-ink/[0.07]" style={{ left: x(lane.range.q1), width: `calc(${x(lane.range.q3 - lane.range.q1)} + 2px)`, marginLeft: -1 }}
                  title={lang === 'ko' ? `중간 50%: ${lane.range.q1}–${lane.range.q3}` : `Middle half of ${lane.englishClass}: ${lane.range.q1}–${lane.range.q3}`} />
              )}
              {lane.median != null && <span className="absolute top-0.5 bottom-0.5 w-[3px] -ml-[1.5px] rounded-full bg-ink/60" style={{ left: x(lane.median) }} title={`${lane.englishClass} median: ${lane.median}`} />}
              {Object.entries(stacks).map(([p, ids]) => ids.map((id, k) => {
                const s = students[id]; const f = flags[id]; const ps = pos[id]
                if (!s) return null
                const ring = f ? (f.dir === 'up' ? 'ring-2 ring-good ring-offset-1 ring-offset-surface' : `ring-2 ${f.unsure ? 'ring-warn' : 'ring-bad'} ring-offset-1 ring-offset-surface`) : ''
                return (
                  <button key={id} onClick={() => onOpenStudent(s)}
                    title={`${s.english_name} · ${s.english_class}\n${ps.position} of 20 · ${ps.through ? `${basisWord} through ${phonicsSkill(ps.through)?.label}` : `nothing ${basisWord} yet`} · tested to ${ps.testedThrough}${f ? `\n${f.dir === 'up' ? '↑' : '↓'} reads like ${f.likeClass} (median ${f.likeMedian})${f.unsure ? ' · not tested past this point' : ''}` : ''}`}
                    className={`absolute rounded-full ${CLASS_DOT[s.english_class] || 'bg-ink-3'} ${ring} hover:scale-125 transition-transform`}
                    style={{ width: DOT, height: DOT, left: x(Number(p)), marginLeft: -DOT / 2, bottom: 4 + k * (DOT + 2) }} aria-label={getDisplayName(s)} />
                )
              }))}
            </div>
          </div>
        )
      })}
      <div className="grid grid-cols-[112px_1fr] mt-0.5">
        <span className="text-[9.5px] text-ink-3">{lang === 'ko' ? '위치' : 'position'}</span>
        <div className="relative mx-[6px] h-4">
          {Array.from({ length: 21 }, (_, p) => (
            <span key={p} className="absolute text-[9.5px] text-ink-3 -translate-x-1/2 tabular-nums" style={{ left: x(p) }} title={p === 0 ? 'nothing yet' : PHONICS_SKILLS[p - 1].label}>{p}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function FlagChip({ f, lang }: { f: LevelFlag; lang: 'en' | 'ko' }) {
  const tone = f.dir === 'up' ? 'bg-good-soft text-good border-good/30' : f.unsure ? 'bg-warn-soft text-warn border-warn/30' : 'bg-bad-soft text-bad border-bad/30'
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full border text-[10.5px] font-semibold whitespace-nowrap ${tone}`}
      title={f.unsure ? (lang === 'ko' ? '이 위치 너머로는 점검하지 않았습니다' : 'Never tested past this point: check further before moving') : ''}>
      {f.dir === 'up' ? <ArrowUp size={10} strokeWidth={3} /> : <ArrowDown size={10} strokeWidth={3} />}
      {lang === 'ko' ? `${f.likeClass} 수준` : `like ${f.likeClass}`}{f.unsure ? '?' : ''}
    </span>
  )
}
