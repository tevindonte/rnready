-- Cached TTS for question stems (Premium)

ALTER TABLE questions
  ADD COLUMN IF NOT EXISTS question_audio_url TEXT;
