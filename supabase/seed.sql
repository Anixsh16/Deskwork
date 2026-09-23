-- Deskwork Development Seed Data
-- File: supabase/seed.sql
-- Development and UI testing only. Does NOT insert fake grading runs or fake marks.

-- 1. Sample User in auth.users (Required to satisfy profiles foreign key constraint)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '11111111-1111-1111-1111-111111111111',
  'authenticated',
  'authenticated',
  'prof.sharma@jiit.ac.in',
  crypt('deskwork2026', gen_salt('bf')),
  now(),
  '{"provider": "email", "providers": ["email"]}'::jsonb,
  '{"full_name": "Prof. Anish Sharma"}'::jsonb,
  now(),
  now()
) on conflict (id) do nothing;

-- 2. Sample Teacher Profile
insert into profiles (id, full_name, institution)
values (
  '11111111-1111-1111-1111-111111111111',
  'Prof. Anish Sharma',
  'Jaypee Institute of Information Technology (JIIT), Noida'
) on conflict (id) do update set
  full_name = excluded.full_name,
  institution = excluded.institution;

-- 3. Sample Course: CS301 Data Structures and Algorithms
insert into courses (id, owner_id, code, name, semester, section, scheme_id)
values (
  '22222222-2222-2222-2222-222222222222',
  '11111111-1111-1111-1111-111111111111',
  'CS301',
  'Data Structures and Algorithms',
  'Odd 2026',
  'B3 (CSE)',
  '00000000-0000-0000-0000-000000000001'
) on conflict (id) do nothing;

-- 4. Sample Course Materials (Slides)
insert into materials (id, course_id, kind, title, unit, storage_path, status)
values
  (
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222222',
    'slides',
    'Unit 1: Algorithmic Asymptotics and Recurrences',
    'Unit 1',
    'courses/cs301/slides/unit1.pdf',
    'extracted'
  ),
  (
    '33333333-3333-3333-3333-333333333302',
    '22222222-2222-2222-2222-222222222222',
    'slides',
    'Unit 2: Trees, AVL Rotations and Red-Black Properties',
    'Unit 2',
    'courses/cs301/slides/unit2.pdf',
    'extracted'
  ),
  (
    '33333333-3333-3333-3333-333333333303',
    '22222222-2222-2222-2222-222222222222',
    'slides',
    'Unit 3: Priority Queues, Heaps and Disjoint Sets',
    'Unit 3',
    'courses/cs301/slides/unit3.pdf',
    'extracted'
  )
on conflict (id) do nothing;

-- 5. Sample Students (pseudonymous IDs used in AI prompts; roll numbers and names stay private)
insert into students (id, course_id, anon_id, roll_no, name)
values
  ('44444444-4444-4444-4444-444444444401', '22222222-2222-2222-2222-222222222222', 'S001', '21103001', 'Aarav Sharma'),
  ('44444444-4444-4444-4444-444444444402', '22222222-2222-2222-2222-222222222222', 'S002', '21103002', 'Ananya Verma'),
  ('44444444-4444-4444-4444-444444444403', '22222222-2222-2222-2222-222222222222', 'S003', '21103003', 'Bhavya Gupta'),
  ('44444444-4444-4444-4444-444444444404', '22222222-2222-2222-2222-222222222222', 'S004', '21103004', 'Chirag Saxena'),
  ('44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222222', 'S005', '21103005', 'Divya Mishra'),
  ('44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222222', 'S006', '21103006', 'Eshaan Joshi')
on conflict (course_id, anon_id) do nothing;

-- 6. Sample Exam: T1 Exam
insert into exams (id, course_id, title, kind, max_marks, paper_path, mask_region, expected_pages, status)
values (
  '55555555-5555-5555-5555-555555555555',
  '22222222-2222-2222-2222-222222222222',
  'Test 1 (T1) Examination: Algorithms & Data Structures',
  'T1',
  20.0,
  'courses/cs301/exams/t1_paper.pdf',
  '{"page": 1, "x": 0.1, "y": 0.05, "w": 0.8, "h": 0.2}'::jsonb,
  12,
  'rubric_ready'
) on conflict (id) do nothing;

