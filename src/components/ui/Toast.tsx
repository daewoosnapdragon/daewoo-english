'use client'

import { useApp } from '@/lib/context'
import { Check, AlertCircle, X } from 'lucide-react'

export default function Toast() {
  const { toast } = useApp()

  if (!toast) return null

  const isError = toast.toLowerCase().startsWith('error')

  return (
    <div onClick={() => {}} className={`fixed bottom-6 right-6 ${isError ? 'bg-red-600' : 'bg-text-primary'} text-white px-5 py-3 rounded-xl text-[13px] shadow-lg z-[1000] flex items-center gap-2 animate-slide-up cursor-pointer`}
      title="Click to dismiss">
      {isError ? <AlertCircle size={16} /> : <Check size={16} />}
      {toast}
    </div>
  )
}
