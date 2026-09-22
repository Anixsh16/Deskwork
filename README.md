# Deskwork

> **Set the paper, check the papers, clear the desk.**

Deskwork is an AI workspace built exclusively for teachers. It streamlines the tasks teachers still perform manually: grading handwritten answer scripts with transparent evidence, generating course-grounded assignments and question papers, and querying course materials through a contextual assistant.

The teacher always remains the accountable examiner.

---

## Core Modules

1. **AI-Assisted Handwritten Exam Checking (Headline Feature):**
   - Independent dual-model grading (Gemini 3.5 Flash-Lite and Gemini 3.1 Flash-Lite) directly from page images.
   - Forced review user experience: marks stay hidden until the scan region is viewed, harsh marks require explicit reasons, and spot checks precede bulk approval.
   - Local student name masking and pseudonymous IDs (S001, S002, etc.) to protect student privacy under data protection regulations.
   - Granular rubric criteria (0.5 to 3 marks) with full evidence citing the student's own work.

2. **Assignment and Question Paper Generator:**
   - Grounded directly in the teacher's uploaded course slides.
   - Structured output with Bloom levels, answer keys, and rubric criteria.
   - One-click conversion from generated set to active exam.

3. **Contextual Teacher Assistant:**
   - Server-side streaming chat panel available on every page.
   - Grounded in course slides with page-level citations.
   - Read-only tools for querying exam statistics, flagged answers, and pre-filling generators.

---

## Four-Person Team Ownership

- **Person 1 (Current Role):** Foundation, Exam Setup, Question Extraction, Answer Key, Rubric Management, Shared Database Schema, and Shared Job Queue Contracts.
- **Person 2:** Handwritten Grading Engine, Local Name Masking, Page Quality Checks, Dual-Model Grading Pipeline.
- **Person 3:** Review Queue UI, Forced Attention Review, Marks Distribution, Audit Logging, and Excel Export.
- **Person 4:** Course Material Slide Ingestion, Full-Text Search Indexing, Paper Generator, and Assistant Tools.

---

## Architecture Overview

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Table, Recharts.
- **Data & Auth:** Supabase (PostgreSQL with Row Level Security, Supabase Auth, Storage Buckets, Realtime subscriptions, Full-Text Search via `tsvector`).
- **Worker:** Python 3.12, `google-genai`, PyMuPDF, Pillow, OpenCV, Pydantic, `psycopg`.
- **Job Queue:** PostgreSQL `jobs` table using `FOR UPDATE SKIP LOCKED`.
- **AI Models:** Gemini 3.5 Flash-Lite (Extraction, Generator, Assistant, Grader A) and Gemini 3.1 Flash-Lite (Grader B).

---

## Repository Structure

```
deskwork/
  apps/
    web/                           # Next.js 15 web application
      app/
        (auth)/login/              # Teacher authentication
        (app)/dashboard/           # Central dashboard
        (app)/courses/[courseId]/  # Course workspace (Exams, Materials, Students)
        (app)/courses/[courseId]/exams/new/  # Exam setup wizard
        (app)/exams/[examId]/      # Exam overview and progress
        (app)/exams/[examId]/rubric/ # Split-view rubric editor
        (app)/exams/[examId]/scripts/ # Script upload and status (Person 2 shell)
        (app)/exams/[examId]/review/  # Forced review screen (Person 3 shell)
        (app)/exams/[examId]/results/ # Results table and export (Person 3 shell)
        (app)/courses/[courseId]/generate/ # Assignment generator (Person 4 shell)
        (app)/soon/[feature]/      # Shared coming-soon destination
        api/assistant/route.ts     # Streaming server-side assistant route
      components/
        ui/                        # shadcn/ui design tokens and components
        rubric/                    # Rubric editing and approval components
        coming-soon.tsx            # Centralized coming-soon wrapper
      lib/
        features.ts                # Feature flag registry
        types.ts                   # Canonical shared data types
        supabase/                  # Client and server Supabase clients
        jobs.ts                    # Job insertion and tracking utilities
  worker/
    deskwork_worker/
      main.py                      # Worker polling loop (FOR UPDATE SKIP LOCKED)
      jobs/
        extract_paper.py           # Question paper extraction job
        build_rubric.py            # Rubric generation job
      ai/
        client.py                  # Gemini client with throttling, retry, cache
        schemas.py                 # Pydantic schemas for structured output
        prompts/                   # Version-controlled prompt files
  supabase/
    migrations/
      0001_init.sql                # Complete project database schema with RLS
  eval/                            # Evaluation harness (Person 3 / future)
  testdata/                        # Test question papers and sample keys (gitignored)
  .env.example                     # Environment variable template
```

---

## Status and Verification

See `BUILD_STATUS.md` for live progress, completed phases, and upcoming steps.
