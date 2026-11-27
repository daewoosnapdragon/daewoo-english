# Year plan: meeting mode — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Year plan tab into a meeting screen: class stepper and progress, class-following suggestions, both halves always drawn, Into Reading as module bars, overflow markers and level-test pins.

**Architecture:** New pure helpers in `src/lib/yearPlan.ts` (tested in `src/lib/__tests__/yearPlan.test.ts`) decide what last year looked like for a class, what to suggest, which weeks a half has (real or assumed), where the level tests fall, how stories group into modules and which unit a book is in at a week. `YearPlanView.tsx` is reworked to use them; it keeps saving through `createPlacement`, `patchMasterRows`, `PlaceForm` and `PlacementCard`.

**Tech Stack:** Next 14, React 18, TypeScript, Tailwind tokens from `globals.css`, Supabase, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-27-year-plan-meeting-mode-design.md`

## Global Constraints

- Plan follows the class: G2–G5 look at the same class one grade lower last year; G1 looks at last year's G1. Repeats are not flagged.
- Assumed weeks: spring from the first Monday of March for 20 weeks; fall from the fourth Monday of August for 18 weeks; shaded, labelled "dates assumed".
- Level-test pins: end dates of `spring_mid`, `spring_final`, `fall_mid`, `fall_final` grading periods, labelled "Spring midterm", "Spring final", "Fall midterm", "Fall final".
- Teachers read-only; only `role === 'admin'` or `is_head_teacher` place, drag or use.
- English and Korean labels for every new visible string, as elsewhere in the planner.

## Review Focus

- A year with neither half dated: timeline still draws both halves as assumed (test in Task 1: `fillYearWeeks` with no semesters).
- A class whose grade below had two books in a strand last year (spring then fall): suggestion uses the latest (fall, then year, then spring) (test in Task 1).
- Into Reading stories without a module badge or summary: grouped under their own title, never dropped (test in Task 1).
- A book that finishes before a pin: tag shows ✓; a book that starts after a pin (fall book at spring midterm): no tag (test in Task 1).
- Last series level: no "Use" button, only "Choose…" (Task 2, checked in the mocked run).

---

### Task 1: Pure helpers

**Files:**
- Modify: `src/lib/yearPlan.ts`
- Test: `src/lib/__tests__/yearPlan.test.ts`

**Interfaces:**
- Consumes: `nextBook` (same file), `weekList`, `termDates`, `YearWeeks`, `SemesterLike`, `CurriculumPlacement`, `Term` from `curriculumPacing.ts`; `CurriculumBook` from `curriculumCore.ts`.
- Produces:
  - `lastYearFor(placements: CurriculumPlacement[], cls: string, grade: number, prevYear: string, inStrand: (pl: CurriculumPlacement) => boolean): { grade: number; placements: CurriculumPlacement[] }` — grade is `grade - 1` for G2–G5, `1` for G1; placements are that class/grade's masters in `prevYear` passing `inStrand`, sorted spring → year → fall.
  - `suggestBook(grade: number, last: CurriculumPlacement[], books: CurriculumBook[]): CurriculumBook | undefined` — latest of `last` (fall > year > spring); G1 returns that book itself, G2+ returns `nextBook` of it.
  - `fillYearWeeks(semesters: SemesterLike[], year: string): { yw: YearWeeks; assumed: { spring: boolean; fall: boolean } }` — real weeks where dated, else assumed per Global Constraints. Calendar year: from the spring start date if dated, else from the fall start date, else the first four digits of `year`.
  - `levelTestDates(semesters: SemesterLike[], year: string): { label: string; date: string }[]` — sorted by date; only periods with an end date.
  - `moduleGroups(titles: { title: string; summary: string }[]): { key: string; label: string; from: number; to: number }[]` — consecutive indices with the same `M<n>` badge become one group; label `M7 · The Big Outdoors` when the summary contains `Module 7 · <name>,`, else `M7`; an item without a badge is its own group labelled by its title.
  - `unitAt(weeks: number[], t: number): number | 'done' | null` — index of the unit running at `t` weeks from the book's start (`t <= 0` → null; past the end → 'done').

- [ ] **Step 1: Write failing tests** in `yearPlan.test.ts`, one `describe` per helper. Key assertions:
  - `lastYearFor(pls, 'Daisy', 3, '2026', all)` returns grade 2 and the Daisy G2 2026 placements; for grade 1 returns grade 1.
  - `suggestBook(3, [rrB1Spring, rrB1pFall], books)` → next after Basic 1 Plus; `suggestBook(1, [sp3Year], books)` → sp3; last level → undefined; empty → undefined.
  - `fillYearWeeks(onlySpring2027, '2027-2028')` → `assumed` `{spring:false, fall:true}`, fall first Monday `2027-08-23`, 18 weeks; with no semesters for `'2027-2028'` → spring starts `2027-03-01`, 20 weeks, both assumed.
  - `levelTestDates` returns `[{label:'Spring midterm', date:'2027-04-30'}, …]` in date order and skips a period without an end date.
  - `moduleGroups` on `M7 W1 · A`, `M7 W1 · B`, `M7 W2 · C`, `M8 W1 · D`, `Review week` → three groups `M7 · The Big Outdoors` (0–2), `M8` (3–3), `Review week` (4–4).
  - `unitAt([3,3,3], 0)` null, `(…, 0.5)` 0, `(…, 3)` 0, `(…, 3.5)` 1, `(…, 10)` 'done'.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/yearPlan.test.ts` — expected FAIL (functions not exported).
