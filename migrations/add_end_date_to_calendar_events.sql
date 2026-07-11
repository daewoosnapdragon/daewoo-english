-- Migration: Multi-day calendar events
-- Date: 2026-07-11
-- Purpose: Lets a single calendar event span a date range (e.g. vacation
--          7/12–7/15) instead of creating one row per day. `end_date` is the
--          inclusive last day; NULL means a single-day event on `date`.
--          The dashboard calendar renders the event on every day in
--          [date, end_date].

ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_date DATE;
