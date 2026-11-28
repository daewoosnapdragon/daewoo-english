# Rebuilding the books from the publishers' materials — design

Approved by Kyla, 28 Nov 2026 ("Approve, start"). Plan: `docs/superpowers/plans/2026-11-28-book-rebuild.md`.

## Why

"I would rather have one consistent source of truth." Every book's units, lessons and "Students will…" objectives should come from the publisher's own materials in the shared Drive. Nothing copied from teachers' lesson plans, and nothing for anyone to confirm. Kyla can't check thousands of lessons, so the content has to be right when it goes in. Checks are done by scripts and a trial run, not by people.

## What is wrong now (from her query, 28 Nov)

- 19 books that classes use still hold the fall placeholders built from teachers' plans (`source = teacher`): Hand in Hand 1–5 and "S", Rich Reading Basic 1, Basic 1 Plus, Basic 2, Basic 3, Basic 3 Plus, Intermediate 1, Intermediate 1 Plus, Intermediate 2 Plus, Intermediate 3, Intermediate 3 Plus, Easy Reading 1 and 3, and Super Phonics 2–4. The publisher seeds skip any book that already has units, so they never replaced them. "Hand in Hand S" duplicates "Hand in Hand Starter".
- `curriculum_unit_objectives` was never created in Supabase, so no objective list is live. What showed on Into Reading was each lesson's own objective.
- `seed-unit-objectives.sql` is 675 KB, too big to paste.

## Goals

1. **One catalogue file per book** in the repo, all in the same format: units, lessons (title and notes, no objective of their own) and each unit's objective list (3–5 lines, CCSS and WIDA tags, written to `scripts/catalogue/objectives/BRIEF.md`).
2. **Sources:**
   - Hand in Hand Starter–6: the scope and sequence data already in `supabase/seed-hand-in-hand.sql`. A script reads it into the new format, so no PDFs are re-read.
   - Easy Reading, Rich Reading, WonderSkills Reading: `scripts/catalogue/wonderskills/books.json` (from the syllabi Kyla uploaded), with the 27 Nov objective lists.
   - Into Reading 1–4: the existing extraction and objective lists. Units are unchanged.
   - Super Phonics 1–5: the 3rd-edition teacher's guides in Drive (`10. Super Phonics`). New.
   - Science of Reading Levels 1–9: the Teacher Guide in each `4. Phonics Resources/Level N: …` folder. New. It becomes **nine books**, level_number 1–9, titled by the level ("Alphabet", "CVC - Short Vowels", …).
   - Placeholders (Easy Reading 1 Plus, 2 Plus, 3 Plus, Rich Reading Basic 2): look for their syllabi in Drive. If found, extract the same way. If not, leave them as they are and list them.
3. **An "Update the books" page for admin** (Curriculum → Bookshelf → Update the books). It carries the catalogue, loaded only when that page opens. For each book it shows one of: up to date, will be replaced, or new. For a book that will be replaced it shows the units that change, which classes use the book, and any of their units that have no match. Buttons: **Update** per book, and **Update all**. Each book's update is one database transaction: all or nothing. Every update is written to the Activity log.
4. **Classes keep their place.** For each book, each old unit is matched to a new one by exact title, then by "Unit N" / "School Link N" number, then through a mapping file (needed for Science of Reading). Everything that points at an old unit moves to its match:
   - `curriculum_pacing` (order and weeks kept)
   - `curriculum_unit_done`
   - `curriculum_resources` (a lesson's file moves to the new unit)
   - `curriculum_lesson_log`
   - `curriculum_blocks`
   - the `unit_id` in lesson-plan rows (`parent_calendar` content subjects). A row's `lesson_id` is cleared, because lessons don't carry over one to one; the row stays linked to its unit.

   After the move, the old units, lessons and objectives are deleted.
5. **Hand in Hand S is folded into Starter.** Its placements move to the Starter book, and then S is deleted.
6. **Science of Reading split.** Each class's Science of Reading placement becomes one placement per level its units fall in (same class, grade, year and term), with the order, weeks and done ticks carried over. The old single book is retired, not deleted.
7. **No database pasting beyond one short migration:** create `curriculum_unit_objectives` if it is missing, add `catalogue_version` to `curriculum_books` (to tell "up to date"), and add the `curriculum_replace_book` and `curriculum_split_book` functions.

## Non-goals

- Grammar Workshop is not touched (it isn't a real book yet).
- No lesson-level objectives anywhere.
- No change to how classes plan, drag or tick units.
- Units the book has but a class's list doesn't are not added to that class's list. Adding them stays with "Add units" on Books by class.
- No re-extraction of Hand in Hand, WonderSkills or Into Reading.

## Anti-goals (a failure even if it runs)

- A class loses a unit length, a done tick or a lesson-plan link without the preview having said so first.
- Teacher-written text survives in a rebuilt book.
- Anyone is asked to confirm or review content.
- Kyla has to paste more than the one migration.

## How mistakes are caught

- `scripts/catalogue/books/check.py` runs on every book file. Units must match the guide's own unit list. Each unit needs 3–5 objectives, each with known CCSS codes (the `standardText` list) and WIDA tags, written in the brief's plain words. No duplicate titles, no empty lessons, no objective on a lesson. The mapping file must cover every old Science of Reading unit.
- A local trial run on PGlite: every migration and seed, plus made-up placements, done ticks, files and lesson-plan rows pointing at the old units. Then run each replace and split, and check that every link points at a new unit and nothing was lost.
- Vitest tests for the matching rules and the preview.
- The page's preview lists unmatched units before anything changes.

## How the work is split (to keep it cheap)

- A script pulls each Super Phonics and Science of Reading guide's unit facts (objectives, key words, sight words, patterns) out of the text Drive returns, so no one reads whole guides.
- Two agents, run at the same time on a cheaper model, write the book files: one for Super Phonics, one for Science of Reading. Each gets the brief, the file format and the checker, and has to pass the checker before it reports back.
- Claude builds the migration, the functions, the page, the matching and the tests itself, and runs the trial.

## Approaches considered

- **Update page in the app (chosen by Kyla).** One small paste. Re-runnable when a book is corrected. More code.
- **SQL in about 15 parts.** No new code, but long, and fragile if a part is pasted twice or out of order.

## Calls made by Claude (correct if wrong)

- Matching order: title, then unit number, then the mapping file.
- Lesson-plan rows keep their unit link and lose their lesson link.
- A class's list keeps only the units it had (mapped). Missing units are not added.
- Science of Reading's old book is retired, not deleted, so past years still make sense.
- Super Phonics Books 1 and 5 are done too, though no class uses them yet.
- Default weeks: Super Phonics 2 per unit, Science of Reading 1 per pattern (as now). Others are kept as in their current seeds.
