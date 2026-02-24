-- Add parent calendar fields to calendar_events
-- Run this in Supabase SQL Editor

-- Add show_on_parent_calendar checkbox (defaults to false)
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS show_on_parent_calendar boolean DEFAULT false;

-- Add target_grades array for grade-specific filtering
-- NULL or empty = all grades; [2,3] = only grades 2 and 3
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS target_grades integer[] DEFAULT NULL;

-- Update existing events: any event already marked show_on_lesson_plan
-- should probably also show on parent calendar (optional, remove if unwanted)
-- UPDATE calendar_events SET show_on_parent_calendar = true WHERE show_on_lesson_plan = true;
