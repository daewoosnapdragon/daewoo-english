// ─── "Show me" tours ─────────────────────────────────────────────
// A tour is a page and a few captions, each pinned to an element marked
// data-guide="…" (or any selector starting with # or .). The tour is parked
// in sessionStorage, the page is opened, and the Spotlight picks it up on
// arrival. An anchor that is not on the page just gets a floating caption.

export interface TourStep { anchor?: string; text: string }
export interface Tour { path: string; steps: TourStep[] }

export const TOUR_KEY = 'daewoo_tour'
export const TOUR_EVENT = 'daewoo:tour'

export function startTour(tour: Tour, navigate: (path: string) => void) {
  try { sessionStorage.setItem(TOUR_KEY, JSON.stringify(tour)) } catch {}
  const [path] = tour.path.split('#')
  if (typeof window !== 'undefined' && window.location.pathname === path) {
    window.dispatchEvent(new CustomEvent(TOUR_EVENT))
  } else {
    navigate(tour.path)
  }
}
