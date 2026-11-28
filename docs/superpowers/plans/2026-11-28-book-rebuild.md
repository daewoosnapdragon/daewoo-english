# Book rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every book's units, lessons and objectives with the publishers' versions, using one file format, loaded from an admin "Update the books" page, without losing any class's place.

**Architecture:** Each book is a JSON file in `scripts/catalogue/books/`. A Python checker validates them, and a build script bundles them into `src/data/catalogue.json` with a version hash per book. In the app, `src/lib/catalogueUpdate.ts` matches each book's old units to new ones and builds a preview. Two Postgres functions do the swap in one transaction: `curriculum_replace_book`, and `curriculum_split_book` for Science of Reading.

**Tech Stack:** Next.js / React / Supabase (PostgREST rpc), Python 3 scripts, vitest, PGlite for the trial.

**Spec:** `docs/superpowers/specs/2026-11-28-book-rebuild-design.md`

## Global Constraints

- Grammar Workshop is never touched.
- Lessons carry no objective (`objective = ''`). Objectives live only in `curriculum_unit_objectives`.
- Objective lines follow `scripts/catalogue/objectives/BRIEF.md` and pass the existing `problems()` rules in `objectives/check.py` (3–5 lines, 2–5 for Science of Reading).
- Kyla pastes one migration only (`supabase/migration-curriculum-book-update.sql`). Give it to her inline in a `sql` block.
- Units are written with `source = 'claude'`. The book's status stays `confirmed` (retired for the old Science of Reading book).
- Science of Reading becomes books with level_number `'1'`–`'9'`. The old book (level `''`) is retired, not deleted.

## Review Focus

- A class with two old units that map to one new unit: keep one pacing row (the first by sort_order), keep the done tick if either had it, and add the second's weeks to the first. Test in Task 4 (`mergesDuplicateTargets`).
- An old unit that matches nothing but is in a class's list: the preview names the class and the unit, and the swap drops that pacing row. Test in Task 4 (`unmatchedInPlacement`).
- A lesson-plan row whose unit is in another book: unchanged. Tested in the Task 6 trial.
- Running Update twice: the second run shows "up to date" and does nothing. Test in Task 4 (`upToDate`), checked again in the Task 6 trial.
- A teacher's pacing copy (owner = 'teacher') moves exactly like the school-plan row. Tested in the Task 6 trial.

---

### Task 1: Book file format and checker

**Files:**
- Create: `scripts/catalogue/books/FORMAT.md`
- Create: `scripts/catalogue/books/check.py`

**Interfaces — book file:**
```
{ "series": "Super Phonics", "level": "2", "title": "", "strand": "phonics", "color": "...", "kind": "sequence",
  "source": "Super Phonics 3rd ed. Teacher's Guide Book 2", "absorbs": ["S"]?,
  "units": [{ "title": "Unit 1 · -at, -an, -ag", "summary": "", "default_weeks": 2, "ccss": [], "skill_tags": [],
              "replaces": ["<old unit title>", …]?,
              "lessons": [{ "title": "", "notes": "" }],
              "objectives": [{ "text": "", "ccss": [], "wida": [] }] }] }
```
- `check.py <file>…` prints problems or `ok`. It reuses the objective rules from `objectives/check.py`, and also requires: non-empty unique unit titles, at least one lesson per unit, no lesson `objective` key, `default_weeks` from 0.5 to 6. With `--sor-old docs/catalogue/science-of-reading.txt` it also checks that every old Science of Reading title appears in exactly one `replaces`.

- [ ] Write FORMAT.md and check.py. Run it on a hand-made bad file and see the problems listed.

### Task 2: Book files

**Files:** Create `scripts/catalogue/books/*.json`, plus `scripts/catalogue/books/convert.py` (Hand in Hand from `supabase/seed-hand-in-hand.sql`; Easy, Rich and WonderSkills Reading from `wonderskills/books.json`; Into Reading from `into-reading/grade-N.json`; objective lists from `objectives/*.json`).

- [ ] Hand in Hand Starter carries `"absorbs": ["S"]`.
- [ ] Two agents write `super-phonics-1..5.json` and `science-of-reading-1..9.json` from the Drive teacher's guides. The Science of Reading files carry `replaces`.
- [ ] Placeholders (Easy Reading 1 Plus, 2 Plus, 3 Plus; Rich Reading Basic 2): look in Drive for their syllabi. Write a file if one is found. Otherwise skip the book and list it.
- [ ] `check.py` passes on every file, with `--sor-old` on the Science of Reading files.
- [ ] `build.py` writes `src/data/catalogue.json`: `[{ key: "series|level", version: sha1(file)[:12], book }]`.

