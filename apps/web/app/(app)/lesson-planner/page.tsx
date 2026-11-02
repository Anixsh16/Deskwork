"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Clock3,
  Download,
  NotebookPen,
  Plus,
  Sparkles,
  Pencil,
  Check,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { api, download } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  Input,
  Textarea,
  PageHeader,
  Spinner,
  StatusPill,
} from "@/components/ui/primitives";
import { Dialog } from "@/components/ui/dialog";
import { CourseSelect, ErrorNotice } from "@/components/feature-controls";
type Activity = { activity: string; minutes: number; detail: string };
type Lecture = {
  title: string;
  topics: string[];
  objectives: string[];
  activities: Activity[];
  examples: string[];
  practice_questions: string[];
  source_numbers: number[];
};
type Plan = {
  id: string;
  title: string;
  course_id: string;
  course_name: string;
  status: string;
  error: string | null;
  config: { lectures: number; minutes: number };
  content: { overview: string; lectures: Lecture[]; coverage_notes: string };
  sources: { filename: string; page_start: number; page_end: number }[];
};
export default function Planner() {
  const qc = useQueryClient();
  const [course, setCourse] = useState("");
  const [chosen, setChosen] = useState("");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Lecture plan");
  const [count, setCount] = useState(6);
  const [duration, setDuration] = useState(50);
  const [topics, setTopics] = useState("");
  const [priorities, setPriorities] = useState("");
  const [examples, setExamples] = useState(2);
  const [practice, setPractice] = useState(2);
  const [editing, setEditing] = useState(false);
  const plans = useQuery({
    queryKey: ["plans", course],
    queryFn: () =>
      api<Plan[]>("/lesson-plans" + (course ? "?course_id=" + course : "")),
    refetchInterval: (q) =>
      q.state.data?.some((p) => ["processing", "queued"].includes(p.status))
        ? 2500
        : false,
  });
  const selected = plans.data?.find((p) => p.id === chosen) ?? plans.data?.[0];
  const generate = useMutation({
    mutationFn: () =>
      api<Plan>(`/courses/${course}/lesson-plans`, {
        method: "POST",
        body: JSON.stringify({
          title,
          lectures: count,
          minutes: duration,
          topics,
          priorities,
          examples,
          practice,
        }),
      }),
    onSuccess: (p) => {
      setChosen(p.id);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["plans"] });
      toast("Building your lecture plan");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Lesson planner"
        subtitle="Turn course material into a teaching sequence that fits your timetable."
        actions={
          <Button
            onClick={() => setOpen(true)}
            icon={<Plus className="size-4" />}
          >
            New plan
          </Button>
        }
      />
      <ErrorNotice error={plans.error} />
      <div className="mt-7 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <CourseSelect value={course} onChange={setCourse} all />
          <div className="mt-4 space-y-2">
            {plans.data?.map((p) => (
              <button
                key={p.id}
                onClick={() => setChosen(p.id)}
                className={`w-full rounded-2xl border p-4 text-left transition-colors ${selected?.id === p.id ? "border-brand-tint bg-brand-soft" : "border-line-soft hover:bg-canvas"}`}
              >
                <div className="font-medium">{p.title}</div>
                <div className="mt-1 text-xs text-muted">{p.course_name}</div>
                <div className="mt-3">
                  <StatusPill status={p.status} />
                </div>
              </button>
            ))}
          </div>
        </aside>
        <div>
          {plans.isLoading ? (
            <Spinner />
          ) : !selected ? (
            <Card>
              <EmptyState
                icon={<NotebookPen />}
                title="Plan your next lecture series"
                body="Choose the course, number of lectures and time available. Your slides provide the teaching material."
                action={
                  <Button onClick={() => setOpen(true)}>Create a plan</Button>
                }
              />
            </Card>
          ) : selected.status === "ready" ? (
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge tone="brand">Ready for teacher review</Badge>
                  <h2 className="mt-3 text-xl">{selected.title}</h2>
                  <p className="mt-1 text-sm text-muted">
                    {selected.config.lectures} lectures ·{" "}
                    {selected.config.minutes} minutes each
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={<Pencil className="size-4" />}
                    onClick={() => setEditing(true)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="tonal"
                    icon={<Download className="size-4" />}
                    onClick={() =>
                      download(
                        `/lesson-plans/${selected.id}/docx`,
                        "lesson-plan.docx",
                      ).catch((e) => toast.error(e.message))
                    }
                  >
                    Word
                  </Button>
                </div>
              </div>
              <p className="my-5 text-sm leading-relaxed text-ink-2">
                {selected.content.overview}
              </p>
              <div className="space-y-3">
                {selected.content.lectures.map((l, i) => (
                  <details
                    key={i}
                    open={i === 0}
                    className="rounded-2xl border border-line-soft p-4"
                  >
                    <summary className="cursor-pointer font-medium">
                      <span className="mr-3 inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-sm text-brand">
                        {i + 1}
                      </span>
                      {l.title}
                    </summary>
                    <div className="mt-4">
                      <div className="flex flex-wrap gap-2">
                        {l.topics.map((t) => (
                          <Badge key={t}>{t}</Badge>
                        ))}
                      </div>
                      <ul className="my-3 list-disc space-y-1 pl-5 text-sm text-muted">
                        {l.objectives.map((t) => (
                          <li key={t}>{t}</li>
                        ))}
                      </ul>
                      <div className="space-y-2">
                        {l.activities.map((a, j) => (
                          <div
                            key={j}
                            className="flex gap-4 rounded-xl bg-canvas p-3"
                          >
                            <div className="w-16 shrink-0 text-sm text-brand">
                              <Clock3 className="mb-1 size-4" />
                              {a.minutes} min
                            </div>
                            <div>
                              <div className="text-sm font-medium">
                                {a.activity}
                              </div>
                              <p className="mt-1 text-sm text-muted">
                                {a.detail}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-medium">Examples</h4>
                          <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-muted">
                            {l.examples.map((t, j) => (
                              <li key={j}>{t}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">
                            Practice questions
                          </h4>
                          <ul className="mt-2 list-disc space-y-2 pl-4 text-sm text-muted">
                            {l.practice_questions.map((t, j) => (
                              <li key={j}>{t}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <p className="mt-3 text-xs text-muted">
                        Sources:{" "}
                        {l.source_numbers
                          .map((n) => {
                            const s = selected.sources[n - 1];
                            return s
                              ? `${s.filename}, pp. ${s.page_start}-${s.page_end}`
                              : "";
                          })
                          .filter(Boolean)
                          .join("; ")}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
              <p className="mt-5 rounded-xl bg-warn-soft p-3 text-sm text-warn">
                {selected.content.coverage_notes}
              </p>
            </Card>
          ) : (
            <Card className="p-8">
              <StatusPill status={selected.status} />
              <p className="my-4 text-muted">
                {selected.error ||
                  "Reading the course outline and arranging lectures. You can leave this page while it works."}
              </p>
              {selected.status === "failed" && (
                <Button
                  onClick={async () => {
                    try {
                      await api(`/lesson-plans/${selected.id}/retry`, {
                        method: "POST",
                      });
                      qc.invalidateQueries({ queryKey: ["plans"] });
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  Retry
                </Button>
              )}
            </Card>
          )}
        </div>
      </div>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Plan a lecture series"
        description="Tell Deskwork how much teaching time you have. The plan is based on your uploaded slides."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            generate.mutate();
          }}
        >
          <Field label="Course">
            <CourseSelect value={course} onChange={setCourse} />
          </Field>
          {course && (
            <Link
              className="inline-flex items-center gap-2 text-sm text-brand"
              href={`/courses/${course}`}
            >
              <BookOpen className="size-4" />
              Review slides or upload more
            </Link>
          )}
          <Field label="Plan title" htmlFor="plan-title">
            <Input
              id="plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Number of lectures" htmlFor="plan-count">
              <Input
                id="plan-count"
                type="number"
                min={1}
                max={30}
                value={count}
                onChange={(e) => setCount(+e.target.value)}
              />
            </Field>
            <Field label="Minutes per lecture" htmlFor="plan-minutes">
              <Input
                id="plan-minutes"
                type="number"
                min={15}
                max={180}
                value={duration}
                onChange={(e) => setDuration(+e.target.value)}
              />
            </Field>
          </div>
          <Field label="Topics to cover" htmlFor="plan-topics">
            <Textarea
              id="plan-topics"
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="Leave blank to cover the uploaded syllabus"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Examples per lecture" htmlFor="plan-examples">
              <Input
                id="plan-examples"
                type="number"
                min={0}
                max={5}
                value={examples}
                onChange={(e) => setExamples(+e.target.value)}
              />
            </Field>
            <Field label="Practice questions" htmlFor="plan-practice">
              <Input
                id="plan-practice"
                type="number"
                min={0}
                max={5}
                value={practice}
                onChange={(e) => setPractice(+e.target.value)}
              />
            </Field>
          </div>
          <Field label="Teaching priorities" htmlFor="plan-priorities">
            <Textarea
              id="plan-priorities"
              value={priorities}
              onChange={(e) => setPriorities(e.target.value)}
              placeholder="More time on numerical problems, recap prerequisites..."
            />
          </Field>
          <Button
            type="submit"
            disabled={!course}
            loading={generate.isPending}
            icon={<Sparkles className="size-4" />}
          >
            Generate lecture plan
          </Button>
        </form>
      </Dialog>
      {selected?.status === "ready" && (
        <Dialog
          open={editing}
          onOpenChange={setEditing}
          title="Edit lecture plan"
          description="Adjust titles and activities. Each lecture must still fit its time budget."
          className="max-w-2xl"
        >
          <PlanEditor
            key={selected.id}
            plan={selected}
            done={() => {
              setEditing(false);
              qc.invalidateQueries({ queryKey: ["plans"] });
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
function PlanEditor({ plan, done }: { plan: Plan; done: () => void }) {
  const [content, setContent] = useState(() => structuredClone(plan.content));
  const save = useMutation({
    mutationFn: () =>
      api(`/lesson-plans/${plan.id}`, {
        method: "PUT",
        body: JSON.stringify(content),
      }),
    onSuccess: () => {
      toast("Plan saved");
      done();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="space-y-4">
      <div className="max-h-[60vh] space-y-5 overflow-y-auto">
        {content.lectures.map((l, i) => (
          <div className="space-y-2 rounded-xl bg-canvas p-3" key={i}>
            <Input
              aria-label={`Lecture ${i + 1} title`}
              value={l.title}
              onChange={(e) => {
                const c = structuredClone(content);
                c.lectures[i].title = e.target.value;
                setContent(c);
              }}
            />
            {l.activities.map((a, j) => (
              <div key={j} className="flex gap-2">
                <Input
                  aria-label={`Lecture ${i + 1} activity ${j + 1}`}
                  value={a.activity}
                  onChange={(e) => {
                    const c = structuredClone(content);
                    c.lectures[i].activities[j].activity = e.target.value;
                    setContent(c);
                  }}
                />
                <Input
                  className="w-24"
                  aria-label={`Lecture ${i + 1} activity ${j + 1} minutes`}
                  type="number"
                  min={1}
                  value={a.minutes}
                  onChange={(e) => {
                    const c = structuredClone(content);
                    c.lectures[i].activities[j].minutes = +e.target.value;
                    setContent(c);
                  }}
                />
              </div>
            ))}
            <p className="text-xs text-muted">
              {l.activities.reduce((n, a) => n + a.minutes, 0)} /{" "}
              {plan.config.minutes} minutes
            </p>
          </div>
        ))}
      </div>
      <ErrorNotice error={save.error} />
      <Button
        loading={save.isPending}
        icon={<Check className="size-4" />}
        onClick={() => save.mutate()}
      >
        Save changes
      </Button>
    </div>
  );
}