-- 7. Sample Extracted Questions
insert into questions (id, exam_id, label, ord, text, max_marks, answer_type, bloom, printed_co)
values
  (
    '66666666-6666-6666-6666-666666666601',
    '55555555-5555-5555-5555-555555555555',
    '1a',
    1,
    'Define Big-O, Big-Omega, and Big-Theta notations. Prove that 3n^2 + 5n + 2 = O(n^2).',
    3.0,
    'theory',
    'understand',
    'CO1'
  ),
  (
    '66666666-6666-6666-6666-666666666602',
    '55555555-5555-5555-5555-555555555555',
    '1b',
    2,
    'Solve the recurrence relation T(n) = 2T(n/2) + n*log(n) using Master''s Theorem or substitution.',
    3.5,
    'numeric',
    'apply',
    'CO1'
  ),
  (
    '66666666-6666-6666-6666-666666666603',
    '55555555-5555-5555-5555-555555555555',
    '2a',
    3,
    'Write a recursive C/C++ function to compute the height of a binary tree and analyze its worst-case space complexity.',
    4.5,
    'code',
    'apply',
    'CO2'
  ),
  (
    '66666666-6666-6666-6666-666666666604',
    '55555555-5555-5555-5555-555555555555',
    '2b',
    4,
    'Draw the resulting AVL tree after sequentially inserting keys: 45, 12, 67, 89, 56, 34, 23. Clearly show all LL/RR/LR rotations.',
    4.0,
    'diagram',
    'analyze',
    'CO2'
  ),
  (
    '66666666-6666-6666-6666-666666666605',
    '55555555-5555-5555-5555-555555555555',
    '3',
    5,
    'Construct a Max-Heap from the array [14, 28, 9, 35, 42, 60]. Show array representation after each step of bottom-up heapify.',
    5.0,
    'theory',
    'apply',
    'CO3'
  )
on conflict (exam_id, label) do nothing;

-- 8. Sample Rubric Version (Frozen and Approved)
insert into rubric_versions (id, exam_id, version, status, source, approved_at)
values (
  '77777777-7777-7777-7777-777777777777',
  '55555555-5555-5555-5555-555555555555',
  1,
  'approved',
  'typed_key',
  now()
) on conflict (exam_id, version) do nothing;

