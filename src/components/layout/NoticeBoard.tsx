'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '@/lib/context'
import { useTeachers } from '@/hooks/useData'
import { supabase } from '@/lib/supabase'
import { getKSTDateString } from '@/lib/utils'
import { X, Pencil, Trash2, Megaphone } from 'lucide-react'

// ─── Notice board ────────────────────────────────────────────────
// A band under the masthead on every page. Teachers post notices for other
// teachers; each reader dismisses each notice for themselves. Urgent notices
// get a red bar and sit on top. See supabase/migration-notices.sql.

interface Notice {
  id: string; body: string; style: 'notice' | 'urgent'; author_id: string | null
  audience: string[] | null; expires_on: string | null; created_at: string
}
interface Receipt { notice_id: string; teacher_id: string; seen_at: string | null; dismissed_at: string | null }

const CLASS_BG: Record<string, string> = {
  Lily: 'bg-level-lily', Camellia: 'bg-level-camellia', Daisy: 'bg-level-daisy',
  Sunflower: 'bg-level-sunflower', Marigold: 'bg-level-marigold', Snapdragon: 'bg-level-snapdragon',
}

function whenLabel(iso: string, lang: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const yesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString()
  if (sameDay) return d.toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' })
  if (yesterday) return lang === 'ko' ? '어제' : 'Yesterday'
  return d.toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' })
}

/** Friday of the current KST week (or today if it is already the weekend). */
function endOfWeek(): string {
  const kst = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }))
  const dow = kst.getDay()
  const add = dow >= 1 && dow <= 5 ? 5 - dow : 0
  const f = new Date(kst.getFullYear(), kst.getMonth(), kst.getDate() + add)
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

