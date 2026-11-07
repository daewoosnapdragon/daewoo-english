# Curriculum planner: build plan

Written 7 Nov 2026 from the design conversation. Mockup: https://claude.ai/artifact/Jc7wntVgMgxakjVhk6GHy4
(three artboards: program map, Daisy G2 class board, Snapdragon ladder).

## Decisions already made

- **Three layers.** The catalogue (books, units, lessons, tags, Drive files) exists once. A placement is a book in a class + grade + semester. The master is pacing: unit order and durations anchored to fixed weeks (level tests, semester end), dates derived. Actuals record what each class really did and when, and seed next year's master.
- **Overlap** comes from shared units and shared skill tags, not from matching text. Needs a small controlled phonics/skill vocabulary (60 to 80 entries) alongside CCSS codes, because CCSS is too coarse (RF.1.3c covers every long vowel pattern).
- **"We're here"** is the primary teacher gesture: pick the week a strand is really at, everything after re-flows, and the app shows what now runs past the semester. Drag and resize are secondary, snapped to weeks, bars in a lane push each other. Past weeks are locked except for marking done.
- **No approval gate.** Teacher changes go live; admin is notified (activity log + review queue) and can comment or revert.
- **Deviation and lag read as alignment, not alarm.** Master rail with ticks under each lane, red ticks where the plan differs. Here-pins per strand with a dotted lag line to today.
- **Import copies words, keeps tags.** Importing a lesson into the daily plan copies title/objective/notes (teacher may edit) and keeps the standard tags linked, so a taught lesson can mark its clusters in `class_standard_status`.
- **Books per student.** Cross-level sharing (e.g. one Hand in Hand level placed in Snapdragon G1 and Lily G4) means a student who moves levels can meet a book twice. Derive a per-student book history from placements + leveling history and flag repeats at placement time.
- **Three pivots of one grid:** group by level (program map), group by grade, one level across grades (ladder). Same gestures everywhere.
- **Colour means book**, consistent across the app; class colour stays on chips and map lines. Eight muted book colours, hue plus a two-letter badge, never hue alone.
- **Class board footer:** a CCSS cluster map for the class's adjusted grade (cells per cluster grouped by domain: taught / planned / nothing in this plan), not a week-by-week strip. Clicking a cluster highlights the bars that teach it and vice versa; hovering shows the weeks. The Standards page heat map is the model.

## Answers from Kyla, 7 Nov 2026

- **Grades inside a level use different books.** The master is per class + grade (Snapdragon G1 and Snapdragon G2 are separate placements). Never collapse pacing to the level.
- **Some books span the year, some a semester.** A placement carries a term: spring (the first half, the school year starts in March), fall (the second) or the whole year, which runs spring then fall across the summer break. Pacing is always in units or modules inside the book. Every book must be divisible into units/modules for display.
- **One teacher teaches a level at every grade.** Kyla teaches Snapdragon G1 to G5. So the ladder (one level, all grades) is a teacher's home screen, with here-pins on every step; the class board is one step opened up. Build the ladder earlier than phase 6: a read-only ladder lands with phase 2.
- **Kyla edits the master.** Victoria reviews and comments but does not edit it. The review queue is Kyla's.
- **Dropped books stay as retired** so actuals and student book history keep resolving.
- **The Snapdragon G1 / Lily G4 Hand in Hand case is the same semester**, so it is concurrent overlap (plan together now). Sequential overlap still gets built for the other cases.
- **Teacher-made blocks: skill tag optional, with a nudge** ("tag a skill and this block shows on the program map"), never required.

## Before building (Kyla / Victoria)

1. Close the book poll. Index books only at book level until it closes.
2. Decide the shared Drive folder convention while the index is in progress: `Program / Book / Unit NN / Lesson NN` (or similar) so links resolve by path instead of thousands of pasted links.
3. Collect each confirmed book's table of contents and the teacher's guide objective pages (photos or pastes). Claude drafts units, lessons, "students will" lines and tags from these; you confirm at unit level and spot-check lessons.
4. Agree the skill vocabulary (phonics patterns first).
5. Settle at the meeting: how often teachers deviate and why; whether the two grades inside one level run the same sequence or offset; what blank blocks are for.

## Data model (Supabase)

Tables are new; nothing existing changes shape. Follow repo conventions: `english_class` text + `grade` int, `semesters.id`, `teachers.id`, RLS like the supplies tables, every save logged with `logActivity`.

