# Overtime sheets: the target design

Written 9 Nov 2026 from the paper form (Supplementary non-instructional overtime, Daewoo Elementary School) and a design conversation with Kyla, who settled the open points the same day (see "Decided"). Built 9–10 Nov 2026 as described here; see "What was built" at the end. The brief for the model doing the build is kept for reference.

## The idea in one paragraph

Teachers already fill in a paper sheet each month: date, from, to, hours, reason, signed by hand, handed to admin, who passes it to the school office for pay. The app replaces the handwriting, not the process. A teacher logs each stint of non-instructional overtime in ten seconds on the day it happens, typing the times the way they say them (4:30 to 6:45); the minutes add themselves up and the won shows as they type. The month is shown as weeks, each with a tick box, and Print gives a clean version of the paper form for the ticked weeks, with the signature box left blank for a pen. Admin opens one page, ticks the weeks the office is asking for, sees every teacher's time and won for those weeks, and prints one sheet or all of them in one file. Weekends and days off are not overtime and cannot be logged. No submit, no approval, no status.

## Decided (9 Nov 2026)

- Admin only (`role === 'admin'`) sees everyone's sheets. Head teacher and Snapdragon see their own, like any teacher.
- The overtime rate is **10,320 won an hour**. Teachers see it while they log: the rate near the entry row, the won on every entry and in the totals.
- No "sent to the office" lock. Entries stay editable; admin can edit anyone's.
- Teachers see won as well as time.
- Weeks, not only months: every list of entries is grouped by week with a tick box per week, and Print prints the ticked weeks.
- Times are typed and shown as clock times (4:30 – 6:45) and the minutes are added up by the app. Nobody types hours.
- Weekends and holidays are not included in overtime at all (decided 10 Nov 2026, replacing the paper form's four-hour cap). No entry can be made on a Saturday, a Sunday or a whole-school Day Off on the school calendar. The policy paragraph says so.
- The printed form keeps the paper form's content (title, policy paragraph, signature box, the five columns) but may be cleaned up: better type, a name and period line, a totals row.

## The paper form

A4 landscape. Centred title "Supplementary non-instructional overtime". Under it the policy paragraph in English and then Korean, and right-aligned "Daewoo Elementary School". Top left, a boxed "Signature: ____________". Then a table with a bold header and sixteen ruled rows: No. · Date · Overtime Hours (From / To) · # of Hrs. · Specific Reason, with Specific Reason by far the widest. The PDF has two identical pages.

The policy paragraph, seeded into Settings with `{rate}` where the number goes so it is stored once. The paper's last sentence (a four-hour maximum on weekends and holidays) is replaced, since those days are not overtime at all:

> According to the government official policy, from January 1st, 2021 the employer will pay for non-instructional overtime. In this case, the employee shall be entitled to supplementary overtime pay of {rate} won per hour. Overtime on weekends and national holidays is not included.
> 공무원 지침에 따라, 2021년 1월 1일부터 수업외의 시간외 근무에 관하여 초과근무 수당을 지급한다. 이러한 경우에는 시간외 수당은 1시간에 {rate}원을 지급한다. 단, 공휴일 및 토·일요일의 근무는 포함하지 않는다.

## Where it lives

- **Overtime** in the user menu, between Supplies and Budget. Route `/overtime`, view id `overtime`, page title "Overtime". Not in the main nav.
- **One line on the dashboard** for every teacher: "Overtime · 6 h 45 m this month · 69,660 won · Add". Add opens the page with the entry row focused. Same weight as the Supplies card, smaller if it can be.
- Admin's link opens the admin page; a teacher's opens their own.

## Time, as the app handles it

- A time is typed as people say it: `4:30`, `6:45`, `16:30`, `9am`, `4.30`, `430`. The parser accepts all of these. With no am/pm and no 24-hour hour: 7 to 11 are morning, 12 and 1 to 6 are afternoon. `am`/`pm` or a 24-hour figure always wins. Shown everywhere as `4:30 – 6:45` with no am/pm, and with "am" only on a morning time (`9:00 am – 1:00`), since afternoons are the norm.
- An entry stores `start_time` and `end_time` as 24-hour `TIME`, and `minutes` as an integer. Minutes are worked out from the times and never typed. Typing `4:30-6:45` into From fills both fields. A To without am/pm that would come before From is read in the evening (4:30 to 8 is 4:30 to 8:00 pm).
- Minutes are shown as `2 h 15 m` (or `45 m`, or `3 h`). Totals add minutes and show the same way. Won is `minutes / 60 × rate`, rounded to the won, shown as `23,220 won`.
- A week is Monday to Friday, clipped to its month: November 2026 is Nov 2 – 6, Nov 9 – 13, Nov 16 – 20, Nov 23 – 27 and Nov 30. A week that spans two months appears in both, each with only its own days, so month totals stay exact.

## The teacher's page

One month at a time, the current month by default, previous and next arrows, and the month's total on the right: "6 h 45 m · 69,660 won". Under it in grey, "10,320 won an hour".

At the top, the entry row, always visible:

- **Date**: a date field, default today. Not after today; "Not yet" in grey under it.
- **From** and **To**: two short text fields that take clock times as above. As soon as both parse, the row shows the result live to the right: "4:30 – 6:45 · 2 h 15 m · 23,220 won".
- **Reason**: a text field, required. Under it, chips of this teacher's five most recent distinct reasons, then admin's house reasons from Settings; a tap fills the field.
- **Same as last time** copies the previous entry's times and reason onto today.
- **Add** saves. Enter in any field saves.

Under it, the month's entries grouped by week, newest week first. Each week has a tick box, its dates ("Nov 2 – 6"), and its subtotal ("3 h 30 m · 36,120 won"). Under the week header, one line per entry: date, `4:30 – 6:45`, `2 h 15 m`, won, reason, and a quiet edit and delete. Click a row to edit in place; Escape cancels, Enter saves. Delete asks once with the existing ConfirmDialog. Weeks with entries are ticked by default; an empty week says Nothing logged and can still be ticked, to print a blank sheet.

At the bottom, **Print** prints the ticked weeks. Nothing else on the page.

Rules, each one grey sentence under the field, never a red badge:

- Both times must parse. "Type a time like 4:30."
- To must be after From. "Finish time comes before start time."
- Weekend: "Weekends are not overtime." Whole-school day off (`calendar_events` type `day_off` with no target grades): "Foundation Day is a day off, so it is not overtime." Neither can be saved. An entry already on a day that is later marked off stays on the page, crossed out, and is not counted, printed or exported.
- No overlap with another entry that day. "Overlaps the 4:30 – 6:45 entry."
- Reason required. "Say what the work was."

## The admin page

Month picker at the top. Under it the month's weeks as tick boxes in a row ("Nov 1 · Nov 2 – 8 · Nov 9 – 15 · …"), all ticked by default, with **All** and **None**. Everything below follows the ticks: the totals, the table, Print and Export. The month's total for the ticked weeks on the right: time, won, how many teachers have entries.

One row per active teacher who is not admin, in the order the teachers table gives: name, class, entries, time, won, last entry date, and two buttons, **Open** and **Print**. A totals row at the bottom. A teacher with nothing in the ticked weeks shows "—".

**Open** shows that teacher's page exactly as they see it, editable by admin, with a line at the top naming whose it is; the week ticks there start from the admin page's ticks.

**Print** on a row prints that teacher's sheet for the ticked weeks. **Print all** prints every teacher who has entries in the ticked weeks in one document, one teacher per sheet (a second page when a sheet runs past sixteen rows), so the whole staff's sheets come out of the printer in one go. The browser's Save as PDF gives the file.

**Export** writes the ticked weeks as an .xlsx: one sheet with a row per entry (teacher, class, date, from, to, minutes, hours as a decimal, won, reason) and a second sheet of totals per teacher. Uses the `xlsx` dependency already in the app.

## Print

Follow `src/components/supplies/countSheet.ts`: a pure function returns a self-contained HTML string; a thin wrapper opens it in a new window and calls `window.print()` on load. No react-pdf. Escape every string a teacher typed.

The sheet is the paper form, tidied:

- `@page { size: A4 landscape; margin: 12mm }`. One typeface, the app's print stack (`-apple-system, "Segoe UI", Helvetica, Arial, "Noto Sans KR"`), so the Korean sets properly.
- Title centred, 20px. Policy paragraph under it at 10.5px in grey-black, English then Korean, with the rate filled in from Settings. "Daewoo Elementary School" right-aligned under the paragraph.
- A line across under the heading: left, the signature box ("Signature:" and a rule, about 70 mm wide, boxed as on the paper); right, in small caps-style grey type, the teacher's name, class and the period printed ("Kim Minji · Snapdragon · 2 – 29 Nov 2026" or "November 2026" when every week is ticked).
- The table fills the width: No. (narrow) · Date · From – To · Time · Reason (at least half the width). Header row in bold with a heavy rule under it; body rows with light rules; a heavy rule under the last row. Dates as `Nov 3`; times as `4:30 – 6:45`; time as `2 h 15 m`.
- Sixteen body rows per page. Filled rows first in date order, numbered from 1 across pages; blank rows to the bottom of the last page so the sheet looks like the paper. A totals row under the table on the last page: "Total · 6 h 45 m · 69,660 won at 10,320 won an hour".
- The signature box is empty. A stored signature image is a later step.
- Printing logs `printed` to the activity log with the teacher and period.

## Settings

A short **Overtime** section in Settings, admin only:

- Rate, won an hour. Seeded 10,320.
- The policy paragraph, English and Korean, as two text areas with `{rate}` in them. A note under: "This prints at the top of every sheet. {rate} becomes the number above."
- House reasons, one per line. Seeded empty.

Stored as one JSON row in `app_settings` under key `overtime`, the way office jobs and the behavior ladder are, with `loadOvertimeSettings()` filling defaults for anything missing. A rate change applies to everything shown from then on; entries store minutes, never money.

## Data

`supabase/migration-overtime.sql`, safe to re-run, permissive RLS like every other table here (the app gates by role):

```sql
CREATE TABLE IF NOT EXISTS overtime_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  minutes INTEGER NOT NULL,                 -- from the times; never typed
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_teacher_date ON overtime_entries(teacher_id, date);
CREATE INDEX IF NOT EXISTS idx_overtime_entries_date ON overtime_entries(date);
```

Plus the `app_settings` row `overtime` seeded with the defaults above (`INSERT … ON CONFLICT DO NOTHING`).

Reads: `fetchOvertime(teacherId, from, to)` for the teacher page and `fetchOvertimeAll(from, to)` for the admin page, each one query over the month plus the day-off events for the same range. Writes go through `src/lib/overtimeData.ts` and each one logs to the activity log (`created`, `edited`, `deleted`, `printed`, `settings`).

Pure functions in `src/lib/overtime.ts`, each with a vitest test in `src/lib/__tests__/overtime.test.ts`:

- `parseClock(text)`: the typed forms above to `HH:MM` 24-hour, or null.
- `fmtClock(hhmm)`: `4:30`, `9:00 am`.
- `minutesBetween(start, end)`: integer minutes; null when end is not after start.
- `daysOffIn(events, from, to)` and `blockedReason(date, daysOff)`: a weekend or a whole-school day off; `counted(entries, daysOff)`.
- `overlaps(entry, others)`.
- `fmtMinutes(m)`: `2 h 15 m`, `45 m`, `3 h`.
- `won(minutes, rate)`: rounded to the won; `fmtWon`.
- `weeksOfMonth(year, month)`: Monday-to-Sunday weeks clipped to the month, each with its label and its dates.
- `entriesInWeeks(entries, weeks)`, `totals(entries, rate)`.
- `periodLabel(weeks, allTicked)`: "2 – 29 Nov 2026" or "November 2026".
- `sheetPages(entries, rowsPerPage = 16)`: numbered rows and blank fillers per page.
- `sheetHtml(teacher, period, pages, totals, settings)` and `allSheetsHtml(…)`: the print documents.
- `recentReasons(entries, n = 5)`.

## Code shape

- `src/app/(app)/overtime/page.tsx` renders `OvertimeView`.
- `src/components/overtime/OvertimeView.tsx` chooses the admin or teacher page by role; `TeacherMonth.tsx` (the month, the entry row, the weeks), `AdminMonth.tsx` (week ticks, the staff table), `EntryRow.tsx` (new and edit share it), `WeekTicks.tsx`, `useOvertime.ts` (load, reload, the month and ticks in state).
- `src/components/overtime/overtimeSheet.ts`: the print HTML, pure; `overtimeExport.ts`: the xlsx.
- `src/components/dashboard/OvertimeLine.tsx` for the dashboard.
- `src/lib/routes.ts`: add `overtime` to `VIEW_PATHS` and `PAGE_TITLES`; not to `NAV_ORDER`. Masthead user menu: add the link after Supplies. Korean labels inline as `ko ? '…' : '…'`, the way Supplies does it; `translations.ts` is only for the main nav and is not touched.
- `src/content/guide.ts`: an `overtime` section in teacher words (purpose, screen, tasks: log overtime, fix an entry, print your sheet; admin: tick the weeks, print everyone, export, change the rate). `src/content/whats-new.ts`: one entry dated the Monday it goes out.
- Until the migration has run, the page shows "Not set up yet" to teachers and "Run supabase/migration-overtime.sql in the SQL Editor" to admin only, following `isSuppliesMissing`.

## Not in this build

- A stored signature image on the teacher record that prints in the box.
- A month-end notice ("Print and sign your overtime sheet by Friday").
- Any status, lock, approval or comment on an entry or a month.
- Overtime that crosses midnight.
- A per-teacher rate.

## Build order

1. Migration, settings row, `overtime.ts` with tests (the clock parser first; it is where the mistakes will be), data layer.
2. Teacher page: month, entry row with the live time and won, the rules, weeks with ticks, edit and delete. Route, user menu.
3. Print: one sheet, the tidied paper form, from the teacher page.
4. Admin page: week ticks, staff table, Open, Print one, Print all, Export.
5. Settings section, dashboard line, guide and What's new.

Each step is usable on its own; stop for Kyla's feedback after 2 and 4.

## Brief for the model doing the build

You are adding an Overtime page to this repo to the design in this document. Read it first, then `src/components/supplies/` (the page shape, `useSupplies.ts`, `countSheet.ts` for the print pattern), `src/lib/suppliesData.ts` (writes with the activity log), `supabase/migration-supplies.sql` (migration style), `src/lib/officeJobs.ts` (settings in `app_settings`), `src/lib/calendarDays.ts` (the day-off events), and the `supplies` entries in `src/content/guide.ts` and `src/content/whats-new.ts`. Follow the build order and stop for Kyla's feedback after steps 2 and 4.

Rules:
- Times are typed as clock times and the app adds up the minutes. Nobody types hours or minutes, and nothing stored is money. The rate is 10,320 won an hour, in Settings, never in code.
- A teacher sees the time and the won as they type, on every entry, per week and for the month.
- Every list of entries is weeks with tick boxes, and Print and Export follow the ticks.
- The print is the paper form, tidied: same title, policy paragraph with the rate filled in, signature box, five columns, sixteen rows per page, blank rows to the bottom, plus a name-and-period line and a totals row. Someone who has filled in the paper sheet for years must recognise it at a glance.
- Logging an entry is one row at the top of the page and takes seconds. Nothing needs to be set up before the page is useful.
- Rules (parse, order, weekend or day off, overlap, reason, not in the future) are one grey sentence under the field. Never a red badge or a count.
- No approval, lock or status anywhere.
- Every label is in a teacher's words, English and Korean. Developer messages show to admin only.
- Escape everything typed before it reaches print HTML.
- Pure functions for every calculation, the week grouping and the print document, with tests. Nothing in a component does arithmetic on times.
- Do not touch Supplies, Budget or anything outside the files this document names, except the four shared files it lists (routes, Masthead, dashboard, Settings).

## What was built (10 Nov 2026)

All five steps, in one change. Run `supabase/migration-overtime.sql` once in the SQL Editor before anyone opens the page; until then teachers see "Not set up yet" and admin sees the file name.

- `src/lib/overtime.ts`: the clock parser, minutes, won, weeks, days off, overlap, totals, period labels and sheet pages; tests in `src/lib/__tests__/overtime.test.ts`.
- `src/lib/overtimeData.ts`: reads and writes, each logged to the activity log, and the settings row.
- `src/components/overtime/`: `OvertimeView` (admin or teacher), `TeacherMonth`, `AdminMonth`, `EntryEditor`, `useOvertime`, `overtimeSheet.ts` (print), `overtimeExport.ts` (Excel).
- `src/components/dashboard/OvertimeLine.tsx` under Supplies; `src/components/settings/OvertimeSection.tsx`, admin only; the user-menu link and route; the guide section and a What's new entry dated 16 Nov 2026.
- Settings holds the rate, the policy paragraph in both languages and the shared reasons. There is no cap setting, since weekends and days off cannot be logged.
- Saving checks the day once more against the database (its days off and its other entries), so two tabs cannot sneak in an overlap.
