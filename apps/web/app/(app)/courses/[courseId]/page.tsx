"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileCheck2,
  BookOpen,
  Users,
  Database,
  Plus,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Search
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

interface ExamItem {
  id: string;
  title: string;
  kind: "T1" | "T2" | "END_SEM" | "ASSIGNMENT";
  maxMarks: number;
  status: "draft" | "rubric_ready" | "grading" | "review" | "final";
  questionsCount: number;
  submissionsCount: number;
  flaggedCount: number;
}

const SAMPLE_EXAMS: ExamItem[] = [
  {
    id: "exam-t1-cs301",
    title: "Test 1 (T1) Examination",
    kind: "T1",
    maxMarks: 20,
    status: "review",
    questionsCount: 4,
    submissionsCount: 42,
    flaggedCount: 6,
  },
  {
    id: "exam-t2-cs301",
    title: "Test 2 (T2) Theory and Numerical",
    kind: "T2",
    maxMarks: 20,
    status: "rubric_ready",
    questionsCount: 5,
    submissionsCount: 0,
    flaggedCount: 0,
  },
  {
    id: "exam-assign1-cs301",
    title: "Assignment 1: Trees and Balanced Structures",
    kind: "ASSIGNMENT",
    maxMarks: 25,
    status: "draft",
    questionsCount: 3,
    submissionsCount: 0,
    flaggedCount: 0,
  },
];

const SAMPLE_MATERIALS = [
  {
    id: "mat-1",
    title: "Unit 1: Algorithmic Asymptotics and Recurrences",
    unit: "Unit 1",
    pages: 34,
    status: "extracted",
    date: "14 Aug 2026",
  },
  {
    id: "mat-2",
    title: "Unit 2: Trees, AVL Rotations and Red-Black Properties",
    unit: "Unit 2",
    pages: 48,
    status: "extracted",
    date: "28 Aug 2026",
  },
  {
    id: "mat-3",
    title: "Unit 3: Priority Queues, Heaps and Disjoint Sets",
    unit: "Unit 3",
    pages: 26,
    status: "extracted",
    date: "10 Sep 2026",
  },
];

