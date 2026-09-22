# Deskwork: Build Status

## Project Understanding

Deskwork is an AI workspace designed exclusively for teachers. Students never log in; assignments, question papers, and marked scripts are distributed through existing institutional channels (such as Google Classroom or WhatsApp).

The three core modules for the prototype are:
1. AI-assisted handwritten exam checking with dual-model evaluation (Gemini 3.5 Flash-Lite and Gemini 3.1 Flash-Lite) directly from page images, forced review UX, and local name masking.
2. Assignment and question paper generation grounded in the teacher's uploaded course slides.
3. A contextual AI assistant available throughout the application with page-level citations.

The teacher always remains the accountable examiner. Future modules appear as tasteful "Coming Soon" placeholders driven by a centralized feature flag registry (`lib/features.ts`).

---

## Current Repository State

- Repository directory: `c:\Users\anish\OneDrive\Desktop\major`
- Tech stack: Next.js 15 (Turbopack, App Router, React 19), TypeScript, Tailwind CSS, Supabase, Python 3.11/3.12 worker.
- Monorepo layout:
  - `apps/web`: Next.js 15 application (built and typechecked cleanly)
  - `worker`: Python background worker with atomic queue claim loop and Gemini AI client
  - `supabase/migrations`: Canonical PostgreSQL migration `0001_init.sql`
  - `eval`: Evaluation harness directory
  - `testdata`: Test datasets (gitignored)

---

## Implemented Modules (Person 1 Ownership + Shared Foundations)

### 1. Project Foundation (Phase 1)
- Initialized Next.js 15 application with App Router, TypeScript, and Tailwind CSS.
- Configured academic visual tokens in `globals.css`:
  - Cool neutral background: `#F7F8FA`
  - Clean white surface: `#FFFFFF`
  - Body text: `#1A2030`
  - Ink-blue accent: `#2A4A9A`
  - Examiner marks red: `#B8352A`
  - Semantic green `#1F7A4D` and amber `#9A6700`
  - Circled marks score badge (`.score-badge`) and monospace IDs.
- Set up Supabase browser client, server client, and session middleware.
- Created canonical TypeScript types in `lib/types.ts` for all database records and contracts.
- Built centralized feature flags in `lib/features.ts` and `components/coming-soon.tsx`.

### 2. Shared Database Foundation (Phase 2)
- Created `supabase/migrations/0001_init.sql` with all 22 relational tables.
- Implemented foreign key constraints, cascade rules, check constraints, GIN full-text search index on material pages, and compound index on `jobs(status, run_after)`.
- Applied Row Level Security (RLS) policies protecting each teacher's course-scoped records.
- Seeded default JIIT examination scheme (T1: 20, T2: 20, End Sem: 35, TA: 25).

### 3. Shared Job Queue & Worker Foundation (Phase 3, 9, 12)
- Implemented PostgreSQL `jobs` queue loop in `worker/deskwork_worker/main.py` using `FOR UPDATE SKIP LOCKED`.
- Built shared Gemini AI client (`worker/deskwork_worker/ai/client.py`) supporting `gemini-3.5-flash-lite` and `gemini-3.1-flash-lite` with structured JSON schema outputs, thinking level control, retry with exponential backoff, and caching.
- Created canonical Pydantic models in `worker/deskwork_worker/ai/schemas.py`.
- Created versioned prompt files in `worker/deskwork_worker/ai/prompts/`.
- Implemented C1 `extract_paper` and C2 `build_rubric` job handlers.
- Created clean stubs for future jobs belonging to Persons 2, 3, and 4.

### 4. Application Shell & UI Tokens (Phase 4)
- Built responsive sidebar (`AppSidebar`) with Deskwork branding, navigation, and coming-soon tools.
- Built application header (`AppHeader`) with dynamic breadcrumbs, quick find (Ctrl+K), and assistant trigger (Ctrl+J).
- Built contextual assistant side panel (`AssistantPanel`) with suggestion chips, grounded responses, and slide citations.
- Built root application layout (`app/(app)/layout.tsx`) wrapping all authenticated routes.

### 5. Teacher Authentication (Phase 5)
- Implemented `/login` with institutional email credentials, evaluator instant demo sign-in, and prominent student privacy notice.

### 6. Course Management (Phase 6)
- Built `/dashboard` with quick action workflow cards, active exams progress, course cards, and new course modal.
- Built `/courses/[courseId]` with tabbed navigation: Exams, Materials (with slide extraction status), Students (with pseudonymous IDs and local masking indicators), and Question Bank (Coming soon).

### 7. Exam Setup Wizard & Question Extraction (Phase 7 to 10)
- Built 5-step wizard at `/courses/[courseId]/exams/new`: Paper -> Questions -> Key & Rubric -> Mask Box -> Scripts.
- Created `QuestionEditor` component supporting half marks (0.5 steps), question reordering, label updates, answer type classification, Bloom levels, real-time mark balance validation banner, and reference-only printed Course Outcome tags.

### 8. Answer Key & Rubric Management (Phase 11 to 13)
- Built split-view Rubric Editor workspace at `/exams/[examId]/rubric`:
  - Left pane: Answer key document view and verbatim AI key transcript.
  - Right pane: Structured criteria editor with 0.5-step marks, accepted alternatives, common student errors, numerical formulas, tolerances, and units.
  - Rubric approval mechanism: Freezes approved version (`status = 'approved'`), marks exam as `rubric_ready`, and locks against accidental mutation.

### 9. Exam Overview Hub (Phase 14)
- Built central exam dashboard at `/exams/[examId]` with 7-step lifecycle checklist, metrics, and navigation links.

### 10. Future Module Integration Points (Phase 15)
- Created functional shell pages and shared contracts:
  - `/exams/[examId]/scripts`: Script ingestion, blur checks, and local name masking (Person 2).
  - `/exams/[examId]/review`: Forced attention review queue with scan viewer and dual-model comparison (Person 3).
  - `/exams/[examId]/results`: Audited marks table and multi-sheet Excel export (Person 3).
  - `/courses/[courseId]/generate`: Slide-grounded question paper generator (Person 4).
  - `/soon/[feature]`: Informative explanation page for roadmap tools.
  - `/api/assistant/route.ts`: Server-side streaming chat route protecting Gemini secrets.

---

## Verification Summary

| Check | Tool / Command | Result |
|---|---|---|
| TypeScript Type Checking | `npx tsc --noEmit` | Passed (0 errors) |
| Next.js Production Build | `npm run build` | Passed (14 routes compiled) |
| Python Syntax Verification | `python -m py_compile` | Passed (all worker files valid) |
| Python Worker Unit Tests | `python -m unittest worker/tests/test_schemas_and_jobs.py` | Passed (4 tests in 0.004s) |
| Style and Constraint Audit | Manual inspection | Passed (No em dashes anywhere) |

---

## Immediate Next Step

Person 1's complete module and the shared foundations for the entire project are fully implemented, verified, and operational. Ready for demonstration and subsequent handoff to Person 2 (Grading Engine) or Person 3 (Review Queue).
