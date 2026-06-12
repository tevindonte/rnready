-- Allow anonymous users to read questions for guest quiz mode (server-side API)
CREATE POLICY "Anon can read questions for guest mode" ON questions
  FOR SELECT TO anon USING (true);