- `curriculum_series` — name, publisher, strand (phonics | reading | writing | speaking | other), colour key.
- `curriculum_books` — series_id, level_number, title, cover_url, status (polled | confirmed | retired), drive_folder_id.
- `curriculum_units` — book_id, sort_order, title, summary, skill_tags text[], ccss_codes text[], default_weeks int, confirmed_by, confirmed_at, drive_folder_id, source (claude | teacher).
- `curriculum_lessons` — unit_id, sort_order, title, objective ("students will…"), notes, ccss_codes text[], skill_tags text[], confirmed_by, confirmed_at, source.
- `curriculum_resources` — lesson_id or unit_id, drive_file_id, name, kind (slides | pdf | doc | audio | video | other), copies_hint int.
- `curriculum_skills` — code, label, strand, parent_code (the controlled vocabulary).
- `curriculum_placements` — book_id, english_class, grade, start_semester_id, span (year | semester), academic_year, is_master bool, created_by. One row per master placement; teacher copies reference the master. Year-long placements pace across both semesters.
- `curriculum_pacing` — placement_id, unit_id, sort_order, weeks int, anchor_week int null (only for pinned units), owner (master | teacher), teacher_id null, master_pacing_id null (link to the master row this deviates from).
- `curriculum_blocks` — teacher-made units: english_class, grade, semester_id, teacher_id, title, skill_tags, weeks, sort_order, strand.
- `curriculum_actuals` — placement_id, unit_id or block_id, started_week, ended_week, marked_done_by, marked_done_at.
- `curriculum_here` — placement_id, strand, week numeric, set_by, set_at (the "we're here" pins; history kept).
- `curriculum_spiral_marks` — level, skill_code or ccss cluster, note (intended spirals so the ladder stops flagging them).
- View `student_book_history` — student_id, book_id, english_class, grade, semester_id, derived from placements and the student's class per semester.

Derived weeks = cumulative sum of pacing `weeks` in `sort_order`, offset by anchors and the semester's holiday weeks (from `calendar_events`).

## Build order

Each phase ships on its own and is useful alone.

1. **Catalogue + Bookshelf page (admin).** Series, books, units, lessons, resources, skills. "Draft from the teacher's guide" action that takes pasted TOC/objective text and writes unconfirmed units and lessons. Confirm buttons at unit and lesson level. Status chips: suggested by Claude vs confirmed.
2. **Master pacing + read-only class board + read-only ladder.** Kyla places books per class + grade with a span and sets unit order and weeks. Teachers see their ladder (all their grades) and each grade's semester board with lanes, bars, today line, holiday hatching. This alone delivers "teachers don't have to work out what to teach when".
3. **Program map + overlap.** One line per level across the semester, expand to grades. Concurrent overlap (same unit or skill tag the same week) and sequential overlap (someone taught this unit earlier; their notes and files). Week panel and "plan together" (stacked boards, shared Drive folder).
4. **Teacher edits.** "We're here" per strand with re-flow and the "runs past the semester" consequence. Drag to move, drag edge to resize, snap to weeks, lane push. Master rail with red ticks. Changes live; activity log entry; admin review queue with comment and revert. Blank blocks.
5. **Week and day zoom + import.** Week view proposes the current units' lessons as chips; dropping one writes into `teacher_daily_plans` (copy words, keep tags). Day view is the existing daily plan with resources and Print/Present links to Drive. Marking a day done writes actuals and bumps `class_standard_status` for the lesson's clusters. CCSS cluster map in the board footer.
6. **Ladder + student paths + Drive linking.** One level across grades, series ladder, checks (climb breaks, gaps, series seams, spiral vs repeat with intended marks). Student path overlay from leveling history with repeat flags. Drive folder walk that resolves `curriculum_resources` from the folder convention.
7. **Print.** Semester-at-a-glance poster per class (A3) and "print the whole week", on the count-sheet print engine.

## Where it sits in the app

- Masthead: a new **Curriculum** entry. Sub-tabs: Program map, Class boards, Ladder, Review queue, Bookshelf.
- Lesson plans page gains the import chips and the "where this sits" context card; no second day-level calendar.
- Standards page stays; the board footer reuses its heat map component for one class.
- Dashboard: a "this week" card per teacher (unit, days' lessons, print the week).

## Visual rules

Paper/ink palette and tokens from `globals.css`, Newsreader headings, Archivo body, flat corners, hairlines. Book colours (first draft, adjust to taste): Into Reading #2F5C8A, Super Phonics #6B4C9A, Hand in Hand #2E6B3A, Thumbs Up #B8641E, Rich Reading #4E948A, Easy Reading #9A6A12, Wonderskills #A5466B, project/review #857D6E. Teacher-made blocks: paper with a dashed ink-3 border. Oxblood accent only for today, here-pins, deviation ticks and primary actions.
