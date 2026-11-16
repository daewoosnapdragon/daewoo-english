// ─── Remembered reads (all pages) ─────────────────────────────────────
// Sits under the Supabase client as its fetch. Reads (GET/HEAD to the REST
// API) are remembered for the session so a page opened again, or one the
// pointer is resting on in the menu, can draw in one go instead of piece by
// piece as each answer comes back.
//
// Remembered answers are used only while a page is opening (the first two
// seconds after the address changes). After that every read goes to the
// database as before, so polling, refreshing after a save and live score
// sync are unchanged. A remembered answer is always checked again in the
// background; if the database has something newer, `onStale` fires so the
// page can be drawn again with it. Any write clears everything remembered.

export type ReadKey = string

interface Entry { at: number; status: number; statusText: string; headers: [string, string][]; body: string }

/** How long after a change of page remembered answers may be used. */
export const OPENING_MS = 2000
/** The oldest remembered answer that is still worth showing. */
export const MAX_AGE_MS = 10 * 60_000
/** A remembered answer younger than this is not checked again. */
const RECENT_MS = 5000
/** Writes that do not change what any page shows. */
const QUIET_WRITES = /\/rest\/v1\/activity_log\b/
/** Request headers that change what comes back (kept with each recorded read). */
const SHAPE_HEADERS = ['accept', 'accept-profile', 'prefer', 'range', 'range-unit']

const cache = new Map<ReadKey, Entry>()
const inflight = new Map<ReadKey, Promise<Entry | null>>()
let generation = 0
let lastPath: string | null = null
let openUntil = 0
let staleListener: ((path: string) => void) | null = null
let baseFetch: typeof fetch = (input, init) => fetch(input, init)
let now = () => Date.now()
let currentPath = () => (typeof window === 'undefined' ? '' : window.location.pathname)
let inBrowser = () => typeof window !== 'undefined'

// Which reads each page made last time, so they can be fetched ahead of a click.
// Kept per teacher, so a shared computer warms each teacher's own pages.
// Only addresses are stored (which table, which filters), never answers.
let recipeKey = 'daewoo_reads'
const RECIPE_MAX = 40
type Recipe = { u: string; m: string; h: Record<string, string> }
type Book = { pages: Record<string, Recipe[]>; visits: Record<string, number> }
let recipes: Book | null = null

function loadRecipes(): Book {
  if (recipes) return recipes
  try {
    const raw = JSON.parse(localStorage.getItem(recipeKey) || '{}') || {}
    recipes = raw.pages ? raw : { pages: {}, visits: {} }
  } catch { recipes = { pages: {}, visits: {} } }
  return recipes!
}
let saveTimer: ReturnType<typeof setTimeout> | null = null
function saveRecipes() {
  if (saveTimer) return
  const key = recipeKey
  saveTimer = setTimeout(() => { saveTimer = null; try { localStorage.setItem(key, JSON.stringify(recipes)) } catch { /* private mode */ } }, 1000)
}

/** Whose pages are being recorded (the logged-in teacher). */
export function setReader(id: string | null) {
  const key = id ? `daewoo_reads:${id}` : 'daewoo_reads'
  if (key === recipeKey) return
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; try { localStorage.setItem(recipeKey, JSON.stringify(recipes)) } catch {} }
  recipeKey = key; recipes = null
}

function headerObject(h: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  new Headers(h || {}).forEach((v, k) => { out[k.toLowerCase()] = v })
  return out
}

function keyOf(method: string, url: string, h: Record<string, string>): ReadKey {
  return [method, url, ...SHAPE_HEADERS.map(k => h[k] || ''), h.authorization || ''].join('\u0001')
}

function toResponse(e: Entry, method: string) {
  return new Response(method === 'HEAD' ? null : e.body, { status: e.status, statusText: e.statusText, headers: e.headers })
}

async function load(key: ReadKey, url: string, init: RequestInit): Promise<Entry | null> {
  const running = inflight.get(key)
  if (running) return running
  const gen = generation
  const p = (async () => {
    try {
      const res = await baseFetch(url, init)
      if (res.status !== 200 && res.status !== 206) return null
      const entry: Entry = { at: now(), status: res.status, statusText: res.statusText, headers: Array.from(res.headers.entries()), body: init.method === 'HEAD' ? '' : await res.text() }
      if (gen === generation) remember(key, entry)
      return entry
    } catch { return null } finally { inflight.delete(key) }
  })()
  inflight.set(key, p)
  return p
}

/** Keeps at most a few hundred answers; the oldest go first. */
const MAX_ENTRIES = 300
function remember(key: ReadKey, e: Entry) {
  cache.delete(key); cache.set(key, e)
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value as ReadKey)
}

