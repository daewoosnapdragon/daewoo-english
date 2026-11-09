# Overtime sheets: the target design

Written 9 Nov 2026 from the paper form (Supplementary non-instructional overtime, Daewoo Elementary School) and a design conversation with Kyla. Draft: the four decisions in "Open decisions" change parts of this file and are marked where they bite. The last section is a brief for the model doing the build.

## The idea in one paragraph

Teachers already fill in a paper sheet each month: date, from, to, hours, reason, signed by hand, handed to admin, who passes it to the school office for pay. The app replaces the handwriting, not the process. A teacher logs each stint of non-instructional overtime in ten seconds on the day it happens; the month adds itself up; Print gives the exact paper form, filled in, with the signature box left blank for a pen. Admin opens one page, sees every teacher's month with hours and won, prints one sheet or all of them in one file, and ticks the month as sent to the office, which locks it. No submit button, no approval, no status beyond that one tick.

## The paper form, as the print must reproduce it

A4 landscape. Across the top, centred, the title "Supplementary non-instructional overtime". Under it a two-language policy paragraph (English, then the Korean sentence) and, right-aligned, "Daewoo Elementary School". Top left, a boxed "Signature: ____________". Then a table with a bold header row and sixteen ruled rows:

| No. | Date | Overtime Hours (From: / To:) | # of Hrs. | Specific Reason |
|---|---|---|---|---|

The first body row carries the words "From:" and "To:" inside the Overtime Hours cell as a prompt; filled rows read "16:40 – 18:10". Specific Reason is the widest column by far. Nothing else is on the page. The PDF has two identical pages; a month longer than sixteen rows continues on a second page with the same header and blank rows to the bottom.

The policy paragraph on the form, kept as the seeded default and corrected by admin in Settings (decision 2):

> According to the government official policy, from January 1st, 2021 the employer will pay for non-instructional overtime. In this case, the employee shall be entitled to supplementary overtime pay of 8,720 won per hour. The employer also will pay overtime maximum 4 hours for national holidays and the weekends.
> 공무원 지침에 따라, 2021년 1월 1일부터 수업외의 시간외 근무에 관하여 초과근무 수당을 지급한다. 이러한 경우에는 시간외 수당은 1시간에 8,720원을 지급한다. 단, 공휴일, 토 일요일은 최대 4시간까지만 인정한다.

8,720 won was the 2021 minimum wage. The rate is stored, never hard-coded; the printed paragraph is whatever Settings holds.

## Where it lives

- **Overtime** in the user menu, between Supplies and Budget. Route `/overtime`, view id `overtime`, page title "Overtime". Not in the main nav.
- **One line on the dashboard** for every teacher: "Overtime · 4.5 h this month · Add". Add opens the page with the new-entry row focused. Same weight as the Supplies card, smaller if it can be.
- Admin's user menu link opens the admin view; a teacher's opens their own month.

## The teacher's page

One month at a time, the current month by default, with previous and next arrows and the month's total on the right: "4.5 h · 45,000 won" (hours only if decision 4 says so).

At the top, the new-entry row, always visible:

- **Date**: a date field, default today. Not after today; the message is "Not yet" in grey under the field.
- **From** and **To**: time fields in 5-minute steps. The From default is the end of the school day if the schedule rules know it, else the teacher's last entry's From.
- **Hours**: worked out from the times as decimal hours to one place (1.5). Shown, not typed. A small "edit" turns it into a field for the rare case; an edited figure is kept and the times stay as typed.
- **Reason**: a text field, required. Under it, chips of this teacher's five most recent distinct reasons; a tap fills the field. Admin can add house reasons in Settings ("Report cards", "Open class preparation", "Parent meeting", "School event") and those chips show for everyone, after the teacher's own.
- **Same as last time** copies the previous entry's times and reason onto today.
- **Add** saves. Enter in any field saves.

Under it, the month's entries as a table in date order, the same columns as the paper (No., Date, From – To, Hours, Reason) plus a quiet edit and delete per row. Click a row to edit in place; Escape cancels, Enter saves. Delete asks once with the existing ConfirmDialog.

At the bottom, **Print this month** and, when the month is locked, "Sent to the office on 2 Dec by Victoria" in grey instead of the edit controls; the rows stay readable and printable. Nothing else on the page.

Rules the page enforces, each with one plain sentence under the field, never a red badge:

- To must be after From. "Finish time comes before start time."
- A weekend day, or a day the school calendar marks as a day off for everyone (`calendar_events` type `day_off`, no target grades), caps the entry at 4 hours: the hours figure is shown as 4.0 with "4 hours is the most for a weekend or holiday" under it, and 4.0 is what is saved.
- Two entries on the same day may not overlap in time. "Overlaps the 16:40 – 18:10 entry."
- Reason is required. "Say what the work was."
- A locked month cannot be edited; the row controls are gone and the new-entry row says "This month has gone to the office. Ask admin to unlock it if something is wrong."

