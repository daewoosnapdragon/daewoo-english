'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import type { Student } from '@/types'
import { useStudents } from '@/hooks/useData'
import { getDisplayName } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'
import { ENGLISH_CLASS_ORDER } from '@/lib/rosterSort'
import {
  PHONICS_GROUPS, PHONICS_SKILLS, PHONICS_SKILL_IDS, PHONICS_BAND_LABELS,
  phonicsSkill, skillsInGroup, latestBySkill, phonicsBand,
  type PhonicsCheckRow, type LatestBySkill, type PhonicsBand,
} from '@/lib/phonics'
import {
  MIN_TESTED, EDGE_PCT, masteryPosition, groupStats, checksSince, byPosition,
  type MasteryBasis, type MasteryPosition, type GroupStats,
} from '@/lib/phonicsCompare'
import { loadAllPhonicsChecks } from '@/lib/phonicsData'
import { BAND_TONE, fmtShort } from '@/components/reading/phonicsTones'
import PhonicsCellDetail from '@/components/reading/PhonicsCellDetail'
import { AlertTriangle, ChevronDown, ChevronRight, Download, Loader2, X } from 'lucide-react'

// ─── Phonics: whole grade and all grades ─────────────────────────
// Reading → Phonics with the scope set past one class. Every teacher sees
// every class here, for leveling: where whole classes sit on the packet's
// twenty sheets, and which students sit where against their class.
//
// Two tables. Classes compared: a row per class, each sheet the share of
// its tested students meeting the bar, the class's edge (first sheet under
// 70%) outlined. Students: the heat map for every student in scope, grouped
// by class or ranked by mastery position, the furthest sheet meeting the
// bar. Cells tested by fewer than three students are greyed: too thin to
// compare on.

type Lang = 'en' | 'ko'
export type PhonicsScope = 'class' | 'grade' | 'all'
type Sort = 'class' | 'position'

const CLASS_DOT: Record<string, string> = { Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy', Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon' }
const BANDS: PhonicsBand[] = ['mastered', 'proficient', 'developing', 'beginning']
const classRank = (c: string) => ENGLISH_CLASS_ORDER[c] || 99

/** Tone for a class's share meeting the bar on a sheet. */
function shareTone(pct: number | null, thin: boolean): string {
  if (pct == null) return 'bg-paper-2/60 text-ink-3/40'
  if (thin) return 'bg-paper-2 text-ink-3'
  if (pct >= 90) return 'bg-good text-white'
  if (pct >= EDGE_PCT) return 'bg-good-soft text-good'
  if (pct >= 40) return 'bg-warn-soft text-warn'
  return 'bg-bad-soft text-bad'
}

interface Group { key: string; label: string; grade: number; englishClass: string | null; students: Student[] }

