# RNReady

AI-assisted NCLEX-RN preparation for nursing students. Practice questions, readiness analytics, adaptive drills, and custom study guides from your own notes.

## Features

- **Guest trial** — 10 free questions (enforced client + server-side)
- **Quiz modes** — Review, timed, section, adaptive
- **Study guides** — Generate custom quizzes from pasted notes (signed-in)
- **Analytics** — Mastery map, score trends, category breakdown
- **Exam tools** — Scratch pad, calculator, lab values (touch-optimized on iPad)

## Stack

- Next.js 14 (App Router)
- Supabase (auth, Postgres, RLS)
- OpenAI (explanations + study-guide generation)
- Tailwind CSS + Radix UI

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
OPENAI_API_KEY=
```

### 3. Database migrations

Run all SQL files in `supabase/migrations/` in order (001 → 007) in the Supabase SQL editor or via CLI.

### 4. Ingest questions

```bash
cd pipeline
pip install -r requirements.txt
cp .env.example .env   # add Supabase + OpenAI keys
# Add sources to sources.json, then:
python ingest.py
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase auth URLs

In Supabase Dashboard → Authentication → URL Configuration, set:

- **Site URL:** `http://localhost:3000` (or your production domain)
- **Redirect URLs:** `http://localhost:3000/auth/callback`

Email confirmation and password reset links use `/auth/callback`.

## Vercel deployment

**Do not set `NODE_ENV` in Vercel Environment Variables.** Vercel sets it automatically during build; if you add it manually, `npm install` skips devDependencies and the build fails (missing TypeScript/ESLint).

Required env vars: see `.env.example` (`NEXT_PUBLIC_APP_URL`, `ZEPTOMAIL_*`, `CRON_SECRET`, etc.).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Production server |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |

## Project structure

```
app/              Next.js routes (landing, dashboard, quiz, API)
components/       UI components
lib/              Shared logic (adaptive, guest, supabase)
pipeline/         Question ingestion from PDF/YouTube/web
supabase/         SQL migrations
```

## License

Private — all rights reserved.
