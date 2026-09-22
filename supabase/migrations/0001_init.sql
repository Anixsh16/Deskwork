-- Deskwork Canonical Supabase Migration
-- File: supabase/migrations/0001_init.sql
-- Based on Deskwork Build Plan v3 section 8

create extension if not exists pgcrypto;

-- 1. Profiles (mirrors auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  institution text default 'JIIT Noida',
  created_at timestamptz default now()
);

-- Trigger to create profile upon new signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. Exam Schemes (JIIT preset + custom schemes)
create table if not exists exam_schemes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete set null,
  name text not null,
  components jsonb not null default '[]'::jsonb
);

-- 3. Courses
create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  code text not null,
  name text not null,
  semester text,
  section text,
  scheme_id uuid references exam_schemes on delete set null,
  created_at timestamptz default now()
);

-- 4. Course Materials (slides, notes, etc.)
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  kind text not null check (kind in ('slides','notes','assignment','pyq','other')),
  title text not null,
  unit text,
  storage_path text not null,
  status text not null default 'uploaded' check (status in ('uploaded','extracted','error')),
  created_at timestamptz default now()
);

-- 5. Material Pages (with Postgres full-text search)
create table if not exists material_pages (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references materials on delete cascade,
  page_no int not null,
  text text,
  topics text[] default '{}',
  tsv tsvector generated always as (to_tsvector('english', coalesce(text,''))) stored,
  unique (material_id, page_no)
);
create index if not exists idx_material_pages_tsv on material_pages using gin (tsv);

-- 6. Students (pseudonymous IDs used in AI calls; names and roll numbers stay private)
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  anon_id text not null,                     -- S001, S002, etc.
  roll_no text,                              -- never sent to AI
  name text,                                 -- never sent to AI
  unique (course_id, anon_id)
);

-- 7. Exams
create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  title text not null,
  kind text not null check (kind in ('T1','T2','END_SEM','ASSIGNMENT','QUIZ','OTHER')),
  max_marks numeric,
  paper_path text,
  mask_region jsonb,                         -- {"page":1,"x":0.0,"y":0.0,"w":1.0,"h":0.2}
  expected_pages int default 12,
  status text not null default 'draft' check (status in ('draft','rubric_ready','grading','review','final')),
  created_at timestamptz default now()
);

-- 8. Questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  label text not null,                       -- '1', '2a', '2b'
  ord int not null,
  text text not null,
  max_marks numeric not null,
  answer_type text not null check (answer_type in ('theory','numeric','code','diagram','mcq')),
  bloom text check (bloom in ('remember','understand','apply','analyze','evaluate','create')),
  printed_co text,                           -- reference text only; strictly never used in grading logic
  unique (exam_id, label)
);

-- 9. Rubric Versions (frozen upon teacher approval)
create table if not exists rubric_versions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  version int not null,
  status text not null default 'draft' check (status in ('draft','approved','superseded')),
  source text not null check (source in ('typed_key','handwritten_key','manual','generated')),
  key_path text,
  approved_at timestamptz,
  unique (exam_id, version)
);

-- 10. Rubric Items (granular criteria worth 0.5 to 3 marks)
create table if not exists rubric_items (
  id uuid primary key default gen_random_uuid(),
  rubric_version_id uuid not null references rubric_versions on delete cascade,
  question_id uuid not null references questions on delete cascade,
  criterion_key text not null,               -- 'q1a.c1'
  description text not null,
  marks numeric not null check (marks > 0 and marks <= 3 and marks * 2 = floor(marks * 2)),
  accept_alternatives text[] default '{}',
  common_errors text[] default '{}',
  final_answer text,
  tolerance_pct numeric,
  units text,
  ord int not null
);

-- 11. Submissions (student answer booklets)
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  student_id uuid references students on delete set null,
  storage_path text not null,
  page_count int,
  quality jsonb,                             -- {"page_count_ok":true,"blurry_pages":[]}
  status text not null default 'uploaded' check (status in ('uploaded','ready','grading','graded','reviewed','error')),
  created_at timestamptz default now()
);

-- 12. Submission Pages (grayscale, masked name region, blur score)
create table if not exists submission_pages (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions on delete cascade,
  page_no int not null,
  image_path text not null,
  blur_score numeric,
  masked boolean default false,
  unique (submission_id, page_no)
);

-- 13. Grading Runs (one call per booklet per model)
create table if not exists grading_runs (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions on delete cascade,
  rubric_version_id uuid not null references rubric_versions,
  grader text not null check (grader in ('A','B','regrade')),
  model text not null,
  prompt_version text not null,
  cache_key text not null,
  raw jsonb,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  status text not null default 'ok',
  error text,
  created_at timestamptz default now()
);

