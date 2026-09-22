"use client";

import React from "react";
import { Question, AnswerType, BloomLevel } from "@/lib/types";
import { Plus, Trash2, ArrowUp, ArrowDown, AlertTriangle, CheckCircle2, Info } from "lucide-react";

interface QuestionEditorProps {
  questions: Question[];
  onChange: (updated: Question[]) => void;
  targetMaxMarks: number;
}

const ANSWER_TYPES: { value: AnswerType; label: string }[] = [
  { value: "theory", label: "Theory (Descriptive)" },
  { value: "numeric", label: "Numerical / Mathematical" },
  { value: "code", label: "Program Code (Always Flagged)" },
  { value: "diagram", label: "Diagram / Architecture (Always Flagged)" },
  { value: "mcq", label: "Multiple Choice" },
];

const BLOOM_LEVELS: { value: BloomLevel; label: string }[] = [
  { value: "remember", label: "L1: Remember" },
  { value: "understand", label: "L2: Understand" },
  { value: "apply", label: "L3: Apply" },
  { value: "analyze", label: "L4: Analyze" },
  { value: "evaluate", label: "L5: Evaluate" },
  { value: "create", label: "L6: Create" },
];

export function QuestionEditor({ questions, onChange, targetMaxMarks }: QuestionEditorProps) {
  const currentTotal = questions.reduce((acc, q) => acc + (Number(q.max_marks) || 0), 0);
  const marksMatch = Math.abs(currentTotal - targetMaxMarks) < 0.001;

  const handleUpdate = (index: number, updates: Partial<Question>) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const handleAddQuestion = () => {
    const nextOrd = questions.length + 1;
    const newQuestion: Question = {
      id: `q-${Date.now()}-${nextOrd}`,
      exam_id: questions[0]?.exam_id || "temp-exam",
      label: `${nextOrd}`,
      ord: nextOrd,
      text: "",
      max_marks: 5,
      answer_type: "theory",
      bloom: "understand",
      printed_co: null,
    };
    onChange([...questions, newQuestion]);
  };

  const handleDelete = (index: number) => {
    const updated = questions.filter((_, i) => i !== index).map((q, idx) => ({
      ...q,
      ord: idx + 1,
    }));
    onChange(updated);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= questions.length) return;

    const copy = [...questions];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const reordered = copy.map((q, idx) => ({ ...q, ord: idx + 1 }));
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Marks Balance Header Banner */}
      <div
        className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
          marksMatch
            ? "bg-[#E3F3EA] border-[#1F7A4D]/30 text-[#1F7A4D]"
            : "bg-[#FBF1D9] border-[#9A6700]/30 text-[#9A6700]"
        }`}
      >
        <div className="flex items-center gap-2">
          {marksMatch ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          )}
          <span>
            {marksMatch ? (
              <strong>Marks Balance Verified:</strong>
            ) : (
              <strong>Marks Discrepancy:</strong>
            )}{" "}
            Extracted questions total{" "}
            <span className="font-mono font-bold">{currentTotal}</span> marks out of{" "}
            <span className="font-mono font-bold">{targetMaxMarks}</span> maximum examination marks.
          </span>
        </div>

        <button
          type="button"
          onClick={handleAddQuestion}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2A4A9A] text-white font-semibold hover:bg-[#2A4A9A]/90 transition-colors shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Question</span>
        </button>
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div
            key={q.id || idx}
            className="p-4 rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] space-y-3 shadow-2xs hover:border-[#2A4A9A]/40 transition-colors"
          >
            {/* Top row: Label, Max Marks, Answer Type, Bloom, Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E9ECF2] dark:border-[#222835] pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#5A6377]">
                  #{idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <label className="text-[11px] font-semibold text-[#5A6377]">Label:</label>
                  <input
                    type="text"
                    value={q.label}
                    onChange={(e) => handleUpdate(idx, { label: e.target.value })}
                    className="w-16 px-2 py-1 text-xs font-mono font-bold text-center border border-[#DCE0E8] dark:border-[#2C3342] rounded-md bg-[#F7F8FA] dark:bg-[#11141B] text-[#2A4A9A]"
                  />
                </div>

                <div className="flex items-center gap-1 ml-2">
                  <label className="text-[11px] font-semibold text-[#5A6377]">Marks:</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={q.max_marks}
                    onChange={(e) => handleUpdate(idx, { max_marks: parseFloat(e.target.value) || 0 })}
                    className="w-16 px-2 py-1 text-xs font-mono font-bold text-center border border-[#DCE0E8] dark:border-[#2C3342] rounded-md bg-[#F7F8FA] dark:bg-[#11141B] text-[#B8352A]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Answer Type */}
                <select
                  value={q.answer_type}
                  onChange={(e) => handleUpdate(idx, { answer_type: e.target.value as AnswerType })}
                  className="px-2 py-1 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-md bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1]"
                >
                  {ANSWER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>

                {/* Bloom Level */}
                <select
                  value={q.bloom || "understand"}
                  onChange={(e) => handleUpdate(idx, { bloom: e.target.value as BloomLevel })}
                  className="px-2 py-1 text-xs border border-[#DCE0E8] dark:border-[#2C3342] rounded-md bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1]"
                >
                  {BLOOM_LEVELS.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>

                {/* Reorder and Delete */}
                <div className="flex items-center gap-1 border-l border-[#E9ECF2] dark:border-[#222835] pl-2">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => handleMove(idx, "up")}
                    className="p-1 text-[#5A6377] hover:text-[#1A2030] disabled:opacity-30"
                    title="Move question up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === questions.length - 1}
                    onClick={() => handleMove(idx, "down")}
                    className="p-1 text-[#5A6377] hover:text-[#1A2030] disabled:opacity-30"
                    title="Move question down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(idx)}
                    className="p-1 text-[#B8352A] hover:bg-[#FBEAE8] rounded-md transition-colors ml-1"
                    title="Delete question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Question Text Area */}
            <div>
              <textarea
                rows={2}
                value={q.text}
                onChange={(e) => handleUpdate(idx, { text: e.target.value })}
                placeholder="Enter complete question text, including parameters and requirements..."
                className="w-full p-2.5 text-xs rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
              />
            </div>

            {/* Reference CO Footer (Reference only note) */}
            <div className="flex items-center justify-between text-[11px] text-[#5A6377] dark:text-[#9AA3B6]">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">Printed CO Reference:</span>
                <input
                  type="text"
                  placeholder="e.g. CO2 (optional)"
                  value={q.printed_co || ""}
                  onChange={(e) => handleUpdate(idx, { printed_co: e.target.value || null })}
                  className="w-24 px-1.5 py-0.5 text-[11px] border border-[#DCE0E8] dark:border-[#2C3342] rounded bg-[#F7F8FA] dark:bg-[#11141B]"
                />
                <span className="text-[10px] text-[#5A6377] italic ml-1">
                  (Reference text only. Never used in grading logic)
                </span>
              </div>

              {(q.answer_type === "code" || q.answer_type === "diagram") && (
                <span className="text-[10px] text-[#B8352A] font-semibold bg-[#FBEAE8] px-2 py-0.5 rounded">
                  Will be flagged for teacher review during grading
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
