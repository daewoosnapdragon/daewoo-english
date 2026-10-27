// ─── What a teacher types in a score box ─────────────────────────
// "7", "7.5", "7/10" or "=7/10" (a fraction of the total). Empty clears the
// score. Anything else is not a score and the box is put back as it was.

/** null = cleared, undefined = not a score. */
export function parseScoreInput(value: string, maxScore: number): number | null | undefined {
  const v = value.trim()
  if (v === '') return null
  const body = v.startsWith('=') ? v.slice(1) : v
  if (body.includes('/')) {
    const [a, b] = body.split('/')
    const n = parseFloat(a), d = parseFloat(b)
    if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return undefined
    return Math.round((n / d) * maxScore * 100) / 100
  }
  const n = parseFloat(body)
  if (!Number.isFinite(n) || !/^-?\d*\.?\d+$/.test(body)) return undefined
  return Math.round(n * 100) / 100
}
