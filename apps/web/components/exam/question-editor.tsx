"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Exam, Question } from "@/lib/types";
import { fmt } from "@/lib/types";

/** Lets the teacher fix anything the AI misread in the question paper. */
export function QuestionEditor({ exam, open, onOpenChange }: { exam: Exam; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edit questions" description="Correct any text or marks. Sub-part marks must add up to the question's marks." className="max-w-3xl">
      <Body exam={exam} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Body({ exam, onDone }: { exam: Exam; onDone: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Question[]>(() =>
    exam.questions.map((q) => ({ ...q, marks: Number(q.marks), parts: q.parts.map((p) => ({ ...p, marks: Number(p.marks) })) })),
  );

  const checked = exam.papers.filter((p) => p.status === "checked").length;
  const save = useMutation({
    mutationFn: () => api<{ papers_reset: number }>(`/exams/${exam.id}/questions`, { method: "PUT", body: JSON.stringify(draft) }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["exam", exam.id] });
      toast(r.papers_reset ? `Questions saved. ${r.papers_reset} checked paper${r.papers_reset > 1 ? "s" : ""} need checking again.` : "Questions saved");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (i: number, patch: Partial<Question>) => setDraft((d) => d.map((q, j) => (i === j ? { ...q, ...patch } : q)));
  const total = draft.reduce((s, q) => s + (Number(q.marks) || 0), 0);

  return (
    <>
      <div className="scroll-thin flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
        {draft.map((q, i) => {
          const partSum = q.parts.reduce((s, p) => s + (Number(p.marks) || 0), 0);
          const mismatch = q.parts.length > 0 && Math.abs(partSum - q.marks) > 1e-6;
          return (
            <div key={q.number} className="rounded-2xl border border-line-soft p-4">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-ink">Q{q.number}</span>
                <label className="ml-auto flex items-center gap-2 text-xs text-muted">
                  Marks
                  <Input type="number" step="0.5" min="0" value={q.marks} onChange={(e) => update(i, { marks: Number(e.target.value) })} className="h-9 w-20" />
                </label>
              </div>
              <Textarea className="mt-2" rows={3} value={q.text} onChange={(e) => update(i, { text: e.target.value })} />
              {q.parts.map((p, k) => (
                <div key={p.label} className="mt-2 flex items-start gap-2">
                  <span className="mt-2.5 w-7 text-sm font-medium text-ink-2">({p.label})</span>
                  <Textarea
                    rows={2}
                    value={p.text}
                    onChange={(e) => update(i, { parts: q.parts.map((x, m) => (m === k ? { ...x, text: e.target.value } : x)) })}
                  />
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    className="h-10 w-20"
                    value={p.marks}
                    onChange={(e) => update(i, { parts: q.parts.map((x, m) => (m === k ? { ...x, marks: Number(e.target.value) } : x)) })}
                  />
                </div>
              ))}
              {mismatch && <p className="mt-2 text-xs text-bad">Sub-parts add up to {fmt(partSum)}, but the question is worth {fmt(q.marks)}.</p>}
            </div>
          );
        })}
      </div>
      {!!checked && (
        <p className="mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-[13px] text-warn">
          {checked} paper{checked > 1 ? "s are" : " is"} already checked. Changing only marks keeps the checking (marks above a new maximum are capped and flagged). Adding, removing or relabelling questions or parts means those papers must be checked again.
        </p>
      )}
      <div className="mt-5 flex items-center justify-between gap-2">
        <span className="text-sm text-muted">Total: {fmt(total)} marks</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button loading={save.isPending} onClick={() => save.mutate()}>
            Save questions
          </Button>
        </div>
      </div>
    </>
  );
}
