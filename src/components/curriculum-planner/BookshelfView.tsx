'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { BOOK_COLORS, BOOK_STATUS_LABEL, RESOURCE_KINDS, SERIES_KIND_LABEL, STRANDS, STRAND_LABEL, bookName, colorHex, countBook, countLine, draftPrompt, isCurriculumMissing, kindFromUrl, levelShort, parseCatalogueLines, parseCodes, parseTags, unknownTags, type BookStatus, type CurriculumBook, type CurriculumLesson, type CurriculumResource, type CurriculumSeries, type CurriculumSkill, type CurriculumUnit, type ParsedUnit, type ResourceKind, type Strand } from '@/lib/curriculumCore'
import { addResource, appendDraft, deleteBook, deleteLesson, deleteResource, deleteSeries, deleteSkill, deleteUnit, fetchCatalogue, reorder, saveBook, saveLesson, saveSeries, saveSkill, saveUnit, setConfirmed, type BookDraft, type Catalogue, type LessonDraft, type UnitDraft } from '@/lib/curriculumData'
import { ArrowDown, ArrowUp, BookOpen, Check, ChevronDown, ChevronRight, Copy, ExternalLink, Loader2, Pencil, Plus, RefreshCw, Sparkles, Tag, Trash2, X } from 'lucide-react'

// ─── Bookshelf ───────────────────────────────────────────────────
// The catalogue: every book the program uses, divided into units and
// lessons, each lesson with its "students will" line, CCSS codes and skill
// tags, and links to the files in the shared Drive. Units and lessons
// arrive as Claude's draft from a table of contents or the teacher's guide,
// pasted into the box on the right, and show as "suggested" until admin
// confirms them. Books in use and retired books are both here, so an old
// year's plan still resolves. This is phase 1 of the
// curriculum planner (docs/curriculum-planner-plan.md): placements, pacing
// and the boards come next and read from these tables.

const sel = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink'
const inp = 'h-8 px-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink w-full'
const area = 'w-full p-2 bg-surface border border-rule-2 rounded text-[12.5px] text-ink leading-snug'
const btn = 'h-8 px-3 rounded border border-rule-2 text-[12.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnP = 'h-8 px-3.5 rounded bg-accent text-white text-[12.5px] font-semibold hover:bg-accent-hover disabled:opacity-60 inline-flex items-center gap-1.5 whitespace-nowrap'
const btnS = 'h-7 px-2 rounded border border-rule-2 text-[11.5px] text-ink-2 hover:text-ink disabled:opacity-40 inline-flex items-center gap-1 whitespace-nowrap'
const chip = 'inline-flex items-center h-5 px-1.5 rounded text-[10.5px] font-semibold'
const lbl = 'block text-[11px] text-ink-3 mb-1'
const KST = 'Asia/Seoul'
const fmtWhen = (iso: string, ko: boolean) => new Date(iso).toLocaleDateString(ko ? 'ko-KR' : 'en-US', { timeZone: KST, month: 'short', day: 'numeric' })
const num = (n: number) => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)

function useCatalogue() {
  const [data, setData] = useState<Catalogue>({ series: [], books: [], units: [], lessons: [], resources: [], skills: [] })
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const reload = useCallback(async () => {
    const r = await fetchCatalogue()
    if (r.error) { setMissing(isCurriculumMissing(r.error)); setLoading(false); return }
    setData(r.data); setMissing(false); setLoading(false)
  }, [])
  useEffect(() => { reload() }, [reload])
  return { ...data, loading, missing, reload }
}
type C = ReturnType<typeof useCatalogue>

