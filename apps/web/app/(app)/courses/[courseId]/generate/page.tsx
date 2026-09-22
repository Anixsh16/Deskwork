"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  Printer,
  FileText,
  FileCheck2,
  CheckCircle2,
  RefreshCw,
  FileCode
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

export default function GeneratorPage() {
  const params = useParams();
  const courseId = (params?.courseId as string) || "c-cs301-2026";

  const [units, setUnits] = useState(["Unit 1", "Unit 2"]);
  const [totalMarks, setTotalMarks] = useState(20);
  const [difficulty, setDifficulty] = useState("Medium");
  const [generated, setGenerated] = useState(true);

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/courses/${courseId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] hover:text-[#2A4A9A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Course Workspace</span>
        </Link>
        <span className="text-xs text-[#5A6377]">
          Module Ownership: Person 4 (Course Materials & Generator)
        </span>
      </div>

      <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
              Slide-Grounded Generator
            </span>
            <span className="text-xs text-[#5A6377]">
              CS301 Course Materials
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1] mt-2">
            Question Paper and Assignment Generator
          </h1>
          <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-1">
            Questions, model solutions, and rubric criteria are drafted directly from uploaded lecture slide text with exact page citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Feature id="multipleSets">
            <button
              type="button"
              className="px-3 py-2 text-xs font-semibold text-[#5A6377] border border-dashed rounded-lg"
            >
              Create Sets A/B/C
            </button>
          </Feature>

          <Feature id="wordExport">
            <button
              type="button"
              className="px-3 py-2 text-xs font-semibold text-[#5A6377] border border-dashed rounded-lg"
            >
              Export as Word
            </button>
          </Feature>

          <Link
            href={`/courses/${courseId}/exams/new`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
          >
            <span>Use As Live Exam</span>
            <FileCheck2 className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Split Generator Interface: Left Form / Right Paper Preview */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Form (4 cols) */}
        <div className="md:col-span-5 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6377]">
            Generation Configuration
          </h3>

          <div>
            <label className="block text-xs font-semibold mb-1">Target Syllabus Units</label>
            <div className="space-y-1 text-xs">
              {["Unit 1: Asymptotics & Recurrences", "Unit 2: Trees & AVL Rotations", "Unit 3: Priority Queues & Heaps"].map((u, i) => (
                <label key={i} className="flex items-center gap-2 p-2 rounded border bg-[#F7F8FA] dark:bg-[#11141B] cursor-pointer">
                  <input type="checkbox" defaultChecked={i < 2} />
                  <span>{u}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold block mb-1">Target Marks</label>
              <input
                type="number"
                value={totalMarks}
                onChange={(e) => setTotalMarks(parseInt(e.target.value, 10) || 20)}
                className="w-full p-2 border rounded font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="Standard">Standard (Mid-Sem)</option>
                <option value="Challenging">Challenging (End-Sem)</option>
                <option value="Conceptual">Conceptual Quiz</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => alert("Generator invoked with Gemini 3.5 Flash-Lite (Call C5).")}
            className="w-full py-2.5 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            <span>Regenerate from Course Slides</span>
          </button>
        </div>

        {/* Right Preview (7 cols) */}
        <div className="md:col-span-7 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6377]">
              Generated Printable Paper Preview
            </h3>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1 text-xs text-[#2A4A9A] font-semibold hover:underline"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print to PDF</span>
            </button>
          </div>

          <div className="p-6 border rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] space-y-4 font-mono text-xs">
            <div className="text-center border-b pb-3 space-y-0.5">
              <div className="font-bold text-sm text-[#1A2030] dark:text-[#E4E8F1]">
                JAYPEE INSTITUTE OF INFORMATION TECHNOLOGY
              </div>
              <div className="text-[11px] text-[#5A6377]">
                Department of Computer Science & Engineering · CS301
              </div>
              <div className="text-[11px] text-[#5A6377]">
                Max Marks: {totalMarks} · Time Allowed: 1 Hour
              </div>
            </div>

            <div className="space-y-4 text-[11px] text-[#1A2030] dark:text-[#E4E8F1]">
              <div className="flex justify-between">
                <div>
                  <span className="font-bold">Q1.</span> Explain the Master Theorem conditions and derive the time complexity of T(n) = 4T(n/2) + n^2.
                </div>
                <div className="font-bold shrink-0 ml-4">[5 Marks]</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="font-bold">Q2.</span> Describe the four rotation cases of AVL trees (LL, RR, LR, RL) with balance factors.
                </div>
                <div className="font-bold shrink-0 ml-4">[5 Marks]</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="font-bold">Q3.</span> Given an empty min-heap, trace insertion of keys: 15, 30, 25, 10, 5, 20.
                </div>
                <div className="font-bold shrink-0 ml-4">[5 Marks]</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="font-bold">Q4.</span> Write recursive pseudocode to verify whether a given binary tree satisfies the Binary Search Tree property.
                </div>
                <div className="font-bold shrink-0 ml-4">[5 Marks]</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
