"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  FileText,
  CheckCircle2,
  Lock,
  Plus,
  Trash2,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  History,
  Tag
} from "lucide-react";
import { Question, RubricItem, RubricVersion } from "@/lib/types";

// Sample initial rubric questions and criteria
interface QuestionWithCriteria {
  question: Question;
  criteria: RubricItem[];
}

const INITIAL_RUBRIC_DATA: QuestionWithCriteria[] = [
  {
    question: {
      id: "q-1",
      exam_id: "exam-t1-cs301",
      label: "1a",
      ord: 1,
      text: "Define Big-O, Big-Omega, and Big-Theta notations. Prove that 3n^2 + 5n + 2 = O(n^2).",
      max_marks: 3.0,
      answer_type: "theory",
      bloom: "understand",
      printed_co: "CO1",
    },
    criteria: [
      {
        id: "c-1",
        rubric_version_id: "rv-1",
        question_id: "q-1",
        criterion_key: "q1a.c1",
        description: "Accurate formal definition of Big-O, Big-Omega, and Big-Theta notations including constants c and n0.",
        marks: 1.5,
        accept_alternatives: ["Limit definition method", "Standard inequality definition"],
        common_errors: ["Omitting constant c or threshold n0", "Confusing Omega with little-o"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 1,
      },
      {
        id: "c-2",
        rubric_version_id: "rv-1",
        question_id: "q-1",
        criterion_key: "q1a.c2",
        description: "Valid algebraic proof that 3n^2 + 5n + 2 <= c*n^2 for specified c and n0 (e.g. c=4, n0=2 or c=10, n0=1).",
        marks: 1.5,
        accept_alternatives: ["c=4 and n0=2", "c=10 and n0=1", "Ratio test limit as n approaches infinity"],
        common_errors: ["Writing equals sign instead of inequality", "Failing to state values for c or n0"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 2,
      },
    ],
  },
  {
    question: {
      id: "q-2",
      exam_id: "exam-t1-cs301",
      label: "1b",
      ord: 2,
      text: "Solve the recurrence relation T(n) = 2T(n/2) + n*log(n) using Master's Theorem or substitution.",
      max_marks: 3.5,
      answer_type: "numeric",
      bloom: "apply",
      printed_co: "CO1",
    },
    criteria: [
      {
        id: "c-3",
        rubric_version_id: "rv-1",
        question_id: "q-2",
        criterion_key: "q1b.c1",
        description: "Identification of Master Theorem parameters a=2, b=2, and computation of n^(log_b a) = n.",
        marks: 1.5,
        accept_alternatives: ["Substitution expansion method"],
        common_errors: ["Incorrect parameter identification", "Log base error"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 1,
      },
      {
        id: "c-4",
        rubric_version_id: "rv-1",
        question_id: "q-2",
        criterion_key: "q1b.c2",
        description: "Correct application of Master Theorem Extended Case 2 (f(n) = Theta(n * log^k n) with k=1).",
        marks: 2.0,
        accept_alternatives: ["Step-by-step tree level summation"],
        common_errors: ["Directly writing answer without showing case conditions"],
        final_answer: "Theta(n * log^2 n)",
        tolerance_pct: null,
        units: null,
        ord: 2,
      },
    ],
  },
  {
    question: {
      id: "q-3",
      exam_id: "exam-t1-cs301",
      label: "2a",
      ord: 3,
      text: "Write a recursive C/C++ function to compute the height of a binary tree and analyze its worst-case space complexity.",
      max_marks: 4.5,
      answer_type: "code",
      bloom: "apply",
      printed_co: "CO2",
    },
    criteria: [
      {
        id: "c-5",
        rubric_version_id: "rv-1",
        question_id: "q-3",
        criterion_key: "q2a.c1",
        description: "Base condition handling empty tree (root == NULL returns 0 or -1 according to definition).",
        marks: 1.0,
        accept_alternatives: ["Empty node returns 0", "Empty node returns -1"],
        common_errors: ["Null pointer dereference without checking root"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 1,
      },
      {
        id: "c-6",
        rubric_version_id: "rv-1",
        question_id: "q-3",
        criterion_key: "q2a.c2",
        description: "Recursive calls on left and right subtrees with correct max aggregation: max(height(left), height(right)) + 1.",
        marks: 2.0,
        accept_alternatives: ["Ternary operator", "Explicit if-else conditional"],
        common_errors: ["Omitting the + 1 root increment", "Re-evaluating subtree twice"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 2,
      },
      {
        id: "c-7",
        rubric_version_id: "rv-1",
        question_id: "q-3",
        criterion_key: "q2a.c3",
        description: "Worst-case space complexity analysis citing O(n) or O(h) recursion call stack depth.",
        marks: 1.5,
        accept_alternatives: ["O(h) where h is tree height", "O(n) for degenerate skewed tree"],
        common_errors: ["Claiming O(1) auxiliary space without considering call stack"],
        final_answer: "O(n) worst case, O(log n) balanced",
        tolerance_pct: null,
        units: null,
        ord: 3,
      },
    ],
  },
  {
    question: {
      id: "q-4",
      exam_id: "exam-t1-cs301",
      label: "2b",
      ord: 4,
      text: "Draw the resulting AVL tree after sequentially inserting keys: 45, 12, 67, 89, 56, 34, 23. Clearly show all LL/RR/LR rotations.",
      max_marks: 4.0,
      answer_type: "diagram",
      bloom: "analyze",
      printed_co: "CO2",
    },
    criteria: [
      {
        id: "c-8",
        rubric_version_id: "rv-1",
        question_id: "q-4",
        criterion_key: "q2b.c1",
        description: "Step-by-step insertion of initial nodes with balance factors calculated correctly.",
        marks: 1.5,
        accept_alternatives: ["Balance factors listed as integers -1, 0, +1"],
        common_errors: ["Incorrect balance factor sign convention"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 1,
      },
      {
        id: "c-9",
        rubric_version_id: "rv-1",
        question_id: "q-4",
        criterion_key: "q2b.c2",
        description: "Accurate execution of rotation upon balance violation and correct final AVL tree diagram.",
        marks: 2.5,
        accept_alternatives: ["Single right rotation followed by left", "Double LR rotation diagram"],
        common_errors: ["Failing to recompute balance factors after rotation"],
        final_answer: "Root is 45 with balanced subtrees",
        tolerance_pct: null,
        units: null,
        ord: 2,
      },
    ],
  },
  {
    question: {
      id: "q-5",
      exam_id: "exam-t1-cs301",
      label: "3",
      ord: 5,
      text: "Construct a Max-Heap from the array [14, 28, 9, 35, 42, 60]. Show array representation after each step of bottom-up heapify.",
      max_marks: 5.0,
      answer_type: "theory",
      bloom: "apply",
      printed_co: "CO3",
    },
    criteria: [
      {
        id: "c-10",
        rubric_version_id: "rv-1",
        question_id: "q-5",
        criterion_key: "q3.c1",
        description: "Initial tree representation and identification of first non-leaf node index (n/2 - 1).",
        marks: 1.5,
        accept_alternatives: ["1-based index or 0-based index"],
        common_errors: ["Starting heapify from leaf nodes"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 1,
      },
      {
        id: "c-11",
        rubric_version_id: "rv-1",
        question_id: "q-5",
        criterion_key: "q3.c2",
        description: "Step-by-step down-heapify operations showing element swaps with larger child.",
        marks: 2.0,
        accept_alternatives: ["Tree drawings for each swap", "Array state representations"],
        common_errors: ["Swapping with smaller child"],
        final_answer: null,
        tolerance_pct: null,
        units: null,
        ord: 2,
      },
      {
        id: "c-12",
        rubric_version_id: "rv-1",
        question_id: "q-5",
        criterion_key: "q3.c3",
        description: "Final Max-Heap array configuration satisfying parent >= left child and parent >= right child.",
        marks: 1.5,
        accept_alternatives: ["[60, 42, 14, 35, 28, 9]"],
        common_errors: ["Violating heap order at root"],
        final_answer: "[60, 42, 14, 35, 28, 9]",
        tolerance_pct: null,
        units: null,
        ord: 3,
      },
    ],
  },
];

export default function RubricEditorPage() {
  const params = useParams();
  const examId = (params?.examId as string) || "exam-t1-cs301";

  const [rubricData, setRubricData] = useState<QuestionWithCriteria[]>(INITIAL_RUBRIC_DATA);
  const [rubricVersion, setRubricVersion] = useState<number>(1);
  const [rubricStatus, setRubricStatus] = useState<"draft" | "approved">("draft");
  const [approvedAt, setApprovedAt] = useState<string | null>(null);

  // Left pane tab: 'transcript' or 'key_doc'
  const [leftTab, setLeftTab] = useState<"transcript" | "key_doc">("transcript");
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>("q-1");

  // Calculate totals
  const totalRubricMarks = rubricData.reduce(
    (acc, qGroup) => acc + qGroup.criteria.reduce((cAcc, c) => cAcc + (Number(c.marks) || 0), 0),
    0
  );
  const totalMaxMarks = rubricData.reduce((acc, qGroup) => acc + (Number(qGroup.question.max_marks) || 0), 0);
  const isRubricBalanced = Math.abs(totalRubricMarks - totalMaxMarks) < 0.001;

  const handleUpdateCriterion = (qIndex: number, cIndex: number, updates: Partial<RubricItem>) => {
    if (rubricStatus === "approved") {
      // Prompt user or unlock a new draft version
      if (!confirm("This rubric is currently approved and frozen. Editing it will create a new draft version. Proceed?")) {
        return;
      }
      setRubricStatus("draft");
      setRubricVersion((prev) => prev + 1);
    }

    const updated = [...rubricData];
    const targetQ = updated[qIndex];
    targetQ.criteria[cIndex] = { ...targetQ.criteria[cIndex], ...updates };
    setRubricData(updated);
  };

  const handleAddCriterion = (qIndex: number) => {
    if (rubricStatus === "approved") {
      if (!confirm("This rubric is currently approved and frozen. Editing it will create a new draft version. Proceed?")) {
        return;
      }
      setRubricStatus("draft");
      setRubricVersion((prev) => prev + 1);
    }

    const updated = [...rubricData];
    const targetQ = updated[qIndex];
    const nextKey = `${targetQ.question.label}.c${targetQ.criteria.length + 1}`;
    const newCrit: RubricItem = {
      id: `crit-${Date.now()}`,
      rubric_version_id: `rv-${rubricVersion}`,
      question_id: targetQ.question.id,
      criterion_key: nextKey,
      description: "Specific step or conceptual component",
      marks: 1.0,
      accept_alternatives: [],
      common_errors: [],
      final_answer: null,
      tolerance_pct: null,
      units: null,
      ord: targetQ.criteria.length + 1,
    };
    targetQ.criteria.push(newCrit);
    setRubricData(updated);
  };

  const handleDeleteCriterion = (qIndex: number, cIndex: number) => {
    if (rubricStatus === "approved") {
      if (!confirm("This rubric is currently approved and frozen. Editing it will create a new draft version. Proceed?")) {
        return;
      }
      setRubricStatus("draft");
      setRubricVersion((prev) => prev + 1);
    }

    const updated = [...rubricData];
    updated[qIndex].criteria = updated[qIndex].criteria.filter((_, i) => i !== cIndex);
    setRubricData(updated);
  };

  const handleApproveRubric = () => {
    if (!isRubricBalanced) {
      alert(`Cannot approve: Rubric criteria total (${totalRubricMarks}) does not match total exam marks (${totalMaxMarks}). Please balance criteria marks.`);
      return;
    }

    const now = new Date().toLocaleString();
    setRubricStatus("approved");
    setApprovedAt(now);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Top Header Bar */}
      <div className="h-16 px-6 border-b border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/exams/${examId}`}
            className="p-1.5 text-[#5A6377] hover:text-[#1A2030] dark:hover:text-[#E4E8F1] rounded-md transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
                CS301 · T1 Exam
              </span>
              <span className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                Rubric Management
              </span>
              {rubricStatus === "approved" ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#E3F3EA] text-[#1F7A4D]">
                  <Lock className="w-3 h-3" />
                  <span>v{rubricVersion} (Frozen & Approved)</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#FBF1D9] text-[#9A6700]">
                  <span>v{rubricVersion} (Draft · Editable)</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
              Criteria use small point values (0.5 to 3 marks). Approving freezes this version for dual-model grading.
            </p>
          </div>
        </div>

        {/* Right Action: Marks Total and Approve Button */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">Total Criteria Marks</div>
            <div className="font-mono font-bold text-sm">
              <span className={isRubricBalanced ? "text-[#1F7A4D]" : "text-[#B8352A]"}>
                {totalRubricMarks.toFixed(1)}
              </span>{" "}
              / {totalMaxMarks.toFixed(1)}
            </div>
          </div>

          {rubricStatus === "approved" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1F7A4D] bg-[#E3F3EA] px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>Approved on {approvedAt}</span>
              </span>
              <Link
                href={`/exams/${examId}`}
                className="px-3 py-1.5 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors"
              >
                Go to Exam Overview
              </Link>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleApproveRubric}
              disabled={!isRubricBalanced}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1F7A4D] text-white text-xs font-semibold hover:bg-[#1F7A4D]/90 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Approve Rubric (Freeze Version)</span>
            </button>
          )}
        </div>
      </div>

      {/* Split View Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE (45%): Answer Key Document / Verbatim Transcript */}
        <div className="w-[45%] border-r border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex flex-col overflow-hidden">
          <div className="h-11 px-4 border-b border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between bg-[#F7F8FA] dark:bg-[#11141B] shrink-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
              <FileText className="w-4 h-4 text-[#2A4A9A]" />
              <span>Teacher Answer Key Reference</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setLeftTab("transcript")}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                  leftTab === "transcript"
                    ? "bg-[#2A4A9A] text-white"
                    : "text-[#5A6377] hover:bg-[#E9ECF2]"
                }`}
              >
                AI Key Transcript
              </button>
              <button
                type="button"
                onClick={() => setLeftTab("key_doc")}
                className={`px-2 py-0.5 text-[11px] font-semibold rounded ${
                  leftTab === "key_doc"
                    ? "bg-[#2A4A9A] text-white"
                    : "text-[#5A6377] hover:bg-[#E9ECF2]"
                }`}
              >
                Document / Image View
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {leftTab === "transcript" ? (
              <div className="space-y-4 text-xs">
                <div className="p-3 rounded-lg bg-[#E6ECFA]/60 dark:bg-[#1E2A47]/60 border border-[#2A4A9A]/20">
                  <p className="text-[11px] text-[#2A4A9A] dark:text-[#93AEF2] font-medium leading-relaxed">
                    <strong>Verbatim Transcript:</strong> Review what Gemini 3.5 Flash-Lite read from your handwritten or typed solution key to catch any misread values.
                  </p>
                </div>

                <div className="space-y-3 font-mono text-[11px] text-[#1A2030] dark:text-[#E4E8F1] leading-relaxed bg-[#F7F8FA] dark:bg-[#11141B] p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342]">
                  <div>
                    <span className="font-bold text-[#2A4A9A]">[Question 1a]</span>
                    <p className="mt-1">
                      Big-O: f(n) &lt;= c*g(n) for n &gt;= n0. Big-Omega: f(n) &gt;= c*g(n) for n &gt;= n0. Big-Theta: c1*g(n) &lt;= f(n) &lt;= c2*g(n). Proof: For n &gt;= 1, 3n^2 + 5n + 2 &lt;= 3n^2 + 5n^2 + 2n^2 = 10n^2. Thus c=10, n0=1 satisfies definition of O(n^2).
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9ECF2] dark:border-[#222835]">
                    <span className="font-bold text-[#2A4A9A]">[Question 1b]</span>
                    <p className="mt-1">
                      T(n) = 2T(n/2) + n*log(n). a=2, b=2. f(n) = n*log(n). n^(log_2 2) = n. Since f(n) = Theta(n * log^1 n), applying extended case 2 gives T(n) = Theta(n * log^2 n).
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9ECF2] dark:border-[#222835]">
                    <span className="font-bold text-[#2A4A9A]">[Question 2a]</span>
                    <p className="mt-1">
                      int height(Node* root) &#123; if (!root) return 0; return 1 + max(height(root-&gt;left), height(root-&gt;right)); &#125; Space complexity: O(h) recursion depth, worst case O(n) for skewed tree.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9ECF2] dark:border-[#222835]">
                    <span className="font-bold text-[#2A4A9A]">[Question 2b]</span>
                    <p className="mt-1">
                      Insert 45, 12, 67 (balanced). Insert 89 (RR violation on 67). Left rotate 67. Insert 56, 34, 23 (LR rotation on 12-34). Balanced root remains 45.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-[#E9ECF2] dark:border-[#222835]">
                    <span className="font-bold text-[#2A4A9A]">[Question 3]</span>
                    <p className="mt-1">
                      Array [14, 28, 9, 35, 42, 60]. Bottom-up heapify indices 2 down to 0. Swap 9 with 60. Swap 28 with 42. Swap 14 with 60 then 35. Final array: [60, 42, 14, 35, 28, 9].
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#5A6377]">
                <div className="w-12 h-12 rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-[#2A4A9A]" />
                </div>
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  Answer Key PDF Document
                </h4>
                <p className="text-[11px] mt-1 max-w-xs">
                  Viewing uploaded file: <code>key_typed.pdf</code> (2 pages)
                </p>
                <div className="mt-4 p-3 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] text-left text-[11px] bg-[#F7F8FA] dark:bg-[#11141B] w-full max-w-sm">
                  <div className="font-semibold text-[#1A2030] dark:text-[#E4E8F1] mb-1">Uploaded Metadata</div>
                  <div>Source: Typed Solution PDF</div>
                  <div>Pages: 2 pages scanned</div>
                  <div>Checksum: sha256:d8a94e...</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE (55%): Structured Rubric Editor */}
        <div className="flex-1 bg-[#F7F8FA] dark:bg-[#11141B] flex flex-col overflow-hidden">
          <div className="h-11 px-6 border-b border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex items-center justify-between shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
              Granular Evaluation Criteria
            </h3>
            <span className="text-[11px] text-[#5A6377]">
              Step size: 0.5 marks · Min: 0.5 · Max: 3.0
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {rubricData.map((qGroup, qIdx) => {
              const qMarksSum = qGroup.criteria.reduce((sum, c) => sum + (Number(c.marks) || 0), 0);
              const qMarksMatch = Math.abs(qMarksSum - qGroup.question.max_marks) < 0.001;
              const isExpanded = expandedQuestion === qGroup.question.id;

              return (
                <div
                  key={qGroup.question.id}
                  className="rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] shadow-2xs overflow-hidden"
                >
                  {/* Question Group Header */}
                  <div
                    onClick={() => setExpandedQuestion(isExpanded ? null : qGroup.question.id)}
                    className="p-4 bg-[#FFFFFF] dark:bg-[#171B24] border-b border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between cursor-pointer hover:bg-[#F7F8FA]/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <button type="button" className="text-[#5A6377]">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#2A4A9A] dark:text-[#93AEF2]">
                          Question {qGroup.question.label}
                        </span>
                        <span className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1] line-clamp-1 max-w-[320px]">
                          {qGroup.question.text}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                          qMarksMatch
                            ? "bg-[#E3F3EA] text-[#1F7A4D]"
                            : "bg-[#FBEAE8] text-[#B8352A]"
                        }`}
                      >
                        {qMarksSum.toFixed(1)} / {qGroup.question.max_marks.toFixed(1)} Marks
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCriterion(qIdx);
                        }}
                        className="p-1 rounded-md text-[#2A4A9A] hover:bg-[#E6ECFA] transition-colors"
                        title="Add Criterion"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Criteria Items */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 bg-[#F7F8FA]/40 dark:bg-[#11141B]/40">
                      {qGroup.criteria.map((crit, cIdx) => (
                        <div
                          key={crit.id || cIdx}
                          className="p-3.5 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-[#E9ECF2] dark:border-[#222835] pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-[#2A4A9A] dark:text-[#93AEF2]">
                                {crit.criterion_key}
                              </span>
                              <span className="text-[11px] text-[#5A6377]">
                                Criterion #{cIdx + 1}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <label className="text-[11px] font-semibold text-[#5A6377]">Marks:</label>
                                <input
                                  type="number"
                                  step="0.5"
                                  min="0.5"
                                  max="3.0"
                                  value={crit.marks}
                                  onChange={(e) =>
                                    handleUpdateCriterion(qIdx, cIdx, {
                                      marks: parseFloat(e.target.value) || 0.5,
                                    })
                                  }
                                  className="w-16 px-2 py-0.5 text-xs font-mono font-bold text-center border rounded bg-[#F7F8FA] dark:bg-[#11141B] text-[#B8352A]"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDeleteCriterion(qIdx, cIdx)}
                                className="p-1 text-[#5A6377] hover:text-[#B8352A]"
                                title="Remove criterion"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Description Input */}
                          <div>
                            <textarea
                              rows={2}
                              value={crit.description}
                              onChange={(e) =>
                                handleUpdateCriterion(qIdx, cIdx, {
                                  description: e.target.value,
                                })
                              }
                              placeholder="Describe what specific step, definition, calculation or code logic earns these points..."
                              className="w-full p-2 text-xs rounded border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                            />
                          </div>

                          {/* Alternatives & Common Errors */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="p-2.5 rounded-md bg-[#E3F3EA]/30 border border-[#1F7A4D]/20 space-y-1.5">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-[#1F7A4D]">
                                <Tag className="w-3 h-3" />
                                <span>Accepted Alternatives</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Comma separated valid alternatives..."
                                value={crit.accept_alternatives.join(", ")}
                                onChange={(e) =>
                                  handleUpdateCriterion(qIdx, cIdx, {
                                    accept_alternatives: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded border bg-white dark:bg-[#11141B]"
                              />
                            </div>

                            <div className="p-2.5 rounded-md bg-[#FBEAE8]/30 border border-[#B8352A]/20 space-y-1.5">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-[#B8352A]">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Common Misconceptions (0 Marks)</span>
                              </div>
                              <input
                                type="text"
                                placeholder="Comma separated common student errors..."
                                value={crit.common_errors.join(", ")}
                                onChange={(e) =>
                                  handleUpdateCriterion(qIdx, cIdx, {
                                    common_errors: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded border bg-white dark:bg-[#11141B]"
                              />
                            </div>
                          </div>

                          {/* Numerical specific settings */}
                          {(qGroup.question.answer_type === "numeric" || crit.final_answer) && (
                            <div className="flex flex-wrap items-center gap-3 p-2 rounded bg-[#F7F8FA] dark:bg-[#11141B] text-[11px]">
                              <span className="font-semibold text-[#5A6377]">Final Value:</span>
                              <input
                                type="text"
                                placeholder="e.g. Theta(n * log^2 n)"
                                value={crit.final_answer || ""}
                                onChange={(e) =>
                                  handleUpdateCriterion(qIdx, cIdx, { final_answer: e.target.value || null })
                                }
                                className="w-36 px-2 py-0.5 text-xs font-mono border rounded bg-white dark:bg-[#171B24]"
                              />
                              <span className="font-semibold text-[#5A6377]">Tolerance:</span>
                              <input
                                type="number"
                                placeholder="%"
                                value={crit.tolerance_pct || ""}
                                onChange={(e) =>
                                  handleUpdateCriterion(qIdx, cIdx, { tolerance_pct: parseFloat(e.target.value) || null })
                                }
                                className="w-14 px-1.5 py-0.5 text-xs font-mono border rounded bg-white dark:bg-[#171B24]"
                              />
                              <span className="font-semibold text-[#5A6377]">Units:</span>
                              <input
                                type="text"
                                placeholder="e.g. ms, kN"
                                value={crit.units || ""}
                                onChange={(e) =>
                                  handleUpdateCriterion(qIdx, cIdx, { units: e.target.value || null })
                                }
                                className="w-16 px-1.5 py-0.5 text-xs font-mono border rounded bg-white dark:bg-[#171B24]"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
