import { SIZES, SIZE_LABELS, type JobSize } from '@/lib/adminJobs'

// ─── How big a job is, as a picture ──────────────────────────────
// Four rising blocks, filled to the size, with the word beside them:
// a few minutes, an hour or so, half a day, several days. Flat and the
// same everywhere, so the amount of work reads at a glance.

export default function SizeMark({ size, ko, word = true, className = '' }: { size: JobSize; ko: boolean; word?: boolean; className?: string }) {
  const n = SIZES.indexOf(size) + 1
  const label = SIZE_LABELS[size][ko ? 'ko' : 'en']
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap ${className}`} title={`${size} · ${label}`} aria-label={`${ko ? '크기' : 'Size'}: ${label}`}>
      <span className="inline-flex items-end gap-[2px]" aria-hidden="true">
        {[1, 2, 3, 4].map(i => <span key={i} className={`block w-[4px] rounded-[1px] ${i <= n ? 'bg-ink' : 'bg-rule-2'}`} style={{ height: 4 + i * 2.5 }} />)}
      </span>
      {word && <span>{label}</span>}
    </span>
  )
}
