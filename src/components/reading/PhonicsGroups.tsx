'use client'

import { useMemo, useState } from 'react'
import type { Student } from '@/types'
import { getDisplayName } from '@/lib/utils'
import { logActivity } from '@/lib/activity'
import { ENGLISH_CLASS_ORDER } from '@/lib/rosterSort'
import { PHONICS_GROUPS, PHONICS_SKILLS, phonicsSkill, type LatestBySkill, type PhonicsCheckRow } from '@/lib/phonics'
import { nextToTeach, teachingGroups, troubleCounts, missedWords, splitPatternKey, type GroupBy, type TeachGroup } from '@/lib/phonicsPatterns'
import { Printer } from 'lucide-react'

// ─── Teaching groups across classes ──────────────────────────────
// Per grade, students gathered by the sheet to teach next (or by family:
// short vowels, long vowels, other vowels, two-syllable), whatever class
// they are in. A chip per student; amber when the sheet is a hole under
// their position, a ? when it is the next sheet up and they were never
// checked on it. Each card names what tripped the group on its sheets: the
// patterns ticked and the words missed, so the lesson can start there.
// The class chips narrow the groups to classes that share a time slot.

const CLASS_DOT: Record<string, string> = { Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy', Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon' }
const classRank = (c: string) => ENGLISH_CLASS_ORDER[c] || 99

