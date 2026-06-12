-- Server-side guest freemium tracking (httpOnly cookie guest id)

CREATE TABLE guest_usage (
  id                   UUID PRIMARY KEY,
  questions_answered   INT NOT NULL DEFAULT 0 CHECK (questions_answered >= 0),
  exhausted            BOOLEAN NOT NULL DEFAULT FALSE,
  answered_question_ids TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE guest_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_guest_usage_exhausted ON guest_usage (exhausted);
