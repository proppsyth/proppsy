-- Track registration provider (email, google, etc.)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'email';

-- Unique national_id per agent profile (only enforced when set)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_national_id_unique
  ON public.profiles (national_id)
  WHERE national_id IS NOT NULL AND national_id <> '';
