"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { itemLabel } from "@/components/exam/answer-key-card";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input, Textarea } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Exam, KeyItem } from "@/lib/types";
import { fmt } from "@/lib/types";

function maxFor(exam: Exam, k: KeyItem) {
  const q = exam.questions.find((x) => x.number === k.question_number);
  if (!q) return 0;
  if (!k.part_label) return Number(q.marks);
  return Number(q.parts.find((p) => p.label === k.part_label)?.marks ?? 0);
}

/** The teacher can adjust how marks are split within each answer before checking. */
export function KeyEditor({ exam, open, onOpenChange }: { exam: Exam; open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Edit marking scheme" description="Each answer's points must add up to its marks. The AI checks strictly against these points." className="max-w-3xl">
      <Body exam={exam} onDone={() => onOpenChange(false)} />
    </Dialog>
  );
}

function Body({ exam, onDone }: { exam: Exam; onDone: () => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<KeyItem[]>(() =>
    exam.key_items.map((k) => ({ ...k, marking_points: k.marking_points.map((p) => ({ ...p, marks: Number(p.marks) })) })),
  );

  const save = useMutation({
    mutationFn: () => api(`/exams/${exam.id}/key-items`, { method: "PUT", body: JSON.stringify(draft) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exam", exam.id] });
      toast("Marking scheme saved");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = (i: number, patch: Partial<KeyItem>) => setDraft((d) => d.map((k, j) => (i === j ? { ...k, ...patch } : k)));

  return (
    <>
      <div className="scroll-thin flex max-h-[62vh] flex-col gap-4 overflow-y-auto pr-1">
        {draft.map((k, i) => {
          const max = maxFor(exam, k);
          const sum = k.marking_points.reduce((s, p) => s + (Number(p.marks) || 0), 0);
          return (
            <div key={`${k.question_number}-${k.part_label}`} className="rounded-2xl border border-line-soft p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink">{itemLabel(k.question_number, k.part_label)}</span>
                <span className={Math.abs(sum - max) > 1e-6 ? "text-xs font-medium text-bad" : "text-xs text-muted"}>
                  {fmt(sum)} / {fmt(max)} marks
                </span>
              </div>
              <label className="mt-2 block text-xs text-muted">Final answer</label>
              <Input className="mt-1 h-9" value={k.final_answer ?? ""} onChange={(e) => update(i, { final_answer: e.target.value || null })} />
              <div className="mt-3 flex flex-col gap-2">
                {k.marking_points.map((p, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Textarea
                      rows={1}
                      value={p.point}
                      onChange={(e) => update(i, { marking_points: k.marking_points.map((x, m) => (m === j ? { ...x, point: e.target.value } : x)) })}
                    />
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      className="h-10 w-20"
                      value={p.marks}
                      onChange={(e) => update(i, { marking_points: k.marking_points.map((x, m) => (m === j ? { ...x, marks: Number(e.target.value) } : x)) })}
                    />
                    <IconButton label="Remove point" onClick={() => update(i, { marking_points: k.marking_points.filter((_, m) => m !== j) })}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  icon={<Plus className="size-4" />}
                  onClick={() => update(i, { marking_points: [...k.marking_points, { point: "", marks: 0.5 }] })}
                >
                  Add point
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button loading={save.isPending} onClick={() => save.mutate()}>
          Save scheme
        </Button>
      </div>
    </>
  );
}