## The admin page

Month picker at the top with the month's totals on the right: hours, won, and how many teachers have entries.

One row per active teacher who is not admin, in the order the teachers table gives: name, class, entries, hours, won, last entry date, Sent (a tick with date and who, or empty), and three buttons: **Open**, **Print**, **Mark sent** (or **Unlock**). A totals row at the bottom. A teacher with no entries shows "—" and prints a blank sheet if asked.

**Open** shows that teacher's month exactly as the teacher sees it, editable by admin (admin can fix a typo for someone who is away), with a line at the top naming whose sheet it is.

**Print** on a row prints that teacher's sheet. **Print all** at the top prints every teacher with entries for the month in one document, one teacher per page (more when a month runs past sixteen rows), so the whole staff's sheets come out of the printer in one go. The browser's Save as PDF gives the file for email.

**Mark sent** sets the lock for that teacher and month, with the date and admin's id. **Mark all sent** does it for every teacher with entries. **Unlock** clears it. Each lock change goes to the activity log.

**Export** writes the month as an .xlsx with one row per entry (teacher, date, from, to, hours, reason) and a second sheet of totals per teacher, using the `xlsx` dependency already in the app, for the office's own records.

Who sees the admin page: `role === 'admin'` (decision 1). Everyone else who opens `/overtime` gets their own month. The dashboard line is the same for everyone.

## Print

Follow `src/components/supplies/countSheet.ts`: a pure function returns a self-contained HTML string, a thin wrapper opens it in a new window and calls `window.print()` on load. No react-pdf. Escape every string that came from a teacher.

- `@page { size: A4 landscape; margin: 12mm }`. The policy paragraph in 11px, the table filling the width, Specific Reason at least half the width.
- Exactly sixteen body rows per page. Filled rows first in date order, numbered from 1 across pages; blank rows to the bottom of the last page. The "From: / To:" prompt appears only in a blank first row, as on the paper.
- The teacher's name in small type above the table on the right ("Snapdragon · Kim Minji · November 2026"), since the paper has no name field and admin will print a pile of them. Kyla can say no to this; it is one line.
- The signature box is empty. A stored signature image is a later step.
- Hours print as the stored figure (1.5, 4.0). Dates as `2026-11-03` or `Nov 3`, whichever Kyla prefers; default `11/03` to match how the office writes them if known, else `Nov 3`.
- Printing logs `printed` to the activity log with the teacher and month.

## Settings

A short **Overtime** section in Settings, admin only:

- Hourly rate in won (number). Seeded 8,720; admin corrects it on day one.
- The policy paragraph, English and Korean, as two text areas. Seeded with the form's words. A note under them: "This prints at the top of every sheet."
- Weekend and holiday cap in hours. Seeded 4.
- House reasons, one per line.

Stored as one JSON row in `app_settings` under key `overtime`, the way office jobs and the behavior ladder are, with a `loadOvertimeSettings()` that fills defaults for anything missing. Rate changes apply to how the app shows won from then on; nothing stored on entries changes, since entries store hours, not money. If the office needs the rate that applied in a given month, the lock row records the rate at the time it was marked sent.

## Data

`supabase/migration-overtime.sql`, safe to re-run, permissive RLS like every other table here (the app does its own gating by role):

```sql
CREATE TABLE IF NOT EXISTS overtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  hours NUMERIC(4,1) NOT NULL,            -- what prints; computed from the times unless edited or capped
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_teacher_month ON overtime_entries(teacher_id, date);

-- One row per teacher and month once admin has sent the sheet to the office.
CREATE TABLE IF NOT EXISTS overtime_months (
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  month DATE NOT NULL,                      -- the first of the month
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_by UUID REFERENCES teachers(id) ON DELETE SET NULL,
  rate_won NUMERIC NOT NULL,                -- the hourly rate when it was sent
  hours NUMERIC(5,1) NOT NULL,              -- the month's total when it was sent
  PRIMARY KEY (teacher_id, month)
);
```

Plus the `app_settings` row `overtime` seeded with the defaults above (`INSERT … ON CONFLICT DO NOTHING`).

Reads: `fetchOvertimeMonth(teacherId, month)` for the teacher page; `fetchOvertimeForMonth(month)` returning every entry and lock for the admin page, one query each. Writes go through `src/lib/overtimeData.ts` and each one logs to the activity log (`created`, `edited`, `deleted`, `printed`, `settings`).

Pure functions in `src/lib/overtime.ts`, each with a vitest test in `src/lib/__tests__/overtime.test.ts`:

