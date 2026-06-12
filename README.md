# RNReady

AI-assisted NCLEX-RN preparation for nursing students. Practice questions, readiness analytics, adaptive drills, mock exams, and custom study guides from your own notes.

## Features

- **Guest trial** — 10 free questions (enforced client + server-side)
- **Quiz modes** — Review, timed (optional per-question rationale), section, adaptive, missed review, custom study guides, NCLEX mock exam (85Q)
- **RNReady Plus** — AI tutor, TTS audio, expanded study guides (Stripe)
- **Question feedback** — Thumbs up/down with quarantine for flagged items
- **Analytics** — Mastery map, score trends, category breakdown, mock vs practice readiness, avg time per category
- **Admin** — Question review UI at `/admin/questions` (set `ADMIN_EMAILS` in env)
- **Exam tools** — Scratch pad, calculator, lab values (touch-optimized on iPad)

## Stack

- Next.js 14 (App Router)
- Supabase (auth, Postgres, RLS)
- OpenAI (explanations, tutor, study-guide generation, TTS)
- Stripe (Plus subscriptions)
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
STRIPE_SECRET_KEY=
STRIPE_PRICE_ID=
STRIPE_WEBHOOK_SECRET=
ADMIN_EMAILS=you@example.com
```

Optional: `SENTRY_DSN` for error monitoring (install `@sentry/nextjs` and add Sentry Next.js config).

### 3. Database migrations

Run all SQL files in `supabase/migrations/` in order (**001 → 015**) in the Supabase SQL editor or via CLI.

Key recent migrations:

| Migration | Purpose |
|-----------|---------|
| 011 | Plus / Stripe fields |
| 012 | Question TTS audio URLs |
| 013 | Question feedback & quarantine |
| 014 | Mock exam mode |
| 015 | Missed review mode, timed rationale flag, past_due grace timestamp |

### 4. Ingest questions

```bash
cd pipeline
pip install -r requirements.txt
cp .env.example .env   # add Supabase + OpenAI keys
python ingest.py
```

QA critic (optional — syncs `needs_review` to Supabase with `--sync-review`):

```bash
python qa_critic.py --llm --sync-review
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

## Vercel deployment

**Do not set `NODE_ENV` in Vercel Environment Variables.** Vercel sets it automatically during build.

Required env vars: see `.env.example` (`NEXT_PUBLIC_APP_URL`, `ZEPTOMAIL_*`, `CRON_SECRET`, Stripe keys, etc.).

Ensure migrations **011–015** are applied in production Supabase before deploying Plus, feedback, mock exam, and missed-review features.

## SEO & performance

- Set `NEXT_PUBLIC_APP_URL` to your production domain for canonical URLs, Open Graph, and `sitemap.xml`.
- `/sitemap.xml` and `/robots.txt` are generated automatically; dashboard/API routes are noindexed.
- Landing page includes FAQ JSON-LD, hourly ISR, and optimized font/image delivery.
- Submit your sitemap in Google Search Console after deploy.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm test` | Vitest unit tests |
| `npm run lint` | ESLint |

## Not yet implemented (long-term)

- Full NGN item types beyond SATA (bow-tie, matrix, drag-drop)
- Re-explain rationales (deprecated in code)
- Custom mode card on main config grid (available via study guides)
