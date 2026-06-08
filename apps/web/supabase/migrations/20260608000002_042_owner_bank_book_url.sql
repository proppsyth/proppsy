-- Add bank_book_url column to owners table for storing scanned/uploaded bank book images
ALTER TABLE owners ADD COLUMN IF NOT EXISTS bank_book_url TEXT;
