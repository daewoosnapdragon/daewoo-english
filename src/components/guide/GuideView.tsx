'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { QUICK_START, GUIDE_SECTIONS, ADMIN_SECTIONS, WORKFLOWS, DEFINITIONS, type GuideSection } from '@/content/guide'
import { startTour } from '@/lib/tour'
import { Printer } from 'lucide-react'

// ─── How to use this app ─────────────────────────────────────────
// A rail of sections, the quick start on top, one block per page with the
// same five parts, then the workflows that cross pages, definitions, and the
// admin chapter. Every task can "Show me" on the live screen.

export default function GuideView() {
  const { currentTeacher } = useApp()
  const router = useRouter()
  const isAdmin = currentTeacher?.role === 'admin'
  const [active, setActive] = useState('quick-start')
  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  // The rail follows the section in view.
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide-section]'))
    const io = new IntersectionObserver(entries => { const hit = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (hit) setActive((hit.target as HTMLElement).dataset.guideSection!) }, { rootMargin: '-120px 0px -70% 0px' })
    els.forEach(el => io.observe(el)); return () => io.disconnect()
  }, [])
  useEffect(() => { const id = window.location.hash.slice(1); if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 100) }, [])

  const rail = (id: string, label: string, sub?: string) => (
    <a key={id} href={`#${id}`} className={`block px-3 py-1.5 rounded text-[13px] ${active === id ? 'bg-paper-2 text-ink font-semibold' : 'text-ink-2 hover:text-ink'}`}>{label}{sub && <span className="block text-[10.5px] text-ink-3 font-normal">{sub}</span>}</a>
  )
  const Section = ({ s }: { s: GuideSection }) => (
    <section id={s.id} data-guide-section={s.id} className="scroll-mt-[120px] border-t border-rule-2 pt-6 pb-10">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="font-display text-[28px] leading-none text-ink">{s.title}</h2>
        <span className="text-[11.5px] text-ink-3">Updated {fmt(s.updated)}</span>
      </div>
      <p className="text-[14.5px] text-ink-2 mt-2 max-w-[65ch]">{s.purpose}</p>
      <h3 className="eyebrow mt-6 mb-2">The screen</h3>
      <ol className="grid gap-1.5 max-w-[70ch]">{s.screen.map((t, i) => <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[13.5px] text-ink leading-snug"><span className="text-ink-3 tabular-nums">{i + 1}.</span><span>{t}</span></li>)}</ol>
      <h3 className="eyebrow mt-6 mb-2">Common tasks</h3>
      <div className="grid gap-4 max-w-[70ch]">
        {s.tasks.map(t => (
          <div key={t.title} className="border border-rule-2 rounded-md px-4 py-3">
            <div className="flex items-baseline justify-between gap-3"><h4 className="text-[14px] font-semibold text-ink">{t.title}</h4>{t.tour && <button onClick={() => startTour(t.tour!, p => router.push(p))} className="text-[12px] text-accent hover:underline whitespace-nowrap">Show me</button>}</div>
            <ol className="grid gap-1 mt-2">{t.steps.map((st, i) => <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[13.5px] text-ink leading-snug"><span className="text-ink-3 tabular-nums">{i + 1}.</span><span>{st}</span></li>)}</ol>
          </div>
        ))}
      </div>
      {s.rules.length > 0 && <><h3 className="eyebrow mt-6 mb-2">The rules behind it</h3><ul className="grid gap-1.5 max-w-[70ch]">{s.rules.map((t, i) => <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[13.5px] text-ink leading-snug"><span className="text-ink-3">·</span><span>{t}</span></li>)}</ul></>}
      {s.watchOut.length > 0 && <><h3 className="eyebrow mt-6 mb-2">Watch out for</h3><ul className="grid gap-1.5 max-w-[70ch]">{s.watchOut.map((t, i) => <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[13.5px] text-ink-2 leading-snug"><span className="text-warn">!</span><span>{t}</span></li>)}</ul></>}
    </section>
  )

  return (
    <div className="px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-6 flex-wrap mb-6">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">Daewoo English</p>
          <h1 className="font-display text-[34px] leading-none text-ink">How to use this app</h1>
        </div>
        <div className="flex items-center gap-3 text-[13px] no-print">
          <Link href="/whats-new" className="text-ink-2 hover:text-ink">What’s new →</Link>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded border border-rule-2 text-ink-2 hover:text-ink"><Printer size={13} />Print</button>
        </div>
      </div>
      <div className="grid grid-cols-[200px_minmax(0,1fr)] gap-10">
        <nav className="no-print sticky top-[120px] self-start max-h-[calc(100vh-140px)] overflow-y-auto pr-2 -ml-3">
          {rail('quick-start', 'Your first week')}
          <p className="eyebrow px-3 mt-4 mb-1">Pages</p>
          {GUIDE_SECTIONS.map(s => rail(s.id, s.title))}
          <p className="eyebrow px-3 mt-4 mb-1">Across pages</p>
          {rail('workflows', 'Workflows')}
          {rail('definitions', 'Definitions')}
          {isAdmin && <><p className="eyebrow px-3 mt-4 mb-1">Admin</p>{ADMIN_SECTIONS.map(s => rail(s.id, s.title))}</>}
        </nav>
        <div className="min-w-0">
          <section id="quick-start" data-guide-section="quick-start" className="scroll-mt-[120px] pb-10">
            <h2 className="font-display text-[28px] leading-none text-ink">{QUICK_START.title}</h2>
            <p className="text-[14.5px] text-ink-2 mt-2 max-w-[65ch]">Six things, in order. Everything else can wait until you need it.</p>
            <ol className="grid gap-2 mt-4 max-w-[70ch]">{QUICK_START.steps.map((t, i) => <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-[14px] text-ink leading-snug"><span className="font-display text-[18px] text-accent tabular-nums leading-none">{i + 1}</span><span>{t}</span></li>)}</ol>
          </section>
          {GUIDE_SECTIONS.map(s => <Section key={s.id} s={s} />)}
          <section id="workflows" data-guide-section="workflows" className="scroll-mt-[120px] border-t border-rule-2 pt-6 pb-10">
            <h2 className="font-display text-[28px] leading-none text-ink">Workflows across pages</h2>
            <p className="text-[14.5px] text-ink-2 mt-2 max-w-[65ch]">The real jobs usually span several pages. Each is a checklist that links into the sections above.</p>
            <div className="grid gap-4 mt-5 md:grid-cols-2">
              {WORKFLOWS.map(w => (
                <div key={w.id} id={w.id} className="border border-rule-2 rounded-md px-4 py-3">
                  <h4 className="text-[14px] font-semibold text-ink">{w.title}</h4><p className="text-[11.5px] text-ink-3">{w.when}</p>
                  <ol className="grid gap-1 mt-2">{w.steps.map((st, i) => <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[13px] text-ink leading-snug"><span className="text-ink-3 tabular-nums">{i + 1}.</span><span>{st}</span></li>)}</ol>
                </div>
              ))}
            </div>
          </section>
          <section id="definitions" data-guide-section="definitions" className="scroll-mt-[120px] border-t border-rule-2 pt-6 pb-10">
            <h2 className="font-display text-[28px] leading-none text-ink">Definitions</h2>
            <dl className="grid gap-3 mt-4 max-w-[70ch]">{DEFINITIONS.map(d => <div key={d.term} className="grid grid-cols-[180px_minmax(0,1fr)] gap-3 text-[13.5px]"><dt className="font-semibold text-ink">{d.term}</dt><dd className="text-ink-2 leading-snug">{d.text}</dd></div>)}</dl>
          </section>
          {isAdmin && <>
            <div className="border-t-2 border-ink pt-6 mt-2"><p className="eyebrow eyebrow-accent">Admin chapter</p><p className="text-[13.5px] text-ink-2 mt-1 max-w-[65ch]">The parts only admins see: settings, the calendar, people, and how changes reach teachers.</p></div>
            {ADMIN_SECTIONS.map(s => <Section key={s.id} s={s} />)}
          </>}
        </div>
      </div>
    </div>
  )
}
