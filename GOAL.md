# Deskwork: GOAL (source of truth for the rebuild)

Read this file before doing any work on Deskwork. It records Yug's full intent as agreed in chat.
If anything in older docs (the build plan PDF/HTML, the old README, HANDOFF.md, the friend's code)
conflicts with this file, **this file wins**.

---

## 1. What we are building

Deskwork is a real, working web platform for **teachers only** (students never log in). It saves teachers
time on the work they still do by hand:

1. Creating a course and uploading its lecture slides once.
2. Generating assignments, assignment solutions and question papers (with answer keys) from those slides.
3. Checking scanned handwritten student answer papers with AI, with the teacher able to review and override.

It is Yug's JIIT Noida final-year **major project**. There are two checkpoints:
- **Mid evaluation:** show a working prototype plus a synopsis with future vision.
- **Final evaluation:** show the finished product.
Do not plan or mention timelines, weeks or schedules anywhere. Yug manages time himself.

It runs **locally on Yug's laptop only** (no deployment). Gemini free tier is fine; limits are generous and
Yug has spare API keys, so do not starve features to save calls, just avoid rate-limit errors.

## 2. Non-negotiables

- **No fake, dummy, sample or seeded data. Ever.** Everything shown comes from real uploads by the teacher.
  The friend's fake "Data Structures" course, fake professor and seeded rows must be deleted.
- **No "demo" anything.** No demo button, demo user, demo mode, "evaluator" login, or the word "demo" in
  the product UI or code. It must look and behave like a real product.
- **Only one subject exists right now: CN & IoT (Computer Networks & Internet of Things, 18B11CS311).**
  The app supports many courses in general, but nothing is pre-created. The teacher creates the course.
- Anything not working or not real for now is shown as **"Coming soon"** (greyed, tasteful, few per screen),
  never as a broken or fake feature.
- **Everything must actually work end to end.** Yug should only need to follow a short click-through.
- No em dashes anywhere (chat, code, comments, docs, commits). No Claude attribution in commits.
- No web/MCP connectors except Supabase (per global rules). CLIs are fine (supabase, gh, psql).

## 3. Sign-in

- **Google sign-in only** ("Continue with Google") via Supabase Auth. Already configured in Supabase
  (Google provider enabled, site URL `http://localhost:3000`, redirect allow list `http://localhost:3000/**`).
  Google OAuth client lives in Google Cloud project `deskwork-509607`, in Testing mode, test user
  `yugjindal1234@gmail.com`.
- **Allow list:** only `yugjindal1234@gmail.com` can use the app for now. Teachers' emails get added after
  the final evaluation. Anyone else sees a clean "your account is not enabled yet" message.
- Claude may not type passwords into websites. For browser testing, Claude signs in as Yug's account with a
  one-time sign-in link generated from the terminal with the Supabase admin key. This helper is a test script,
  never a visible product feature.

## 4. Core flows (exactly as Yug described)

### 4.1 Courses
- Dashboard has **Create course**. The form collects real course details (name, code, semester, optional
  description and course outcomes) and lets the teacher **upload lecture slides** (PDF and PPTX; one CN & IoT
  module is a .pptx).
- Slides are processed by **plain text extraction** (no image analysis for slides), chunked, embedded with
  Google's embedding model (`gemini-embedding-2`) and stored in a **local ChromaDB** (persistent folder on
  disk). Show real per-file processing status.
- Course page shows its files and gives access to the chatbots and the course's exams.

### 4.2 Chatbots (separate, single-purpose, each in its own tab)
All use retrieval (RAG) over that course's slides and show which slides/pages they used.
- **Assignment generator:** "Make 10 questions on congestion control" and it returns a proper assignment.
- **Solution generator:** creates solutions for an assignment (from the teacher's prompt, a generated
  assignment, or an uploaded assignment PDF, read as images because it may have figures).
- **Question paper generator:** teacher uploads the syllabus topic list or says "up to topic X / first third
  of the syllabus", and it creates a question paper in the college format, plus its **answer key**.
- Optional small extra: **Ask your slides** Q&A bot.
- Keep each bot simple and focused. No intent-routing mega bot.
- Useful output actions: copy, download (PDF, Word if feasible).