-- 9. Sample Rubric Items (Granular criteria: 0.5 to 3 marks)
insert into rubric_items (
  id, rubric_version_id, question_id, criterion_key, description,
  marks, accept_alternatives, common_errors, final_answer, tolerance_pct, units, ord
)
values
  -- Q1a (3.0 Marks)
  (
    '88888888-8888-8888-8888-888888888801',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666601',
    'q1a.c1',
    'Accurate formal definition of Big-O, Big-Omega, and Big-Theta notations including constants c and n0.',
    1.5,
    '{"Limit definition method", "Standard inequality definition"}',
    '{"Omitting constant c or threshold n0", "Confusing Omega with little-o"}',
    null, null, null, 1
  ),
  (
    '88888888-8888-8888-8888-888888888802',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666601',
    'q1a.c2',
    'Valid algebraic proof that 3n^2 + 5n + 2 <= c*n^2 for specified c and n0 (e.g. c=4, n0=2 or c=10, n0=1).',
    1.5,
    '{"c=4 and n0=2", "c=10 and n0=1", "Ratio test limit as n approaches infinity"}',
    '{"Writing equals sign instead of inequality", "Failing to state values for c or n0"}',
    null, null, null, 2
  ),
  -- Q1b (3.5 Marks)
  (
    '88888888-8888-8888-8888-888888888803',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666602',
    'q1b.c1',
    'Identification of Master Theorem parameters a=2, b=2, and computation of n^(log_b a) = n.',
    1.5,
    '{"Substitution expansion method"}',
    '{"Incorrect parameter identification", "Log base error"}',
    null, null, null, 3
  ),
  (
    '88888888-8888-8888-8888-888888888804',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666602',
    'q1b.c2',
    'Correct application of Master Theorem Extended Case 2 (f(n) = Theta(n * log^k n) with k=1).',
    2.0,
    '{"Step-by-step tree level summation"}',
    '{"Directly writing answer without showing case conditions"}',
    'Theta(n * log^2 n)', null, null, 4
  ),
  -- Q2a (4.5 Marks)
  (
    '88888888-8888-8888-8888-888888888805',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666603',
    'q2a.c1',
    'Base condition handling empty tree (root == NULL returns 0 or -1 according to definition).',
    1.0,
    '{"Empty node returns 0", "Empty node returns -1"}',
    '{"Null pointer dereference without checking root"}',
    null, null, null, 5
  ),
  (
    '88888888-8888-8888-8888-888888888806',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666603',
    'q2a.c2',
    'Recursive calls on left and right subtrees with correct max aggregation: max(height(left), height(right)) + 1.',
    2.0,
    '{"Ternary operator", "Explicit if-else conditional"}',
    '{"Omitting the + 1 root increment", "Re-evaluating subtree twice"}',
    null, null, null, 6
  ),
  (
    '88888888-8888-8888-8888-888888888807',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666603',
    'q2a.c3',
    'Worst-case space complexity analysis citing O(n) or O(h) recursion call stack depth.',
    1.5,
    '{"O(h) where h is tree height", "O(n) for degenerate skewed tree"}',
    '{"Claiming O(1) auxiliary space without considering call stack"}',
    'O(n) worst case', null, null, 7
  ),
  -- Q2b (4.0 Marks)
  (
    '88888888-8888-8888-8888-888888888808',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666604',
    'q2b.c1',
    'Step-by-step insertion of initial nodes with balance factors calculated correctly.',
    1.5,
    '{"Balance factors listed as integers -1, 0, +1"}',
    '{"Incorrect balance factor sign convention"}',
    null, null, null, 8
  ),
  (
    '88888888-8888-8888-8888-888888888809',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666604',
    'q2b.c2',
    'Accurate execution of rotation upon balance violation and correct final AVL tree diagram.',
    2.5,
    '{"Single right rotation followed by left", "Double LR rotation diagram"}',
    '{"Failing to recompute balance factors after rotation"}',
    'Root is 45 with balanced subtrees', null, null, 9
  ),
  -- Q3 (5.0 Marks)
  (
    '88888888-8888-8888-8888-888888888810',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666605',
    'q3.c1',
    'Initial tree representation and identification of first non-leaf node index (n/2 - 1).',
    1.5,
    '{"1-based index or 0-based index"}',
    '{"Starting heapify from leaf nodes"}',
    null, null, null, 10
  ),
  (
    '88888888-8888-8888-8888-888888888811',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666605',
    'q3.c2',
    'Step-by-step down-heapify operations showing element swaps with larger child.',
    2.0,
    '{"Tree drawings for each swap", "Array state representations"}',
    '{"Swapping with smaller child"}',
    null, null, null, 11
  ),
  (
    '88888888-8888-8888-8888-888888888812',
    '77777777-7777-7777-7777-777777777777',
    '66666666-6666-6666-6666-666666666605',
    'q3.c3',
    'Final Max-Heap array configuration satisfying parent >= left child and parent >= right child.',
    1.5,
    '{"[60, 42, 14, 35, 28, 9]"}',
    '{"Violating heap order at root"}',
    '[60, 42, 14, 35, 28, 9]', null, null, 12
  )
on conflict do nothing;

-- Total Rubric Marks: 1.5 + 1.5 + 1.5 + 2.0 + 1.0 + 2.0 + 1.5 + 1.5 + 2.5 + 1.5 + 2.0 + 1.5 = 20.0 Marks.
