'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Icon from './Icon';

// ============================================================
// Drop-in replacements for window.prompt() and window.confirm()
// that match the app's dark UI design system.
// ============================================================

interface DialogState {
  type: 'prompt' | 'confirm';
  title: string;
  message?: string;
  defaultValue?: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (value: string | boolean | null) => void;
}

let showDialogFn: ((state: Omit<DialogState, 'resolve'>) => Promise<string | boolean | null>) | null = null;

/**
 * Show a styled prompt dialog. Returns the entered string, or null if cancelled.
 */
export function showPrompt(title: string, opts?: { message?: string; defaultValue?: string }): Promise<string | null> {
  if (!showDialogFn) return Promise.resolve(window.prompt(title) as string | null);
  return showDialogFn({ type: 'prompt', title, ...opts }) as Promise<string | null>;
}

/**
 * Show a styled confirm dialog. Returns true/false.
 */
export function showConfirm(title: string, opts?: { message?: string; confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  if (!showDialogFn) return Promise.resolve(window.confirm(title));
  return showDialogFn({ type: 'confirm', title, ...opts }) as Promise<boolean>;
}

/**
 * Mount this once in layout or page — it provides the dialog UI.
 */
export default function DialogProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    showDialogFn = (state) => {
      return new Promise((resolve) => {
        setDialog({ ...state, resolve } as DialogState);
        setInputValue(state.defaultValue || '');
      });
    };
    return () => { showDialogFn = null; };
  }, []);

  useEffect(() => {
    if (dialog?.type === 'prompt') {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [dialog]);

  const close = useCallback((result: string | boolean | null) => {
    dialog?.resolve(result);
    setDialog(null);
    setInputValue('');
  }, [dialog]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close(dialog?.type === 'confirm' ? false : null);
    if (e.key === 'Enter' && dialog?.type === 'prompt') close(inputValue.trim() || null);
  };

  return (
    <>
      {children}
      {dialog && (
        <div className="modal-overlay" onClick={() => close(dialog.type === 'confirm' ? false : null)} onKeyDown={handleKeyDown}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e0a0b0', marginBottom: 8 }}>
              {dialog.title}
            </h3>
            {dialog.message && (
              <p style={{ fontSize: 11, color: '#8a5565', marginBottom: 12 }}>{dialog.message}</p>
            )}

            {dialog.type === 'prompt' && (
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-3 py-2 bg-cyber-bg border border-cyber-border text-cyber-fg text-[12px] outline-none focus:border-cyber-fg"
                placeholder="Enter a name…"
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button
                onClick={() => close(dialog.type === 'confirm' ? false : null)}
                className="btn-glow"
                style={{ padding: '6px 14px', fontSize: 11 }}
              >
                Cancel
              </button>
              <button
                onClick={() => close(dialog.type === 'confirm' ? true : inputValue.trim() || null)}
                className={dialog.danger ? 'btn-sweep' : 'btn-sweep'}
                style={{
                  padding: '6px 14px', fontSize: 11,
                  borderColor: dialog.danger ? '#8b2020' : undefined,
                  color: dialog.danger ? '#ff6b6b' : undefined,
                }}
              >
                {dialog.confirmLabel || (dialog.type === 'confirm' ? 'Confirm' : 'OK')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
