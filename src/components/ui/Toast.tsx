'use client'

import { useState, useEffect, useCallback } from 'react'
import { useApp } from '@/lib/context'
import { Check, AlertCircle, X } from 'lucide-react'

const DURATION = 4000
const ERROR_DURATION = 6000

export default function Toast() {
  const { toast } = useApp()
  const [visible, setVisible] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [currentToast, setCurrentToast] = useState<string | null>(null)

  const dismiss = useCallback(() => {
    setLeaving(true)
    setTimeout(() => { setVisible(false); setLeaving(false); setCurrentToast(null) }, 250)
  }, [])

  useEffect(() => {
    if (toast && toast !== currentToast) {
      setCurrentToast(toast)
      setLeaving(false)
      setVisible(true)
      const isError = toast.toLowerCase().startsWith('error')
      const duration = isError ? ERROR_DURATION : DURATION
      const timer = setTimeout(dismiss, duration)
      return () => clearTimeout(timer)
    }
  }, [toast, currentToast, dismiss])

  if (!visible || !currentToast) return null

  const isError = currentToast.toLowerCase().startsWith('error')
  const duration = isError ? ERROR_DURATION : DURATION

  return (
    <div
      onClick={dismiss}
      className={`fixed bottom-6 right-6 z-[1000] cursor-pointer ${leaving ? 'animate-toast-out' : 'animate-toast-in'}`}
    >
      <div className={`${isError ? 'bg-red-600' : 'bg-navy-dark'} text-white rounded-xl shadow-lg overflow-hidden min-w-[280px] max-w-[420px]`}>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${isError ? 'bg-red-500' : 'bg-green-500/20'}`}>
            {isError ? <AlertCircle size={14} /> : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" className="animate-check-draw" />
              </svg>
            )}
          </div>
          <span className="text-[13px] font-medium flex-1 leading-snug">{currentToast}</span>
          <button onClick={(e) => { e.stopPropagation(); dismiss() }} className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5">
            <X size={14} />
          </button>
        </div>
        {/* Progress bar */}
        <div className="h-[2px] bg-white/10">
          <div
            className="h-full bg-white/30 origin-left"
            style={{ animation: `toast-progress ${duration}ms linear forwards` }}
          />
        </div>
      </div>
    </div>
  )
}
