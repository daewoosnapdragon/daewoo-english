'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useApp } from '@/lib/context'
import { supabase } from '@/lib/supabase'
import { WIDA_DOMAINS, WIDA_LEVELS, type WIDADomainKey } from '@/lib/wida'
import { invalidateWIDACache } from '@/components/shared/WIDABadge'
import { WIDA_CAN_DO, LEVELS, SCAFFOLD_SUGGESTIONS, suggestLevel, ticksThrough, ticksClearFrom, widaBandForGrade, widaLevelName, type Level } from '@/components/curriculum/wida-cando'
import { Check, ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react'

// ─── WIDA support on the student page ────────────────────────────
// The four current levels as big numbers; a questionnaire per domain that
// suggests a level from what the teacher ticks (and remembers the ticks for
// next time); scaffolds suggested by the level, assignable in one tap, each
// with a working / not working toggle; and the level history.

const DOMAIN_LABEL: Record<WIDADomainKey, [string, string]> = { listening: ['Listening', '듣기'], speaking: ['Speaking', '말하기'], reading: ['Reading', '읽기'], writing: ['Writing', '쓰기'] }
const LEVEL_TONE: Record<number, string> = { 1: 'text-bad', 2: 'text-warn', 3: 'text-warn', 4: 'text-good', 5: 'text-good', 6: 'text-ink' }

interface Scaffold { id: string; domain: string; scaffold_text: string; wida_level: number | null; effectiveness: string | null; assigned_at: string }

interface Props {
  studentId: string; grade: number
  /** On the student page: show levels, scaffolds and history, but change them on the WIDA page. */
  summary?: boolean
  /** Open this domain's questionnaire as soon as the data is in (WIDA page cell click). */
  initialDomain?: WIDADomainKey
  onSaved?: () => void
}

export default function WidaSupport({ studentId, grade, summary = false, initialDomain, onSaved }: Props) {
  const { currentTeacher, language: lang, showToast, activeSemester } = useApp()
  const band = widaBandForGrade(grade)
  const [levels, setLevels] = useState<Record<string, number>>({})
  const [ticks, setTicks] = useState<Record<string, Set<string>>>({})
  const [history, setHistory] = useState<{ domain: string; wida_level: number; recorded_at: string }[]>([])
  const [scaffolds, setScaffolds] = useState<Scaffold[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<WIDADomainKey | null>(null)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [override, setOverride] = useState<number | null>(null)
  const [ovText, setOvText] = useState('')
  const [saving, setSaving] = useState(false)
  const [custom, setCustom] = useState('')
  const [customDomain, setCustomDomain] = useState<string>('general')
  const [showHistory, setShowHistory] = useState(false)
  const [candoMissing, setCandoMissing] = useState(false)

  const load = async () => {
    const [lv, cd, hs, sc] = await Promise.all([
      supabase.from('student_wida_levels').select('domain, wida_level').eq('student_id', studentId),
      supabase.from('student_wida_cando').select('domain, ticked').eq('student_id', studentId),
      supabase.from('student_wida_history').select('domain, wida_level, recorded_at').eq('student_id', studentId).order('recorded_at', { ascending: false }).limit(40),
      supabase.from('student_scaffolds').select('id, domain, scaffold_text, wida_level, effectiveness, assigned_at').eq('student_id', studentId).eq('is_active', true).order('assigned_at', { ascending: false }),
    ])
    const l: Record<string, number> = {}; (lv.data || []).forEach((r: any) => { l[r.domain] = Number(r.wida_level) })
    const t: Record<string, Set<string>> = {}; (cd.data || []).forEach((r: any) => { t[r.domain] = new Set(r.ticked || []) })
    if (cd.error) setCandoMissing(true)
    setLevels(l); setTicks(t); setHistory((hs.data as any) || []); setScaffolds((sc.data as Scaffold[]) || []); setLoading(false)
  }
  useEffect(() => { setLoading(true); load() }, [studentId])
  useEffect(() => { if (!loading && initialDomain && !summary) openDomain(initialDomain) }, [loading, initialDomain]) // eslint-disable-line react-hooks/exhaustive-deps

  const openDomain = (d: WIDADomainKey) => { setOpen(d); setDraft(new Set(ticks[d] || [])); setOverride(null) }
  const suggestion = useMemo(() => open ? suggestLevel(open, band, draft) : null, [open, band, draft])
  const chosen: number | null = open ? (override ?? suggestion!.decimal) : null
  useEffect(() => { setOvText(chosen != null ? String(chosen) : '') }, [chosen])
  const commitOverride = () => { const n = Math.round(parseFloat(ovText) * 10) / 10; if (Number.isFinite(n) && n >= 1 && n <= 6) setOverride(n === suggestion?.decimal ? null : n); else setOvText(chosen != null ? String(chosen) : '') }
  const floorLv = (v: number | undefined | null) => (v ? Math.floor(v) : 0) as Level

  const saveLevel = async () => {
    if (!open || !chosen) return
    setSaving(true)
    const now = new Date().toISOString()
    const [a, b, c] = await Promise.all([
      supabase.from('student_wida_levels').upsert({ student_id: studentId, domain: open, wida_level: chosen, updated_by: currentTeacher?.id || null, updated_at: now }, { onConflict: 'student_id,domain' }),
      candoMissing ? Promise.resolve({ error: null }) : supabase.from('student_wida_cando').upsert({ student_id: studentId, domain: open, ticked: Array.from(draft), updated_by: currentTeacher?.id || null, updated_at: now }, { onConflict: 'student_id,domain' }),
      levels[open] === chosen ? Promise.resolve({ error: null }) : supabase.from('student_wida_history').insert({ student_id: studentId, domain: open, wida_level: chosen, recorded_by: currentTeacher?.id || null, semester_id: activeSemester?.id || null }),
    ])
    setSaving(false)
    const err = (a as any).error || (b as any).error || (c as any).error
    if (err) { showToast(`Error: ${err.message}${/student_wida_cando/.test(err.message) ? ' · run supabase/migration-wida-cando.sql' : ''}`); return }
    invalidateWIDACache()
    showToast(lang === 'ko' ? `${DOMAIN_LABEL[open][1]} ${chosen} (${widaLevelName(chosen)}) 저장됨` : `${DOMAIN_LABEL[open][0]} set to ${chosen} · ${widaLevelName(chosen)}`)
    setOpen(null); load(); onSaved?.()
  }

  const addScaffold = async (text: string, domain: string, level: number | null) => {
    const { data, error } = await supabase.from('student_scaffolds').insert({ student_id: studentId, domain, scaffold_text: text, wida_level: level, is_active: true, assigned_at: new Date().toISOString(), assigned_by: currentTeacher?.id || null }).select('id, domain, scaffold_text, wida_level, effectiveness, assigned_at').single()
    if (error) { showToast(`Error: ${error.message}`); return }
    setScaffolds(prev => [data as Scaffold, ...prev])
  }
  const toggleEff = async (s: Scaffold) => {
    const next = s.effectiveness === 'working' ? 'not_working' : s.effectiveness === 'not_working' ? null : 'working'
    const { error } = await supabase.from('student_scaffolds').update({ effectiveness: next, effectiveness_updated_at: new Date().toISOString() }).eq('id', s.id)
    if (error) showToast(`Error: ${error.message}`); else setScaffolds(prev => prev.map(x => x.id === s.id ? { ...x, effectiveness: next } : x))
  }
  const removeScaffold = async (s: Scaffold) => {
    const { error } = await supabase.from('student_scaffolds').update({ is_active: false }).eq('id', s.id)
    if (error) showToast(`Error: ${error.message}`); else setScaffolds(prev => prev.filter(x => x.id !== s.id))
  }

  const active = new Set(scaffolds.map(s => s.scaffold_text))
  const suggested = WIDA_DOMAINS.flatMap(d => { const lv = levels[d] ? floorLv(levels[d]) : undefined; return lv ? SCAFFOLD_SUGGESTIONS[d][lv].filter(t => !active.has(t)).map(t => ({ d, lv, t })) : [] })
  const overall = useMemo(() => { const vals = WIDA_DOMAINS.map(d => levels[d]).filter(Boolean); return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null }, [levels])
  const dl = (d: WIDADomainKey) => DOMAIN_LABEL[d][lang === 'ko' ? 1 : 0]

  if (loading) return <Loader2 size={16} className="animate-spin text-ink-3" />

  return (
    <div className="space-y-6">
      {/* Levels */}
      <div>
        <div className="flex items-baseline justify-between mb-1.5">
          <p className="eyebrow">WIDA {lang === 'ko' ? '수준' : 'levels'}{overall != null ? ` · ${lang === 'ko' ? '평균' : 'overall'} ${overall.toFixed(1)}` : ''}</p>
          {summary
            ? <Link href={`/wida?student=${studentId}&assess=1`} className="text-[12px] text-accent hover:underline">{lang === 'ko' ? 'WIDA 페이지에서 변경 →' : 'Change on the WIDA page →'}</Link>
            : <p className="text-[11.5px] text-ink-3">{lang === 'ko' ? `${band === 'k2' ? 'K–2' : '3–5'} 문항 · 영역을 클릭해 업데이트` : `${band === 'k2' ? 'K–2' : '3–5'} statements · click a domain to update it`}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-rule-2">
          {WIDA_DOMAINS.map(d => {
            const lv = levels[d]
            return (
              <button key={d} disabled={summary} onClick={() => open === d ? setOpen(null) : openDomain(d)} className={`text-left px-3 py-3 border-r border-rule last:border-r-0 ${summary ? 'cursor-default' : 'hover:bg-paper-2/60'} ${open === d ? 'bg-paper-2' : ''}`}>
                <p className="eyebrow">{dl(d)}</p>
                <p className={`font-display text-[30px] leading-none mt-1 tabular-nums ${lv ? LEVEL_TONE[Math.floor(lv)] : 'text-ink-3'}`}>{lv || '—'}</p>
                <p className="text-[11.5px] text-ink-2 mt-0.5">{lv ? widaLevelName(lv) : (lang === 'ko' ? '미설정' : 'not set')}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Questionnaire */}
      {open && suggestion && (
        <div className="border border-rule-2 rounded-md p-4 bg-paper-2">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <div><h4 className="font-display text-[20px] leading-none text-ink">{dl(open)}: {lang === 'ko' ? '이 학생이 할 수 있는 것' : 'what this student does'}</h4><p className="text-[12px] text-ink-3 mt-1">{lang === 'ko' ? '해당하는 항목을 체크하세요. 체크에 따라 수준이 제안되고, 직접 바꿀 수 있습니다.' : 'Tick what you see in class. The level is suggested from the ticks; you can override it.'}</p></div>
            <button onClick={() => setOpen(null)} className="w-7 h-7 rounded hover:bg-surface flex items-center justify-center text-ink-3 hover:text-ink"><X size={14} /></button>
          </div>
          <div className="flex items-center gap-2 flex-wrap mb-3 text-[12px]">
            <span className="text-ink-3">{lang === 'ko' ? '건너뛰기 · 이 수준까지 전부 할 수 있음:' : 'Skip ahead · does everything through level'}</span>
            <div className="flex gap-1">{LEVELS.map(lv => <button key={lv} onClick={() => { setDraft(ticksThrough(open, band, lv, draft)); setOverride(null) }} className={`w-7 h-7 rounded border text-[12px] font-bold ${suggestion.strength[lv] === 1 ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:border-ink-3'}`}>{lv}</button>)}</div>
            <span className="text-ink-3">{lang === 'ko' ? '· 그 다음 수준만 체크하면 됩니다' : '· then tick only what applies at the next level'}</span>
          </div>
          <div className="grid gap-3">
            {LEVELS.map(lv => (
              <div key={lv} className={`grid grid-cols-[110px_1fr] gap-3 rounded px-2 py-1.5 ${floorLv(chosen) === lv ? 'bg-surface' : ''}`}>
                <div><span className={`font-display text-[20px] tabular-nums ${floorLv(chosen) === lv ? 'text-ink' : 'text-ink-3'}`}>{lv}</span><span className="block text-[10.5px] uppercase tracking-wide text-ink-3">{widaLevelName(lv)}</span><span className="block h-1 rounded-sm bg-paper-3 mt-1 overflow-hidden"><span className="block h-full bg-ink-3" style={{ width: `${suggestion.strength[lv] * 100}%` }} /></span>
                  {suggestion.strength[lv] === 1
                    ? <button onClick={() => { setDraft(ticksClearFrom(open, band, lv, draft)); setOverride(null) }} className="mt-1.5 text-[11px] text-ink-3 hover:text-bad">{lang === 'ko' ? '여기부터 해제' : 'Clear from here'}</button>
                    : <button onClick={() => { setDraft(ticksThrough(open, band, lv, draft)); setOverride(null) }} className="mt-1.5 text-[11px] text-ink-3 hover:text-ink">{lang === 'ko' ? '여기까지 전부' : 'All through here'}</button>}
                </div>
                <div className="grid gap-1">
                  {WIDA_CAN_DO[open][band][lv].map(item => (
                    <label key={item.id} className="flex items-start gap-2 text-[13px] text-ink cursor-pointer">
                      <input type="checkbox" checked={draft.has(item.id)} onChange={e => setDraft(prev => { const n = new Set(prev); e.target.checked ? n.add(item.id) : n.delete(item.id); return n })} className="mt-1" />
                      <span>{item.text}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-wrap mt-4 pt-3 border-t border-rule">
            <span className="text-[13px] text-ink-2">{lang === 'ko' ? '제안' : 'Suggested'}: <span className="font-semibold text-ink">{suggestion.decimal} · {widaLevelName(suggestion.level)}</span>{suggestion.decimal > suggestion.level && suggestion.level < 6 && <span className="text-ink-3"> · {Math.round((suggestion.decimal - suggestion.level) * 100)}% {lang === 'ko' ? '의' : 'of'} {widaLevelName(suggestion.level + 1)}</span>}</span>
            <span className="text-[12px] text-ink-3">{lang === 'ko' ? '직접 설정' : 'or set'}</span>
            <div className="flex gap-1">{LEVELS.map(lv => <button key={lv} onClick={() => setOverride(lv === suggestion.decimal ? null : lv)} className={`w-7 h-7 rounded border text-[12px] font-bold ${chosen === lv ? 'bg-ink text-paper border-ink' : 'border-rule-2 text-ink-2 hover:border-ink-3'}`}>{lv}</button>)}</div>
            <input value={ovText} onChange={e => { if (/^\d?(\.\d?)?$/.test(e.target.value)) setOvText(e.target.value) }} onBlur={commitOverride} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitOverride() } }} inputMode="decimal" title={lang === 'ko' ? '소수점 한 자리 (예: 3.5)' : 'One decimal, e.g. 3.5'} className="w-14 h-7 px-2 bg-surface border border-rule-2 rounded text-[12.5px] tabular-nums text-center text-ink" />
            <button onClick={saveLevel} disabled={saving} className="ml-auto h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5">{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{lang === 'ko' ? `${dl(open)} ${chosen}로 저장` : `Save ${dl(open)} as ${chosen}`}</button>
          </div>
          {candoMissing && <p className="text-[11.5px] text-warn mt-2">{lang === 'ko' ? '체크 항목을 저장하려면 supabase/migration-wida-cando.sql을 실행하세요. 수준은 저장됩니다.' : 'Ticks are not remembered until supabase/migration-wida-cando.sql is run; the level still saves.'}</p>}
        </div>
      )}

      {/* Scaffolds */}
      <div>
        <p className="eyebrow mb-1.5">{lang === 'ko' ? '스캐폴드' : 'Scaffolds'} · {scaffolds.length}</p>
        {scaffolds.length === 0 && <p className="text-[12.5px] text-ink-3 mb-2">{summary ? (lang === 'ko' ? '아직 없습니다. WIDA 페이지에서 추가하세요.' : 'None yet. Add some on the WIDA page.') : (lang === 'ko' ? '아직 없습니다. 아래 제안에서 추가하세요.' : 'None yet. Add one from the suggestions below.')}</p>}
        <div className="divide-y divide-rule border-t border-rule-2">
          {scaffolds.map(s => (
            <div key={s.id} className="grid grid-cols-[80px_1fr_auto] gap-3 items-center py-1.5 text-[13px]">
              <span className="eyebrow">{s.domain === 'general' ? (lang === 'ko' ? '일반' : 'General') : dl(s.domain as WIDADomainKey)}{s.wida_level ? ` · L${s.wida_level}` : ''}</span>
              <span className="text-ink">{s.scaffold_text}</span>
              <span className="flex items-center gap-2">
                <button onClick={() => toggleEff(s)} className={`h-6 px-2 rounded-full border text-[11px] font-semibold ${s.effectiveness === 'working' ? 'bg-good-soft text-good border-good/40' : s.effectiveness === 'not_working' ? 'bg-bad-soft text-bad border-bad/40' : 'border-rule-2 text-ink-3 hover:text-ink'}`}>{s.effectiveness === 'working' ? (lang === 'ko' ? '효과 있음' : 'Working') : s.effectiveness === 'not_working' ? (lang === 'ko' ? '효과 없음' : 'Not working') : (lang === 'ko' ? '평가' : 'Rate')}</button>
                {!summary && <button onClick={() => removeScaffold(s)} title={lang === 'ko' ? '제거' : 'Remove'} className="text-ink-3 hover:text-bad"><X size={13} /></button>}
              </span>
            </div>
          ))}
        </div>
        {!summary && suggested.length > 0 && (
          <div className="mt-3">
            <p className="text-[11.5px] text-ink-3 mb-1.5">{lang === 'ko' ? '현재 수준에 맞는 제안 · 클릭해 추가' : 'Suggested for the current levels · click to add'}</p>
            <div className="flex flex-wrap gap-1.5">
              {suggested.map(x => <button key={`${x.d}-${x.t}`} onClick={() => addScaffold(x.t, x.d, x.lv)} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full border border-rule-2 bg-surface text-[12px] text-ink-2 hover:border-ink-3 hover:text-ink"><Plus size={11} />{x.t}<span className="text-ink-3">· {dl(x.d)}</span></button>)}
            </div>
          </div>
        )}
        {!summary && <div className="flex items-center gap-2 mt-3">
          <select value={customDomain} onChange={e => setCustomDomain(e.target.value)} className="h-8 px-2 bg-surface border border-rule-2 rounded text-[12px] text-ink">
            <option value="general">{lang === 'ko' ? '일반' : 'General'}</option>{WIDA_DOMAINS.map(d => <option key={d} value={d}>{dl(d)}</option>)}
          </select>
          <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && custom.trim()) { addScaffold(custom.trim(), customDomain, customDomain === 'general' ? null : (floorLv(levels[customDomain]) || null)); setCustom('') } }} placeholder={lang === 'ko' ? '직접 입력…' : 'Write your own scaffold…'} className="flex-1 h-8 px-2.5 bg-surface border border-rule-2 rounded text-[12.5px] text-ink placeholder:text-ink-3" />
          <button onClick={() => { if (custom.trim()) { addScaffold(custom.trim(), customDomain, customDomain === 'general' ? null : (floorLv(levels[customDomain]) || null)); setCustom('') } }} className="h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink">{lang === 'ko' ? '추가' : 'Add'}</button>
        </div>}
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <button onClick={() => setShowHistory(v => !v)} className="eyebrow inline-flex items-center gap-1 hover:text-ink">{lang === 'ko' ? '수준 변경 이력' : 'Level history'} · {history.length} {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
          {showHistory && (
            <div className="divide-y divide-rule border-t border-rule-2 mt-1.5">
              {history.map((h, i) => <div key={i} className="grid grid-cols-[90px_80px_1fr] gap-3 py-1.5 text-[12.5px]"><span className="text-ink-3 tabular-nums">{new Date(h.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span><span className="text-ink-2">{dl(h.domain as WIDADomainKey)}</span><span className={`font-semibold ${LEVEL_TONE[h.wida_level]}`}>{h.wida_level} · {widaLevelName(h.wida_level)}</span></div>)}
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-ink-3">{WIDA_LEVELS.map(l => `${l.level} ${l.name}`).join(' · ')}</p>
    </div>
  )
}
