'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, type EnglishClass, type Grade } from '@/types'
import { WIDA_DOMAINS, WIDA_LEVELS, type WIDADomainKey } from '@/lib/wida'
import { widaLevelName } from '@/components/curriculum/wida-cando'
import WidaSupport from '@/components/students/WidaSupport'
import WidaTimeline from './WidaTimeline'
import WidaAssessSheet from './WidaAssessSheet'
import { AssignScaffolds, ScaffoldIndex, WIDAOverview, WIDAvsCCSS } from '@/components/curriculum/WIDAGuide'
import { Loader2, Printer, Camera, Trash2, ListChecks } from 'lucide-react'

// ─── WIDA ─────────────────────────────────────────────────────────
// Everything about English language proficiency in one place: the class's
// levels (with the can-do questionnaire for each student and domain), how
// the class has moved over time, scaffolds, and the reference guide. The
// student page shows the results and links back here to change them.

const DOMAIN_LABEL: Record<WIDADomainKey, [string, string]> = { listening: ['Listening', '듣기'], speaking: ['Speaking', '말하기'], reading: ['Reading', '읽기'], writing: ['Writing', '쓰기'] }
const LEVEL_TONE: Record<number, string> = { 1: 'bg-bad-soft text-bad', 2: 'bg-warn-soft text-warn', 3: 'bg-warn-soft text-ink', 4: 'bg-good-soft text-good', 5: 'bg-good-soft text-good', 6: 'bg-paper-3 text-ink' }
type Tab = 'levels' | 'progress' | 'scaffolds' | 'guide'
interface Snapshot { id: string; label: string; created_at: string }

