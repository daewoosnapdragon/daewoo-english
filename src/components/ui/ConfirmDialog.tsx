'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'

export interface DialogRequest {
  kind: 'confirm' | 'prompt'
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  /** prompt only */
  placeholder?: string
  defaultValue?: string
}

/**
 * Replacement for window.confirm/prompt, which are unstyled OS dialogs that
 * ignore the app's theme entirely (they stay light in dark mode) and, in the
 * case of prompt(), cannot validate input.
 */
export default function ConfirmDialog({ request, onResolve }: {
  request: DialogRequest
  onResolve: (value: boolean | string | null) => void
}) {
  const [text, setText] = useState(request.defaultValue ?? '')
  const inputRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Focus the field for a prompt. For a confirm, the action button, unless
    // the action is destructive (delete, leave without saving): then Cancel,
    // so a stray Enter keeps the work instead of throwing it away.
    if (request.kind === 'prompt') inputRef.current?.focus()
    else if (request.danger) cancelRef.current?.focus()
    else confirmRef.current?.focus()
  }, [request])

  const cancel = () => onResolve(request.kind === 'prompt' ? null : false)
  const accept = () => onResolve(request.kind === 'prompt' ? text : true)

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={cancel}
      onKeyDown={e => {
        if (e.key === 'Escape') { e.stopPropagation(); cancel() }
        // Enter on a button presses that button (the browser does it); Enter
        // elsewhere accepts, but never for a destructive confirm.
        if (e.key === 'Enter' && request.kind === 'confirm' && !request.danger && !(e.target instanceof HTMLButtonElement)) { e.stopPropagation(); accept() }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[420px] bg-surface rounded-xl shadow-lg overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          {request.danger && (
            <span className="mt-0.5 w-8 h-8 rounded-full bg-bad-soft flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-bad" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 id="dlg-title" className="text-[length:calc(15px*var(--ts))] font-semibold text-ink leading-snug">{request.title}</h3>
            {request.message && (
              <p className="text-[length:calc(13px*var(--ts))] text-ink-2 mt-1.5 leading-relaxed whitespace-pre-line">{request.message}</p>
            )}
          </div>
          <button onClick={cancel} aria-label="Close" className="p-1 -mt-1 -mr-1 rounded text-ink-3 hover:text-ink hover:bg-paper-2 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {request.kind === 'prompt' && (
          <div className="px-5 pb-2">
            <input
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={request.placeholder}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); accept() } }}
              className="w-full h-9 px-3 border border-rule-2 rounded text-[length:calc(13px*var(--ts))] bg-surface text-ink outline-none"
            />
          </div>
        )}

        <div className="px-5 py-4 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            onClick={cancel}
            className="h-9 px-3.5 rounded border border-rule-2 text-[length:calc(13px*var(--ts))] font-medium text-ink-2 hover:text-ink hover:border-ink-3 transition-colors"
          >{request.cancelLabel || 'Cancel'}</button>
          <button
            ref={confirmRef}
            onClick={accept}
            disabled={request.kind === 'prompt' && !text.trim()}
            className={`h-9 px-3.5 rounded text-[length:calc(13px*var(--ts))] font-semibold text-white transition-colors disabled:opacity-40 ${
              request.danger ? 'bg-bad hover:bg-bad/90' : 'bg-accent hover:bg-accent-hover'
            }`}
          >{request.confirmLabel || (request.danger ? 'Delete' : 'Confirm')}</button>
        </div>
      </div>
    </div>
  )
}