export default function PhonicsGroups({ students, latestByStudent, checksById, lang, onOpenStudent }: {
  students: Student[]; latestByStudent: Record<string, LatestBySkill>; checksById: Record<string, PhonicsCheckRow>
  lang: 'en' | 'ko'; onOpenStudent: (s: Student) => void
}) {
  const [by, setBy] = useState<GroupBy>('sheet')
  const classes = useMemo(() => Array.from(new Set(students.map(s => s.english_class))).sort((a, b) => classRank(a) - classRank(b)), [students])
  const [off, setOff] = useState<string[]>([])
  const toggleClass = (c: string) => setOff(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const studentById = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])) as Record<string, Student>, [students])

  const byGrade = useMemo(() => {
    const inScope = students.filter(s => !off.includes(s.english_class))
    const grades = Array.from(new Set(inScope.map(s => s.grade))).sort((a, b) => a - b)
    return grades.map(g => {
      const ids = inScope.filter(s => s.grade === g).sort((a, b) => classRank(a.english_class) - classRank(b.english_class) || a.english_name.localeCompare(b.english_name)).map(s => s.id)
      return { grade: g, groups: teachingGroups(ids, latestByStudent, by) }
    })
  }, [students, off, latestByStudent, by])

  const title = (g: TeachGroup) => {
    if (g.key === 'done') return lang === 'ko' ? '스무 시트 모두 완료' : 'All twenty sheets'
    if (g.key === 'unchecked') return lang === 'ko' ? '아직 점검 안 함' : 'Not checked yet'
    if (by === 'sheet') { const sk = phonicsSkill(g.key)!; return `${PHONICS_SKILLS.indexOf(sk) + 1} · ${lang === 'ko' ? sk.label_ko : sk.label}` }
    const fam = PHONICS_GROUPS.find(f => f.id === g.key)!
    return lang === 'ko' ? fam.label_ko : fam.label
  }
  // What tripped this group on its sheets: patterns ticked, words missed.
  const focus = (g: TeachGroup) => {
    if (g.sheets.length === 0) return { patterns: [] as [string, number][], words: [] as string[] }
    const t = troubleCounts(g.studentIds, latestByStudent, checksById, g.sheets)
    const patterns = Object.entries(t.counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => [splitPatternKey(k).pattern, n] as [string, number])
    const words = missedWords(g.studentIds, latestByStudent, checksById, { sheets: g.sheets, min: g.studentIds.length >= 4 ? 2 : 1 }).slice(0, 10).map(w => w.missed > 1 ? `${w.word} ×${w.missed}` : w.word)
    return { patterns, words }
  }

  const print = () => {
    const pw = window.open('', '_blank'); if (!pw) return
    const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
    const body = byGrade.map(({ grade, groups }) => `<h1>Grade ${grade} · phonics groups</h1>` + groups.map(g => {
      const f = focus(g)
      return `<section><h2>${esc(title(g))} <small>${g.studentIds.length}</small></h2><ol>${g.studentIds.map(id => { const s = studentById[id]; const n = nextToTeach(latestByStudent[id] || {}); return `<li>${esc(s.english_name)} <span>${esc(s.korean_name)} · ${s.english_class}${by === 'family' && n.sheet ? ` · ${esc(phonicsSkill(n.sheet)?.short || '')}` : ''}${n.reason === 'gap' ? ' · hole below' : !n.checked && n.sheet ? ' · not checked on it' : ''}</span></li>` }).join('')}</ol>${f.patterns.length ? `<p><b>Trouble:</b> ${f.patterns.map(([p, n]) => `${esc(p)}${n > 1 ? ` ×${n}` : ''}`).join(', ')}</p>` : ''}${f.words.length ? `<p><b>Missed:</b> ${f.words.map(esc).join(', ')}</p>` : ''}</section>`
    }).join('')).join('<div class="break"></div>')
    pw.document.write(`<html><head><title>Phonics groups</title><style>
      body{font-family:system-ui,sans-serif;color:#1b1812;margin:0;padding:24px;font-size:12px}
      h1{font-family:Georgia,serif;font-weight:500;font-size:22px;margin:0 0 12px}
      section{break-inside:avoid;border:1px solid #ddd6c8;border-radius:6px;padding:10px 12px;margin:0 0 10px;display:inline-block;width:calc(50% - 10px);vertical-align:top;margin-right:6px;box-sizing:border-box}
      h2{font-size:13px;margin:0 0 6px}h2 small{color:#857d6e;font-weight:400}
      ol{margin:0 0 6px;padding-left:18px}li span{color:#857d6e}p{margin:2px 0}
      .break{page-break-after:always}
    </style></head><body>${body}</body></html>`)
    pw.document.close(); pw.print()
    logActivity('printed', 'Phonics groups', { path: '/reading' })
  }

  const seg = (on: boolean) => `px-3 h-8 rounded text-[12.5px] font-medium ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-2">
        <div className="inline-flex p-0.5 rounded border border-rule-2 bg-surface">
          <button onClick={() => setBy('sheet')} className={seg(by === 'sheet')}>{lang === 'ko' ? '시트별' : 'By sheet'}</button>
          <button onClick={() => setBy('family')} className={seg(by === 'family')}>{lang === 'ko' ? '영역별' : 'By family'}</button>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {classes.map(c => (
            <button key={c} onClick={() => toggleClass(c)} className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[12px] font-medium ${off.includes(c) ? 'bg-surface text-ink-3 border-rule-2 line-through' : 'bg-ink text-paper border-ink'}`}>
              <span className={`w-2 h-2 rounded-full ${CLASS_DOT[c] || 'bg-ink-3'}`} />{c}
            </button>
          ))}
        </div>
        <button onClick={print} className="ml-auto inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"><Printer size={11} /> {lang === 'ko' ? '그룹 인쇄' : 'Print groups'}</button>
      </div>
      <p className="text-[11.5px] text-ink-3 mb-4 max-w-[920px]">{lang === 'ko'
        ? '반과 상관없이, 다음에 가르칠 시트로 묶었습니다: 위치 아래에 90% 미만인 시트가 있으면 그 시트, 없으면 위치 다음 시트. 노란 칩 = 아래 구멍, ? = 그 시트를 아직 점검하지 않음. 반 칩을 눌러 같은 시간에 수업하는 반만 남기세요.'
        : 'Students gathered by the sheet to teach next, whatever their class: the lowest sheet under their position still under 90%, or else the sheet after their position. Amber chip = a hole below their position; ? = never checked on that sheet. Turn class chips off to keep only classes that share a time slot.'}</p>

      {byGrade.length === 0 && <p className="text-[13px] text-ink-3">{lang === 'ko' ? '선택한 반이 없습니다.' : 'No classes selected.'}</p>}
      {byGrade.map(({ grade, groups }) => (
        <div key={grade} className="mb-6">
          <h3 className="text-[13px] font-semibold text-ink mb-2">{lang === 'ko' ? `${grade}학년` : `Grade ${grade}`}</h3>
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
            {groups.map(g => {
              const f = focus(g)
              const mix: Record<string, number> = {}
              g.studentIds.forEach(id => { const c = studentById[id]?.english_class; if (c) mix[c] = (mix[c] || 0) + 1 })
              const muted = g.key === 'done' || g.key === 'unchecked'
              return (
                <div key={g.key} className={`border rounded-md p-3 ${muted ? 'border-rule bg-paper-2/50' : 'border-rule-2 bg-surface'}`}>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[13px] font-semibold text-ink leading-tight">{title(g)}</p>
                    <span className="text-[12px] font-semibold text-ink-2 tabular-nums">{g.studentIds.length}</span>
                  </div>
                  {by === 'family' && g.sheets.length > 0 && <p className="text-[11px] text-ink-3 mb-1">{g.sheets.map(id => phonicsSkill(id)?.short).join(' · ')}</p>}
                  <p className="text-[10.5px] text-ink-3 mb-2">{Object.entries(mix).sort((a, b) => classRank(a[0]) - classRank(b[0])).map(([c, n]) => `${c} ${n}`).join(' · ')}</p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {g.studentIds.map(id => {
                      const s = studentById[id]; const n = nextToTeach(latestByStudent[id] || {})
                      const hole = n.reason === 'gap'; const unsure = !!n.sheet && !n.checked
                      return (
                        <button key={id} onClick={() => onOpenStudent(s)}
                          title={`${s.english_name} · ${s.english_class}${n.sheet ? ` · next: ${phonicsSkill(n.sheet)?.label}` : ''}${hole ? ' · a hole below their position' : ''}${unsure ? ' · never checked on this sheet' : ''}`}
                          className={`inline-flex items-center gap-1 px-1.5 h-6 rounded-full border text-[11.5px] ${hole ? 'bg-warn-soft border-warn/30 text-warn' : 'border-rule-2 text-ink hover:border-ink-3'}`}>
                          <span className={`w-2 h-2 rounded-full ${CLASS_DOT[s.english_class] || 'bg-ink-3'}`} />{getDisplayName(s)}{unsure && <span className="text-ink-3">?</span>}
                        </button>
                      )
                    })}
                  </div>
                  {f.patterns.length > 0 && <p className="text-[11px] text-ink-2"><span className="text-ink-3">{lang === 'ko' ? '어려움: ' : 'Trouble: '}</span>{f.patterns.map(([p, n]) => `${p}${n > 1 ? ` ×${n}` : ''}`).join(', ')}</p>}
                  {f.words.length > 0 && <p className="text-[11px] text-ink-2"><span className="text-ink-3">{lang === 'ko' ? '틀린 단어: ' : 'Missed: '}</span>{f.words.join(', ')}</p>}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
