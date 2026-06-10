-- Recover Google OAuth users stuck in 'pending' after completing consent.
-- Root cause: saveConsent() set consent timestamps but never set account_status='approved',
-- causing an infinite redirect loop between /dashboard and /login.
-- Safe guard: accepted_terms_at IS NOT NULL means they completed onboarding.

UPDATE public.profiles
SET account_status = 'approved'
WHERE account_status = 'pending'
  AND accepted_terms_at IS NOT NULL
  AND (
    -- Users whose auth_provider was set to 'google' by the callback sync (migration 053+)
    auth_provider = 'google'
    -- Users who authenticated via Google before auth_provider column existed
    OR EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = profiles.id
        AND u.raw_app_meta_data->>'provider' = 'google'
    )
  );
