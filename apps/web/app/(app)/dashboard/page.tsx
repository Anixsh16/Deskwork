"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Sparkles,
  BookOpen,
  Calendar,
  PenTool,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  GraduationCap,
  Users,
  Layers,
  ChevronRight,
  CheckCircle2,
  X
} from "lucide-react";
import { Feature } from "@/components/coming-soon";
import { Course, Exam } from "@/lib/types";

// Initial sample courses and active exams for realistic teacher experience
const INITIAL_COURSES: Course[] = [
  {
    id: "c-cs301-2026",
    owner_id: "p-001",
    code: "CS301",
    name: "Data Structures and Algorithms",
    semester: "Odd 2026",
    section: "B3 (CSE)",
    scheme_id: "00000000-0000-0000-0000-000000000001",
    created_at: new Date().toISOString(),
  },
  {
    id: "c-cs402-2026",
    owner_id: "p-001",
    code: "CS402",
    name: "Operating Systems and System Software",
    semester: "Odd 2026",
    section: "B1 (CSE)",
    scheme_id: "00000000-0000-0000-0000-000000000001",
    created_at: new Date().toISOString(),
  },
];

const RECENT_EXAMS = [
  {
    id: "exam-t1-cs301",
    courseId: "c-cs301-2026",
    courseCode: "CS301",
    title: "Test 1 (T1) Evaluation",
    kind: "T1",
    maxMarks: 20,
    status: "review",
    bookletsCount: 42,
    flaggedCount: 6,
    reviewedCount: 36,
  },
  {
    id: "exam-t2-cs402",
    courseId: "c-cs402-2026",
    courseCode: "CS402",
    title: "Test 2 (T2) Theory and Numerical",
    kind: "T2",
    maxMarks: 20,
    status: "rubric_ready",
    bookletsCount: 38,
    flaggedCount: 0,
    reviewedCount: 0,
  },
];

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newSemester, setNewSemester] = useState("Odd 2026");
  const [newSection, setNewSection] = useState("B4");

  const handleCreateCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) return;

    const newCourse: Course = {
      id: `c-${newCode.toLowerCase().replace(/[^a-z0-9]/g, "")}-${Date.now()}`,
      owner_id: "p-001",
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      semester: newSemester,
      section: newSection,
      scheme_id: "00000000-0000-0000-0000-000000000001",
      created_at: new Date().toISOString(),
    };

    setCourses((prev) => [newCourse, ...prev]);
    setNewCode("");
    setNewName("");
    setCreateModalOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
      {/* Header Greeting */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#DCE0E8] dark:border-[#2C3342] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
              JIIT Noida Faculty Portal
            </span>
            <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
              Academic Session 2026
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1] mt-1.5">
            Examiner Workspace
          </h1>
          <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
            Set the paper, check the papers, clear the desk.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Course</span>
          </button>
        </div>
      </div>

      {/* Primary Action Cards: "What do you want to do?" */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6] mb-3">
          Quick Workflows
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {/* Card 1: Check papers (Live) */}
          <Link
            href="/courses/c-cs301-2026/exams/new"
            className="group p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] hover:border-[#2A4A9A] hover:shadow-xs transition-all flex flex-col justify-between h-36"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-[#FBEAE8] text-[#B8352A]">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded">
                Live
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1A2030] dark:text-[#E4E8F1] group-hover:text-[#2A4A9A] transition-colors flex items-center justify-between">
                <span>Check Papers</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1 leading-snug">
                Extract paper, approve rubric, and grade booklets.
              </p>
            </div>
          </Link>

          {/* Card 2: Generate assignment (Live) */}
          <Link
            href="/courses/c-cs301-2026"
            className="group p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] hover:border-[#2A4A9A] hover:shadow-xs transition-all flex flex-col justify-between h-36"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-[#E6ECFA] text-[#2A4A9A]">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded">
                Live
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1A2030] dark:text-[#E4E8F1] group-hover:text-[#2A4A9A] transition-colors flex items-center justify-between">
                <span>Set Assignment</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1 leading-snug">
                Generate questions and key directly from lecture slides.
              </p>
            </div>
          </Link>

          {/* Card 3: Ask Assistant (Live) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "j",
                ctrlKey: true,
                bubbles: true,
              });
              window.dispatchEvent(event);
            }}
            className="cursor-pointer group p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] hover:border-[#2A4A9A] hover:shadow-xs transition-all flex flex-col justify-between h-36"
          >
            <div className="flex items-start justify-between">
              <div className="p-2 rounded-lg bg-[#E6ECFA] text-[#2A4A9A]">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-semibold text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded">
                Live
              </span>
            </div>
            <div>
              <div className="text-sm font-semibold text-[#1A2030] dark:text-[#E4E8F1] group-hover:text-[#2A4A9A] transition-colors flex items-center justify-between">
                <span>Ask Assistant</span>
                <span className="text-[10px] font-mono text-[#5A6377]">Ctrl+J</span>
              </div>
              <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1 leading-snug">
                Ask about syllabus content, exam results, or rubric rules.
              </p>
            </div>
          </div>

          {/* Card 4: Plan a lesson (Coming Soon) */}
          <Feature id="lessonPlanner" className="h-36 w-full p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#222835] text-[#5A6377]">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                Plan a Lesson
              </div>
              <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1 leading-snug">
                Turn a syllabus unit into structured lecture topics.
              </p>
            </div>
          </Feature>

          {/* Card 5: Write feedback (Coming Soon) */}
          <Feature id="feedbackWriter" className="h-36 w-full p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between w-full">
              <div className="p-2 rounded-lg bg-[#F7F8FA] dark:bg-[#222835] text-[#5A6377]">
                <PenTool className="w-5 h-5" />
              </div>
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                Write Feedback
              </div>
              <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1 leading-snug">
                Draft student advice notes from criterion scores.
              </p>
            </div>
          </Feature>
        </div>
      </div>

      {/* Exams Needing Attention & Recent Runs */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
            Exams in Progress
          </h2>
          <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
            {RECENT_EXAMS.length} active assessments
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RECENT_EXAMS.map((exam) => (
            <div
              key={exam.id}
              className="p-5 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex flex-col justify-between space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#E6ECFA] text-[#2A4A9A] dark:bg-[#1E2A47] dark:text-[#93AEF2]">
                      {exam.courseCode}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#F7F8FA] text-[#5A6377] dark:bg-[#222835] dark:text-[#9AA3B6]">
                      {exam.kind} ({exam.maxMarks} Marks)
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1A2030] dark:text-[#E4E8F1] mt-1.5">
                    {exam.title}
                  </h3>
                </div>

                {exam.status === "review" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBEAE8] text-[#B8352A]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{exam.flaggedCount} Flagged</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F3EA] text-[#1F7A4D]">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Rubric Ready</span>
                  </span>
                )}
              </div>

              {/* Progress Summary */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#5A6377] dark:text-[#9AA3B6]">
                  <span>Evaluation Status</span>
                  <span className="font-mono">
                    {exam.reviewedCount} / {exam.bookletsCount} booklets verified
                  </span>
                </div>
                <div className="w-full bg-[#E9ECF2] dark:bg-[#222835] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#2A4A9A] h-full rounded-full transition-all"
                    style={{
                      width: `${(exam.reviewedCount / exam.bookletsCount) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
                <Link
                  href={`/exams/${exam.id}/rubric`}
                  className="text-xs font-medium text-[#5A6377] hover:text-[#2A4A9A] transition-colors"
                >
                  View Rubric
                </Link>
                <Link
                  href={`/exams/${exam.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#2A4A9A] dark:text-[#93AEF2] hover:underline"
                >
                  <span>Open Exam Hub</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* My Courses Section */}
      <div id="courses">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
            My Teaching Courses
          </h2>
          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="text-xs font-semibold text-[#2A4A9A] hover:underline inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Course</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              href={`/courses/${course.id}`}
              className="p-5 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] hover:border-[#2A4A9A] hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
                    {course.code}
                  </span>
                  <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
                    {course.semester} · Sec {course.section}
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1] mt-2">
                  {course.name}
                </h3>
              </div>

              <div className="mt-6 pt-3 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between text-xs text-[#5A6377] dark:text-[#9AA3B6]">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>2 Exams</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    <span>60 Students</span>
                  </span>
                </div>
                <span className="font-semibold text-[#2A4A9A] dark:text-[#93AEF2] flex items-center gap-0.5">
                  Open Workspace
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Create Course Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E9ECF2] dark:border-[#222835]">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-[#2A4A9A]" />
                <h3 className="text-sm font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  Create New Course
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-[#5A6377] hover:text-[#1A2030]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCourse} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                  Course Code
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS501"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                  Course Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Database Management Systems"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                    Semester
                  </label>
                  <input
                    type="text"
                    value={newSemester}
                    onChange={(e) => setNewSemester(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                    Section
                  </label>
                  <input
                    type="text"
                    value={newSection}
                    onChange={(e) => setNewSection(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                  Exam Scheme Preset
                </label>
                <input
                  type="text"
                  readOnly
                  value="JIIT B.Tech Standard (T1: 20, T2: 20, End Sem: 35, TA: 25)"
                  className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#5A6377] select-none cursor-not-allowed"
                />
              </div>

              <div className="pt-3 border-t border-[#E9ECF2] dark:border-[#222835] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-[#5A6377] hover:text-[#1A2030]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#2A4A9A] text-white rounded-lg hover:bg-[#2A4A9A]/90 transition-colors"
                >
                  Create Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
