'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CCSS_STANDARDS, CCSS_DOMAINS, type CcssStandard, type CCSSDomain } from '@/components/curriculum/ccss-standards'
import { SKILLS, SKILL_GROUPS, familyOf, plainName } from '@/components/curriculum/standards-plain'
import { useApp } from '@/lib/context'

// ─── Standard picker ─────────────────────────────────────────────
// Ask what the students did, not what the code is. Every standard has a
// plain name and belongs to a skill family with the words teachers type
// ("characters", "main idea", "vowels"); the code and official text stay as
// the reference. Standards this class has used before sort to the top.
//
// Teachers who already know the standards get a second view, By code: every
// standard for the grade in code order with the official text, by strand.
// The picker remembers which view was used last.

const STRAND_ORDER: CCSSDomain[] = ['RL', 'RI', 'RF', 'W', 'SL', 'L']

const DOMAIN_GROUPS: Record<string, string[]> = {
  reading: ['Reading stories', 'Reading information'], phonics: ['Phonics and word reading', 'Fluency'],
  writing: ['Writing'], speaking: ['Speaking and listening'], language: ['Grammar', 'Capitals, punctuation, spelling', 'Vocabulary and word meaning'],
}

interface Props { grade: number; domain?: string; englishClass?: string; onPick: (s: CcssStandard) => void; onClose: () => void }

