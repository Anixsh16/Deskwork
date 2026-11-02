-- Final evaluation: additive migration, preserves existing courses, files and marks.
begin;
alter table courses add column if not exists is_sample boolean not null default false;
alter table student_papers add column if not exists is_sample boolean not null default false;
alter table exam_questions add column if not exists topic text;
create table if not exists lesson_plans (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references courses on delete cascade,
 title text not null,
 config jsonb not null,
 content jsonb not null default '{}',
 sources jsonb not null default '[]',
 status text not null default 'queued' check (status in ('queued','processing','ready','failed')),
 error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index if not exists lesson_plans_course_idx on lesson_plans(course_id, created_at desc);
create table if not exists question_bank (
 id uuid primary key default gen_random_uuid(),
 course_id uuid not null references courses on delete cascade,
 source_message_id uuid references chat_messages on delete set null,
 source_exam_id uuid references exams on delete set null,
 source_number int,
 fingerprint text not null,
 text text not null,
 topic text not null default 'Uncategorised',
 difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
 kind text not null default 'theory' check (kind in ('theory','numerical','code','diagram','mcq')),
 marks numeric not null check (marks > 0),
 parts jsonb not null default '[]',
 answer text,
 has_figure boolean not null default false,
 created_at timestamptz not null default now(),
 unique(course_id, fingerprint)
);
create index if not exists question_bank_course_idx on question_bank(course_id, topic, created_at desc);
create table if not exists bank_imports (
 message_id uuid primary key references chat_messages on delete cascade,
 status text not null default 'queued' check (status in ('queued','processing','ready','failed')),
 question_count int not null default 0,
 error text,
 updated_at timestamptz not null default now()
);
create table if not exists question_batches (
 id uuid primary key default gen_random_uuid(),
 exam_id uuid not null references exams on delete cascade,
 question_number int not null,
 status text not null default 'queued' check (status in ('queued','processing','ready','failed')),
 total int not null default 0,
 completed int not null default 0,
 failed int not null default 0,
 skipped int not null default 0,
 error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists question_batches_active_idx on question_batches(exam_id)
 where status in ('queued','processing');
alter table lesson_plans enable row level security;
alter table question_bank enable row level security;
alter table bank_imports enable row level security;
alter table question_batches enable row level security;
commit;
