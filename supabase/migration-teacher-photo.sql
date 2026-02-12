-- Add photo_url column to teachers table for report card avatars
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;