export default function WidaView() {
  const { currentTeacher, language: lang, showToast, confirmDialog, promptDialog } = useApp()
  const ko = lang === 'ko'
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Admin'
  const classes = isAdmin ? ENGLISH_CLASSES : ([currentTeacher?.english_class].filter(Boolean) as EnglishClass[])
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Snapdragon')
  const [gr, setGr] = useState<Grade>(3)
  const [tab, setTab] = useState<Tab>('levels')
  const { students, loading: loadingStudents } = useStudents({ grade: gr, english_class: cls })
  const [levels, setLevels] = useState<Record<string, Record<string, number>>>({})
  const [updated, setUpdated] = useState<Record<string, string>>({})
  const [loadingLevels, setLoadingLevels] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [domain, setDomain] = useState<WIDADomainKey | undefined>(undefined)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [compare, setCompare] = useState<{ id: string; data: Record<string, Record<string, number>> } | null>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [guideTab, setGuideTab] = useState<'levels' | 'ccss' | 'index'>('levels')
  const [assessing, setAssessing] = useState(false)

  const ids = useMemo(() => students.map(s => s.id), [students])

  const loadLevels = useCallback(async () => {
    if (!ids.length) { setLevels({}); setUpdated({}); setLoadingLevels(false); return }
    setLoadingLevels(true)
    const { data } = await supabase.from('student_wida_levels').select('student_id, domain, wida_level, updated_at').in('student_id', ids)
    const m: Record<string, Record<string, number>> = {}; const u: Record<string, string> = {}
    ;(data || []).forEach((r: any) => { (m[r.student_id] ||= {})[r.domain] = Number(r.wida_level); if (r.updated_at && (!u[r.student_id] || r.updated_at > u[r.student_id])) u[r.student_id] = r.updated_at })
    setLevels(m); setUpdated(u); setLoadingLevels(false)
  }, [ids])
  useEffect(() => { loadLevels() }, [loadLevels])

  const loadSnapshots = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('wida_snapshots').select('id, label, created_at').eq('english_class', cls).eq('student_grade', gr).order('created_at', { ascending: false })
      if (!error) setSnapshots((data as Snapshot[]) || [])
    } catch {}
  }, [cls, gr])
  useEffect(() => { loadSnapshots(); setCompare(null); setSelected(null); setDomain(undefined) }, [loadSnapshots])

  useEffect(() => {
    if (tab !== 'progress' || !ids.length) return
    setLoadingHistory(true)
    ;(async () => {
      const { data } = await supabase.from('student_wida_history').select('student_id, domain, wida_level, recorded_at').in('student_id', ids).order('recorded_at', { ascending: true })
      setHistory(data || []); setLoadingHistory(false)
    })()
  }, [tab, ids, levels])

  // /wida?student=<id> (from the student page) lands on that student.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('assess')) setAssessing(true)
    const id = params.get('student')
    if (!id) { if (params.get('assess')) window.history.replaceState(null, '', '/wida'); return }
    ;(async () => {
      const { data } = await supabase.from('students').select('id, grade, english_class').eq('id', id).single()
      if (!data) return
      setGr(data.grade as Grade); setCls(data.english_class as EnglishClass); setTab('levels')
      setTimeout(() => setSelected(data.id), 0)
      window.history.replaceState(null, '', '/wida')
    })()
  }, [])

  const overallOf = (sid: string) => { const vals = WIDA_DOMAINS.map(d => levels[sid]?.[d]).filter((v): v is number => !!v); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }
  const setCount = students.filter(s => WIDA_DOMAINS.every(d => levels[s.id]?.[d])).length

  const saveSnapshot = async () => {
    const label = await promptDialog({ title: ko ? '스냅샷 이름' : 'Name this snapshot', message: ko ? '나중에 비교할 때 찾기 쉽게' : 'A label helps you find it later when comparing.', placeholder: ko ? '예: 2학기 중간' : 'e.g. Fall midterm', confirmLabel: ko ? '저장' : 'Save snapshot' })
    if (!label) return
    const { error } = await supabase.from('wida_snapshots').insert({ english_class: cls, student_grade: gr, label, snapshot_data: JSON.stringify(levels), created_by: currentTeacher?.id })
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast(ko ? '스냅샷 저장됨' : 'Snapshot saved'); loadSnapshots()
  }
  const toggleCompare = async (id: string) => {
    if (compare?.id === id) { setCompare(null); return }
    const { data } = await supabase.from('wida_snapshots').select('snapshot_data').eq('id', id).single()
    try { setCompare({ id, data: JSON.parse(data?.snapshot_data || '{}') }) } catch { showToast('Could not read that snapshot') }
  }
  const deleteSnapshot = async (id: string) => {
    if (!await confirmDialog({ title: ko ? '스냅샷을 삭제할까요?' : 'Delete this snapshot?', message: ko ? '되돌릴 수 없습니다.' : 'This cannot be undone. Levels are not affected.', danger: true, confirmLabel: 'Delete' })) return
    const { error } = await supabase.from('wida_snapshots').delete().eq('id', id)
    if (error) { showToast(`Error: ${error.message}`); return }
    if (compare?.id === id) setCompare(null)
    loadSnapshots()
  }
  const printOnePager = () => {
    const win = window.open('', '_blank'); if (!win) return
    const rows = students.map((s, i) => {
      const cells = WIDA_DOMAINS.map(d => { const lv = levels[s.id]?.[d] || 0; return `<td style="text-align:center;padding:6px;font-weight:600">${lv ? `${lv} ${widaLevelName(lv)}` : '—'}</td>` }).join('')
      const o = overallOf(s.id)
      return `<tr><td style="padding:6px;color:#777">${i + 1}</td><td style="padding:6px;font-weight:500">${s.english_name} <span style="color:#777;font-size:10px">${s.korean_name}</span></td>${cells}<td style="text-align:center;padding:6px;font-weight:700">${o != null ? o.toFixed(1) : '—'}</td></tr>`
    }).join('')
    win.document.write(`<!DOCTYPE html><html><head><title>WIDA · ${cls} Grade ${gr}</title><style>body{font-family:Georgia,serif;padding:24px;max-width:900px;margin:0 auto;color:#1a1a1a}h1{font-size:20px;font-weight:normal;margin:0}p{color:#666;font-size:12px}table{width:100%;border-collapse:collapse;margin-top:14px;font-family:-apple-system,sans-serif;font-size:12px}th{text-align:left;padding:6px;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#666;border-bottom:1px solid #1a1a1a}td{border-bottom:1px solid #ddd}@page{size:A4 landscape;margin:15mm}</style></head><body><h1>WIDA levels · ${cls} · Grade ${gr}</h1><p>Printed ${new Date().toLocaleDateString()} · ${students.length} students · 1 Entering · 2 Emerging · 3 Developing · 4 Expanding · 5 Bridging · 6 Reaching</p><table><thead><tr><th>#</th><th>Student</th>${WIDA_DOMAINS.map(d => `<th style="text-align:center">${DOMAIN_LABEL[d][0]}</th>`).join('')}<th style="text-align:center">Overall</th></tr></thead><tbody>${rows}</tbody></table></body></html>`)
    win.document.close(); win.print()
  }

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const selectedStudent = students.find(s => s.id === selected) || null
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-4">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">{cls} · {ko ? `${gr}학년` : `Grade ${gr}`} · {students.length} {ko ? '명' : 'students'}{students.length ? ` · ${setCount} ${ko ? '명 완료' : 'fully leveled'}` : ''}</p>
          <h1 className="font-display text-[34px] leading-none text-ink">WIDA</h1>
        </div>
        {tab === 'levels' && !assessing && (
          <div className="flex items-center gap-2">
            <button data-guide="wida.assess" onClick={() => setAssessing(true)} disabled={!students.length} className="inline-flex items-center gap-1.5 h-9 px-4 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-50"><ListChecks size={14} />{ko ? '반 전체 평가' : 'Assess the class'}</button>
            <button onClick={printOnePager} className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink"><Printer size={14} />{ko ? '인쇄' : 'Print'}</button>
            <button onClick={saveSnapshot} className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink"><Camera size={14} />{ko ? '스냅샷 저장' : 'Save snapshot'}</button>
          </div>
        )}
      </div>
      {assessing ? (
        loadingStudents ? <div className="py-12 text-center"><Loader2 size={18} className="animate-spin text-ink-3 mx-auto" /></div>
          : <WidaAssessSheet key={`${cls}-${gr}`} students={students} grade={gr} startStudentId={selected} onExit={() => { setAssessing(false); loadLevels() }} onSaved={loadLevels} />
      ) : (<>
      <div className="flex border-b border-rule-2 mb-4">
        {([['levels', ko ? '수준' : 'Levels'], ['progress', ko ? '변화' : 'Progress'], ['scaffolds', ko ? '스캐폴드' : 'Scaffolds'], ['guide', ko ? '안내' : 'Guide']] as [Tab, string][]).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`relative px-4 h-10 text-[13.5px] font-medium ${tab === id ? 'text-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-2'}`}>{l}{tab === id && <span className="absolute left-4 right-4 bottom-0 h-[2px] bg-accent" />}</button>
        ))}
      </div>
      {tab !== 'guide' && tab !== 'scaffolds' && (
        <div className="flex items-center gap-3 flex-wrap mb-5">
          <div className="flex gap-1.5">{GRADES.map(g => <button key={g} onClick={() => setGr(g)} className={chip(gr === g)}>{ko ? `${g}학년` : `Gr ${g}`}</button>)}</div>
          <span className="w-px h-6 bg-rule" />
          {classes.length > 1 ? <div className="flex gap-1.5">{classes.map(c => <button key={c} onClick={() => setCls(c)} className={chip(cls === c)}>{c}</button>)}</div> : <span className="text-[13px] font-semibold text-ink">{cls}</span>}
        </div>
      )}

      {tab === 'levels' && (
        <div className="grid grid-cols-[minmax(0,1fr)_440px] gap-6 items-start">
          <div>
            {snapshots.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap mb-3 text-[12px]">
                <span className="text-ink-3">{ko ? '비교:' : 'Compare with:'}</span>
                {snapshots.map(sn => (
                  <span key={sn.id} className={`inline-flex items-center rounded-full border ${compare?.id === sn.id ? 'bg-ink text-paper border-ink' : 'bg-surface border-rule-2 text-ink-2'}`}>
                    <button onClick={() => toggleCompare(sn.id)} className="h-7 pl-2.5 pr-1.5">{sn.label} <span className="opacity-60">{fmt(sn.created_at)}</span></button>
                    <button onClick={() => deleteSnapshot(sn.id)} title={ko ? '삭제' : 'Delete snapshot'} className="h-7 pr-2 pl-0.5 opacity-60 hover:opacity-100 hover:text-bad"><Trash2 size={11} /></button>
                  </span>
                ))}
              </div>
            )}
            {loadingStudents || loadingLevels ? <div className="py-12 text-center"><Loader2 size={18} className="animate-spin text-ink-3 mx-auto" /></div>
              : !students.length ? <div className="border border-rule-2 rounded-lg p-8 text-center text-[13px] text-ink-3">{ko ? '이 반에 학생이 없습니다.' : `No students in ${cls} Grade ${gr}.`}</div> : (
              <div className="border border-rule-2 rounded-lg overflow-hidden">
                <table className="w-full text-[12.5px] tabular-nums">
                  <thead><tr className="bg-paper-2 border-b border-rule-2">
                    <th className="text-left px-4 py-2.5 eyebrow font-semibold">{ko ? '학생' : 'Student'}</th>
                    {WIDA_DOMAINS.map(d => <th key={d} className="text-center px-2 py-2.5 eyebrow font-semibold w-[104px]">{DOMAIN_LABEL[d][ko ? 1 : 0]}</th>)}
                    <th className="text-center px-2 py-2.5 eyebrow font-semibold w-[72px]">{ko ? '평균' : 'Overall'}</th>
                    <th className="text-right px-4 py-2.5 eyebrow font-semibold w-[84px]">{ko ? '수정' : 'Updated'}</th>
                  </tr></thead>
                  <tbody className="divide-y divide-rule">
                    {students.map(s => {
                      const on = selected === s.id
                      const o = overallOf(s.id)
                      return (
                        <tr key={s.id} className={`cursor-pointer ${on ? 'bg-paper-2' : 'hover:bg-paper-2/60'}`} onClick={() => { setSelected(s.id); setDomain(undefined) }}>
                          <td className={`px-4 py-1.5 ${on ? 'border-l-2 border-accent' : 'border-l-2 border-transparent'}`}><span className="text-ink font-medium">{s.english_name}</span><span className="text-[11px] text-ink-3 ml-1.5">{s.korean_name}</span></td>
                          {WIDA_DOMAINS.map(d => {
                            const lv = levels[s.id]?.[d] || 0
                            const prev = compare?.data[s.id]?.[d] || 0
                            const diff = compare && prev ? lv - prev : null
                            return (
                              <td key={d} className="px-1.5 py-1 text-center">
                                <button onClick={e => { e.stopPropagation(); setSelected(s.id); setDomain(d) }} title={ko ? `${DOMAIN_LABEL[d][1]} 질문에 답하기` : `Answer the ${DOMAIN_LABEL[d][0].toLowerCase()} can-do questions`}
                                  className={`w-full h-9 rounded border ${on && domain === d ? 'border-accent' : 'border-transparent'} ${lv ? LEVEL_TONE[Math.floor(lv)] : 'text-ink-3 hover:bg-paper-2'} hover:border-ink-3`}>
                                  <span className="font-display text-[17px] leading-none">{lv || '—'}</span>{lv ? <span className="block text-[9.5px] uppercase tracking-wider leading-none mt-0.5 opacity-80">{widaLevelName(lv)}</span> : null}
                                  {diff != null && diff !== 0 && <span className={`block text-[10px] font-bold leading-none ${diff > 0 ? 'text-good' : 'text-bad'}`}>{diff > 0 ? `+${diff}` : diff}</span>}
                                </button>
                              </td>
                            )
                          })}
                          <td className="px-2 py-1.5 text-center font-semibold text-ink">{o != null ? o.toFixed(1) : <span className="text-ink-3">—</span>}</td>
                          <td className="px-4 py-1.5 text-right text-[11.5px] text-ink-3">{updated[s.id] ? fmt(updated[s.id]) : ''}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-[11px] text-ink-3 mt-2">{WIDA_LEVELS.map(l => `${l.level} ${l.name}`).join(' · ')} · {ko ? '칸을 클릭하면 그 영역의 질문이 열립니다.' : 'Click a cell for one domain, or “Assess the class” to go student by student.'}</p>
          </div>

          <div className="border border-rule-2 rounded-lg p-5 sticky top-[120px]">
            {selectedStudent ? (
              <>
                <div className="flex items-baseline justify-between gap-3 mb-4">
                  <h2 className="font-display text-[24px] leading-none text-ink">{selectedStudent.english_name}<span className="font-sans text-[12.5px] text-ink-3 ml-2">{selectedStudent.korean_name}</span></h2>
                  <a href={`/students/${selectedStudent.id}`} className="text-[12px] text-ink-3 hover:text-ink whitespace-nowrap">{ko ? '학생 페이지 →' : 'Student page →'}</a>
                </div>
                <WidaSupport key={selectedStudent.id} studentId={selectedStudent.id} grade={selectedStudent.grade} initialDomain={domain} onSaved={loadLevels} />
              </>
            ) : (
              <div className="py-10 text-center">
                <p className="text-[14px] text-ink">{ko ? '왼쪽에서 학생을 고르세요.' : 'Pick a student on the left.'}</p>
                <p className="text-[12.5px] text-ink-3 mt-1.5 max-w-[300px] mx-auto">{ko ? '영역 칸을 클릭하면 그 영역의 “할 수 있어요” 질문이 열리고, 체크한 내용으로 수준을 제안합니다.' : 'Click a domain cell to open its can-do checklist. Tick what the student does and a level is suggested. Scaffolds and history live here too.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'progress' && <WidaTimeline students={students} historyData={history} currentLevels={levels} loading={loadingStudents || loadingHistory} lang={lang} />}

      {tab === 'scaffolds' && <AssignScaffolds />}

      {tab === 'guide' && (
        <div>
          <div className="flex gap-1.5 mb-5">
            {([['levels', ko ? 'WIDA 수준' : 'The six levels'], ['ccss', 'WIDA vs CCSS'], ['index', ko ? '스캐폴드 색인' : 'Scaffold index']] as const).map(([id, l]) => <button key={id} onClick={() => setGuideTab(id)} className={chip(guideTab === id)}>{l}</button>)}
          </div>
          {guideTab === 'levels' && <WIDAOverview />}
          {guideTab === 'ccss' && <WIDAvsCCSS />}
          {guideTab === 'index' && <ScaffoldIndex />}
        </div>
      )}
      </>)}
    </div>
  )
}
