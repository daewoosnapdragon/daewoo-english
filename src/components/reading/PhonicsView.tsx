'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { getDisplayName, getKSTDateString } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'
import { logActivity } from '@/lib/activity'
import type { Student } from '@/types'
import {
  PHONICS_GROUPS, PHONICS_SKILLS, PHONICS_SKILL_IDS, PHONICS_BAND_LABELS, DECODING_OBSERVATIONS, PATTERN_PREFIX,
  phonicsSkill, skillsInGroup, orderSkills, latestBySkill, phonicsBand, summarizeStudent, notYetSecure, scoreCheck, scoreSkill, nextMark, longestErrorRun,
  type PhonicsCheckRow, type PhonicsMark, type LatestBySkill, type PhonicsBand,
} from '@/lib/phonics'
import { loadPhonicsChecks, savePhonicsCheck, deletePhonicsCheck } from '@/lib/phonicsData'
import { BAND_TONE, BAND_CHIP, BAND_TEXT, BAND_DOT } from '@/components/reading/PhonicsSummary'
import { Check, ChevronLeft, ChevronRight, ClipboardCheck, Download, Loader2, Pencil, Printer, Trash2, X } from 'lucide-react'

// ─── Phonics quick checks ────────────────────────────────────────
// Reading → Phonics. Two faces: the heat map (every student in the class
// against every sheet of the Phonics Quick Checks packet, coloured by their
// latest check) and the check screen (one student, the sheets the teacher
// picked, a tile per word to tap as the student reads from the printed
// sheet). Nothing is graded.

type Lang = 'en' | 'ko'
type Mode = 'heatmap' | 'assess'
type Marks = Record<string, Record<string, PhonicsMark>>
type Heard = Record<string, Record<string, string>>
type Observations = Record<string, string[]>

export const SKILLS_STORAGE_KEY = 'daewoo_phonics_skills'
const BANDS: PhonicsBand[] = ['mastered', 'proficient', 'developing', 'beginning']

