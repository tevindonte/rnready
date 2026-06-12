-- Paid tier entitlements + email re-engagement fields (Stripe-ready, no Stripe yet)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free'
    CHECK (subscription_status IN ('free', 'active', 'cancelled', 'past_due')),
  ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_reminder_sent TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles (subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_last_session ON profiles (last_session_at);
CREATE INDEX IF NOT EXISTS idx_profiles_reminder ON profiles (last_reminder_sent)
  WHERE email_opt_out = FALSE;
