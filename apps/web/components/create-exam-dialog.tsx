"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { CourseSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

const KINDS = ["T1", "T2", "End Semester", "Assignment", "Quiz", "Other"];

export function CreateExamDialog({
  open,
  onOpenChange,
  courseId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  courseId?: string;
}) {
  const qc = useQueryClient();
  const router = useRouter();
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => api<CourseSummary[]>("/courses"), enabled: open });
  const [picked, setPicked] = useState("");
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState("T2");

  const course = picked || courseId || courses.data?.[0]?.id || "";

  const create = useMutation({
    mutationFn: () => api<{ id: string }>("/exams", { method: "POST", body: JSON.stringify({ course_id: course, title, kind }) }),
    onSuccess: ({ id }) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["course", course] });
      onOpenChange(false);
      setTitle("");
      router.push(`/exams/${id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const noCourses = courses.isSuccess && courses.data.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Create an exam" description="Then upload its question paper, answer key and the students' papers.">
      {noCourses ? (
        <div className="text-sm text-muted">
          Create a course first. Exams belong to a course.
          <div className="mt-5 flex justify-end">
            <Button onClick={() => onOpenChange(false)}>Okay</Button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <Field label="Course" htmlFor="e-course">
            <select
              id="e-course"
              value={course}
              onChange={(e) => setPicked(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-[15px] text-ink outline-none focus:border-brand"
            >
              {courses.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.code ? ` (${c.code})` : ""}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Exam name" htmlFor="e-title">
            <Input id="e-title" required minLength={2} autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="T2 Examination, Even 2026" />
          </Field>
          <Field label="Type">
            <div className="flex flex-wrap gap-2">
              {KINDS.map((k) => (
                <button
                  type="button"
                  key={k}
                  onClick={() => setKind(k)}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm transition-colors",
                    kind === k ? "border-brand-tint bg-brand-soft font-medium text-brand-strong" : "border-line text-ink-2 hover:bg-hover",
                  )}
                >
                  {k}
                </button>
              ))}
            </div>
          </Field>
          <div className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={create.isPending} disabled={!course || title.trim().length < 2}>
              Create exam
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
