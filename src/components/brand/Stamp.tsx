'use client'

// ─── Stamp ───────────────────────────────────────────────────────
// A crisp oxblood stamp, set at a slight angle. `land` plays the stamp
// coming down once; leave it off for a stamp that is already there.

const KINDS = {
  approved: ['APPROVED', '승인'],
  printed: ['PRINTED', '인쇄됨'],
  finalized: ['FINALIZED', '확정'],
} as const

export type StampKind = keyof typeof KINDS

export default function Stamp({ kind, date, size = 'md', land = false }: { kind: StampKind; date?: string | null; size?: 'sm' | 'md'; land?: boolean }) {
  const [en, ko] = KINDS[kind]
  const when = date ? new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase() : null
  return (
    <span className={`stamp stamp-${size}${land ? ' stamp-land' : ''}`} role="img" aria-label={`${en.toLowerCase()}${when ? ` ${when}` : ''}`}>
      <span className="stamp-big">{en}</span>
      <span className="stamp-small"><span lang="ko">{ko}</span>{when ? ` · ${when}` : ''}</span>
    </span>
  )
}
