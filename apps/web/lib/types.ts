// Canonical Deskwork Shared Type System
// Synchronized with PostgreSQL 0001_init.sql and worker Pydantic schemas.

export type ExamKind = "T1" | "T2" | "END_SEM" | "ASSIGNMENT" | "QUIZ" | "OTHER";
export type ExamStatus = "draft" | "rubric_ready" | "grading" | "review" | "final";

export type AnswerType = "theory" | "numeric" | "code" | "diagram" | "mcq";
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";

export type RubricSource = "typed_key" | "handwritten_key" | "manual" | "generated";
export type RubricVersionStatus = "draft" | "approved" | "superseded";

export type SubmissionStatus = "uploaded" | "ready" | "grading" | "graded" | "reviewed" | "error";
export type GraderId = "A" | "B" | "regrade";

export type GradingFlag =
  | "cross_page"
  | "crossed_out"
  | "diagram"
  | "code"
  | "illegible"
  | "unanswered"
  | "alt_method"
  | "possible_misread"
  | "numeric_mismatch";

export type ReviewStatus = "pending" | "flagged" | "accepted" | "edited" | "spot_checked";

export type JobKind =
  | "extract_material"
  | "extract_paper"
  | "build_rubric"
  | "ingest_scripts"
  | "grade_booklet"
  | "finalize_flags"
  | "generate_set"
  | "export_results";

export type JobStatus = "queued" | "running" | "done" | "error";

export type MaterialKind = "slides" | "notes" | "assignment" | "pyq" | "other";
export type MaterialStatus = "uploaded" | "extracted" | "error";

// Database Record Interfaces

export interface Profile {
  id: string;
  full_name: string | null;
  institution: string | null;
  created_at: string;
}

export interface ExamSchemeComponent {
  kind: string;
  max: number;
}

export interface ExamScheme {
  id: string;
  owner_id: string | null;
  name: string;
  components: ExamSchemeComponent[];
}

export interface Course {
  id: string;
  owner_id: string;
  code: string;
  name: string;
  semester: string | null;
  section: string | null;
  scheme_id: string | null;
  created_at: string;
  scheme?: ExamScheme;
}

export interface Material {
  id: string;
  course_id: string;
  kind: MaterialKind;
  title: string;
  unit: string | null;
  storage_path: string;
  status: MaterialStatus;
  created_at: string;
}

export interface MaterialPage {
  id: string;
  material_id: string;
  page_no: number;
  text: string | null;
  topics: string[] | null;
}

export interface Student {
  id: string;
  course_id: string;
  anon_id: string; // S001, S002
  roll_no: string | null;
  name: string | null;
}

export interface MaskRegion {
  page: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Exam {
  id: string;
  course_id: string;
  title: string;
  kind: ExamKind;
  max_marks: number | null;
  paper_path: string | null;
  mask_region: MaskRegion | null;
  expected_pages: number | null;
  status: ExamStatus;
  created_at: string;
}

export interface Question {
  id: string;
  exam_id: string;
  label: string; // "1", "2a", "2b"
  ord: number;
  text: string;
  max_marks: number;
  answer_type: AnswerType;
  bloom: BloomLevel | null;
  printed_co: string | null; // Printed reference text only; never used in logic
}

export interface RubricVersion {
  id: string;
  exam_id: string;
  version: number;
  status: RubricVersionStatus;
  source: RubricSource;
  key_path: string | null;
  approved_at: string | null;
}

export interface RubricItem {
  id: string;
  rubric_version_id: string;
  question_id: string;
  criterion_key: string; // "q1a.c1"
  description: string;
  marks: number; // 0.5 to 3 in steps of 0.5
  accept_alternatives: string[];
  common_errors: string[];
  final_answer: string | null;
  tolerance_pct: number | null;
  units: string | null;
  ord: number;
}

export interface SubmissionQuality {
  page_count_ok: boolean;
  blurry_pages: number[];
}

export interface Submission {
  id: string;
  exam_id: string;
  student_id: string | null;
  storage_path: string;
  page_count: number | null;
  quality: SubmissionQuality | null;
  status: SubmissionStatus;
  created_at: string;
  student?: Student;
}

export interface SubmissionPage {
  id: string;
  submission_id: string;
  page_no: number;
  image_path: string;
  blur_score: number | null;
  masked: boolean;
}

export interface GradingRun {
  id: string;
  submission_id: string;
  rubric_version_id: string;
  grader: GraderId;
  model: string;
  prompt_version: string;
  cache_key: string;
  raw: Record<string, unknown> | null;
  input_tokens: number | null;
  output_tokens: number | null;
  latency_ms: number | null;
  status: string;
  error: string | null;
  created_at: string;
}

export interface AnswerGrade {
  id: string;
  run_id: string;
  question_id: string;
  pages: number[];
  transcript: string | null;
  final_answer: string | null;
  flags: GradingFlag[];
  confidence: number | null;
  total: number | null;
}

export interface CriterionScore {
  id: string;
  answer_grade_id: string;
  rubric_item_id: string;
  points: number;
  evidence: string | null;
}

export interface FinalMarkCriterion {
  rubric_item_id: string;
  points: number;
}

export interface FinalMark {
  id: string;
  submission_id: string;
  question_id: string;
  ai_marks: number | null;
  marks: number | null;
  criteria: FinalMarkCriterion[] | null;
  review_status: ReviewStatus;
  flag_reasons: string[];
  reviewed_by: string | null;
  reviewed_at: string | null;
}

export interface AuditLog {
  id: number;
  course_id: string | null;
  entity: string;
  entity_id: string;
  action: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  actor: string | null;
  at: string;
}

export interface JobProgress {
  pct?: number;
  message?: string;
  current?: number;
  total?: number;
  step?: string;
}

export interface Job {
  id: number;
  kind: JobKind;
  payload: Record<string, unknown>;
  status: JobStatus;
  attempts: number;
  progress: JobProgress | null;
  error: string | null;
  run_after: string;
  locked_at: string | null;
  created_at: string;
}

// Composite types used in UI components

export interface QuestionWithRubricItems extends Question {
  rubric_items?: RubricItem[];
}

export interface RubricEditorState {
  questions: Array<{
    question: Question;
    items: RubricItem[];
  }>;
  totalMarks: number;
  maxMarks: number;
  isValid: boolean;
}

export interface ExamWithDetails extends Exam {
  course?: Course;
  questions?: Question[];
  rubric_version?: RubricVersion;
  submission_count?: number;
  graded_count?: number;
  flagged_count?: number;
}