export default function BookshelfView() {
  const { currentTeacher, language, showToast } = useApp()
  const ko = language === 'ko'
  const me = currentTeacher?.id || ''
  const canManage = currentTeacher?.role === 'admin' || !!currentTeacher?.is_head_teacher
  const { teachers } = useTeachers()
  const c = useCatalogue()
  const [selected, setSelected] = useState<string | null>(null)
  const [showRetired, setShowRetired] = useState(false)
  const [adding, setAdding] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  // The open book rides in the tab's address (#map/bookshelf?book=<id>), so a reload comes back to the same book on the same tab.
  useEffect(() => {
    const raw = (window.location.hash || '').slice(1)
    const q = raw.split('?')[1]
    const h = q ? new URLSearchParams(q).get('book') : raw   // older links were #<id>
    if (h && c.books.some(b => b.id === h)) setSelected(h)
  }, [c.books])
  const pick = (id: string | null) => { setSelected(id); history.replaceState(null, '', id ? `#map/bookshelf?book=${id}` : '#map/bookshelf') }
  const nameOf = (id: string | null | undefined) => teachers.find(t => t.id === id)?.name || (ko ? '누군가' : 'someone')
  const fail = (e: string | null) => { if (e) showToast(e); return !!e }
  const seriesOf = (b: CurriculumBook) => c.series.find(s => s.id === b.series_id)
  const book = c.books.find(b => b.id === selected) || null

  const visible = c.books.filter(b => showRetired || b.status !== 'retired')
  const groups = STRANDS.map(strand => ({
    strand,
    series: c.series.filter(s => s.strand === strand).map(s => ({ s, books: visible.filter(b => b.series_id === s.id).sort((a, b) => a.level_number.localeCompare(b.level_number, undefined, { numeric: true })) })).filter(g => g.books.length || adding),
  })).filter(g => g.series.length)
  const inUse = c.books.filter(b => b.status === 'confirmed').length
  const retired = c.books.length - inUse
  const totals = countBook(c.units, c.lessons)

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between gap-6 flex-wrap mb-4">
        <p className="text-[12.5px] text-ink-2">{ko ? '프로그램이 쓰는 책과 그 단원, 차시.' : 'Every book the program uses, with its units and lessons. Series and books are edited here; where they are taught is set on the map.'}</p>
        <div className="flex gap-2">
          {canManage && <button onClick={() => setAdding(a => !a)} className={btn}><Plus size={13} />{ko ? '책 추가' : 'Add a book'}</button>}
          <button onClick={c.reload} className={btn}><RefreshCw size={13} />{ko ? '새로고침' : 'Refresh'}</button>
        </div>
      </div>

      {c.missing && <p className="mb-4 text-[12.5px] text-warn">{ko ? 'supabase/migration-curriculum-catalogue.sql을 먼저 실행하세요.' : 'The catalogue tables are missing. Admin runs supabase/migration-curriculum-catalogue.sql once.'}</p>}

      {!c.loading && !c.missing && (
        <p className="text-[13px] text-ink-2 mb-5 leading-relaxed">
          {ko ? `사용 중인 책 ${inUse}권` : `${inUse} ${inUse === 1 ? 'book' : 'books'} in use`}{retired ? ` · ${retired} ${ko ? '사용 안 함' : 'retired'}` : ''}
          {' · '}{countLine(totals, ko)}
        </p>
      )}

      {c.loading ? <p className="text-[12.5px] text-ink-3 inline-flex items-center gap-2"><Loader2 size={13} className="animate-spin" />{ko ? '불러오는 중' : 'Loading'}</p> : c.missing ? null : (
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-8 items-start">
          {/* ── The shelf ── */}
          <aside>
            {adding && canManage && <AddBookForm c={c} ko={ko} fail={fail} onDone={(id) => { setAdding(false); if (id) pick(id); c.reload() }} onCancel={() => setAdding(false)} />}
            {groups.length === 0 && !adding && <p className="text-[12.5px] text-ink-3">{ko ? '아직 책이 없습니다.' : canManage ? 'No books yet. Add the first one, then paste its contents.' : 'No books yet.'}</p>}
            {groups.map(g => (
              <section key={g.strand} className="mb-5">
                <p className="eyebrow mb-2">{ko ? STRAND_LABEL[g.strand].ko : STRAND_LABEL[g.strand].en}</p>
                {g.series.map(({ s, books }) => (
                  <div key={s.id} className="mb-3">
                    <SeriesHeader s={s} bookCount={c.books.filter(b => b.series_id === s.id).length} ko={ko} canManage={canManage} fail={fail} reload={c.reload} />
                    <div className="flex flex-col gap-1">
                      {books.map(b => {
                        const counts = countBook(c.units.filter(u => u.book_id === b.id), c.lessons)
                        const on = selected === b.id
                        return (
                          <button key={b.id} onClick={() => pick(on ? null : b.id)} className={`text-left rounded border px-3 py-2 flex items-center gap-3 ${on ? 'border-ink bg-paper-2' : 'border-rule hover:border-rule-2'} ${b.status === 'retired' ? 'opacity-60' : ''}`}>
                            <span className="font-display text-[26px] leading-none min-w-9 text-center shrink-0" style={{ color: colorHex(s.color) }}>{levelShort(b.level_number) || '·'}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] text-ink truncate">{b.title && b.title !== `${s.name} ${b.level_number}`.trim() ? b.title : `${s.name} ${b.level_number}`.trim()}</span>
                              <span className="block text-[11px] text-ink-3 truncate">{countLine(counts, ko)}</span>
                            </span>
                            <StatusChip status={b.status} ko={ko} />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </section>
            ))}
            <div className="flex flex-col gap-2 mt-2">
              {c.books.some(b => b.status === 'retired') && (
                <label className="inline-flex items-center gap-2 text-[12px] text-ink-2"><input type="checkbox" checked={showRetired} onChange={e => setShowRetired(e.target.checked)} />{ko ? '사용 안 하는 책 보기' : 'Show retired books'}</label>
              )}
              <button onClick={() => setShowSkills(s => !s)} className="inline-flex items-center gap-1.5 text-[12px] text-ink-2 hover:text-ink text-left"><Tag size={12} />{ko ? `기능 태그 ${c.skills.length}개` : `${c.skills.length} skill tags`}{showSkills ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</button>
              {showSkills && <SkillList c={c} ko={ko} canManage={canManage} fail={fail} />}
            </div>
          </aside>

          {/* ── The open book ── */}
          <main>
            {book ? (
              <BookPanel key={book.id} book={book} series={seriesOf(book)} c={c} ko={ko} me={me} canManage={canManage} nameOf={nameOf} fail={fail} onDeleted={() => { pick(null); c.reload() }} />
            ) : (
              <div className="border border-dashed border-rule-2 rounded p-8 text-center">
                <BookOpen size={22} className="mx-auto text-ink-3 mb-2" />
                <p className="text-[13px] text-ink-2">{ko ? '왼쪽에서 책을 고르세요.' : 'Pick a book on the shelf to see its units and lessons.'}</p>
                {canManage && <p className="text-[12px] text-ink-3 mt-1">{ko ? '책을 추가한 뒤 목차를 붙여넣으면 Claude가 쓴 단원과 차시가 들어옵니다.' : 'Add a book, then paste the lines Claude writes from its contents. Confirm them once you have looked.'}</p>}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

function StatusChip({ status, ko }: { status: BookStatus; ko: boolean }) {
  if (status !== 'retired') return null
  return <span className={`${chip} bg-paper-3 text-ink-3`}>{ko ? BOOK_STATUS_LABEL.retired.ko : BOOK_STATUS_LABEL.retired.en}</span>
}

// ─── A series on the shelf ───────────────────────────────────────
function SeriesHeader({ s, bookCount, ko, canManage, fail, reload }: { s: CurriculumSeries; bookCount: number; ko: boolean; canManage: boolean; fail: (e: string | null) => boolean; reload: () => Promise<void> }) {
  const { confirmDialog } = useApp()
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState({ name: s.name, publisher: s.publisher, strand: s.strand, color: s.color, kind: s.kind })
  const save = async () => { const r = await saveSeries(s.id, d); if (!fail(r.error)) { setEditing(false); reload() } }
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '시리즈 삭제' : 'Remove this series', message: s.name, confirmLabel: ko ? '삭제' : 'Remove' })) return
    if (!fail(await deleteSeries(s.id, s.name))) reload()
  }
  if (editing) return (
    <div className="border border-rule-2 rounded p-2 mb-2 grid grid-cols-2 gap-2">
      <div className="col-span-2"><span className={lbl}>{ko ? '시리즈 이름' : 'Series name'}</span><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className={inp} autoFocus /></div>
      <div><span className={lbl}>{ko ? '출판사' : 'Publisher'}</span><input value={d.publisher} onChange={e => setD({ ...d, publisher: e.target.value })} className={inp} /></div>
      <div><span className={lbl}>{ko ? '영역' : 'Strand'}</span><select value={d.strand} onChange={e => setD({ ...d, strand: e.target.value as Strand })} className={`${sel} w-full`}>{STRANDS.map(x => <option key={x} value={x}>{ko ? STRAND_LABEL[x].ko : STRAND_LABEL[x].en}</option>)}</select></div>
      <div className="col-span-2"><span className={lbl}>{ko ? '종류' : 'Kind'}</span><select value={d.kind} onChange={e => setD({ ...d, kind: e.target.value as 'sequence' | 'anthology' })} className={`${sel} w-full`}><option value="sequence">{ko ? SERIES_KIND_LABEL.sequence.ko : 'Sequence: every unit in order, paced in weeks'}</option><option value="anthology">{ko ? SERIES_KIND_LABEL.anthology.ko : 'Anthology: a book of stories a class picks from'}</option></select></div>
      <div className="col-span-2 flex gap-1.5">{Object.entries(BOOK_COLORS).map(([k, v]) => <button key={k} type="button" onClick={() => setD({ ...d, color: k })} title={v.label} className={`w-6 h-6 rounded ${d.color === k ? 'ring-2 ring-ink ring-offset-1' : ''}`} style={{ background: v.hex }} />)}</div>
      <div className="col-span-2 flex gap-2">
        <button onClick={save} className={btnS}><Check size={11} />{ko ? '저장' : 'Save'}</button>
        <button onClick={() => setEditing(false)} className={btnS}>{ko ? '취소' : 'Cancel'}</button>
        {bookCount === 0 && <button onClick={remove} className={`${btnS} ml-auto`}><Trash2 size={11} />{ko ? '시리즈 삭제' : 'Remove series'}</button>}
      </div>
    </div>
  )
  return (
    <div className="flex items-center gap-2 mb-1.5 group">
      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: colorHex(s.color) }} />
      <span className="text-[12.5px] font-semibold text-ink">{s.name}</span>
      {s.publisher && <span className="text-[11px] text-ink-3">{s.publisher}</span>}
      {s.kind === 'anthology' && <span className="text-[10px] text-ink-3 border border-rule-2 rounded px-1">{ko ? '선집' : 'anthology'}</span>}
      {canManage && <button onClick={() => { setD({ name: s.name, publisher: s.publisher, strand: s.strand, color: s.color, kind: s.kind }); setEditing(true) }} className="text-ink-3 hover:text-ink opacity-0 group-hover:opacity-100" aria-label="Edit series"><Pencil size={10} /></button>}
    </div>
  )
}

function SourceChip({ confirmed_at, confirmed_by, source, ko, nameOf }: { confirmed_at: string | null; confirmed_by: string | null; source: 'claude' | 'teacher'; ko: boolean; nameOf: (id: string | null) => string }) {
  if (confirmed_at) return <span className={`${chip} bg-good-soft text-good`} title={`${nameOf(confirmed_by)} · ${fmtWhen(confirmed_at, ko)}`}><Check size={10} className="mr-0.5" />{ko ? '확인됨' : 'Confirmed'}</span>
  return <span className={`${chip} bg-paper-3 text-ink-2`}>{source === 'claude' ? (ko ? 'Claude 제안' : 'Suggested by Claude') : (ko ? '미확인' : 'Not confirmed')}</span>
}

function Tags({ tags, codes }: { tags: string[]; codes: string[] }) {
  if (!tags.length && !codes.length) return null
  return (
    <span className="inline-flex flex-wrap gap-1 align-middle">
      {tags.map(t => <span key={t} className={`${chip} bg-info-soft text-info font-medium`}>{t}</span>)}
      {codes.map(cd => <span key={cd} className={`${chip} border border-rule-2 text-ink-2`}>{cd}</span>)}
    </span>
  )
}

// ─── Add a book ──────────────────────────────────────────────────
function AddBookForm({ c, ko, fail, onDone, onCancel }: { c: C; ko: boolean; fail: (e: string | null) => boolean; onDone: (id: string | null) => void; onCancel: () => void }) {
  const [seriesId, setSeriesId] = useState(c.series[0]?.id || 'new')
  const [newSeries, setNewSeries] = useState({ name: '', publisher: '', strand: 'reading' as Strand, color: 'blue' })
  const [d, setD] = useState<Omit<BookDraft, 'series_id'>>({ level_number: '', title: '', status: 'confirmed', drive_folder_url: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    let sid = seriesId
    if (sid === 'new') {
      const r = await saveSeries(null, newSeries)
      if (fail(r.error) || !r.id) { setSaving(false); return }
      sid = r.id
    }
    const sName = sid === seriesId ? c.series.find(s => s.id === sid)?.name : newSeries.name
    const r = await saveBook(null, { ...d, series_id: sid }, `${sName || ''} ${d.level_number}`.trim())
    setSaving(false)
    if (!fail(r.error)) onDone(r.id)
  }
  return (
    <div className="border border-rule-2 rounded p-3 mb-4 flex flex-col gap-2">
      <p className="text-[12.5px] font-semibold text-ink">{ko ? '책 추가' : 'Add a book'}</p>
      <div><span className={lbl}>{ko ? '시리즈' : 'Series'}</span>
        <select value={seriesId} onChange={e => setSeriesId(e.target.value)} className={`${sel} w-full`}>
          {c.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          <option value="new">{ko ? '새 시리즈…' : 'New series…'}</option>
        </select>
      </div>
      {seriesId === 'new' && (
        <div className="grid grid-cols-2 gap-2">
          <div className="col-span-2"><span className={lbl}>{ko ? '시리즈 이름' : 'Series name'}</span><input value={newSeries.name} onChange={e => setNewSeries({ ...newSeries, name: e.target.value })} className={inp} placeholder="Super Phonics" /></div>
          <div><span className={lbl}>{ko ? '출판사' : 'Publisher'}</span><input value={newSeries.publisher} onChange={e => setNewSeries({ ...newSeries, publisher: e.target.value })} className={inp} /></div>
          <div><span className={lbl}>{ko ? '영역' : 'Strand'}</span><select value={newSeries.strand} onChange={e => setNewSeries({ ...newSeries, strand: e.target.value as Strand })} className={`${sel} w-full`}>{STRANDS.map(s => <option key={s} value={s}>{ko ? STRAND_LABEL[s].ko : STRAND_LABEL[s].en}</option>)}</select></div>
          <div className="col-span-2"><span className={lbl}>{ko ? '색' : 'Colour'}</span>
            <div className="flex gap-1.5">{Object.entries(BOOK_COLORS).map(([k, v]) => <button key={k} type="button" onClick={() => setNewSeries({ ...newSeries, color: k })} title={v.label} className={`w-6 h-6 rounded ${newSeries.color === k ? 'ring-2 ring-ink ring-offset-1' : ''}`} style={{ background: v.hex }} />)}</div>
          </div>
        </div>
      )}
      <div className="grid grid-cols-[72px_1fr] gap-2">
        <div><span className={lbl}>{ko ? '레벨' : 'Level'}</span><input value={d.level_number} onChange={e => setD({ ...d, level_number: e.target.value })} className={inp} placeholder="2" /></div>
        <div><span className={lbl}>{ko ? '제목 (선택)' : 'Title, if the series name is not enough'}</span><input value={d.title} onChange={e => setD({ ...d, title: e.target.value })} className={inp} /></div>
      </div>
      <div className="flex gap-2 mt-1">
        <button onClick={save} disabled={saving} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{ko ? '추가' : 'Add'}</button>
        <button onClick={onCancel} className={btn}>{ko ? '취소' : 'Cancel'}</button>
      </div>
    </div>
  )
}

// ─── Skill tags ──────────────────────────────────────────────────
function SkillList({ c, ko, canManage, fail }: { c: C; ko: boolean; canManage: boolean; fail: (e: string | null) => boolean }) {
  const { confirmDialog } = useApp()
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState({ label: '', strand: 'other' as Strand })
  const used = useMemo(() => {
    const m: Record<string, number> = {}
    c.units.forEach(u => u.skill_tags.forEach(t => { m[t] = (m[t] || 0) + 1 }))
    c.lessons.forEach(l => l.skill_tags.forEach(t => { m[t] = (m[t] || 0) + 1 }))
    return m
  }, [c.units, c.lessons])
  const save = async (code: string) => { if (!fail(await saveSkill(code, draft))) { setEditing(null); c.reload() } }
  const remove = async (k: CurriculumSkill) => {
    if (!await confirmDialog({ title: ko ? '태그 삭제' : 'Delete this tag', message: used[k.code] ? (ko ? `${used[k.code]}곳에서 쓰입니다. 단원과 차시의 태그는 남습니다.` : `Used in ${used[k.code]} places. The units and lessons keep the word; it just leaves the list.`) : k.label, confirmLabel: ko ? '삭제' : 'Delete' })) return
    if (!fail(await deleteSkill(k.code))) c.reload()
  }
  return (
    <div className="border border-rule rounded p-2 text-[12px]">
      {STRANDS.map(strand => {
        const ks = c.skills.filter(k => k.strand === strand)
        if (!ks.length) return null
        return (
          <div key={strand} className="mb-2">
            <p className="text-[10.5px] uppercase tracking-wide text-ink-3 mb-1">{ko ? STRAND_LABEL[strand].ko : STRAND_LABEL[strand].en}</p>
            <div className="flex flex-wrap gap-1">
              {ks.map(k => editing === k.code ? (
                <span key={k.code} className="inline-flex items-center gap-1">
                  <input value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} className="h-6 px-1.5 bg-surface border border-rule-2 rounded text-[11.5px] w-32" />
                  <select value={draft.strand} onChange={e => setDraft({ ...draft, strand: e.target.value as Strand })} className="h-6 px-1 bg-surface border border-rule-2 rounded text-[11px]">{STRANDS.map(s => <option key={s} value={s}>{STRAND_LABEL[s].en}</option>)}</select>
                  <button onClick={() => save(k.code)} className="text-good"><Check size={13} /></button>
                  <button onClick={() => setEditing(null)} className="text-ink-3"><X size={13} /></button>
                </span>
              ) : (
                <span key={k.code} className="inline-flex items-center gap-1 h-6 px-1.5 rounded bg-info-soft text-info">
                  {k.label}<span className="text-[10px] opacity-70">{used[k.code] || 0}</span>
                  {canManage && <><button onClick={() => { setEditing(k.code); setDraft({ label: k.label, strand: k.strand }) }} className="opacity-60 hover:opacity-100"><Pencil size={10} /></button><button onClick={() => remove(k)} className="opacity-60 hover:opacity-100"><X size={10} /></button></>}
                </span>
              ))}
            </div>
          </div>
        )
      })}
      <p className="text-[11px] text-ink-3">{ko ? '새 태그는 단원이나 차시에 쓰일 때 자동으로 추가됩니다.' : 'New tags are added when a unit or lesson uses them. The number is how many places use each one.'}</p>
    </div>
  )
}

// ─── One book ────────────────────────────────────────────────────
interface PanelProps { book: CurriculumBook; series: CurriculumSeries | undefined; c: C; ko: boolean; me: string; canManage: boolean; nameOf: (id: string | null | undefined) => string; fail: (e: string | null) => boolean; onDeleted: () => void }

function BookPanel({ book, series, c, ko, me, canManage, nameOf, fail, onDeleted }: PanelProps) {
  const { showToast, confirmDialog } = useApp()
  const label = bookName(book, series)
  const strand: Strand = series?.strand || 'other'
  const units = c.units.filter(u => u.book_id === book.id).sort((a, b) => a.sort_order - b.sort_order)
  const counts = countBook(units, c.lessons)
  const lastOrder = units.reduce((m, u) => Math.max(m, u.sort_order), 0)
  const [editing, setEditing] = useState(false)
  const [d, setD] = useState<BookDraft>({ series_id: book.series_id, level_number: book.level_number, title: book.title, status: book.status, drive_folder_url: book.drive_folder_url, notes: book.notes })
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [addingUnit, setAddingUnit] = useState(false)
  const [showDraft, setShowDraft] = useState(counts.units === 0)
  const toggle = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }))
  const allOpen = units.length > 0 && units.every(u => open[u.id])

  const saveMeta = async () => {
    const r = await saveBook(book.id, d, label)
    if (!fail(r.error)) { setEditing(false); c.reload() }
  }
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '책 삭제' : 'Delete this book', message: ko ? `${label}과(와) 그 단원, 차시, 자료가 모두 지워집니다.` : `${label} and its ${counts.units} units, ${counts.lessons} lessons and their resources go. Retire it instead if any class has used it.`, confirmLabel: ko ? '삭제' : 'Delete' })) return
    if (!fail(await deleteBook(book.id, label))) onDeleted()
  }
  const confirmAll = async () => {
    const ls = c.lessons.filter(l => units.some(u => u.id === l.unit_id) && !l.confirmed_at).map(l => l.id)
    const us = units.filter(u => !u.confirmed_at).map(u => u.id)
    if (!us.length && !ls.length) { showToast(ko ? '모두 확인됨' : 'Everything is already confirmed'); return }
    if (!await confirmDialog({ title: ko ? '모두 확인' : 'Confirm everything in this book', message: ko ? `단원 ${us.length}개, 차시 ${ls.length}개를 확인 표시합니다.` : `${us.length} units and ${ls.length} lessons will be marked confirmed by you.`, confirmLabel: ko ? '확인' : 'Confirm all' })) return
    if (!fail(await setConfirmed('curriculum_units', us, me, true, label)) && !fail(await setConfirmed('curriculum_lessons', ls, me, true, label))) c.reload()
  }

  return (
    <div>
      {/* Head */}
      <div className="flex items-start gap-4 mb-4">
        <span className="font-display text-[44px] leading-none min-w-14 text-center shrink-0" style={{ color: colorHex(series?.color || 'slate') }}>{levelShort(book.level_number) || '·'}</span>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="grid grid-cols-2 gap-2 max-w-xl">
              <div><span className={lbl}>{ko ? '시리즈' : 'Series'}</span><select value={d.series_id} onChange={e => setD({ ...d, series_id: e.target.value })} className={`${sel} w-full`}>{c.series.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><span className={lbl}>{ko ? '레벨' : 'Level'}</span><input value={d.level_number} onChange={e => setD({ ...d, level_number: e.target.value })} className={inp} /></div>
              <div className="col-span-2"><span className={lbl}>{ko ? '제목' : 'Title'}</span><input value={d.title} onChange={e => setD({ ...d, title: e.target.value })} className={inp} /></div>
              <div><span className={lbl}>{ko ? '상태' : 'Status'}</span><select value={d.status} onChange={e => setD({ ...d, status: e.target.value as BookStatus })} className={`${sel} w-full`}>{(['confirmed', 'retired'] as BookStatus[]).map(s => <option key={s} value={s}>{ko ? BOOK_STATUS_LABEL[s].ko : BOOK_STATUS_LABEL[s].en}</option>)}</select></div>
              <div><span className={lbl}>{ko ? 'Drive 폴더' : 'Drive folder link'}</span><input value={d.drive_folder_url} onChange={e => setD({ ...d, drive_folder_url: e.target.value })} className={inp} placeholder="https://drive.google.com/drive/folders/…" /></div>
              <div className="col-span-2"><span className={lbl}>{ko ? '메모' : 'Notes'}</span><textarea value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} rows={2} className={area} /></div>
              <div className="col-span-2 flex gap-2"><button onClick={saveMeta} className={btnP}><Check size={13} />{ko ? '저장' : 'Save'}</button><button onClick={() => setEditing(false)} className={btn}>{ko ? '취소' : 'Cancel'}</button></div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display text-[24px] leading-tight text-ink">{label}</h2>
                <StatusChip status={book.status} ko={ko} />
              </div>
              <p className="text-[12.5px] text-ink-2 mt-1">
                {series ? (ko ? STRAND_LABEL[series.strand].ko : STRAND_LABEL[series.strand].en) : ''}{series?.publisher ? ` · ${series.publisher}` : ''} · {countLine(counts, ko)}
                {book.drive_folder_url && <> · <a href={book.drive_folder_url} target="_blank" rel="noreferrer" className="text-accent inline-flex items-center gap-1">{ko ? 'Drive 폴더' : 'Drive folder'}<ExternalLink size={11} /></a></>}
              </p>
              {book.notes && <p className="text-[12px] text-ink-3 mt-1 whitespace-pre-line">{book.notes}</p>}
            </>
          )}
        </div>
        {canManage && !editing && (
          <div className="flex gap-1.5 shrink-0">
            <button onClick={() => setEditing(true)} className={btnS}><Pencil size={11} />{ko ? '수정' : 'Edit'}</button>
            <button onClick={async () => { const r = await saveBook(book.id, { ...d, status: book.status === 'retired' ? 'confirmed' : 'retired' }, label); if (!fail(r.error)) c.reload() }} className={btnS}>{book.status === 'retired' ? (ko ? '다시 사용' : 'Back in use') : (ko ? '사용 안 함' : 'Retire')}</button>
            <button onClick={remove} className={btnS}><Trash2 size={11} /></button>
          </div>
        )}
      </div>

      {/* Draft box */}
      {canManage && (
        <div className="mb-5">
          <button onClick={() => setShowDraft(s => !s)} className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-2 hover:text-ink mb-2">
            <Sparkles size={13} />{ko ? '목차에서 단원과 차시 만들기' : 'Draft units and lessons from the contents'}{showDraft ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {showDraft && <DraftBox book={book} label={label} strand={strand} units={units} lastOrder={lastOrder} c={c} ko={ko} fail={fail} onSaved={() => { setShowDraft(false); c.reload() }} />}
        </div>
      )}

      {/* Units */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <p className="eyebrow">{ko ? '단원' : 'Units'}</p>
        <div className="flex gap-1.5">
          {units.length > 0 && <button onClick={() => setOpen(allOpen ? {} : Object.fromEntries(units.map(u => [u.id, true])))} className={btnS}>{allOpen ? (ko ? '모두 접기' : 'Collapse all') : (ko ? '모두 펼치기' : 'Expand all')}</button>}
          {canManage && units.length > 0 && <button onClick={confirmAll} className={btnS}><Check size={11} />{ko ? '모두 확인' : 'Confirm all'}</button>}
          {canManage && <button onClick={() => setAddingUnit(a => !a)} className={btnS}><Plus size={11} />{ko ? '단원 추가' : 'Add a unit'}</button>}
        </div>
      </div>
      {addingUnit && <UnitForm initial={null} ko={ko} onCancel={() => setAddingUnit(false)} onSave={async (ud) => { const r = await saveUnit(null, book.id, ud, { after: lastOrder, label, strand, known: c.skills }); if (!fail(r.error)) { setAddingUnit(false); c.reload() } }} />}
      {units.length === 0 && !addingUnit && <p className="text-[12.5px] text-ink-3">{ko ? '아직 단원이 없습니다.' : canManage ? 'No units yet. Paste the lines Claude writes from the contents above, or add a unit by hand.' : 'Not indexed yet.'}</p>}
      <div className="flex flex-col gap-2">
        {units.map((u, i) => (
          <UnitCard key={u.id} unit={u} index={i} total={units.length} siblings={units} bookLabel={label} strand={strand} c={c} ko={ko} me={me} canManage={canManage} nameOf={nameOf} fail={fail} open={!!open[u.id]} onToggle={() => toggle(u.id)} />
        ))}
      </div>
    </div>
  )
}

