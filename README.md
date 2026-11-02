# Deskwork

**An AI workspace for teachers to set papers and check answer sheets from their own course material.**

B.Tech Major Project, Jaypee Institute of Information Technology, Noida.

## What it does

- **Course material, uploaded once.** A teacher uploads a course's lecture slides (PDF or PPTX). Deskwork indexes them for search.
- **Generators grounded in the slides.** Separate chatbots write assignments, step-by-step solutions, and question papers with answer keys. Each also offers an "ask your slides" mode. Every answer lists the slide pages it used, and results export to Word.
- **Exam checking.**
  1. Upload the question paper and the answer key, typed or handwritten.
  2. Upload each student's scanned answer sheet.
  3. Two AI checkers (Gemini 3.5 Flash-Lite and 3.1 Flash-Lite) mark every question from the page images.
  4. Deskwork highlights answers where the two checkers disagree or are unsure.
  5. The teacher can change any mark, and results export to Excel.
- **Question-wise checking.** Check one question across selected students, keep previously marked answers, and review original scans next to the marking scheme.
- **Class analytics.** Filter by course and exam; view score distributions, question averages and topics to revisit. Synthetic sample records are clearly labelled and can be excluded.
- **Lesson planner.** Generate lecture sequences from slides with time budgets, examples, practice questions, editing and Word export.
- **Question bank.** Generated assessment questions are automatically collected with topic/type/difficulty filters, deduplication, editing and reuse in exams.
- **Teachers only.** Sign-in is Google only, limited to enabled teacher accounts. Students never sign in.

## Architecture

| Part | Role |
|---|---|
| `apps/web` | Next.js 16 and React 19 web app (Tailwind, Motion), in a Google Workspace style UI |
| `backend` | FastAPI (Python 3.12): API, PDF and PPTX reading, Gemini calls, grading |
| Supabase | Google sign-in, Postgres (row level security on), private file storage |
| Pinecone | Cloud vector search, scoped by course and embedding model. ChromaDB remains optional for local use. |

## Team

| Member | Enrolment no. | Work |
|---|---|---|
| **Yug Jindal** | 23103328 | System architecture and backend. RAG pipeline: slide extraction, chunking, `gemini-embedding-2` embeddings, ChromaDB vector search. Dual-model grading engine, with disagreement flags and mark merging. Gemini integration: structured output, streaming, rate limits, key rotation. |
| Anish Das | 23103322 | Web app screens and UI: dashboard, course pages, chat interface, exam table |
| Yashita Gogia | 23103305 | Prompt design for the generators, test material and answer sheets |
| Anjaneya Sharma | 23103301 | Supabase setup (Google sign-in, database schema, storage), Excel and Word export, documentation and presentation |

## Run it locally

You need Node 20+, [uv](https://docs.astral.sh/uv/) and two env files, `backend/.env` and `apps/web/.env.local`. Copy them from the `.env.example` files next to them.

```bash
npm install
npm run setup
npm run dev
```

Open http://localhost:3000 and choose **Continue with Google**. To enable a teacher, add their email to `ALLOWED_TEACHER_EMAILS` in `backend/.env`.

## Tests

| Command | Checks |
|---|---|
| `npm test` | Unit tests: marks, flags, slide chunking, Word export |
| `npm run test:e2e` | Every flow against the running API with real CN & IoT course material |
| `npm run test:ui` | The same journey in Chrome, with screenshots |
| `npm run reset` | Clears all app data (sign-in accounts are kept) |

## Final evaluation setup

- Apply `supabase/migrations/0002_final_evaluation.sql` after the initial schema (only with permission for the target database).
- Set `VECTOR_PROVIDER=pinecone`, `PINECONE_API_KEY` and `PINECONE_HOST` for cloud search. The index uses 768 dimensions and cosine similarity.
- `npm run seed:samples` adds labelled synthetic classes to the main teacher account without replacing existing work.
- `npm run test:final` exercises the final features against the running local API. It creates clearly named test plans and exams and uses Gemini quota.
- `npm run migrate:vectors` copies existing Chroma embeddings to Pinecone without new AI calls.
- Deploy `apps/web` on Vercel and `backend/Dockerfile` on Render. Set `FRONTEND_ORIGIN` to a comma-separated list of allowed web origins and `NEXT_PUBLIC_API_URL` to the Render URL. Add the Vercel auth callback to Supabase redirect URLs.
- Run one backend worker per service. Free Render instances can sleep; long jobs interrupted by a restart are shown as failed and can be retried. This release is not a durable multi-worker job system.
- Local unit/database tests: set `TEST_DATABASE_URL` to a disposable local PostgreSQL. The database tests reject remote hosts.

The live frontend is https://deskwork-jiit.vercel.app and the API is https://deskwork-api.onrender.com. Render deploys pushes to `main`. For frontend releases, run `npx vercel@latest deploy --prod` from the repository root (Vercel Git integration is not connected).
