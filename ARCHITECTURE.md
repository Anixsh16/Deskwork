# Deskwork: System Architecture

Deskwork is an AI workspace engineered exclusively for academic faculty. It automates repetitive grading, paper drafting, and syllabus inquiries while preserving the teacher as the accountable final examiner.

---

## 1. System Overview

```
TEACHER BROWSER
       |
       |  HTTPS / React 19 / Tailwind / shadcn/ui
       v
NEXT.JS 15 APPLICATION (apps/web)
       |
       +------------------------------------+
       |                                    |
       |  SQL / Auth / Realtime             |  Streaming Route (/api/assistant)
       v                                    v
SUPABASE BACKEND                       GEMINI 3.5 FLASH-LITE
- PostgreSQL with RLS                  (Course Slide Q&A)
- Auth (Email session)
- Storage Buckets
- Realtime Subscriptions
- Jobs Queue (FOR UPDATE SKIP LOCKED)
       |
       |  Polled via psycopg (Service Role)
       v
PYTHON WORKER (worker/deskwork_worker)
- main.py (Atomic job claim loop)
- PyMuPDF, Pillow, OpenCV (Blur score)
- Pydantic structured output validation
       |
       +------------------------------------+
       |                                    |
       v                                    v
GEMINI 3.5 FLASH-LITE                 GEMINI 3.1 FLASH-LITE
- C1: extract_paper                   - C4: grade_booklet (Grader B)
- C2: build_rubric
- C3: grade_booklet (Grader A)
- C5: generate_set
```

---

## 2. Frontend Architecture (apps/web)

- **Framework:** Next.js 15 with App Router, React 19, and TypeScript.
- **Styling:** Vanilla Tailwind CSS with custom academic design tokens:
  - Cool neutral background: `#F7F8FA`
  - Crisp white surface: `#FFFFFF`
  - Dark ink text: `#1A2030`
  - Ink-blue accent: `#2A4A9A`
  - Examiner marks red: `#B8352A`
  - Semantic green: `#1F7A4D`
  - Semantic amber: `#9A6700`
  - Circled marks score badge (`.score-badge`) and monospace IDs.
- **Route Layout:**
  - `/(auth)/login`: Faculty authentication with institutional login and quick demo access.
  - `/(app)/dashboard`: Central hub with quick action cards, active assessments, and course management.
  - `/(app)/courses/[courseId]`: Course workspace with Exams, Materials, Students, and Question Bank tabs.
  - `/(app)/courses/[courseId]/exams/new`: 5-step wizard (Paper, Questions, Key & Rubric, Mask Box, Scripts).
  - `/(app)/exams/[examId]`: Exam lifecycle hub and status overview.
  - `/(app)/exams/[examId]/rubric`: Split-view rubric editor with verbatim key transcript, 0.5-step criteria points, and version freezing.
  - `/(app)/exams/[examId]/scripts`: Script ingestion and blur inspection (Person 2).
  - `/(app)/exams/[examId]/review`: Forced attention review queue with scan viewer and dual-model comparison (Person 3).
  - `/(app)/exams/[examId]/results`: Audited marks table and multi-sheet Excel export (Person 3).
  - `/(app)/courses/[courseId]/generate`: Slide-grounded paper generator (Person 4).
  - `/(app)/soon/[feature]`: Centralized route explaining upcoming roadmap features.
  - `/api/assistant/route.ts`: Server-side route executing grounded assistant chat without leaking API secrets.

---

## 3. Database Architecture (Supabase PostgreSQL)

The canonical database schema (`supabase/migrations/0001_init.sql`) defines 22 relational tables:
1. `profiles`: Mirrors `auth.users` with faculty profile and institution.
2. `exam_schemes`: Pre-configured assessment schemes (JIIT preset: T1 20, T2 20, End Sem 35, TA 25).
3. `courses`: Academic courses linked to faculty owners.
4. `materials`: Uploaded course slide decks and syllabi.
5. `material_pages`: Page-level extracted text with generated `tsv tsvector` and GIN index for search.
6. `students`: Pseudonymous IDs (`S001`, `S002`) visible to AI; private names and roll numbers kept in DB.
7. `exams`: Course assessments with kind, max marks, status, and local mask coordinates.
8. `questions`: Extracted examination questions with label, text, marks, answer type, Bloom level, and reference printed CO.
9. `rubric_versions`: Rubric version records frozen upon teacher approval.
10. `rubric_items`: Granular criteria worth 0.5 to 3 marks each, with accepted alternatives and common errors.
11. `submissions`: Student answer booklet records with page count and blur quality metrics.
12. `submission_pages`: Rendered grayscale pages with local name masking applied.
13. `grading_runs`: Model evaluation records for Grader A and Grader B.
14. `answer_grades`: Per-question transcripts, awarded marks, and flags.
15. `criterion_scores`: Criterion-level awarded points and direct student evidence quotes.
16. `final_marks`: Audited marks approved or edited by the faculty examiner.
17. `audit_log`: Change tracking recording before and after values with teacher reasons.
18. `generated_sets`: Assignment generator configurations and contents.
19. `chat_threads` and `chat_messages`: Multi-turn course assistant conversation history.
20. `jobs`: Atomic task queue utilizing `FOR UPDATE SKIP LOCKED`.
21. `ai_cache`: Response cache keyed by sha256 hash of model, prompt version, and inputs.
22. `ai_usage_daily`: Rate and quota monitor tracking daily tokens and calls.

---

## 4. Shared Job Queue Foundation

Background tasks run through PostgreSQL rather than Redis or Celery:
- The worker executes an atomic query:
  ```sql
  UPDATE jobs
  SET status = 'running', locked_at = now(), attempts = attempts + 1
  WHERE id = (
      SELECT id FROM jobs
      WHERE status = 'queued' AND run_after <= now()
      ORDER BY id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
  )
  RETURNING *;
  ```
- **Idempotency:** Re-running a job deletes prior uncommitted records for the same entity.
- **Backoff:** Failed attempts are requeued with exponential backoff up to 3 attempts.
- **Progress:** Jobs report progress percentages and step descriptions to the `progress` JSONB field.

---

## 5. AI Architecture and Guardrails

- **Models:** Gemini 3.5 Flash-Lite (extraction, rubric drafting, assistant, Grader A) and Gemini 3.1 Flash-Lite (Grader B).
- **Thinking Configuration:** Minimal or low for extraction and assistant; medium for grading and rubrics.
- **No Manual Sampling Parameters:** Temperature, top_p, and top_k are left at defaults to prevent Gemini 3 loop degradation.
- **Structured Outputs:** All responses are strictly enforced via Pydantic JSON schemas.
- **Student Privacy:** Names are masked on the local machine before upload; the AI only sees pseudonymous IDs (`S001`).
- **Teacher Accountable:** AI marks are suggestions. Forced attention UI ensures the faculty examiner reviews scans before accepting grades.

---

## 6. Team Module Boundaries

- **Person 1 (Built):** Foundation, Auth, Course Workspace, Exam Setup Wizard, Question Paper Upload, AI Question Extraction (C1), Question Editor, Answer Key Ingestion, AI Rubric Generation (C2), Rubric Editor, Version Freezing, and Shared Contracts.
- **Person 2:** Script Ingestion, OpenCV Blur Checks, Local Header Masking, Grader A & Grader B Pipeline (C3 & C4).
- **Person 3:** Review Queue UI, Forced Attention Interaction, Results Histogram, and Multi-Sheet Excel Export.
- **Person 4:** Slide Text Search (`tsvector`), Assignment Generator (C5), and Assistant Server Route (C6).