### 4.3 Exam checking (the headline feature)
1. Dashboard has **Create exam** (like Create course). Exam belongs to a course.
2. Teacher uploads the **question paper**. Parsing is **image based** (paper may be scanned and have
   diagrams): render every PDF page to an image and send images to Gemini. Questions, sub-parts, marks and
   printed COs are extracted and stored. Printed COs are reference only, never used in logic.
3. Teacher opens the exam and uploads the **answer key** (typed or handwritten, also image based). The exam
   page shows both the question paper and the answer key.
4. Once both exist, **Check student papers** is enabled. Teacher uploads student papers **one by one**.
5. Papers appear in a **table, one row per student paper**:
   - Student name and enrollment number, **read by AI from page 1**, editable by the teacher.
   - Clicking the row opens the paper (the scanned pages).
   - One column **per question** (Q1, Q2, ...) plus total. Before checking, cells show a hyphen `-`.
   - A **Check** button at the end of each row: an LLM call that grades the paper from the page images.
     After checking, the question cells fill in with marks.
   - A **View** button opens the detailed analysis: per question and sub-part, the marks, what the student
     wrote, why the AI gave those marks, mistakes found.
   - The teacher can **check manually** or override any mark, with a note.
6. **Two models grade each paper:** Gemini 3.5 Flash-Lite (primary) and 3.1 Flash-Lite (second opinion).
   Where they disagree, the question is **highlighted** for the teacher.
7. Grade from the **images**, not from a transcript (models silently fix student mistakes when transcribing).
   Totals are always computed in code, never trusted from the model. Half marks allowed (0.5 steps).
8. Export results (Excel) is a good extra.

## 5. Tech decisions (Claude's calls, already made)

- **Frontend:** Next.js (App Router, TypeScript, Tailwind, shadcn-style components, Motion for animation),
  in `apps/web`. Talks to Supabase only for sign-in.
- **Backend:** Python FastAPI in `backend/` (run with uv, Python 3.12): all data access, file handling
  (PyMuPDF for PDF to images, python-pptx for slides), Gemini calls, ChromaDB. Verifies the Supabase session
  token and the email allow list on every request.
- **Supabase:** Postgres (tables with RLS on and no public policies, so the browser key can read nothing),
  Storage (private bucket for uploaded files and rendered page images), Auth (Google).
- **AI:** `gemini-3.5-flash-lite` primary, `gemini-3.1-flash-lite` second grader, `gemini-embedding-2`.
  Do not set temperature for Gemini 3 models. Use structured JSON output. Throttle per model
  (free tier roughly 15 to 30 RPM, embeddings 100 RPM and 30k TPM) and retry 429/503 with backoff.
- Long work (slide ingestion, paper parsing, grading) runs in the background with visible status.
- One command starts everything locally.
- `DATABASE_URL` must use the Tokyo pooler (`aws-0-ap-northeast-1`), the friend's Mumbai URL was wrong.

## 6. UI

- **White theme, extremely clean and beautiful**, teacher-dashboard feel, inspired by **Google Meet**,
  Notion and similar. Very smooth animations. Font: Google Sans Flex (Google Fonts).
- Real empty states that point to the next action. Live progress text for AI steps.
- The friend's UI is to be fully replaced.

## 7. Real materials (Yug's own, consented)

