-- Tag custom study guide questions with generation style

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_style TEXT
  CHECK (question_style IS NULL OR question_style IN ('nclex_scenario', 'direct_recall'));

CREATE INDEX IF NOT EXISTS idx_questions_style ON questions (question_style)
  WHERE question_style IS NOT NULL;
