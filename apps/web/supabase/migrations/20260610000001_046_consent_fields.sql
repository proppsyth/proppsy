-- Add PDPA consent timestamp fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_privacy_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS accepted_data_controller_confirmation_at TIMESTAMPTZ;
