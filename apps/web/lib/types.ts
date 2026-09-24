import type { Source } from "@/lib/api";

export type Teacher = { id: string; email: string; full_name: string | null; avatar_url: string | null };

export type FileStatus = "queued" | "processing" | "ready" | "failed";
export type ParseStatus = "none" | "processing" | "ready" | "failed";
export type PaperStatus = "reading" | "ready" | "checking" | "checked" | "failed";
export type Bot = "assignment" | "solution" | "paper" | "ask";

export type CourseSummary = {
  id: string;
  name: string;
  code: string | null;
  semester: string | null;
  created_at: string;
  file_count: number;
  ready_files: number;
  exam_count: number;
};

export type CourseFile = {
  id: string;
  filename: string;
  mime: string;
  size_bytes: number;
  page_count: number | null;
  chunk_count: number | null;
  status: FileStatus;
  progress: number;
  error: string | null;
  created_at: string;
};

export type ExamSummary = {
  id: string;
  title: string;
  kind: string | null;
  total_marks: number | null;
  paper_status: ParseStatus;
  key_status: ParseStatus;
  created_at: string;
  course_id?: string;
  course_name?: string;
  course_code?: string | null;
  paper_count: number;
  checked_count: number;
  flagged_count?: number;
};

export type Course = CourseSummary & {
  institution: string | null;
  description: string | null;
  outcomes: string | null;
  files: CourseFile[];
  exams: ExamSummary[];
};

export type Part = { label: string; text: string; marks: number };
export type Question = { number: number; text: string; marks: number; co: string | null; has_figure: boolean; parts: Part[] };
export type MarkingPoint = { point: string; marks: number };
export type KeyItem = {
  question_number: number;
  part_label: string;
  answer: string;
  final_answer: string | null;
  marking_points: MarkingPoint[];
};

export type PaperRow = {
  id: string;
  student_name: string | null;
  enrollment_no: string | null;
  batch: string | null;
  filename: string;
  status: PaperStatus;
  error: string | null;
  total_marks: number | null;
  flagged_count: number;
  checked_by: "ai" | "teacher" | null;
  checked_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  page_count: number;
  question_marks: Record<string, { marks: number | null; flagged: boolean }>;
};

export type Exam = ExamSummary & {
  course_id: string;
  course_name: string;
  course_code: string | null;
  duration: string | null;
  paper_filename: string | null;
  paper_error: string | null;
  paper_notice: string | null;
  paper_text: string | null;
  key_filename: string | null;
  key_error: string | null;
  key_text: string | null;
  questions: Question[];
  key_items: KeyItem[];
  paper_page_urls: string[];
  key_page_urls: string[];
  papers: PaperRow[];
};

export type Mark = {
  question_number: number;
  part_label: string;
  max_marks: number;
  attempted: boolean;
  marks_a: number | null;
  marks_b: number | null;
  final_marks: number | null;
  source: "ai" | "teacher";
  flagged: boolean;
  flag_reason: string | null;
  student_answer: string | null;
  reasoning: string | null;
  reasoning_b: string | null;
  mistakes: string[];
  confidence: number | null;
  pages: number[];
  teacher_note: string | null;
};

export type PaperDetail = PaperRow & {
  pages: string[];
  page_urls: string[];
  summary: string | null;
  marks: Mark[];
  exam: { id: string; title: string; total_marks: number | null; course_id: string; course_name: string };
  questions: Question[];
  key_items: KeyItem[];
  edits: { question_number: number; part_label: string; old_marks: number | null; new_marks: number | null; note: string | null; created_at: string }[];
  prev_id: string | null;
  next_id: string | null;
};

export type ChatSummary = { id: string; bot: Bot; title: string; updated_at: string };
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  attachment_ids: string[];
  status: "streaming" | "done" | "failed";
  created_at: string;
};
export type Chat = ChatSummary & { messages: ChatMessage[]; attachments: { id: string; filename: string }[] };
export type Generated = { id: string; bot: Bot; title: string; created_at: string; preview: string };

export const num = (v: number | string | null | undefined) => (v === null || v === undefined ? null : Number(v));
export const fmt = (v: number | string | null | undefined) => {
  const n = num(v);
  return n === null ? "-" : Number.isInteger(n) ? String(n) : n.toFixed(1);
};
