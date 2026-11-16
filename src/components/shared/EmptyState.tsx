'use client'

import { type LucideIcon } from 'lucide-react'
import { useApp } from '@/lib/context'
import ClassFlower, { flowerForClass } from '@/components/brand/ClassFlower'

// ─── Empty state ─────────────────────────────────────────────────
// The signed-in teacher's class flower, one sentence in a teacher's voice,
// and the one next step. `icon` is accepted for older call sites and not
// shown: the flower takes its place.

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  compact?: boolean
}

export default function EmptyState({ title, description, action, compact = false }: EmptyStateProps) {
  const { currentTeacher } = useApp()
  return (
    <div className={`${compact ? 'py-8' : 'py-14'} px-6 text-center flex flex-col items-center`}>
      <ClassFlower name={flowerForClass(currentTeacher?.english_class)} size={compact ? 72 : 96} line={1.1} />
      <p className="font-display text-[21px] leading-tight text-ink mt-3">{title}</p>
      {description && <p className="text-[13.5px] text-ink-2 mt-1.5 max-w-[340px] leading-relaxed">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 inline-flex items-center gap-1.5 h-9 px-4 rounded text-[13px] font-semibold bg-accent text-white hover:bg-accent-hover">
          {action.label}
        </button>
      )}
    </div>
  )
}
