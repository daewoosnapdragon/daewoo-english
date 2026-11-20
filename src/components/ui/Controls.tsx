// The app's three kinds of switch, in one place so every page draws them
// the same way. Each is a class string (or a function of "on") so a page
// keeps its own markup, handlers and unsaved-changes guards.
//
//   Filter chip    pick one of many (a grade, a class, an assessment).
//                  Round, ink when on. Put a row of them in .chip-scroll so a
//                  phone scrolls it sideways with a 44px tap area.
//   Segmented      two to four views of the same thing (Day / Month, This
//                  class / Whole grade). One bordered group, ink segment on.
//                  Give each button aria-pressed.
//   Page tabs      a page's sub-views (Reading's Class overview, Phonics, ...).
//                  Plain text with an ink underline on the open one, no tray.
//                  The row is .scroll-row, role="tablist"; each tab is
//                  role="tab" with aria-selected.

export const chip = (on: boolean) =>
  `inline-flex items-center gap-1.5 px-2.5 h-7 whitespace-nowrap rounded-full border text-[length:calc(12px*var(--ts))] font-medium transition-colors ${on ? 'bg-ink text-paper border-ink' : 'bg-surface text-ink-2 border-rule-2 hover:border-ink-3 hover:text-ink'}`

/** A row of filter chips. */
export const chipRow = 'chip-scroll flex gap-1.5 max-sm:w-full'

export const segGroup = 'inline-flex border border-rule-2 rounded overflow-hidden bg-surface'

export const seg = (on: boolean) =>
  `inline-flex items-center justify-center gap-1.5 h-7 max-sm:h-10 px-3 whitespace-nowrap text-[length:calc(12px*var(--ts))] font-medium border-l border-rule-2 first:border-l-0 transition-colors ${on ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2 hover:text-ink'}`

export const tabRow = 'scroll-row flex border-b border-rule-2'

export const tab = (on: boolean) =>
  `relative inline-flex items-center gap-1.5 px-4 h-10 whitespace-nowrap text-[length:calc(13.5px*var(--ts))] font-medium transition-colors after:absolute after:left-4 after:right-4 after:bottom-0 after:h-[2px] ${on ? 'text-ink after:bg-ink' : 'text-ink-2 hover:text-ink hover:bg-paper-2 after:bg-transparent'}`