// ─── Paste the draft ─────────────────────────────────────────────
function DraftBox({ book, label, strand, units, lastOrder, c, ko, fail, onSaved }: { book: CurriculumBook; label: string; strand: Strand; units: CurriculumUnit[]; lastOrder: number; c: C; ko: boolean; fail: (e: string | null) => boolean; onSaved: () => void }) {
  const { showToast, confirmDialog } = useApp()
  const [grade, setGrade] = useState(() => { const m = book.level_number.match(/\d+/); return m ? `grade ${m[0]}` : 'the grade this book is for' })
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState<ParsedUnit[] | null>(null)
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const known = useMemo(() => new Set(c.skills.map(k => k.code)), [c.skills])
  const prompt = useMemo(() => draftPrompt(label, grade, c.skills.filter(k => k.strand === strand || strand === 'other').map(k => k.code)), [label, grade, c.skills, strand])
  const copy = async () => { try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { showToast(ko ? '복사할 수 없습니다' : 'Could not copy') } }
  const read = () => { const p = parseCatalogueLines(text); if (!p.length) { showToast(ko ? '읽을 단원이 없습니다. 줄이 "Unit 1 ·"로 시작하는지 확인하세요.' : 'No units found. Unit lines start with "Unit 1 ·" and lesson lines with "-".'); return } setParsed(p) }
  const fresh = parsed ? unknownTags(parsed, known) : []
  const nothingConfirmed = units.every(u => !u.confirmed_at) && !c.lessons.some(l => units.some(u => u.id === l.unit_id) && l.confirmed_at)
  const save = async (replace: boolean) => {
    if (!parsed) return
    if (replace && !await confirmDialog({ title: ko ? '단원 바꾸기' : 'Replace the units', message: ko ? `기존 단원 ${units.length}개를 지우고 새로 넣습니다.` : `The ${units.length} units already here go and these ${parsed.length} take their place. Nothing in them was confirmed.`, confirmLabel: ko ? '바꾸기' : 'Replace' })) return
    setSaving(true)
    const e = await appendDraft(book.id, parsed, { replace, after: lastOrder, label, strand, known: c.skills })
    setSaving(false)
    if (!fail(e)) { const n = parsed.reduce((a, u) => a + u.lessons.length, 0); showToast(ko ? `단원 ${parsed.length}개, 차시 ${n}개 추가됨` : `${parsed.length} units and ${n} lessons added as suggested`); setText(''); setParsed(null); onSaved() }
  }
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <div className="border border-rule-2 rounded p-4">
        <p className="eyebrow mb-1.5">{ko ? '1. Claude에게 줄 지시문' : '1. What to tell Claude'}</p>
        <p className="text-[12.5px] text-ink-2 mb-2 leading-relaxed">{ko ? '목차와 교사용 지도서의 목표 페이지(사진이나 글)를 Claude에 넣고 이 지시문을 붙여넣으세요. 기능 태그 목록이 들어 있어 같은 말로 써 줍니다.' : 'Give Claude the table of contents and the teacher’s guide objective pages (photos or text) with this prompt. It carries the skill tags, so Claude uses the same words and they match.'}</p>
        <label className="flex items-center gap-2 text-[12px] text-ink-2 mb-2">{ko ? 'CCSS 학년' : 'CCSS grade'}<input value={grade} onChange={e => setGrade(e.target.value)} className={`${inp} max-w-[220px]`} /></label>
        <textarea readOnly value={prompt} className="w-full h-32 p-2 bg-paper-2 border border-rule rounded text-[11.5px] text-ink-2 leading-snug resize-none" />
        <button onClick={copy} className={`${btn} mt-2`}>{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? (ko ? '복사됨' : 'Copied') : (ko ? '지시문 복사' : 'Copy the prompt')}</button>
      </div>
      <div className="border border-rule-2 rounded p-4">
        <p className="eyebrow mb-1.5">{ko ? '2. Claude가 쓴 줄 붙여넣기' : '2. Paste the lines Claude writes'}</p>
        <textarea value={text} onChange={e => { setText(e.target.value); setParsed(null) }} rows={7} className={`${area} font-mono text-[11.5px]`} placeholder={'Unit 1 · Short vowels | weeks: 3 | skills: short a, short e | ccss: RF.1.2c\n- Lesson 1 · Short a words | Students will blend and read CVC words with short a. | ccss: RF.1.3b | skills: short a'} />
        <div className="flex gap-2 mt-2 flex-wrap">
          <button onClick={read} disabled={!text.trim()} className={btn}>{ko ? '줄 읽기' : 'Read the lines'}</button>
          {parsed && <button onClick={() => save(false)} disabled={saving} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}{units.length ? (ko ? '뒤에 추가' : 'Add after the existing units') : (ko ? '제안으로 저장' : 'Save as suggested')}</button>}
          {parsed && units.length > 0 && nothingConfirmed && <button onClick={() => save(true)} disabled={saving} className={btn}>{ko ? '기존 단원 바꾸기' : 'Replace the existing units'}</button>}
        </div>
        {parsed && (
          <div className="mt-3 text-[12px] text-ink-2">
            <p className="mb-1">{ko ? `단원 ${parsed.length}개, 차시 ${parsed.reduce((a, u) => a + u.lessons.length, 0)}개` : `${parsed.length} units, ${parsed.reduce((a, u) => a + u.lessons.length, 0)} lessons`}{fresh.length ? <> · {ko ? '새 태그' : 'new tags'}: {fresh.join(', ')}</> : ''}</p>
            <ol className="list-decimal pl-5 flex flex-col gap-0.5">
              {parsed.map((u, i) => <li key={i}><span className="text-ink">{u.title}</span> <span className="text-ink-3">· {num(u.default_weeks)} wk · {u.lessons.length} {u.lessons.length === 1 ? 'lesson' : 'lessons'}</span>{u.lessons.some(l => !l.objective) && <span className="text-warn"> · {ko ? '목표 없는 차시 있음' : 'some lessons have no objective'}</span>}</li>)}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Unit and lesson forms ───────────────────────────────────────
function UnitForm({ initial, ko, onSave, onCancel }: { initial: CurriculumUnit | null; ko: boolean; onSave: (d: UnitDraft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState({ title: initial?.title || '', summary: initial?.summary || '', default_weeks: initial ? String(initial.default_weeks) : '2', skills: initial?.skill_tags.join(', ') || '', ccss: initial?.ccss_codes.join(', ') || '', drive_folder_url: initial?.drive_folder_url || '' })
  const [saving, setSaving] = useState(false)
  const submit = async () => { setSaving(true); await onSave({ title: d.title, summary: d.summary, default_weeks: parseFloat(d.default_weeks) || 1, skill_tags: parseTags(d.skills), ccss_codes: parseCodes(d.ccss), drive_folder_url: d.drive_folder_url }); setSaving(false) }
  return (
    <div className="border border-rule-2 rounded p-3 mb-2 grid grid-cols-1 sm:grid-cols-[1fr_90px] gap-2">
      <div><span className={lbl}>{ko ? '단원 제목' : 'Unit title'}</span><input value={d.title} onChange={e => setD({ ...d, title: e.target.value })} className={inp} placeholder="Unit 1 · Short vowels" autoFocus /></div>
      <div><span className={lbl}>{ko ? '주' : 'Weeks'}</span><input value={d.default_weeks} onChange={e => setD({ ...d, default_weeks: e.target.value })} className={inp} inputMode="decimal" /></div>
      <div className="sm:col-span-2"><span className={lbl}>{ko ? '요약' : 'Summary'}</span><input value={d.summary} onChange={e => setD({ ...d, summary: e.target.value })} className={inp} /></div>
      <div><span className={lbl}>{ko ? '기능 태그 (쉼표로)' : 'Skill tags, comma separated'}</span><input value={d.skills} onChange={e => setD({ ...d, skills: e.target.value })} className={inp} placeholder="short a, cvc" /></div>
      <div><span className={lbl}>CCSS</span><input value={d.ccss} onChange={e => setD({ ...d, ccss: e.target.value })} className={inp} placeholder="RF.1.3b, L.1.2d" /></div>
      <div className="sm:col-span-2"><span className={lbl}>{ko ? 'Drive 폴더' : 'Drive folder link'}</span><input value={d.drive_folder_url} onChange={e => setD({ ...d, drive_folder_url: e.target.value })} className={inp} /></div>
      <div className="sm:col-span-2 flex gap-2"><button onClick={submit} disabled={saving} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button><button onClick={onCancel} className={btn}>{ko ? '취소' : 'Cancel'}</button></div>
    </div>
  )
}

function LessonForm({ initial, ko, onSave, onCancel }: { initial: CurriculumLesson | null; ko: boolean; onSave: (d: LessonDraft) => Promise<void>; onCancel: () => void }) {
  const [d, setD] = useState({ title: initial?.title || '', objective: initial?.objective || '', notes: initial?.notes || '', skills: initial?.skill_tags.join(', ') || '', ccss: initial?.ccss_codes.join(', ') || '' })
  const [saving, setSaving] = useState(false)
  const submit = async () => { setSaving(true); await onSave({ title: d.title, objective: d.objective, notes: d.notes, skill_tags: parseTags(d.skills), ccss_codes: parseCodes(d.ccss) }); setSaving(false) }
  return (
    <div className="border border-rule-2 rounded p-3 my-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
      <div className="sm:col-span-2"><span className={lbl}>{ko ? '차시 제목' : 'Lesson title'}</span><input value={d.title} onChange={e => setD({ ...d, title: e.target.value })} className={inp} autoFocus /></div>
      <div className="sm:col-span-2"><span className={lbl}>{ko ? '학습 목표 (Students will…)' : 'Students will…'}</span><textarea value={d.objective} onChange={e => setD({ ...d, objective: e.target.value })} rows={2} className={area} placeholder="Students will blend and read CVC words with short a." /></div>
      <div className="sm:col-span-2"><span className={lbl}>{ko ? '메모' : 'Notes'}</span><input value={d.notes} onChange={e => setD({ ...d, notes: e.target.value })} className={inp} /></div>
      <div><span className={lbl}>{ko ? '기능 태그' : 'Skill tags'}</span><input value={d.skills} onChange={e => setD({ ...d, skills: e.target.value })} className={inp} /></div>
      <div><span className={lbl}>CCSS</span><input value={d.ccss} onChange={e => setD({ ...d, ccss: e.target.value })} className={inp} /></div>
      <div className="sm:col-span-2 flex gap-2"><button onClick={submit} disabled={saving} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '저장' : 'Save'}</button><button onClick={onCancel} className={btn}>{ko ? '취소' : 'Cancel'}</button></div>
    </div>
  )
}

// ─── Unit card ───────────────────────────────────────────────────
interface UnitProps { unit: CurriculumUnit; index: number; total: number; siblings: CurriculumUnit[]; bookLabel: string; strand: Strand; c: C; ko: boolean; me: string; canManage: boolean; nameOf: (id: string | null | undefined) => string; fail: (e: string | null) => boolean; open: boolean; onToggle: () => void }

function UnitCard({ unit, index, total, siblings, bookLabel, strand, c, ko, me, canManage, nameOf, fail, open, onToggle }: UnitProps) {
  const { confirmDialog } = useApp()
  const lessons = c.lessons.filter(l => l.unit_id === unit.id).sort((a, b) => a.sort_order - b.sort_order)
  const resources = c.resources.filter(r => r.unit_id === unit.id)
  const [editing, setEditing] = useState(false)
  const [addingLesson, setAddingLesson] = useState(false)
  const label = `${bookLabel} · ${unit.title}`
  const confirmedLessons = lessons.filter(l => l.confirmed_at).length
  const flip = async () => { if (!fail(await setConfirmed('curriculum_units', [unit.id], me, !unit.confirmed_at, label))) c.reload() }
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '단원 삭제' : 'Delete this unit', message: ko ? `${unit.title}과(와) 차시 ${lessons.length}개가 지워집니다.` : `${unit.title} and its ${lessons.length} lessons go.`, confirmLabel: ko ? '삭제' : 'Delete' })) return
    if (!fail(await deleteUnit(unit.id, label))) c.reload()
  }
  const move = async (dir: -1 | 1) => { if (!fail(await reorder('curriculum_units', siblings, unit.id, dir))) c.reload() }
  return (
    <div className="border border-rule rounded">
      <div className="flex items-start gap-2 px-3 py-2">
        <button onClick={onToggle} className="mt-0.5 text-ink-3 hover:text-ink" aria-label={open ? 'Collapse' : 'Expand'}>{open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</button>
        <div className="min-w-0 flex-1">
          {editing ? (
            <UnitForm initial={unit} ko={ko} onCancel={() => setEditing(false)} onSave={async (d) => { const r = await saveUnit(unit.id, unit.book_id, d, { after: total, label: bookLabel, strand, known: c.skills }); if (!fail(r.error)) { setEditing(false); c.reload() } }} />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={onToggle} className="text-[13.5px] font-semibold text-ink text-left">{unit.title}</button>
                <span className="text-[11.5px] text-ink-3">{num(unit.default_weeks)} {ko ? '주' : unit.default_weeks === 1 ? 'week' : 'weeks'} · {lessons.length} {ko ? '차시' : lessons.length === 1 ? 'lesson' : 'lessons'}{lessons.length ? ` · ${confirmedLessons} ${ko ? '확인' : 'confirmed'}` : ''}</span>
                <SourceChip confirmed_at={unit.confirmed_at} confirmed_by={unit.confirmed_by} source={unit.source} ko={ko} nameOf={nameOf} />
              </div>
              {unit.summary && <p className="text-[12.5px] text-ink-2 mt-0.5">{unit.summary}</p>}
              <div className="mt-1"><Tags tags={unit.skill_tags} codes={unit.ccss_codes} /></div>
            </>
          )}
        </div>
        {canManage && !editing && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => move(-1)} disabled={index === 0} className={btnS} aria-label="Move up"><ArrowUp size={11} /></button>
            <button onClick={() => move(1)} disabled={index === total - 1} className={btnS} aria-label="Move down"><ArrowDown size={11} /></button>
            <button onClick={flip} className={`${btnS} ${unit.confirmed_at ? '' : 'text-good border-good'}`}><Check size={11} />{unit.confirmed_at ? (ko ? '확인 취소' : 'Unconfirm') : (ko ? '확인' : 'Confirm')}</button>
            <button onClick={() => setEditing(true)} className={btnS} aria-label="Edit"><Pencil size={11} /></button>
            <button onClick={remove} className={btnS} aria-label="Delete"><Trash2 size={11} /></button>
          </div>
        )}
      </div>
      {open && (
        <div className="border-t border-rule px-3 py-2 pl-9">
          {lessons.length === 0 && !addingLesson && <p className="text-[12px] text-ink-3 mb-1">{ko ? '차시 없음' : 'No lessons in this unit yet.'}</p>}
          <div className="flex flex-col">
            {lessons.map((l, i) => <LessonRow key={l.id} lesson={l} index={i} total={lessons.length} siblings={lessons} unitLabel={label} strand={strand} c={c} ko={ko} me={me} canManage={canManage} nameOf={nameOf} fail={fail} />)}
          </div>
          {addingLesson && <LessonForm initial={null} ko={ko} onCancel={() => setAddingLesson(false)} onSave={async (d) => { const r = await saveLesson(null, unit.id, d, { after: lessons.reduce((m, l) => Math.max(m, l.sort_order), 0), label, strand, known: c.skills }); if (!fail(r.error)) { setAddingLesson(false); c.reload() } }} />}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {canManage && <button onClick={() => setAddingLesson(a => !a)} className={btnS}><Plus size={11} />{ko ? '차시 추가' : 'Add a lesson'}</button>}
            {canManage && lessons.some(l => !l.confirmed_at) && <button onClick={async () => { if (!fail(await setConfirmed('curriculum_lessons', lessons.filter(l => !l.confirmed_at).map(l => l.id), me, true, label))) c.reload() }} className={btnS}><Check size={11} />{ko ? '차시 모두 확인' : 'Confirm these lessons'}</button>}
          </div>
          <Resources target={{ unit_id: unit.id }} items={resources} label={label} c={c} ko={ko} me={me} fail={fail} unitFolder={unit.drive_folder_url} />
        </div>
      )}
    </div>
  )
}

