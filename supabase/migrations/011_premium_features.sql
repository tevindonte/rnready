-- Premium features: cached TTS URLs + AI tutor conversations

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS explanation_audio_url TEXT;

CREATE TABLE IF NOT EXISTS tutor_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_answer_id UUID NOT NULL REFERENCES session_answers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_answer_id)
);

CREATE INDEX IF NOT EXISTS idx_tutor_conversations_user ON tutor_conversations (user_id);

ALTER TABLE tutor_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own tutor conversations" ON tutor_conversations;
CREATE POLICY "Users manage own tutor conversations" ON tutor_conversations
  FOR ALL USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name, public)
VALUES ('explanation-audio', 'explanation-audio', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read explanation audio" ON storage.objects;
CREATE POLICY "Public read explanation audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'explanation-audio');

DROP POLICY IF EXISTS "Service role uploads explanation audio" ON storage.objects;
CREATE POLICY "Service role uploads explanation audio"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'explanation-audio');
