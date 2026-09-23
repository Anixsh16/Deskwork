"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  FileText,
  ListOrdered,
  BookOpen,
  EyeOff,
  Files,
  ArrowRight,
  ArrowLeft,
  Upload,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  FileCheck2,
  Shield,
  Layers,
  ChevronRight
} from "lucide-react";
import { Question, ExamKind, AnswerType, BloomLevel } from "@/lib/types";
import { QuestionEditor } from "@/components/exam/question-editor";

const STEPS = [
  { id: 1, label: "Paper", icon: FileText },
  { id: 2, label: "Questions", icon: ListOrdered },
  { id: 3, label: "Key & Rubric", icon: BookOpen },
  { id: 4, label: "Mask Box", icon: EyeOff },
  { id: 5, label: "Scripts", icon: Files },
];

const DEFAULT_EXTRACTED_QUESTIONS: Question[] = [
  {
    id: "q-1",
    exam_id: "new-exam",
    label: "1a",
    ord: 1,
    text: "Define Big-O, Big-Omega, and Big-Theta notations. Prove that 3n^2 + 5n + 2 = O(n^2).",
    max_marks: 3.0,
    answer_type: "theory",
    bloom: "understand",
    printed_co: "CO1",
  },
  {
    id: "q-2",
    exam_id: "new-exam",
    label: "1b",
    ord: 2,
    text: "Solve the recurrence relation T(n) = 2T(n/2) + n*log(n) using Master's Theorem or substitution.",
    max_marks: 3.5,
    answer_type: "numeric",
    bloom: "apply",
    printed_co: "CO1",
  },
  {
    id: "q-3",
    exam_id: "new-exam",
    label: "2a",
    ord: 3,
    text: "Write a recursive C/C++ function to compute the height of a binary tree and analyze its worst-case space complexity.",
    max_marks: 4.5,
    answer_type: "code",
    bloom: "apply",
    printed_co: "CO2",
  },
  {
    id: "q-4",
    exam_id: "new-exam",
    label: "2b",
    ord: 4,
    text: "Draw the resulting AVL tree after sequentially inserting keys: 45, 12, 67, 89, 56, 34, 23. Clearly show all LL/RR/LR rotations.",
    max_marks: 4.0,
    answer_type: "diagram",
    bloom: "analyze",
    printed_co: "CO2",
  },
  {
    id: "q-5",
    exam_id: "new-exam",
    label: "3",
    ord: 5,
    text: "Construct a Max-Heap from the array [14, 28, 9, 35, 42, 60]. Show array representation after each step of bottom-up heapify.",
    max_marks: 5.0,
    answer_type: "theory",
    bloom: "apply",
    printed_co: "CO3",
  },
];

