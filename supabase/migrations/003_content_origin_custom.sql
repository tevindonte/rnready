-- Universal ingestion: content origin, custom study guides, custom session mode

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS content_origin TEXT DEFAULT 'extracted'
    CHECK (content_origin IN ('extracted', 'generated')),
  ADD COLUMN IF NOT EXISTS source_fact TEXT,
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_owner_id UUID REFERENCES profiles(id);

ALTER TABLE sessions
  DROP CONSTRAINT IF EXISTS sessions_mode_check;

ALTER TABLE sessions
  ADD CONSTRAINT sessions_mode_check
    CHECK (mode IN ('timed', 'review', 'section', 'adaptive', 'custom'));

-- Replace blanket read policy with shared + own custom
DROP POLICY IF EXISTS "Authenticated users can read questions" ON questions;

CREATE POLICY "Users read shared and own custom questions" ON questions
  FOR SELECT TO authenticated
  USING (is_custom = FALSE OR custom_owner_id = auth.uid());

CREATE POLICY "Users insert own custom questions" ON questions
  FOR INSERT TO authenticated
  WITH CHECK (is_custom = TRUE AND custom_owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_questions_custom ON questions (is_custom, custom_owner_id);
CREATE INDEX IF NOT EXISTS idx_questions_content_origin ON questions (content_origin);

-- Guest mode: shared bank only, not private custom questions
DROP POLICY IF EXISTS "Anon can read questions for guest mode" ON questions;

CREATE POLICY "Anon can read shared questions for guest mode" ON questions
  FOR SELECT TO anon USING (is_custom = FALSE);
