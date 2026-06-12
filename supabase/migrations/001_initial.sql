-- RNReady initial schema

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT,
  exam_date     DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question        TEXT NOT NULL,
  question_hash   TEXT GENERATED ALWAYS AS (md5(question)) STORED,
  options         JSONB NOT NULL,
  correct_answer  TEXT NOT NULL,
  category        TEXT NOT NULL,
  subcategory     TEXT,
  difficulty      TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_ngn          BOOLEAN DEFAULT FALSE,
  ngn_type        TEXT,
  explanation     TEXT,
  explanation_generated_at TIMESTAMPTZ,
  source_id       TEXT,
  source_verbatim TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_question_hash UNIQUE (question_hash)
);

CREATE INDEX idx_questions_category ON questions (category, subcategory);
CREATE INDEX idx_questions_ngn ON questions (is_ngn);

CREATE TABLE sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mode             TEXT NOT NULL CHECK (mode IN ('timed', 'review', 'section', 'adaptive')),
  category_filter  TEXT,
  total_questions  INT,
  correct          INT DEFAULT 0,
  duration_secs    INT DEFAULT 0,
  started_at       TIMESTAMPTZ DEFAULT NOW(),
  ended_at         TIMESTAMPTZ
);

CREATE TABLE session_questions (
  session_id    UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index   INT NOT NULL,
  PRIMARY KEY (session_id, question_id)
);

CREATE INDEX idx_session_questions_session ON session_questions (session_id, order_index);

CREATE TABLE session_answers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  question_id   UUID REFERENCES questions(id) ON DELETE CASCADE,
  answer_given  TEXT,
  is_correct    BOOLEAN,
  time_secs     INT,
  confidence    SMALLINT CHECK (confidence BETWEEN 1 AND 5),
  answered_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

CREATE INDEX idx_answers_user ON session_answers (user_id, question_id);

CREATE TABLE session_tools (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID REFERENCES sessions(id) ON DELETE CASCADE,
  question_id     UUID REFERENCES questions(id) ON DELETE CASCADE,
  scratch_pad     TEXT,
  strikethrough   TEXT[],
  highlighted     JSONB,
  calculator_used BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, question_id)
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Authenticated users can read questions" ON questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own session questions" ON session_questions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Users manage own answers" ON session_answers
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own tools" ON session_tools
  FOR ALL USING (
    EXISTS (SELECT 1 FROM sessions s WHERE s.id = session_id AND s.user_id = auth.uid())
  );

-- Service role bypasses RLS by default
