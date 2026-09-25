'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { useStudents } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { ENGLISH_CLASSES, GRADES, type EnglishClass, type Grade } from '@/types'
import { getDisplayName } from '@/lib/utils'
import { plainName, skillOf } from '@/components/curriculum/standards-plain'
import { Loader2, X } from 'lucide-react'

// ─── Students × standards ────────────────────────────────────────
// Every standard the class has assessed this semester across the top, every
// student down the side, a cell per pair coloured by mastery. Evidence comes
// from the finest grain available: a question tagged with the standard (from
// the answer key), a rubric criterion carrying the standard, and otherwise the
// whole assessment's score for each standard it was tagged with. Click a cell
// to see exactly which questions and papers produced it.

interface Evidence { assessment: string; what: string; earned: number; possible: number }
interface Cell { earned: number; possible: number; evidence: Evidence[] }
type Bands = { above: number; on: number; approaching: number }

export default function StandardsHeatMap() {
  const { currentTeacher, language: lang, activeSemester } = useApp()
  const isAdmin = currentTeacher?.role === 'admin' || currentTeacher?.english_class === 'Admin'
  const [cls, setCls] = useState<EnglishClass>((currentTeacher?.english_class as EnglishClass) || 'Snapdragon')
  const [gr, setGr] = useState<Grade>(3)
  const { students, loading: loadingStudents } = useStudents({ grade: gr, english_class: cls })
  const [grid, setGrid] = useState<Record<string, Record<string, Cell>>>({})
  const [codes, setCodes] = useState<string[]>([])
  const [bands, setBands] = useState<Bands>({ above: 86, on: 71, approaching: 61 })
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<{ sid: string; code: string } | null>(null)

  useEffect(() => {
    if (loadingStudents) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const { data: settings } = await supabase.from('app_settings').select('value').eq('key', 'mastery_thresholds').single()
        if (settings?.value) { const saved = JSON.parse(settings.value); if (saved[cls]?.above != null) setBands(saved[cls]) }
      } catch {}
      let q = supabase.from('assessments').select('id, name, domain, max_score, standards, question_map, rubric').eq('english_class', cls).eq('grade', gr)
      if (activeSemester) q = q.eq('semester_id', activeSemester.id)
      const { data: assessments } = await q
      const list = (assessments || []) as any[]
      const ids = list.map(a => a.id)
      const { data: grades } = ids.length ? await supabase.from('grades').select('student_id, assessment_id, score, item_responses, rubric_scores, is_exempt, is_absent').in('assessment_id', ids) : { data: [] as any[] }
      if (cancelled) return
      const g: Record<string, Record<string, Cell>> = {}
      const seen = new Set<string>()
      const add = (sid: string, code: string, e: Evidence) => {
        const row = (g[sid] ||= {})
        const cell = (row[code] ||= { earned: 0, possible: 0, evidence: [] })
        cell.earned += e.earned; cell.possible += e.possible; cell.evidence.push(e); seen.add(code)
      }
      ;(grades || []).forEach((row: any) => {
        if (row.is_exempt || row.is_absent) return
        const a = list.find(x => x.id === row.assessment_id)
        if (!a) return
        const covered = new Set<string>()
        if (Array.isArray(row.item_responses)) {
          row.item_responses.forEach((ir: any) => {
            if (!ir.standard || ir.max == null) return
            if (!(ir.answer || ir.points != null)) return
            covered.add(ir.standard)
            add(row.student_id, ir.standard, { assessment: a.name, what: `Q${ir.q}`, earned: Number(ir.points) || 0, possible: Number(ir.max) || 0 })
          })
        }
        if (row.rubric_scores && a.rubric?.criteria) {
          a.rubric.criteria.forEach((c: any) => {
            const lv = row.rubric_scores[c.key]
            if (lv == null || !c.standard) return
            covered.add(c.standard)
            add(row.student_id, c.standard, { assessment: a.name, what: c.label, earned: Number(lv), possible: 4 })
          })
        }
        if (row.score != null && a.max_score > 0 && Array.isArray(a.standards)) {
          a.standards.forEach((s: any) => {
            if (!s?.code || covered.has(s.code)) return
            add(row.student_id, s.code, { assessment: a.name, what: lang === 'ko' ? '전체 점수' : 'whole assessment', earned: Number(row.score), possible: Number(a.max_score) })
          })
        }
      })
      setGrid(g)
      setCodes(Array.from(seen).sort((x, y) => x.localeCompare(y, undefined, { numeric: true })))
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [cls, gr, activeSemester?.id, loadingStudents, lang])

  const pct = (c?: Cell) => c && c.possible > 0 ? (c.earned / c.possible) * 100 : null
  const tone = (p: number | null) => p == null ? '' : p >= bands.above ? 'bg-good text-white' : p >= bands.on ? 'bg-good-soft text-good' : p >= bands.approaching ? 'bg-warn-soft text-warn' : 'bg-bad-soft text-bad'
  const colAvg = useMemo(() => Object.fromEntries(codes.map(code => {
    const ps = students.map(s => pct(grid[s.id]?.[code])).filter((p): p is number => p != null)
    return [code, ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null]
  })), [codes, students, grid])
  const rowAvg = (sid: string) => { const ps = codes.map(c => pct(grid[sid]?.[c])).filter((p): p is number => p != null); return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : null }
  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const openCell = open ? grid[open.sid]?.[open.code] : null
  const openStudent = open ? students.find(s => s.id === open.sid) : null

  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap mb-4">
        {isAdmin ? <div className="flex gap-1.5">{ENGLISH_CLASSES.filter(c => c !== 'Unplaced').map(c => <button key={c} onClick={() => setCls(c)} className={chip(cls === c)}>{c}</button>)}</div> : <span className="text-[13px] font-semibold text-ink">{cls}</span>}
        <span className="w-px h-6 bg-rule" />
        <div className="flex gap-1.5">{GRADES.map(g => <button key={g} onClick={() => setGr(g)} className={chip(gr === g)}>{lang === 'ko' ? `${g}학년` : `Grade ${g}`}</button>)}</div>
        <span className="ml-auto eyebrow">{activeSemester ? (lang === 'ko' ? activeSemester.name_ko || activeSemester.name : activeSemester.name) : ''}</span>
      </div>
      <div className="flex gap-4 text-[11.5px] text-ink-2 mb-3">
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-good" />{lang === 'ko' ? '우수' : 'Above'} ≥{bands.above}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-good-soft border border-good/30" />{lang === 'ko' ? '도달' : 'On'} ≥{bands.on}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-warn-soft border border-warn/30" />{lang === 'ko' ? '근접' : 'Approaching'} ≥{bands.approaching}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-bad-soft border border-bad/30" />{lang === 'ko' ? '미달' : 'Below'}</span>
        <span className="text-ink-3">{lang === 'ko' ? '· 셀을 클릭하면 근거가 보입니다' : '· click a cell for the questions behind it'}</span>
      </div>
      {loading || loadingStudents ? <div className="py-12 flex justify-center"><Loader2 size={18} className="animate-spin text-ink-3" /></div>
      : codes.length === 0 ? <p className="text-[13px] text-ink-3 py-8">{lang === 'ko' ? '이번 학기에 기준이 태그된 평가가 없습니다. 정답 키나 루브릭에 기준을 태그하면 여기에 표시됩니다.' : 'No standards-tagged assessments for this class this semester. Tag a standard on an answer key range or a rubric criterion and it appears here.'}</p>
      : (
        <div className="overflow-x-auto border border-rule-2 rounded-md">
          <table className="text-[12px] tabular-nums border-collapse">
            <thead>
              <tr className="bg-paper-2">
                <th className="sticky left-0 z-10 bg-paper-2 text-left px-3 py-2 eyebrow font-semibold min-w-[170px] border-b border-r border-rule-2">{lang === 'ko' ? '학생' : 'Student'}</th>
                {codes.map(code => (
                  <th key={code} className="px-1 py-2 border-b border-rule-2 min-w-[56px] align-bottom" title={`${plainName(code)}\n${skillOf(code)?.name || ''}`}>
                    <span className="block text-[10.5px] font-mono text-info">{code}</span>
                    <span className={`block text-[10px] mt-0.5 ${colAvg[code] != null && colAvg[code]! < bands.on ? 'text-bad font-semibold' : 'text-ink-3'}`}>{colAvg[code] != null ? `${Math.round(colAvg[code]!)}%` : ''}</span>
                  </th>
                ))}
                <th className="px-2 py-2 border-b border-l border-rule-2 eyebrow font-semibold text-right">{lang === 'ko' ? '평균' : 'Avg'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rule">
              {students.map(s => {
                const ra = rowAvg(s.id)
                return (
                  <tr key={s.id}>
                    <td className="sticky left-0 z-10 bg-surface px-3 py-1 border-r border-rule-2 whitespace-nowrap"><Link href={`/students/${s.id}`} className="text-ink hover:underline">{getDisplayName(s)}</Link><span className="text-ink-3 ml-1.5 text-[11px]">{s.korean_name}</span></td>
                    {codes.map(code => { const c = grid[s.id]?.[code]; const p = pct(c); return (
                      <td key={code} className="p-[3px]">
                        <button onClick={() => c && setOpen({ sid: s.id, code })} disabled={!c} title={c ? `${Math.round(p!)}% · ${c.evidence.length} ${c.evidence.length === 1 ? 'item' : 'items'}` : ''}
                          className={`w-full h-7 rounded-sm text-[11px] font-semibold ${c ? tone(p) : 'bg-paper-2/60 text-transparent'}`}>{c ? Math.round(p!) : '·'}</button>
                      </td>) })}
                    <td className={`px-2 py-1 border-l border-rule-2 text-right font-semibold ${ra != null && ra < bands.on ? 'text-bad' : 'text-ink'}`}>{ra != null ? `${Math.round(ra)}%` : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && openCell && openStudent && (
        <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={() => setOpen(null)}>
          <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-3.5 border-b border-rule-2 flex items-start justify-between gap-3">
              <div><p className="eyebrow">{open.code} · {getDisplayName(openStudent)}</p><h3 className="font-display text-[20px] leading-tight text-ink mt-1">{plainName(open.code)}</h3><p className="text-[12.5px] text-ink-2 mt-1">{Math.round(pct(openCell)!)}% · {openCell.earned} / {openCell.possible} {lang === 'ko' ? '점' : 'points'}</p></div>
              <button onClick={() => setOpen(null)} aria-label="Close" className="w-7 h-7 rounded hover:bg-paper-2 flex items-center justify-center text-ink-3 hover:text-ink"><X size={15} /></button>
            </div>
            <div className="overflow-y-auto divide-y divide-rule">
              {openCell.evidence.map((e, i) => (
                <div key={i} className="px-5 py-2 grid grid-cols-[1fr_auto] gap-3 text-[12.5px]">
                  <span className="min-w-0"><span className="text-ink">{e.what}</span><span className="block text-ink-3 truncate">{e.assessment}</span></span>
                  <span className={`tabular-nums font-semibold ${e.possible && e.earned / e.possible >= bands.on / 100 ? 'text-good' : 'text-bad'}`}>{e.earned} / {e.possible}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
