-- NCLEX mock exam session mode

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_mode_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_mode_check
    CHECK (mode IN ('timed', 'review', 'section', 'adaptive', 'custom', 'mock_exam'));
