"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Keyboard,
  FileCheck2,
  Layers,
  Sparkles
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

export default function ForcedReviewPage() {
  const params = useParams();
  const examId = (params?.examId as string) || "exam-t1-cs301";

  const [revealed, setRevealed] = useState(false);
  const [activeBooklet, setActiveBooklet] = useState("S003");
  const [selectedScore, setSelectedScore] = useState<number>(2.0);
  const [reason, setReason] = useState("");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Review Bar */}
      <div className="h-14 px-6 border-b border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/exams/${examId}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] hover:border-[#2A4A9A] transition-colors"
            title="Back to Exam Overview"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Back to Exam</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#FBEAE8] text-[#B8352A]">
              Flagged Queue (Item 1 of 6)
            </span>
            <span className="font-mono text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              Student: {activeBooklet} · Question 1b
            </span>
          </div>
        </div>

        {/* Toolbar with Coming Soon placeholders from build plan */}
        <div className="flex items-center gap-2">
          <Feature id="questionWiseReview">
            <button
              type="button"
              className="text-xs px-2.5 py-1 text-[#5A6377] border border-dashed rounded-md"
            >
              Question-Wise Mode
            </button>
          </Feature>

          <Feature id="answerGrouping">
            <button
              type="button"
              className="text-xs px-2.5 py-1 text-[#5A6377] border border-dashed rounded-md"
            >
              Group Similar Answers
            </button>
          </Feature>

          <Link
            href={`/exams/${examId}/results`}
            className="ml-2 px-3 py-1.5 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors"
          >
            Final Results Table
          </Link>
        </div>
      </div>

      {/* Main Review Workspace: Left 60% Scan / Right 40% Evaluation */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane (60%): Zoomable Scan */}
        <div className="w-[60%] border-r border-[#DCE0E8] dark:border-[#2C3342] bg-[#F0F2F7] dark:bg-[#11141B] flex flex-col overflow-hidden">
          <div className="h-10 px-4 border-b border-[#DCE0E8] dark:border-[#2C3342] bg-white dark:bg-[#171B24] flex items-center justify-between text-xs text-[#5A6377] shrink-0">
            <span>Scan View: Booklet {activeBooklet}, Page 2 of 12</span>
            <span className="font-mono text-[11px] text-[#1F7A4D] bg-[#E3F3EA] px-2 py-0.5 rounded">
              Name Masked Locally
            </span>
          </div>

          <div className="flex-1 overflow-auto p-6 flex items-center justify-center">
            {/* Simulated Handwritten Scan Page */}
            <div className="w-full max-w-lg bg-white dark:bg-[#171B24] shadow-md border rounded-xl p-8 space-y-4 font-mono text-xs text-[#1A2030] dark:text-[#E4E8F1] min-h-[500px]">
              <div className="border-b pb-2 flex justify-between text-[10px] text-[#5A6377]">
                <span>JIIT ANSWER SCRIPT · MID SEMESTER</span>
                <span>PAGE 2</span>
              </div>

              <div className="p-2 rounded bg-yellow-50/70 border border-yellow-200 text-yellow-900 text-[11px]">
                Highlighted Answer Region for Question 1b
              </div>

              <div className="space-y-3 leading-relaxed pt-2">
                <p className="font-bold text-[#2A4A9A]">Ans 1b)</p>
                <p>Given recurrence relation: T(n) = 2T(n/2) + n*log(n)</p>
                <p>Here a = 2, b = 2, and f(n) = n*log(n)</p>
                <p>Comparing with standard form: n^(log_b a) = n^(log_2 2) = n^1 = n</p>
                <p>Since f(n) = n*log(n) = n^(log_b a) * log^k(n) where k = 1</p>
                <p>By Extended Master Theorem Case 2:</p>
                <p className="pl-4 font-bold">T(n) = Theta( n * log^(k+1)(n) )</p>
                <p className="pl-4 font-bold text-[#B8352A]">=&gt; T(n) = Theta( n * (log n)^2 )</p>
                <p className="text-[10px] text-gray-400 italic">[Work verified by student signature]</p>
              </div>
            </div>
          </div>

          {/* Bottom Keyboard Hint Bar */}
          <div className="h-10 px-4 border-t border-[#DCE0E8] dark:border-[#2C3342] bg-white dark:bg-[#171B24] flex items-center justify-between text-[11px] text-[#5A6377] shrink-0">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 border rounded">Space</kbd> Reveal AI Mark</span>
              <span><kbd className="px-1.5 py-0.5 border rounded">A</kbd> Accept</span>
              <span><kbd className="px-1.5 py-0.5 border rounded">E</kbd> Edit</span>
              <span><kbd className="px-1.5 py-0.5 border rounded">J/K</kbd> Prev/Next</span>
            </div>
            <span>Ownership: Person 3</span>
          </div>
        </div>

        {/* Right Pane (40%): Forced Attention Evaluation */}
        <div className="w-[40%] bg-white dark:bg-[#171B24] flex flex-col overflow-hidden">
          <div className="h-10 px-5 border-b border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between shrink-0">
            <span className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              Discrepancy Evaluation
            </span>
            <span className="text-xs font-mono font-bold text-[#B8352A]">
              Max: 3.5 Marks
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Forced Attention Shield */}
            {!revealed ? (
              <div className="p-6 rounded-xl border border-dashed border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-[#E6ECFA] text-[#2A4A9A] flex items-center justify-center mx-auto">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                    Forced Review Active
                  </h4>
                  <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1 max-w-xs mx-auto">
                    AI mark suggestions remain hidden until you inspect the student script on the left.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
                >
                  Inspect Scan & Reveal AI Mark
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Dual-Model Comparison */}
                <div className="p-3.5 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] space-y-2">
                  <div className="text-[11px] font-bold text-[#5A6377] uppercase tracking-wider">
                    Dual-Model Assessment
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#171B24] border border-[#E9ECF2] dark:border-[#222835]">
                      <div className="font-semibold text-[#2A4A9A]">Grader A (3.5 Flash-Lite)</div>
                      <div className="mt-1 font-mono font-bold text-base text-[#1A2030] dark:text-[#E4E8F1]">
                        3.5 / 3.5
                      </div>
                      <p className="text-[10px] text-[#5A6377] mt-1">
                        Cites exact application of Master Theorem case 2.
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-[#171B24] border border-[#E9ECF2] dark:border-[#222835]">
                      <div className="font-semibold text-[#B8352A]">Grader B (3.1 Flash-Lite)</div>
                      <div className="mt-1 font-mono font-bold text-base text-[#1A2030] dark:text-[#E4E8F1]">
                        2.0 / 3.5
                      </div>
                      <p className="text-[10px] text-[#5A6377] mt-1">
                        Flagged alternative substitution format.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Teacher Decision Stepper */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                    Final Examiner Mark Decision:
                  </label>
                  <div className="flex items-center gap-2">
                    {[0, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5].map((pts) => (
                      <button
                        key={pts}
                        type="button"
                        onClick={() => setSelectedScore(pts)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors ${
                          selectedScore === pts
                            ? "bg-[#2A4A9A] text-white border-[#2A4A9A]"
                            : "bg-[#F7F8FA] dark:bg-[#11141B] border-[#DCE0E8] dark:border-[#2C3342] text-[#1A2030] dark:text-[#E4E8F1] hover:border-[#2A4A9A]"
                        }`}
                      >
                        {pts}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Input for harsh marks */}
                <div>
                  <label className="text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                    Examiner Reason / Audit Note:
                  </label>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Student correctly cited extended case 2 with k=1"
                    className="mt-1 w-full p-2 text-xs border rounded-lg bg-[#F7F8FA] dark:bg-[#11141B]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      alert("Mark recorded and signed into audit log.");
                      setRevealed(false);
                    }}
                    className="w-full py-2.5 rounded-lg bg-[#1F7A4D] text-white text-xs font-semibold hover:bg-[#1F7A4D]/90 transition-colors shadow-2xs"
                  >
                    Confirm Mark and Next Question
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
