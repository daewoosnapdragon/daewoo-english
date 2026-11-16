// ─── Page transitions ────────────────────────────────────────────
// The page you are on stays on screen until the next page has its content,
// then the two cross-fade (the browser's View Transitions). The header is
// its own layer, so it never fades. The screen does not respond while the
// browser holds the old page, so the hold is short: a page still loading
// after 400 ms takes over anyway and its ink dots carry on. Browsers without View Transitions,
// and anyone who asks for reduced motion, get the page with a short fade.

type Router = { push: (href: string) => void }

const MAX_WAIT = 400

const pathOf = (href: string) => new URL(href, window.location.href).pathname

/** Resolves once the new page is on screen and nothing in it is still loading.
 *  Polls with a timer: the browser pauses animation frames while it holds
 *  the old page, so requestAnimationFrame would never fire here. */
function waitForPage(path: string): Promise<void> {
  return new Promise(resolve => {
    const start = Date.now()
    let calm = 0
    const tick = () => {
      const page = document.querySelector('[data-page]')
      const here = page?.getAttribute('data-page') === path
      const busy = !!page?.querySelector('.ink-wait, [aria-busy="true"]')
      calm = here && !busy ? calm + 1 : 0
      if (calm >= 2 || Date.now() - start > MAX_WAIT) { resolve(); return }
      setTimeout(tick, 30)
    }
    setTimeout(tick, 30)
  })
}

export function canTransition(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document
    && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Go to `href`, holding the current page until the next one is ready. */
export function transitionTo(router: Router, href: string) {
  const path = pathOf(href)
  if (!canTransition() || path === window.location.pathname) { router.push(href); return }
  const root = document.documentElement
  root.dataset.vt = '1'
  const vt = (document as any).startViewTransition(() => { router.push(href); return waitForPage(path) })
  vt.finished.finally(() => { delete root.dataset.vt })
}
