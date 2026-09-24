-- Deskwork schema.
-- The browser never reads these tables: every table has RLS on and no policies,
-- so only the backend (service connection) can read or write.

create extension if not exists pgcrypto;

create table if not exists teachers (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists courses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references teachers on delete cascade,
  name text not null,
  code text,
  semester text,
  institution text,
  description text,
  outcomes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists courses_owner_idx on courses (owner_id, created_at desc);

create table if not exists course_files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  filename text not null,
  storage_path text not null,
  mime text,
  size_bytes bigint,
  page_count int,
  char_count int,
  chunk_count int,
  embed_model text,
  outline jsonb not null default '[]',
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'failed')),
  progress int not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists course_files_course_idx on course_files (course_id, created_at);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  bot text not null check (bot in ('assignment', 'solution', 'paper', 'ask')),
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists chats_course_bot_idx on chats (course_id, bot, updated_at desc);

create table if not exists chat_attachments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  filename text not null,
  storage_path text not null,
  mime text,
  pages jsonb not null default '[]',
  text_content text,
  created_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null references chats on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  sources jsonb not null default '[]',
  attachment_ids jsonb not null default '[]',
  status text not null default 'done' check (status in ('streaming', 'done', 'failed')),
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_chat_idx on chat_messages (chat_id, created_at);

create table if not exists exams (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses on delete cascade,
  title text not null,
  kind text,
  total_marks numeric,
  duration text,
  paper_filename text,
  paper_path text,
  paper_pages jsonb not null default '[]',
  paper_text text,
  paper_status text not null default 'none' check (paper_status in ('none', 'processing', 'ready', 'failed')),
  paper_error text,
  paper_notice text,
  key_filename text,
  key_path text,
  key_pages jsonb not null default '[]',
  key_text text,
  key_status text not null default 'none' check (key_status in ('none', 'processing', 'ready', 'failed')),
  key_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exams_course_idx on exams (course_id, created_at desc);

create table if not exists exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  number int not null,
  text text not null,
  marks numeric not null,
  co text,
  has_figure boolean not null default false,
  parts jsonb not null default '[]',
  unique (exam_id, number)
);

create table if not exists answer_key_items (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  question_number int not null,
  part_label text not null default '',
  answer text not null default '',
  final_answer text,
  marking_points jsonb not null default '[]',
  unique (exam_id, question_number, part_label)
);

create table if not exists student_papers (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams on delete cascade,
  student_name text,
  enrollment_no text,
  batch text,
  filename text not null,
  file_path text not null,
  pages jsonb not null default '[]',
  status text not null default 'reading'
    check (status in ('reading', 'ready', 'checking', 'checked', 'failed')),
  error text,
  total_marks numeric,
  flagged_count int not null default 0,
  summary text,
  checked_by text check (checked_by in ('ai', 'teacher')),
  checked_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists student_papers_exam_idx on student_papers (exam_id, created_at);

create table if not exists paper_marks (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references student_papers on delete cascade,
  question_number int not null,
  part_label text not null default '',
  max_marks numeric not null,
  attempted boolean not null default true,
  marks_a numeric,
  marks_b numeric,
  final_marks numeric,
  source text not null default 'ai' check (source in ('ai', 'teacher')),
  flagged boolean not null default false,
  flag_reason text,
  student_answer text,
  reasoning text,
  reasoning_b text,
  mistakes jsonb not null default '[]',
  confidence numeric,
  pages jsonb not null default '[]',
  teacher_note text,
  updated_at timestamptz not null default now(),
  unique (paper_id, question_number, part_label)
);

create table if not exists grading_runs (
  id uuid primary key default gen_random_uuid(),
  paper_id uuid not null references student_papers on delete cascade,
  model text not null,
  role text not null check (role in ('primary', 'second')),
  raw jsonb,
  input_tokens int,
  output_tokens int,
  latency_ms int,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists mark_edits (
  id bigserial primary key,
  paper_id uuid not null references student_papers on delete cascade,
  question_number int not null,
  part_label text not null default '',
  old_marks numeric,
  new_marks numeric,
  note text,
  actor uuid references teachers on delete set null,
  created_at timestamptz not null default now()
);

alter table teachers enable row level security;
alter table courses enable row level security;
alter table course_files enable row level security;
alter table chats enable row level security;
alter table chat_attachments enable row level security;
alter table chat_messages enable row level security;
alter table exams enable row level security;
alter table exam_questions enable row level security;
alter table answer_key_items enable row level security;
alter table student_papers enable row level security;
alter table paper_marks enable row level security;
alter table grading_runs enable row level security;
alter table mark_edits enable row level security;

insert into storage.buckets (id, name, public)
values ('deskwork', 'deskwork', false)
on conflict (id) do nothing;
