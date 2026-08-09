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

  useEffect(() => {
    // Focus the field for a prompt, the action button for a confirm.
    if (request.kind === 'prompt') inputRef.current?.focus()
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
        if (e.key === 'Enter' && request.kind === 'confirm') { e.stopPropagation(); accept() }
      }}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dlg-title"
        onClick={e => e.stopPropagation()}
        className="w-full max-w-[420px] bg-surface border border-border rounded-2xl shadow-lg overflow-hidden"
      >
        <div className="px-5 pt-5 pb-4 flex items-start gap-3">
          {request.danger && (
            <span className="mt-0.5 w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle size={16} className="text-red-600" />
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 id="dlg-title" className="text-[15px] font-semibold text-text-primary leading-snug">{request.title}</h3>
            {request.message && (
              <p className="text-[13px] text-text-secondary mt-1.5 leading-relaxed whitespace-pre-line">{request.message}</p>
            )}
          </div>
          <button onClick={cancel} aria-label="Close" className="p-1 -mt-1 -mr-1 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-alt transition-colors shrink-0">
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
              className="w-full px-3 py-2 border border-border rounded-lg text-[13px] bg-surface text-text-primary outline-none focus:border-navy"
            />
          </div>
        )}

        <div className="px-5 py-4 flex items-center justify-end gap-2">
          <button
            onClick={cancel}
            className="px-3.5 py-2 rounded-lg text-[13px] font-medium text-text-secondary hover:bg-surface-alt transition-colors"
          >{request.cancelLabel || 'Cancel'}</button>
          <button
            ref={confirmRef}
            onClick={accept}
            disabled={request.kind === 'prompt' && !text.trim()}
            className={`px-3.5 py-2 rounded-lg text-[13px] font-semibold text-white transition-colors disabled:opacity-40 ${
              request.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-navy hover:bg-navy-dark'
            }`}
          >{request.confirmLabel || (request.danger ? 'Delete' : 'Confirm')}</button>
        </div>
      </div>
    </div>
  )
}