### Task 3: Migration and functions

**Files:** Create `supabase/migration-curriculum-book-update.sql`

- `CREATE TABLE IF NOT EXISTS curriculum_unit_objectives` (same as `migration-curriculum-objectives.sql`).
- `ALTER TABLE curriculum_books ADD COLUMN IF NOT EXISTS catalogue_version TEXT NOT NULL DEFAULT ''`.
- `curriculum_replace_book(p_series JSONB, p_level TEXT, p_title TEXT, p_version TEXT, p_units JSONB, p_map JSONB, p_absorb UUID[]) RETURNS UUID`:
  1. Finds or creates the series and book.
  2. Moves the absorbed books' placements to this book.
  3. Inserts the new units, lessons and objectives.
  4. For each `{old, new_index}` pair, moves pacing, unit_done, lesson_log, blocks and resources (a lesson's file goes to the unit, with `lesson_id` cleared), and the parent_calendar subjects (`unit_id` mapped, `lesson_id` removed).
  5. For old units with no pair: deletes their pacing rows and strips their ids from parent_calendar subjects.
  6. Deletes the old units and the absorbed books, and sets `catalogue_version`.
- `curriculum_split_book(p_old_book UUID, p_map JSONB) RETURNS INT`, where `p_map` is `[{old, new}]` with the new ids already in the level books. For each placement of the old book: one new placement per target book, copying every pacing row (all owners) with the unit mapped, plus its unit_done rows and the parent_calendar `unit_id`/`placement_id`. Then it deletes the old placement and retires the old book.
- `GRANT EXECUTE … TO anon, authenticated; NOTIFY pgrst, 'reload schema';`

### Task 4: Matching and preview (TDD)

**Files:** Create `src/lib/catalogueUpdate.ts`, `src/lib/__tests__/catalogueUpdate.test.ts`

**Produces:**
- `unitKey(title: string): string | null` — `"unit 3"`, `"school link 2"`, or null.
- `matchUnits(old: {id: string; title: string}[], next: {title: string; replaces?: string[]}[]): { pairs: {old: string; new_index: number}[]; unmatched: string[] }`. Order of rules: `replaces`, then normalised exact title, then `unitKey`. Each new unit takes at most one old unit, except through `replaces`.
- `planBook(file: CatalogueEntry, db: {series, books, units, placements, pacing}): BookPlan` with `{ key, status: 'new' | 'up-to-date' | 'replace', bookId?, absorbIds: string[], pairs, unmatched: {unitId, title, classes: string[]}[], classes: string[] }`.

Tests:
- `matchesByTitleThenNumber`: "Unit 1 · Who is the best" pairs with "Unit 1 · Who Is Best?".
- `replacesWins`
- `mergesDuplicateTargets`
- `unmatchedInPlacement`: the plan lists "Daisy G2".
- `upToDate`: version equal → status `up-to-date`.
- `absorbsS`: the "S" book's id is in `absorbIds` and its units are in `pairs`.

### Task 5: Data calls and the Update page

**Files:**
- Create: `src/lib/catalogueUpdateData.ts` (`replaceBook(plan, entry)`, `splitScienceOfReading(plans)`, both rpc, both `logActivity`)
- Create: `src/components/curriculum-planner/BookUpdateView.tsx`
- Modify: `BookshelfView.tsx` (an admin "Update the books" button that opens the view, with the hash `#bookshelf?update`)

- The page loads `src/data/catalogue.json` with a dynamic `import()`.
- One row per book: status chip, the classes that use it, and the unmatched units with their classes.
- Buttons: Update per book, Update all (asks once), and Science of Reading as one "Split into levels" step after its nine books exist.
- Without the migration, the page says so using `needsUpdate`.

### Task 6: Trial on PGlite

- [ ] In the scratchpad: install PGlite, stub `teachers`, `parent_calendar`, and the anon/authenticated roles, then run every curriculum migration, the seeds and the new migration.
- [ ] Insert placeholder-style books like the live ones (teacher units, "S"), placements with master and teacher pacing, done ticks, files and lesson-plan rows.
- [ ] Run each plan through the functions, using the same `matchUnits` (via tsx).
- [ ] Assert: no pacing, unit_done or parent_calendar unit_id points at a deleted unit; counts are kept except for the unmatched units the plan listed; a second run is up to date.

### Task 7: Wrap up

- [ ] `npx vitest run`, then `next build` with placeholder env.
- [ ] Update `docs/catalogue/README.md`, the guide, and What's new.
- [ ] Commit, and cherry-pick onto main.
- [ ] Give Kyla the migration inline in a `sql` block, plus the steps.
