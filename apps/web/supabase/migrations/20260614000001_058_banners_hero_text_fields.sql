-- Migration 058: Add hero text fields to banners table
-- Allows admin to set title overlay, subtitle, tag badge, text alignment,
-- gradient background, and whether to show the search card per slide.

ALTER TABLE banners
  ADD COLUMN IF NOT EXISTS subtitle   text,
  ADD COLUMN IF NOT EXISTS tag        text,
  ADD COLUMN IF NOT EXISTS text_align text DEFAULT 'center',
  ADD COLUMN IF NOT EXISTS gradient   text,
  ADD COLUMN IF NOT EXISTS show_search boolean DEFAULT true;
