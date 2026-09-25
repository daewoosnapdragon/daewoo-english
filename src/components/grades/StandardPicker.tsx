'use client'

import { useMemo, useState } from 'react'
import { CCSS_STANDARDS, CCSS_DOMAINS, type CcssStandard } from '@/components/curriculum/ccss-standards'

// ─── Standard picker ─────────────────────────────────────────────
// A search over the CCSS list scoped to the class's grade (and one below),
// returning one code. The plain-language layer lands on top of this next.

const DOMAIN_FOR: Record<string, string[]> = {
  reading: ['RL', 'RI'], phonics: ['RF'], writing: ['W'], speaking: ['SL'], language: ['L'],
}

export default function StandardPicker({ grade, domain, onPick, onClose }: { grade: number; domain?: string; onPick: (s: CcssStandard) => void; onClose: () => void }) {
  const [q, setQ] = useState('')
  const [allGrades, setAllGrades] = useState(false)
  const [dom, setDom] = useState<string>(domain && DOMAIN_FOR[domain] ? 'suggested' : 'all')

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase()
    return CCSS_STANDARDS.filter(st => {
      if (!allGrades && st.grade !== grade && st.grade !== grade - 1) return false
      if (dom === 'suggested' && domain && !DOMAIN_FOR[domain].includes(st.domain)) return false
      if (dom !== 'all' && dom !== 'suggested' && st.domain !== dom) return false
      if (!s) return true
      return st.code.toLowerCase().includes(s) || st.text.toLowerCase().includes(s) || st.cluster.toLowerCase().includes(s)
    }).slice(0, 40)
  }, [q, allGrades, dom, grade, domain])

  const chip = (on: boolean) => `px-2 h-6 rounded-full border text-[11px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-surface border border-rule-2 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 pt-4 pb-3 border-b border-rule">
          <input autoFocus id="std-search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search a standard: code, words, or cluster…"
            onKeyDown={e => { if (e.key === 'Escape') onClose(); if (e.key === 'Enter' && hits[0]) onPick(hits[0]) }}
            className="w-full h-10 px-3 bg-paper-2 border border-rule-2 rounded text-[14px] text-ink placeholder:text-ink-3" />
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {domain && DOMAIN_FOR[domain] && <button onClick={() => setDom('suggested')} className={chip(dom === 'suggested')}>For {domain}</button>}
            <button onClick={() => setDom('all')} className={chip(dom === 'all')}>All</button>
            {CCSS_DOMAINS.map(d => <button key={d.key} onClick={() => setDom(d.key)} className={chip(dom === d.key)}>{d.key} · {d.label}</button>)}
            <span className="w-px h-6 bg-rule mx-1" />
            <button onClick={() => setAllGrades(v => !v)} className={chip(allGrades)}>{allGrades ? 'All grades' : `Grade ${grade}${grade > 0 ? ` and ${grade - 1}` : ''}`}</button>
          </div>
        </div>
        <div className="overflow-y-auto divide-y divide-rule">
          {hits.length === 0 && <p className="px-5 py-6 text-[13px] text-ink-3">Nothing matches. Try fewer words, or turn on all grades.</p>}
          {hits.map(st => (
            <button key={st.code} onClick={() => onPick(st)} className="w-full text-left px-5 py-2.5 hover:bg-paper-2 grid grid-cols-[84px_1fr] gap-3 items-start">
              <span className="font-mono text-[11.5px] text-info bg-info-soft px-1.5 py-0.5 rounded self-start">{st.code}</span>
              <span className="min-w-0">
                <span className="text-[13px] text-ink leading-snug block">{st.text}</span>
                <span className="text-[11px] text-ink-3">{st.cluster} · Grade {st.grade === 0 ? 'K' : st.grade}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
