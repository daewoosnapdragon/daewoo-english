# Curriculum and Lesson Plans: the target design

Written 8 Nov 2026 after a code review of everything committed on 7 and 8 Nov and a design conversation with Kyla. This replaces the build order in docs/curriculum-planner-plan.md from phase 2 onward. The last section is a brief for the model doing the build.

## The idea in one paragraph

The lesson plan is the only thing anyone edits. Teachers type what they teach on a day, in parent words, the way they already do; the app links those rows to the catalogue and works out where every class is. Kyla sets the temperature once per class and grade: which books, the order of units, a suggested length per unit, an aim date. Nobody sets weeks, usual days, recipes, pins or lengths, and nobody approves anything. Pace is observed, not configured. The Curriculum tab is a place to read the books and glance at suggested against actual; Lesson Plans is where teaching happens.

Three concepts for teachers: book, unit (or story), day. Lessons are the textbook's table of contents, visible as structure and reference, never a to-do list.

## What the current build contributes

Keep as is:
- The catalogue tables and the Bookshelf: series, books, units, lessons, objectives, CCSS and skill tags, Drive resources (`supabase/migration-curriculum-catalogue.sql`, `BookshelfView.tsx`).
- The seeds: Into Reading 1 to 4, Hand in Hand Starter to 6, Science of Reading, and the fall 2026 placements seeded from the real plans.
- Placements per book, class, grade, academic year and term, with unit order (`curriculum_placements`, `curriculum_pacing` minus the teacher-copy columns).
- Anthology reading lists: which stories, in which order (StoryPicker).
- Holiday weeks from the school calendar (`holidayWeeks`, `teachingToColumns` in curriculumPacing.ts).
- Term dates from `semesters` by academic year (spring first, fall second; `yearFor`).
- The whole old Lesson Plans calendar: subject chip plus text, Students will, Weekly HW, days off and exam tint, autosave, Copy last week, print with week selection and all grades in one file, the writeDays stale-write check.
- Move a day later / earlier with preview, all-grades option and undo. Rename to Shift plans and give it to every class.
- `unit_id` / `lesson_id` / `placement_id` on parent_calendar subject rows (lessonSync.ts). This is the link the whole design rests on.
- The atomic RPCs for placement writes; paged reads (`fetchAll`).
- Standards text lookup (`standardText.ts`) and the Standards heat map.

Delete (nothing in the target reads them): teacher plan copies and `fixed` on pacing, `curriculum_here`, `curriculum_blocks`, `curriculum_plan_reviews`, `curriculum_lesson_log`, `curriculum_class_setup` and the Class setup page, the lesson tray, the month map, the ON THE BOARD counts and pace badges, Next from the board, the week view importer, "we're here", drag and resize on the board, `freezeProjection`, `projectAnthology` for sequence books, `setupAdjuster`, `planFollower`, Review view, the `LESSON_SYNC_CLASSES` switch.

## Broken things in the current build that the target must not inherit

1. Parent print carries catalogue lesson names. `slotLine` writes `"<unit> — <lesson> (1 of 2)"` and print outputs `label: content` verbatim (lessonTray.ts:37-38; LessonPlanView.tsx:636-638, 967). Parent text is the unit name unless the teacher types otherwise. Print HTML is not escaped (LessonPlanView.tsx:967); escape it.
2. Editing a row's words keeps a stale `lesson_id` (LessonPlanView.tsx:401-406), and choosing the plain subject chip clears the link (413-414). In the target, the link is set by the autocomplete and cleared when the text no longer contains the unit's name.
3. Into Reading seeds every myBook text and its paired text as separate units with the same six skills (seed-into-reading.sql:499, 506), which doubles the apparent length of a module. Fold the paired text into its partner as a lesson, so a module week is one unit.
4. Unit titles with "·" (Into Reading vocabulary) break any split on ":" (classSetup.ts:38). No part detection survives; just note it for any title parsing.
5. `isAdmin` is true for any Snapdragon teacher (LessonPlanView.tsx:121), and edit rights go to the first active teacher of a class only (classTeacher.ts:11-15). Edit rights: admin, or any teacher assigned to the class.
6. Developer messages ("Run supabase/migration-… in the SQL Editor") show to teachers (BoardView.tsx:402, ProgramMapView.tsx:128, LadderView.tsx:38, ClassSetupView.tsx:148). Show them to admins only; teachers see "Not set up yet".
7. The grade selector always opens on grade 1 (BoardView.tsx:72). Remember the last class and grade per browser.
8. Copy last week copies `unit_id`/`lesson_id` (LessonPlanView.tsx:539), so a unit looks taught twice. Copy the words, not the links, unless the copied unit is still the current one.
9. Week view day buttons read M T W T F (WeekView.tsx:149). Mo Tu We Th Fr wherever days are abbreviated.
10. guide.ts and whats-new.ts never mention any of this. Write them last, in teacher words.

