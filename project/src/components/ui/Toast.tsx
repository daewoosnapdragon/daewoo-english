'use client'

import { useApp } from '@/lib/context'
import { Check } from 'lucide-react'

export default function Toast() {
  const { toast } = useApp()

  if (!toast) return null

  return (
    <div className="fixed bottom-6 right-6 bg-text-primary text-white px-5 py-3 rounded-xl text-[13px] shadow-lg z-[1000] flex items-center gap-2 animate-slide-up">
      <Check size={16} />
      {toast}
    </div>
  )
}
