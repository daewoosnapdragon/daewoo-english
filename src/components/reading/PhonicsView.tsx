'use client'

import Loading from '@/components/brand/Loading'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { getDisplayName, getKSTDateString } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'
import { logActivity } from '@/lib/activity'
import type { Student } from '@/types'
import {
  PHONICS_BAND_LABELS, DECODING_OBSERVATIONS, OBSERVATION_GROUPS, PATTERN_PREFIX,
  phonicsSkill, orderSkills, latestBySkill, phonicsBand, summarizeStudent, notYetSecure, scoreCheck, nextMark, longestErrorRun, attemptsBySkill, latestDelta,
  scoreText, halfText, accuracyPct, isMiss, missedBefore, missCounts, scoreSkill, classSkills, groupsFor, isAlphabetSkill, withoutAlphabet,
  type PhonicsCheckRow, type CarriedSheet, type MissedSheet, type PhonicsMark, type LatestBySkill, type PhonicsBand, type PhonicsSkill,
} from '@/lib/phonics'
import { loadPhonicsChecks, savePhonicsCheck, deletePhonicsCheck } from '@/lib/phonicsData'
import { useAlphabetSkips, setAlphabetSkip, phonicsClassKey } from '@/lib/phonicsClassSettings'
import { phonicsSheetsHtml, printWordSheet } from '@/lib/phonicsPrint'
import { BAND_TONE, BAND_CHIP, BAND_TEXT, BAND_DOT, BAND_RANGE, MARK_TILE, MARK_SOLID, MARK_LABEL, fmtShort } from '@/components/reading/phonicsTones'
import PhonicsCellDetail from '@/components/reading/PhonicsCellDetail'
import StudentProgressGrid from '@/components/reading/PhonicsProgress'
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, ExternalLink, Loader2, Minus, Pencil, Printer, RotateCcw, Trash2, X } from 'lucide-react'

// ─── Phonics quick checks ────────────────────────────────────────
// Reading → Phonics. Three faces: the heat map (every student in the class
// against every sheet of the Phonics Quick Checks packet, coloured by their
// latest check), one student's progress (sheets × attempts, every sitting
// kept), and the check screen (one student, the sheets the teacher picked, a
// tile per word to tap as the student reads from the printed sheet).
// Nothing is graded. A class that skips the alphabet sheets sees the twenty
// decoding sheets only, everywhere on this screen.

type Lang = 'en' | 'ko'
type Mode = 'heatmap' | 'student' | 'assess'
type Marks = Record<string, Record<string, PhonicsMark>>
type Heard = Record<string, Record<string, string>>
type Observations = Record<string, string[]>

export const SKILLS_STORAGE_KEY = 'daewoo_phonics_skills'
const BANDS: PhonicsBand[] = ['mastered', 'developing', 'beginning']

