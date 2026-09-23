"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Upload,
  Layers,
  FileCheck2,
  Users,
  Clock,
  Sparkles,
  BarChart2,
  Eye,
  ShieldCheck
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

export default function ExamOverviewPage() {
  const params = useParams();
  const examId = (params?.examId as string) || "exam-t1-cs301";

  const isCS402 = examId.toLowerCase().includes("cs402");
  const courseCode = isCS402 ? "CS402" : "CS301";
  const courseId = isCS402 ? "c-cs402-2026" : "c-cs301-2026";

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
      {/* Top Breadcrumb & Status Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-xs text-[#5A6377]/40 dark:text-[#9AA3B6]/40">/</span>
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] transition-colors"
            >
              <span>Back to Course ({courseCode})</span>
            </Link>
          </div>

          <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
            Exam ID: {examId}
          </span>
        </div>

        <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
                CS301 · Test 1 (T1)
              </span>
              <span className="text-xs text-[#5A6377]">
                JIIT B.Tech Scheme · Max: 20.0 Marks
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F3EA] text-[#1F7A4D]">
                <Lock className="w-3 h-3" />
                <span>Rubric Approved (Frozen v1)</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1] mt-2">
              Test 1 (T1) Examination: Algorithms & Data Structures
            </h1>
            <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-1">
              Examination questions extracted, answer key transcribed, and marking rubric frozen. Ready for handwritten script evaluation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/exams/${examId}/rubric`}
              className="px-3.5 py-2 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1] hover:border-[#2A4A9A] transition-colors"
            >
              Inspect Rubric
            </Link>
            <Link
              href={`/exams/${examId}/scripts`}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
            >
              <span>Script Ingestion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24]">
          <div className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">Questions Configured</div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#1A2030] dark:text-[#E4E8F1]">
            5
          </div>
          <div className="text-[11px] text-[#5A6377] mt-1">
            Theory (2), Numeric (1), Code (1), Diagram (1)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24]">
          <div className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">Rubric Version</div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#1F7A4D]">
            v1.0 Frozen
          </div>
          <div className="text-[11px] text-[#5A6377] mt-1">
            12 granular criteria (0.5 to 3.0 pts)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24]">
          <div className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">Booklets Ingested</div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#2A4A9A] dark:text-[#93AEF2]">
            42 / 60
          </div>
          <div className="text-[11px] text-[#5A6377] mt-1">
            Names masked locally on device
          </div>
        </div>

        <div className="p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24]">
          <div className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">Dual-Model Disagreements</div>
          <div className="mt-1 text-2xl font-bold font-mono text-[#B8352A]">
            6 Flagged
          </div>
          <div className="text-[11px] text-[#5A6377] mt-1">
            Queued for forced teacher attention
          </div>
        </div>
      </div>

      {/* Operational Stepper Checklist */}
      <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
            Exam Lifecycle Checklist
          </h2>
          <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
            Progress through all seven examination checking milestones.
          </p>
        </div>

        <div className="space-y-4">
          {/* Milestone 1: Paper Extracted (Person 1) */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#E3F3EA]/50 border border-[#1F7A4D]/20">
            <CheckCircle2 className="w-5 h-5 text-[#1F7A4D] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  1. Question Paper Extracted (Person 1)
                </h4>
                <span className="text-[10px] font-semibold text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded">
                  Completed
                </span>
              </div>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Paper PDF parsed with Gemini 3.5 Flash-Lite. Labels, subparts, marks, and printed CO references verified.
              </p>
            </div>
          </div>

          {/* Milestone 2: Answer Key & Rubric (Person 1) */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#E3F3EA]/50 border border-[#1F7A4D]/20">
            <CheckCircle2 className="w-5 h-5 text-[#1F7A4D] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  2. Answer Key & Rubric Approved (Person 1)
                </h4>
                <Link
                  href={`/exams/${examId}/rubric`}
                  className="text-xs font-semibold text-[#2A4A9A] hover:underline"
                >
                  View Frozen Rubric
                </Link>
              </div>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Draft rubric generated from teacher key. 12 criteria frozen in version 1 for deterministic evaluation.
              </p>
            </div>
          </div>

          {/* Milestone 3: Script Capture & Local Masking (Person 2 Shell) */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] border border-[#DCE0E8] dark:border-[#2C3342]">
            <div className="w-5 h-5 rounded-full bg-[#2A4A9A] text-white flex items-center justify-center font-mono text-[11px] shrink-0 mt-0.5">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  3. Script Ingestion and Local Masking (Person 2)
                </h4>
                <Link
                  href={`/exams/${examId}/scripts`}
                  className="text-xs font-semibold text-[#2A4A9A] hover:underline"
                >
                  Open Scripts Hub
                </Link>
              </div>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Student booklets are rendered at 170 DPI, quality-checked for blur, and names masked locally before AI processing.
              </p>
            </div>
          </div>

          {/* Milestone 4: Dual-Model Grading (Person 2 Shell) */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] border border-[#DCE0E8] dark:border-[#2C3342]">
            <div className="w-5 h-5 rounded-full bg-[#E9ECF2] dark:bg-[#222835] text-[#5A6377] flex items-center justify-center font-mono text-[11px] shrink-0 mt-0.5">
              4
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  4. Dual-Model Evaluation (Person 2)
                </h4>
                <span className="text-[10px] text-[#5A6377] bg-[#E9ECF2] px-2 py-0.5 rounded">
                  Pending Script Batch
                </span>
              </div>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Gemini 3.5 Flash-Lite (Grader A) and Gemini 3.1 Flash-Lite (Grader B) evaluate each booklet directly from page images.
              </p>
            </div>
          </div>

          {/* Milestone 5: Forced Attention Review (Person 3 Shell) */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] border border-[#DCE0E8] dark:border-[#2C3342]">
            <div className="w-5 h-5 rounded-full bg-[#E9ECF2] dark:bg-[#222835] text-[#5A6377] flex items-center justify-center font-mono text-[11px] shrink-0 mt-0.5">
              5
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  5. Forced Attention Teacher Review (Person 3)
                </h4>
                <Link
                  href={`/exams/${examId}/review`}
                  className="text-xs font-semibold text-[#2A4A9A] hover:underline"
                >
                  Inspect Review Queue
                </Link>
              </div>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Marks stay hidden until the scan region is viewed. Discrepancies, code, and diagram answers require teacher sign-off.
              </p>
            </div>
          </div>

          {/* Milestone 6: Results & Excel Export (Person 3 Shell) */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] border border-[#DCE0E8] dark:border-[#2C3342]">
            <div className="w-5 h-5 rounded-full bg-[#E9ECF2] dark:bg-[#222835] text-[#5A6377] flex items-center justify-center font-mono text-[11px] shrink-0 mt-0.5">
              6
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  6. Results Distribution & Excel Export (Person 3)
                </h4>
                <Link
                  href={`/exams/${examId}/results`}
                  className="text-xs font-semibold text-[#2A4A9A] hover:underline"
                >
                  View Results Table
                </Link>
              </div>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Per-question performance statistics, marks histogram, and multi-sheet official college Excel export.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