## The catalogue: book, unit, lesson, objectives

- Hierarchy as today: series, book, unit (story or module), lesson. Every unit has its lessons listed with their titles, so a new teacher sees "Unit 6 Going Shopping · 4 lessons: Conversation, Words and Grammar, World around Us, English Sounds".
- Each unit carries an objective bank: three to five "Students will…" lines in parent-readable words, each tagged with CCSS and, where it fits, WIDA. Claude writes them from the scope and sequence and the standards; they are live when seeded. No approval, no draft status, no confirm buttons. Kyla edits a line on the Bookshelf if one is wrong; teachers edit the words in their own row, which never changes the catalogue.
- Each unit carries a suggested length from the publisher's sequence: a number of lessons and about how many weeks ("5 lessons · about 1 week"). Typed once per book, editable on the Bookshelf.
- Lessons keep their objective and files as detail. Objectives at lesson level roll up into the unit's bank where they are not already covered.
- Drive resources stay on units and lessons.

## Class plans (Kyla's temperature)

Per class and grade, for a term or the year:
- The books, from the Bookshelf.
- The order of units in each book (for an anthology, which stories and in which order).
- An aim date per book: "finish by 18 Dec". Optional.
- A suggested length per unit, prefilled from the catalogue, overridable here.

From these plus term dates and holiday weeks the app draws a read-only timeline per class and grade: a lane per book, a bar per unit at its suggested length, hatched holiday weeks, a today line. Nothing on it drags. Kyla edits the list (reorder, change a length, set an aim date) and the timeline redraws. Teachers read it for their grades.

Stored: `curriculum_placements` as today; `curriculum_pacing` reduced to placement, unit, sort_order, suggested_weeks (numeric, halves allowed), no owner, no teacher_id, no fixed, no gap_before. One row set per placement. `aim_date` on the placement.

## Lesson Plans (the only daily tool)

Keep the calendar. Add exactly these:

