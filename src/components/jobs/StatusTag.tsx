'use client'

import { useState } from 'react'
import { STATUSES, STATUS_LABELS, type JobStatus } from '@/lib/adminJobs'

// A small tag that says the status and, on click, offers the others.
// Waiting asks for one line about what the job waits on.

const tone: Record<JobStatus, string> = {
  scheduled: 'border-rule-2 text-ink-2', in_progress: 'border-accent text-accent', waiting: 'border-warn text-warn', done: 'border-good text-good',
}

export default function StatusTag({ status, waitingOn, ko, onChange, small }: { status: JobStatus; waitingOn?: string; ko: boolean; onChange: (s: JobStatus, waitingOn?: string) => void; small?: boolean }) {
  const [open, setOpen] = useState(false)
  const [waitText, setWaitText] = useState(waitingOn || '')
  const [asking, setAsking] = useState(false)
  const size = small ? 'h-6 px-2 text-[length:calc(11.5px*var(--ts))]' : 'h-7 px-2.5 text-[length:calc(11.5px*var(--ts))]'
  return (
    <span className="relative inline-block">
      <button onClick={e => { e.stopPropagation(); setOpen(o => !o); setAsking(false) }} className={`${size} rounded-full border bg-surface font-medium whitespace-nowrap ${tone[status]}`} title={status === 'waiting' && waitingOn ? waitingOn : undefined}>
        {STATUS_LABELS[status][ko ? 'ko' : 'en']}{status === 'waiting' && waitingOn ? ` · ${waitingOn}` : ''}
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={e => { e.stopPropagation(); setOpen(false) }} />
          <span className="absolute left-0 top-8 z-50 min-w-[180px] bg-surface border border-rule-2 rounded shadow-lg py-1 block" onClick={e => e.stopPropagation()}>
            {STATUSES.map(s => (
              <button key={s} onClick={() => { if (s === 'waiting') { setAsking(true); return } onChange(s); setOpen(false) }} className={`w-full text-left px-3 py-1.5 text-[length:calc(12px*var(--ts))] hover:bg-paper-2 ${s === status ? 'text-ink font-semibold' : 'text-ink-2'}`}>
                {STATUS_LABELS[s][ko ? 'ko' : 'en']}
              </button>
            ))}
            {asking && (
              <span className="block px-3 py-2 border-t border-rule">
                <input autoFocus value={waitText} onChange={e => setWaitText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { onChange('waiting', waitText.trim()); setOpen(false) } if (e.key === 'Escape') setOpen(false) }} placeholder={ko ? '무엇을 기다리나요?' : 'Waiting on whom or what?'} className="w-full h-7 px-2 bg-paper border border-rule-2 rounded text-[length:calc(12px*var(--ts))] text-ink" />
                <button onClick={() => { onChange('waiting', waitText.trim()); setOpen(false) }} className="mt-1.5 h-6 px-2 rounded bg-accent text-white text-[length:calc(11.5px*var(--ts))] font-semibold">{ko ? '저장' : 'Save'}</button>
              </span>
            )}
          </span>
        </>
      )}
    </span>
  )
}
