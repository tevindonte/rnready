-- Quiz progress persistence + study guides

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS current_index INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'abandoned'));

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS subcategory_filter TEXT[];

CREATE TABLE IF NOT EXISTS study_guides (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id        UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  source_type     TEXT CHECK (source_type IN ('text', 'pdf', 'pptx', 'docx', 'txt', 'youtube', 'web')),
  question_count  INT,
  is_public       BOOLEAN DEFAULT FALSE,
  share_code      TEXT UNIQUE,
  take_count      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS study_guide_id UUID REFERENCES study_guides(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_guides_owner ON study_guides (owner_id);
CREATE INDEX IF NOT EXISTS idx_questions_study_guide ON questions (study_guide_id);

ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own study guides" ON study_guides
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Anyone can read public study guides" ON study_guides
  FOR SELECT USING (is_public = TRUE);