1. **Autocomplete is the link.** Pick the book chip, start typing, and the units of that book for this class and grade autocomplete: "Clo" offers "Cloudette". Choosing it writes the unit name into the row and sets `unit_id`. A second level offers the unit's lessons ("Cloudette › Vocabulary") and sets `lesson_id`; the lesson name is shown as a grey note on the row, not written into the parent text, unless the teacher types it. Typing anything else leaves the row unlinked and that is fine. If the text is edited so it no longer contains the unit's name, the link is cleared.
2. **Students will from the bank.** When a row is linked, the Students will field offers the unit's objectives as chips. Tap one or two; they are written into the objective field as text, so they print and can be edited. Teachers can type their own line instead. Unlinked rows behave as today.
3. **One quiet line per book at the top of each week:** "Into Reading · Cloudette · 3 stories left · aim 18 Dec · at this pace 2 Jan". Grey text. Never red, never a count badge. Derived from the latest linked row and the class plan.
4. **Next.** On an empty day, Next offers each book on the class plan and writes that book's next unit (the one after the latest linked unit) as a linked row with no objectives. One tap, undoable.
5. **Plan this week for all grades.** One dialog: for each book, which days this week (defaulting to last week's pattern for that book, else none ticked). Writes each grade's own next unit onto those days, linked, no objectives, only on empty days, current and future weeks only. One Undo covers the whole write. The teacher then opens each grade, taps objective chips, adjusts, prints.
6. **Unit detail on hover or click** of a linked row: the unit's lessons, objective bank, standards, Drive files. Reference only. Nothing from it enters the row unless tapped.
7. **Shift plans** (the existing Move a day later / earlier) for every class.
8. **Done** is derived: a unit is done once a later unit of the same book has a linked row, or the teacher ticks it in the unit detail. Store ticks in a small table; never on rows that get deleted.

Nothing else. No tray, no map, no modes, no Class setup link, no per-lesson cards, no split/join/skip. Parent print: `label: content` with the content the teacher wrote, plus the Students will line, escaped. Lesson names, "(1 of 2)" and unconfirmed drafts never appear because they are never written into those fields.

## Curriculum tab

Three views for everyone, scoped to the viewer's classes for teachers:

- **Bookshelf.** Browse series, book, unit, lessons; objectives, standards, files, suggested length. Admin edits. This is where a new teacher learns the book.
- **Class plans.** The read-only timeline above, one class and grade at a time, with the list beside it. Admin edits the list. A teacher opens their own grades and reads "Unit 6 of 12 · 4 lessons · suggested week 12 to 13 · you are on lesson 2".
- **Overview.** Suggested against actual. One row per class, grade and book: units done, units left, last linked date, where the suggested pacing says the class should be, projected finish from the class's own rate over the last six weeks of plans, aim date. Grey text, no alarms. A second tab, This week together: classes on the same unit or skill tag this week, one line per match (`overlapsAt` from curriculumMap.ts survives). A third tab, Standards: coverage from the objectives on linked units with dates, using the existing heat map.

No Ladder view in the first build. Admin keeps Books by class as the editor for Class plans.

## Data

Keep: `curriculum_series`, `curriculum_books`, `curriculum_units` (+ `suggested_lessons int`, `suggested_weeks numeric`), `curriculum_lessons`, `curriculum_resources`, `curriculum_skills`, `curriculum_placements` (+ `aim_date date`), `curriculum_pacing` (placement_id, unit_id, sort_order, suggested_weeks; drop owner, teacher_id, master_pacing_id, fixed, gap_before, done_at).

Add: `curriculum_unit_objectives` (unit_id, sort_order, text, ccss_codes text[], wida text[]) and `curriculum_unit_done` (placement_id, unit_id, done_at, done_by).

Drop: `curriculum_here`, `curriculum_blocks`, `curriculum_plan_reviews`, `curriculum_lesson_log`, `curriculum_class_setup`.

`parent_calendar` subject rows keep `unit_id`, `lesson_id`, `placement_id`. That is the only record of teaching.

Derivations, all pure functions with tests: latest linked unit per placement; units done; projected finish (units left ÷ units per week over the last six weeks, falling back to suggested length); suggested position this week from sort order, suggested weeks, term start and holiday weeks; standards covered from linked units' objectives.

## Build order

Each step is usable on its own and gets Kyla's feedback before the next.

1. **Lesson Plans linking.** Autocomplete to units and lessons, link clearing on edit, unit detail on hover, print escaping, Copy last week without links. Remove the tray, map, strip counts, Next from the board, Class setup link and the `LESSON_SYNC_CLASSES` switch from Lesson Plans. Every class.
2. **Objective banks.** Migration for `curriculum_unit_objectives`; the generation script that writes banks from scope and sequence plus CCSS and WIDA for Hand in Hand, Into Reading and Science of Reading; Students will chips on linked rows; fold Into Reading paired texts into their partners.
3. **Class plans.** Reduce `curriculum_pacing`; add suggested lengths and aim dates; the read-only timeline; the editor list for admin. Delete teacher copies, here, blocks, reviews, lesson log, class setup, and the board's drag, resize and panel actions.
4. **Week line, Next, Plan this week for all grades, Done ticks.**
5. **Overview:** suggested against actual, This week together, Standards from objectives.
6. **Guide and What's New** in teacher words. Remove dead code and tests for deleted features.

## Brief for the model doing the build

You are rebuilding the Curriculum tab and Lesson Plans in this repo to the target design in this document. Read it first, then docs/curriculum-planner-plan.md for the original intent (its data model and build order are superseded by this file), then the git log since 2026-11-06 to know what exists. Follow the build order, one step per checkpoint, and stop for Kyla's feedback after each.

Rules:
- The lesson plan is the only thing teachers edit. Teachers never configure anything before the page is useful. If a teacher simply types "Cloudette" on Tuesday, nothing anywhere treats that as wrong.
- Parent-facing text is what the teacher wrote plus the Students will line. Never write lesson skill names, "(1 of 2)", joined titles or anything a teacher did not tap or type into a printed field. Escape print HTML.
- No approval gates, no draft or confirmed status anywhere. Objective banks are live when seeded.
- Nothing on a timeline drags. Pace is observed from linked rows and compared to a suggested length; it is shown as grey text and never as a red badge, count or alarm.
- Every label is in a teacher's words. No sentence explains an algorithm. Developer messages show to admins only.
- Prefer deleting to fixing. Everything in the Delete list goes, with its tests. Everything in the Keep list stays.
- One Undo for any multi-row write (Next, Plan this week, Shift plans).
- Edit rights: admin, or any teacher assigned to the class. Remember the last class and grade per browser.
- Pure derivations (latest unit, done, projected finish, suggested position, standards covered) live in src/lib with vitest tests. Note `npm install --no-save vitest@2.1.9` is needed before `npx vitest run`, and `tsconfig.tsbuildinfo` must be cleared before trusting `tsc --noEmit`.
- Lesson Plans stays English-only. Follow the paper and ink palette and tokens in globals.css.