export default function PhonicsView({ students, loading, lang, grade, englishClass, initialStudentId }: {
  students: Student[]; loading: boolean; lang: Lang; grade: number; englishClass: string; initialStudentId?: string | null
}) {
  const { confirmDialog } = useApp()
  const [mode, setMode] = useState<Mode>(initialStudentId ? 'assess' : 'heatmap')
  const [studentId, setStudentId] = useState<string | null>(initialStudentId || null)
  const [checks, setChecks] = useState<PhonicsCheckRow[]>([])
  const [loadingChecks, setLoadingChecks] = useState(true)
  const [editing, setEditing] = useState<PhonicsCheckRow | null>(null)
  const [dirty, setDirty] = useState(false)
  const [open, setOpen] = useState<{ sid: string; skill: string } | null>(null)
  // The sheets ticked for the next check. Remembered: a teacher checking a
  // class on digraphs does not re-tick them fifteen times.
  const [selected, setSelected] = useState<string[]>(() => {
    try { const s = JSON.parse(localStorage.getItem(SKILLS_STORAGE_KEY) || '[]'); return Array.isArray(s) ? orderSkills(s) : [] } catch { return [] }
  })
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

  const latestByStudent = useMemo(() => {
    const by: Record<string, PhonicsCheckRow[]> = {}
    checks.forEach(c => { (by[c.student_id] ||= []).push(c) })
    const out: Record<string, LatestBySkill> = {}
    students.forEach(s => { out[s.id] = latestBySkill(by[s.id] || []) })
    return out
  }, [checks, students])

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

  const nextStudent = (dir: 1 | -1) => {
    if (!student) return
    const i = students.findIndex(s => s.id === student.id)
    const n = students[i + dir]
    if (n) { setStudentId(n.id); setEditing(null) }
  }

  // The packet's student sheets, one a page, in large type.
  const printSheets = () => {
    const pw = window.open('', '_blank'); if (!pw) return
    const sections = PHONICS_SKILLS.map(s => `<section><p class="eyebrow">${s.covers}</p><h2>${s.label}</h2><div class="words">${s.words.map(w => `<span>${w}</span>`).join('')}</div></section>`).join('')
    pw.document.write(`<html><head><title>Phonics quick checks: word sheets</title><style>
      body{font-family:Georgia,'Iowan Old Style',serif;color:#1b1812;margin:0;padding:24px}
      section{page-break-after:always;padding-top:12px}section:last-child{page-break-after:auto}
      .eyebrow{font-family:system-ui,sans-serif;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#857d6e;margin:0}
      h2{font-weight:500;font-size:28px;margin:4px 0 28px}
      .words{display:grid;grid-template-columns:repeat(4,1fr);gap:34px 24px;font-size:38px;line-height:1.1;text-align:center}
      @media print{body{padding:12px}}
    </style></head><body>${sections}</body></html>`)
    pw.document.close(); pw.print()
    logActivity('printed', 'Phonics quick check word sheets', { path: '/reading' })
  }

  const exportCsv = () => {
    exportToCSV(`phonics-${englishClass}-G${grade}`,
      ['Student', 'Korean name', ...PHONICS_SKILLS.map(s => s.short), 'Working on', 'Last check'],
      students.map(s => {
        const latest = latestByStudent[s.id] || {}
        const sum = summarizeStudent(latest)
        return [s.english_name, s.korean_name, ...PHONICS_SKILL_IDS.map(id => latest[id] ? `${latest[id].score.correct}/${latest[id].score.total}` : ''), sum.frontier ? phonicsSkill(sum.frontier)?.label || '' : '', sum.lastDate || '']
      }))
  }

  const seg = (on: boolean) => `px-3 h-8 rounded text-[12.5px] font-medium ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="inline-flex p-0.5 rounded border border-rule-2 bg-surface" data-guide="reading.phonics.mode">
          <button onClick={() => guardedSwitch(() => { setMode('heatmap'); setEditing(null) })} className={seg(mode === 'heatmap')}>{lang === 'ko' ? '히트맵' : 'Heat map'}</button>
          <button onClick={() => { if (!studentId && students[0]) setStudentId(students[0].id); setMode('assess') }} className={seg(mode === 'assess')}>{lang === 'ko' ? '학생 점검' : 'Check a student'}</button>
        </div>
        <span className="text-[12px] text-ink-3">{lang === 'ko' ? '해독만 평가합니다. 뜻은 묻지 않습니다. 성적에 들어가지 않습니다.' : 'Decoding only, meaning never asked, nothing graded.'}</span>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={exportCsv} className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink"><Download size={11} /> CSV</button>
          <button onClick={printSheets} className="inline-flex items-center gap-1 text-[12px] text-ink-3 hover:text-ink" title={lang === 'ko' ? '학생용 단어 시트 인쇄' : 'Print the twenty sheets in large type, one a page, for the student to read from'}><Printer size={11} /> {lang === 'ko' ? '단어 시트' : 'Word sheets'}</button>
        </div>
      </div>

      {loading || loadingChecks ? <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
      : students.length === 0 ? <p className="text-[13px] text-ink-3 py-8">{lang === 'ko' ? '이 반에 학생이 없습니다.' : 'No students in this class.'}</p>
      : mode === 'heatmap' ? (
        <HeatMap students={students} latestByStudent={latestByStudent} lang={lang} onCell={(sid, skill) => setOpen({ sid, skill })} onCheck={(sid) => startCheck(sid)} />
      ) : student ? (
        <AssessPanel key={`${student.id}:${editing?.id || 'new'}`} student={student} students={students} lang={lang}
          latest={latestByStudent[student.id] || {}} history={checks.filter(c => c.student_id === student.id)}
          selected={selected} onSelect={pickSkills} editing={editing}
          onDirty={setDirty} onPick={(sid) => guardedSwitch(() => { setStudentId(sid); setEditing(null) })}
          onPrev={() => guardedSwitch(() => nextStudent(-1))} onNext={() => guardedSwitch(() => nextStudent(1))}
          onCancelEdit={() => { setEditing(null); setDirty(false) }}
          onSaved={async (andNext) => { setDirty(false); setEditing(null); await reload(); if (andNext) nextStudent(1) }}
          onEdit={(c) => startCheck(student.id, c.skills, c)}
          onDelete={async (c) => {
            const ok = await confirmDialog({ title: lang === 'ko' ? '점검 기록 삭제' : 'Delete this check?', message: lang === 'ko' ? `${c.date}의 파닉스 점검을 삭제합니다. 되돌릴 수 없습니다.` : `The phonics check from ${c.date} will be deleted. This cannot be undone.`, confirmLabel: lang === 'ko' ? '삭제' : 'Delete', danger: true })
            if (!ok) return
            await deletePhonicsCheck(c.id, student.english_name); await reload()
          }} />
      ) : null}

      {open && (
        <CellDetail sid={open.sid} skill={open.skill} students={students} checks={checks} lang={lang} onClose={() => setOpen(null)}
          onRecheck={() => startCheck(open.sid, [open.skill])}
          onEdit={(c) => startCheck(open.sid, c.skills, c)} />
      )}
    </div>
  )
}

// ─── Heat map ────────────────────────────────────────────────────

export function HeatMap({ students, latestByStudent, lang, onCell, onCheck }: {
  students: Student[]; latestByStudent: Record<string, LatestBySkill>; lang: Lang
  onCell: (sid: string, skill: string) => void; onCheck: (sid: string) => void
}) {
  const colAvg = useMemo(() => Object.fromEntries(PHONICS_SKILL_IDS.map(id => {
    const ps = students.map(s => latestByStudent[s.id]?.[id]?.score.pct).filter((p): p is number => p != null)
    return [id, ps.length ? Math.round(ps.reduce((a, b) => a + b, 0) / ps.length) : null]
  })), [students, latestByStudent])
  const anyData = students.some(s => Object.keys(latestByStudent[s.id] || {}).length > 0)
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })

  return (
    <div>
      <div className="flex gap-4 text-[11.5px] text-ink-2 mb-3 flex-wrap">
        {BANDS.map(b => (
          <span key={b} className="inline-flex items-center gap-1.5" title={PHONICS_BAND_LABELS[b].means}>
            <span className={`w-3 h-3 rounded-sm ${BAND_TONE[b]} ${b !== 'mastered' ? 'border border-rule-2' : ''}`} />
            {PHONICS_BAND_LABELS[b][lang]} {b === 'mastered' ? (lang === 'ko' ? '(90%+, 자동)' : '(90%+, automatic)') : b === 'proficient' ? '90%+' : b === 'developing' ? '70–89%' : '<70%'}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-paper-2 border border-rule" />{lang === 'ko' ? '미점검' : 'Not checked'}</span>
        <span className="text-ink-3">{lang === 'ko' ? '· 셀은 가장 최근 점검의 정확도(%)입니다. 클릭하면 단어별로 보입니다.' : '· a cell is the latest check’s accuracy; click it for the words'}</span>
      </div>
      {!anyData && <p className="text-[13px] text-ink-3 mb-3">{lang === 'ko' ? '아직 이 반에는 파닉스 점검이 없습니다. 학생 옆의 점검 버튼으로 시작하세요.' : 'No phonics checks for this class yet. Use Check beside a student to start.'}</p>}
      {/* Fills the page width with no scrolling: the twenty sheet columns
          share what is left after the name and working-on columns, and the
          sheet names run vertically so a column can be narrow. */}
      <div className="border border-rule-2 rounded-md overflow-hidden">
        <table className="w-full table-fixed text-[12px] tabular-nums border-collapse">
          <colgroup>
            <col style={{ width: 168 }} />
            {PHONICS_SKILLS.map(s => <col key={s.id} />)}
            <col style={{ width: 148 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className="bg-paper-2">
              <th rowSpan={2} className="text-left px-3 py-2 eyebrow font-semibold border-b border-r border-rule-2 align-bottom">{lang === 'ko' ? '학생' : 'Student'}</th>
              {PHONICS_GROUPS.map(g => <th key={g.id} colSpan={skillsInGroup(g.id).length} className="px-1 pt-2 pb-1 eyebrow font-semibold border-b border-l border-rule text-center whitespace-nowrap overflow-hidden text-ellipsis">{lang === 'ko' ? g.label_ko : g.label}</th>)}
              <th rowSpan={2} className="px-3 py-2 border-b border-l border-rule-2 eyebrow font-semibold text-left align-bottom">{lang === 'ko' ? '현재 과제' : 'Working on'}</th>
              <th rowSpan={2} className="border-b border-rule-2" />
            </tr>
            <tr className="bg-paper-2">
              {PHONICS_SKILLS.map((s, i) => (
                <th key={s.id} className={`px-0 pb-1.5 border-b border-rule-2 align-bottom h-[104px] ${i > 0 && PHONICS_SKILLS[i - 1].group !== s.group ? 'border-l border-rule' : ''}`} title={`${s.label}\n${s.covers}`}>
                  <div className="flex flex-col items-center justify-end gap-1 h-full">
                    <span className="text-[10.5px] font-semibold text-ink-2 whitespace-nowrap leading-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{s.short}</span>
                    <span className={`text-[10px] leading-none ${colAvg[s.id] != null && colAvg[s.id]! < 70 ? 'text-bad font-semibold' : 'text-ink-3'}`}>{colAvg[s.id] != null ? `${colAvg[s.id]}%` : ' '}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-rule">
            {students.map(s => {
              const latest = latestByStudent[s.id] || {}
              const sum = summarizeStudent(latest)
              return (
                <tr key={s.id}>
                  <td className="px-3 py-1 border-r border-rule-2 overflow-hidden"><div className="truncate"><Link href={`/students/${s.id}`} className="text-ink hover:underline">{getDisplayName(s)}</Link><span className="text-ink-3 ml-1.5 text-[11px]">{s.korean_name}</span></div></td>
                  {PHONICS_SKILLS.map((sk, i) => {
                    const l = latest[sk.id]
                    const band = l ? phonicsBand(l.score) : null
                    return (
                      <td key={sk.id} className={`p-[3px] ${i > 0 && PHONICS_SKILLS[i - 1].group !== sk.group ? 'border-l border-rule' : ''}`}>
                        <button onClick={() => l && onCell(s.id, sk.id)} disabled={!l}
                          title={l ? `${sk.label}: ${l.score.correct}/${l.score.total} · ${PHONICS_BAND_LABELS[band!].en} · ${fmt(l.date)}${l.score.unread ? ` · ${l.score.unread} ${lang === 'ko' ? '미읽음' : 'not read'}` : ''}` : `${sk.label}: ${lang === 'ko' ? '미점검' : 'not checked'}`}
                          className={`w-full h-7 rounded-sm text-[10.5px] font-semibold ${band ? BAND_TONE[band] : 'bg-paper-2/60 text-ink-3/40'}`}>{l ? l.score.pct : '·'}</button>
                      </td>
                    )
                  })}
                  <td className="px-3 py-1 border-l border-rule-2 text-[11px] leading-tight overflow-hidden">
                    {sum.tested === 0 ? <span className="text-ink-3">—</span>
                      : sum.frontier ? <span className="block text-ink truncate" title={phonicsSkill(sum.frontier)?.label}>{phonicsSkill(sum.frontier)?.label}</span>
                      : <span className="block text-good truncate">{lang === 'ko' ? '모두 숙달' : 'All proficient'}</span>}
                    {sum.lastDate && <span className="block text-[10px] text-ink-3">{fmt(sum.lastDate)}</span>}
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

// ─── One cell's story ────────────────────────────────────────────

function CellDetail({ sid, skill, students, checks, lang, onClose, onRecheck, onEdit }: {
  sid: string; skill: string; students: Student[]; checks: PhonicsCheckRow[]; lang: Lang
  onClose: () => void; onRecheck: () => void; onEdit: (c: PhonicsCheckRow) => void
}) {
  const student = students.find(s => s.id === sid)
  const sk = phonicsSkill(skill)
  const history = checks.filter(c => c.student_id === sid && c.skills.includes(skill))
  const [showing, setShowing] = useState<PhonicsCheckRow | null>(history[0] || null)
  if (!student || !sk || !showing) return null
  const score = scoreSkill(showing, skill)!
  const band = phonicsBand(score)
  const marks = showing.results[skill] || {}
  const heard = showing.heard?.[skill] || {}
  const obs = showing.observations?.[skill] || []
  const how = obs.filter(o => !o.startsWith(PATTERN_PREFIX)).map(o => DECODING_OBSERVATIONS.find(d => d.id === o)).filter(Boolean)
  const trouble = obs.filter(o => o.startsWith(PATTERN_PREFIX)).map(o => o.slice(PATTERN_PREFIX.length))
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3.5 border-b border-rule-2 flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{getDisplayName(student)} · {student.korean_name}</p>
            <h3 className="font-display text-[22px] leading-tight text-ink mt-1">{lang === 'ko' ? sk.label_ko : sk.label}</h3>
            <p className="text-[12.5px] text-ink-2 mt-1">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10.5px] font-semibold mr-2 ${BAND_TONE[band]}`} title={PHONICS_BAND_LABELS[band].means}>{PHONICS_BAND_LABELS[band][lang]}</span>
              {score.correct} / {score.total} · {score.pct}% · {fmt(showing.date)}{score.unread > 0 && <span className="text-ink-3"> · {score.unread} {lang === 'ko' ? '미읽음' : 'not read'}</span>}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={15} /></button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex flex-wrap gap-1.5">
            {[...sk.words, ...Object.keys(marks).filter(w => !sk.words.includes(w))].map(w => {
              const m = marks[w]
              return (
                <span key={w} className={`inline-flex flex-col items-center px-2.5 py-1 rounded border font-serif text-[15px] leading-tight ${m === 'correct' ? 'bg-good-soft border-good/30 text-good' : m === 'error' ? 'bg-bad-soft border-bad/30 text-bad' : 'bg-paper-2 border-rule text-ink-3'}`}>
                  <span className="inline-flex items-center gap-1">{w}{m === 'correct' ? <Check size={11} /> : m === 'error' ? <X size={11} /> : null}</span>
                  {m === 'error' && heard[w] && <span className="font-sans text-[10.5px] italic opacity-80">“{heard[w]}”</span>}
                </span>
              )
            })}
          </div>
          {(how.length > 0 || trouble.length > 0) && (
            <div className="text-[12.5px] text-ink-2 space-y-1">
              {how.length > 0 && <p><span className="eyebrow mr-1.5">{lang === 'ko' ? '해독 방식' : 'How they decoded'}</span>{how.map(d => lang === 'ko' ? d!.label_ko : d!.label).join(' · ')}</p>}
              {trouble.length > 0 && <p><span className="eyebrow mr-1.5">{lang === 'ko' ? '어려운 패턴' : 'Trouble with'}</span>{trouble.join(', ')}</p>}
            </div>
          )}
          {showing.notes && <p className="text-[12.5px] text-ink-2 italic">“{showing.notes}”</p>}
          {history.length > 1 && (
            <div>
              <p className="eyebrow mb-1.5">{lang === 'ko' ? '이 시트의 이력' : 'History for this sheet'}</p>
              <div className="flex flex-wrap gap-1.5">
                {history.map(c => { const s = scoreSkill(c, skill)!; const b = phonicsBand(s); return (
                  <button key={c.id} onClick={() => setShowing(c)} className={`px-2 py-1 rounded border text-[11.5px] tabular-nums ${c.id === showing.id ? 'ring-1 ring-ink' : ''} ${BAND_CHIP[b]}`}>{fmt(c.date)} · {s.correct}/{s.total}</button>
                ) })}
              </div>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-rule-2 flex items-center gap-2">
          <button onClick={onRecheck} className="h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover">{lang === 'ko' ? '이 시트 다시 점검' : 'Recheck this sheet'}</button>
          <button onClick={() => onEdit(showing)} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink inline-flex items-center gap-1.5"><Pencil size={12} /> {lang === 'ko' ? '이 점검 수정' : 'Edit this check'}</button>
        </div>
      </div>
    </div>
  )
}