Copied into `testdata/` (gitignored) for automated tests. Originals:
- Question paper: CN & IoT T2 Even 2026, 5 questions, 20 marks (`CN IOT T2.pdf`).
- Teacher's answer key (typed PDF, header mislabeled "T1 SOLUTION"): `~/Downloads/CN & IOT SOLUTION T2_EVEN 2026 (1).pdf`.
- Student booklets (AI-generated handwriting, Yug's own): `~/Desktop/Student answer to t2 PYQ 1.pdf`
  (Ananya Gupta, answers Q1 to Q4 case 1 only, Q4c and Q5 unanswered) and
  `~/Desktop/student answer to t2 PYQ 2.pdf` (Parth Gupta, all questions, with real mistakes: Q1b says 63
  routers instead of 64; Q4 GBN totals 37 and 49 instead of 39 and 51; SR case 2 says 33 instead of 29).
- Slides: `~/Downloads/CN IOT Slides/` (Modules 1, 2, 3 T1, 3 part 2, 5 (.pptx), 6, 7; Module 4 missing).
- Assignment 1 (8 questions, Q4 and Q5 have figures): `~/Downloads/Assignment - 1_CN & IOT_2026.pdf`.
- Real messy handwritten answers to Assignment 1 (6 pages): `~/Downloads/Assignment1_answers_handwritten.pdf`.
  No official solution exists; the Solution generator can create one, which then serves as the answer key.
Missing pieces may be generated by Claude where sensible (for example the assignment solution).

## 8. How Claude must work

- Own it end to end: fix, rebuild, test, verify. Yug is AFK.
- Rebuild in the same repo (`~/Desktop/Projects/Deskwork`, GitHub `Anixsh16/Deskwork`), **push straight to
  main**. Replace the friend's code; keep the old plan docs only under `docs/` as reference.
- Wipe the friend's fake data from Supabase project `major` (ref `chlckgeguqndyrlmmweq`, Tokyo).
- Write tests: backend unit tests plus a terminal end-to-end script that runs every flow against the real
  running API with the real materials (so terminal success implies the web works).
- Test in the browser too (built-in browser for the app; Claude in Chrome allowed for this task, e.g.
  Supabase dashboard). Take screenshots while testing and save them.
- Use subagents (Opus, high effort) to verify code quality, correctness and working flows. Do not overuse.
- After testing: **wipe all test data** (database rows, storage files, ChromaDB) so Yug can run the same
  flow himself with the same files.
- Final deliverable: an **artifact** with the screenshots of everything tested plus a **short, simple
  click-through workflow** for Yug to repeat. Then Yug tests and shows teammates.

## 9. Yug's tips, tricks and workflow (follow all of them)

**Reading files**
- Handwritten or scanned PDFs have no text layer. Read them **page by page as images**, both when Claude
  inspects them and inside the product (question papers, answer keys, student papers, uploaded assignments).
  Never rely on PDF text extraction for these.
- Lecture slides are the exception: plain text extraction is enough, no image analysis.

**Process**
1. First audit the friend's code and **point out its problems yourself** (there are many: broken course
   form, courses not opening, fake data, backend not connecting, uploads not accepted properly).
2. Fix or replace, then build the features in section 4.
3. Test thoroughly, save screenshots, wipe test data, publish the artifact with the click-through workflow.

**Testing**
- Set things up so most testing can run **from the terminal** (fast). A terminal end-to-end run against the
  real API with the real materials should prove the web flow works, then confirm in the browser.
- Use the **built-in browser** to run the app and click through every feature. Claude in Chrome is allowed
  for this task (for example to check the Supabase dashboard). Yug signs in to Google or Supabase himself;
  Claude never types passwords.
- Take screenshots while testing and store them in a file or folder, then show them in the final artifact.
- After testing, **delete all test data** so Yug can repeat the exact same test with the same (single set
  of) raw material, and then do it again in front of the teacher.
- Write real tests so things are proven correct, not assumed.

**Subagents**
- Use subagents (Opus, high effort) throughout: to review code quality, correctness, and whether flows
  truly work, and to point out problems. Use them for verification at meaningful checkpoints and at the end.
  Do not overuse them (they cost Yug's Claude Code limit), but do not skip them either.

**API limits**
- Do not worry about the number of Gemini calls. Search the web for per-minute limits and throttle so
  requests do not get rate limited. Running out of the daily limit during testing is acceptable; Yug has
  2 or 3 more keys.

**When unsure**
- Before Yug went AFK, questions went through multiple-choice prompts. Now that he is AFK, do not block on
  questions: pick the choice that best serves his intent and note it in the final report.
- If some material is missing (for example the Assignment 1 solution), generate it.

**UI**
- White theme, extremely clean, beautiful and smooth. Research the best teacher-dashboard and product UI
  designs on the web. Inspiration Yug named: Google Meet, Notion, and similar polished products.

**Final report to Yug**
- An artifact with screenshots of everything tested and a short, simple, to-the-point workflow that tells
  him exactly which buttons to press to repeat the test himself.

## 10. Settled decisions from earlier planning that still hold

- Teacher-only product, teacher stays the examiner, marks can always be overridden.
- Grade all answer types; diagrams and code are hard, so highlight low-confidence answers.
- CO/PO attainment and NBA reporting are **out** of scope. Do not reintroduce.
- Earlier ideas that are **dropped**: hiding AI marks until reveal, name masking, anonymous IDs,
  forced spot-checks, the single all-purpose assistant with tools.
