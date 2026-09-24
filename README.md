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
- **Teachers only.** Sign-in is Google only, limited to enabled teacher accounts. Students never sign in.

## Architecture

| Part | Role |
|---|---|
| `apps/web` | Next.js 16 and React 19 web app (Tailwind, Motion), in a Google Workspace style UI |
| `backend` | FastAPI (Python 3.12): API, PDF and PPTX reading, Gemini calls, grading |
| Supabase | Google sign-in, Postgres (row level security on), private file storage |
| ChromaDB | Local vector database for slide search, embeddings from `gemini-embedding-2` |

## Team

| Member | Enrolment no. | Work |
|---|---|---|
| **Yug Jindal** | 23103328 | System architecture and backend. RAG pipeline: slide extraction, chunking, `gemini-embedding-2` embeddings, ChromaDB vector search. Dual-model grading engine, with disagreement flags and mark merging. Gemini integration: structured output, streaming, rate limits, key rotation. |
| Anish Das | 23103322 | Web app screens and UI: dashboard, course pages, chat interface, exam table |
| Yashita Gogia | 23103305 | Prompt design for the generators, test material and answer sheets, end-to-end testing |
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

The project presentation and the original build plan are in [`docs/`](docs).