export default function NoticeBoard() {
  const { currentTeacher, language: lang, showToast, confirmDialog } = useApp()
  const { teachers } = useTeachers()
  const [notices, setNotices] = useState<Notice[]>([])
  const [receipts, setReceipts] = useState<Receipt[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [composing, setComposing] = useState(false)
  const [editing, setEditing] = useState<Notice | null>(null)
  const seenRef = useRef<Set<string>>(new Set())
  const me = currentTeacher?.id || ''
  const isAdmin = currentTeacher?.role === 'admin'

  const load = useCallback(async () => {
    if (!me) return
    const today = getKSTDateString()
    const { data, error } = await supabase.from('notices')
      .select('*')
      .or(`expires_on.is.null,expires_on.gte.${today}`)
      .order('created_at', { ascending: false })
    if (error) { console.warn('Notice board:', error.message); setLoadError(error.message); return }
    setLoadError(null)
    const mine = (data as Notice[]).filter(n => !n.audience || n.audience.includes(me) || n.author_id === me)
    setNotices(mine)
    if (mine.length) {
      const { data: rc } = await supabase.from('notice_receipts').select('*').in('notice_id', mine.map(n => n.id))
      setReceipts((rc as Receipt[]) || [])
    } else setReceipts([])
  }, [me])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const onCompose = () => { setComposing(true); window.scrollTo({ top: 0, behavior: 'smooth' }) }
    window.addEventListener('daewoo:compose-notice', onCompose)
    return () => window.removeEventListener('daewoo:compose-notice', onCompose)
  }, [])
  useEffect(() => {
    const id = setInterval(load, 60_000)
    const onFocus = () => load()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [load])

  // Record "seen" once per notice per session, for the author's count.
  useEffect(() => {
    if (!me) return
    const unseen = notices.filter(n => n.author_id !== me && !seenRef.current.has(n.id)
      && !receipts.some(r => r.notice_id === n.id && r.teacher_id === me))
    if (unseen.length === 0) return
    unseen.forEach(n => seenRef.current.add(n.id))
    supabase.from('notice_receipts').upsert(unseen.map(n => ({ notice_id: n.id, teacher_id: me })), { onConflict: 'notice_id,teacher_id', ignoreDuplicates: true }).then(() => {})
  }, [notices, receipts, me])

  const dismiss = async (n: Notice) => {
    setReceipts(prev => [...prev.filter(r => !(r.notice_id === n.id && r.teacher_id === me)), { notice_id: n.id, teacher_id: me, seen_at: new Date().toISOString(), dismissed_at: new Date().toISOString() }])
    await supabase.from('notice_receipts').upsert({ notice_id: n.id, teacher_id: me, dismissed_at: new Date().toISOString() }, { onConflict: 'notice_id,teacher_id' })
  }
  const remove = async (n: Notice) => {
    if (!await confirmDialog({ title: lang === 'ko' ? '이 공지를 삭제할까요?' : 'Remove this notice for everyone?', danger: true, confirmLabel: lang === 'ko' ? '삭제' : 'Remove' })) return
    await supabase.from('notices').delete().eq('id', n.id)
    showToast(lang === 'ko' ? '삭제되었습니다' : 'Notice removed'); load()
  }

  const visible = useMemo(() => notices
    .filter(n => !receipts.some(r => r.notice_id === n.id && r.teacher_id === me && r.dismissed_at))
    .sort((a, b) => Number(b.style === 'urgent') - Number(a.style === 'urgent') || b.created_at.localeCompare(a.created_at)),
  [notices, receipts, me])

  if (!currentTeacher) return null
  const activeTeachers = teachers.filter(t => t.is_active !== false)
  const authorOf = (n: Notice) => activeTeachers.find(t => t.id === n.author_id) || teachers.find(t => t.id === n.author_id) || null

  // Only admin sees why, so a missing table is diagnosable without a console.
  if (loadError) {
    if (!isAdmin) return null
    return (
      <div className="bg-warn-soft border-b border-rule text-[12px] text-warn px-6 py-1.5 no-print">
        Notice board unavailable: {loadError}. Run supabase/migration-notices.sql in the Supabase SQL Editor.
      </div>
    )
  }
  const audienceLabel = (n: Notice) => {
    if (!n.audience) return lang === 'ko' ? '전체' : 'to everyone'
    const names = n.audience.filter(id => id !== n.author_id).map(id => activeTeachers.find(t => t.id === id)?.name).filter(Boolean)
    return (lang === 'ko' ? '→ ' : 'to ') + (names.length ? names.join(', ') : (lang === 'ko' ? '선택된 교사' : 'selected teachers'))
  }
  const seenLabel = (n: Notice) => {
    const recipients = (n.audience ? n.audience : activeTeachers.map(t => t.id)).filter(id => id !== n.author_id)
    const seen = receipts.filter(r => r.notice_id === n.id && r.seen_at && recipients.includes(r.teacher_id)).length
    return lang === 'ko' ? `${recipients.length}명 중 ${seen}명 확인` : `seen by ${seen} of ${recipients.length}`
  }

  return (
    <div className="bg-surface border-b border-rule-2 no-print">
      <div className="mx-auto max-w-[1440px]">
        {visible.map(n => {
          const canEdit = n.author_id === me || isAdmin
          const author = authorOf(n)
          const initial = (author?.name || '?').charAt(0)
          return (
            <div key={n.id} className={`grid grid-cols-[34px_1fr_auto] gap-3 items-center px-6 py-2 border-b border-rule text-[13.5px] ${n.style === 'urgent' ? 'bg-bad-soft shadow-[inset_4px_0_0_rgb(var(--bad))]' : ''}`}>
              <span className={`w-6 h-6 rounded-full text-white text-[11px] font-bold flex items-center justify-center ${CLASS_BG[author?.english_class || ''] || 'bg-ink'}`}>{initial}</span>
              <span className="text-ink min-w-0 whitespace-pre-wrap break-words">{n.body}</span>
              <span className="flex items-center gap-3 text-[11.5px] text-ink-3 whitespace-nowrap">
                <span>{author?.name || (lang === 'ko' ? '알 수 없음' : 'Unknown')} · {whenLabel(n.created_at, lang)} · {audienceLabel(n)}{n.author_id === me ? ` · ${seenLabel(n)}` : ''}</span>
                {canEdit && <button onClick={() => setEditing(n)} title={lang === 'ko' ? '수정' : 'Edit'} className="text-ink-3 hover:text-ink"><Pencil size={13} /></button>}
                {canEdit && <button onClick={() => remove(n)} title={lang === 'ko' ? '모두에게서 삭제' : 'Remove for everyone'} className="text-ink-3 hover:text-bad"><Trash2 size={13} /></button>}
                {n.author_id !== me && <button onClick={() => dismiss(n)} title={lang === 'ko' ? '닫기' : 'Dismiss'} className="text-ink-3 hover:text-ink text-[18px] leading-none">×</button>}
              </span>
            </div>
          )
        })}
        {(composing || editing) ? (
          <Composer teachers={activeTeachers} existing={editing} onClose={() => { setComposing(false); setEditing(null) }} onSaved={() => { setComposing(false); setEditing(null); load() }} />
        ) : (
          <button onClick={() => setComposing(true)} className="w-full flex items-center gap-3 px-6 py-1.5 text-[12.5px] text-ink-3 hover:text-ink hover:bg-paper-2 text-left">
            <Megaphone size={14} className="ml-1.5" />{lang === 'ko' ? '다른 교사에게 공지 남기기…' : 'Post a notice for other teachers…'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Composer ────────────────────────────────────────────────────
function Composer({ teachers, existing, onClose, onSaved }: { teachers: { id: string; name: string; english_class: string }[]; existing: Notice | null; onClose: () => void; onSaved: () => void }) {
  const { currentTeacher, language: lang, showToast } = useApp()
  const me = currentTeacher?.id || ''
  const others = teachers.filter(t => t.id !== me)
  const [body, setBody] = useState(existing?.body || '')
  const [everyone, setEveryone] = useState(!existing?.audience)
  const [picked, setPicked] = useState<Set<string>>(new Set(existing?.audience || []))
  const today = getKSTDateString()
  const initialUntil = !existing ? 'today' : existing.expires_on == null ? 'remove' : existing.expires_on === today ? 'today' : existing.expires_on === endOfWeek() ? 'week' : 'date'
  const [until, setUntil] = useState<'today' | 'week' | 'remove' | 'date'>(initialUntil)
  const [date, setDate] = useState(existing?.expires_on || today)
  const [style, setStyle] = useState<'notice' | 'urgent'>(existing?.style || 'notice')
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ref.current?.focus() }, [])

  const togglePick = (id: string) => { setEveryone(false); setPicked(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }) }
  const expires = until === 'today' ? today : until === 'week' ? endOfWeek() : until === 'date' ? date : null

  const save = async () => {
    const text = body.trim()
    if (!text) { showToast(lang === 'ko' ? '내용을 입력하세요' : 'Write the notice first'); return }
    if (!everyone && picked.size === 0) { showToast(lang === 'ko' ? '받을 교사를 선택하세요' : 'Pick who should see it'); return }
    setSaving(true)
    const row = { body: text, style, audience: everyone ? null : Array.from(picked), expires_on: expires, updated_at: new Date().toISOString() }
    const { error } = existing
      ? await supabase.from('notices').update(row).eq('id', existing.id)
      : await supabase.from('notices').insert({ ...row, author_id: me })
    setSaving(false)
    if (error) { showToast(`Error: ${error.message}`); return }
    showToast(existing ? (lang === 'ko' ? '수정되었습니다' : 'Notice updated') : (lang === 'ko' ? '게시되었습니다' : 'Posted'))
    onSaved()
  }

  const chip = (on: boolean) => `px-2.5 h-7 rounded-full border text-[12px] font-medium ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3'}`
  const label = 'eyebrow pt-1.5 whitespace-nowrap'

  return (
    <div className="px-6 py-4 bg-paper-2 border-b border-rule grid gap-3">
      <textarea ref={ref} id="notice-body" value={body} onChange={e => setBody(e.target.value)} rows={2}
        onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') save(); if (e.key === 'Escape') onClose() }}
        placeholder={lang === 'ko' ? '예: 오늘 1학년은 3:00에 하교합니다.' : 'e.g. Release Grade 1 at 3:00 today, not 3:30.'}
        className="w-full max-w-[860px] px-3 py-2 bg-surface border border-rule-2 rounded text-[14px] text-ink placeholder:text-ink-3 resize-y" />
      <div className="grid grid-cols-[90px_1fr] gap-x-4 gap-y-2 items-start max-w-[860px]">
        <span className={label}>{lang === 'ko' ? '공유 대상' : 'Share with'}</span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => { setEveryone(true); setPicked(new Set()) }} className={chip(everyone)}>{lang === 'ko' ? '전체' : 'Everyone'}</button>
          {others.map(t => <button key={t.id} onClick={() => togglePick(t.id)} className={chip(!everyone && picked.has(t.id))}>{t.name} · {t.english_class}</button>)}
        </div>
        <span className={label}>{lang === 'ko' ? '표시 기간' : 'Show until'}</span>
        <div className="flex flex-wrap gap-1.5 items-center">
          <button onClick={() => setUntil('today')} className={chip(until === 'today')}>{lang === 'ko' ? '오늘까지' : 'End of today'}</button>
          <button onClick={() => setUntil('week')} className={chip(until === 'week')}>{lang === 'ko' ? '이번 주까지' : 'End of this week'}</button>
          <button onClick={() => setUntil('remove')} className={chip(until === 'remove')}>{lang === 'ko' ? '삭제할 때까지' : 'Until I remove it'}</button>
          <button onClick={() => setUntil('date')} className={chip(until === 'date')}>{lang === 'ko' ? '날짜 선택' : 'Pick a date'}</button>
          {until === 'date' && <input id="notice-date" type="date" value={date} min={today} onChange={e => setDate(e.target.value)} className="h-7 px-2 bg-surface border border-rule-2 rounded text-[12px] text-ink" />}
        </div>
        <span className={label}>{lang === 'ko' ? '유형' : 'Style'}</span>
        <div className="flex flex-wrap gap-1.5">
          <button onClick={() => setStyle('notice')} className={chip(style === 'notice')}>{lang === 'ko' ? '일반' : 'Notice'}</button>
          <button onClick={() => setStyle('urgent')} className={chip(style === 'urgent')}>{lang === 'ko' ? '긴급 · 빨간 표시, 맨 위 고정' : 'Urgent · red bar, stays on top'}</button>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={save} disabled={saving} className="h-8 px-3.5 rounded bg-accent text-white text-[13px] font-semibold hover:bg-accent-hover disabled:opacity-60">
          {existing ? (lang === 'ko' ? '저장' : 'Save') : everyone ? (lang === 'ko' ? '전체에 게시' : 'Post to everyone') : (lang === 'ko' ? `${picked.size}명에게 게시` : `Post to ${picked.size} ${picked.size === 1 ? 'teacher' : 'teachers'}`)}
        </button>
        <button onClick={onClose} className="h-8 px-3 rounded border border-rule-2 text-[13px] text-ink-2 hover:text-ink">{lang === 'ko' ? '취소' : 'Cancel'}</button>
        <span className="text-[11.5px] text-ink-3 ml-2">⌘↩ {lang === 'ko' ? '게시' : 'to post'}</span>
      </div>
    </div>
  )
}