const SAMPLE_STUDENTS = [
  { anon_id: "S001", roll_no: "21103001", name: "Aarav Sharma" },
  { anon_id: "S002", roll_no: "21103002", name: "Ananya Verma" },
  { anon_id: "S003", roll_no: "21103003", name: "Bhavya Gupta" },
  { anon_id: "S004", roll_no: "21103004", name: "Chirag Saxena" },
  { anon_id: "S005", roll_no: "21103005", name: "Divya Mishra" },
  { anon_id: "S006", roll_no: "21103006", name: "Eshaan Joshi" },
];

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || "c-cs301-2026";
  const [activeTab, setActiveTab] = useState<"exams" | "materials" | "students" | "bank">("exams");
  const [studentSearch, setStudentSearch] = useState("");

  const filteredStudents = SAMPLE_STUDENTS.filter(
    (s) =>
      s.anon_id.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.roll_no.includes(studentSearch) ||
      s.name.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const isCS402 = courseId.toLowerCase().includes("cs402");
  const courseCode = isCS402 ? "CS402" : "CS301";
  const courseName = isCS402
    ? "Operating Systems and System Software"
    : "Data Structures and Algorithms";
  const courseSection = isCS402 ? "Odd Semester 2026 · Section B1" : "Odd Semester 2026 · Section B3";

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      {/* Top Navigation Back to Dashboard */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] transition-colors group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Dashboard</span>
        </Link>
        <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
          Course Workspace
        </span>
      </div>

      {/* Course Summary Banner */}
      <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
                {courseCode}
              </span>
              <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
                {courseSection}
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#F7F8FA] dark:bg-[#222835] text-[#5A6377] dark:text-[#9AA3B6]">
                JIIT Exam Scheme (T1, T2, End Sem, TA)
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1] mt-2">
              {courseName}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/courses/${courseId}/exams/new`}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Exam</span>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-6 mt-6 border-b border-[#E9ECF2] dark:border-[#222835]">
          <button
            type="button"
            onClick={() => setActiveTab("exams")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "exams"
                ? "border-[#2A4A9A] text-[#2A4A9A] dark:text-[#93AEF2]"
                : "border-transparent text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#1A2030]"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Exams ({SAMPLE_EXAMS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("materials")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "materials"
                ? "border-[#2A4A9A] text-[#2A4A9A] dark:text-[#93AEF2]"
                : "border-transparent text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#1A2030]"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Materials ({SAMPLE_MATERIALS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "students"
                ? "border-[#2A4A9A] text-[#2A4A9A] dark:text-[#93AEF2]"
                : "border-transparent text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#1A2030]"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Students ({SAMPLE_STUDENTS.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("bank")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === "bank"
                ? "border-[#2A4A9A] text-[#2A4A9A] dark:text-[#93AEF2]"
                : "border-transparent text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#1A2030]"
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Question Bank</span>
            <span className="text-[10px] text-[#9A6700] bg-[#FBF1D9] dark:bg-[#342A14] dark:text-[#E8BE5C] px-1.5 rounded">
              Soon
            </span>
          </button>
        </div>
      </div>

      {/* Tab 1: Exams */}
      {activeTab === "exams" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
              Course Assessments
            </h2>
            <Link
              href={`/courses/${courseId}/exams/new`}
              className="text-xs font-semibold text-[#2A4A9A] dark:text-[#93AEF2] hover:underline inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Assessment</span>
            </Link>
          </div>

          <div className="divide-y divide-[#E9ECF2] dark:divide-[#222835] rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] overflow-hidden">
            {SAMPLE_EXAMS.map((exam) => (
              <div
                key={exam.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#F7F8FA]/60 dark:hover:bg-[#222835]/40 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#2A4A9A] dark:text-[#93AEF2]">
                      {exam.kind}
                    </span>
                    <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
                      · Max: {exam.maxMarks} marks · {exam.questionsCount} questions
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                    {exam.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-[#5A6377] dark:text-[#9AA3B6] pt-1">
                    <span>{exam.submissionsCount} submissions</span>
                    {exam.flaggedCount > 0 && (
                      <span className="inline-flex items-center gap-1 text-[#B8352A] font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {exam.flaggedCount} flagged for review
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {exam.status === "review" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FBEAE8] text-[#B8352A]">
                      Review Active
                    </span>
                  )}
                  {exam.status === "rubric_ready" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#E3F3EA] text-[#1F7A4D]">
                      Rubric Approved
                    </span>
                  )}
                  {exam.status === "draft" && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#FBF1D9] text-[#9A6700]">
                      Setup in Progress
                    </span>
                  )}

                  <Link
                    href={`/exams/${exam.id}/rubric`}
                    className="px-3 py-1.5 text-xs font-medium text-[#5A6377] border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg hover:border-[#2A4A9A] hover:text-[#2A4A9A] transition-colors"
                  >
                    Rubric
                  </Link>

                  <Link
                    href={`/exams/${exam.id}`}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#2A4A9A] text-white rounded-lg hover:bg-[#2A4A9A]/90 transition-colors"
                  >
                    <span>Open Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Materials */}
      {activeTab === "materials" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
                Uploaded Course Slides
              </h2>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Slide decks are indexed with PostgreSQL full-text search to ground the assistant and paper generator.
              </p>
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1] hover:border-[#2A4A9A] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Slide Deck</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_MATERIALS.map((mat) => (
              <div
                key={mat.id}
                className="p-5 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex flex-col justify-between h-40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
                      {mat.unit}
                    </span>
                    <span className="text-[11px] text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded font-semibold">
                      Indexed
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1] mt-2 line-clamp-2">
                    {mat.title}
                  </h3>
                </div>
                <div className="pt-3 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between text-xs text-[#5A6377] dark:text-[#9AA3B6]">
                  <span>{mat.pages} pages extracted</span>
                  <span>{mat.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Students */}
      {activeTab === "students" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
                Enrolled Students
              </h2>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Pseudonymous IDs (S001, S002) are used during all AI grading calls to protect student privacy.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#5A6377] absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                />
              </div>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1] hover:border-[#2A4A9A] transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import CSV</span>
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] overflow-hidden">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#F7F8FA] dark:bg-[#11141B] border-b border-[#E9ECF2] dark:border-[#222835] text-[#5A6377] dark:text-[#9AA3B6] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Pseudonym (AI Visible)</th>
                  <th className="py-2.5 px-4 font-semibold">Roll Number (Private)</th>
                  <th className="py-2.5 px-4 font-semibold">Student Name (Private)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Privacy Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9ECF2] dark:divide-[#222835]">
                {filteredStudents.map((st) => (
                  <tr key={st.anon_id} className="hover:bg-[#F7F8FA]/60 dark:hover:bg-[#222835]/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#2A4A9A] dark:text-[#93AEF2]">
                      {st.anon_id}
                    </td>
                    <td className="py-3 px-4 font-mono text-[#1A2030] dark:text-[#E4E8F1]">
                      {st.roll_no}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#1A2030] dark:text-[#E4E8F1]">
                      {st.name}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded font-semibold">
                        <ShieldCheck className="w-3 h-3" />
                        Masked Locally
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Question Bank (Coming Soon) */}
      {activeTab === "bank" && (
        <div className="py-12 px-6 rounded-2xl border border-dashed border-[#DCE0E8] dark:border-[#2C3342] text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#FBF1D9] text-[#9A6700] dark:bg-[#342A14] dark:text-[#E8BE5C] flex items-center justify-center mx-auto">
            <Database className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              Course Question Bank
            </h3>
            <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-1 max-w-sm mx-auto">
              Reuse, tag, and organize vetted questions across past exams and upcoming semesters.
            </p>
          </div>
          <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full bg-[#FBF1D9] text-[#9A6700] dark:bg-[#342A14] dark:text-[#E8BE5C]">
            Scheduled for Final Milestone
          </span>
        </div>
      )}
    </div>
  );
}
