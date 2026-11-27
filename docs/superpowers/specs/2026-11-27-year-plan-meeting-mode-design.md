# Year plan: meeting mode — design

Approved by Kyla, 27 Nov 2026. Rework of the Year plan tab (`src/components/curriculum-planner/YearPlanView.tsx`, merged in PR #30) for the 2027 book-planning meeting, where the whole staff looks at one projected screen and admin chooses each class's books class by class.

Prototype reviewed: https://claude.ai/artifact/VnAREgJ3cPkPnVR7TVz4ez (tab 1, "Meeting mode").

## Why

The meeting decides, class by class, which book each grade uses in 2027 and over what stretch of the year. People need to see what the class used last year, take the obvious next book in one click, decide the exceptions, and see the pacing consequences (overflow, where each class is at each level test) on the same screen.

## Facts that shape it

- Classes move up a grade in March: this year's Daisy G3 is last year's Daisy G2. New G1s arrive each year. Some students change class, but the plan follows the **class**, not students. Repeating a book is fine.
- 2027-2028 currently has only spring dates in Settings.
- Into Reading is an anthology: a placement holds chosen stories titled `M<module> W<week> · <text>`.

## Goals

1. **Header:** class stepper (← Daisy →), a progress bar ("9 of 12 decided") and class chips with each class's decided count. ←/→ keys switch class (not while typing or while a dialog is open). **Present** enlarges type for a projector and hides hints and chips; Esc leaves it.
2. **Board (grades × strands):**
   - G2–G5 cells show last year's books of the same class one grade lower ("As G1: Rich Reading Basic 1"). G1 cells show last year's G1 books ("Last year's G1: …").
   - A cell is *decided* when it has a placement for the year. Undecided cells show a dashed box with **Use <next book>** (G2–G5: the next level after the grade-below book; G1: **Same as last year: <book>**) and **Choose…** (the existing PlaceForm).
   - **Use** places a sequence book for the whole year with all its units in one click. For an anthology (Into Reading) it opens PlaceForm with the book chosen, since stories are picked by hand.
   - A cell whose only book is a spring book offers **+ Fall book** (PlaceForm, term fall).
   - Chips open the existing PlacementCard, as now.
   - The "decided" count is over the cells that exist: a strand counts for a grade when the class had a book in that strand last year (same grade or the grade below) or has one this year.
3. **Timeline:**
   - Always shows spring and fall. A half with no dates in Settings is drawn with assumed weeks — spring from the first Monday of March for 20 weeks, fall from the fourth Monday of August for 18 weeks — shaded and labelled "dates assumed".
   - Into Reading rows draw one bar per module (stories of the same module merged, label "M7 · Everyone Has a Story" when the module name is known, else "M7"). Stretching from the end works; dividers between modules are off. Sequence books keep unit dividers.
   - A book running past the end of the year gets a red **→ +N wk** marker at the right edge. Time past a book's term stays hatched.
   - **Level-test pins:** a dashed vertical line at the end date of each grading period in Settings (spring_mid, spring_final, fall_mid, fall_final), labelled. Each book row shows a small tag at each pin: the unit or module the book is in at that point (✓ when finished). The drag readout lists them too.
4. **Suggestions follow the class** (fixes the merged behaviour, which used the same grade last year).

## Non-goals

Decision log / meeting notes; year wall; ladders; per-student class movement; level-test score summaries.

## Unchanged

Teachers see the tab read-only. Saves go through the existing data functions (`createPlacement`, `patchMasterRows`, PlaceForm, PlacementCard) into the same placements and pacing that Books by class and Class plans read. Holiday weeks from the school calendar stay hatched and skipped.

## Approaches considered

- **Rework the Year plan tab in place (chosen).** One screen, reuses everything merged in PR #30.
- New "Meeting" tab beside it: duplicates the Year plan.
- Fold into Class plans: one grade at a time, loses the whole-class view.

## Calls made by Claude (correct if wrong)

- Assumed-dates lengths (spring 20 weeks from early March, fall 18 weeks from late August).
- Level-test pins come from grading-period end dates, not the level_tests table (which has no dates).
- No dividers between Into Reading modules.
- "Use" places a sequence book for the whole year.
