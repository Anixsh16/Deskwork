"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Library,
  RefreshCw,
  FilePlus2,
  Download,
  Pencil,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { api, apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  PageHeader,
  Input,
  Textarea,
  Field,
  EmptyState,
  Spinner,
} from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import {
  CourseSelect,
  ErrorNotice,
  selectClass,
} from "@/components/feature-controls";
import { Markdown } from "@/components/markdown";
import type { ExamSummary, Part } from "@/lib/types";
type Question = {
  id: string;
  course_id: string;
  course_name: string;
  text: string;
  topic: string;
  difficulty: string;
  kind: string;
  marks: number;
  parts: Part[];
  answer: string | null;
  has_figure: boolean;
};
type Result = {
  questions: Question[];
  total: number;
  topics: string[];
  imports: { status: string; n: number }[];
};
export default function Bank() {
  const qc = useQueryClient(),
    router = useRouter();
  const [course, setCourse] = useState(""),
    [search, setSearch] = useState(""),
    [topic, setTopic] = useState(""),
    [difficulty, setDifficulty] = useState(""),
    [kind, setKind] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Question[]>([]);
  const [assembling, setAssembling] = useState(false),
    [title, setTitle] = useState("Question bank paper"),
    [target, setTarget] = useState("");
  const [editing, setEditing] = useState<Question | null>(null);
  const params = new URLSearchParams({
    q: search,
    topic,
    difficulty,
    kind,
    offset: String(offset),
  });
  if (course) params.set("course_id", course);
  const q = useQuery({
    queryKey: ["bank", params.toString()],
    queryFn: () => api<Result>("/question-bank?" + params),
    refetchInterval: (q) =>
      q.state.data?.imports.some((i) =>
        ["queued", "processing"].includes(i.status),
      )
        ? 3000
        : false,
  });
  const exams = useQuery({
    queryKey: ["exams"],
    queryFn: () => api<ExamSummary[]>("/exams"),
    enabled: assembling,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["bank"] });
  const collect = useMutation({
    mutationFn: () =>
      api<{ queued: number }>("/question-bank/collect", { method: "POST" }),
    onSuccess: (r) => {
      refresh();
      toast(
        r.queued
          ? `Collecting from ${r.queued} previous answers`
          : "Everything is already collected",
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const assemble = useMutation({
    mutationFn: () =>
      api<{ id: string }>("/question-bank/assemble", {
        method: "POST",
        body: JSON.stringify({
          ids: selected.map((q) => q.id),
          title,
          exam_id: target || null,
        }),
      }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["exams"] });
      router.push("/exams/" + r.id);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const toggle = (item: Question) => {
    if (selected.some((q) => q.id === item.id))
      setSelected(selected.filter((q) => q.id !== item.id));
    else if (selected.length && selected[0].course_id !== item.course_id)
      toast.error("Select questions from one course at a time");
    else setSelected([...selected, item]);
  };
  const exportDoc = async () => {
    try {
      const r = await apiFetch("/question-bank/export", {
        method: "POST",
        body: JSON.stringify({ ids: selected.map((q) => q.id), title }),
      });
      const url = URL.createObjectURL(await r.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "question-bank-paper.docx";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Your reusable library"
        title="Question bank"
        subtitle="Questions from your generated assignments and papers, organised by course and topic."
        actions={
          <Button
            variant="outline"
            loading={collect.isPending}
            icon={<RefreshCw className="size-4" />}
            onClick={() => collect.mutate()}
          >
            Collect previous questions
          </Button>
        }
      />
      <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <CourseSelect
          all
          value={course}
          onChange={(v) => {
            setCourse(v);
            setTopic("");
            setOffset(0);
          }}
        />
        <Input
          aria-label="Search questions"
          value={search}
          placeholder="Search question text"
          onChange={(e) => {
            setSearch(e.target.value);
            setOffset(0);
          }}
        />
        {[
          {
            label: "Topic",
            value: topic,
            options: q.data?.topics ?? [],
            set: setTopic,
          },
          {
            label: "Difficulty",
            value: difficulty,
            options: ["easy", "medium", "hard"],
            set: setDifficulty,
          },
          {
            label: "Type",
            value: kind,
            options: ["theory", "numerical", "code", "diagram", "mcq"],
            set: setKind,
          },
        ].map((f) => (
          <select
            key={f.label}
            className={selectClass}
            aria-label={f.label}
            value={f.value}
            onChange={(e) => {
              f.set(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">
              All{" "}
              {f.label === "Difficulty"
                ? "difficulties"
                : f.label.toLowerCase() + "s"}
            </option>
            {f.options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>
      <ErrorNotice error={q.error} />
      <div className="my-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {q.data?.total ?? 0} questions · New generated questions are collected
          automatically
        </p>
        {q.data?.imports.some((i) =>
          ["queued", "processing"].includes(i.status),
        ) && <Badge tone="brand">Collecting questions...</Badge>}
        {q.data?.imports.some((i) => i.status === "failed") && (
          <Badge tone="warn">
            Some collection failed. Use Collect to retry.
          </Badge>
        )}
      </div>
      {q.isLoading ? (
        <Spinner />
      ) : !q.data?.questions.length ? (
        <Card>
          <EmptyState
            icon={<Library />}
            title="Your questions belong here"
            body="Generate an assignment or paper in any course, or collect your previous conversations. Change your filters if no questions match."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {q.data.questions.map((item) => (
            <Card
              className={`p-5 transition-shadow hover:shadow-lift ${selected.some((q) => q.id === item.id) ? "ring-2 ring-brand" : ""}`}
              key={item.id}
            >
              <div className="flex items-start gap-3">
                <input
                  aria-label={`Select question ${item.text.slice(0, 60)}`}
                  className="mt-1 size-4 accent-blue-600"
                  type="checkbox"
                  checked={selected.some((q) => q.id === item.id)}
                  onChange={() => toggle(item)}
                />
                <div className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="brand">{item.topic}</Badge>
                    <Badge>{item.difficulty}</Badge>
                    <Badge>{item.kind}</Badge>
                    <span className="ml-auto text-sm text-muted">
                      {item.marks} marks
                    </span>
                  </div>
                  <p className="mt-3 text-xs text-muted">{item.course_name}</p>
                  <div className="mt-2 text-sm">
                    <Markdown>{item.text}</Markdown>
                  </div>
                  {item.parts.length > 0 && (
                    <ol className="mt-3 space-y-2 text-sm">
                      {item.parts.map((p) => (
                        <li key={p.label}>
                          ({p.label}) {p.text}{" "}
                          <span className="text-muted">[{p.marks}]</span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {item.has_figure && (
                    <p className="mt-3 text-xs text-warn">
                      Needs original figure before reuse.
                    </p>
                  )}
                  {item.answer && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer text-brand">
                        Show supplied answer
                      </summary>
                      <Markdown>{item.answer}</Markdown>
                    </details>
                  )}
                  <Button
                    className="mt-4"
                    size="sm"
                    variant="ghost"
                    icon={<Pencil className="size-3" />}
                    onClick={() => setEditing(item)}
                  >
                    Edit question
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {(q.data?.total ?? 0) > 30 && (
        <div className="mt-5 flex items-center justify-center gap-3">
          <Button
            variant="outline"
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - 30))}
          >
            Previous
          </Button>
          <span className="text-sm">
            {offset + 1}-{Math.min(offset + 30, q.data?.total ?? 0)}
          </span>
          <Button
            variant="outline"
            disabled={offset + 30 >= (q.data?.total ?? 0)}
            onClick={() => setOffset(offset + 30)}
          >
            Next
          </Button>
        </div>
      )}
      {selected.length > 0 && (
        <div className="sticky bottom-4 mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-ink p-4 text-white shadow-pop">
          <span className="mr-auto text-sm">
            {selected.length} selected ·{" "}
            {selected.reduce((n, q) => n + Number(q.marks), 0)} marks
          </span>
          <Button
            variant="outline"
            className="bg-white"
            icon={<Download className="size-4" />}
            onClick={exportDoc}
          >
            Word
          </Button>
          <Button
            icon={<FilePlus2 className="size-4" />}
            onClick={() => setAssembling(true)}
          >
            Use in an exam
          </Button>
          <button className="text-sm" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
      <Dialog
        open={assembling}
        onOpenChange={setAssembling}
        title="Build a paper"
        description="Selected questions keep their wording and marks. Add an answer key afterwards."
      >
        <div className="space-y-4">
          <Field label="Destination">
            <select
              className={selectClass}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            >
              <option value="">Create a new exam</option>
              {exams.data
                ?.filter(
                  (e) =>
                    e.course_id === selected[0]?.course_id &&
                    e.key_status !== "ready" &&
                    !e.paper_count,
                )
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.title}
                  </option>
                ))}
            </select>
          </Field>
          {!target && (
            <Field label="Exam title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          )}
          <Button
            loading={assemble.isPending}
            onClick={() => assemble.mutate()}
          >
            Create paper
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit question"
        description="Review wording and automatic labels before reuse."
      >
        {editing && (
          <QuestionEditor
            key={editing.id}
            question={editing}
            done={() => {
              setEditing(null);
              setSelected([]);
              refresh();
            }}
          />
        )}
      </Dialog>
    </div>
  );
}
function QuestionEditor({
  question,
  done,
}: {
  question: Question;
  done: () => void;
}) {
  const [v, setV] = useState(question);
  const save = useMutation({
    mutationFn: () =>
      api("/question-bank/" + v.id, { method: "PUT", body: JSON.stringify(v) }),
    onSuccess: () => {
      toast("Question saved");
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <Field label="Question text">
        <Textarea
          rows={6}
          value={v.text}
          onChange={(e) => setV({ ...v, text: e.target.value })}
        />
      </Field>
      <Field label="Topic">
        <Input
          value={v.topic}
          onChange={(e) => setV({ ...v, topic: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <select
          aria-label="Question difficulty"
          className={selectClass}
          value={v.difficulty}
          onChange={(e) => setV({ ...v, difficulty: e.target.value })}
        >
          {["easy", "medium", "hard"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Question type"
          className={selectClass}
          value={v.kind}
          onChange={(e) => setV({ ...v, kind: e.target.value })}
        >
          {["theory", "numerical", "code", "diagram", "mcq"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
      <label className="flex gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.has_figure}
          onChange={(e) => setV({ ...v, has_figure: e.target.checked })}
        />
        Requires an original figure
      </label>
      <Button
        loading={save.isPending}
        onClick={() => save.mutate()}
        icon={<Check className="size-4" />}
      >
        Save question
      </Button>
    </div>
  );
}