- `hoursBetween(start, end)`: decimal hours to one place; null when end is not after start.
- `isCappedDay(date, dayOffDates)`: Saturday, Sunday or a whole-school day off.
- `applyCap(hours, capped, capHours)`.
- `overlaps(entry, others)`.
- `monthTotals(entries, rate)`: hours and won.
- `sheetPages(entries, rowsPerPage = 16)`: the numbered rows and blank fillers per page.
- `sheetHtml(teacher, month, pages, settings)` and `allSheetsHtml(…)`: the print documents.
- `recentReasons(entries, n = 5)`.

## Code shape

- `src/app/(app)/overtime/page.tsx` renders `OvertimeView`.
- `src/components/overtime/OvertimeView.tsx` chooses the admin or teacher view by role; `TeacherMonth.tsx` (the month, the new-entry row, the table), `AdminMonth.tsx` (the staff table), `EntryRow.tsx` (new and edit share it), `useOvertime.ts` (load, reload, the month in state).
- `src/components/overtime/overtimeSheet.ts`: the print HTML, pure.
- `src/components/dashboard/OvertimeLine.tsx` for the dashboard.
- `src/lib/routes.ts`: add `overtime` to `VIEW_PATHS` and `PAGE_TITLES`; not to `NAV_ORDER`. Masthead user menu: add the link after Supplies. Korean labels inline as `ko ? '…' : '…'`, the way Supplies does it; `translations.ts` is only for the main nav and is not touched.
- `src/content/guide.ts`: an `overtime` section in teacher words (purpose, screen, tasks: log overtime, fix an entry, print your sheet; admin: print everyone, mark sent, change the rate). `src/content/whats-new.ts`: one entry dated the Monday it goes out.
- Until the migration has run, the page shows "Not set up yet" to teachers and "Run supabase/migration-overtime.sql in the SQL Editor" to admin only, following `isSuppliesMissing`.

## Not in this build

- A stored signature image on the teacher record that prints in the box.
- A month-end notice ("Print and sign your overtime sheet by Friday").
- Approval, comments, or any status other than the sent tick.
- Overtime that crosses midnight.
- A per-teacher rate.

## Open decisions

1. **Who sees everyone's sheets.** Default: `role === 'admin'` only. If the head teacher or the Snapdragon teacher should too, change the one check in `OvertimeView.tsx` and the guide text.
2. **The hourly rate and the policy wording.** Default: seeded from the form (8,720 won, 2021 text), edited by admin in Settings. If Kyla gives the current rate and text before the build, seed those instead.
3. **The sent-to-office lock.** Default: in. If out, drop `overtime_months`, Mark sent, Unlock and the locked state; nothing else changes.
4. **Won on the teacher's page.** Default: shown next to hours. If hours only, remove it from the teacher page and the dashboard line; the admin page keeps it.

## Build order

1. Migration, settings row, `overtime.ts` with tests, data layer.
2. Teacher page: month, new-entry row with the rules, table, edit and delete. Route, user menu, translations.
3. Print: one sheet, exact to the paper, from the teacher page.
4. Admin page: staff table, Open, Print one, Print all, Mark sent, Unlock, Export.
5. Settings section, dashboard line, guide and What's new.

Each step is usable on its own; stop for Kyla's feedback after 2 and 4.

## Brief for the model doing the build

You are adding an Overtime page to this repo to the design in this document. Read it first, then `src/components/supplies/` (the page shape, `useSupplies.ts`, `countSheet.ts` for the print pattern), `src/lib/suppliesData.ts` (writes with the activity log), `supabase/migration-supplies.sql` (migration style), `src/lib/officeJobs.ts` (settings in `app_settings`), and the `supplies` entries in `src/content/guide.ts` and `src/content/whats-new.ts`. Follow the build order and stop for Kyla's feedback after steps 2 and 4.

Rules:
- The print is the paper form. Same title, policy text, signature box, columns, sixteen rows per page, blank rows to the bottom. Someone who has filled in the paper sheet for years must recognise it at a glance.
- Logging an entry is one row at the top of the page and takes seconds. Nothing needs to be set up before the page is useful.
- The hourly rate and the policy wording live in Settings and are never written into code or into entries. Entries store hours; money is worked out when shown, and the lock row keeps the rate it was sent at.
- Rules (cap, overlap, required reason, not in the future) are one grey sentence under the field. Never a red badge or a count.
- No approval gates and no status except the sent tick, which only admin sets.
- Every label is in a teacher's words, English and Korean. Developer messages show to admin only.
- Escape everything typed before it reaches print HTML.
- Pure functions for every calculation and for the print document, with tests. Nothing in a component does arithmetic on times.
- Do not touch Supplies, Budget or anything outside the files this document names, except the four shared files it lists (routes, Masthead, translations, dashboard).
