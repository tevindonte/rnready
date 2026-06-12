-- Missed-question review mode, timed rationale option, Plus grace tracking

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS subscription_past_due_at TIMESTAMPTZ;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS timed_show_rationale BOOLEAN DEFAULT FALSE;

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_mode_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_mode_check
    CHECK (mode IN (
      'timed', 'review', 'section', 'adaptive', 'custom',
      'mock_exam', 'missed_review'
    ));
