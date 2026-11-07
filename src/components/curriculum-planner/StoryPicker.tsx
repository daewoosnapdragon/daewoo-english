'use client'

import { useMemo, useState } from 'react'
import { splitUnitTitle, type CurriculumUnit } from '@/lib/curriculumCore'
import { groupByModule } from '@/lib/curriculumPacing'
import { Search } from 'lucide-react'

// ─── Choosing the stories of an anthology ────────────────────────
// The book's contents as a checklist, grouped by module the way the book
// is, with a search box and one tick per module. The order is the book's;
// what is ticked is the reading list. Presets offer another class's pick
// of the same book as a starting point.

const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'

interface Props { units: CurriculumUnit[]; selected: Set<string>; onChange: (ids: Set<string>) => void; ko: boolean; presets?: { label: string; ids: string[] }[]; disabledIds?: Set<string> }

export default function StoryPicker({ units, selected, onChange, ko, presets = [], disabledIds }: Props) {
  const [q, setQ] = useState('')
  const groups = useMemo(() => groupByModule(units), [units])
  const match = (u: CurriculumUnit) => !q.trim() || u.title.toLowerCase().includes(q.trim().toLowerCase()) || u.summary.toLowerCase().includes(q.trim().toLowerCase())
  const toggle = (id: string) => { const next = new Set(selected); if (next.has(id)) next.delete(id); else next.add(id); onChange(next) }
  const setMany = (ids: string[], on: boolean) => { const next = new Set(selected); ids.forEach(id => on ? next.add(id) : next.delete(id)); onChange(next) }
  const genreOf = (u: CurriculumUnit) => (u.summary.split('.')[0] || '').trim()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-ink-3" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={ko ? '이야기 찾기' : 'Find a story'} className="h-7 pl-6 pr-2 bg-surface border border-rule-2 rounded text-[12px] text-ink w-[200px]" />
        </span>
        <span className="text-[12px] text-ink-2">{selected.size} {ko ? '편 선택' : selected.size === 1 ? 'story picked' : 'stories picked'}</span>
        {selected.size > 0 && <button onClick={() => onChange(new Set())} className="text-[11.5px] text-ink-3 hover:text-ink">{ko ? '모두 해제' : 'Clear'}</button>}
        {presets.length > 0 && <span className="ml-auto inline-flex items-center gap-1.5 flex-wrap text-[11.5px] text-ink-3">{ko ? '같게:' : 'Same as'}{presets.map(p => <button key={p.label} onClick={() => onChange(new Set(p.ids))} className={btnS}>{p.label}</button>)}</span>}
      </div>
      <div className="max-h-[420px] overflow-y-auto border border-rule rounded bg-surface">
        {groups.map(g => {
          const shown = g.units.filter(match)
          if (!shown.length) return null
          const ids = g.units.map(u => u.id)
          const all = ids.every(id => selected.has(id)), some = ids.some(id => selected.has(id))
          return (
            <div key={g.key} className="border-b border-rule last:border-b-0">
              <label className="flex items-center gap-2 px-3 py-1.5 bg-paper-2 cursor-pointer">
                <input type="checkbox" checked={all} ref={el => { if (el) el.indeterminate = some && !all }} onChange={() => setMany(ids, !all)} />
                <span className="text-[11.5px] font-semibold text-ink">{g.label}</span>
                <span className="text-[10.5px] text-ink-3">{ids.filter(id => selected.has(id)).length}/{ids.length}</span>
              </label>
              {shown.map(u => {
                const t = splitUnitTitle(u.title)
                const off = disabledIds?.has(u.id)
                return (
                  <label key={u.id} className={`flex items-center gap-2 px-3 py-1 pl-7 ${off ? 'opacity-50' : 'cursor-pointer hover:bg-paper'}`}>
                    <input type="checkbox" checked={selected.has(u.id) || !!off} disabled={off} onChange={() => toggle(u.id)} />
                    <span className="text-[10px] text-ink-3 w-12 shrink-0">{t.badge}</span>
                    <span className="text-[12.5px] text-ink truncate">{t.name}</span>
                    <span className="text-[10.5px] text-ink-3 truncate ml-auto shrink-0 max-w-[160px]">{genreOf(u)}</span>
                  </label>
                )
              })}
            </div>
          )
        })}
        {units.length === 0 && <p className="px-3 py-3 text-[12px] text-ink-3">{ko ? '이 책에는 아직 이야기가 없습니다.' : 'This book has no stories indexed yet.'}</p>}
      </div>
    </div>
  )
}
