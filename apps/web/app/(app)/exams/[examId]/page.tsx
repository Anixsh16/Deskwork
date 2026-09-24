"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, FileSpreadsheet, MoreVertical, Trash2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { AnswerKeyCard } from "@/components/exam/answer-key-card";
import { PapersTable } from "@/components/exam/papers-table";
import { QuestionPaperCard } from "@/components/exam/question-paper-card";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Badge, Skeleton } from "@/components/ui/primitives";
import { api, download } from "@/lib/api";
import type { Exam } from "@/lib/types";
import { fmt } from "@/lib/types";

export default function ExamPage() {
  const { examId } = useParams<{ examId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const exam = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => api<Exam>(`/exams/${examId}`),
    refetchInterval: (q) => {
      const e = q.state.data;
      if (!e) return false;
      const busy =
        e.paper_status === "processing" ||
        e.key_status === "processing" ||
        e.papers.some((p) => p.status === "reading" || p.status === "checking");
      return busy ? 2500 : false;
    },
  });

  const del = useMutation({
    mutationFn: () => api(`/exams/${examId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Exam deleted");
      router.replace("/exams");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (exam.isError) return <p className="text-muted">{(exam.error as Error).message}</p>;
  if (!exam.data)
    return (
      <div className="mx-auto max-w-6xl">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-3 h-9 w-96 max-w-full" />
        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );

  const e = exam.data;
  const ready = e.paper_status === "ready" && e.key_status === "ready";
  const checked = e.papers.filter((p) => p.status === "checked").length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <Link href={`/courses/${e.course_id}`} className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
            <ChevronLeft className="size-4" />
            {e.course_name}
          </Link>
          <h1 className="mt-1 text-[28px] leading-tight font-normal tracking-[-0.01em] text-ink">{e.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {e.kind && <Badge>{e.kind}</Badge>}
            {e.total_marks !== null && <Badge tone="brand">{fmt(e.total_marks)} marks</Badge>}
            {e.duration && <Badge>{e.duration}</Badge>}
            {!!e.papers.length && (
              <Badge tone={checked === e.papers.length ? "ok" : "neutral"}>
                {checked}/{e.papers.length} papers checked
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!!checked && (
            <Button
              variant="outline"
              icon={<FileSpreadsheet className="size-4" />}
              onClick={() => download(`/exams/${examId}/export.xlsx`, "marks.xlsx").catch((err) => toast.error(err.message))}
            >
              Export marks
            </Button>
          )}
          <Menu
            trigger={
              <IconButton label="Exam options">
                <MoreVertical className="size-4" />
              </IconButton>
            }
          >
            <MenuItem danger icon={<Trash2 />} onSelect={() => setConfirmDelete(true)}>
              Delete exam
            </MenuItem>
          </Menu>
        </div>
      </div>

      <Steps exam={e} />

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <QuestionPaperCard exam={e} />
        <AnswerKeyCard exam={e} />
      </div>

      <div className="mt-8">
        <PapersTable exam={e} ready={ready} />
      </div>

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this exam?"
        description="The question paper, answer key and every checked student paper will be permanently removed."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={del.isPending} onClick={() => del.mutate()}>
            Delete exam
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function Steps({ exam }: { exam: Exam }) {
  const steps = [
    { label: "Question paper", done: exam.paper_status === "ready" },
    { label: "Answer key", done: exam.key_status === "ready" },
    { label: "Student papers", done: exam.papers.length > 0 },
    { label: "Checked", done: exam.papers.length > 0 && exam.papers.every((p) => p.status === "checked") },
  ];
  const current = steps.findIndex((s) => !s.done);
  return (
    <ol className="mt-6 flex flex-wrap items-center gap-2">
      {steps.map((s, i) => (
        <li key={s.label} className="flex items-center gap-2">
          <span
            className={
              s.done
                ? "flex h-8 items-center gap-2 rounded-full bg-ok-soft px-3 text-[13px] font-medium text-ok"
                : i === current
                  ? "flex h-8 items-center gap-2 rounded-full bg-brand-soft px-3 text-[13px] font-medium text-brand-strong"
                  : "flex h-8 items-center gap-2 rounded-full bg-hover px-3 text-[13px] text-muted"
            }
          >
            <span className="flex size-5 items-center justify-center rounded-full bg-surface/80 text-[11px] font-semibold">{s.done ? "✓" : i + 1}</span>
            {s.label}
          </span>
          {i < steps.length - 1 && <span className="h-px w-5 bg-line" />}
        </li>
      ))}
    </ol>
  );
}