export default function PhonicsCompare({ scope, grade, lang, onOpenStudent, onCheckStudent }: {
  scope: Exclude<PhonicsScope, 'class'>; grade: number; lang: Lang
  /** Opens the student's progress in their own class's Phonics view. */
  onOpenStudent: (s: Student) => void
  /** Opens the check screen for the student in their own class, with these sheets ticked. */
  onCheckStudent: (s: Student, skills: string[]) => void
}) {
  const { students, loading } = useStudents({ grade: scope === 'grade' ? (grade as any) : null })
  const [allChecks, setAllChecks] = useState<PhonicsCheckRow[]>([])
  const [loadingChecks, setLoadingChecks] = useState(true)
  const [basis, setBasis] = useState<MasteryBasis>('mastered')
  const [sort, setSort] = useState<Sort>('class')
  const [since, setSince] = useState('')
  const [open, setOpen] = useState<{ sid: string; skill: string } | null>(null)
  // Collapsed student groups. All grades starts with every group shut: a
  // school's worth of rows is too long to scroll past to the one you want.
  const [collapsed, setCollapsed] = useState<Set<string> | 'all'>(scope === 'all' ? 'all' : new Set())
  useEffect(() => { setCollapsed(scope === 'all' ? 'all' : new Set()) }, [scope, sort])

  useEffect(() => {
    let live = true
    setLoadingChecks(true)
    loadAllPhonicsChecks().then(rows => { if (live) { setAllChecks(rows); setLoadingChecks(false) } })
    return () => { live = false }
  }, [])

  const checks = useMemo(() => checksSince(allChecks, since), [allChecks, since])
  const byStudent = useMemo(() => {
    const by: Record<string, PhonicsCheckRow[]> = {}
    checks.forEach(c => { (by[c.student_id] ||= []).push(c) })
    return by
  }, [checks])
  const latestByStudent = useMemo(() => Object.fromEntries(students.map(s => [s.id, latestBySkill(byStudent[s.id] || [])])) as Record<string, LatestBySkill>, [students, byStudent])
  const posByStudent = useMemo(() => Object.fromEntries(students.map(s => [s.id, masteryPosition(latestByStudent[s.id] || {}, basis)])) as Record<string, MasteryPosition>, [students, latestByStudent, basis])

  const grades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).sort((a, b) => a - b), [students])

  // Classes compared: a row per class, and in All grades a whole-grade row heading each grade.
  const classRows = useMemo(() => {
    const rows: { key: string; label: string; grade: number; englishClass: string | null; stats: GroupStats; isGrade: boolean }[] = []
    grades.forEach(g => {
      const inGrade = students.filter(s => s.grade === g)
      if (scope === 'all') rows.push({ key: `g${g}`, label: lang === 'ko' ? `${g}학년 전체` : `Grade ${g}, all classes`, grade: g, englishClass: null, stats: groupStats(inGrade.map(s => s.id), latestByStudent, basis), isGrade: true })
      const classes = Array.from(new Set(inGrade.map(s => s.english_class))).sort((a, b) => classRank(a) - classRank(b))
      classes.forEach(c => {
        const ids = inGrade.filter(s => s.english_class === c).map(s => s.id)
        rows.push({ key: `g${g}:${c}`, label: c, grade: g, englishClass: c, stats: groupStats(ids, latestByStudent, basis), isGrade: false })
      })
    })
    if (scope === 'grade' && grades.length) {
      rows.push({ key: 'grade', label: lang === 'ko' ? `${grade}학년 전체` : `Whole grade`, grade, englishClass: null, stats: groupStats(students.map(s => s.id), latestByStudent, basis), isGrade: true })
    }
    return rows
  }, [grades, students, latestByStudent, basis, scope, grade, lang])

  // Students: grouped by class, or ranked by position within each grade.
  const groups = useMemo<Group[]>(() => {
    const out: Group[] = []
    grades.forEach(g => {
      const inGrade = students.filter(s => s.grade === g)
      if (sort === 'position') {
        out.push({ key: `g${g}`, label: lang === 'ko' ? `${g}학년 · 위치순` : `Grade ${g} · by mastery position`, grade: g, englishClass: null, students: byPosition(inGrade, posByStudent) })
      } else {
        const classes = Array.from(new Set(inGrade.map(s => s.english_class))).sort((a, b) => classRank(a) - classRank(b))
        classes.forEach(c => out.push({ key: `g${g}:${c}`, label: scope === 'all' ? `${lang === 'ko' ? `${g}학년` : `Grade ${g}`} · ${c}` : c, grade: g, englishClass: c, students: inGrade.filter(s => s.english_class === c) }))
      }
    })
    return out
  }, [grades, students, sort, posByStudent, scope, lang])

  const isCollapsed = (k: string) => collapsed === 'all' ? true : collapsed.has(k)
  const toggle = (k: string) => setCollapsed(prev => {
    const next = new Set(prev === 'all' ? groups.map(g => g.key) : prev)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })

  const exportCsv = () => {
    exportToCSV(`phonics-${scope === 'grade' ? `G${grade}-all-classes` : 'all-grades'}${basis === 'secure' ? '-proficient' : ''}`,
      ['Grade', 'Class', 'Student', 'Korean name', ...PHONICS_SKILLS.map(s => s.short), basis === 'mastered' ? 'Mastered through' : 'Proficient+ through', 'Position (of 20)', 'Gaps below', 'Tested through (of 20)', 'Last check'],
      [...students].sort((a, b) => a.grade - b.grade || classRank(a.english_class) - classRank(b.english_class) || a.english_name.localeCompare(b.english_name)).map(s => {
        const latest = latestByStudent[s.id] || {}
        const p = posByStudent[s.id]
        const last = Object.values(latest).reduce<string>((m, l) => l.date > m ? l.date : m, '')
        return [s.grade, s.english_class, s.english_name, s.korean_name,
          ...PHONICS_SKILL_IDS.map(id => latest[id] ? `${latest[id].score.correct}/${latest[id].score.total}` : ''),
          p.through ? phonicsSkill(p.through)?.label || '' : '', p.tested ? p.position : '', p.gaps.map(g => phonicsSkill(g)?.short || g).join('; '), p.tested ? p.testedThrough : '', last]
      }))
  }

  const seg = (on: boolean) => `px-3 h-8 rounded text-[12.5px] font-medium ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`
  const basisWord = basis === 'mastered' ? (lang === 'ko' ? '완성' : 'mastered') : (lang === 'ko' ? '숙달 이상' : 'proficient+')
  const openStudent = open ? students.find(s => s.id === open.sid) : null

  if (loading || loadingChecks) return <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
  if (students.length === 0) return <p className="text-[13px] text-ink-3 py-8">{lang === 'ko' ? '학생이 없습니다.' : 'No students.'}</p>

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        <div className="inline-flex p-0.5 rounded border border-rule-2 bg-surface" title={lang === 'ko' ? '기준' : 'What counts as having a sheet'}>
          <button onClick={() => setBasis('mastered')} className={seg(basis === 'mastered')}>{lang === 'ko' ? '완성' : 'Mastered'}</button>
          <button onClick={() => setBasis('secure')} className={seg(basis === 'secure')}>{lang === 'ko' ? '숙달 이상' : 'Proficient+'}</button>
        </div>
        <div className="inline-flex p-0.5 rounded border border-rule-2 bg-surface">
          <button onClick={() => setSort('class')} className={seg(sort === 'class')}>{lang === 'ko' ? '반별' : 'By class'}</button>
          <button onClick={() => setSort('position')} className={seg(sort === 'position')}>{lang === 'ko' ? '위치순' : 'By position'}</button>
        </div>
        <label className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
          {lang === 'ko' ? '이후 점검만' : 'Checks since'}
          <input type="date" value={since} onChange={e => setSince(e.target.value)} className="h-8 px-2 rounded border border-rule-2 bg-surface text-[12px] text-ink" />
          {since && <button onClick={() => setSince('')} className="text-ink-3 hover:text-ink" aria-label={lang === 'ko' ? '날짜 지우기' : 'Clear date'}><X size={13} /></button>}
        </label>
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"><Download size={11} /> CSV</button>
      </div>
      <p className="text-[12px] text-ink-3 mb-5 max-w-[920px]">
        {basis === 'mastered'
          ? (lang === 'ko' ? '완성 = 90% 이상이고 “자동” 체크. 자동 체크가 없으면 90% 이상이어도 완성으로 세지 않습니다. 숙달 이상으로 바꾸면 체크 없이 비교합니다.' : 'Mastered = 90%+ with “automatic” ticked. A sheet at 90%+ without the tick does not count; switch to Proficient+ to compare without it.')
          : (lang === 'ko' ? '숙달 이상 = 90% 이상, 자동 체크와 상관없이.' : 'Proficient+ = 90%+, automatic ticked or not.')}
        {' '}{lang === 'ko' ? `학생 ${MIN_TESTED}명 미만이 점검한 시트는 회색입니다.` : `Figures from fewer than ${MIN_TESTED} students tested are greyed: too few to compare on.`}
        {since && <> {lang === 'ko' ? `${since} 이후 점검만 셉니다.` : `Counting checks from ${fmtShort(since, lang)} on.`}</>}
      </p>

      {/* ─── Classes compared ─── */}
      <h3 className="eyebrow eyebrow-accent mb-2">{lang === 'ko' ? '반 비교' : 'Classes compared'}</h3>
      <p className="text-[11.5px] text-ink-3 mb-2">{lang === 'ko'
        ? `각 칸은 그 시트를 점검한 학생 중 ${basisWord}인 비율. 테두리 칸은 그 반의 경계: ${EDGE_PCT}% 미만인 첫 시트입니다.`
        : `Each cell: of the students checked on that sheet, the share ${basisWord}. The outlined cell is the class’s edge, the first sheet under ${EDGE_PCT}%.`}</p>
      <div className="border border-rule-2 rounded-md overflow-x-auto mb-8">
        <table className="w-full min-w-[980px] table-fixed text-[12px] tabular-nums border-collapse">
          <colgroup>
            <col style={{ width: 168 }} />
            <col style={{ width: 66 }} />
            <col style={{ width: 120 }} />
            {PHONICS_SKILLS.map(s => <col key={s.id} />)}
          </colgroup>
          <SheetHeader lang={lang} lead={[lang === 'ko' ? '반' : 'Class', lang === 'ko' ? '점검/전체' : 'Tested', lang === 'ko' ? '중앙 위치' : 'Median position']} />
          <tbody className="divide-y divide-rule">
            {classRows.map(r => (
              <tr key={r.key} className={r.isGrade ? 'bg-paper-2/70' : ''}>
                <td className={`px-3 py-1 border-r border-rule-2 truncate ${r.isGrade ? 'font-semibold text-ink' : 'text-ink'}`}>
                  {r.englishClass && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${CLASS_DOT[r.englishClass] || 'bg-ink-3'}`} />}{r.label}
                </td>
                <td className="px-2 py-1 text-[11px] text-ink-2 text-center">{r.stats.tested}/{r.stats.students}</td>
                <td className="px-2 py-1 text-[11px] text-ink-2 border-r border-rule-2 truncate" title={r.stats.medianPosition != null ? positionLabel(r.stats.medianPosition) : ''}>
                  {r.stats.medianPosition == null ? <span className="text-ink-3">—</span>
                    : <><span className="font-semibold text-ink">{r.stats.medianPosition}</span> <span className="text-ink-3">{positionShort(r.stats.medianPosition)}</span></>}
                </td>
                {PHONICS_SKILLS.map((sk, i) => {
                  const st = r.stats.bySheet[sk.id]
                  const edge = r.stats.edge === sk.id
                  return (
                    <td key={sk.id} className={`p-[3px] ${i > 0 && PHONICS_SKILLS[i - 1].group !== sk.group ? 'border-l border-rule' : ''}`}>
                      <div title={`${r.label} · ${sk.label}: ${st.tested ? `${st.meeting} of ${st.tested} checked ${basisWord} (${st.pct}%)` : 'nobody checked'}${st.tested && st.tested < r.stats.students ? ` · ${r.stats.students - st.tested} not checked` : ''}${edge ? ' · the class’s edge' : ''}`}
                        className={`w-full h-7 rounded-sm text-[10.5px] font-semibold flex flex-col items-center justify-center leading-none ${shareTone(st.pct, st.thin)} ${edge ? 'ring-2 ring-ink ring-inset' : ''}`}>
                        {st.pct == null ? '·' : <>{st.pct}<span className="text-[8.5px] font-normal opacity-70 mt-px">n{st.tested}</span></>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ─── Students ─── */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-2">
        <div>
          <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '학생' : 'Students'}</h3>
          <p className="text-[11.5px] text-ink-3">{lang === 'ko'
            ? `위치 = ${basisWord}인 가장 먼 시트 (20개 중). ⚠ = 그 아래에 90% 미만인 시트가 있음. 이름을 클릭하면 시도별 진전, 칸을 클릭하면 단어가 보입니다.`
            : `Position = the furthest sheet ${basisWord}, of 20. ⚠ = a sheet below it still under 90%. Click a name for progress, a cell for the words.`}</p>
        </div>
        <div className="flex items-center gap-3 text-[11.5px] text-ink-2 flex-wrap">
          {BANDS.map(b => <span key={b} className="inline-flex items-center gap-1.5"><span className={`w-3 h-3 rounded-sm ${BAND_TONE[b]} ${b !== 'mastered' ? 'border border-rule-2' : ''}`} />{PHONICS_BAND_LABELS[b][lang]}</span>)}
          <button onClick={() => setCollapsed(new Set())} className="text-ink-3 hover:text-ink underline-offset-2 hover:underline">{lang === 'ko' ? '모두 펼치기' : 'Expand all'}</button>
          <button onClick={() => setCollapsed('all')} className="text-ink-3 hover:text-ink underline-offset-2 hover:underline">{lang === 'ko' ? '모두 접기' : 'Collapse all'}</button>
        </div>
      </div>
      <div className="border border-rule-2 rounded-md overflow-x-auto">
        <table className="w-full min-w-[980px] table-fixed text-[12px] tabular-nums border-collapse">
          <colgroup>
            <col style={{ width: 168 }} />
            {PHONICS_SKILLS.map(s => <col key={s.id} />)}
            <col style={{ width: 150 }} />
          </colgroup>
          <SheetHeader lang={lang} lead={[lang === 'ko' ? '학생' : 'Student']} trail={lang === 'ko' ? '위치' : 'Position'} />
          <tbody>
            {groups.map(g => {
              const shut = isCollapsed(g.key)
              const tested = g.students.filter(s => posByStudent[s.id]?.tested).length
              const med = groupStats(g.students.map(s => s.id), latestByStudent, basis).medianPosition
              return (
                <Fragment key={g.key}>
                  <tr className="bg-paper-2 border-t border-rule-2">
                    <td colSpan={PHONICS_SKILLS.length + 2} className="px-2 py-1.5">
                      <button onClick={() => toggle(g.key)} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
                        {shut ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                        {g.englishClass && <span className={`w-2 h-2 rounded-full ${CLASS_DOT[g.englishClass] || 'bg-ink-3'}`} />}
                        {g.label}
                        <span className="font-normal text-ink-3 text-[11.5px]">· {tested}/{g.students.length} {lang === 'ko' ? '점검' : 'checked'}{med != null ? ` · ${lang === 'ko' ? '중앙' : 'median'} ${med} ${positionShort(med)}` : ''}</span>
                      </button>
                    </td>
                  </tr>
                  {!shut && g.students.map(s => (
                    <StudentRow key={s.id} s={s} latest={latestByStudent[s.id] || {}} pos={posByStudent[s.id]} basisWord={basisWord} lang={lang}
                      showClass={!g.englishClass} onName={() => onOpenStudent(s)} onCell={(skill) => setOpen({ sid: s.id, skill })} />
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {open && openStudent && (
        <PhonicsCellDetail student={openStudent} skill={open.skill} checks={byStudent[openStudent.id] || []} lang={lang} onClose={() => setOpen(null)}
          onRecheck={() => { setOpen(null); onCheckStudent(openStudent, [open.skill]) }}
          onEdit={() => { setOpen(null); onOpenStudent(openStudent) }} />
      )}
    </div>
  )
}

function positionShort(p: number): string {
  if (p <= 0) return ''
  const lo = PHONICS_SKILLS[Math.max(0, Math.floor(p) - 1)]
  return Number.isInteger(p) ? lo.short : `${lo.short}–${PHONICS_SKILLS[Math.ceil(p) - 1].short}`
}
function positionLabel(p: number): string {
  if (p <= 0) return 'Nothing yet'
  return `${p} of 20 · ${Number.isInteger(p) ? PHONICS_SKILLS[p - 1].label : `between ${PHONICS_SKILLS[Math.floor(p) - 1].label} and ${PHONICS_SKILLS[Math.ceil(p) - 1].label}`}`
}

function SheetHeader({ lang, lead, trail }: { lang: Lang; lead: string[]; trail?: string }) {
  return (
    <thead>
      <tr className="bg-paper-2">
        {lead.map((l, i) => <th key={l} rowSpan={2} className={`text-left px-3 py-2 eyebrow font-semibold border-b border-rule-2 align-bottom ${i === lead.length - 1 ? 'border-r' : ''}`}>{l}</th>)}
        {PHONICS_GROUPS.map(g => <th key={g.id} colSpan={skillsInGroup(g.id).length} className="px-1 pt-2 pb-1 eyebrow font-semibold border-b border-l border-rule text-center whitespace-nowrap overflow-hidden text-ellipsis">{lang === 'ko' ? g.label_ko : g.label}</th>)}
        {trail && <th rowSpan={2} className="px-3 py-2 border-b border-l border-rule-2 eyebrow font-semibold text-left align-bottom">{trail}</th>}
      </tr>
      <tr className="bg-paper-2">
        {PHONICS_SKILLS.map((s, i) => (
          <th key={s.id} className={`px-0 pb-1.5 border-b border-rule-2 align-bottom h-[96px] ${i > 0 && PHONICS_SKILLS[i - 1].group !== s.group ? 'border-l border-rule' : ''}`} title={`${i + 1}. ${s.label}\n${s.covers}`}>
            <div className="flex flex-col items-center justify-end gap-1 h-full">
              <span className="text-[10.5px] font-semibold text-ink-2 whitespace-nowrap leading-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{s.short}</span>
              <span className="text-[9.5px] leading-none text-ink-3">{i + 1}</span>
            </div>
          </th>
        ))}
      </tr>
    </thead>
  )
}

function StudentRow({ s, latest, pos, basisWord, lang, showClass, onName, onCell }: {
  s: Student; latest: LatestBySkill; pos: MasteryPosition; basisWord: string; lang: Lang; showClass: boolean
  onName: () => void; onCell: (skill: string) => void
}) {
  const last = Object.values(latest).reduce<string>((m, l) => l.date > m ? l.date : m, '')
  return (
    <tr className="border-t border-rule">
      <td className="px-3 py-1 border-r border-rule-2 overflow-hidden">
        <button onClick={onName} className="block w-full text-left truncate hover:underline" title={`${s.english_name} · ${s.english_class} · ${lang === 'ko' ? '시도별 진전 보기' : 'open progress'}`}>
          {showClass && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${CLASS_DOT[s.english_class] || 'bg-ink-3'}`} />}
          <span className="text-ink">{getDisplayName(s)}</span><span className="text-ink-3 ml-1.5 text-[11px]">{s.korean_name}</span>
        </button>
      </td>
      {PHONICS_SKILLS.map((sk, i) => {
        const l = latest[sk.id]
        const band = l ? phonicsBand(l.score) : null
        return (
          <td key={sk.id} className={`p-[3px] ${i > 0 && PHONICS_SKILLS[i - 1].group !== sk.group ? 'border-l border-rule' : ''}`}>
            <button onClick={() => l && onCell(sk.id)} disabled={!l}
              title={l ? `${sk.label}: ${l.score.correct}/${l.score.total} · ${PHONICS_BAND_LABELS[band!].en} · ${fmtShort(l.date, lang)}` : `${sk.label}: not checked`}
              className={`w-full h-6 rounded-sm text-[10.5px] font-semibold ${band ? BAND_TONE[band] : 'bg-paper-2/60 text-ink-3/40'}`}>
              {l ? l.score.pct : '·'}
            </button>
          </td>
        )
      })}
      <td className="px-3 py-1 border-l border-rule-2 text-[11px] leading-tight overflow-hidden">
        {!pos.tested ? <span className="text-ink-3">{lang === 'ko' ? '미점검' : 'Not checked'}</span> : (
          <>
            <span className="flex items-center gap-1 text-ink truncate" title={pos.through ? `${basisWord} through ${phonicsSkill(pos.through)?.label}${pos.gaps.length ? ` · under 90% below it: ${pos.gaps.map(g => phonicsSkill(g)?.label).join(', ')}` : ''}${pos.unticked ? ` · ${pos.unticked} sheet${pos.unticked === 1 ? '' : 's'} at 90%+ without “automatic” ticked` : ''}` : `Nothing ${basisWord} yet`}>
              <span className="font-semibold">{pos.position}</span>
              <span className="truncate">{pos.through ? phonicsSkill(pos.through)?.short : (lang === 'ko' ? '아직 없음' : 'none yet')}</span>
              {pos.gaps.length > 0 && <AlertTriangle size={11} className="text-warn shrink-0" />}
            </span>
            <span className="block text-[10px] text-ink-3 truncate">{lang === 'ko' ? `${pos.testedThrough}번까지 점검` : `tested to ${pos.testedThrough}`}{last ? ` · ${fmtShort(last, lang)}` : ''}</span>
          </>
        )}
      </td>
    </tr>
  )
}