function noteNavigation() {
  const path = currentPath()
  if (path !== lastPath) {
    lastPath = path; openUntil = now() + OPENING_MS
    if (path) { const v = loadRecipes().visits; v[path] = (v[path] || 0) + 1; saveRecipes() }
  }
  return path
}

/** Call when a page is about to open (a menu click) so its reads count as opening. */
export function markOpening() { lastPath = null; noteNavigation() }

/** Called with the page's path when a remembered answer it was shown turns out to be out of date. */
export function onStale(fn: ((path: string) => void) | null) { staleListener = fn }

export const cachedFetch: typeof fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  const method = (init.method || (typeof input === 'object' && 'method' in input ? input.method : 'GET') || 'GET').toUpperCase()
  if (!inBrowser() || !url.includes('/rest/v1/')) return baseFetch(input, init)

  if (method !== 'GET' && method !== 'HEAD') {
    const res = await baseFetch(input, init)
    if (!QUIET_WRITES.test(url)) { generation++; cache.clear() }
    return res
  }

  const path = noteNavigation()
  const h = headerObject(init.headers)
  const key = keyOf(method, url, h)
  record(path, url, method, h)
  if (init.signal) return passThrough(key, input, init)

  const hit = cache.get(key)
  const opening = now() < openUntil
  if (hit && opening && now() - hit.at < MAX_AGE_MS) {
    if (now() - hit.at > RECENT_MS) {
      const before = hit.body + hit.status
      load(key, url, { ...init, method }).then(fresh => {
        if (fresh && fresh.body + fresh.status !== before && currentPath() === path) staleListener?.(path)
      })
    }
    return toResponse(hit, method)
  }
  const entry = await load(key, url, { ...init, method })
  return entry ? toResponse(entry, method) : baseFetch(input, init)
}

async function passThrough(key: ReadKey, input: RequestInfo | URL, init: RequestInit) {
  const gen = generation
  const res = await baseFetch(input, init)
  if ((res.status === 200 || res.status === 206) && init.method !== 'HEAD') {
    const copy = res.clone()
    copy.text().then(body => { if (gen === generation) remember(key, { at: now(), status: res.status, statusText: res.statusText, headers: Array.from(res.headers.entries()), body }) }).catch(() => {})
  }
  return res
}

function record(path: string, url: string, method: string, h: Record<string, string>) {
  if (!path) return
  const all = loadRecipes().pages
  const list = all[path] || (all[path] = [])
  if (list.some(r => r.u === url && r.m === method)) return
  const shape: Record<string, string> = {}
  SHAPE_HEADERS.forEach(k => { if (h[k]) shape[k] = h[k] })
  list.push({ u: url, m: method, h: shape })
  if (list.length > RECIPE_MAX) list.splice(0, list.length - RECIPE_MAX)
  saveRecipes()
}

/** Fetch ahead what `path` read last time, so a click on it draws at once. */
export function prefetchPage(path: string, auth: Record<string, string>) {
  if (!inBrowser() || path === currentPath()) return
  noteNavigation()
  for (const r of loadRecipes().pages[path] || []) {
    const h = { ...r.h, ...auth }
    const key = keyOf(r.m, r.u, headerObject(h))
    const hit = cache.get(key)
    if (hit && now() - hit.at < RECENT_MS * 6) continue
    load(key, r.u, { method: r.m, headers: h })
  }
}

/** The teacher's most-opened pages (other than this one), most first. */
export function favouritePages(n: number): string[] {
  const { visits, pages } = loadRecipes()
  return Object.keys(pages).filter(p => p !== currentPath() && p !== '/').sort((a, b) => (visits[b] || 0) - (visits[a] || 0)).slice(0, n)
}

/** Fetch ahead the teacher's most-opened pages, one after another, gently. */
export function warmUp(auth: Record<string, string>, n = 5, gap = 250) {
  favouritePages(n).forEach((p, i) => setTimeout(() => prefetchPage(p, auth), i * gap))
}

// ─── For tests ───
export function _reset(opts: { fetch?: typeof fetch; now?: () => number; path?: () => string } = {}) {
  cache.clear(); inflight.clear(); generation = 0; lastPath = null; openUntil = 0; staleListener = null; recipes = { pages: {}, visits: {} }; recipeKey = 'daewoo_reads'
  baseFetch = opts.fetch || ((input, init) => fetch(input, init))
  now = opts.now || (() => Date.now())
  currentPath = opts.path || (() => (typeof window === 'undefined' ? '' : window.location.pathname))
  inBrowser = () => true
}
