'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { PLACED_ENGLISH_CLASSES, type Student } from '@/types'
import { useStudents } from '@/hooks/useData'
import { getDisplayName } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'
import { ENGLISH_CLASS_ORDER } from '@/lib/rosterSort'
import {
  PHONICS_GROUPS, PHONICS_SKILLS, PHONICS_SKILL_IDS, PHONICS_BAND_LABELS,
  phonicsSkill, skillsInGroup, latestBySkill, phonicsBand, scoreText,
  type PhonicsCheckRow, type LatestBySkill, type PhonicsBand,
} from '@/lib/phonics'
import {
  MIN_TESTED, EDGE_PCT, masteryPosition, groupStats, checksSince, byPosition, levelingLanes,
  type MasteryPosition, type GroupStats, type LevelFlag,
} from '@/lib/phonicsCompare'
import { loadAllPhonicsChecks } from '@/lib/phonicsData'
import { BAND_TONE, fmtShort } from '@/components/reading/phonicsTones'
import PhonicsCellDetail from '@/components/reading/PhonicsCellDetail'
import PhonicsLevelingStrip, { FlagChip } from '@/components/reading/PhonicsLevelingStrip'
import PhonicsStudentCompare, { MAX_COMPARE } from '@/components/reading/PhonicsStudentCompare'
import PhonicsPatterns, { type PatternColumn } from '@/components/reading/PhonicsPatterns'
import PhonicsGroups from '@/components/reading/PhonicsGroups'
import { nextToTeach } from '@/lib/phonicsPatterns'
import { AlertTriangle, ChevronDown, ChevronRight, Columns3, Download, Loader2, X } from 'lucide-react'

// ─── Phonics: whole grade and all grades ─────────────────────────
// Reading → Phonics with the scope set past one class. Every teacher sees
// every class here, for leveling: where whole classes sit on the packet's
// twenty sheets, and which students sit where against their class.
//
// Classes compared: a row per class, each sheet the share of
// its tested students meeting the bar, the class's edge (first sheet under
// 70%) outlined. Students: the heat map for every student in scope, grouped
// by class or ranked by mastery position, the furthest sheet meeting the
// bar. Cells tested by fewer than three students are greyed: too thin to
// compare on. Those two are the first tab. Leveling: a strip per grade with
// every checked student placed on the twenty sheets, and the students who
// read like the class above or below. Error patterns: how students decoded,
// what gave trouble and which words were missed, class against class.
// Groups: students gathered across classes by the sheet to teach next.
// Tick students anywhere to compare them side by side.

type Lang = 'en' | 'ko'
export type PhonicsScope = 'class' | 'grade' | 'all'
type Sort = 'class' | 'position'
type Tab = 'overview' | 'leveling' | 'patterns' | 'groups'

const CLASS_DOT: Record<string, string> = { Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy', Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon' }
const BANDS: PhonicsBand[] = ['mastered', 'developing', 'beginning']
const classRank = (c: string) => ENGLISH_CLASS_ORDER[c] || 99

