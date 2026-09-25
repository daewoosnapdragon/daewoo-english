-- ============================================================================
-- MIGRATION: Mixed assessments (points routed to domains by standard)
-- Run this in the Supabase SQL Editor. Safe to run twice.
-- ============================================================================
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS mixed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS domain_split JSONB;   -- {reading: 3, phonics: 1, …} possible points
ALTER TABLE grades ADD COLUMN IF NOT EXISTS domain_scores JSONB;       -- {reading: 3, phonics: 0, …} earned points
