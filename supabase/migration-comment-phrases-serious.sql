-- Serious concern: a fourth behavior tier for behavior that is genuinely bad.
-- Run once after migration-comment-phrases.sql and the seed. Widens the tier check
-- and adds the 25 sentences; safe to re-run.

ALTER TABLE comment_phrases DROP CONSTRAINT IF EXISTS comment_phrases_tier_check;
ALTER TABLE comment_phrases ADD CONSTRAINT comment_phrases_tier_check CHECK (tier IN ('strong', 'on track', 'needs support', 'change over time', 'serious concern'));

INSERT INTO comment_phrases (seed_key, kind, area, tier, category, grades, doc, text, sort_order) VALUES
  ($q$behavior-048$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Focus$q$, $q$all$q$, $q$both$q$, $q${name} talks while the teacher is explaining, most lessons, and misses the instructions as a result.$q$, 48),
  ($q$behavior-049$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Focus$q$, $q$all$q$, $q$both$q$, $q${name} is off task for much of each lesson, and {his} work is often unfinished because of it.$q$, 49),
  ($q$behavior-050$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Focus$q$, $q$all$q$, $q$both$q$, $q${name} distracts the students near {him} most days. We have moved {his} seat more than once, and this needs to change next semester.$q$, 50),
  ($q$behavior-051$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Participation$q$, $q$all$q$, $q$both$q$, $q${name} refuses to take part in speaking activities and does not answer when called on. This is now affecting {his} speaking grade.$q$, 51),
  ($q$behavior-052$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Participation$q$, $q$all$q$, $q$both$q$, $q${name} calls out and interrupts in most lessons, even after several reminders in the same lesson.$q$, 52),
  ($q$behavior-053$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Participation$q$, $q$all$q$, $q$both$q$, $q${name} speaks Korean through most of English class, even after reminders, and {his} English is not improving as a result.$q$, 53),
  ($q$behavior-054$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Homework and materials$q$, $q$all$q$, $q$both$q$, $q$Homework has not come in for ____ weeks. Each missing week lowers {his} grade, and it needs to be back on track from the first week of next semester.$q$, 54),
  ($q$behavior-055$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Homework and materials$q$, $q$all$q$, $q$both$q$, $q${name} arrives without {his} book or notebook most days and cannot do the work without borrowing.$q$, 55),
  ($q$behavior-056$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Homework and materials$q$, $q$all$q$, $q$both$q$, $q${name} has lost or damaged class materials several times this semester.$q$, 56),
  ($q$behavior-057$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Kindness and cooperation$q$, $q$all$q$, $q$both$q$, $q${name} has been unkind to classmates on several occasions this semester, and we have spoken with {him} each time.$q$, 57),
  ($q$behavior-058$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Kindness and cooperation$q$, $q$all$q$, $q$both$q$, $q${name} has hurt classmates' feelings more than once with what {he} says. This has to stop.$q$, 58),
  ($q$behavior-059$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Kindness and cooperation$q$, $q$all$q$, $q$both$q$, $q${name} refuses to work with partners {he} did not choose, and the group's work falls to the others.$q$, 59),
  ($q$behavior-060$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Kindness and cooperation$q$, $q$all$q$, $q$both$q$, $q${name} has had repeated conflicts with the same classmates this semester. We have talked each one through, and we are asking for your support at home.$q$, 60),
  ($q$behavior-061$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Following instructions$q$, $q$all$q$, $q$both$q$, $q${name} often ignores instructions from the teacher and does something else instead.$q$, 61),
  ($q$behavior-062$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Following instructions$q$, $q$all$q$, $q$both$q$, $q${name} argues with the teacher when corrected, in front of the class.$q$, 62),
  ($q$behavior-063$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Following instructions$q$, $q$all$q$, $q$both$q$, $q${name} leaves {his} seat, and sometimes the classroom, without permission.$q$, 63),
  ($q$behavior-064$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Independence$q$, $q$all$q$, $q$both$q$, $q${name} does not start work unless a teacher stands beside {him}, and finishes very little on {his} own.$q$, 64),
  ($q$behavior-065$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Effort$q$, $q$all$q$, $q$both$q$, $q${name} is handing in work far below what {he} can do, and {his} grades have dropped because of it.$q$, 65),
  ($q$behavior-066$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Effort$q$, $q$all$q$, $q$both$q$, $q${name} has given up on tasks in most lessons this month and says {he} cannot do them before trying.$q$, 66),
  ($q$behavior-067$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Effort$q$, $q$all$q$, $q$both$q$, $q${name} rushes every task to be finished first, and most of {his} work has to be redone.$q$, 67),
  ($q$behavior-068$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Routines$q$, $q$all$q$, $q$both$q$, $q${name} is often late back from breaks and misses the start of the lesson.$q$, 68),
  ($q$behavior-069$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$Attendance$q$, $q$all$q$, $q$both$q$, $q${name} has missed ____ days this semester and is now behind in every area. Regular attendance is the first thing that needs to change.$q$, 69),
  ($q$behavior-070$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$What happens next$q$, $q$all$q$, $q$both$q$, $q$We are asking for your support at home: please talk with {name} about this before next semester starts.$q$, 70),
  ($q$behavior-071$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$What happens next$q$, $q$all$q$, $q$both$q$, $q$We will be in touch during the break about how we can work on this together.$q$, 71),
  ($q$behavior-072$q$, $q$sentence$q$, $q$behavior$q$, $q$serious concern$q$, $q$What happens next$q$, $q$all$q$, $q$both$q$, $q$If this continues next semester, we will ask to meet with you.$q$, 72)
ON CONFLICT (seed_key) DO NOTHING;

SELECT tier, count(*) FROM comment_phrases WHERE area = 'behavior' GROUP BY tier ORDER BY tier;
