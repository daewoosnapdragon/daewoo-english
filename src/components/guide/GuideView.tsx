'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/context'
import { QUICK_START, ADMIN_SECTIONS, WORKFLOWS, WALKTHROUGHS, DEFINITIONS, guideSectionsFor, taskAnchor, type GuideSection, type GuideTask } from '@/content/guide'
import { startTour } from '@/lib/tour'
import { ChevronDown, Printer, Search, X } from 'lucide-react'

// ─── How to use this app ─────────────────────────────────────────
// The quick start on top, open; then one block per page in nav order, the
// step-by-step walkthroughs, the workflows that cross pages, definitions,
// and the admin chapter. Every block is closed until asked for, showing its
// how-to titles so a teacher can find the task without opening anything;
// the block the address names (/guide#grades, from Help or ⌘K) opens on
// arrival. A contents rail follows the page on a computer, a jump menu
// stands in for it on a phone, and the search box filters everything down
// to what mentions the words. Printing opens every block first.

type Block = { id: string; title: string }

const norm = (s: string) => s.toLowerCase()
const hit = (q: string, ...texts: (string | undefined)[]) => texts.some(t => t && norm(t).includes(q))
const taskHit = (q: string, t: GuideTask) => hit(q, t.title, ...t.steps)

export default function GuideView() {
  const { currentTeacher, language } = useApp()
  const ko = language === 'ko'
  const router = useRouter()
  const isAdmin = currentTeacher?.role === 'admin'
  const visible = useMemo(() => guideSectionsFor(currentTeacher), [currentTeacher])
  const pages = visible.filter(s => !ADMIN_SECTIONS.includes(s))
  const admin = visible.filter(s => ADMIN_SECTIONS.includes(s))

  const [open, setOpen] = useState<Set<string>>(new Set())
  const [printing, setPrinting] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState('quick-start')
  const query = norm(q.trim())
  const lastHash = useRef('')

  // Every block id the page has, and which block holds an anchor inside it
  // (a workflow card, a how-to), so a link to either opens the right block.
  const blockIds = useMemo(() => new Set(['quick-start', ...visible.map(s => s.id), ...WALKTHROUGHS.map(w => w.id), 'workflows', 'definitions']), [visible])
  const owner = useCallback((id: string): string | null => {
    if (blockIds.has(id)) return id
    if (WORKFLOWS.some(w => w.id === id)) return 'workflows'
    const sec = visible.find(s => id.startsWith(`${s.id}--`))
    return sec ? sec.id : null
  }, [blockIds, visible])

  // Open the block an anchor belongs to, then bring the anchor into view.
  const go = useCallback((id: string, push = false) => {
    const block = owner(id)
    if (!block) return
    if (push && window.location.hash !== `#${id}`) history.pushState(history.state, '', `#${id}`)
    lastHash.current = `#${id}`
    setOpen(prev => prev.has(block) ? prev : new Set(prev).add(block))
    // Twice: once the block has opened, and again after late content above it
    // (the notice board, a reminder band) has settled.
    const bring = () => document.getElementById(id)?.scrollIntoView({ block: 'start' })
    requestAnimationFrame(() => requestAnimationFrame(bring))
    setTimeout(bring, 450)
  }, [owner])

  // The address names a block on arrival, on Back/Forward, and when ⌘K or a
  // link moves to another #id on this page. The app's router changes the
  // hash without a hashchange event, so a click or Enter anywhere checks it.
  useEffect(() => {
    const sync = () => {
      const h = window.location.hash
      if (h === lastHash.current) return
      lastHash.current = h
      if (h.length > 1) go(decodeURIComponent(h.slice(1)))
    }
    sync()
    const later = () => setTimeout(sync, 60)
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    window.addEventListener('click', later, true)
    window.addEventListener('keyup', later, true)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
      window.removeEventListener('click', later, true)
      window.removeEventListener('keyup', later, true)
    }
  }, [go])

  // Printing shows everything; the closed blocks come back afterwards.
  useEffect(() => {
    const before = () => flushSync(() => setPrinting(true))
    const after = () => setPrinting(false)
    window.addEventListener('beforeprint', before)
    window.addEventListener('afterprint', after)
    return () => { window.removeEventListener('beforeprint', before); window.removeEventListener('afterprint', after) }
  }, [])

  // The rail follows the block in view.
  const blocksKey = `${query}|${visible.map(s => s.id).join()}`
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-guide-section]'))
    const io = new IntersectionObserver(entries => {
      const top = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (top) setActive((top.target as HTMLElement).dataset.guideSection!)
    }, { rootMargin: '-140px 0px -60% 0px' })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [blocksKey])

  const searching = query.length > 0
  const isOpen = (id: string) => printing || searching || open.has(id)
  const toggle = (id: string) => setOpen(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const allIds = [...visible.map(s => s.id), ...WALKTHROUGHS.map(w => w.id), 'workflows', 'definitions']
  const allOpen = allIds.every(id => open.has(id))

  // What the search leaves: a section whose name matches keeps everything,
  // otherwise only the how-tos and lines that mention the words.
  const filterSection = (s: GuideSection): GuideSection | null => {
    if (!searching || hit(query, s.title, s.purpose)) return s
    const tasks = s.tasks.filter(t => taskHit(query, t))
    const screen = s.screen.filter(t => hit(query, t))
    const rules = s.rules.filter(t => hit(query, t))
    const watchOut = s.watchOut.filter(t => hit(query, t))
    return tasks.length + screen.length + rules.length + watchOut.length ? { ...s, tasks, screen, rules, watchOut } : null
  }
  const shownPages = pages.map(filterSection).filter((s): s is GuideSection => !!s)
  const shownAdmin = admin.map(filterSection).filter((s): s is GuideSection => !!s)
  const shownWalks = WALKTHROUGHS.filter(w => !searching || hit(query, w.title, w.intro, ...w.rules, ...w.steps.flatMap(st => [st.title, ...st.text])))
  const shownFlows = WORKFLOWS.filter(w => !searching || hit(query, w.title, w.when, ...w.steps))
  const shownDefs = DEFINITIONS.filter(d => !searching || hit(query, d.term, d.text))
  const showQuick = !searching || hit(query, QUICK_START.title, ...QUICK_START.steps)
  const resultCount = shownPages.length + shownAdmin.length + shownWalks.length + (shownFlows.length ? 1 : 0) + (shownDefs.length ? 1 : 0) + (showQuick && searching ? 1 : 0)

  const toc: { label: string; items: Block[] }[] = [
    { label: '', items: showQuick ? [{ id: 'quick-start', title: ko ? '첫 주에 할 일' : QUICK_START.title }] : [] },
    { label: ko ? '페이지' : 'Pages', items: shownPages },
    { label: ko ? '단계별 안내' : 'Step by step', items: shownWalks },
    { label: ko ? '여러 페이지에 걸친 일' : 'Across pages', items: [...(shownFlows.length ? [{ id: 'workflows', title: ko ? '업무 흐름' : 'Workflows' }] : []), ...(shownDefs.length ? [{ id: 'definitions', title: ko ? '용어' : 'Definitions' }] : [])] },
    { label: ko ? '관리자' : 'Admin', items: shownAdmin },
  ]

  const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString(ko ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const listItem = 'grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[length:calc(13.5px*var(--ts))] leading-snug'
  const subhead = 'eyebrow mt-6 mb-2'

  // A block's header: the name is the button that opens and closes it.
  // These are called as functions, not mounted as components, so a click
  // does not rebuild the button and keyboard focus stays on it.
  const head = (id: string, title: string, sub?: string, meta?: string) => {
    const on = isOpen(id)
    return (
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="m-0">
            <button type="button" onClick={() => toggle(id)} aria-expanded={on} aria-controls={`${id}-body`} disabled={searching}
              className="group inline-flex items-baseline gap-2 text-left font-display text-[length:calc(24px*var(--ts))] leading-tight text-ink disabled:cursor-default">
              <span className="group-hover:underline group-disabled:no-underline underline-offset-4 decoration-1">{title}</span>
              <ChevronDown size={16} aria-hidden="true" className={`self-center flex-none text-ink-3 transition-transform no-print ${on ? 'rotate-180' : ''} ${searching ? 'hidden' : ''}`} />
            </button>
          </h2>
          {sub && <p className="text-[length:calc(13.5px*var(--ts))] text-ink-2 mt-1 max-w-[70ch] leading-snug">{sub}</p>}
        </div>
        {meta && <span className="flex-none mt-2 text-[length:calc(12px*var(--ts))] text-ink-3 tabular-nums whitespace-nowrap no-print">{meta}</span>}
      </div>
    )
  }

  // Closed, a block still lists its how-tos; each opens the block at that how-to.
  const taskIndex = (s: GuideSection) => s.tasks.length ? (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 max-w-[80ch] no-print">
      {s.tasks.map(t => (
        <li key={t.title}>
          <a href={`#${taskAnchor(s.id, t.title)}`} onClick={e => { e.preventDefault(); go(taskAnchor(s.id, t.title), true) }}
            className="text-[length:calc(13px*var(--ts))] text-ink-2 hover:text-ink underline decoration-rule-2 underline-offset-[3px] hover:decoration-ink-3">
            {t.title}
          </a>
        </li>
      ))}
    </ul>
  ) : null

  const howTos = (n: number) => ko ? `방법 ${n}가지` : `${n} how-to${n === 1 ? '' : 's'}`

  const section = (s: GuideSection) => {
    const on = isOpen(s.id)
    return (
      <section key={s.id} id={s.id} data-guide-section={s.id} className="scroll-mt-16 sm:scroll-mt-[132px] border-t border-rule-2 pt-5 pb-6">
        {head(s.id, s.title, s.purpose, howTos(s.tasks.length))}
        {!on && taskIndex(s)}
        {on && (
          <div id={`${s.id}-body`} className="mt-4">
            <div className="grid gap-3 max-w-[72ch]">
              {s.tasks.map(t => (
                <div key={t.title} id={taskAnchor(s.id, t.title)} className="scroll-mt-16 sm:scroll-mt-[132px] border border-rule-2 rounded-md px-4 py-3 bg-surface">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-[length:calc(14.5px*var(--ts))] font-semibold text-ink">{t.title}</h3>
                    {t.tour && <button type="button" onClick={() => startTour(t.tour!, p => router.push(p))} className="text-[length:calc(12.5px*var(--ts))] text-accent hover:underline whitespace-nowrap no-print">{ko ? '화면에서 보기' : 'Show me'}</button>}
                  </div>
                  <ol className="grid gap-1 mt-2">{t.steps.map((st, i) => <li key={i} className={`${listItem} text-ink`}><span className="text-ink-3 tabular-nums">{i + 1}.</span><span>{st}</span></li>)}</ol>
                </div>
              ))}
            </div>
            {s.screen.length > 0 && <>
              <h3 className={subhead}>{ko ? '화면 구성' : 'On the page'}</h3>
              <div className="grid gap-2 max-w-[70ch]">{s.screen.map((t, i) => <p key={i} className="text-[length:calc(13.5px*var(--ts))] text-ink-2 leading-relaxed">{t}</p>)}</div>
            </>}
            {s.rules.length > 0 && <>
              <h3 className={subhead}>{ko ? '알아 둘 것' : 'Good to know'}</h3>
              <ul className="grid gap-1.5 max-w-[70ch]">{s.rules.map((t, i) => <li key={i} className={`${listItem} text-ink`}><span className="text-ink-3" aria-hidden="true">·</span><span>{t}</span></li>)}</ul>
            </>}
            {s.watchOut.length > 0 && <>
              <h3 className={subhead}>{ko ? '주의' : 'Watch out for'}</h3>
              <ul className="grid gap-1.5 max-w-[70ch]">{s.watchOut.map((t, i) => <li key={i} className={`${listItem} text-ink-2`}><span className="text-warn font-semibold" aria-hidden="true">!</span><span>{t}</span></li>)}</ul>
            </>}
            <p className="mt-5 text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '수정' : 'Updated'} {fmt(s.updated)}</p>
          </div>
        )}
      </section>
    )
  }

  const railLink = (b: Block) => (
    <a key={b.id} href={`#${b.id}`} onClick={e => { e.preventDefault(); go(b.id, true) }} aria-current={active === b.id ? 'location' : undefined}
      className={`block px-3 py-1 rounded text-[length:calc(13px*var(--ts))] leading-snug ${active === b.id ? 'bg-paper-2 text-ink font-semibold' : 'text-ink-2 hover:text-ink'}`}>
      {b.title}
    </a>
  )

  return (
    <div className="px-4 sm:px-8 py-6 animate-fade-in">
      <div className="flex items-end justify-between gap-x-6 gap-y-3 flex-wrap mb-5">
        <div>
          <p className="eyebrow eyebrow-accent mb-1.5">Daewoo English</p>
          <h1 className="font-display text-[length:calc(34px*var(--ts))] leading-none text-ink">{ko ? '사용 안내' : 'How to use this app'}</h1>
          {ko && <p className="text-[length:calc(13px*var(--ts))] text-ink-2 mt-2">안내 내용은 영어로 되어 있습니다.</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[length:calc(13px*var(--ts))] no-print">
          <Link href="/whats-new" className="h-8 max-sm:h-11 inline-flex items-center px-2 text-ink-2 hover:text-ink">{ko ? '새로운 기능 →' : 'What’s new →'}</Link>
          <button type="button" onClick={() => setOpen(allOpen ? new Set() : new Set(allIds))} disabled={searching}
            className="h-8 max-sm:h-11 px-3 rounded border border-rule-2 text-ink-2 hover:text-ink disabled:opacity-40">
            {allOpen ? (ko ? '모두 접기' : 'Close all') : (ko ? '모두 펼치기' : 'Open all')}
          </button>
          <button type="button" onClick={() => window.print()} className="h-8 max-sm:h-11 inline-flex items-center gap-1.5 px-3 rounded border border-rule-2 text-ink-2 hover:text-ink"><Printer size={13} aria-hidden="true" />{ko ? '인쇄' : 'Print'}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[210px_minmax(0,1fr)] gap-x-10">
        <nav aria-label={ko ? '안내 목차' : 'Guide contents'} className="max-lg:hidden no-print sticky top-[132px] self-start max-h-[calc(100vh-150px)] overflow-y-auto pr-2 -ml-3 pb-6">
          {toc.filter(g => g.items.length).map((g, i) => (
            <div key={g.label || i} className={i ? 'mt-4' : ''}>
              {g.label && <p className="eyebrow px-3 mb-1">{g.label}</p>}
              {g.items.map(railLink)}
            </div>
          ))}
        </nav>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-6 no-print">
            <label className="relative flex-1 min-w-[220px] max-w-[420px]">
              <span className="sr-only">{ko ? '안내 검색' : 'Search the guide'}</span>
              <Search size={14} aria-hidden="true" className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
              <input type="search" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Escape' && q) { e.stopPropagation(); setQ('') } }}
                placeholder={ko ? '검색: 예) 출석 인쇄, rubric' : 'Search, e.g. print attendance, rubric'}
                className="w-full h-9 max-sm:h-11 pl-9 pr-9 bg-surface border border-rule-2 rounded text-[length:calc(13.5px*var(--ts))] text-ink placeholder:text-ink-3 focus:outline-none focus:border-ink-2" />
              {q && <button type="button" onClick={() => setQ('')} aria-label={ko ? '검색 지우기' : 'Clear search'} className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded flex items-center justify-center text-ink-3 hover:text-ink"><X size={14} /></button>}
            </label>
            <label className="lg:hidden flex-1 min-w-[200px] max-w-[420px]">
              <span className="sr-only">{ko ? '바로 가기' : 'Jump to'}</span>
              <select value="" onChange={e => { if (e.target.value) go(e.target.value, true) }}
                className="w-full h-9 max-sm:h-11 px-2 bg-surface border border-rule-2 rounded text-[length:calc(13.5px*var(--ts))] text-ink">
                <option value="">{ko ? '바로 가기…' : 'Jump to…'}</option>
                {toc.filter(g => g.items.length).map((g, i) => (
                  <optgroup key={g.label || i} label={g.label || (ko ? '시작' : 'Start')}>
                    {g.items.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
            {searching && <p role="status" className="w-full text-[length:calc(12.5px*var(--ts))] text-ink-3">
              {resultCount ? (ko ? `${resultCount}개 항목` : `${resultCount} ${resultCount === 1 ? 'place mentions' : 'places mention'} “${q.trim()}”`) : (ko ? `“${q.trim()}”에 맞는 내용이 없습니다. 다른 낱말로 찾아 보세요.` : `Nothing mentions “${q.trim()}”. Try another word, or press ⌘K to find a page or a student.`)}
            </p>}
          </div>

          {showQuick && (
            <section id="quick-start" data-guide-section="quick-start" className="scroll-mt-16 sm:scroll-mt-[132px] pb-8">
              <h2 className="font-display text-[length:calc(28px*var(--ts))] leading-none text-ink">{QUICK_START.title}</h2>
              <p className="text-[length:calc(14px*var(--ts))] text-ink-2 mt-2 max-w-[65ch]">Six things, in order. Everything else can wait until you need it.</p>
              <ol className="grid gap-2 mt-4 max-w-[70ch]">{QUICK_START.steps.map((t, i) => <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2 text-[length:calc(14px*var(--ts))] text-ink leading-snug"><span className="font-display text-[length:calc(18px*var(--ts))] text-accent tabular-nums leading-none">{i + 1}</span><span>{t}</span></li>)}</ol>
            </section>
          )}

          {shownPages.map(section)}

          {shownWalks.map(w => (
            <section key={w.id} id={w.id} data-guide-section={w.id} className="scroll-mt-16 sm:scroll-mt-[132px] border-t border-rule-2 pt-5 pb-6">
              {head(w.id, w.title, `${w.when}. ${ko ? '사진과 함께 한 단계씩.' : 'One screen at a time, with a picture per step.'}`, ko ? `${w.steps.length}단계` : `${w.steps.length} steps`)}
              {isOpen(w.id) && (
                <div id={`${w.id}-body`}>
                  <p className="text-[length:calc(14px*var(--ts))] text-ink-2 mt-4 max-w-[65ch] leading-relaxed">{w.intro}</p>
                  <div className="mt-4 max-w-[70ch] border border-rule-2 rounded-md px-4 py-3">
                    <p className="eyebrow mb-1.5">{ko ? '규칙' : 'The rules'}</p>
                    <ul className="grid gap-1.5">{w.rules.map((r, i) => <li key={i} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2 text-[length:calc(13px*var(--ts))] text-ink leading-snug"><span className="text-ink-3" aria-hidden="true">·</span><span>{r}</span></li>)}</ul>
                  </div>
                  <ol className="grid gap-8 mt-8">
                    {w.steps.map((st, i) => (
                      <li key={i} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-6 items-start">
                        <div className="min-w-0">
                          <h3 className="text-[length:calc(16px*var(--ts))] font-semibold text-ink leading-snug"><span className="text-ink-3 tabular-nums mr-2">{i + 1}.</span>{st.title}</h3>
                          <div className="grid gap-2 mt-2 max-w-[60ch]">{st.text.map((p, j) => <p key={j} className="text-[length:calc(13.5px*var(--ts))] text-ink-2 leading-relaxed">{p}</p>)}</div>
                        </div>
                        {st.image && (
                          <a href={st.image} target="_blank" rel="noreferrer" className="block min-w-0 border border-rule-2 rounded-md overflow-hidden bg-surface" title={ko ? '사진을 크게 열기' : 'Open the picture full size'}>
                            <img src={st.image} alt={st.alt || st.title} className="block w-full h-auto" loading="lazy" />
                          </a>
                        )}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-5 text-[length:calc(11.5px*var(--ts))] text-ink-3">{ko ? '수정' : 'Updated'} {fmt(w.updated)}</p>
                </div>
              )}
            </section>
          ))}

          {shownFlows.length > 0 && (
            <section id="workflows" data-guide-section="workflows" className="scroll-mt-16 sm:scroll-mt-[132px] border-t border-rule-2 pt-5 pb-6">
              {head('workflows', ko ? '여러 페이지에 걸친 일' : 'Workflows across pages', ko ? '실제 업무는 여러 페이지에 걸쳐 있습니다. 순서대로 따라 하는 목록입니다.' : 'The real jobs usually span several pages. Each is a checklist, in order.', ko ? `${shownFlows.length}가지` : `${shownFlows.length} workflows`)}
              {!isOpen('workflows') && (
                <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 no-print">
                  {shownFlows.map(w => <li key={w.id}><a href={`#${w.id}`} onClick={e => { e.preventDefault(); go(w.id, true) }} className="text-[length:calc(13px*var(--ts))] text-ink-2 hover:text-ink underline decoration-rule-2 underline-offset-[3px] hover:decoration-ink-3">{w.title}</a></li>)}
                </ul>
              )}
              {isOpen('workflows') && (
                <div id="workflows-body" className="grid gap-4 mt-4 md:grid-cols-2">
                  {shownFlows.map(w => (
                    <div key={w.id} id={w.id} className="scroll-mt-16 sm:scroll-mt-[132px] border border-rule-2 rounded-md px-4 py-3 bg-surface">
                      <h3 className="text-[length:calc(14.5px*var(--ts))] font-semibold text-ink">{w.title}</h3><p className="text-[length:calc(12px*var(--ts))] text-ink-3">{w.when}</p>
                      <ol className="grid gap-1 mt-2">{w.steps.map((st, i) => <li key={i} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-[length:calc(13px*var(--ts))] text-ink leading-snug"><span className="text-ink-3 tabular-nums">{i + 1}.</span><span>{st}</span></li>)}</ol>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {shownDefs.length > 0 && (
            <section id="definitions" data-guide-section="definitions" className="scroll-mt-16 sm:scroll-mt-[132px] border-t border-rule-2 pt-5 pb-6">
              {head('definitions', ko ? '용어' : 'Definitions', ko ? '안내와 화면에 나오는 낱말의 뜻.' : 'What the words on the screens mean: domain, composite, band, CWPM and the rest.', ko ? `${shownDefs.length}개` : `${shownDefs.length} terms`)}
              {isOpen('definitions') && (
                <dl id="definitions-body" className="grid gap-3 mt-4 max-w-[72ch]">{shownDefs.map(d => <div key={d.term} className="grid sm:grid-cols-[180px_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-[length:calc(13.5px*var(--ts))]"><dt className="font-semibold text-ink">{d.term}</dt><dd className="text-ink-2 leading-snug">{d.text}</dd></div>)}</dl>
              )}
            </section>
          )}

          {shownAdmin.length > 0 && <>
            <div className="border-t-2 border-ink pt-6 mt-2"><p className="eyebrow eyebrow-accent">{ko ? '관리자 안내' : 'Admin chapter'}</p><p className="text-[length:calc(13.5px*var(--ts))] text-ink-2 mt-1 max-w-[65ch]">{ko ? '관리자에게만 보이는 부분: 일정, 사람, 공지와 새로운 기능.' : isAdmin ? 'The parts only admins see: the calendar, people, and how changes reach teachers.' : 'How changes reach teachers.'}</p></div>
            {shownAdmin.map(section)}
          </>}
        </div>
      </div>
    </div>
  )
}