- [ ] **Step 3: Implement** the six functions with the signatures above.
- [ ] **Step 4: Run** the same command — expected PASS, plus the existing 15 tests.
- [ ] **Step 5: Commit** `Year plan: helpers for last year, suggestions, assumed weeks, level tests, modules`.

### Task 2: Rework YearPlanView

**Files:**
- Modify: `src/components/curriculum-planner/YearPlanView.tsx`
- Modify: `src/content/whats-new.ts` (extend the `curriculum-year-plan` entry's body; keep its id and date)

**Interfaces:**
- Consumes: everything Task 1 produces; `PlaceForm` (`initialBookId`, `initialTerm`), `PlacementCard`, `createPlacement`, `patchMasterRows`, `groupByModule` not needed.

- [ ] **Step 1: Header.** Replace the class buttons and year select row with: ← / → buttons around the class name (display font, class dot), a progress bar and "N of M decided", class chips with each class's `decided/cells` count, the year select, and a **Present** toggle (`ko`: 발표 모드) that sets a `present` state: larger `--ts` on the tab's root (`style={{ ['--ts' as any]: 1.3 }}`), hides chips and hint text. Window `keydown`: ←/→ switch class unless focus is in an input/select/textarea or a dialog is open; Esc leaves Present.
- [ ] **Step 2: Board cells.** Cells = strands that have a placement this year, or last year for the same grade or the grade below (plus phonics/reading/speaking always as columns). Top line from `lastYearFor`: "As G{g-1}: …" or "Last year's G1: …" (muted, `·Spring/Fall` tag when not year). Undecided: dashed box, **Use <short name>** / **Same as last year: <name>** from `suggestBook` (sequence book → `createPlacement` with all its units, term `year`, then reload; anthology → open PlaceForm with `initialBookId`), and **Choose…** (PlaceForm). Only-spring cell → **+ Fall book** (PlaceForm, `initialTerm="fall"`). Decided count uses the same cell set.
- [ ] **Step 3: Timeline weeks.** Use `fillYearWeeks` instead of `yearWeeks`; always `view = 'year'`; shade assumed halves (`bg-paper-2/70`) and add "dates assumed" after the half's name in the header.
- [ ] **Step 4: Into Reading rows.** For `series.kind === 'anthology'`, draw one bar per `moduleGroups` group spanning its stories' weeks, labelled with the group label; no unit dividers; end grip unchanged.
- [ ] **Step 5: Overflow and pins.** Past the year's last teaching week: red pill `→ +N wk` at the row's right edge (grip moves just left of it). Pins from `levelTestDates`: dashed accent line full height plus label row under the month header; on each book row a small tag at each pin with the unit badge (or module key) from `unitAt`, ✓ for 'done', none for null. Drag readout adds one line per pin.
- [ ] **Step 6: Verify.** `npx vitest run` (all pass); `npx tsc --noEmit -p . | grep -E "curriculum-planner|yearPlan"` (no output); run the mocked-Supabase browser check with: a 2027-2028 year that has only spring dates, Daisy 2026 G1–G2 books, one Into Reading placement with stories titled `M7 W1 · …` and summaries `Module 7 · …`, a book past December. Expect: both halves drawn with fall "dates assumed", "As G1:" lines, Use/Same-as buttons, module bars, `→ +N wk`, pin tags, no page errors, Use places a book.
- [ ] **Step 7: Commit** `Year plan: meeting mode`, push, open the PR.
