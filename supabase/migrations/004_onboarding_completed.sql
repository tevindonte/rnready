-- Persist onboarding completion on profile (replaces localStorage)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;