/** Tone for a class's share mastered on a sheet. */
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
  const [sort, setSort] = useState<Sort>('class')
  const [tab, setTab] = useState<Tab>('overview')
  const [since, setSince] = useState('')
  const [open, setOpen] = useState<{ sid: string; skill: string } | null>(null)
  const [picked, setPicked] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)
  const togglePick = (id: string) => setPicked(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= MAX_COMPARE ? prev : [...prev, id])
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
  const posByStudent = useMemo(() => Object.fromEntries(students.map(s => [s.id, masteryPosition(latestByStudent[s.id] || {})])) as Record<string, MasteryPosition>, [students, latestByStudent])

  const grades = useMemo(() => Array.from(new Set(students.map(s => s.grade))).sort((a, b) => a - b), [students])
  const studentById = useMemo(() => Object.fromEntries(students.map(s => [s.id, s])) as Record<string, Student>, [students])
  const checksById = useMemo(() => Object.fromEntries(checks.map(c => [c.id, c])) as Record<string, PhonicsCheckRow>, [checks])

  // Leveling: lanes per grade, lowest class first; Unplaced last and never a neighbour.
  const leveling = useMemo(() => {
    const flags: Record<string, LevelFlag> = {}
    const byGrade = grades.map(g => {
      const inGrade = students.filter(s => s.grade === g)
      const classes = Array.from(new Set(inGrade.map(s => s.english_class))).sort((a, b) => classRank(a) - classRank(b))
      const r = levelingLanes(classes.map(c => ({ englishClass: c, placed: PLACED_ENGLISH_CLASSES.includes(c as any), studentIds: inGrade.filter(s => s.english_class === c).map(s => s.id) })), posByStudent)
      Object.assign(flags, r.flags)
      return { grade: g, lanes: r.lanes }
    })
    return { byGrade, flags }
  }, [grades, students, posByStudent])
  const candidates = useMemo(() => students
    .filter(s => leveling.flags[s.id])
    .sort((a, b) => a.grade - b.grade || (leveling.flags[a.id].dir === leveling.flags[b.id].dir ? 0 : leveling.flags[a.id].dir === 'up' ? -1 : 1) || classRank(a.english_class) - classRank(b.english_class) || posByStudent[b.id].position - posByStudent[a.id].position),
  [students, leveling, posByStudent])
  const pickedStudents = picked.map(id => studentById[id]).filter(Boolean)

  // Error patterns: a column per class in a grade, per grade across the school, and one for everyone.
  const patternColumns = useMemo<PatternColumn[]>(() => {
    const cols: PatternColumn[] = scope === 'grade'
      ? Array.from(new Set(students.map(s => s.english_class))).sort((a, b) => classRank(a) - classRank(b))
          .map(c => ({ key: c, label: c, dot: CLASS_DOT[c] || 'bg-ink-3', studentIds: students.filter(s => s.english_class === c).map(s => s.id) }))
      : grades.map(g => ({ key: `g${g}`, label: lang === 'ko' ? `${g}학년` : `Grade ${g}`, studentIds: students.filter(s => s.grade === g).map(s => s.id) }))
    cols.push({ key: 'all', label: scope === 'grade' ? (lang === 'ko' ? '학년 전체' : 'Whole grade') : (lang === 'ko' ? '전교' : 'Whole school'), studentIds: students.map(s => s.id), total: true })
    return cols
  }, [scope, students, grades, lang])

  // Classes compared: a row per class, and in All grades a whole-grade row heading each grade.
  const classRows = useMemo(() => {
    const rows: { key: string; label: string; grade: number; englishClass: string | null; stats: GroupStats; isGrade: boolean }[] = []
    grades.forEach(g => {
      const inGrade = students.filter(s => s.grade === g)
      if (scope === 'all') rows.push({ key: `g${g}`, label: lang === 'ko' ? `${g}학년 전체` : `Grade ${g}, all classes`, grade: g, englishClass: null, stats: groupStats(inGrade.map(s => s.id), latestByStudent), isGrade: true })
      const classes = Array.from(new Set(inGrade.map(s => s.english_class))).sort((a, b) => classRank(a) - classRank(b))
      classes.forEach(c => {
        const ids = inGrade.filter(s => s.english_class === c).map(s => s.id)
        rows.push({ key: `g${g}:${c}`, label: c, grade: g, englishClass: c, stats: groupStats(ids, latestByStudent), isGrade: false })
      })
    })
    if (scope === 'grade' && grades.length) {
      rows.push({ key: 'grade', label: lang === 'ko' ? `${grade}학년 전체` : `Whole grade`, grade, englishClass: null, stats: groupStats(students.map(s => s.id), latestByStudent), isGrade: true })
    }
    return rows
  }, [grades, students, latestByStudent, scope, grade, lang])

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
    exportToCSV(`phonics-${scope === 'grade' ? `G${grade}-all-classes` : 'all-grades'}`,
      ['Grade', 'Class', 'Student', 'Korean name', ...PHONICS_SKILLS.map(s => s.short), 'Mastered through', 'Position (of 20)', 'Gaps below', 'Tested through (of 20)', 'Reads like', 'Next to teach', 'Last check'],
      [...students].sort((a, b) => a.grade - b.grade || classRank(a.english_class) - classRank(b.english_class) || a.english_name.localeCompare(b.english_name)).map(s => {
        const latest = latestByStudent[s.id] || {}
        const p = posByStudent[s.id]
        const last = Object.values(latest).reduce<string>((m, l) => l.date > m ? l.date : m, '')
        return [s.grade, s.english_class, s.english_name, s.korean_name,
          ...PHONICS_SKILL_IDS.map(id => latest[id] ? scoreText(latest[id].score) : ''),
          p.through ? phonicsSkill(p.through)?.label || '' : '', p.tested ? p.position : '', p.gaps.map(g => phonicsSkill(g)?.short || g).join('; '), p.tested ? p.testedThrough : '',
          leveling.flags[s.id] ? `${leveling.flags[s.id].dir === 'up' ? 'above' : 'below'}: ${leveling.flags[s.id].likeClass}${leveling.flags[s.id].unsure ? ' (not tested further)' : ''}` : '',
          (() => { const n = nextToTeach(latest); return n.sheet ? `${phonicsSkill(n.sheet)?.label || ''}${n.reason === 'gap' ? ' (hole below position)' : !n.checked ? ' (not checked on it)' : ''}` : n.reason === 'done' ? 'all done' : '' })(),
          last]
      }))
  }

  const seg = (on: boolean) => `px-3 h-8 rounded text-[12.5px] font-medium ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`
  const openStudent = open ? students.find(s => s.id === open.sid) : null

  if (loading || loadingChecks) return <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
  if (students.length === 0) return <p className="text-[13px] text-ink-3 py-8">{lang === 'ko' ? '학생이 없습니다.' : 'No students.'}</p>

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-3">
        {tab === 'overview' && <div className="inline-flex p-0.5 rounded border border-rule-2 bg-surface">
          <button onClick={() => setSort('class')} className={seg(sort === 'class')}>{lang === 'ko' ? '반별' : 'By class'}</button>
          <button onClick={() => setSort('position')} className={seg(sort === 'position')}>{lang === 'ko' ? '위치순' : 'By position'}</button>
        </div>}
        <label className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
          {lang === 'ko' ? '이후 점검만' : 'Checks since'}
          <input type="date" value={since} onChange={e => setSince(e.target.value)} className="h-8 px-2 rounded border border-rule-2 bg-surface text-[12px] text-ink" />
          {since && <button onClick={() => setSince('')} className="text-ink-3 hover:text-ink" aria-label={lang === 'ko' ? '날짜 지우기' : 'Clear date'}><X size={13} /></button>}
        </label>
        <button onClick={exportCsv} className="ml-auto inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"><Download size={11} /> CSV</button>
      </div>
      <p className="text-[12px] text-ink-3 mb-5 max-w-[920px]">
        {lang === 'ko' ? '완성 = 가장 최근 점검에서 90% 이상.' : 'Mastered = 90% or more on the latest check of that sheet.'}
        {' '}{lang === 'ko' ? `학생 ${MIN_TESTED}명 미만이 점검한 시트는 회색입니다.` : `Figures from fewer than ${MIN_TESTED} students tested are greyed: too few to compare on.`}
        {since && <> {lang === 'ko' ? `${since} 이후 점검만 셉니다.` : `Counting checks from ${fmtShort(since, lang)} on.`}</>}
      </p>

      <div className="flex border-b border-rule-2 mb-5" data-guide="reading.phonics.compare-tabs">
        {([
          ['overview', lang === 'ko' ? '반과 학생' : 'Classes & students'],
          ['leveling', lang === 'ko' ? `레벨링 · ${candidates.length}` : `Leveling · ${candidates.length}`],
          ['patterns', lang === 'ko' ? '오류 패턴' : 'Error patterns'],
          ['groups', lang === 'ko' ? '그룹' : 'Groups'],
        ] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`relative px-4 h-9 text-[13px] font-medium ${tab === id ? 'text-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`}>
            {label}{tab === id && <span className="absolute left-4 right-4 bottom-0 h-[2px] bg-accent" />}
          </button>
        ))}
      </div>

      {tab === 'patterns' && <PhonicsPatterns columns={patternColumns} latestByStudent={latestByStudent} checksById={checksById} studentById={studentById} lang={lang} onOpenStudent={onOpenStudent} />}
      {tab === 'groups' && <PhonicsGroups students={students} latestByStudent={latestByStudent} checksById={checksById} lang={lang} onOpenStudent={onOpenStudent} />}

      {tab === 'overview' && <>

      {/* ─── Classes compared ─── */}
      <h3 className="eyebrow eyebrow-accent mb-2">{lang === 'ko' ? '반 비교' : 'Classes compared'}</h3>
      <p className="text-[11.5px] text-ink-3 mb-2">{lang === 'ko'
        ? `각 칸: 그 시트를 점검한 학생 중 완성한 비율과, 점검한 학생 수. 테두리 칸은 그 반의 경계: ${EDGE_PCT}% 미만인 첫 시트입니다.`
        : `Each cell: the share of the students checked on that sheet who have mastered it, and how many were checked. The outlined cell is the class’s edge, the first sheet under ${EDGE_PCT}%.`}</p>
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
                      <div title={`${r.label} · ${sk.label}: ${st.tested ? `${st.meeting} of the ${st.tested} checked have mastered it (${st.pct}%)` : 'nobody checked'}${st.tested && st.tested < r.stats.students ? ` · ${r.stats.students - st.tested} not checked` : ''}${st.thin && st.tested ? ' · too few to compare on' : ''}${edge ? ' · the class’s edge' : ''}`}
                        className={`w-full h-8 rounded-sm font-semibold flex flex-col items-center justify-center leading-none ${shareTone(st.pct, st.thin)} ${edge ? 'ring-2 ring-ink ring-inset' : ''}`}>
                        {st.pct == null ? <span className="text-[10.5px]">·</span> : <><span className="text-[11px]">{st.pct}%</span><span className="text-[8.5px] font-normal opacity-75 mt-[2px] whitespace-nowrap">{st.tested} {lang === 'ko' ? '명' : 'checked'}</span></>}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      </>}

      {tab === 'leveling' && <>
      {/* ─── Leveling ─── */}
      <h3 className="eyebrow eyebrow-accent mb-2">{lang === 'ko' ? '레벨링' : 'Leveling'}</h3>
      <p className="text-[11.5px] text-ink-3 mb-2 max-w-[920px]">{lang === 'ko'
        ? `점 하나가 학생 한 명, 위치(0–20)에 놓입니다. 음영은 그 반의 중간 50%, 막대는 중앙값. 초록 테두리: 위 반의 중앙값에 이름. 빨간 테두리: 아래 반의 중앙값 이하. 노란 테두리: 아래 반 수준이지만 그 위로는 점검하지 않음.`
        : `A dot per checked student at their position (0–20). Shaded: the class’s middle half; bar: its median. Ringed green: at or past the median of the class above. Ringed red: at or under the median of the class below. Ringed amber: the same, but never tested past that point, so check further first.`}</p>
      {leveling.byGrade.map(g => (
        <PhonicsLevelingStrip key={g.grade} title={lang === 'ko' ? `${g.grade}학년` : `Grade ${g.grade}`} lanes={g.lanes} students={studentById} pos={posByStudent} flags={leveling.flags}
          lang={lang} onOpenStudent={onOpenStudent} />
      ))}
      <div className="mt-4 mb-8">
        <p className="text-[12.5px] font-semibold text-ink mb-1.5">{lang === 'ko' ? '레벨링 후보' : 'Leveling candidates'} <span className="font-normal text-ink-3">· {candidates.length}</span></p>
        {candidates.length === 0 ? <p className="text-[12px] text-ink-3">{lang === 'ko' ? '이웃 반 수준에 있는 학생이 없습니다.' : 'Nobody reads like a neighbouring class on phonics.'}</p> : (
          <div className="border border-rule-2 rounded-md overflow-x-auto">
            <table className="w-full min-w-[760px] text-[12px] border-collapse">
              <thead><tr className="bg-paper-2 text-left">
                <th className="w-8" />
                <th className="px-2 py-1.5 eyebrow font-semibold">{lang === 'ko' ? '학생' : 'Student'}</th>
                <th className="px-2 py-1.5 eyebrow font-semibold">{lang === 'ko' ? '현재 반' : 'Now in'}</th>
                <th className="px-2 py-1.5 eyebrow font-semibold">{lang === 'ko' ? '위치' : 'Position'}</th>
                <th className="px-2 py-1.5 eyebrow font-semibold">{lang === 'ko' ? '파닉스 수준' : 'Phonics reads like'}</th>
                <th className="px-2 py-1.5 eyebrow font-semibold">{lang === 'ko' ? '아래 구멍' : 'Gaps below'}</th>
              </tr></thead>
              <tbody className="divide-y divide-rule">
                {candidates.map(s => {
                  const p = posByStudent[s.id]; const f = leveling.flags[s.id]
                  return (
                    <tr key={s.id}>
                      <td className="text-center"><PickBox on={picked.includes(s.id)} full={picked.length >= MAX_COMPARE} onToggle={() => togglePick(s.id)} lang={lang} /></td>
                      <td className="px-2 py-1"><button onClick={() => onOpenStudent(s)} className="hover:underline text-ink">{getDisplayName(s)}</button> <span className="text-ink-3 text-[11px]">{s.korean_name}</span></td>
                      <td className="px-2 py-1 text-ink-2 whitespace-nowrap"><span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${CLASS_DOT[s.english_class] || 'bg-ink-3'}`} />{lang === 'ko' ? `${s.grade}학년` : `G${s.grade}`} · {s.english_class}</td>
                      <td className="px-2 py-1 text-ink whitespace-nowrap"><span className="font-semibold">{p.position}</span> {p.through ? phonicsSkill(p.through)?.short : (lang === 'ko' ? '아직 없음' : 'none yet')} <span className="text-ink-3 text-[11px]">· {lang === 'ko' ? `${p.testedThrough}번까지 점검` : `tested to ${p.testedThrough}`}</span></td>
                      <td className="px-2 py-1"><FlagChip f={f} lang={lang} /> <span className="text-[11px] text-ink-3">{lang === 'ko' ? `중앙값 ${f.likeMedian}` : `median ${f.likeMedian}`}</span></td>
                      <td className="px-2 py-1 text-[11px] text-ink-2">{p.gaps.length ? p.gaps.map(g => phonicsSkill(g)?.short).join(', ') : <span className="text-ink-3">—</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      </>}

      {tab === 'overview' && <>
      {/* ─── Students ─── */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-2">
        <div>
          <h3 className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '학생' : 'Students'}</h3>
          <p className="text-[11.5px] text-ink-3">{lang === 'ko'
            ? `위치 = 완성한 가장 먼 시트 (20개 중). ⚠ = 그 아래에 90% 미만인 시트가 있음. 이름을 클릭하면 시도별 진전, 칸을 클릭하면 단어가 보입니다. 체크하면 최대 ${MAX_COMPARE}명까지 나란히 비교합니다.`
            : `Position = the furthest sheet mastered, of 20. ⚠ = a sheet below it still under 90%. Click a name for progress, a cell for the words. Tick up to ${MAX_COMPARE} students to compare them side by side.`}</p>
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
            <col style={{ width: 196 }} />
            {PHONICS_SKILLS.map(s => <col key={s.id} />)}
            <col style={{ width: 160 }} />
          </colgroup>
          <SheetHeader lang={lang} lead={[lang === 'ko' ? '학생' : 'Student']} trail={lang === 'ko' ? '위치' : 'Position'} />
          <tbody>
            {groups.map(g => {
              const shut = isCollapsed(g.key)
              const tested = g.students.filter(s => posByStudent[s.id]?.tested).length
              const med = groupStats(g.students.map(s => s.id), latestByStudent).medianPosition
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
                    <StudentRow key={s.id} s={s} latest={latestByStudent[s.id] || {}} pos={posByStudent[s.id]} flag={leveling.flags[s.id]} lang={lang}
                      showClass={!g.englishClass} onName={() => onOpenStudent(s)} onCell={(skill) => setOpen({ sid: s.id, skill })}
                      picked={picked.includes(s.id)} full={picked.length >= MAX_COMPARE} onPick={() => togglePick(s.id)} />
                  ))}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      </>}

      {pickedStudents.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-4 flex justify-center pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-2 flex-wrap px-3 py-2 rounded-lg border border-rule-2 bg-surface shadow-lg">
            {pickedStudents.map(s => (
              <span key={s.id} className="inline-flex items-center gap-1 pl-2 pr-1 h-7 rounded-full border border-rule-2 text-[12px] text-ink">
                <span className={`w-2 h-2 rounded-full ${CLASS_DOT[s.english_class] || 'bg-ink-3'}`} />{getDisplayName(s)}
                <button onClick={() => togglePick(s.id)} aria-label={`Remove ${s.english_name}`} className="text-ink-3 hover:text-ink"><X size={12} /></button>
              </span>
            ))}
            <span className="text-[11px] text-ink-3">{pickedStudents.length}/{MAX_COMPARE}</span>
            <button onClick={() => setPicked([])} className="text-[12px] text-ink-3 hover:text-ink">{lang === 'ko' ? '지우기' : 'Clear'}</button>
            <button onClick={() => setComparing(true)} disabled={pickedStudents.length < 2}
              className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-40 inline-flex items-center gap-1.5">
              <Columns3 size={13} /> {pickedStudents.length < 2 ? (lang === 'ko' ? '2명 이상 선택' : 'Pick 2 or more') : (lang === 'ko' ? '나란히 비교' : 'Compare')}
            </button>
          </div>
        </div>
      )}

      {comparing && pickedStudents.length > 0 && (
        <PhonicsStudentCompare students={pickedStudents} latestByStudent={latestByStudent} checksById={checksById} pos={posByStudent} flags={leveling.flags}
          lang={lang} onClose={() => setComparing(false)} onRemove={togglePick} onOpenStudent={(s) => { setComparing(false); onOpenStudent(s) }} />
      )}

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

function PickBox({ on, full, onToggle, lang }: { on: boolean; full: boolean; onToggle: () => void; lang: Lang }) {
  return (
    <input type="checkbox" checked={on} disabled={!on && full} onChange={onToggle} className="align-middle cursor-pointer disabled:cursor-not-allowed"
      title={!on && full ? (lang === 'ko' ? `최대 ${MAX_COMPARE}명` : `Up to ${MAX_COMPARE} at a time`) : (lang === 'ko' ? '비교에 추가' : 'Add to compare')} />
  )
}

function StudentRow({ s, latest, pos, flag, lang, showClass, onName, onCell, picked, full, onPick }: {
  s: Student; latest: LatestBySkill; pos: MasteryPosition; flag?: LevelFlag; lang: Lang; showClass: boolean
  onName: () => void; onCell: (skill: string) => void; picked: boolean; full: boolean; onPick: () => void
}) {
  const last = Object.values(latest).reduce<string>((m, l) => l.date > m ? l.date : m, '')
  return (
    <tr className="border-t border-rule">
      <td className="pl-2 pr-3 py-1 border-r border-rule-2 overflow-hidden">
        <div className="flex items-center gap-2">
        <PickBox on={picked} full={full} onToggle={onPick} lang={lang} />
        <button onClick={onName} className="block min-w-0 flex-1 text-left truncate hover:underline" title={`${s.english_name} · ${s.english_class} · ${lang === 'ko' ? '시도별 진전 보기' : 'open progress'}`}>
          {showClass && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${CLASS_DOT[s.english_class] || 'bg-ink-3'}`} />}
          <span className="text-ink">{getDisplayName(s)}</span><span className="text-ink-3 ml-1.5 text-[11px]">{s.korean_name}</span>
        </button>
        </div>
      </td>
      {PHONICS_SKILLS.map((sk, i) => {
        const l = latest[sk.id]
        const band = l ? phonicsBand(l.score) : null
        return (
          <td key={sk.id} className={`p-[3px] ${i > 0 && PHONICS_SKILLS[i - 1].group !== sk.group ? 'border-l border-rule' : ''}`}>
            <button onClick={() => l && onCell(sk.id)} disabled={!l}
              title={l ? `${sk.label}: ${scoreText(l.score)} · ${PHONICS_BAND_LABELS[band!].en} · ${fmtShort(l.date, lang)}` : `${sk.label}: not checked`}
              className={`w-full h-6 rounded-sm text-[10.5px] font-semibold ${band ? BAND_TONE[band] : 'bg-paper-2/60 text-ink-3/40'}`}>
              {l ? l.score.pct : '·'}
            </button>
          </td>
        )
      })}
      <td className="px-3 py-1 border-l border-rule-2 text-[11px] leading-tight overflow-hidden">
        {!pos.tested ? <span className="text-ink-3">{lang === 'ko' ? '미점검' : 'Not checked'}</span> : (
          <>
            <span className="flex items-center gap-1 text-ink truncate" title={pos.through ? `Mastered through ${phonicsSkill(pos.through)?.label}${pos.gaps.length ? ` · under 90% below it: ${pos.gaps.map(g => phonicsSkill(g)?.label).join(', ')}` : ''}` : 'Nothing mastered yet'}>
              <span className="font-semibold">{pos.position}</span>
              <span className="truncate">{pos.through ? phonicsSkill(pos.through)?.short : (lang === 'ko' ? '아직 없음' : 'none yet')}</span>
              {pos.gaps.length > 0 && <AlertTriangle size={11} className="text-warn shrink-0" />}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-ink-3">
              <span className="truncate">{lang === 'ko' ? `${pos.testedThrough}번까지${flag ? '' : ' 점검'}` : `${flag ? 'to' : 'tested to'} ${pos.testedThrough}`}{last && !flag ? ` · ${fmtShort(last, lang)}` : ''}</span>
              {flag && <span className="ml-auto shrink-0"><FlagChip f={flag} lang={lang} /></span>}
            </span>
          </>
        )}
      </td>
    </tr>
  )
}
