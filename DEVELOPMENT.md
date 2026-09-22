# Deskwork: Development Guide

This guide details instructions for configuring, running, and testing the Deskwork application locally.

---

## 1. Prerequisites

- **Node.js:** v20.15.0 or later
- **npm:** 10.9.1 or later
- **Python:** 3.11 or later
- **Supabase:** Cloud project or local Supabase CLI
- **Google Gemini API Key:** AI Studio API key

---

## 2. Environment Variables

Create `.env.local` inside `apps/web/` and `.env` at the project root based on `.env.example`:

```bash
# Supabase Public Configuration (Next.js client)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase Server Configuration (Worker and Admin calls)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=postgresql://postgres.your-project:your-password@aws-0-region.pooler.supabase.com:6543/postgres

# Google Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TIER=free

# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 3. Database Migration

Apply the canonical migration script to your Supabase PostgreSQL instance:

```bash
# Using Supabase CLI
supabase db push

# Or execute SQL file directly in the Supabase SQL Editor:
supabase/migrations/0001_init.sql
```

The migration automatically creates all 22 tables, foreign key constraints, indexes, Row Level Security (RLS) policies, and the JIIT standard examination scheme preset.

---

## 4. Running the Web Application

Navigate to `apps/web/` and launch the Next.js development server:

```bash
# From workspace root
cd apps/web

# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

- To access the faculty workspace in prototype mode, visit `/login` and click **Instant Evaluator Demo Sign In**.
- To test the exam setup wizard, navigate to `/courses/c-cs301-2026/exams/new`.
- To inspect the split-view rubric editor, navigate to `/exams/exam-t1-cs301/rubric`.

---

## 5. Running the Python Worker

Set up a Python virtual environment and run the background job listener:

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment (Windows PowerShell)
.venv\Scripts\Activate.ps1

# Install worker dependencies
pip install -e worker/

# Run the worker polling loop
python -m deskwork_worker.main
```

The worker connects to PostgreSQL using `DATABASE_URL` and continuously listens for queued tasks (`extract_paper`, `build_rubric`, etc.) using `FOR UPDATE SKIP LOCKED`.

---

## 6. Verification and Testing

### Web Application Type Checking and Build
```bash
cd apps/web
npx tsc --noEmit
npm run build
```

### Worker Unit Tests
```bash
# Set python path and execute unit tests
$env:PYTHONPATH="worker"
python -m unittest worker/tests/test_schemas_and_jobs.py
```
