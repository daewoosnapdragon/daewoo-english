import { fmtQty, hasPacks, type SupplyItem } from '@/lib/suppliesCore'

// ─── The count sheet, on paper ───────────────────────────────────
// One A4 page (or two) for the clipboard: the items to count, grouped by
// where they live once cabinets and shelves are filled in, by category
// until then, with the recorded number and empty boxes for the count.
// Whoever counts types the numbers into Supplies → Count afterwards.

const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const CAT: Record<string, string> = { office: 'Office', classroom: 'Classroom', kitchen: 'Kitchen', cleaning: 'Cleaning', other: 'Other' }

export function countSheetGroups(items: SupplyItem[]): { title: string; items: SupplyItem[] }[] {
  const placed = items.some(i => i.cabinet || i.shelf)
  const key = (i: SupplyItem) => placed ? [i.cabinet, i.shelf].filter(Boolean).join(' · ') || 'No place yet' : (CAT[i.category] || i.category || 'Other')
  const m = new Map<string, SupplyItem[]>()
  for (const i of items) m.set(key(i), [...(m.get(key(i)) || []), i])
  return Array.from(m.entries()).map(([title, its]) => ({ title, items: its.sort((a, b) => a.name.localeCompare(b.name)) }))
}

export function countSheetHtml(items: SupplyItem[], kind: 'quick' | 'full', dateLabel: string): string {
  const groups = countSheetGroups(items)
  const rows = groups.map(g => `
    <tr class="g"><td colspan="6">${esc(g.title)}</td></tr>
    ${g.items.map(i => `
    <tr>
      <td class="n">${esc(i.name)}${i.aliases.length ? `<span class="a">${esc(i.aliases.join(', '))}</span>` : ''}</td>
      <td class="c">${hasPacks(i) ? `${esc(i.pack_name)} of ${i.pack_size} ${esc(i.unit)}` : esc(i.unit)}</td>
      <td class="c">${esc(fmtQty(i, i.par))}</td>
      <td class="c">${esc(fmtQty(i, i.on_hand))}</td>
      <td class="b">${hasPacks(i) ? `<span class="box"></span><small>${esc(i.pack_name)}</small> <span class="box"></span><small>${esc(i.unit)}</small>` : `<span class="box"></span><small>${esc(i.unit)}</small>`}</td>
      <td class="b"><span class="tick"></span></td>
    </tr>`).join('')}`).join('')
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supplies · ${kind === 'quick' ? 'Quick count' : 'Full count'}</title>
<style>
  @page { size: A4; margin: 14mm 14mm 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 11.5px/1.35 -apple-system, "Segoe UI", Helvetica, Arial, "Noto Sans KR", sans-serif; color: #15202b; }
  h1 { font-size: 20px; margin: 0; }
  .head { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #15202b; padding-bottom: 6px; margin-bottom: 8px; }
  .head .k { font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #4b5a68; }
  .lines { display: flex; gap: 28px; margin: 6px 0 12px; font-size: 12px; }
  .lines span { display: inline-block; border-bottom: 1px solid #15202b; min-width: 150px; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th { text-align: left; font-weight: 600; font-size: 10.5px; letter-spacing: 0.6px; text-transform: uppercase; color: #4b5a68; border-bottom: 1px solid #15202b; padding: 4px 6px; }
  td { padding: 5px 6px; border-bottom: 1px solid #d9dee5; vertical-align: middle; }
  tr.g td { background: #eef2f6; font-weight: 700; padding: 4px 6px; border-bottom: 1px solid #c5d3df; page-break-after: avoid; }
  tr { page-break-inside: avoid; }
  td.n { font-weight: 600; }
  td.n .a { display: block; font-weight: 400; font-size: 10px; color: #4b5a68; }
  td.c { color: #4b5a68; white-space: nowrap; }
  td.b { white-space: nowrap; }
  .box { display: inline-block; width: 44px; height: 22px; border: 1px solid #15202b; border-radius: 2px; vertical-align: middle; margin-right: 3px; }
  .tick { display: inline-block; width: 16px; height: 16px; border: 1px solid #15202b; border-radius: 2px; vertical-align: middle; }
  small { color: #4b5a68; margin-right: 8px; }
  .foot { margin-top: 14px; font-size: 11px; color: #4b5a68; border-top: 1px solid #d9dee5; padding-top: 6px; }
</style></head><body>
  <div class="head"><div><div class="k">Daewoo English office · Supplies</div><h1>${kind === 'quick' ? 'Quick count' : 'Full count'}</h1></div><div class="k">${esc(dateLabel)}</div></div>
  <div class="lines"><label>Date<span></span></label><label>Counted by<span></span></label></div>
  <table>
    <thead><tr><th>Item</th><th>Comes in</th><th>Keep at least</th><th>Recorded</th><th>Counted</th><th>Low?</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="foot">Count what is actually there, packs and loose separately. Tick Low? for anything that will run out before the next count. Then type the numbers into Supplies → Count in the app.</div>
  <script>window.onload = function () { window.print() }</script>
</body></html>`
}

export function printCountSheet(items: SupplyItem[], kind: 'quick' | 'full', dateLabel: string) {
  const w = window.open('', '_blank'); if (!w) return
  w.document.write(countSheetHtml(items, kind, dateLabel)); w.document.close()
}
