'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { QuestionMapItem } from '@/types'
import { isChoiceItem } from '@/lib/answerKey'
import { LEVEL_LABELS, LEVEL_LABELS_KO } from '@/components/curriculum/rubric-library'
import { CCSS_STANDARDS } from '@/components/curriculum/ccss-standards'
import { plainName } from '@/components/curriculum/standards-plain'
import { AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react'

// ─── Analysis view for a scored assessment ───────────────────────
// The morning-after questions: how did the class do, which questions
// went wrong and why, which standards need reteaching and for whom, and
// on a writing task which criterion was the weak spot. Everything is
// computed from the same responses the sheet edits, so it updates as
// papers are marked.

interface StudentRow { id: string; english_name: string; korean_name: string }
interface Resp { answer?: string; points?: number; levels?: Record<string, number> }
type Bands = { above: number; on: number; approaching: number }

interface Props {
  map: QuestionMapItem[]
  students: StudentRow[]
  responses: Record<string, Record<number, Resp>>
  flags: Record<string, { absent?: boolean; exempt?: boolean } | undefined>
  letters: string[]
  maxScore: number
  englishClass?: string
  lang: string
  onOpenStudent: (idx: number) => void
}

const hasRubric = (q: QuestionMapItem) => q.type === 'rubric' && !!q.rubric?.criteria?.length

export default function AssessmentAnalysis({ map, students, responses, flags, letters, maxScore, englishClass, lang, onOpenStudent }: Props) {
  const ko = lang === 'ko'
  const levelLabels = ko ? LEVEL_LABELS_KO : LEVEL_LABELS
  const [bands, setBands] = useState<Bands>({ above: 86, on: 71, approaching: 61 })
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data } = await supabase.from('app_settings').select('value').eq('key', 'mastery_thresholds').single()
        if (!cancelled && data?.value && englishClass) { const saved = JSON.parse(data.value); if (saved[englishClass]?.above != null) setBands(saved[englishClass]) }
      } catch {}
    })()
    return () => { cancelled = true }
  }, [englishClass])
  const [openItem, setOpenItem] = useState<number | null>(null)
  const [openStd, setOpenStd] = useState<string | null>(null)

  const tone = (p: number | null) => p == null ? 'text-ink-3' : p >= bands.on ? 'text-good' : p >= bands.approaching ? 'text-warn' : 'text-bad'
  const bandOf = (p: number): 'above' | 'on' | 'approaching' | 'below' => p >= bands.above ? 'above' : p >= bands.on ? 'on' : p >= bands.approaching ? 'approaching' : 'below'
  const bandLabel: Record<string, string> = { above: ko ? '우수' : 'Above', on: ko ? '도달' : 'On target', approaching: ko ? '근접' : 'Approaching', below: ko ? '미달' : 'Below' }
  const bandBg: Record<string, string> = { above: 'bg-good', on: 'bg-good-soft', approaching: 'bg-warn-soft', below: 'bg-bad-soft' }
  const bandText: Record<string, string> = { above: 'text-white', on: 'text-good', approaching: 'text-warn', below: 'text-bad' }
  const idxOf = (sid: string) => students.findIndex(s => s.id === sid)
  const nameOf = (sid: string) => students.find(s => s.id === sid)?.english_name || ''

  const d = useMemo(() => {
    const answered = (sid: string, it: QuestionMapItem) => { const r = responses[sid]?.[it.num]; if (!r) return false; if (hasRubric(it)) return it.rubric!.criteria.some(c => r.levels?.[c.key] != null); return isChoiceItem(it) ? !!r.answer : r.points != null }
    const scored = students.filter(s => !flags[s.id]?.absent && !flags[s.id]?.exempt && map.some(it => answered(s.id, it)))
    const totalOf = (sid: string) => map.reduce((n, it) => n + (responses[sid]?.[it.num]?.points || 0), 0)
    const pctOf = (sid: string) => maxScore ? (totalOf(sid) / maxScore) * 100 : 0
    const ranked = [...scored].sort((a, b) => totalOf(b.id) - totalOf(a.id))
    const third = Math.floor(ranked.length / 3)
    const top = new Set(ranked.slice(0, third).map(s => s.id))
    const bottom = new Set(ranked.slice(ranked.length - third).map(s => s.id))
    const pcts = ranked.map(s => pctOf(s.id))
    const sorted = [...pcts].sort((a, b) => a - b)
    const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : null
    const mean = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null
    const buckets = [{ label: '<50', lo: 0, hi: 50 }, { label: '50s', lo: 50, hi: 60 }, { label: '60s', lo: 60, hi: 70 }, { label: '70s', lo: 70, hi: 80 }, { label: '80s', lo: 80, hi: 90 }, { label: '90+', lo: 90, hi: 101 }]
      .map(b => ({ ...b, students: ranked.filter(s => { const p = pctOf(s.id); return p >= b.lo && p < b.hi }) }))
    const bandCounts = { above: 0, on: 0, approaching: 0, below: 0 } as Record<string, number>
    ranked.forEach(s => { bandCounts[bandOf(pctOf(s.id))]++ })

    // Item analysis. Discrimination compares the top and bottom thirds:
    // an item the strong students missed as often as the weak ones is
    // either untaught or badly written.
    const items = map.filter(it => !hasRubric(it)).map(it => {
      const rs = scored.map(s => ({ s, r: responses[s.id]?.[it.num] })).filter(x => x.r && (isChoiceItem(it) ? x.r.answer : x.r.points != null))
      const earned = rs.reduce((a, x) => a + (x.r!.points || 0), 0)
      const pct = rs.length ? (earned / (rs.length * it.max_points)) * 100 : null
      const grp = (set: Set<string>) => { const g = rs.filter(x => set.has(x.s.id)); return g.length ? g.reduce((a, x) => a + (x.r!.points || 0), 0) / (g.length * it.max_points) : null }
      const pTop = third >= 2 ? grp(top) : null, pBottom = third >= 2 ? grp(bottom) : null
      const disc = pTop != null && pBottom != null ? pTop - pBottom : null
      const missed = rs.filter(x => isChoiceItem(it) ? x.r!.answer !== it.answer_key : (x.r!.points || 0) < it.max_points / 2).map(x => x.s.id)
      const wrong = isChoiceItem(it) ? letters.concat(it.type === 'true_false' ? ['T', 'F'] : []).filter(L => L !== it.answer_key).map(L => ({ L, n: rs.filter(x => x.r!.answer === L).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n)[0] || null : null
      const flag: null | 'everyone' | 'flat' | 'popular' = pct == null || rs.length < 4 ? null
        : pct < 40 ? 'everyone'
        : disc != null && disc < 0.1 && pct < 80 ? 'flat'
        : wrong && wrong.n >= Math.max(3, rs.length * 0.4) ? 'popular' : null
      return { it, n: rs.length, pct, disc, missed, wrong, flag }
    })

    // Standards: class percent, and each student's own percent on that
    // standard so the class can be split into bands with names.
    const perStd: Record<string, { earned: number; possible: number; byStudent: Record<string, { e: number; p: number }> }> = {}
    const addStd = (code: string, sid: string, e: number, p: number) => { const x = (perStd[code] ||= { earned: 0, possible: 0, byStudent: {} }); x.earned += e; x.possible += p; const b = (x.byStudent[sid] ||= { e: 0, p: 0 }); b.e += e; b.p += p }
    map.forEach(it => {
      scored.forEach(s => {
        const r = responses[s.id]?.[it.num]; if (!r) return
        if (hasRubric(it)) { it.rubric!.criteria.forEach(c => { const lv = r.levels?.[c.key]; if (lv == null) return; const code = c.standard || it.standard; if (code) addStd(code, s.id, lv, 4) }); return }
        if (!it.standard) return
        if (isChoiceItem(it) ? !r.answer : r.points == null) return
        addStd(it.standard, s.id, r.points || 0, it.max_points)
      })
    })
    const standards = Object.entries(perStd).map(([code, x]) => {
      const pct = x.possible ? (x.earned / x.possible) * 100 : null
      const groups: Record<string, string[]> = { above: [], on: [], approaching: [], below: [] }
      Object.entries(x.byStudent).forEach(([sid, b]) => { if (b.p) groups[bandOf((b.e / b.p) * 100)].push(sid) })
      const nQ = map.filter(it => it.standard === code || (hasRubric(it) && it.rubric!.criteria.some(c => (c.standard || it.standard) === code))).length
      return { code, pct, groups, nQ, possible: x.possible }
    }).sort((a, b) => (a.pct ?? 101) - (b.pct ?? 101))

    // Rubric items: each criterion's average and level spread.
    const rubrics = map.filter(hasRubric).map(it => {
      const crits = it.rubric!.criteria.map(c => {
        const vals = scored.map(s => responses[s.id]?.[it.num]?.levels?.[c.key]).filter((v): v is number => v != null)
        const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
        const spread = [0, 1, 2, 3, 4].map(n => vals.filter(v => v === n).length)
        const low = scored.filter(s => { const v = responses[s.id]?.[it.num]?.levels?.[c.key]; return v != null && v <= 1 }).map(s => s.id)
        return { c, avg, spread, n: vals.length, low }
      })
      const weakest = crits.filter(x => x.avg != null).sort((a, b) => a.avg! - b.avg!)[0] || null
      return { it, crits, weakest }
    })

    return { scored: ranked, totalOf, pctOf, median, mean, buckets, bandCounts, items, standards, rubrics, third }
  }, [map, students, responses, flags, letters, maxScore, bands]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!d.scored.length) return <div className="border border-rule-2 rounded-lg p-10 text-center text-[13px] text-ink-3">{ko ? '채점된 답안지가 아직 없습니다. 답안지를 몇 장 채점하면 분석이 나타납니다.' : 'No papers scored yet. Mark a few on the answer sheet and the analysis appears here.'}</div>

  const names = (ids: string[]) => (
    <span className="flex flex-wrap gap-1">
      {ids.map(sid => <button key={sid} onClick={() => onOpenStudent(idxOf(sid))} className="h-6 px-2 rounded-full border border-rule-2 bg-surface text-[11.5px] text-ink hover:border-ink-3">{nameOf(sid)}</button>)}
    </span>
  )
  const stdRow = (code: string) => CCSS_STANDARDS.find(x => x.code === code)
  const maxBucket = Math.max(1, ...d.buckets.map(b => b.students.length))
  const flagText: Record<string, string> = {
    everyone: ko ? '대부분 틀림 · 다시 가르칠 내용' : 'Most of the class missed it. Reteach.',
    flat: ko ? '상위권과 하위권이 비슷하게 틀림 · 문항 자체를 확인' : 'Top and bottom students missed it alike. Check the question or the teaching.',
    popular: ko ? '오답 하나에 몰림 · 흔한 오개념' : 'One wrong answer drew the class. A shared misconception.',
  }

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
        {/* Distribution */}
        <section className="border border-rule-2 rounded-lg p-4">
          <div className="flex items-baseline justify-between mb-3"><span className="eyebrow">{ko ? '점수 분포' : 'How the class did'}</span><span className="text-[11.5px] text-ink-3">{d.scored.length} {ko ? '명 채점' : 'scored'}</span></div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div><span className="font-display text-[26px] text-ink tabular-nums leading-none">{d.median != null ? Math.round(d.median) : '—'}<span className="text-[13px] text-ink-3">%</span></span><span className="block text-[11px] text-ink-3 mt-1">{ko ? '중앙값' : 'median'}</span></div>
            <div><span className="font-display text-[26px] text-ink tabular-nums leading-none">{d.mean != null ? Math.round(d.mean) : '—'}<span className="text-[13px] text-ink-3">%</span></span><span className="block text-[11px] text-ink-3 mt-1">{ko ? '평균' : 'average'}</span></div>
            <div><span className={`font-display text-[26px] tabular-nums leading-none ${d.bandCounts.below ? 'text-bad' : 'text-ink'}`}>{d.bandCounts.below}</span><span className="block text-[11px] text-ink-3 mt-1">{ko ? `미달 (${bands.approaching}% 미만)` : `below ${bands.approaching}%`}</span></div>
          </div>
          <div className="grid grid-cols-6 gap-1.5 items-end h-[96px]">
            {d.buckets.map(b => {
              const n = b.students.length
              const t = b.hi <= bands.approaching ? 'bg-bad' : b.hi <= bands.on ? 'bg-warn' : 'bg-good'
              return (
                <div key={b.label} className="flex flex-col items-center justify-end h-full gap-1" title={b.students.map(s => s.english_name).join(', ')}>
                  <span className="text-[11px] tabular-nums text-ink-2">{n || ''}</span>
                  <div className={`w-full rounded-sm ${n ? t : 'bg-paper-3'}`} style={{ height: n ? `${Math.max(6, (n / maxBucket) * 64)}px` : '3px' }} />
                  <span className="text-[10.5px] text-ink-3 tabular-nums">{b.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3 text-[11px] text-ink-3 flex-wrap">
            {(['above', 'on', 'approaching', 'below'] as const).map(k => <span key={k} className="inline-flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${bandBg[k]} ${k === 'above' ? '' : 'border border-rule-2'}`} />{bandLabel[k]} <span className="tabular-nums text-ink">{d.bandCounts[k]}</span></span>)}
          </div>
          <div className="mt-3 pt-3 border-t border-rule grid gap-1 text-[12px]">
            <div className="flex justify-between"><span className="text-ink-3">{ko ? '최고' : 'Highest'}</span><span className="text-ink tabular-nums">{d.scored[0]?.english_name} · {Math.round(d.pctOf(d.scored[0].id))}%</span></div>
            <div className="flex justify-between"><span className="text-ink-3">{ko ? '최저' : 'Lowest'}</span><span className="text-ink tabular-nums">{d.scored[d.scored.length - 1]?.english_name} · {Math.round(d.pctOf(d.scored[d.scored.length - 1].id))}%</span></div>
          </div>
        </section>

        {/* Standards */}
        <section className="border border-rule-2 rounded-lg p-4">
          <div className="flex items-baseline justify-between mb-3"><span className="eyebrow">{ko ? '기준별 도달' : 'Standards mastery'}</span><span className="text-[11.5px] text-ink-3">{ko ? '낮은 순 · 클릭하면 학생 이름' : 'weakest first · click for names'}</span></div>
          {!d.standards.length ? <p className="text-[12.5px] text-ink-3">{ko ? '이 평가에는 태그된 기준이 없습니다. 평가 편집에서 문항에 기준을 태그하면 여기에 나타납니다.' : 'No standards are tagged on this assessment. Tag questions and they show up here.'}</p> : (
            <div className="divide-y divide-rule">
              {d.standards.map(s => {
                const open = openStd === s.code
                const total = Object.values(s.groups).reduce((n, g) => n + g.length, 0) || 1
                return (
                  <div key={s.code} className="py-2">
                    <button onClick={() => setOpenStd(open ? null : s.code)} className="w-full grid grid-cols-[16px_88px_minmax(0,1fr)_120px_44px] gap-2 items-center text-left">
                      <span className="text-ink-3">{open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}</span>
                      <span className="font-mono text-[11px] text-info">{s.code}</span>
                      <span className="text-[12.5px] text-ink truncate" title={stdRow(s.code)?.text}>{plainName(s.code)}<span className="text-ink-3"> · {s.nQ} {ko ? '문항' : s.nQ === 1 ? 'question' : 'questions'}</span></span>
                      <span className="flex h-2.5 rounded-sm overflow-hidden bg-paper-3">
                        {(['above', 'on', 'approaching', 'below'] as const).map(k => s.groups[k].length ? <span key={k} className={`${bandBg[k]} ${k === 'above' ? '' : 'border-r border-surface'}`} style={{ width: `${(s.groups[k].length / total) * 100}%` }} title={`${bandLabel[k]} ${s.groups[k].length}`} /> : null)}
                      </span>
                      <span className={`text-right text-[12.5px] font-semibold tabular-nums ${tone(s.pct)}`}>{s.pct != null ? `${Math.round(s.pct)}%` : '—'}</span>
                    </button>
                    {open && (
                      <div className="mt-2 ml-6 grid gap-1.5 text-[12px]">
                        <p className="text-ink-3 leading-snug">{stdRow(s.code)?.text}</p>
                        {(['below', 'approaching', 'on', 'above'] as const).filter(k => s.groups[k].length).map(k => (
                          <div key={k} className="grid grid-cols-[96px_minmax(0,1fr)] gap-2 items-start"><span className={`inline-flex h-6 items-center px-2 rounded ${bandBg[k]} ${bandText[k]} text-[11px] font-semibold w-fit`}>{bandLabel[k]} · {s.groups[k].length}</span>{names(s.groups[k])}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>

      {/* Item analysis */}
      {d.items.length > 0 && (
        <section className="border border-rule-2 rounded-lg overflow-hidden">
          <div className="flex items-baseline justify-between px-4 py-3 border-b border-rule-2 bg-paper-2/60"><span className="eyebrow">{ko ? '문항 분석' : 'Question by question'}</span><span className="text-[11.5px] text-ink-3">{d.third >= 2 ? (ko ? '변별도 = 상위 ⅓ 정답률 − 하위 ⅓ 정답률' : 'Spread = top third minus bottom third. Near zero on a hard question means the strong students missed it too.') : (ko ? '6명 이상 채점되면 변별도가 표시됩니다' : 'Spread appears once six or more papers are scored.')}</span></div>
          <table className="w-full text-[12.5px] tabular-nums">
            <thead><tr className="text-left text-ink-3 border-b border-rule">
              <th className="px-4 py-1.5 font-medium eyebrow w-[52px]">Q</th><th className="px-2 py-1.5 font-medium eyebrow">{ko ? '기준' : 'Standard'}</th><th className="px-2 py-1.5 font-medium eyebrow text-right w-[72px]">{ko ? '정답률' : 'Correct'}</th><th className="px-2 py-1.5 font-medium eyebrow w-[120px]">{ko ? '흔한 오답' : 'Common wrong'}</th><th className="px-2 py-1.5 font-medium eyebrow text-right w-[64px]">{ko ? '변별' : 'Spread'}</th><th className="px-2 py-1.5 font-medium eyebrow">{ko ? '주의' : 'Watch'}</th>
            </tr></thead>
            <tbody className="divide-y divide-rule">
              {d.items.map(x => {
                const open = openItem === x.it.num
                return (
                  <>
                    <tr key={x.it.num} onClick={() => setOpenItem(open ? null : x.it.num)} className={`cursor-pointer hover:bg-paper-2 ${x.flag ? 'bg-warn-soft/30' : ''}`}>
                      <td className="px-4 py-1.5 text-ink font-medium">Q{x.it.num}<span className="text-ink-3 font-normal text-[11px]"> {x.it.answer_key ? x.it.answer_key : `${x.it.max_points}pt`}</span></td>
                      <td className="px-2 py-1.5 text-ink-2 truncate max-w-[320px]">{x.it.standard ? <><span className="font-mono text-[11px] text-info mr-1.5">{x.it.standard}</span>{plainName(x.it.standard)}</> : <span className="text-ink-3">—</span>}</td>
                      <td className={`px-2 py-1.5 text-right font-semibold ${tone(x.pct)}`}>{x.pct != null ? `${Math.round(x.pct)}%` : '—'}</td>
                      <td className="px-2 py-1.5 text-ink-2">{x.wrong ? <><span className="font-bold text-bad">{x.wrong.L}</span> <span className="text-ink-3">× {x.wrong.n}</span></> : x.n ? <span className="text-ink-3">{isChoiceItem(x.it) ? (ko ? '없음' : 'none') : `${x.missed.length} ${ko ? '명 절반 미만' : 'under half'}`}</span> : ''}</td>
                      <td className={`px-2 py-1.5 text-right ${x.disc != null && x.disc < 0.1 && (x.pct ?? 100) < 80 ? 'text-warn font-semibold' : 'text-ink-3'}`}>{x.disc != null ? `${x.disc >= 0 ? '+' : ''}${Math.round(x.disc * 100)}` : ''}</td>
                      <td className="px-2 py-1.5 text-[11.5px] text-ink-2">{x.flag ? <span className="inline-flex items-center gap-1.5"><AlertTriangle size={12} className="text-warn" />{flagText[x.flag]}</span> : ''}</td>
                    </tr>
                    {open && (
                      <tr key={`${x.it.num}-open`} className="bg-paper-2/50"><td colSpan={6} className="px-4 py-2.5">
                        <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-2 items-start text-[12px]">
                          <span className="text-ink-3">{ko ? '틀린 학생' : isChoiceItem(x.it) ? 'Got it wrong' : 'Under half marks'} · {x.missed.length}</span>
                          {x.missed.length ? names(x.missed) : <span className="text-ink-3">{ko ? '없음' : 'nobody'}</span>}
                        </div>
                      </td></tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </section>
      )}

      {/* Rubric criteria */}
      {d.rubrics.map(({ it, crits, weakest }) => (
        <section key={it.num} className="border border-rule-2 rounded-lg p-4">
          <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
            <span className="eyebrow">Q{it.num} · {it.rubric!.name}</span>
            {weakest && weakest.avg != null && <span className="text-[12px] text-ink-2">{ko ? '가장 약한 기준: ' : 'Weak spot: '}<span className="font-semibold text-ink">{weakest.c.label}</span> · {weakest.avg.toFixed(1)} {ko ? '평균' : 'average'}</span>}
          </div>
          <div className="grid gap-2">
            {crits.map(({ c, avg, spread, n, low }) => (
              <div key={c.key} className="grid grid-cols-[180px_minmax(0,1fr)_56px_minmax(0,1fr)] gap-3 items-center text-[12.5px]">
                <span className={`truncate ${weakest?.c.key === c.key ? 'font-semibold text-ink' : 'text-ink'}`} title={c.label}>{c.label}{c.standard && <span className="block font-mono text-[10.5px] text-info">{c.standard}</span>}</span>
                <span className="flex h-3 rounded-sm overflow-hidden bg-paper-3" title={spread.map((k, i) => `${levelLabels[i]} ${k}`).join(' · ')}>
                  {spread.map((k, i) => k ? <span key={i} className={`flex items-center justify-center text-[9px] font-bold ${i === 0 ? 'bg-ink-3 text-paper' : i === 1 ? 'bg-bad text-white' : i === 2 ? 'bg-warn text-white' : i === 3 ? 'bg-good text-white' : 'bg-ink text-paper'}`} style={{ width: `${(k / Math.max(1, n)) * 100}%` }}>{i}</span> : null)}
                </span>
                <span className={`text-right font-semibold tabular-nums ${avg == null ? 'text-ink-3' : avg < 2 ? 'text-bad' : avg < 3 ? 'text-warn' : 'text-good'}`}>{avg != null ? avg.toFixed(1) : '—'}</span>
                <span className="text-[11.5px] text-ink-3 min-w-0">{low.length ? <span className="flex items-center gap-1.5 flex-wrap"><span>{ko ? '0–1점:' : 'At 0 or 1:'}</span>{names(low)}</span> : ''}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-ink-3 mt-3">{ko ? '막대는 각 단계에 있는 학생 수입니다 (0–4).' : 'Each bar shows how many students landed on each level, 0 to 4.'}</p>
        </section>
      ))}
    </div>
  )
}
