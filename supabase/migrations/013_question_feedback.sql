-- Question quality feedback (thumbs up/down) + review queue

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_questions_needs_review ON questions (needs_review)
  WHERE needs_review = TRUE;

CREATE TABLE IF NOT EXISTS question_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
  vote TEXT NOT NULL CHECK (vote IN ('up', 'down')),
  reason TEXT CHECK (reason IN (
    'formatting', 'wrong_answer', 'bad_explanation', 'typo_unclear', 'other'
  )),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (question_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_question_feedback_question ON question_feedback (question_id);
CREATE INDEX IF NOT EXISTS idx_question_feedback_user ON question_feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_question_feedback_created ON question_feedback (created_at DESC);

ALTER TABLE question_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own question feedback" ON question_feedback;
CREATE POLICY "Users read own question feedback" ON question_feedback
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own question feedback" ON question_feedback;
CREATE POLICY "Users insert own question feedback" ON question_feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own question feedback" ON question_feedback;
CREATE POLICY "Users update own question feedback" ON question_feedback
  FOR UPDATE USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW question_feedback_summary AS
SELECT
  question_id,
  COUNT(*) FILTER (WHERE vote = 'down') AS down_votes,
  COUNT(*) FILTER (WHERE vote = 'up') AS up_votes,
  array_agg(DISTINCT reason) FILTER (WHERE reason IS NOT NULL) AS reasons,
  MAX(created_at) AS last_feedback_at
FROM question_feedback
GROUP BY question_id;

-- Full log for review: ties each vote to the exact question text and metadata
CREATE OR REPLACE VIEW question_feedback_log AS
SELECT
  qf.id AS feedback_id,
  qf.created_at,
  qf.updated_at,
  qf.vote,
  qf.reason,
  qf.comment,
  qf.session_id,
  qf.user_id,
  q.id AS question_id,
  q.question,
  q.category,
  q.subcategory,
  q.source_id,
  q.correct_answer,
  q.needs_review
FROM question_feedback qf
JOIN questions q ON q.id = qf.question_id;