-- 14. Answer Grades (one per question per run)
create table if not exists answer_grades (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references grading_runs on delete cascade,
  question_id uuid not null references questions on delete cascade,
  pages int[],
  transcript text,
  final_answer text,
  flags text[] default '{}',
  confidence numeric,
  total numeric
);

-- 15. Criterion Scores (evidence quotes student work directly)
create table if not exists criterion_scores (
  id uuid primary key default gen_random_uuid(),
  answer_grade_id uuid not null references answer_grades on delete cascade,
  rubric_item_id uuid not null references rubric_items on delete cascade,
  points numeric not null,
  evidence text
);

-- 16. Final Marks (verified, edited, or bulk-accepted by teacher)
create table if not exists final_marks (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions on delete cascade,
  question_id uuid not null references questions on delete cascade,
  ai_marks numeric,
  marks numeric,
  criteria jsonb,
  review_status text not null default 'pending' check (review_status in ('pending','flagged','accepted','edited','spot_checked')),
  flag_reasons text[] default '{}',
  reviewed_by uuid references profiles on delete set null,
  reviewed_at timestamptz,
  unique (submission_id, question_id)
);

-- 17. Audit Log
create table if not exists audit_log (
  id bigserial primary key,
  course_id uuid references courses on delete cascade,
  entity text not null,
  entity_id uuid not null,
  action text not null,
  before jsonb,
  after jsonb,
  reason text,
  actor uuid references profiles on delete set null,
  at timestamptz default now()
);

-- 18. Generated Sets (Person 4 assignment generator)
create table if not exists generated_sets (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  title text,
  config jsonb not null,
  content jsonb,
  status text default 'queued',
  created_at timestamptz default now()
);

-- 19. Chat Threads & Messages (Assistant panel)
create table if not exists chat_threads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references profiles on delete cascade,
  course_id uuid references courses on delete set null,
  title text,
  created_at timestamptz default now()
);

create table if not exists chat_messages (
  id bigserial primary key,
  thread_id uuid not null references chat_threads on delete cascade,
  role text not null check (role in ('user','assistant','tool')),
  content jsonb not null,
  created_at timestamptz default now()
);

