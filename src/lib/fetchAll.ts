// ─── Every row, not the first 1000 ───────────────────────────────
// Supabase returns at most 1000 rows a request (the project's Max rows
// setting), with no error when it stops. The catalogue alone has more
// lessons than that, so reads that need every row go through here: the
// query is asked for one page at a time with .range() until a short page
// comes back. The query must be ordered by something unique (add the id),
// or rows can repeat or go missing between pages.

export const PAGE = 1000

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

export async function fetchAll<T>(page: (from: number, to: number) => Page<T>, size = PAGE): Promise<{ data: T[]; error: { message: string } | null }> {
  const out: T[] = []
  for (let from = 0; from < 1_000_000; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) return { data: out, error }
    const rows = data || []
    out.push(...rows)
    if (rows.length < size) break
  }
  return { data: out, error: null }
}
