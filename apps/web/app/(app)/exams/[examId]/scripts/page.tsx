"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Upload,
  ArrowLeft,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Eye,
  Layers
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

const SAMPLE_BOOKLETS = [
  { id: "S001", pages: 12, expected: 12, blurScore: 185, status: "ready" },
  { id: "S002", pages: 12, expected: 12, blurScore: 142, status: "ready" },
  { id: "S003", pages: 11, expected: 12, blurScore: 92, status: "page_warning" },
  { id: "S004", pages: 12, expected: 12, blurScore: 45, status: "blurry_warning" },
  { id: "S005", pages: 12, expected: 12, blurScore: 198, status: "ready" },
  { id: "S006", pages: 12, expected: 12, blurScore: 165, status: "ready" },
];

export default function ScriptsIngestionPage() {
  const params = useParams();
  const examId = (params?.examId as string) || "exam-t1-cs301";

  const [booklets] = useState(SAMPLE_BOOKLETS);

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href={`/exams/${examId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] hover:text-[#2A4A9A] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Exam Overview</span>
        </Link>
        <span className="text-xs text-[#5A6377]">
          Module Ownership: Person 2 (Handwritten Grading Engine)
        </span>
      </div>

      <div className="rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
              Script Capture & Checks
            </span>
            <span className="text-xs text-[#5A6377]">
              {booklets.length} Booklets Ingested
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1] mt-2">
            Handwritten Answer Booklets
          </h1>
          <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-1">
            Scripts are rendered at 170 DPI, inspected for scan blur with OpenCV, and names masked locally before dual-model evaluation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Phone capture placeholder */}
          <Feature id="phoneCapture">
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#5A6377] border border-dashed rounded-lg"
            >
              <Smartphone className="w-4 h-4" />
              <span>Capture with Phone</span>
            </button>
          </Feature>

          <Link
            href={`/exams/${examId}/review`}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
          >
            <span>Proceed to Review Queue</span>
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Local Masking & Privacy Notice */}
      <div className="p-4 rounded-xl bg-[#E3F3EA]/60 border border-[#1F7A4D]/20 flex items-center justify-between text-xs text-[#1F7A4D]">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0" />
          <span>
            <strong>Local Name Masking Applied:</strong> Opaque boxes painted over student identity header on all 6 booklets prior to AI calls.
          </span>
        </div>
        <span className="font-mono text-[11px] font-bold">DPDP Compliant</span>
      </div>

      {/* Booklets Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {booklets.map((b) => (
          <div
            key={b.id}
            className="p-5 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-[#2A4A9A] dark:text-[#93AEF2]">
                Booklet {b.id}
              </span>

              {b.status === "ready" && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E3F3EA] text-[#1F7A4D]">
                  Ready for AI
                </span>
              )}
              {b.status === "page_warning" && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FBF1D9] text-[#9A6700]">
                  11 of 12 pages
                </span>
              )}
              {b.status === "blurry_warning" && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#FBEAE8] text-[#B8352A]">
                  Blur on page 4
                </span>
              )}
            </div>

            {/* Thumbnail representation */}
            <div className="h-32 bg-[#F7F8FA] dark:bg-[#11141B] rounded-lg border border-[#E9ECF2] dark:border-[#222835] flex items-center justify-center text-xs text-[#5A6377] relative overflow-hidden">
              <div className="w-20 h-28 bg-white dark:bg-[#171B24] border shadow-2xs rounded p-2 text-[8px] flex flex-col justify-between">
                <div className="h-2.5 bg-gray-900 text-white rounded text-center leading-none text-[6px] font-mono">
                  [MASKED]
                </div>
                <div className="space-y-1">
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded w-3/5" />
                </div>
                <div className="text-[6px] text-right text-gray-400 font-mono">
                  p.1 / {b.pages}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between text-xs text-[#5A6377]">
              <span>Blur Score: {b.blurScore}</span>
              <span className="font-mono">{b.pages} pages</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
