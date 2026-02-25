-- Migration: Add assessment sections support
-- Adds sections JSONB to assessments, section_scores JSONB to grades
-- Run in Supabase SQL Editor

-- Add sections column to assessments
-- Format: [{ "label": "Q1-3", "standard": "RL.2.1", "max_points": 3 }, ...]
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT NULL;

-- Add section_scores column to grades
-- Format: { "0": 2.5, "1": 3, "2": 4 } where keys are section indices
ALTER TABLE grades ADD COLUMN IF NOT EXISTS section_scores JSONB DEFAULT NULL;