export default function PhonicsView({ students, loading, lang, grade, englishClass, initialStudentId, initialMode }: {
  students: Student[]; loading: boolean; lang: Lang; grade: number; englishClass: string; initialStudentId?: string | null
  /** With initialStudentId: open on their progress rather than the check screen. */
  initialMode?: 'student' | 'assess'
}) {
  const { confirmDialog, showToast } = useApp()
  const { skips, loaded: skipsLoaded } = useAlphabetSkips()
  const skipAlphabet = skips.has(phonicsClassKey(grade, englishClass))
  const sheets = useMemo(() => classSkills(skipAlphabet), [skipAlphabet])
  const [mode, setMode] = useState<Mode>(initialStudentId ? (initialMode || 'assess') : 'heatmap')
  const [studentId, setStudentId] = useState<string | null>(initialStudentId || null)
  const [checks, setChecks] = useState<PhonicsCheckRow[]>([])
  const [loadingChecks, setLoadingChecks] = useState(true)
  const [editing, setEditing] = useState<PhonicsCheckRow | null>(null)
  const [dirty, setDirty] = useState(false)
  const [open, setOpen] = useState<{ sid: string; skill: string; checkId?: string } | null>(null)
  // The sheets ticked for the next check. Remembered: a teacher checking a
  // class on digraphs does not re-tick them fifteen times.
  const [selected, setSelected] = useState<string[]>(() => {
    try { const s = JSON.parse(localStorage.getItem(SKILLS_STORAGE_KEY) || '[]'); return Array.isArray(s) ? orderSkills(s) : [] } catch { return [] }
  })
  // Missed before: the next check reads only the words each student missed
  // last time. Kept across students so a class can be run through it.
  const [recheck, setRecheck] = useState(false)
  const pickSkills = useCallback((ids: string[]) => {
    const next = orderSkills(ids)
    setSelected(next)
    try { localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(next)) } catch {}
  }, [])

  const reload = useCallback(async () => {
    if (students.length === 0) { setChecks([]); setLoadingChecks(false); return }
    setLoadingChecks(true)
    const rows = await loadPhonicsChecks(students.map(s => s.id))
    setChecks(rows)
    setLoadingChecks(false)
  }, [students])
  useEffect(() => { reload() }, [reload])

  const byStudent = useMemo(() => {
    const by: Record<string, PhonicsCheckRow[]> = {}
    students.forEach(s => { by[s.id] = [] })
    checks.forEach(c => { (by[c.student_id] ||= []).push(c) })
    return by
  }, [checks, students])
  const latestByStudent = useMemo(() => Object.fromEntries(students.map(s => {
    const l = latestBySkill(byStudent[s.id] || [])
    return [s.id, skipAlphabet ? withoutAlphabet(l) : l]
  })) as Record<string, LatestBySkill>, [students, byStudent, skipAlphabet])
  // Change since the previous attempt, per student and sheet, for the heat map's arrows.
  const trendByStudent = useMemo(() => Object.fromEntries(students.map(s => {
    const att = attemptsBySkill(byStudent[s.id] || [])
    return [s.id, Object.fromEntries(Object.keys(att).map(k => [k, latestDelta(att[k])]))]
  })) as Record<string, Record<string, number | null>>, [students, byStudent])

  const student = students.find(s => s.id === studentId) || null

  const guardedSwitch = async (next: () => void) => {
    if (dirty) {
      const ok = await confirmDialog({ title: lang === 'ko' ? '저장하지 않은 표시가 있습니다' : 'Unsaved marks', message: lang === 'ko' ? '이 학생의 표시를 저장하지 않고 이동할까요?' : 'Leave this student without saving the marks you made?', confirmLabel: lang === 'ko' ? '이동' : 'Leave', danger: true })
      if (!ok) return
    }
    setDirty(false)
    next()
  }

  const startCheck = (sid: string, skills?: string[], edit?: PhonicsCheckRow) => guardedSwitch(() => {
    setStudentId(sid)
    setEditing(edit || null)
    if (skills) pickSkills(skills)
    setOpen(null)
    setMode('assess')
  })
  const showStudent = (sid: string) => guardedSwitch(() => { setStudentId(sid); setEditing(null); setOpen(null); setMode('student') })

  const nextStudent = (dir: 1 | -1) => {
    if (!student) return
    const i = students.findIndex(s => s.id === student.id)
    const n = students[i + dir]
    if (n) { setStudentId(n.id); setEditing(null) }
  }

  // The student sheets, one a page, in large type: the packet's word sheets,
  // or the four alphabet sheets with their four rows (phonicsPrint.ts).
  const printSheets = (which: 'letters' | 'words') => {
    const pw = window.open('', '_blank'); if (!pw) return
    const list = sheets.filter(s => isAlphabetSkill(s.id) === (which === 'letters'))
    pw.document.write(phonicsSheetsHtml(list, which === 'letters' ? 'Phonics quick checks: letter sheets' : 'Phonics quick checks: word sheets'))
    pw.document.close(); pw.print()
    logActivity('printed', which === 'letters' ? 'Phonics quick check letter sheets' : 'Phonics quick check word sheets', { path: '/reading' })
  }

  const toggleAlphabet = async () => {
    const skip = !skipAlphabet
    if (skip) {
      const ok = await confirmDialog({
        title: lang === 'ko' ? '알파벳 시트 건너뛰기' : `Skip the alphabet sheets for ${englishClass}?`,
        message: lang === 'ko'
          ? `${grade}학년 ${englishClass}반의 히트맵, 시트 선택, 인쇄, CSV, 학생 페이지에서 알파벳 이름·소리 시트가 빠집니다. 모든 교사에게 적용됩니다. 저장된 결과는 지워지지 않고, 다시 켜면 돌아옵니다.`
          : `Letter names and letter sounds leave Grade ${grade} ${englishClass}'s heat map, sheet picker, printing, CSV and student pages, for every teacher. Results already saved are kept and come back if you switch them on again.`,
        confirmLabel: lang === 'ko' ? '건너뛰기' : 'Skip them',
      })
      if (!ok) return
    }
    const err = await setAlphabetSkip(grade, englishClass, skip)
    if (err) showToast(`Error: ${err}`)
  }

  const exportCsv = () => {
    exportToCSV(`phonics-${englishClass}-G${grade}`,
      ['Student', 'Korean name', ...sheets.map(s => s.short), 'Working on', 'Last check'],
      students.map(s => {
        const latest = latestByStudent[s.id] || {}
        const sum = summarizeStudent(latest)
        return [s.english_name, s.korean_name, ...sheets.map(sk => latest[sk.id] ? scoreText(latest[sk.id].score) : ''), sum.frontier ? phonicsSkill(sum.frontier)?.label || '' : '', sum.lastDate || '']
      }))
  }

  const seg = (on: boolean) => `px-3 h-8 rounded text-[length:calc(12.5px*var(--ts))] font-medium ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`
  const lastDates = useMemo(() => Object.fromEntries(students.map(s => [s.id, summarizeStudent(latestByStudent[s.id] || {}).lastDate])) as Record<string, string | null>, [students, latestByStudent])

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="inline-flex p-0.5 rounded border border-rule-2 bg-surface" data-guide="reading.phonics.mode">
          <button onClick={() => guardedSwitch(() => { setMode('heatmap'); setEditing(null) })} className={seg(mode === 'heatmap')}>{lang === 'ko' ? '반 히트맵' : 'Class heat map'}</button>
          <button onClick={() => { if (!studentId && students[0]) setStudentId(students[0].id); guardedSwitch(() => { setMode('student'); setEditing(null) }) }} className={seg(mode === 'student')}>{lang === 'ko' ? '학생 진전' : 'Student progress'}</button>
          <button onClick={() => { if (!studentId && students[0]) setStudentId(students[0].id); setMode('assess') }} className={seg(mode === 'assess')}>{lang === 'ko' ? '학생 점검' : 'Check a student'}</button>
        </div>
        <span className="text-[length:calc(12px*var(--ts))] text-ink-3">{lang === 'ko' ? '해독만 평가합니다. 뜻은 묻지 않습니다. 성적에 들어가지 않습니다.' : 'Decoding only, meaning never asked, nothing graded.'}</span>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={toggleAlphabet} disabled={!skipsLoaded} className="inline-flex items-center gap-1.5 text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink disabled:opacity-40" data-guide="reading.phonics.alphabet"
            title={skipAlphabet
              ? (lang === 'ko' ? '이 반은 알파벳 시트를 건너뜁니다. 클릭하면 다시 켭니다.' : `${englishClass} skips the letter names and letter sounds sheets. Click to use them again.`)
              : (lang === 'ko' ? '알파벳 이름·소리 시트를 사용 중입니다. 클릭하면 이 반은 건너뜁니다.' : `${englishClass} uses the letter names and letter sounds sheets. Click to skip them for this class.`)}>
            <span className={`w-3 h-3 rounded-sm border inline-flex items-center justify-center ${skipAlphabet ? 'border-rule-2 bg-surface' : 'bg-ink border-ink text-paper'}`}>{!skipAlphabet && <Check size={9} strokeWidth={3} />}</span>
            {lang === 'ko' ? '알파벳 시트' : 'Alphabet sheets'}
          </button>
          <button onClick={exportCsv} className="inline-flex items-center gap-1 text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink"><Download size={11} /> CSV</button>
          {!skipAlphabet && <button onClick={() => printSheets('letters')} className="inline-flex items-center gap-1 text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink" title={lang === 'ko' ? '알파벳 이름·소리 시트 인쇄 (PDF로 저장 가능)' : 'Print letter names and letter sounds, one a page in four rows, for the student to read from. Save as PDF from the print dialog.'}><Printer size={11} /> {lang === 'ko' ? '알파벳 시트' : 'Letter sheets'}</button>}
          <button onClick={() => printSheets('words')} className="inline-flex items-center gap-1 text-[length:calc(12px*var(--ts))] text-ink-3 hover:text-ink" title={lang === 'ko' ? '학생용 단어 시트 인쇄 (PDF로 저장 가능)' : 'Print the twenty word sheets in large type, one a page, for the student to read from. Save as PDF from the print dialog.'}><Printer size={11} /> {lang === 'ko' ? '단어 시트' : 'Word sheets'}</button>
        </div>
      </div>

      {loading || loadingChecks || !skipsLoaded ? <Loading rows={5} />
      : students.length === 0 ? <p className="text-[length:calc(13px*var(--ts))] text-ink-3 py-8">{lang === 'ko' ? '이 반에 학생이 없습니다.' : 'No students in this class.'}</p>
      : mode === 'heatmap' ? (
        <HeatMap skills={sheets} students={students} latestByStudent={latestByStudent} trendByStudent={trendByStudent} lang={lang}
          onCell={(sid, skill) => setOpen({ sid, skill })} onCheck={(sid) => startCheck(sid)} onStudent={showStudent} />
      ) : !student ? null : mode === 'student' ? (
        <div className="grid grid-cols-[210px_1fr] gap-6 items-start">
          <RosterRail students={students} currentId={student.id} lang={lang} lastDates={lastDates} onPick={showStudent} />
          <section className="min-w-0">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
              <div>
                <p className="eyebrow eyebrow-accent mb-1">{lang === 'ko' ? '시도별 진전' : 'Progress across attempts'}</p>
                <h2 className="font-display text-[length:calc(28px*var(--ts))] leading-none text-ink">{student.english_name} <span className="text-ink-3 text-[length:calc(18px*var(--ts))]">{student.korean_name}</span></h2>
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/students/${student.id}`} className="h-8 px-3 rounded border border-rule-2 text-[length:calc(12.5px*var(--ts))] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><ExternalLink size={12} /> {lang === 'ko' ? '학생 페이지' : 'Student page'}</Link>
                <button onClick={() => startCheck(student.id)} className="h-8 px-3.5 rounded bg-accent text-white text-[length:calc(12.5px*var(--ts))] font-semibold hover:bg-accent-hover inline-flex items-center gap-1.5"><ClipboardCheck size={13} /> {lang === 'ko' ? '점검하기' : 'Check now'}</button>
              </div>
            </div>
            <StudentProgressGrid student={student} checks={byStudent[student.id] || []} lang={lang} onCell={(skill, checkId) => setOpen({ sid: student.id, skill, checkId })} />
          </section>
        </div>
      ) : (
        <AssessPanel key={`${student.id}:${editing?.id || 'new'}`} sheets={sheets} student={student} students={students} lang={lang}
          latest={latestByStudent[student.id] || {}} history={byStudent[student.id] || []} lastDates={lastDates}
          selected={selected} onSelect={(ids) => { setRecheck(false); pickSkills(ids) }} editing={editing}
          recheck={recheck && !editing} onRecheck={setRecheck}
          onDirty={setDirty} onPick={(sid) => guardedSwitch(() => { setStudentId(sid); setEditing(null) })}
          onPrev={() => guardedSwitch(() => nextStudent(-1))} onNext={() => guardedSwitch(() => nextStudent(1))}
          onCancelEdit={() => { setEditing(null); setDirty(false) }}
          onSaved={async (andNext) => { setDirty(false); setEditing(null); await reload(); if (andNext) nextStudent(1) }}
          onEdit={(c) => startCheck(student.id, c.skills, c)}
          onProgress={() => showStudent(student.id)}
          onDelete={async (c) => {
            const ok = await confirmDialog({ title: lang === 'ko' ? '점검 기록 삭제' : 'Delete this check?', message: lang === 'ko' ? `${c.date}의 파닉스 점검을 삭제합니다. 되돌릴 수 없습니다.` : `The phonics check from ${c.date} will be deleted. This cannot be undone.`, confirmLabel: lang === 'ko' ? '삭제' : 'Delete', danger: true })
            if (!ok) return
            await deletePhonicsCheck(c.id, student.english_name); await reload()
          }} />
      )}

      {open && (() => {
        const s = students.find(x => x.id === open.sid)
        return s ? (
          <PhonicsCellDetail student={s} skill={open.skill} checks={byStudent[s.id] || []} lang={lang} initialCheckId={open.checkId} onClose={() => setOpen(null)}
            onRecheck={() => startCheck(open.sid, [open.skill])}
            onEdit={(c) => startCheck(open.sid, c.skills, c)} />
        ) : null
      })()}
    </div>
  )
}

// ─── Roster rail ─────────────────────────────────────────────────

function RosterRail({ students, currentId, lang, lastDates, onPick }: {
  students: Student[]; currentId: string; lang: Lang; lastDates: Record<string, string | null>; onPick: (sid: string) => void
}) {
  return (
    <aside className="sticky top-[120px] border border-rule-2 rounded-md bg-surface max-h-[calc(100vh-160px)] overflow-y-auto">
      <p className="eyebrow px-3 pt-2.5 pb-1.5">{lang === 'ko' ? '학생' : 'Students'}</p>
      <ul className="divide-y divide-rule">
        {students.map(s => {
          const own = s.id === currentId
          const last = lastDates[s.id]
          return (
            <li key={s.id}>
              <button onClick={() => !own && onPick(s.id)} className={`w-full text-left px-3 py-1.5 ${own ? 'bg-paper-2 shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-paper-2/60'}`}>
                <span className={`block text-[length:calc(12.5px*var(--ts))] truncate ${own ? 'text-ink font-semibold' : 'text-ink-2'}`}>{s.english_name}</span>
                <span className="block text-[length:calc(10.5px*var(--ts))] text-ink-3 truncate">{s.korean_name}{last ? ` · ${fmtShort(last, lang)}` : ''}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}

// ─── Heat map ────────────────────────────────────────────────────

export function HeatMap({ skills, students, latestByStudent, trendByStudent, lang, onCell, onCheck, onStudent }: {
  /** The class's sheets: every one, or the twenty when it skips the alphabet. */
  skills: PhonicsSkill[]
  students: Student[]; latestByStudent: Record<string, LatestBySkill>; trendByStudent: Record<string, Record<string, number | null>>; lang: Lang
  onCell: (sid: string, skill: string) => void; onCheck: (sid: string) => void; onStudent: (sid: string) => void
}) {
  const colAvg = useMemo(() => Object.fromEntries(skills.map(sk => sk.id).map(id => {
    const ps = students.map(s => latestByStudent[s.id]?.[id]?.score.pct).filter((p): p is number => p != null)
    return [id, ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null]
  })), [skills, students, latestByStudent])
  const anyData = students.some(s => Object.keys(latestByStudent[s.id] || {}).length > 0)

  return (
    <div>
      <div className="flex gap-4 text-[length:calc(11.5px*var(--ts))] text-ink-2 mb-3 flex-wrap">
        {BANDS.map(b => (
          <span key={b} className="inline-flex items-center gap-1.5" title={PHONICS_BAND_LABELS[b].means}>
            <span className={`w-3 h-3 rounded-sm ${BAND_TONE[b]} ${b !== 'mastered' ? 'border border-rule-2' : ''}`} />
            {PHONICS_BAND_LABELS[b][lang]} {BAND_RANGE[b]}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-paper-2 border border-rule" />{lang === 'ko' ? '미점검' : 'Not checked'}</span>
        <span className="text-ink-3">{lang === 'ko' ? '· 셀은 가장 최근 점검의 정확도(%)이고 화살표는 이전 시도 대비 변화입니다. 클릭하면 단어별로 보입니다. 이름을 클릭하면 시도별 진전이 보입니다.' : '· a cell is the latest check’s accuracy, the arrow its change since the attempt before; click it for the words, click a name for progress'}</span>
      </div>
      {!anyData && <p className="text-[length:calc(13px*var(--ts))] text-ink-3 mb-3">{lang === 'ko' ? '아직 이 반에는 파닉스 점검이 없습니다. 학생 옆의 점검 버튼으로 시작하세요.' : 'No phonics checks for this class yet. Use the check button beside a student to start.'}</p>}
      {/* Fills the page width with no scrolling: the sheet columns
          share what is left after the name and working-on columns, and the
          sheet names run vertically so a column can be narrow. */}
      <div className="border border-rule-2 rounded-md overflow-hidden">
        <table className="w-full table-fixed text-[length:calc(12px*var(--ts))] tabular-nums border-collapse">
          <colgroup>
            <col style={{ width: 168 }} />
            {skills.map(s => <col key={s.id} />)}
            <col style={{ width: 148 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="bg-paper-2">
              <th rowSpan={2} className="text-left px-3 py-2 eyebrow font-semibold border-b border-r border-rule-2 align-bottom">{lang === 'ko' ? '학생' : 'Student'}</th>
              {groupsFor(skills).map(({ group: g, skills: gs }) => <th key={g.id} colSpan={gs.length} className="px-1 pt-2 pb-1 eyebrow font-semibold border-b border-l border-rule text-center whitespace-nowrap overflow-hidden text-ellipsis">{lang === 'ko' ? g.label_ko : g.label}</th>)}
              <th rowSpan={2} className="px-3 py-2 border-b border-l border-rule-2 eyebrow font-semibold text-left align-bottom">{lang === 'ko' ? '현재 과제' : 'Working on'}</th>
              <th rowSpan={2} className="border-b border-rule-2" />
            </tr>
            <tr className="bg-paper-2">
              {skills.map((s, i) => (
                <th key={s.id} className={`px-0 pb-1.5 border-b border-rule-2 align-bottom h-[104px] ${i > 0 && skills[i - 1].group !== s.group ? 'border-l border-rule' : ''}`} title={`${s.label}\n${s.covers}`}>
                  <div className="flex flex-col items-center justify-end gap-1 h-full">
                    <span className="text-[length:calc(10.5px*var(--ts))] font-semibold text-ink-2 whitespace-nowrap leading-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{s.short}</span>
                    <span className={`text-[length:calc(10px*var(--ts))] leading-none ${colAvg[s.id] != null && colAvg[s.id]! < 70 ? 'text-bad font-semibold' : 'text-ink-3'}`}>{colAvg[s.id] != null ? `${colAvg[s.id]}%` : ' '}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {students.map(s => {
              const latest = latestByStudent[s.id] || {}
              const trend = trendByStudent[s.id] || {}
              const sum = summarizeStudent(latest)
              return (
                <tr key={s.id}>
                  <td className="px-3 py-1 border-r border-rule-2 overflow-hidden">
                    <button onClick={() => onStudent(s.id)} className="block w-full text-left truncate hover:underline" title={lang === 'ko' ? '시도별 진전 보기' : `Progress for ${s.english_name}`}>
                      <span className="text-ink">{getDisplayName(s)}</span><span className="text-ink-3 ml-1.5 text-[length:calc(11px*var(--ts))]">{s.korean_name}</span>
                    </button>
                  </td>
                  {skills.map((sk, i) => {
                    const l = latest[sk.id]
                    const band = l ? phonicsBand(l.score) : null
                    const d = trend[sk.id]
                    return (
                      <td key={sk.id} className={`p-[3px] ${i > 0 && skills[i - 1].group !== sk.group ? 'border-l border-rule' : ''}`}>
                        <button onClick={() => l && onCell(s.id, sk.id)} disabled={!l}
                          title={l ? `${sk.label}: ${scoreText(l.score)} · ${PHONICS_BAND_LABELS[band!].en} · ${fmtShort(l.date, lang)}${d != null ? ` · ${d >= 0 ? '+' : ''}${d} since the attempt before` : ''}${l.score.unread ? ` · ${l.score.unread} ${lang === 'ko' ? '미읽음' : 'not read'}` : ''}` : `${sk.label}: ${lang === 'ko' ? '미점검' : 'not checked'}`}
                          className={`w-full h-7 rounded-sm text-[length:calc(10.5px*var(--ts))] font-semibold inline-flex items-center justify-center gap-px ${band ? BAND_TONE[band] : 'bg-paper-2/60 text-ink-3/40'}`}>
                          {l ? l.score.pct : '·'}{d != null && d > 0 && <ArrowUp size={9} strokeWidth={3} />}{d != null && d < 0 && <ArrowDown size={9} strokeWidth={3} />}
                        </button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-1 border-l border-rule-2 text-[length:calc(11px*var(--ts))] leading-tight overflow-hidden">
                    {sum.tested === 0 ? <span className="text-ink-3">—</span>
                      : sum.frontier ? <span className="block text-ink truncate" title={phonicsSkill(sum.frontier)?.label}>{phonicsSkill(sum.frontier)?.label}</span>
                      : <span className="block text-good truncate">{lang === 'ko' ? '모두 완성' : 'All mastered'}</span>}
                    {sum.lastDate && <span className="block text-[length:calc(10px*var(--ts))] text-ink-3">{fmtShort(sum.lastDate, lang)}</span>}
                  </td>
                  <td className="py-1 text-center"><button onClick={() => onCheck(s.id)} title={lang === 'ko' ? '이 학생 점검' : `Check ${s.english_name}`} aria-label={`Check ${s.english_name}`} className="w-7 h-7 inline-flex items-center justify-center rounded border border-rule-2 text-ink-2 hover:text-ink hover:border-ink-3"><ClipboardCheck size={13} /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Checking one student ────────────────────────────────────────

function AssessPanel({ sheets, student, students, lang, latest, history, lastDates, selected, onSelect, editing, recheck, onRecheck, onDirty, onPick, onPrev, onNext, onCancelEdit, onSaved, onEdit, onDelete, onProgress }: {
  /** The class's sheets: the picker offers only these. */
  sheets: PhonicsSkill[]
  student: Student; students: Student[]; lang: Lang; latest: LatestBySkill; history: PhonicsCheckRow[]; lastDates: Record<string, string | null>
  selected: string[]; onSelect: (ids: string[]) => void; editing: PhonicsCheckRow | null
  /** Missed before: only the words missed on the latest result of each sheet. */
  recheck: boolean; onRecheck: (on: boolean) => void
  onDirty: (d: boolean) => void; onPick: (sid: string) => void; onPrev: () => void; onNext: () => void
  onCancelEdit: () => void; onSaved: (andNext: boolean) => Promise<void>; onEdit: (c: PhonicsCheckRow) => void; onDelete: (c: PhonicsCheckRow) => void; onProgress: () => void
}) {
  const { currentTeacher, showToast, promptDialog } = useApp()
  const missed = useMemo(() => missedBefore(latest, history, sheets), [latest, history, sheets])
  const missedTotal = missed.reduce((n, m) => n + m.words.length, 0)
  const checkById = useMemo(() => Object.fromEntries(history.map(c => [c.id, c])) as Record<string, PhonicsCheckRow>, [history])
  // A recheck starts with last time's boxes ticked, to untick what is fixed.
  const carriedTicks = (): Observations => Object.fromEntries(missed.map(m => [m.sheet, checkById[m.fromCheckId]?.observations?.[m.sheet] || []]))
  const [date, setDate] = useState(editing?.date || getKSTDateString())
  const [marks, setMarks] = useState<Marks>(editing?.results || {})
  const [heard, setHeard] = useState<Heard>(editing?.heard || {})
  const [observations, setObservations] = useState<Observations>(() => editing?.observations || (recheck ? carriedTicks() : {}))
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const visible = sheets.map(s => s.id)
  // Remembered picks can hold sheets this class does not use (the alphabet,
  // ticked in another class): they are left out here. A saved check keeps its own.
  // The sheets of a saved check, editable while it is open.
  const [editSkills, setEditSkills] = useState<string[]>(editing ? orderSkills(editing.skills) : [])
  // Sheets taken out for this student only (the student went home, the bell
  // rang): they stay ticked for the next student.
  const [dropped, setDropped] = useState<string[]>([])
  const base = editing ? editSkills : selected.filter(id => visible.includes(id))
  const skills = recheck ? missed.map(m => m.sheet) : base.filter(id => !dropped.includes(id))
  const idx = students.findIndex(s => s.id === student.id)
  const touch = (fn: () => void) => { fn(); onDirty(true) }

  const setSkills = (ids: string[]) => touch(() => editing ? setEditSkills(orderSkills(ids)) : onSelect(ids))
  /** The quick picks (All, None…): a fresh set, nothing held back. */
  const pickSkills = (ids: string[]) => {
    if (recheck) { setMarks({}); setHeard({}); setObservations({}) }
    setDropped([]); setSkills(ids)
  }
  const toggleRecheck = () => {
    const on = !recheck
    setMarks({}); setHeard({}); setObservations(on ? carriedTicks() : {})
    onRecheck(on)
  }
  const recheckWords = (id: string) => missed.find(m => m.sheet === id)?.words || []
  const sheetWords = (id: string) => recheck ? recheckWords(id) : phonicsSkill(id)?.words || []
  const toggleSkill = (id: string) => {
    if (skills.includes(id)) { setSkills(base.filter(s => s !== id)); return }
    setDropped(d => d.filter(x => x !== id))
    setSkills(base.includes(id) ? base : [...base, id])
  }
  const takeOut = (id: string) => touch(() => setDropped(d => d.includes(id) ? d : [...d, id]))
  const tap = (skill: string, word: string) => touch(() => setMarks(m => {
    const cur = { ...(m[skill] || {}) }
    const nxt = nextMark(cur[word])
    if (nxt) cur[word] = nxt; else delete cur[word]
    return { ...m, [skill]: cur }
  }))
  const fill = (skill: string, how: 'all' | 'rest' | 'clear') => touch(() => setMarks(m => {
    const words = sheetWords(skill)
    if (how === 'clear') return { ...m, [skill]: {} }
    const cur = { ...(m[skill] || {}) }
    words.forEach(w => { if (how === 'all' || !cur[w]) cur[w] = 'correct' })
    return { ...m, [skill]: cur }
  }))
  // The packet: "if a student reads a word incorrectly, write what they read next to the word."
  const askHeard = async (skill: string, word: string) => {
    const said = await promptDialog({ title: lang === 'ko' ? `“${word}”를 뭐라고 읽었나요?` : `What did they say for “${word}”?`, message: lang === 'ko' ? '들은 대로 적으세요. 예: "h-a-t", "hut", 건너뜀.' : 'Write it the way you heard it: "h-a-t", "hut", skipped…', placeholder: lang === 'ko' ? '들은 것' : 'What they read', defaultValue: heard[skill]?.[word] || '' })
    if (said === null) return
    touch(() => setHeard(h => ({ ...h, [skill]: { ...(h[skill] || {}), [word]: said } })))
  }
  const toggleObs = (skill: string, id: string) => touch(() => setObservations(o => {
    const cur = o[skill] || []
    return { ...o, [skill]: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] }
  }))

  const totals = skills.reduce((acc, id) => {
    const words = sheetWords(id)
    const ms = marks[id] || {}
    words.forEach(w => { if (ms[w] === 'correct') acc.correct++; else if (ms[w] === 'partial') acc.partial++; else if (ms[w] === 'error') acc.errors++; acc.total++ })
    return acc
  }, { correct: 0, partial: 0, errors: 0, total: 0 })
  const marked = totals.correct + totals.partial + totals.errors
  const nothingMarked = marked === 0

  const save = async (andNext: boolean) => {
    if (skills.length === 0) { showToast(lang === 'ko' ? '점검할 시트를 하나 이상 고르세요.' : 'Pick at least one sheet to check.'); return }
    if (nothingMarked) { showToast(lang === 'ko' ? '단어를 하나도 표시하지 않았습니다.' : 'No words are marked yet.'); return }
    setSaving(true)
    const input = recheck ? foldRecheck() : { skills, results: marks, heard, observations }
    const { error } = await savePhonicsCheck({ student_id: student.id, date, assessed_by: currentTeacher?.id || null, ...input, notes }, editing?.id, student.english_name)
    setSaving(false)
    if (error) { showToast(`Error: ${error}`); return }
    // A sheet with nothing marked is not saved: not started is not a 0.
    const empty = recheck ? 0 : skills.filter(id => Object.keys(marks[id] || {}).length === 0).length
    const left = empty ? (lang === 'ko' ? ` · 표시 없는 시트 ${empty}개 제외` : ` · ${empty} ${empty === 1 ? 'sheet' : 'sheets'} with nothing marked left out`) : ''
    showToast((editing ? (lang === 'ko' ? '점검 수정됨' : `Check updated for ${student.english_name}`) : (lang === 'ko' ? '파닉스 점검 저장됨' : `Phonics check saved for ${student.english_name}`)) + left)
    setMarks({}); setHeard({}); setObservations({}); setNotes('')
    await onSaved(andNext)
  }

  // A recheck saved as whole sheets: last time's marks with the words read
  // again replaced. Only sheets with a word marked are saved; the boxes are
  // kept only where something is still missed.
  function foldRecheck() {
    const out = { skills: [] as string[], results: {} as Marks, heard: {} as Heard, observations: {} as Observations, carried: {} as Record<string, CarriedSheet> }
    missed.forEach(m => {
      const now = marks[m.sheet] || {}
      const read = Object.keys(now)
      if (read.length === 0) return
      const before = checkById[m.fromCheckId]
      const merged = { ...(before?.results?.[m.sheet] || {}), ...now }
      const keptHeard = Object.fromEntries(Object.entries(before?.heard?.[m.sheet] || {}).filter(([w]) => !read.includes(w)))
      out.skills.push(m.sheet)
      out.results[m.sheet] = merged
      out.heard[m.sheet] = { ...keptHeard, ...(heard[m.sheet] || {}) }
      out.observations[m.sheet] = Object.values(merged).some(isMiss) ? observations[m.sheet] || [] : []
      out.carried[m.sheet] = { from: m.fromCheckId, date: m.fromDate, rechecked: read }
    })
    return out
  }
  const printMissed = () => {
    const ok = printWordSheet(`${student.english_name} · ${lang === 'ko' ? '다시 읽기' : 'words to read again'}`,
      missed.map(m => { const sk = phonicsSkill(m.sheet); return { label: sk?.label || m.sheet, words: m.words, columns: sk?.sections ? 8 : 4 } }),
      `Phonics missed words: ${student.english_name}`)
    if (!ok) showToast(lang === 'ko' ? '팝업이 차단되었습니다.' : 'The print window was blocked.')
  }

  const recheckable = notYetSecure(latest).filter(id => visible.includes(id))
  const untested = visible.filter(id => !latest[id])
  const quick = 'h-7 px-2.5 rounded-full border border-rule-2 text-[length:calc(11.5px*var(--ts))] text-ink-2 hover:text-ink hover:border-ink-3 disabled:opacity-40'

  return (
    <div className="grid grid-cols-[210px_1fr] gap-6 items-start">
      <RosterRail students={students} currentId={student.id} lang={lang} lastDates={lastDates} onPick={onPick} />

      <section className="min-w-0">
        {/* Student header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="eyebrow eyebrow-accent mb-1">{editing ? (lang === 'ko' ? `${editing.date} 점검 수정 중` : `Editing the check from ${editing.date}`) : (lang === 'ko' ? '파닉스 점검' : 'Phonics quick check')}</p>
            <h2 className="font-display text-[length:calc(28px*var(--ts))] leading-none text-ink">{student.english_name} <span className="text-ink-3 text-[length:calc(18px*var(--ts))]">{student.korean_name}</span></h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="grid gap-0.5"><span className="eyebrow">{lang === 'ko' ? '날짜' : 'Date'}</span><input type="date" value={date} onChange={e => touch(() => setDate(e.target.value))} className="h-8 px-2 bg-surface border border-rule-2 rounded text-[length:calc(13px*var(--ts))] text-ink" /></label>
            <div className="inline-flex border border-rule-2 rounded overflow-hidden ml-2">
              <button onClick={onPrev} disabled={idx <= 0} className="h-8 w-8 flex items-center justify-center text-ink-2 hover:bg-paper-2 disabled:opacity-30" aria-label="Previous student"><ChevronLeft size={15} /></button>
              <button onClick={onNext} disabled={idx >= students.length - 1} className="h-8 w-8 flex items-center justify-center text-ink-2 hover:bg-paper-2 border-l border-rule-2 disabled:opacity-30" aria-label="Next student"><ChevronRight size={15} /></button>
            </div>
          </div>
        </div>

        {/* What we know already */}
        {history.length > 0 && !editing && (
          <div className="mb-4 border border-rule-2 rounded-md bg-paper-2/50 px-4 py-3">
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <p className="eyebrow">{lang === 'ko' ? '지금까지' : 'So far'}</p>
              {(() => { const sum = summarizeStudent(latest); return <p className="text-[length:calc(12px*var(--ts))] text-ink-2">{sum.frontier ? <>{lang === 'ko' ? '현재 과제: ' : 'Working on: '}<b className="text-ink">{phonicsSkill(sum.frontier)?.label}</b></> : (lang === 'ko' ? '점검한 시트 모두 완성' : 'Every checked sheet mastered')}</p> })()}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {orderSkills(Object.keys(latest)).map(id => { const l = latest[id]; const b = phonicsBand(l.score); return (
                <span key={id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[length:calc(11.5px*var(--ts))] tabular-nums ${BAND_CHIP[b]}`} title={`${phonicsSkill(id)?.label} · ${PHONICS_BAND_LABELS[b].en} · ${fmtShort(l.date, lang)}`}>{phonicsSkill(id)?.short} {scoreText(l.score)}</span>
              ) })}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[length:calc(11.5px*var(--ts))]">
              <button onClick={onProgress} className="text-accent hover:underline">{lang === 'ko' ? '시도별 진전 보기 →' : 'Progress across attempts →'}</button>
              <details className="min-w-0">
                <summary className="text-ink-3 cursor-pointer hover:text-ink">{history.length} {lang === 'ko' ? '회 점검' : history.length === 1 ? 'check' : 'checks'}</summary>
                <ul className="mt-1.5 divide-y divide-rule">
                  {history.map(c => (
                    <li key={c.id} className="py-1.5 flex items-center gap-3 text-[length:calc(12px*var(--ts))]">
                      <span className="text-ink-2 w-20 shrink-0">{fmtShort(c.date, lang)}</span>
                      <span className="flex-1 min-w-0 text-ink-3 truncate">{scoreCheck(c).map(s => `${phonicsSkill(s.skill)?.short} ${scoreText(s)}`).join(' · ')}</span>
                      <button onClick={() => onEdit(c)} className="text-ink-3 hover:text-ink" title={lang === 'ko' ? '수정' : 'Edit'}><Pencil size={12} /></button>
                      <button onClick={() => onDelete(c)} className="text-ink-3 hover:text-bad" title={lang === 'ko' ? '삭제' : 'Delete'}><Trash2 size={12} /></button>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          </div>
        )}

        {/* Sheet picker */}
        <div className="mb-5" data-guide="reading.phonics.skills">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="eyebrow">{lang === 'ko' ? '점검할 시트' : 'Sheets to check'}</p>
            {!editing && <>
              <button onClick={() => pickSkills(visible)} className={quick}>{lang === 'ko' ? '전체' : 'All'}</button>
              <button onClick={() => pickSkills([])} className={quick}>{lang === 'ko' ? '없음' : 'None'}</button>
              <button onClick={() => pickSkills(recheckable)} disabled={recheckable.length === 0} className={quick}>{lang === 'ko' ? '아직 미완성' : 'Not yet mastered'} ({recheckable.length})</button>
              <button onClick={() => pickSkills(untested)} disabled={untested.length === 0} className={quick}>{lang === 'ko' ? '미점검' : 'Not checked yet'} ({untested.length})</button>
              <button onClick={toggleRecheck} disabled={!recheck && missedTotal === 0} aria-pressed={recheck} title={lang === 'ko' ? '최근 점검에서 틀린 단어만 다시 읽기' : 'Read again only the words missed on the latest check of each sheet'}
                className={`${quick} inline-flex items-center gap-1 ${recheck ? '!bg-ink !text-paper !border-ink' : ''}`}><RotateCcw size={11} />{lang === 'ko' ? '틀린 단어 다시' : 'Missed before'} ({missedTotal})</button>
            </>}
            {editing && <span className="text-[length:calc(11.5px*var(--ts))] text-ink-3">{lang === 'ko' ? '시트를 해제하면 이 점검에서 빠지고 점수에 들어가지 않습니다.' : 'Untick a sheet to take it out of this check; it is then not scored at all.'}</span>}
          </div>
          {recheck ? (
            <p className="text-[length:calc(12px*var(--ts))] text-ink-2">{lang === 'ko'
              ? '각 시트의 최근 점검에서 틀리거나 부분 정답인 단어만 나옵니다. 다시 읽은 단어가 예전 표시를 대신하고, 나머지는 그대로 이어져 시트 점수가 새로 계산됩니다.'
              : 'Only the words missed or partly right on the latest check of each sheet. The words read again replace their old marks, the rest carry over, and each sheet is scored again.'}</p>
          ) : <div className="space-y-1.5">
            {groupsFor(sheets).map(({ group: g, skills: gs }) => (
              <div key={g.id} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[length:calc(11px*var(--ts))] text-ink-3 w-[96px] shrink-0">{lang === 'ko' ? g.label_ko : g.label}</span>
                {gs.map(s => {
                  const on = skills.includes(s.id)
                  const l = latest[s.id]
                  const b = l ? phonicsBand(l.score) : null
                  return (
                    <button key={s.id} onClick={() => toggleSkill(s.id)} title={`${s.label}\n${s.covers}${l ? `\n${lang === 'ko' ? '최근' : 'Last'}: ${scoreText(l.score)} · ${PHONICS_BAND_LABELS[b!].en} · ${fmtShort(l.date, lang)}` : ''}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[length:calc(12px*var(--ts))] font-medium disabled:cursor-default ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`}>
                      {s.short}
                      {b && <span className={`w-2 h-2 rounded-full ${BAND_DOT[b]}`} />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>}
        </div>

        {/* Word grids */}
        {recheck ? (
          missed.length === 0 ? <p className="text-[length:calc(13px*var(--ts))] text-ink-3 py-6 border-t border-rule-2">{lang === 'ko' ? '최근 점검에서 틀린 단어가 없습니다.' : 'Nothing missed on the latest checks.'}</p>
            : <RecheckCard missed={missed} history={history} checkById={checkById} marks={marks} heard={heard} observations={observations} lang={lang}
                onTap={tap} onHeard={askHeard} onObs={toggleObs} onFill={how => missed.forEach(m => fill(m.sheet, how))} onPrint={printMissed} />
        ) : skills.length === 0 ? (
          <p className="text-[length:calc(13px*var(--ts))] text-ink-3 py-6 border-t border-rule-2">{lang === 'ko' ? '위에서 시트를 고르면 단어가 여기에 나타납니다.' : 'Pick the sheets above and their words appear here.'}</p>
        ) : (
          <div className="space-y-5" data-guide="reading.phonics.words">
            {skills.map(id => (
              <SkillCard key={id} skill={id} marks={marks[id] || {}} heard={heard[id] || {}} observations={observations[id] || []} lang={lang}
                onTap={w => tap(id, w)} onHeard={w => askHeard(id, w)} onFill={how => fill(id, how)} onObs={o => toggleObs(id, o)} onTakeOut={() => takeOut(id)} />
            ))}
          </div>
        )}

        <label className="block mt-5"><span className="eyebrow">{lang === 'ko' ? '메모' : 'Notes'}</span>
          <textarea value={notes} onChange={e => touch(() => setNotes(e.target.value))} rows={2} placeholder={lang === 'ko' ? '들은 것: 어떤 소리를 혼동하는지, 어디서 멈췄는지…' : 'Anything the ticks do not capture: which sounds are confused, where they stopped, how they attacked a word…'} className="mt-1 w-full px-3 py-2 bg-surface border border-rule-2 rounded text-[length:calc(13px*var(--ts))] text-ink" />
        </label>

        {/* Save bar */}
        <div className="sticky bottom-0 mt-5 -mx-2 px-2 py-3 bg-paper/95 backdrop-blur border-t border-rule-2 flex items-center gap-3 flex-wrap">
          <span className="text-[length:calc(12.5px*var(--ts))] text-ink-2 tabular-nums">{skills.length} {lang === 'ko' ? '시트' : skills.length === 1 ? 'sheet' : 'sheets'} · <b className="text-ink">{halfText(totals.correct, totals.partial)}</b> / {totals.total} {lang === 'ko' ? '정답' : 'correct'}{totals.total - marked > 0 && <span className="text-ink-3"> · {totals.total - marked} {lang === 'ko' ? '미읽음' : 'not read'}</span>}</span>
          <div className="ml-auto flex items-center gap-2">
            {editing && <button onClick={onCancelEdit} className="h-9 px-3 rounded border border-rule-2 text-[length:calc(13px*var(--ts))] text-ink-2 hover:text-ink">{lang === 'ko' ? '수정 취소' : 'Cancel edit'}</button>}
            <button onClick={() => save(false)} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[length:calc(13px*var(--ts))] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5" data-guide="reading.phonics.save">{saving && <Loader2 size={13} className="animate-spin" />}{editing ? (lang === 'ko' ? '수정 저장' : 'Save changes') : (lang === 'ko' ? '저장' : 'Save check')}</button>
            {!editing && idx < students.length - 1 && <button onClick={() => save(true)} disabled={saving} className="h-9 px-4 rounded border border-ink text-[length:calc(13px*var(--ts))] font-semibold text-ink hover:bg-paper-2 disabled:opacity-60">{lang === 'ko' ? '저장 후 다음 학생' : 'Save and next student'}</button>}
          </div>
        </div>
      </section>
    </div>
  )
}

// One sheet's words as tiles, in the packet's four-column layout; an
// alphabet sheet as its four rows of letters, each with its own count. Tap:
// nothing → correct → error → partly → nothing. The pencil on an error or
// partly tile records what the student said; the checkboxes under the
// words are the packet's teacher-page observations.
function SkillCard({ skill, marks, heard, observations, lang, onTap, onHeard, onFill, onObs, onTakeOut }: {
  skill: string; marks: Record<string, PhonicsMark>; heard: Record<string, string>; observations: string[]; lang: Lang
  onTap: (word: string) => void; onHeard: (word: string) => void; onFill: (how: 'all' | 'rest' | 'clear') => void; onObs: (id: string) => void
  /** Not given after all: the sheet leaves this check and is not scored. */
  onTakeOut: () => void
}) {
  const sk = phonicsSkill(skill)
  if (!sk) return null
  let correct = 0, partial = 0, errors = 0
  sk.words.forEach(w => { if (marks[w] === 'correct') correct++; else if (marks[w] === 'partial') partial++; else if (marks[w] === 'error') errors++ })
  const unread = sk.words.length - correct - partial - errors
  const run = longestErrorRun(sk.words, marks)
  const pct = accuracyPct(correct, partial, sk.words.length)
  const band = correct + partial + errors > 0 ? phonicsBand({ pct }) : null
  const tile = (w: string) => <WordTile key={w} word={w} letter={!!sk.sections} mark={marks[w]} heard={heard[w]} lang={lang} onTap={() => onTap(w)} onHeard={() => onHeard(w)} />
  return (
    <div className="border border-rule-2 rounded-md bg-surface">
      <div className="px-4 py-2.5 border-b border-rule flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[length:calc(14px*var(--ts))] font-semibold text-ink">{lang === 'ko' ? sk.label_ko : sk.label} <span className="font-normal text-ink-3 text-[length:calc(12px*var(--ts))]">· {sk.covers}</span></h3>
          <p className="text-[length:calc(12.5px*var(--ts))] text-ink-2 mt-0.5"><span className="eyebrow mr-1.5">{lang === 'ko' ? '말하기' : 'Say'}</span>“{sk.say ? (lang === 'ko' ? sk.say_ko || sk.say : sk.say) : lang === 'ko' ? '이 단어들을 읽어 보세요. 모르겠으면 소리 내어 합쳐 보세요.' : 'Read these words for me. If you are not sure, sound it out.'}”</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[length:calc(13px*var(--ts))] font-semibold tabular-nums ${band ? BAND_TEXT[band] : 'text-ink-3'}`}>{halfText(correct, partial)} / {sk.words.length}{band && <span className="font-normal text-[length:calc(11.5px*var(--ts))] ml-1.5">{PHONICS_BAND_LABELS[band][lang]}</span>}</span>
          <button onClick={onTakeOut} className="inline-flex items-center gap-1 h-6 px-2 rounded border border-rule-2 text-[length:calc(11px*var(--ts))] text-ink-3 hover:text-ink hover:border-ink-3"
            title={lang === 'ko' ? '이 시트를 끝내지 못했나요? 이 점검에서 빼면 점수에 들어가지 않습니다(0이 아님).' : 'Did not get to this sheet, or stopped early for a reason that is not the student’s reading? Take it out: it is not scored, not a 0.'}>
            <X size={11} /> {lang === 'ko' ? '이 점검에서 빼기' : 'Not given'}
          </button>
        </div>
      </div>
      {sk.sections ? (
        <div className="px-4 py-3 space-y-2">
          {sk.sections.map((row, i) => {
            let rc = 0, rp = 0, rm = 0
            row.forEach(w => { if (marks[w] === 'correct') rc++; else if (marks[w] === 'partial') rp++; if (marks[w]) rm++ })
            return (
              <div key={i} className="grid grid-cols-[20px_1fr_48px] items-center gap-2">
                <span className="text-[length:calc(11px*var(--ts))] text-ink-3 tabular-nums" title={lang === 'ko' ? `${i + 1}줄` : `Row ${i + 1}`}>{i + 1}</span>
                <div className="grid grid-cols-7 gap-2">{row.map(tile)}</div>
                <span className="text-right text-[length:calc(11.5px*var(--ts))] tabular-nums text-ink-3">{rm > 0 ? <><b className="text-ink">{halfText(rc, rp)}</b>/{row.length}</> : ''}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="px-4 py-3 grid grid-cols-4 gap-2">{sk.words.map(tile)}</div>
      )}
      <div className="px-4 py-2 border-t border-rule flex items-center gap-3 flex-wrap text-[length:calc(11.5px*var(--ts))] text-ink-3 tabular-nums">
        <span><b className="text-good">{correct}</b> {lang === 'ko' ? '정답' : 'correct'} · <b className="text-warn">{partial}</b> {lang === 'ko' ? '부분 정답' : 'partly'} · <b className="text-bad">{errors}</b> {lang === 'ko' ? '오답' : errors === 1 ? 'error' : 'errors'} · {unread} {lang === 'ko' ? '미읽음' : 'not read'}</span>
        <span className="text-ink-3">{lang === 'ko' ? '한 번 탭 정답, 두 번 오답, 세 번 부분 정답, 네 번 지우기.' : 'Tap once correct, twice error, three times partly, again to clear.'}</span>
        {run >= 5 && <span className="text-warn font-medium">{lang === 'ko' ? '연속 5개 오답: 이 시트는 여기서 멈추세요.' : 'Five errors in a row: stop this sheet here.'}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={() => onFill('rest')} className={smallBtn} title={lang === 'ko' ? '표시하지 않은 단어를 모두 정답으로' : 'Mark every untouched word correct'}>{lang === 'ko' ? '나머지 정답' : 'Rest correct'}</button>
          <button onClick={() => onFill('all')} className={smallBtn}>{lang === 'ko' ? '모두 정답' : 'All correct'}</button>
          <button onClick={() => onFill('clear')} className={smallBtn}>{lang === 'ko' ? '지우기' : 'Clear'}</button>
        </span>
      </div>
      <details className="px-4 py-2 border-t border-rule" open={observations.length > 0}>
        <summary className="text-[length:calc(11.5px*var(--ts))] text-ink-2 cursor-pointer hover:text-ink">{lang === 'ko' ? '오류 패턴과 해독 방식' : 'Error patterns, and how they decoded'}{observations.length > 0 && <span className="text-ink-3"> · {observations.length}</span>}</summary>
        <ObservationTicks sk={sk} observations={observations} lang={lang} onObs={onObs} className="mt-2" />
      </details>
    </div>
  )
}

const smallBtn = 'h-6 px-2 rounded border border-rule-2 text-[length:calc(11px*var(--ts))] text-ink-2 hover:text-ink hover:border-ink-3'
const obsChip = (on: boolean) => `px-2 h-6 rounded-full border text-[length:calc(11px*var(--ts))] ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`

// One word (or letter) to tap. The pencil on an error or partly records what
// was said; `missedTimes` (two or more) marks a word this student keeps
// missing. A letter tile is square-ish and larger: one character.
function WordTile({ word, letter = false, mark, heard, lang, missedTimes = 0, onTap, onHeard }: {
  word: string; letter?: boolean; mark: PhonicsMark | undefined; heard?: string; lang: Lang; missedTimes?: number; onTap: () => void; onHeard: () => void
}) {
  return (
    <div className="relative">
      <button onClick={onTap} style={{ touchAction: 'manipulation' }}
        title={mark ? MARK_LABEL[mark][lang] : undefined}
        className={`w-full ${letter ? 'px-1 py-2 text-[length:calc(26px*var(--ts))]' : 'px-3 py-2.5 text-[length:calc(21px*var(--ts))]'} rounded border-2 font-serif leading-none select-none ${mark ? MARK_TILE[mark] : 'bg-surface border-rule-2 text-ink hover:border-ink-3'}`}>
        {word}
        {isMiss(mark) && heard && <span className="block font-sans text-[length:calc(11px*var(--ts))] italic mt-1 opacity-80 truncate">“{heard}”</span>}
      </button>
      {missedTimes >= 2 && <span className="absolute -top-1.5 -left-1.5 px-1 h-4 rounded-full bg-bad text-white font-sans text-[length:max(10px,calc(9.5px*var(--ts)))] font-semibold leading-4 pointer-events-none" title={lang === 'ko' ? `${missedTimes}번 틀림` : `Missed ${missedTimes} times`}>×{missedTimes}</span>}
      {mark && <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white pointer-events-none ${MARK_SOLID[mark]}`}>{mark === 'correct' ? <Check size={10} strokeWidth={3} /> : mark === 'partial' ? <Minus size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}</span>}
      {isMiss(mark) && (
        <button onClick={onHeard} title={lang === 'ko' ? '뭐라고 읽었는지 적기' : 'Write what they said'} aria-label={`What did they say for ${word}`}
          className={`absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface border flex items-center justify-center ${mark === 'error' ? 'border-bad/50 text-bad hover:bg-bad-soft' : 'border-warn/50 text-warn hover:bg-warn-soft'}`}><Pencil size={10} /></button>
      )}
    </div>
  )
}

// A sheet's error-pattern boxes: its own patterns first, then the shared
// error, Korean-transfer and how-they-decoded boxes (word sheets only).
function ObservationTicks({ sk, observations, lang, onObs, className = '' }: {
  sk: PhonicsSkill; observations: string[]; lang: Lang; onObs: (id: string) => void; className?: string
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {/* The sheet's own error patterns first: what the sheet is there to find. */}
      <div className="grid grid-cols-[112px_1fr] gap-2 items-start">
        <span className="text-[length:calc(11px*var(--ts))] text-ink-3 pt-1">{lang === 'ko' ? '이 시트' : 'This sheet'}</span>
        <div className="flex flex-wrap gap-1.5">
          {sk.patterns.map(p => { const id = `${PATTERN_PREFIX}${p}`; return <button key={p} onClick={() => onObs(id)} className={obsChip(observations.includes(id))}>{p}</button> })}
        </div>
      </div>
      {/* How a student decoded words, and word-level errors, mean nothing for single letters. */}
      {!sk.sections && OBSERVATION_GROUPS.filter(g => g.id !== 'how').concat(OBSERVATION_GROUPS.filter(g => g.id === 'how')).map(g => (
        <div key={g.id} className="grid grid-cols-[112px_1fr] gap-2 items-start">
          <span className="text-[length:calc(11px*var(--ts))] text-ink-3 pt-1">{lang === 'ko' ? g.label_ko : g.label}</span>
          <div className="flex flex-wrap gap-1.5">
            {DECODING_OBSERVATIONS.filter(o => o.group === g.id).map(o => <button key={o.id} onClick={() => onObs(o.id)} className={obsChip(observations.includes(o.id))}>{lang === 'ko' ? o.label_ko : o.label}</button>)}
          </div>
        </div>
      ))}
    </div>
  )
}

// Missed before: every word missed on the latest check of each sheet, on
// one card, sheet by sheet. Each sheet shows its old score and what it will
// be with the words read again; its boxes open once a word there is missed
// again.
function RecheckCard({ missed, history, checkById, marks, heard, observations, lang, onTap, onHeard, onObs, onFill, onPrint }: {
  missed: MissedSheet[]; history: PhonicsCheckRow[]; checkById: Record<string, PhonicsCheckRow>
  marks: Marks; heard: Heard; observations: Observations; lang: Lang
  onTap: (sheet: string, word: string) => void; onHeard: (sheet: string, word: string) => void; onObs: (sheet: string, id: string) => void
  onFill: (how: 'all' | 'rest' | 'clear') => void; onPrint: () => void
}) {
  const total = missed.reduce((n, m) => n + m.words.length, 0)
  return (
    <div className="border border-rule-2 rounded-md bg-surface" data-guide="reading.phonics.words">
      <div className="px-4 py-2.5 border-b border-rule flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[length:calc(14px*var(--ts))] font-semibold text-ink">{lang === 'ko' ? '틀린 단어 다시 읽기' : 'Missed before'} <span className="font-normal text-ink-3 text-[length:calc(12px*var(--ts))]">· {total} {lang === 'ko' ? '단어' : total === 1 ? 'word' : 'words'}, {missed.length} {lang === 'ko' ? '시트' : missed.length === 1 ? 'sheet' : 'sheets'}</span></h3>
          <p className="text-[length:calc(12.5px*var(--ts))] text-ink-2 mt-0.5"><span className="eyebrow mr-1.5">{lang === 'ko' ? '말하기' : 'Say'}</span>“{lang === 'ko' ? '이 단어들을 다시 읽어 보세요.' : 'Let’s read these again. If you are not sure, sound it out.'}”</p>
        </div>
        <button onClick={onPrint} className={`${smallBtn} inline-flex items-center gap-1`}><Printer size={11} /> {lang === 'ko' ? '학생용 인쇄' : 'Print for the student'}</button>
      </div>
      <div className="divide-y divide-rule">
        {missed.map(m => {
          const sk = phonicsSkill(m.sheet)!
          const before = checkById[m.fromCheckId]
          const was = before ? scoreSkill(before, m.sheet) : null
          const now = marks[m.sheet] || {}
          const touched = Object.keys(now).length > 0
          const merged = { ...(before?.results?.[m.sheet] || {}), ...now }
          let c = 0, p = 0
          sk.words.forEach(w => { if (merged[w] === 'correct') c++; else if (merged[w] === 'partial') p++ })
          const band = phonicsBand({ pct: accuracyPct(c, p, sk.words.length) })
          const times = missCounts(history, m.sheet)
          const missedAgain = m.words.some(w => isMiss(now[w]))
          return (
            <div key={m.sheet} className="px-4 py-3">
              <div className="flex items-baseline gap-2 flex-wrap mb-2 text-[length:calc(12px*var(--ts))] tabular-nums">
                <span className="font-semibold text-ink">{lang === 'ko' ? sk.label_ko : sk.label}</span>
                {was && <span className="text-ink-3">{scoreText(was)} · {fmtShort(m.fromDate, lang)}</span>}
                {touched && <span className={BAND_TEXT[band]}>→ {halfText(c, p)} / {sk.words.length} {PHONICS_BAND_LABELS[band][lang]}</span>}
              </div>
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sk.sections ? 10 : 6}, minmax(0, 1fr))` }}>
                {m.words.map(w => <WordTile key={w} word={w} letter={!!sk.sections} mark={now[w]} heard={heard[m.sheet]?.[w]} lang={lang} missedTimes={times[w] || 0}
                  onTap={() => onTap(m.sheet, w)} onHeard={() => onHeard(m.sheet, w)} />)}
              </div>
              {missedAgain && <ObservationTicks sk={sk} observations={observations[m.sheet] || []} lang={lang} onObs={id => onObs(m.sheet, id)} className="mt-3" />}
            </div>
          )
        })}
      </div>
      <div className="px-4 py-2 border-t border-rule flex items-center gap-3 flex-wrap text-[length:calc(11.5px*var(--ts))] text-ink-3">
        <span>{lang === 'ko' ? '빨간 ×2: 두 번 이상 틀린 단어. 표시하지 않은 단어는 예전 표시가 유지됩니다.' : 'Red ×2: missed on two or more checks. A word left untouched keeps its old mark.'}</span>
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={() => onFill('rest')} className={smallBtn}>{lang === 'ko' ? '나머지 정답' : 'Rest correct'}</button>
          <button onClick={() => onFill('clear')} className={smallBtn}>{lang === 'ko' ? '지우기' : 'Clear'}</button>
        </span>
      </div>
    </div>
  )
}