export default function NewExamWizard() {
  const router = useRouter();
  const params = useParams();
  const courseId = (params?.courseId as string) || "c-cs301-2026";

  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Paper metadata
  const [examKind, setExamKind] = useState<ExamKind>("T1");
  const [title, setTitle] = useState("Test 1 (T1) Examination: Algorithms");
  const [maxMarks, setMaxMarks] = useState<number>(20);
  const [expectedPages, setExpectedPages] = useState<number>(12);
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [extractProgress, setExtractProgress] = useState(0);

  // Step 2: Extracted Questions
  const [questions, setQuestions] = useState<Question[]>(DEFAULT_EXTRACTED_QUESTIONS);

  // Step 3: Key & Rubric
  const [keySource, setKeySource] = useState<"typed" | "handwritten">("typed");
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [keyText, setKeyText] = useState(
    "1a. Definitions: Big-O (upper bound c*g(n)), Omega (lower bound), Theta (tight bound). Constant c=4, n0=2 proves O(n^2).\n" +
    "1b. Master theorem case 2 extension: T(n) = Theta(n * log^2 n).\n" +
    "2a. Recursive height: max(height(left), height(right)) + 1. Base case NULL return 0. Space: O(h) on call stack.\n" +
    "2b. Sequence of insertions with LR rotation on 34. Balanced root is 45.\n" +
    "3. Heap array: [60, 42, 14, 35, 28, 9]. Step-by-step heapify down."
  );
  const [generatingRubric, setGeneratingRubric] = useState(false);
  const [rubricGenerated, setRubricGenerated] = useState(false);

  // Step 4: Mask Region
  const [maskRegion, setMaskRegion] = useState({ x: 10, y: 5, w: 80, h: 20 });

  const handleKindChange = (k: ExamKind) => {
    setExamKind(k);
    if (k === "T1") {
      setTitle("Test 1 (T1) Examination: Algorithms");
      setMaxMarks(20);
    } else if (k === "T2") {
      setTitle("Test 2 (T2) Examination: Advanced Data Structures");
      setMaxMarks(20);
    } else if (k === "END_SEM") {
      setTitle("End Semester Final Examination");
      setMaxMarks(35);
    } else if (k === "ASSIGNMENT") {
      setTitle("Continuous Assessment Assignment");
      setMaxMarks(25);
    }
  };

  const handleStartExtraction = () => {
    setExtracting(true);
    setExtractProgress(15);

    setTimeout(() => setExtractProgress(45), 400);
    setTimeout(() => setExtractProgress(80), 900);
    setTimeout(() => {
      setExtractProgress(100);
      setExtracting(false);
      setCurrentStep(2);
    }, 1300);
  };

  const handleGenerateRubric = () => {
    setGeneratingRubric(true);
    setTimeout(() => {
      setGeneratingRubric(false);
      setRubricGenerated(true);
    }, 1200);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-8">
      {/* Wizard Header and Navigation Stepper */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </Link>
            <span className="text-xs text-[#5A6377]/40 dark:text-[#9AA3B6]/40">/</span>
            <Link
              href={`/courses/${courseId}`}
              className="inline-flex items-center gap-1 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:text-[#2A4A9A] dark:hover:text-[#93AEF2] transition-colors"
            >
              <span>Back to Course</span>
            </Link>
          </div>
          <span className="text-xs text-[#5A6377] dark:text-[#9AA3B6]">
            Step {currentStep} of 5
          </span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1A2030] dark:text-[#E4E8F1]">
            Exam Setup Wizard
          </h1>
          <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
            Configure question paper, AI extraction, answer key, and local masking before booklet grading.
          </p>
        </div>

        {/* Stepper Tabs */}
        <div className="grid grid-cols-5 gap-2 border-b border-[#E9ECF2] dark:border-[#222835] pb-4">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = currentStep > s.id;
            const isCurrent = currentStep === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  if (s.id <= currentStep) setCurrentStep(s.id);
                }}
                disabled={s.id > currentStep}
                className={`flex items-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all ${
                  isCurrent
                    ? "bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] border border-[#2A4A9A]/30"
                    : isCompleted
                    ? "text-[#1F7A4D] hover:bg-[#E3F3EA]/50 cursor-pointer"
                    : "text-[#5A6377] dark:text-[#9AA3B6] opacity-50 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-mono ${
                    isCurrent
                      ? "bg-[#2A4A9A] text-white"
                      : isCompleted
                      ? "bg-[#1F7A4D] text-white"
                      : "bg-[#E9ECF2] dark:bg-[#222835]"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5" /> : s.id}
                </div>
                <span className="hidden sm:inline truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 1: PAPER METADATA & UPLOAD */}
      {currentStep === 1 && (
        <div className="space-y-6 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              1. Examination Details and Question Paper
            </h2>
            <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
              Select assessment format and upload your question paper PDF.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Kind Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                Exam Type (JIIT Preset)
              </label>
              <select
                value={examKind}
                onChange={(e) => handleKindChange(e.target.value as ExamKind)}
                className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1]"
              >
                <option value="T1">Test 1 (T1) · 20 Marks · 1 Hour</option>
                <option value="T2">Test 2 (T2) · 20 Marks · 1 Hour</option>
                <option value="END_SEM">End Semester · 35 Marks · 2 Hours</option>
                <option value="ASSIGNMENT">Continuous Assessment (TA) · 25 Marks</option>
                <option value="QUIZ">Quiz / Quick Test</option>
                <option value="OTHER">Other Custom Format</option>
              </select>
            </div>

            {/* Exam Title */}
            <div>
              <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                Exam Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1]"
              />
            </div>

            {/* Max Marks & Expected Pages */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                  Max Marks
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={maxMarks}
                  onChange={(e) => setMaxMarks(parseFloat(e.target.value) || 0)}
                  className="mt-1 block w-full px-3 py-2 text-xs font-mono font-bold text-center border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B] text-[#B8352A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                  Pages / Booklet
                </label>
                <input
                  type="number"
                  value={expectedPages}
                  onChange={(e) => setExpectedPages(parseInt(e.target.value, 10) || 12)}
                  className="mt-1 block w-full px-3 py-2 text-xs font-mono text-center border border-[#DCE0E8] dark:border-[#2C3342] rounded-lg bg-[#F7F8FA] dark:bg-[#11141B]"
                />
              </div>
            </div>
          </div>

          {/* Question Paper File Upload Area */}
          <div>
            <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1] mb-1.5">
              Upload Question Paper (PDF or Image)
            </label>
            <div className="border-2 border-dashed border-[#DCE0E8] dark:border-[#2C3342] rounded-xl p-8 text-center hover:border-[#2A4A9A] transition-colors bg-[#F7F8FA]/60 dark:bg-[#11141B]/60">
              <input
                type="file"
                id="paper-file"
                accept=".pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) setPaperFile(e.target.files[0]);
                }}
              />
              <label htmlFor="paper-file" className="cursor-pointer block">
                <div className="w-10 h-10 rounded-full bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-5 h-5" />
                </div>
                {paperFile ? (
                  <div>
                    <span className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                      {paperFile.name}
                    </span>
                    <span className="text-xs text-[#5A6377] block mt-0.5">
                      ({(paperFile.size / 1024).toFixed(1)} KB) · Click to replace
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-[#2A4A9A] dark:text-[#93AEF2]">
                      Click to upload question paper PDF
                    </span>
                    <span className="text-xs text-[#5A6377] block mt-1">
                      or drag and drop previous-year question paper here
                    </span>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Extraction Progress Feedback */}
          {extracting && (
            <div className="p-4 rounded-xl bg-[#E6ECFA] dark:bg-[#1E2A47] border border-[#2A4A9A]/30 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[#2A4A9A] dark:text-[#93AEF2]">
                <span className="inline-flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 animate-spin" />
                  Extracting questions with Gemini 3.5 Flash-Lite...
                </span>
                <span className="font-mono">{extractProgress}%</span>
              </div>
              <div className="w-full bg-white dark:bg-[#11141B] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#2A4A9A] h-full rounded-full transition-all duration-300"
                  style={{ width: `${extractProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
            <span className="text-xs text-[#5A6377]">
              Uses Gemini 3.5 Flash-Lite (Call C1: extract_paper)
            </span>
            <button
              type="button"
              disabled={extracting}
              onClick={handleStartExtraction}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
            >
              <span>{extracting ? "Extracting..." : "Extract Questions with AI"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: QUESTIONS EDITOR */}
      {currentStep === 2 && (
        <div className="space-y-6 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              2. Review and Edit Extracted Questions
            </h2>
            <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
              Verify question labels, marks, Bloom taxonomy, and answer types. AI extraction is a draft; you have full authority to edit.
            </p>
          </div>

          <QuestionEditor
            questions={questions}
            onChange={setQuestions}
            targetMaxMarks={maxMarks}
          />

          <div className="pt-4 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5A6377] hover:text-[#1A2030]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Paper</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
            >
              <span>Save and Proceed to Answer Key</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: ANSWER KEY & DRAFT RUBRIC */}
      {currentStep === 3 && (
        <div className="space-y-6 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              3. Answer Key and Rubric Generation
            </h2>
            <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
              Upload your typed answer key or handwritten photos. Gemini 3.5 Flash-Lite generates draft criteria (0.5 to 3 marks each).
            </p>
          </div>

          {/* Key format selector */}
          <div className="flex gap-4 border-b border-[#E9ECF2] dark:border-[#222835] pb-3">
            <button
              type="button"
              onClick={() => setKeySource("typed")}
              className={`pb-1 text-xs font-semibold border-b-2 transition-colors ${
                keySource === "typed"
                  ? "border-[#2A4A9A] text-[#2A4A9A] dark:text-[#93AEF2]"
                  : "border-transparent text-[#5A6377]"
              }`}
            >
              Typed Answer Key (Text / PDF)
            </button>
            <button
              type="button"
              onClick={() => setKeySource("handwritten")}
              className={`pb-1 text-xs font-semibold border-b-2 transition-colors ${
                keySource === "handwritten"
                  ? "border-[#2A4A9A] text-[#2A4A9A] dark:text-[#93AEF2]"
                  : "border-transparent text-[#5A6377]"
              }`}
            >
              Handwritten Answer Key (Photos / Scans)
            </button>
          </div>

          {keySource === "typed" ? (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1]">
                Typed Answer Key Content
              </label>
              <textarea
                rows={6}
                value={keyText}
                onChange={(e) => setKeyText(e.target.value)}
                className="w-full p-3 font-mono text-xs rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
                placeholder="Paste teacher solution or typed answers here..."
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-[#DCE0E8] dark:border-[#2C3342] rounded-xl p-8 text-center bg-[#F7F8FA]/60">
              <div className="w-10 h-10 rounded-full bg-[#E6ECFA] text-[#2A4A9A] flex items-center justify-center mx-auto mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-xs font-bold text-[#1A2030]">
                Upload Photos of Handwritten Answer Key
              </p>
              <p className="text-[11px] text-[#5A6377] mt-1">
                Gemini 3.5 Flash-Lite reads handwritten notes directly and returns a key transcript for your verification.
              </p>
            </div>
          )}

          {/* Trigger Rubric Generation */}
          {!rubricGenerated ? (
            <div className="p-4 rounded-xl bg-[#F7F8FA] dark:bg-[#11141B] border border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                  AI Rubric Generation (Call C2)
                </h4>
                <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                  Generates small point criteria (0.5 to 3 marks), common student errors, and acceptable alternative methods.
                </p>
              </div>
              <button
                type="button"
                disabled={generatingRubric}
                onClick={handleGenerateRubric}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shrink-0 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generatingRubric ? "Generating Rubric..." : "Draft Rubric with AI"}</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-[#E3F3EA] border border-[#1F7A4D]/30 flex items-center justify-between text-xs text-[#1F7A4D]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <div>
                  <strong>Draft Rubric Ready:</strong> 14 granular criteria created across 5 questions.
                  <span className="block text-[11px] text-[#5A6377] mt-0.5">
                    Ready for detailed review in the Rubric Editor workspace.
                  </span>
                </div>
              </div>
              <Link
                href="/exams/exam-t1-cs301/rubric"
                className="px-3 py-1.5 rounded-lg bg-[#1F7A4D] text-white font-semibold hover:bg-[#1F7A4D]/90 transition-colors shrink-0"
              >
                Open Rubric Editor
              </Link>
            </div>
          )}

          <div className="pt-4 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5A6377] hover:text-[#1A2030]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Questions</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
            >
              <span>Proceed to Mask Box</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: MASK REGION (LOCAL STUDENT PRIVACY) */}
      {currentStep === 4 && (
        <div className="space-y-6 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs">
          <div>
            <h2 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              4. Local Student Identity Masking
            </h2>
            <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
              Draw the student name and roll number box once. The worker paints opaque pixels over this box locally before images ever reach the Gemini API.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* Mask Box Coordinates */}
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#E6ECFA]/70 dark:bg-[#1E2A47]/70 border border-[#2A4A9A]/20">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2A4A9A] dark:text-[#93AEF2]">
                  <Shield className="w-4 h-4" />
                  <span>DPDP Act 2023 Compliance</span>
                </div>
                <p className="text-[11px] text-[#5A6377] dark:text-[#9AA3B6] mt-1.5 leading-relaxed">
                  Student scripts constitute personal data. Under India&apos;s DPDP Act, names must not be transmitted to AI training surfaces. Masking runs on your machine before network transfer.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-semibold text-[#5A6377]">X Offset (%):</label>
                  <input
                    type="number"
                    value={maskRegion.x}
                    onChange={(e) => setMaskRegion({ ...maskRegion, x: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5A6377]">Y Offset (%):</label>
                  <input
                    type="number"
                    value={maskRegion.y}
                    onChange={(e) => setMaskRegion({ ...maskRegion, y: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5A6377]">Box Width (%):</label>
                  <input
                    type="number"
                    value={maskRegion.w}
                    onChange={(e) => setMaskRegion({ ...maskRegion, w: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-md font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-[#5A6377]">Box Height (%):</label>
                  <input
                    type="number"
                    value={maskRegion.h}
                    onChange={(e) => setMaskRegion({ ...maskRegion, h: parseFloat(e.target.value) || 0 })}
                    className="w-full mt-1 p-2 border rounded-md font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Visual Cover Preview */}
            <div className="border border-[#DCE0E8] dark:border-[#2C3342] rounded-xl p-4 bg-[#F7F8FA] dark:bg-[#11141B] flex flex-col items-center">
              <div className="text-[11px] font-semibold text-[#5A6377] mb-2">
                Sample First Page Mask Preview
              </div>
              <div className="w-56 h-72 bg-white dark:bg-[#171B24] border border-[#DCE0E8] dark:border-[#2C3342] shadow-sm rounded-md relative p-3 text-[8px] text-[#5A6377] space-y-2">
                <div className="text-center font-bold text-[#1A2030] dark:text-[#E4E8F1] border-b pb-1">
                  JIIT NOIDA · B.TECH EXAMINATION
                </div>
                {/* Simulated Mask Box */}
                <div
                  className="absolute bg-[#1A2030]/90 text-white rounded flex items-center justify-center font-mono font-bold text-[9px] shadow-sm"
                  style={{
                    left: `${maskRegion.x}%`,
                    top: `${maskRegion.y + 10}%`,
                    width: `${maskRegion.w}%`,
                    height: `${maskRegion.h}%`,
                  }}
                >
                  [STUDENT NAME MASKED]
                </div>
                <div className="pt-16 space-y-1">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5A6377] hover:text-[#1A2030]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Key & Rubric</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentStep(5)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-2xs"
            >
              <span>Proceed to Booklet Ingestion</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: SCRIPTS READY (PERSON 2 CONTRACT SHELL) */}
      {currentStep === 5 && (
        <div className="space-y-6 rounded-2xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-6 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E3F3EA] text-[#1F7A4D] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#1A2030] dark:text-[#E4E8F1]">
                5. Exam Setup Complete: Ready for Scripts
              </h2>
              <p className="text-xs text-[#5A6377] dark:text-[#9AA3B6] mt-0.5">
                Questions extracted, answer key saved, and privacy mask region configured.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] space-y-3">
            <h4 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">
              Next Operational Steps
            </h4>
            <ul className="text-xs text-[#5A6377] dark:text-[#9AA3B6] space-y-2 list-disc list-inside">
              <li>Open the Rubric Editor to fine-tune criterion weights and approve the frozen rubric version.</li>
              <li>Handwritten scripts will be ingested and evaluated with dual models (Gemini 3.5 Flash-Lite and 3.1 Flash-Lite) by Person 2.</li>
              <li>Discrepancies and low-confidence marks will automatically appear in your forced review queue.</li>
            </ul>
          </div>

          <div className="pt-4 border-t border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5A6377] hover:text-[#1A2030]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Mask Box</span>
            </button>

            <Link
              href="/exams/exam-t1-cs301/rubric"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-[#2A4A9A] text-white text-xs font-semibold hover:bg-[#2A4A9A]/90 transition-colors shadow-sm"
            >
              <span>Open Rubric Editor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
