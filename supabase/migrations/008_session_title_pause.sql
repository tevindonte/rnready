-- Session titles + paused status for save-for-later

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_status_check;
ALTER TABLE sessions
  ADD CONSTRAINT sessions_status_check
  CHECK (status IN ('in_progress', 'paused', 'completed', 'abandoned'));
