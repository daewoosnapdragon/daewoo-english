'use client'

import { type LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center mx-auto mb-4">
        <Icon size={22} className="text-navy/30" />
      </div>
      <p className="text-[14px] font-semibold text-text-secondary">{title}</p>
      {description && <p className="text-[12px] text-text-tertiary mt-1.5 max-w-[300px] mx-auto leading-relaxed">{description}</p>}
      {action && (
        <button onClick={action.onClick}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-medium bg-navy text-white hover:bg-navy-dark transition-colors">
          {action.label}
        </button>
      )}
    </div>
  )
}
