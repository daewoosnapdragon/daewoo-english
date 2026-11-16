/** A small check that draws itself once: the sign that something is done. */
export default function DrawnCheck({ size = 14, className = '' }: { size?: number; className?: string }) {
  return (
    <svg className={`drawn-check ${className}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path pathLength={1} d="M3 8.5 6.4 12 13 4.5" />
    </svg>
  )
}