-- 20. Jobs Table (shared PostgreSQL queue with FOR UPDATE SKIP LOCKED)
create table if not exists jobs (
  id bigserial primary key,
  kind text not null,
  payload jsonb not null,
  status text not null default 'queued' check (status in ('queued','running','done','error')),
  attempts int not null default 0,
  progress jsonb,
  error text,
  run_after timestamptz default now(),
  locked_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists idx_jobs_status_run_after on jobs (status, run_after);

-- 21. AI Cache (sha256 of model, prompt_version, rubric, image hash)
create table if not exists ai_cache (
  cache_key text primary key,
  model text,
  response jsonb not null,
  created_at timestamptz default now()
);

-- 22. AI Usage Tracking
create table if not exists ai_usage_daily (
  day date not null,
  model text not null,
  source text not null check (source in ('worker','assistant')),
  calls int default 0,
  tokens int default 0,
  primary key (day, model, source)
);

-- =======================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =======================================================

alter table profiles enable row level security;
alter table exam_schemes enable row level security;
alter table courses enable row level security;
alter table materials enable row level security;
alter table material_pages enable row level security;
alter table students enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table rubric_versions enable row level security;
alter table rubric_items enable row level security;
alter table submissions enable row level security;
alter table submission_pages enable row level security;
alter table grading_runs enable row level security;
alter table answer_grades enable row level security;
alter table criterion_scores enable row level security;
alter table final_marks enable row level security;
alter table audit_log enable row level security;
alter table generated_sets enable row level security;
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;
alter table jobs enable row level security;

-- Profiles: teachers see and update only their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Exam Schemes: readable if owner is null (system default) or matches teacher
create policy "Read accessible exam schemes" on exam_schemes
  for select using (owner_id is null or owner_id = auth.uid());
create policy "Manage own exam schemes" on exam_schemes
  for all using (owner_id = auth.uid());

-- Courses: accessible only by course owner
create policy "Owner manages courses" on courses
  for all using (owner_id = auth.uid());

-- Materials & Pages: accessible if course owner matches
create policy "Owner manages materials" on materials
  for all using (
    exists (select 1 from courses where courses.id = materials.course_id and courses.owner_id = auth.uid())
  );

create policy "Owner manages material pages" on material_pages
  for all using (
    exists (
      select 1 from materials
      join courses on courses.id = materials.course_id
      where materials.id = material_pages.material_id and courses.owner_id = auth.uid()
    )
  );

-- Students: accessible by course owner
create policy "Owner manages students" on students
  for all using (
    exists (select 1 from courses where courses.id = students.course_id and courses.owner_id = auth.uid())
  );

-- Exams: accessible by course owner
create policy "Owner manages exams" on exams
  for all using (
    exists (select 1 from courses where courses.id = exams.course_id and courses.owner_id = auth.uid())
  );

-- Questions: accessible by exam course owner
create policy "Owner manages questions" on questions
  for all using (
    exists (
      select 1 from exams
      join courses on courses.id = exams.course_id
      where exams.id = questions.exam_id and courses.owner_id = auth.uid()
    )
  );

-- Rubric Versions & Items: accessible by exam course owner
create policy "Owner manages rubric versions" on rubric_versions
  for all using (
    exists (
      select 1 from exams
      join courses on courses.id = exams.course_id
      where exams.id = rubric_versions.exam_id and courses.owner_id = auth.uid()
    )
  );

create policy "Owner manages rubric items" on rubric_items
  for all using (
    exists (
      select 1 from rubric_versions
      join exams on exams.id = rubric_versions.exam_id
      join courses on courses.id = exams.course_id
      where rubric_versions.id = rubric_items.rubric_version_id and courses.owner_id = auth.uid()
    )
  );

-- Submissions & Pages
create policy "Owner manages submissions" on submissions
  for all using (
    exists (
      select 1 from exams
      join courses on courses.id = exams.course_id
      where exams.id = submissions.exam_id and courses.owner_id = auth.uid()
    )
  );

create policy "Owner manages submission pages" on submission_pages
  for all using (
    exists (
      select 1 from submissions
      join exams on exams.id = submissions.exam_id
      join courses on courses.id = exams.course_id
      where submissions.id = submission_pages.submission_id and courses.owner_id = auth.uid()
    )
  );

-- Grading Runs, Answer Grades, Criterion Scores, Final Marks
create policy "Owner manages grading runs" on grading_runs
  for all using (
    exists (
      select 1 from submissions
      join exams on exams.id = submissions.exam_id
      join courses on courses.id = exams.course_id
      where submissions.id = grading_runs.submission_id and courses.owner_id = auth.uid()
    )
  );

create policy "Owner manages answer grades" on answer_grades
  for all using (
    exists (
      select 1 from grading_runs
      join submissions on submissions.id = grading_runs.submission_id
      join exams on exams.id = submissions.exam_id
      join courses on courses.id = exams.course_id
      where grading_runs.id = answer_grades.run_id and courses.owner_id = auth.uid()
    )
  );

create policy "Owner manages criterion scores" on criterion_scores
  for all using (
    exists (
      select 1 from answer_grades
      join grading_runs on grading_runs.id = answer_grades.run_id
      join submissions on submissions.id = grading_runs.submission_id
      join exams on exams.id = submissions.exam_id
      join courses on courses.id = exams.course_id
      where answer_grades.id = criterion_scores.answer_grade_id and courses.owner_id = auth.uid()
    )
  );

create policy "Owner manages final marks" on final_marks
  for all using (
    exists (
      select 1 from submissions
      join exams on exams.id = submissions.exam_id
      join courses on courses.id = exams.course_id
      where submissions.id = final_marks.submission_id and courses.owner_id = auth.uid()
    )
  );

-- Audit log
create policy "Owner views audit log" on audit_log
  for select using (
    course_id is null or exists (
      select 1 from courses where courses.id = audit_log.course_id and courses.owner_id = auth.uid()
    )
  );

-- Generated Sets
create policy "Owner manages generated sets" on generated_sets
  for all using (
    exists (select 1 from courses where courses.id = generated_sets.course_id and courses.owner_id = auth.uid())
  );

-- Chat Threads and Messages
create policy "Owner manages chat threads" on chat_threads
  for all using (owner_id = auth.uid());

create policy "Owner manages chat messages" on chat_messages
  for all using (
    exists (select 1 from chat_threads where chat_threads.id = chat_messages.thread_id and chat_threads.owner_id = auth.uid())
  );

-- Jobs: Authenticated teachers can insert and view their jobs
create policy "Authenticated users can insert jobs" on jobs
  for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can view jobs" on jobs
  for select using (auth.role() = 'authenticated');

-- Default Seed: JIIT Exam Scheme preset
insert into exam_schemes (id, owner_id, name, components)
values (
  '00000000-0000-0000-0000-000000000001',
  null,
  'JIIT B.Tech Standard Scheme',
  '[
    {"kind": "T1", "max": 20},
    {"kind": "T2", "max": 20},
    {"kind": "END_SEM", "max": 35},
    {"kind": "ASSIGNMENT", "max": 25}
  ]'::jsonb
) on conflict (id) do nothing;
