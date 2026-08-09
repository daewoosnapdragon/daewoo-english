-- ============================================================================
-- Migration: Drop tables orphaned by the 2026-08 feature cull
-- ============================================================================
-- Removes the backing tables for features deleted from the app:
--   Groups, Teacher Resources, Program Overview,
--   Item Analysis, Quick Check, Teacher Plans, Yearly Plan
--
-- The Standards tab (and everything WIDA) was KEPT, so its tables are not
-- dropped -- see the list at the bottom.
--
-- Every table below was verified to have ZERO remaining references in src/.
--
-- !! DESTRUCTIVE AND IRREVERSIBLE !!
-- Take a backup first (Dashboard -> Database -> Backups) and deploy the culled
-- app code BEFORE running this -- the live app still reads these tables until
-- the new build ships.
--
-- Known row counts at time of writing (2026-08-09):
--   teacher_daily_plans    181 rows   <- teacher-authored lesson plans
--   yearly_plan_cells       58 rows   <- yearly curriculum planning
--   yearly_plan_tracks      53 rows
--   yearly_plan_periods      8 rows
--   student_exclusions       0 rows
--   sub_plans                0 rows
--   assessment_blueprints    0 rows
-- ============================================================================

BEGIN;

-- Yearly Plan (cells reference periods and tracks, so drop children first)
DROP TABLE IF EXISTS yearly_plan_cells;
DROP TABLE IF EXISTS yearly_plan_periods;
DROP TABLE IF EXISTS yearly_plan_tracks;

-- Groups view
DROP TABLE IF EXISTS student_exclusions;

-- Teacher Resources
DROP TABLE IF EXISTS sub_plans;

-- Item Analysis (Grade Entry sub-view)
DROP TABLE IF EXISTS assessment_blueprints;

-- Teacher Plans (and its orphaned "Today's Plan" dashboard widget)
DROP TABLE IF EXISTS teacher_daily_plans;

COMMIT;


-- ============================================================================
-- DELIBERATELY **NOT** DROPPED
-- ============================================================================
-- Kept because the Standards tab was restored and still reads them:
--
--   class_standard_status   -> Standards coverage tracking
--   student_wida_history    -> WIDA level history (968 rows)
--   wida_snapshots          -> Saved WIDA profile snapshots
--   quick_checks            -> read by the Standards view
--
-- Kept because surviving features read them:
--
--   student_groups       -> Students > student detail > Groups tab
--   student_wida_levels  -> WIDA badges, leveling, hover cards, scaffolds
--                           (written by Students > WIDA Profiles)
--   wida_profiles        -> Semester Checklist
--   student_scaffolds    -> Lesson scaffold banner, reports, student detail
--
-- Columns also kept (Score-by-Question in Grade Entry still uses them):
--   assessments.question_map
--   grades.item_responses
-- ============================================================================
