"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Eye,
  EyeOff,
  BarChart3,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Sparkles
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

const STUDENT_RESULTS = [
  { anon_id: "S001", name: "Aarav Sharma", q1a: 3.0, q1b: 3.5, q2a: 4.5, q2b: 4.0, q3: 5.0, total: 20.0 },
  { anon_id: "S002", name: "Ananya Verma", q1a: 3.0, q1b: 2.5, q2a: 4.0, q2b: 3.5, q3: 4.5, total: 17.5 },
  { anon_id: "S003", name: "Bhavya Gupta", q1a: 2.0, q1b: 2.0, q2a: 3.5, q2b: 4.0, q3: 3.5, total: 15.0 },
  { anon_id: "S004", name: "Chirag Saxena", q1a: 1.5, q1b: 1.5, q2a: 2.0, q2b: 2.5, q3: 3.0, total: 10.5 },
  { anon_id: "S005", name: "Divya Mishra", q1a: 3.0, q1b: 3.5, q2a: 4.5, q2b: 4.0, q3: 4.0, total: 19.0 },
  { anon_id: "S006", name: "Eshaan Joshi", q1a: 2.5, q1b: 3.0, q2a: 4.0, q2b: 3.0, q3: 4.5, total: 17.0 },
];

export default function ResultsPage() {
  const params = useParams();
  const examId = (params?.examId as string) || "exam-t1-cs301";

  const [showNames, setShowNames] = useState(false);

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/exams/${examId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] hover:text-[#2A4A9A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Exam Overview</span>
        </Link>
        <span className="text-xs text-[#5A6377]">
          Module Ownership: Person 3 (Review & Results)
        </span>
      </div>

      <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
              CS301 · T1 Results
            </span>
            <span className="text-xs text-[#5A6377]">
              6 Booklets Evaluated · Average: 16.5 / 20.0
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1] mt-2">
            Examination Marks and Performance Distribution
          </h1>
          <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-1">
            Grading is relative. Review question-level averages and export audited marks to multi-sheet Excel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowNames(!showNames)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] hover:bg-[#F7F8FA] transition-colors"
          >
            {showNames ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            <span>{showNames ? "Hide Student Names" : "Reveal Student Names"}</span>
          </button>

          <button
            type="button"
            onClick={() => alert("Excel export generated (Sheet 1: Student Marks, Sheet 2: Per-Question Statistics).")}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#1F7A4D] text-white hover:bg-[#1F7A4D]/90 transition-colors shadow-2xs"
          >
            <Download className="w-4 h-4" />
            <span>Export to Excel</span>
          </button>
        </div>
      </div>

      {/* Placeholders for Future Features */}
      <div className="flex gap-3">
        <Feature id="scriptShowingView">
          <button type="button" className="text-xs px-3 py-1.5 text-[#5A6377] border border-dashed rounded-lg">
            Script-Showing Day View
          </button>
        </Feature>

        <Feature id="analytics">
          <button type="button" className="text-xs px-3 py-1.5 text-[#5A6377] border border-dashed rounded-lg">
            Weak-Topic Trends Across Exams
          </button>
        </Feature>
      </div>

      {/* Marks Table */}
      <div className="rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] overflow-hidden">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-[#F7F8FA] dark:bg-[#11141B] border-b border-[#E9ECF2] dark:border-[#222835] text-[#5A6377] uppercase font-mono">
            <tr>
              <th className="py-2.5 px-4">Student ID</th>
              {showNames && <th className="py-2.5 px-4">Name</th>}
              <th className="py-2.5 px-3 text-right">Q1a (3.0)</th>
              <th className="py-2.5 px-3 text-right">Q1b (3.5)</th>
              <th className="py-2.5 px-3 text-right">Q2a (4.5)</th>
              <th className="py-2.5 px-3 text-right">Q2b (4.0)</th>
              <th className="py-2.5 px-3 text-right">Q3 (5.0)</th>
              <th className="py-2.5 px-4 text-right font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                Total (20.0)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E9ECF2] dark:divide-[#222835]">
            {STUDENT_RESULTS.map((row) => (
              <tr key={row.anon_id} className="hover:bg-[#F7F8FA]/60">
                <td className="py-3 px-4 font-mono font-bold text-[#2A4A9A]">
                  {row.anon_id}
                </td>
                {showNames && <td className="py-3 px-4 font-medium">{row.name}</td>}
                <td className="py-3 px-3 text-right font-mono">{row.q1a.toFixed(1)}</td>
                <td className="py-3 px-3 text-right font-mono">{row.q1b.toFixed(1)}</td>
                <td className="py-3 px-3 text-right font-mono">{row.q2a.toFixed(1)}</td>
                <td className="py-3 px-3 text-right font-mono">{row.q2b.toFixed(1)}</td>
                <td className="py-3 px-3 text-right font-mono">{row.q3.toFixed(1)}</td>
                <td className="py-3 px-4 text-right font-mono font-bold text-[#B8352A]">
                  <span className="score-badge">{row.total.toFixed(1)} / 20</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
