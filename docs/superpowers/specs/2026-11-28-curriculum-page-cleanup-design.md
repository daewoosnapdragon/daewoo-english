# Curriculum page clean-up — design

Approved by Kyla, 28 Nov 2026 ("Yes, build it"), after her talk-through of the Curriculum tab.

## Why

"If the teachers find this difficult or hard to understand, they're just straight up not going to use it." Kyla sets the year plan; teachers adjust their class plans by dragging; both are the same data, so the year plan follows. Anything fiddly goes.

## Goals

1. **Class plans: drag and click.** Drag a unit's right end to make it longer or shorter; the units after it move along (same maths as the Year plan, `moveBoundary`). A plain click (no movement) still opens the unit's details. Teachers drag their own class; admin and head teachers drag any class. Saves go through `patchMasterRows`, the same rows the Year plan reads, so the Year plan updates by itself. Into Reading (anthology) stories drag the same way.
2. **Unit details show the objective bank only.** If a unit has no bank, say "Objectives for this unit are not written yet" instead of falling back to the lesson objectives (which, for skeleton books, came from teachers' lesson plans). Lessons Plans' own fallback is not changed in this round.
3. **No edit lists under Class plans.** Remove Add a book, Copy another grade's books and the PlacementCards from Class plans. Books are added on the Year plan or Books by class.
4. **No Fit to the term, no Review after every section** in PlacementCard (Books by class / Year plan). Per-unit review weeks stay (the Year plan's click on a bar, and the card's per-row select).
5. **Books by class:** the opened book's card shows right under the class row that was clicked, not under the whole grid.
6. **Bookshelf:** no Confirm / Confirm all buttons, no "Confirmed" / "Suggested by Claude" / "Not confirmed" chips, no "x of y confirmed" counts, no "confirm them once you have looked" wording.
7. **All classes this week:** unchanged.

## Non-goals

Rebuilding the books' units, lessons and objectives from Drive (next project). Database changes (none needed: `curriculum_pacing` is open to every signed-in user and `confirmed_at` columns stay, just unused in the UI).

## Approaches

- **Reuse the Year plan's boundary drag inside Class plans (chosen).** Same helpers and the same save, so the two screens can't disagree.
- Make Class plans a filtered Year plan: loses Class plans' weekly columns and unit panel.
- Drag whole bars to new weeks: units are end to end with no gaps, so a move is really a length change of the unit before; more confusing.

## Calls made by Claude

- A teacher can drag only their own class (`currentTeacher.english_class`); admin and head teachers any class.
- Drag threshold of 4px separates a click from a drag.
- Drags are measured in teaching weeks, so holiday columns count for nothing, as on the Year plan; lengths snap to half weeks.
- The unit's end handle is a thin strip on the bar's right edge with a col-resize cursor.