// ─── Lesson row ──────────────────────────────────────────────────
interface LessonProps { lesson: CurriculumLesson; index: number; total: number; siblings: CurriculumLesson[]; unitLabel: string; strand: Strand; c: C; ko: boolean; me: string; canManage: boolean; nameOf: (id: string | null | undefined) => string; fail: (e: string | null) => boolean }

function LessonRow({ lesson, index, total, siblings, unitLabel, strand, c, ko, me, canManage, nameOf, fail }: LessonProps) {
  const { confirmDialog } = useApp()
  const [editing, setEditing] = useState(false)
  const [showRes, setShowRes] = useState(false)
  const resources = c.resources.filter(r => r.lesson_id === lesson.id)
  const label = `${unitLabel} · ${lesson.title}`
  const flip = async () => { if (!fail(await setConfirmed('curriculum_lessons', [lesson.id], me, !lesson.confirmed_at, label))) c.reload() }
  const remove = async () => {
    if (!await confirmDialog({ title: ko ? '차시 삭제' : 'Delete this lesson', message: lesson.title, confirmLabel: ko ? '삭제' : 'Delete' })) return
    if (!fail(await deleteLesson(lesson.id, label))) c.reload()
  }
  const move = async (dir: -1 | 1) => { if (!fail(await reorder('curriculum_lessons', siblings, lesson.id, dir))) c.reload() }
  if (editing) return <LessonForm initial={lesson} ko={ko} onCancel={() => setEditing(false)} onSave={async (d) => { const r = await saveLesson(lesson.id, lesson.unit_id, d, { after: total, label: unitLabel, strand, known: c.skills }); if (!fail(r.error)) { setEditing(false); c.reload() } }} />
  return (
    <div className="py-2 border-b border-rule last:border-b-0">
      <div className="flex items-start gap-2">
        <span className="text-[11px] text-ink-3 w-5 pt-0.5 text-right shrink-0">{index + 1}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13px] font-medium text-ink">{lesson.title}</span>
            <SourceChip confirmed_at={lesson.confirmed_at} confirmed_by={lesson.confirmed_by} source={lesson.source} ko={ko} nameOf={nameOf} />
          </div>
          {lesson.objective ? <p className="text-[12.5px] text-ink-2 mt-0.5">{lesson.objective}</p> : <p className="text-[12px] text-warn mt-0.5">{ko ? '학습 목표 없음' : 'No "students will" line yet.'}</p>}
          {lesson.notes && <p className="text-[12px] text-ink-3 mt-0.5">{lesson.notes}</p>}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <Tags tags={lesson.skill_tags} codes={lesson.ccss_codes} />
            <button onClick={() => setShowRes(s => !s)} className="text-[11px] text-ink-3 hover:text-ink">{resources.length ? `${resources.length} ${ko ? '자료' : resources.length === 1 ? 'file' : 'files'}` : (ko ? '자료 추가' : 'Add a file')}</button>
          </div>
          {showRes && <Resources target={{ lesson_id: lesson.id }} items={resources} label={label} c={c} ko={ko} me={me} fail={fail} />}
        </div>
        {canManage && (
          <div className="flex gap-1 shrink-0">
            <button onClick={() => move(-1)} disabled={index === 0} className={btnS} aria-label="Move up"><ArrowUp size={11} /></button>
            <button onClick={() => move(1)} disabled={index === total - 1} className={btnS} aria-label="Move down"><ArrowDown size={11} /></button>
            <button onClick={flip} className={`${btnS} ${lesson.confirmed_at ? '' : 'text-good border-good'}`}><Check size={11} /></button>
            <button onClick={() => setEditing(true)} className={btnS} aria-label="Edit"><Pencil size={11} /></button>
            <button onClick={remove} className={btnS} aria-label="Delete"><Trash2 size={11} /></button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Resources (Drive links) ─────────────────────────────────────
function Resources({ target, items, label, c, ko, me, fail, unitFolder }: { target: { unit_id?: string; lesson_id?: string }; items: CurriculumResource[]; label: string; c: C; ko: boolean; me: string; fail: (e: string | null) => boolean; unitFolder?: string }) {
  const { confirmDialog } = useApp()
  const [adding, setAdding] = useState(false)
  const [d, setD] = useState<{ name: string; url: string; kind: ResourceKind; copies: string }>({ name: '', url: '', kind: 'other', copies: '' })
  const [saving, setSaving] = useState(false)
  const save = async () => {
    setSaving(true)
    const e = await addResource(target, { name: d.name, url: d.url, kind: d.kind, copies_hint: d.copies ? parseInt(d.copies, 10) || null : null }, me, label)
    setSaving(false)
    if (!fail(e)) { setAdding(false); setD({ name: '', url: '', kind: 'other', copies: '' }); c.reload() }
  }
  const remove = async (r: CurriculumResource) => {
    if (!await confirmDialog({ title: ko ? '자료 링크 삭제' : 'Remove this link', message: ko ? `${r.name} 링크만 지워집니다. Drive의 파일은 그대로입니다.` : `${r.name} leaves the list. The file in Drive is untouched.`, confirmLabel: ko ? '삭제' : 'Remove' })) return
    if (!fail(await deleteResource(r.id, `${label} · ${r.name}`))) c.reload()
  }
  return (
    <div className="mt-2">
      {(items.length > 0 || unitFolder) && (
        <div className="flex flex-col gap-1 mb-1">
          {unitFolder && <a href={unitFolder} target="_blank" rel="noreferrer" className="text-[12px] text-accent inline-flex items-center gap-1 w-fit"><ExternalLink size={11} />{ko ? '단원 Drive 폴더' : 'Unit folder in Drive'}</a>}
          {items.map(r => (
            <div key={r.id} className="flex items-center gap-2 text-[12px]">
              <span className={`${chip} bg-paper-3 text-ink-2 uppercase w-14 justify-center`}>{r.kind}</span>
              {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="text-ink hover:text-accent truncate">{r.name}</a> : <span className="text-ink truncate">{r.name}</span>}
              {r.copies_hint ? <span className="text-ink-3">× {r.copies_hint}</span> : null}
              <button onClick={() => remove(r)} className="text-ink-3 hover:text-bad ml-auto" aria-label="Remove"><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      {adding ? (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_90px_70px] gap-2 items-end border border-rule rounded p-2">
          <div><span className={lbl}>{ko ? '이름' : 'Name'}</span><input value={d.name} onChange={e => setD({ ...d, name: e.target.value })} className={inp} autoFocus /></div>
          <div><span className={lbl}>{ko ? 'Drive 링크' : 'Drive link'}</span><input value={d.url} onChange={e => setD({ ...d, url: e.target.value, kind: kindFromUrl(e.target.value) })} className={inp} placeholder="https://" /></div>
          <div><span className={lbl}>{ko ? '종류' : 'Kind'}</span><select value={d.kind} onChange={e => setD({ ...d, kind: e.target.value as ResourceKind })} className={`${sel} w-full`}>{RESOURCE_KINDS.map(k => <option key={k} value={k}>{k}</option>)}</select></div>
          <div><span className={lbl}>{ko ? '부수' : 'Copies'}</span><input value={d.copies} onChange={e => setD({ ...d, copies: e.target.value })} className={inp} inputMode="numeric" /></div>
          <div className="sm:col-span-4 flex gap-2"><button onClick={save} disabled={saving || !d.name.trim()} className={btnP}>{saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}{ko ? '추가' : 'Add'}</button><button onClick={() => setAdding(false)} className={btn}>{ko ? '취소' : 'Cancel'}</button></div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="text-[11.5px] text-ink-3 hover:text-ink inline-flex items-center gap-1"><Plus size={11} />{ko ? 'Drive 링크 추가' : 'Add a Drive link'}</button>
      )}
    </div>
  )
}
