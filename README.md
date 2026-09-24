# Deskwork

**Set the paper, check the papers, clear the desk.**

Deskwork is an AI workspace for teachers. A teacher creates a course and uploads its lecture slides once, then:

- **Generates** assignments, step-by-step solutions and question papers (with answer keys) from those slides, each in its own focused chatbot, with the slides used shown under every answer.
- **Checks exams**: upload the question paper and the answer key (typed or handwritten), then each student's scanned paper. Two AI checkers (Gemini 3.5 Flash-Lite and 3.1 Flash-Lite) mark every question from the page images. Where they disagree, or are unsure, the answer is highlighted for the teacher, who can change any mark. Results export to Excel.

Students never sign in. Sign-in is Google only, limited to enabled teacher accounts.

## How it is built

| Part | What it does |
|---|---|
| `apps/web` | Next.js 16 web app (TypeScript, Tailwind, Motion). Google sign-in through Supabase Auth. |
| `backend` | FastAPI (Python 3.12, uv). All data access, file handling (PDF and PPTX), Gemini calls, grading, local ChromaDB for slide search. |
| Supabase | Postgres (row level security on, no browser access), private file storage, Google sign-in. Schema in `supabase/migrations`. |
| ChromaDB | Runs inside the backend, stored in `backend/data/chroma`. Slides are embedded with `gemini-embedding-2`. |

Scanned and handwritten files (question papers, answer keys, student papers, uploaded assignments) are always read page by page as images. Lecture slides are read as text.

## Run it on your laptop

You need Node 20+, [uv](https://docs.astral.sh/uv/) and the two env files.

1. `backend/.env`: copy `backend/.env.example` and fill in the Supabase URL and keys, the Session pooler `DATABASE_URL` (from Supabase, Connect, port 5432), the Gemini API key and `ALLOWED_TEACHER_EMAILS`.
2. `apps/web/.env.local`: copy `apps/web/.env.example` and fill in the Supabase URL and publishable key.
3. Install and start both servers:

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:3000 and choose **Continue with Google**.

First-time Supabase setup (already done for this project): run `supabase/migrations/0001_deskwork.sql`, enable the Google provider with the OAuth client from Google Cloud, set the site URL to `http://localhost:3000` and add `http://localhost:3000/**` to the redirect URLs.

## Tests

| Command | What it checks |
|---|---|
| `npm test` | Fast unit tests for marks, flags, default marks, slide chunking and Word export. |
| `npm run test:e2e` | Every flow against the running API with the real material in `testdata/`: course, slides, all four chatbots, question paper and key reading, two handwritten papers checked, teacher override, Excel, and an assignment checked against generated solutions. |
| `npm run test:ui` | The same journey clicked through in real Chrome, saving screenshots to `.work/screenshots`. |
| `npm run reset` | Deletes all courses, exams, papers, chats, files and the slide index (sign-in accounts are kept). |

The end-to-end tests use Gemini and need the test material in `testdata/` (not committed, it holds student answer sheets).

## Gemini limits

The free tier allows about 1,000 embedding requests per model per day; indexing all CN & IoT slides uses about 115. When `gemini-embedding-2` runs out, Deskwork indexes with `gemini-embedding-001` instead and remembers which model each file used. `GEMINI_API_KEY` also accepts several keys separated by commas; the next key is used once one reaches a daily limit. Limits reset at midnight Pacific time (12:30 PM India time).

## Adding a teacher

Add their Google email to `ALLOWED_TEACHER_EMAILS` in `backend/.env` (comma separated). While the Google OAuth app is in Testing mode, also add them as a test user in Google Cloud.
