import { describe, it, expect } from 'vitest'
import { fetchAll } from '../fetchAll'

const table = Array.from({ length: 2345 }, (_, i) => ({ id: i }))
const fake = (from: number, to: number) => Promise.resolve({ data: table.slice(from, to + 1), error: null })

describe('fetchAll', () => {
  it('reads past the 1000-row page until a short page', async () => {
    const r = await fetchAll(fake)
    expect(r.data).toHaveLength(2345)
    expect(r.data[2344].id).toBe(2344)
  })
  it('stops on an exact multiple with one empty page, and passes errors on', async () => {
    const two = table.slice(0, 2000)
    expect((await fetchAll((f, t) => Promise.resolve({ data: two.slice(f, t + 1), error: null }))).data).toHaveLength(2000)
    const r = await fetchAll(() => Promise.resolve({ data: null, error: { message: 'boom' } }))
    expect(r.error?.message).toBe('boom')
  })
})
