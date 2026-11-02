"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Users,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { motion } from "motion/react";
import { api } from "@/lib/api";
import {
  Badge,
  Card,
  PageHeader,
  Spinner,
  EmptyState,
} from "@/components/ui/primitives";
import {
  CourseSelect,
  ErrorNotice,
  selectClass,
} from "@/components/feature-controls";
type Analytics = {
  paper_count: number;
  checked_count: number;
  pending_count: number;
  average_pct: number | null;
  sample_count: number;
  distribution: { label: string; count: number }[];
  courses: {
    id: string;
    name: string;
    count: number;
    average_pct: number | null;
  }[];
  exams: { id: string; title: string; course_id: string }[];
  topics: {
    course_id: string;
    course_name: string;
    topic: string;
    count: number;
    average_pct: number;
  }[];
  questions: {
    exam_id: string;
    exam_title: string;
    course_name: string;
    question_number: number;
    part_label: string;
    topic: string;
    count: number;
    average_pct: number;
    flagged: number;
    unattempted: number;
    text: string;
  }[];
  students: {
    course_id: string;
    name: string;
    enrollment_no: string;
    exams: number;
    average_pct: number;
  }[];
};
export default function AnalyticsPage() {
  const [course, setCourse] = useState("");
  const [exam, setExam] = useState("");
  const [samples, setSamples] = useState(true);
  const q = useQuery({
    queryKey: ["analytics", course, exam, samples],
    queryFn: () =>
      api<Analytics>(
        `/analytics?include_samples=${samples}${course ? "&course_id=" + course : ""}${exam ? "&exam_id=" + exam : ""}`,
      ),
  });
  const d = q.data;
  const pct = (n: number | null) =>
    n === null ? "No marks" : `${n.toFixed(1)}%`;
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Understand your class"
        title="Class analytics"
        subtitle="See where your class is doing well and what deserves another lecture."
      />
      <div className="my-6 flex flex-wrap items-center gap-3">
        <div className="w-72">
          <CourseSelect
            all
            value={course}
            onChange={(v) => {
              setCourse(v);
              setExam("");
            }}
          />
        </div>
        <select
          className={selectClass + " max-w-xs"}
          aria-label="Exam"
          value={exam}
          onChange={(e) => setExam(e.target.value)}
        >
          <option value="">All exams</option>
          {d?.exams
            .filter((e) => !course || e.course_id === course)
            .map((e) => (
              <option key={e.id} value={e.id}>
                {e.title}
              </option>
            ))}
        </select>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={samples}
            onChange={(e) => setSamples(e.target.checked)}
          />
          Include sample records
        </label>
      </div>
      <ErrorNotice error={q.error} />
      {q.isLoading ? (
        <Spinner />
      ) : (
        d && (
          <>
            {d.sample_count > 0 && (
              <div className="mb-5 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
                <b>{d.sample_count} synthetic sample papers included.</b> These
                illustrate the workflow, not real student performance. Switch
                them off above.
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Papers uploaded", value: d.paper_count, icon: Users },
                {
                  title: "Fully checked",
                  value: d.checked_count,
                  icon: ClipboardCheck,
                },
                {
                  title: "Mean paper score",
                  value: pct(d.average_pct),
                  icon: TrendingUp,
                },
                {
                  title: "Still to finish",
                  value: d.pending_count,
                  icon: AlertTriangle,
                },
              ].map(({ title, value, icon: Icon }) => (
                <Card key={title} className="p-5">
                  <Icon className="mb-4 size-5 text-brand" />
                  <div className="text-3xl tracking-tight">{value}</div>
                  <div className="mt-1 text-sm text-muted">{title}</div>
                </Card>
              ))}
            </div>
            {d.checked_count === 0 && d.questions.length === 0 ? (
              <EmptyState
                icon={<BarChart3 />}
                title="Scores will appear after checking"
                body="Upload answer sheets and check them to see score distributions and questions your class found difficult."
              />
            ) : (
              <>
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <Card className="p-6">
                    <h2 className="text-lg">Score distribution</h2>
                    <p className="mt-1 text-xs text-muted">
                      Fully checked papers only; each paper counts once.
                    </p>
                    <div className="mt-7 space-y-5">
                      {d.distribution.map((b, i) => (
                        <div key={b.label}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span>{b.label}</span>
                            <span>{b.count} papers</span>
                          </div>
                          <div className="h-6 overflow-hidden rounded-lg bg-canvas">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(100 * b.count) / Math.max(1, ...d.distribution.map((x) => x.count))}%`,
                              }}
                              className={
                                [
                                  "h-full rounded-lg bg-brand-tint",
                                  "h-full rounded-lg bg-brand/50",
                                  "h-full rounded-lg bg-brand/75",
                                  "h-full rounded-lg bg-brand",
                                ][i]
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                  <Card className="p-6">
                    <h2 className="text-lg">Topics to revisit</h2>
                    <p className="mt-1 text-xs text-muted">
                      Lowest average first. Topic labels come from the question
                      content.
                    </p>
                    <div className="mt-5 space-y-4">
                      {d.topics.slice(0, 6).map((t) => (
                        <div key={t.course_id + t.topic}>
                          <div className="flex justify-between gap-4 text-sm">
                            <span>{t.topic}</span>
                            <Badge tone={t.average_pct < 50 ? "warn" : "ok"}>
                              {pct(t.average_pct)}
                            </Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted">
                            {t.course_name} · {t.count} scored answers
                          </p>
                          <div className="mt-2 h-1.5 rounded-full bg-hover">
                            <div
                              className={`h-full rounded-full ${t.average_pct < 50 ? "bg-warn" : "bg-ok"}`}
                              style={{
                                width: `${Math.min(100, t.average_pct)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
                <Card className="mt-6 p-6">
                  <h2 className="text-lg">Across courses</h2>
                  <p className="mb-5 mt-1 text-xs text-muted">
                    Average of paper percentages. Different exam maximums are
                    normalised.
                  </p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {d.courses
                      .filter((c) => c.count > 0)
                      .map((c) => (
                        <div key={c.id} className="rounded-2xl bg-canvas p-4">
                          <div className="flex justify-between gap-4">
                            <span className="text-sm font-medium">
                              {c.name}
                            </span>
                            <span className="text-lg text-brand">
                              {pct(c.average_pct)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-muted">
                            {c.count} checked papers
                          </p>
                        </div>
                      ))}
                  </div>
                </Card>
                <Card className="mt-6 overflow-hidden">
                  <div className="p-6">
                    <h2 className="text-lg">Question breakdown</h2>
                    <p className="mt-1 text-xs text-muted">
                      Unchecked answers are excluded. A checked, unattempted
                      answer counts as zero.
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-canvas text-xs text-muted">
                        <tr>
                          {[
                            "Question / Topic",
                            "Exam",
                            "Answers",
                            "Average",
                            "Flagged",
                            "Not attempted",
                          ].map((h) => (
                            <th className="px-5 py-3" key={h}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {d.questions.map((r) => (
                          <tr
                            key={r.exam_id + r.question_number + r.part_label}
                            className="border-t border-line-soft"
                          >
                            <td className="max-w-sm px-5 py-4">
                              <div className="font-medium">
                                Q{r.question_number}
                                {r.part_label && `(${r.part_label})`} ·{" "}
                                {r.topic}
                              </div>
                              <details className="mt-1 text-xs text-muted">
                                <summary className="cursor-pointer">
                                  Question text
                                </summary>
                                <p className="mt-2">{r.text}</p>
                              </details>
                            </td>
                            <td className="px-5 py-4">
                              {r.exam_title}
                              <div className="text-xs text-muted">
                                {r.course_name}
                              </div>
                            </td>
                            <td className="px-5 py-4">{r.count}</td>
                            <td className="px-5 py-4">
                              <Badge
                                tone={r.average_pct < 50 ? "warn" : "brand"}
                              >
                                {pct(r.average_pct)}
                              </Badge>
                            </td>
                            <td className="px-5 py-4">{r.flagged}</td>
                            <td className="px-5 py-4">{r.unattempted}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <Card className="mt-6 p-6">
                  <h2 className="text-lg">Student summary</h2>
                  <p className="mt-1 text-xs text-muted">
                    Identities are grouped by enrollment number within each
                    course.
                  </p>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {d.students.map((s, i) => (
                      <div
                        key={i}
                        className="flex justify-between rounded-xl bg-canvas p-3 text-sm"
                      >
                        <div>
                          {s.name}
                          <p className="text-xs text-muted">
                            {s.enrollment_no || "No enrollment number"} ·{" "}
                            {s.exams} paper(s)
                          </p>
                        </div>
                        <span className="text-brand">{pct(s.average_pct)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
            <p className="mt-6 text-xs text-muted">
              Scores support teaching decisions. They do not establish ability,
              fairness or learning outcomes on their own.
            </p>
          </>
        )
      )}
    </div>
  );
}
