"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  EmptyState,
  PageHeader,
  Progress,
  Spinner,
} from "@/components/ui/primitives";
import { ErrorNotice, selectClass } from "@/components/feature-controls";
import { MarkCard, type Draft } from "@/components/exam/mark-card";
import { Markdown } from "@/components/markdown";
import type { Exam, Mark, PaperDetail, Question } from "@/lib/types";
type Student = {
  id: string;
  student_name: string | null;
  enrollment_no: string | null;
  status: string;
  is_sample: boolean;
  error: string | null;
  marks: Mark[];
};
type View = {
  question: Question;
  papers: Student[];
  batches: {
    id: string;
    question_number: number;
    status: string;
    completed: number;
    failed: number;
    skipped: number;
    total: number;
    error: string | null;
  }[];
};
export default function QuestionWise() {
  const { examId } = useParams<{ examId: string }>();
  const qc = useQueryClient();
  const [picked, setPicked] = useState(0),
    [selected, setSelected] = useState<string[]>([]),
    [student, setStudent] = useState("");
  const [dirty, setDirty] = useState(false);
  const ex = useQuery({
    queryKey: ["exam", examId],
    queryFn: () => api<Exam>("/exams/" + examId),
  });
  const number = picked || ex.data?.questions[0]?.number || 0;
  const q = useQuery({
    queryKey: ["question-check", examId, number],
    queryFn: () =>
      api<View>(`/exams/${examId}/question-checks?question_number=${number}`),
    enabled: !!number,
    refetchInterval: (q) =>
      q.state.data?.batches.some((b) =>
        ["queued", "processing"].includes(b.status),
      ) || q.state.data?.papers.some((p) => p.status === "checking")
        ? 2000
        : false,
  });
  const active = q.data?.batches.find((b) =>
    ["queued", "processing"].includes(b.status),
  );
  const row = q.data?.papers.find((p) => p.id === student) ?? q.data?.papers[0];
  const detail = useQuery({
    queryKey: [
      "question-paper",
      row?.id,
      number,
      row?.status,
      row?.marks.map((m) => m.final_marks).join(":"),
    ],
    queryFn: () => api<PaperDetail>("/papers/" + row!.id),
    enabled: !!row,
  });
  const start = useMutation({
    mutationFn: () =>
      api(`/exams/${examId}/question-checks`, {
        method: "POST",
        body: JSON.stringify({ question_number: number, paper_ids: selected }),
      }),
    onSuccess: () => {
      toast("Checking this question across the selected papers");
      qc.invalidateQueries({ queryKey: ["question-check"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-7xl">
      <Link
        href={"/exams/" + examId}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted"
      >
        <ArrowLeft className="size-4" />
        Back to exam
      </Link>
      <PageHeader
        eyebrow={ex.data?.title}
        title="Check question-wise"
        subtitle="One question, the whole class. Compare answers against the same marking scheme."
      />
      <div className="my-6 flex flex-wrap items-center gap-3">
        <select
          aria-label="Question to check"
          disabled={dirty}
          className={selectClass + " max-w-xs"}
          value={number}
          onChange={(e) => {
            setPicked(+e.target.value);
            setSelected([]);
          }}
        >
          {ex.data?.questions.map((x) => (
            <option key={x.number} value={x.number}>
              Question {x.number} · {x.marks} marks
            </option>
          ))}
        </select>
        <Button
          loading={start.isPending}
          disabled={dirty || !!active || !q.data?.papers.length}
          onClick={() => start.mutate()}
          icon={<Sparkles className="size-4" />}
        >
          {selected.length
            ? `Check ${selected.length} selected`
            : "Check remaining answers"}
        </Button>
        <span className="text-xs text-muted">
          Already marked answers are preserved.
        </span>
      </div>
      <ErrorNotice error={q.error || ex.error} />
      {active && (
        <Card className="mb-5 p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span>Checking Q{active.question_number}</span>
            <span>
              {active.completed + active.failed + active.skipped} /{" "}
              {active.total}
            </span>
          </div>
          <Progress
            value={
              (100 * (active.completed + active.failed + active.skipped)) /
              Math.max(1, active.total)
            }
          />
          <p className="mt-2 text-xs text-muted">
            {active.completed} checked · {active.failed} failed ·{" "}
            {active.skipped} skipped
          </p>
        </Card>
      )}
      {!active && q.data?.batches[0] && (
        <p className="mb-4 text-sm text-muted">
          Last batch: {q.data.batches[0].completed} checked,{" "}
          {q.data.batches[0].failed} failed, {q.data.batches[0].skipped}{" "}
          skipped. {q.data.batches[0].error}
        </p>
      )}
      {q.data && (
        <Card className="mb-5 p-5">
          <Badge tone="brand">Q{number}</Badge>
          <div className="mt-2">
            <Markdown>{q.data.question.text}</Markdown>
          </div>
          {q.data.question.parts.map((p) => (
            <p className="mt-2 text-sm" key={p.label}>
              ({p.label}) {p.text} [{p.marks} marks]
            </p>
          ))}
        </Card>
      )}
      {q.isLoading ? (
        <Spinner />
      ) : !q.data?.papers.length ? (
        <EmptyState
          icon={<Users />}
          title="Upload student papers first"
          body="Return to the exam and add answer sheets. They will appear here for question-wise checking."
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[280px_1fr]">
          <Card className="overflow-hidden">
            <div className="border-b border-line-soft p-4 text-sm font-medium">
              {q.data.papers.length} answer sheets
            </div>
            {q.data.papers.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 border-b border-line-soft p-4 ${row?.id === p.id ? "bg-brand-soft" : ""}`}
              >
                <input
                  aria-label={`Select ${p.student_name || p.enrollment_no || "paper"}`}
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  disabled={
                    p.status === "checking" ||
                    p.marks.filter((m) => m.final_marks !== null).length ===
                      (q.data!.question.parts.length || 1)
                  }
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, p.id]
                        : selected.filter((id) => id !== p.id),
                    )
                  }
                />
                <button
                  className="min-w-0 flex-1 text-left"
                  disabled={dirty}
                  onClick={() => setStudent(p.id)}
                >
                  <div className="truncate text-sm font-medium">
                    {p.student_name || "Unnamed paper"}
                  </div>
                  <div className="text-xs text-muted">
                    {p.enrollment_no}
                    {p.is_sample ? " · Sample" : ""}
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge
                      tone={p.marks.some((m) => m.flagged) ? "warn" : "neutral"}
                    >
                      {p.marks.length &&
                      p.marks.every((m) => m.final_marks !== null)
                        ? `${p.marks.reduce((n, m) => n + Number(m.final_marks), 0)} / ${q.data.question.marks}`
                        : "Not fully checked"}
                    </Badge>
                    {p.status === "checking" && <Spinner />}
                  </div>
                  {p.error && (
                    <p className="mt-1 text-xs text-bad">{p.error}</p>
                  )}
                </button>
              </div>
            ))}
          </Card>
          <div>
            {detail.isLoading ? (
              <Spinner />
            ) : (
              detail.data && (
                <QuestionReview
                  key={row!.id + ":" + number}
                  paper={detail.data}
                  number={number}
                  onDirty={setDirty}
                  busy={!!active || row?.status === "checking"}
                  refresh={() => {
                    qc.invalidateQueries({ queryKey: ["question-paper"] });
                    qc.invalidateQueries({ queryKey: ["question-check"] });
                    qc.invalidateQueries({ queryKey: ["exam", examId] });
                  }}
                />
              )
            )}
            <ErrorNotice error={detail.error} />
          </div>
        </div>
      )}
    </div>
  );
}
function QuestionReview({
  paper,
  number,
  refresh,
  onDirty,
  busy,
}: {
  paper: PaperDetail;
  number: number;
  onDirty: (dirty: boolean) => void;
  busy: boolean;
  refresh: () => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({}),
    [page, setPage] = useState(0);
  const unsaved = Object.keys(drafts).length > 0;
  useEffect(() => {
    if (!unsaved) return;
    const unload = (e: BeforeUnloadEvent) => e.preventDefault();
    const click = (e: MouseEvent) => {
      if (
        (e.target as Element).closest("a[href]") &&
        !window.confirm("Leave without saving these marks?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", click, true);
    };
  }, [unsaved]);
  const marks = paper.marks.filter((m) => m.question_number === number);
  const save = useMutation({
    mutationFn: () =>
      api(`/papers/${paper.id}/marks`, {
        method: "PATCH",
        body: JSON.stringify(
          Object.entries(drafts).map(([label, d]) => ({
            question_number: number,
            part_label: label,
            marks: d.marks,
            note: d.note,
          })),
        ),
      }),
    onSuccess: () => {
      setDrafts({});
      onDirty(false);
      refresh();
      toast("Marks saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="p-5">
      <div className="flex flex-wrap justify-between gap-3">
        <h2 className="text-lg">{paper.student_name || "Student answer"}</h2>
        <Link
          className="text-sm text-brand"
          href={`/exams/${paper.exam.id}/papers/${paper.id}`}
        >
          Open complete paper
        </Link>
      </div>
      <div className="mt-4 grid items-start gap-5 xl:grid-cols-2">
        <div className="sticky top-20">
          <div className="mb-3 flex flex-wrap gap-2">
            {paper.page_urls.map((_, i) => (
              <button
                key={i}
                className={`rounded-full px-3 py-1 text-xs ${page === i ? "bg-brand text-white" : "bg-hover"}`}
                onClick={() => setPage(i)}
              >
                Page {i + 1}
              </button>
            ))}
          </div>
          {paper.page_urls[page] && (
            <img
              src={paper.page_urls[page]}
              alt={`Student answer page ${page + 1}`}
              className="w-full rounded-xl border border-line"
            />
          )}
        </div>
        <fieldset disabled={busy} className="min-w-0 space-y-3">
          {busy && (
            <p className="text-xs text-muted">
              Review and edit after this batch finishes.
            </p>
          )}
          {marks.length ? (
            marks.map((m) => (
              <MarkCard
                key={m.part_label}
                mark={m}
                draft={drafts[m.part_label]}
                question={
                  paper.questions.find((q) => q.number === number)?.text ?? ""
                }
                keyItem={paper.key_items.find(
                  (k) =>
                    k.question_number === number &&
                    k.part_label === m.part_label,
                )}
                onDraft={(d) => {
                  const n = { ...drafts };
                  if (d) n[m.part_label] = d;
                  else delete n[m.part_label];
                  setDrafts(n);
                  onDirty(Object.keys(n).length > 0);
                }}
                onJump={(p) => setPage(p - 1)}
              />
            ))
          ) : (
            <div className="rounded-2xl bg-canvas p-6 text-sm text-muted">
              This question has not been checked yet. Select this student or use
              Check remaining answers.
            </div>
          )}
          {Object.keys(drafts).length > 0 && (
            <Button
              disabled={paper.status === "checking"}
              loading={save.isPending}
              icon={<Check className="size-4" />}
              onClick={() => save.mutate()}
            >
              Save marks
            </Button>
          )}
          {unsaved && (
            <Button
              variant="ghost"
              onClick={() => {
                setDrafts({});
                onDirty(false);
              }}
            >
              Discard changes
            </Button>
          )}
          <details className="rounded-2xl bg-canvas p-4 text-sm">
            <summary className="cursor-pointer font-medium">
              Official answer key
            </summary>
            {paper.key_items
              .filter((k) => k.question_number === number)
              .map((k) => (
                <div className="mt-3" key={k.part_label}>
                  <b>
                    Q{number}
                    {k.part_label}
                  </b>
                  <Markdown>{k.answer}</Markdown>
                </div>
              ))}
          </details>
        </fieldset>
      </div>
    </Card>
  );
}