export default function StandardPicker({ grade, domain, englishClass, onPick, onClose }: Props) {
  const { language: lang } = useApp()
  const [q, setQ] = useState('')
  const [gradeSel, setGradeSel] = useState<number | 'all'>(grade)
  const [group, setGroup] = useState<string | 'all'>('all')
  const [used, setUsed] = useState<Record<string, number>>({})
  const [hi, setHi] = useState(0)
  const ko = lang === 'ko'
  const [view, setView] = useState<'skill' | 'code'>(() => { try { return localStorage.getItem('daewoo_std_picker_view') === 'code' ? 'code' : 'skill' } catch { return 'skill' } })
  const switchView = (v: 'skill' | 'code') => { setView(v); setHi(0); try { localStorage.setItem('daewoo_std_picker_view', v) } catch {} }
  const [strand, setStrand] = useState<CCSSDomain | 'all'>('all')

  // How often this class has tagged each code, across its assessments.
  useEffect(() => {
    if (!englishClass) return
    supabase.from('assessments').select('standards, question_map').eq('english_class', englishClass).then(({ data }) => {
      const counts: Record<string, number> = {}
      ;(data || []).forEach((a: any) => {
        const codes = new Set<string>()
        ;(a.standards || []).forEach((s: any) => s?.code && codes.add(s.code))
        ;(a.question_map || []).forEach((qm: any) => qm?.standard && codes.add(qm.standard))
        codes.forEach(c => { counts[c] = (counts[c] || 0) + 1 })
      })
      setUsed(counts)
    })
  }, [englishClass])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const suggestedGroups = domain ? DOMAIN_GROUPS[domain] || [] : []

  const { usedHits, otherHits } = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const score = (st: CcssStandard): number => {
      if (words.length === 0) return 1
      const fam = SKILLS[familyOf(st.code)]
      const name = plainName(st.code).toLowerCase()
      const syn = (fam?.synonyms || []).join(' ').toLowerCase()
      const hay = `${st.code.toLowerCase()} ${name} ${syn} ${st.cluster.toLowerCase()} ${st.text.toLowerCase()}`
      let s = 0
      for (const w of words) {
        if (st.code.toLowerCase().replace(/\./g, '') === w.replace(/\./g, '')) s += 100
        else if (name.includes(w)) s += 10
        else if (syn.includes(w)) s += 6
        else if (hay.includes(w)) s += 2
        else return 0
      }
      return s
    }
    const rows = CCSS_STANDARDS
      .filter(st => gradeSel === 'all' || st.grade === gradeSel)
      .filter(st => group === 'all' ? (suggestedGroups.length === 0 || words.length > 0 || suggestedGroups.includes(SKILLS[familyOf(st.code)]?.group || '')) : SKILLS[familyOf(st.code)]?.group === group)
      .map(st => ({ st, s: score(st), n: used[st.code] || 0 }))
      .filter(x => x.s > 0)
      .sort((a, b) => b.s - a.s || b.n - a.n || a.st.code.localeCompare(b.st.code, undefined, { numeric: true }))
    return { usedHits: rows.filter(x => x.n > 0).slice(0, 12), otherHits: rows.filter(x => x.n === 0).slice(0, 60) }
  }, [q, gradeSel, group, used, suggestedGroups])

  // By code: the grade's standards in order, narrowed by strand and by
  // whatever is typed (a code with or without dots, or a word in the text).
  const codeRows = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const norm = (s: string) => s.toLowerCase().replace(/\./g, '')
    return CCSS_STANDARDS
      .filter(st => gradeSel === 'all' || st.grade === gradeSel)
      .filter(st => strand === 'all' || st.domain === strand)
      .filter(st => words.every(w => norm(st.code).includes(norm(w)) || st.text.toLowerCase().includes(w) || plainName(st.code).toLowerCase().includes(w) || st.cluster.toLowerCase().includes(w)))
      .sort((a, b) => STRAND_ORDER.indexOf(a.domain) - STRAND_ORDER.indexOf(b.domain) || a.grade - b.grade || a.code.localeCompare(b.code, undefined, { numeric: true }))
      .map((st, i) => ({ st, n: used[st.code] || 0, i }))
  }, [q, gradeSel, strand, used])

  const all: { st: CcssStandard }[] = view === 'code' ? codeRows : [...usedHits, ...otherHits]
  const chip = (on: boolean) => `px-2 h-6 rounded-full border text-[11px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const groupBtn = (on: boolean) => `w-full text-left px-2.5 py-1.5 rounded text-[12.5px] ${on ? 'bg-surface text-ink font-semibold shadow-[inset_3px_0_0_rgb(var(--accent))]' : 'text-ink-2 hover:bg-surface/70'}`

  const CodeRow = ({ st, n, idx }: { st: CcssStandard; n: number; idx: number }) => (
    <button onMouseEnter={() => setHi(idx)} onClick={() => onPick(st)} className={`w-full text-left px-4 py-2 grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 ${hi === idx ? 'bg-paper-2' : ''}`}>
      <span className="font-mono text-[12px] font-semibold text-info pt-0.5">{st.code}</span>
      <span className="min-w-0">
        <span className="block text-[13px] text-ink leading-snug">{st.text}</span>
        <span className="block text-[11px] text-ink-3 mt-0.5">{plainName(st.code)} · {st.cluster}{n > 0 ? ` · ${ko ? `이 반에서 ${n}회 사용` : `used on ${n} ${n === 1 ? 'assessment' : 'assessments'} in ${englishClass}`}` : ''}</span>
      </span>
    </button>
  )
  const Row = ({ st, n, idx }: { st: CcssStandard; n: number; idx: number }) => (
    <button onMouseEnter={() => setHi(idx)} onClick={() => onPick(st)} className={`w-full text-left px-4 py-2.5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 ${hi === idx ? 'bg-paper-2' : ''}`}>
      <span className="text-[14px] font-semibold text-ink leading-snug">{plainName(st.code)}</span>
      <span className="font-mono text-[11px] text-info bg-info-soft px-1.5 py-0.5 rounded self-start">{st.code}</span>
      <span className="text-[12px] text-ink-2 leading-snug col-span-2">{st.text}</span>
      <span className="text-[11px] text-ink-3 col-span-2">{SKILLS[familyOf(st.code)]?.name}{n > 0 ? ` · ${lang === 'ko' ? `이 반에서 ${n}회 사용` : `used on ${n} ${n === 1 ? 'assessment' : 'assessments'} in ${englishClass}`}` : ''}</span>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-4xl h-[85vh] grid grid-rows-[auto_minmax(0,1fr)]" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 border-b border-rule">
          <input autoFocus id="std-search" value={q} onChange={e => { setQ(e.target.value); setHi(0) }}
            placeholder={view === 'code' ? (ko ? '코드나 단어로 찾기, 예: RL.3.1, 주제' : 'A code or a word, e.g. RL.3.1 or main idea') : (ko ? '학생들이 무엇을 했나요? 예: 등장인물, 주제, 모음, 의견…' : 'What did the students do? e.g. characters, main idea, vowels, opinion…')}
            onKeyDown={e => { if (e.key === 'Enter' && all[hi]) onPick(all[hi].st); if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, all.length - 1)) } if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) } }}
            className="w-full h-10 px-3 bg-paper-2 border border-rule-2 rounded text-[14px] text-ink placeholder:text-ink-3" />
          <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
            <span className="eyebrow mr-1">{lang === 'ko' ? '학년' : 'Grade'}</span>
            {[0, 1, 2, 3, 4, 5].map(g => <button key={g} onClick={() => setGradeSel(g)} className={chip(gradeSel === g)}>{g === 0 ? 'K' : g}</button>)}
            <button onClick={() => setGradeSel('all')} className={chip(gradeSel === 'all')}>{lang === 'ko' ? '전체' : 'All'}</button>
            <span className="ml-auto inline-flex border border-rule-2 rounded overflow-hidden" title={ko ? '기능별: 쉬운 이름으로 찾기 · 코드순: 모든 기준을 코드 순서대로' : 'By skill: plain names, grouped by what the students did · By code: every standard in order with the official text'}>
              <button onClick={() => switchView('skill')} className={`h-7 px-2.5 text-[11.5px] font-medium ${view === 'skill' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}>{ko ? '기능별' : 'By skill'}</button>
              <button onClick={() => switchView('code')} className={`h-7 px-2.5 text-[11.5px] font-medium border-l border-rule-2 ${view === 'code' ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}>{ko ? '코드순' : 'By code'}</button>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[210px_minmax(0,1fr)] min-h-0">
          <div className="border-r border-rule-2 bg-paper-2 p-2.5 overflow-y-auto">
            {view === 'code' ? (<>
              <p className="eyebrow px-2.5 mb-1">{ko ? '영역' : 'Strand'}</p>
              <button onClick={() => { setStrand('all'); setHi(0) }} className={groupBtn(strand === 'all')}>{ko ? '전체' : 'All strands'}</button>
              {CCSS_DOMAINS.map(d => <button key={d.key} onClick={() => { setStrand(d.key); setHi(0) }} className={groupBtn(strand === d.key)}><span className="font-mono text-[11px] text-info mr-1.5">{d.key}</span>{d.label}</button>)}
              <p className="text-[11px] text-ink-3 px-2.5 mt-3 leading-snug">{ko ? '선택한 학년의 모든 기준을 코드 순서로, 공식 문구와 함께 보여줍니다.' : 'Every standard for the chosen grade, in code order, with the official wording.'}</p>
            </>) : (<>
            <p className="eyebrow px-2.5 mb-1">{lang === 'ko' ? '기능별 찾기' : 'Browse by skill'}</p>
            <button onClick={() => setGroup('all')} className={groupBtn(group === 'all')}>{suggestedGroups.length && !q ? (lang === 'ko' ? `${domain} 관련` : `For ${domain}`) : (lang === 'ko' ? '전체' : 'All')}</button>
            {SKILL_GROUPS.map(g => <button key={g} onClick={() => setGroup(g)} className={groupBtn(group === g)}>{g}</button>)}
            {group !== 'all' && (
              <div className="mt-3 px-2.5">
                <p className="eyebrow mb-1">{lang === 'ko' ? '이 그룹의 기능' : 'Skills in this group'}</p>
                {Object.entries(SKILLS).filter(([, f]) => f.group === group).map(([k, f]) => <button key={k} onClick={() => setQ(f.name)} className="block text-left text-[11.5px] text-ink-2 hover:text-ink py-0.5 leading-snug">{f.name}</button>)}
              </div>
            )}
            </>)}
          </div>
          <div className="overflow-y-auto">
            {all.length === 0 && <p className="px-5 py-6 text-[13px] text-ink-3">{lang === 'ko' ? '일치하는 기준이 없습니다. 다른 말로 검색하거나 학년을 바꿔 보세요.' : 'Nothing matches. Try another word, another grade, or All.'}</p>}
            {view === 'code' && STRAND_ORDER.filter(d => codeRows.some(r => r.st.domain === d)).map(d => (
              <div key={d}>
                <p className="eyebrow px-4 pt-3 pb-1 bg-surface sticky top-0"><span className="font-mono text-info mr-1.5">{d}</span>{CCSS_DOMAINS.find(x => x.key === d)?.label}</p>
                <div className="divide-y divide-rule">{codeRows.filter(r => r.st.domain === d).map(r => <CodeRow key={r.st.code} st={r.st} n={r.n} idx={r.i} />)}</div>
              </div>
            ))}
            {view === 'skill' && <>
            {usedHits.length > 0 && <p className="eyebrow px-4 pt-3 pb-1 bg-surface sticky top-0">{lang === 'ko' ? `${englishClass}에서 사용한 기준` : `Used before in ${englishClass}`}</p>}
            <div className="divide-y divide-rule">{usedHits.map((x, i) => <Row key={x.st.code} st={x.st} n={x.n} idx={i} />)}</div>
            {usedHits.length > 0 && otherHits.length > 0 && <p className="eyebrow px-4 pt-3 pb-1 bg-surface sticky top-0">{lang === 'ko' ? '다른 기준' : 'Other matches'}</p>}
            <div className="divide-y divide-rule">{otherHits.map((x, i) => <Row key={x.st.code} st={x.st} n={0} idx={usedHits.length + i} />)}</div>
            </>}
          </div>
        </div>
      </div>
    </div>
  )
}