// ─── Checking one student ────────────────────────────────────────

function AssessPanel({ student, students, lang, latest, history, selected, onSelect, editing, onDirty, onPick, onPrev, onNext, onCancelEdit, onSaved, onEdit, onDelete }: {
  student: Student; students: Student[]; lang: Lang; latest: LatestBySkill; history: PhonicsCheckRow[]
  selected: string[]; onSelect: (ids: string[]) => void; editing: PhonicsCheckRow | null
  onDirty: (d: boolean) => void; onPick: (sid: string) => void; onPrev: () => void; onNext: () => void
  onCancelEdit: () => void; onSaved: (andNext: boolean) => Promise<void>; onEdit: (c: PhonicsCheckRow) => void; onDelete: (c: PhonicsCheckRow) => void
}) {
  const { currentTeacher, showToast, promptDialog } = useApp()
  const [date, setDate] = useState(editing?.date || getKSTDateString())
  const [marks, setMarks] = useState<Marks>(editing?.results || {})
  const [heard, setHeard] = useState<Heard>(editing?.heard || {})
  const [observations, setObservations] = useState<Observations>(editing?.observations || {})
  const [notes, setNotes] = useState(editing?.notes || '')
  const [saving, setSaving] = useState(false)
  const skills = editing ? orderSkills(editing.skills) : selected
  const idx = students.findIndex(s => s.id === student.id)
  const touch = (fn: () => void) => { fn(); onDirty(true) }

  const setSkills = (ids: string[]) => touch(() => onSelect(ids))
  const toggleSkill = (id: string) => setSkills(skills.includes(id) ? skills.filter(s => s !== id) : [...skills, id])
  const tap = (skill: string, word: string) => touch(() => setMarks(m => {
    const cur = { ...(m[skill] || {}) }
    const nxt = nextMark(cur[word])
    if (nxt) cur[word] = nxt; else delete cur[word]
    return { ...m, [skill]: cur }
  }))
  const fill = (skill: string, how: 'all' | 'rest' | 'clear') => touch(() => setMarks(m => {
    const words = phonicsSkill(skill)?.words || []
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
    const words = phonicsSkill(id)?.words || []
    const ms = marks[id] || {}
    words.forEach(w => { if (ms[w] === 'correct') acc.correct++; else if (ms[w] === 'error') acc.errors++; acc.total++ })
    return acc
  }, { correct: 0, errors: 0, total: 0 })
  const nothingMarked = totals.correct + totals.errors === 0

  const save = async (andNext: boolean) => {
    if (skills.length === 0) { showToast(lang === 'ko' ? '점검할 시트를 하나 이상 고르세요.' : 'Pick at least one sheet to check.'); return }
    if (nothingMarked) { showToast(lang === 'ko' ? '단어를 하나도 표시하지 않았습니다.' : 'No words are marked yet.'); return }
    setSaving(true)
    const { error } = await savePhonicsCheck({ student_id: student.id, date, assessed_by: currentTeacher?.id || null, skills, results: marks, heard, observations, notes }, editing?.id, student.english_name)
    setSaving(false)
    if (error) { showToast(`Error: ${error}`); return }
    showToast(editing ? (lang === 'ko' ? '점검 수정됨' : `Check updated for ${student.english_name}`) : (lang === 'ko' ? '파닉스 점검 저장됨' : `Phonics check saved for ${student.english_name}`))
    setMarks({}); setHeard({}); setObservations({}); setNotes('')
    await onSaved(andNext)
  }

  const recheckable = notYetSecure(latest)
  const untested = PHONICS_SKILL_IDS.filter(id => !latest[id])
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
  const quick = 'h-7 px-2.5 rounded-full border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink hover:border-ink-3 disabled:opacity-40'

  return (
    <div className="grid grid-cols-[210px_1fr] gap-6 items-start">
      {/* Roster rail */}
      <aside className="sticky top-[120px] border border-rule-2 rounded-md bg-surface max-h-[calc(100vh-160px)] overflow-y-auto">
        <p className="eyebrow px-3 pt-2.5 pb-1.5">{lang === 'ko' ? '학생' : 'Students'}</p>
        <ul className="divide-y divide-rule">
          {students.map(s => {
            const own = s.id === student.id
            const last = own ? summarizeStudent(latest).lastDate : null
            return (
              <li key={s.id}>
                <button onClick={() => !own && onPick(s.id)} className={`w-full text-left px-3 py-1.5 ${own ? 'bg-paper-2 shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'hover:bg-paper-2/60'}`}>
                  <span className={`block text-[12.5px] truncate ${own ? 'text-ink font-semibold' : 'text-ink-2'}`}>{s.english_name}</span>
                  <span className="block text-[10.5px] text-ink-3 truncate">{s.korean_name}{last ? ` · ${fmt(last)}` : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </aside>

      <section className="min-w-0">
        {/* Student header */}
        <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
          <div>
            <p className="eyebrow eyebrow-accent mb-1">{editing ? (lang === 'ko' ? `${editing.date} 점검 수정 중` : `Editing the check from ${editing.date}`) : (lang === 'ko' ? '파닉스 점검' : 'Phonics quick check')}</p>
            <h2 className="font-display text-[28px] leading-none text-ink">{student.english_name} <span className="text-ink-3 text-[18px]">{student.korean_name}</span></h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="grid gap-0.5"><span className="eyebrow">{lang === 'ko' ? '날짜' : 'Date'}</span><input type="date" value={date} onChange={e => touch(() => setDate(e.target.value))} className="h-8 px-2 bg-surface border border-rule-2 rounded text-[13px] text-ink" /></label>
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
              {(() => { const sum = summarizeStudent(latest); return <p className="text-[12px] text-ink-2">{sum.frontier ? <>{lang === 'ko' ? '현재 과제: ' : 'Working on: '}<b className="text-ink">{phonicsSkill(sum.frontier)?.label}</b></> : (lang === 'ko' ? '점검한 시트 모두 숙달' : 'Every checked sheet proficient')}</p> })()}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {orderSkills(Object.keys(latest)).map(id => { const l = latest[id]; const b = phonicsBand(l.score); return (
                <span key={id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11.5px] tabular-nums ${BAND_CHIP[b]}`} title={`${phonicsSkill(id)?.label} · ${PHONICS_BAND_LABELS[b].en} · ${fmt(l.date)}`}>{phonicsSkill(id)?.short} {l.score.correct}/{l.score.total}</span>
              ) })}
            </div>
            <details className="mt-2">
              <summary className="text-[11.5px] text-ink-3 cursor-pointer hover:text-ink">{history.length} {lang === 'ko' ? '회 점검' : history.length === 1 ? 'check' : 'checks'}</summary>
              <ul className="mt-1.5 divide-y divide-rule">
                {history.map(c => (
                  <li key={c.id} className="py-1.5 flex items-center gap-3 text-[12px]">
                    <span className="text-ink-2 w-20 shrink-0">{fmt(c.date)}</span>
                    <span className="flex-1 min-w-0 text-ink-3 truncate">{scoreCheck(c).map(s => `${phonicsSkill(s.skill)?.short} ${s.correct}/${s.total}`).join(' · ')}</span>
                    <button onClick={() => onEdit(c)} className="text-ink-3 hover:text-ink" title={lang === 'ko' ? '수정' : 'Edit'}><Pencil size={12} /></button>
                    <button onClick={() => onDelete(c)} className="text-ink-3 hover:text-bad" title={lang === 'ko' ? '삭제' : 'Delete'}><Trash2 size={12} /></button>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}

        {/* Sheet picker */}
        <div className="mb-5" data-guide="reading.phonics.skills">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <p className="eyebrow">{lang === 'ko' ? '점검할 시트' : 'Sheets to check'}</p>
            {!editing && <>
              <button onClick={() => setSkills(PHONICS_SKILL_IDS)} className={quick}>{lang === 'ko' ? '전체' : 'All'}</button>
              <button onClick={() => setSkills([])} className={quick}>{lang === 'ko' ? '없음' : 'None'}</button>
              <button onClick={() => setSkills(recheckable)} disabled={recheckable.length === 0} className={quick}>{lang === 'ko' ? '아직 미숙달' : 'Not yet proficient'} ({recheckable.length})</button>
              <button onClick={() => setSkills(untested)} disabled={untested.length === 0} className={quick}>{lang === 'ko' ? '미점검' : 'Not checked yet'} ({untested.length})</button>
            </>}
            {editing && <span className="text-[11.5px] text-ink-3">{lang === 'ko' ? '수정 중에는 시트 목록이 고정됩니다.' : 'The sheets of a saved check are fixed while editing.'}</span>}
          </div>
          <div className="space-y-1.5">
            {PHONICS_GROUPS.map(g => (
              <div key={g.id} className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-ink-3 w-[96px] shrink-0">{lang === 'ko' ? g.label_ko : g.label}</span>
                {skillsInGroup(g.id).map(s => {
                  const on = skills.includes(s.id)
                  const l = latest[s.id]
                  const b = l ? phonicsBand(l.score) : null
                  return (
                    <button key={s.id} onClick={() => !editing && toggleSkill(s.id)} disabled={!!editing} title={`${s.label}\n${s.covers}${l ? `\n${lang === 'ko' ? '최근' : 'Last'}: ${l.score.correct}/${l.score.total} · ${PHONICS_BAND_LABELS[b!].en} · ${fmt(l.date)}` : ''}`}
                      className={`inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full border text-[12px] font-medium disabled:cursor-default ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`}>
                      {s.short}
                      {b && <span className={`w-2 h-2 rounded-full ${BAND_DOT[b]}`} />}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Word grids */}
        {skills.length === 0 ? (
          <p className="text-[13px] text-ink-3 py-6 border-t border-rule-2">{lang === 'ko' ? '위에서 시트를 고르면 단어가 여기에 나타납니다.' : 'Pick the sheets above and their words appear here.'}</p>
        ) : (
          <div className="space-y-5" data-guide="reading.phonics.words">
            {skills.map(id => (
              <SkillCard key={id} skill={id} marks={marks[id] || {}} heard={heard[id] || {}} observations={observations[id] || []} lang={lang}
                onTap={w => tap(id, w)} onHeard={w => askHeard(id, w)} onFill={how => fill(id, how)} onObs={o => toggleObs(id, o)} />
            ))}
          </div>
        )}

        <label className="block mt-5"><span className="eyebrow">{lang === 'ko' ? '메모' : 'Notes'}</span>
          <textarea value={notes} onChange={e => touch(() => setNotes(e.target.value))} rows={2} placeholder={lang === 'ko' ? '들은 것: 어떤 소리를 혼동하는지, 어디서 멈췄는지…' : 'Anything the ticks do not capture: which sounds are confused, where they stopped, how they attacked a word…'} className="mt-1 w-full px-3 py-2 bg-surface border border-rule-2 rounded text-[13px] text-ink" />
        </label>

        {/* Save bar */}
        <div className="sticky bottom-0 mt-5 -mx-2 px-2 py-3 bg-paper/95 backdrop-blur border-t border-rule-2 flex items-center gap-3 flex-wrap">
          <span className="text-[12.5px] text-ink-2 tabular-nums">{skills.length} {lang === 'ko' ? '시트' : skills.length === 1 ? 'sheet' : 'sheets'} · <b className="text-ink">{totals.correct}</b> / {totals.total} {lang === 'ko' ? '정답' : 'correct'}{totals.total - totals.correct - totals.errors > 0 && <span className="text-ink-3"> · {totals.total - totals.correct - totals.errors} {lang === 'ko' ? '미읽음' : 'not read'}</span>}</span>
          <div className="ml-auto flex items-center gap-2">
            {editing && <button onClick={onCancelEdit} className="h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{lang === 'ko' ? '수정 취소' : 'Cancel edit'}</button>}
            <button onClick={() => save(false)} disabled={saving} className="h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5" data-guide="reading.phonics.save">{saving && <Loader2 size={13} className="animate-spin" />}{editing ? (lang === 'ko' ? '수정 저장' : 'Save changes') : (lang === 'ko' ? '저장' : 'Save check')}</button>
            {!editing && idx < students.length - 1 && <button onClick={() => save(true)} disabled={saving} className="h-9 px-4 rounded border border-ink text-[13px] font-semibold text-ink hover:bg-paper-2 disabled:opacity-60">{lang === 'ko' ? '저장 후 다음 학생' : 'Save and next student'}</button>}
          </div>
        </div>
      </section>
    </div>
  )
}

// One sheet's words as tiles, in the packet's four-column layout. Tap:
// nothing → correct → error → nothing. The pencil on an error tile records
// what the student said; the checkboxes under the words are the packet's
// teacher-page observations.
function SkillCard({ skill, marks, heard, observations, lang, onTap, onHeard, onFill, onObs }: {
  skill: string; marks: Record<string, PhonicsMark>; heard: Record<string, string>; observations: string[]; lang: Lang
  onTap: (word: string) => void; onHeard: (word: string) => void; onFill: (how: 'all' | 'rest' | 'clear') => void; onObs: (id: string) => void
}) {
  const sk = phonicsSkill(skill)
  if (!sk) return null
  let correct = 0, errors = 0
  sk.words.forEach(w => { if (marks[w] === 'correct') correct++; else if (marks[w] === 'error') errors++ })
  const unread = sk.words.length - correct - errors
  const run = longestErrorRun(sk.words, marks)
  const pct = Math.round((correct / sk.words.length) * 100)
  const band = correct + errors > 0 ? phonicsBand({ pct, automatic: observations.includes('automatic') }) : null
  const small = 'h-6 px-2 rounded border border-rule-2 text-[11px] text-ink-2 hover:text-ink hover:border-ink-3'
  const obsChip = (on: boolean) => `px-2 h-6 rounded-full border text-[11px] ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  return (
    <div className="border border-rule-2 rounded-md bg-surface">
      <div className="px-4 py-2.5 border-b border-rule flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">{lang === 'ko' ? sk.label_ko : sk.label} <span className="font-normal text-ink-3 text-[12px]">· {sk.covers}</span></h3>
          <p className="text-[12.5px] text-ink-2 mt-0.5"><span className="eyebrow mr-1.5">{lang === 'ko' ? '말하기' : 'Say'}</span>“{lang === 'ko' ? '이 단어들을 읽어 보세요. 모르겠으면 소리 내어 합쳐 보세요.' : 'Read these words for me. If you are not sure, sound it out.'}”</p>
        </div>
        <span className={`text-[13px] font-semibold tabular-nums ${band ? BAND_TEXT[band] : 'text-ink-3'}`}>{correct} / {sk.words.length}{band && <span className="font-normal text-[11.5px] ml-1.5">{PHONICS_BAND_LABELS[band][lang]}</span>}</span>
      </div>
      <div className="px-4 py-3 grid grid-cols-4 gap-2">
        {sk.words.map(w => {
          const m = marks[w]
          return (
            <div key={w} className="relative">
              <button onClick={() => onTap(w)} style={{ touchAction: 'manipulation' }}
                className={`w-full px-3 py-2.5 rounded border-2 font-serif text-[21px] leading-none select-none ${
                  m === 'correct' ? 'bg-good-soft border-good/50 text-good' : m === 'error' ? 'bg-bad-soft border-bad/50 text-bad' : 'bg-surface border-rule-2 text-ink hover:border-ink-3'}`}>
                {w}
                {m === 'error' && heard[w] && <span className="block font-sans text-[11px] italic mt-1 opacity-80 truncate">“{heard[w]}”</span>}
              </button>
              {m && <span className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white pointer-events-none ${m === 'correct' ? 'bg-good' : 'bg-bad'}`}>{m === 'correct' ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}</span>}
              {m === 'error' && (
                <button onClick={() => onHeard(w)} title={lang === 'ko' ? '뭐라고 읽었는지 적기' : 'Write what they said'} aria-label={`What did they say for ${w}`}
                  className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface border border-bad/50 text-bad flex items-center justify-center hover:bg-bad-soft"><Pencil size={10} /></button>
              )}
            </div>
          )
        })}
      </div>
      <div className="px-4 py-2 border-t border-rule flex items-center gap-3 flex-wrap text-[11.5px] text-ink-3 tabular-nums">
        <span><b className="text-good">{correct}</b> {lang === 'ko' ? '정답' : 'correct'} · <b className="text-bad">{errors}</b> {lang === 'ko' ? '오답' : errors === 1 ? 'error' : 'errors'} · {unread} {lang === 'ko' ? '미읽음' : 'not read'}</span>
        {run >= 5 && <span className="text-warn font-medium">{lang === 'ko' ? '연속 5개 오답: 이 시트는 여기서 멈추세요.' : 'Five errors in a row: stop this sheet here.'}</span>}
        <span className="ml-auto flex items-center gap-1.5">
          <button onClick={() => onFill('rest')} className={small} title={lang === 'ko' ? '표시하지 않은 단어를 모두 정답으로' : 'Mark every untouched word correct'}>{lang === 'ko' ? '나머지 정답' : 'Rest correct'}</button>
          <button onClick={() => onFill('all')} className={small}>{lang === 'ko' ? '모두 정답' : 'All correct'}</button>
          <button onClick={() => onFill('clear')} className={small}>{lang === 'ko' ? '지우기' : 'Clear'}</button>
        </span>
      </div>
      <details className="px-4 py-2 border-t border-rule" open={observations.length > 0}>
        <summary className="text-[11.5px] text-ink-2 cursor-pointer hover:text-ink">{lang === 'ko' ? '해독 방식과 어려운 패턴' : 'How they decoded, and what gave trouble'}{observations.length > 0 && <span className="text-ink-3"> · {observations.length}</span>}</summary>
        <div className="mt-2 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {DECODING_OBSERVATIONS.map(o => <button key={o.id} onClick={() => onObs(o.id)} className={obsChip(observations.includes(o.id))}>{lang === 'ko' ? o.label_ko : o.label}</button>)}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ink-3 mr-1">{lang === 'ko' ? '어려운 패턴:' : 'Trouble with:'}</span>
            {sk.patterns.map(p => { const id = `${PATTERN_PREFIX}${p}`; return <button key={p} onClick={() => onObs(id)} className={obsChip(observations.includes(id))}>{p}</button> })}
          </div>
        </div>
      </details>
    </div>
  )
}
