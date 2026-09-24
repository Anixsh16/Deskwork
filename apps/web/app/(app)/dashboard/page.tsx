"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpen, ClipboardCheck, FileQuestion, NotebookPen, PenLine, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";

import { CourseCard } from "@/components/course-card";
import { CreateCourseDialog } from "@/components/create-course-dialog";
import { CreateExamDialog } from "@/components/create-exam-dialog";
import { ExamRow } from "@/components/exam-row";
import { ComingSoon } from "@/components/ui/coming-soon";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { CourseSummary, ExamSummary, Teacher } from "@/lib/types";
import { greeting } from "@/lib/utils";

export default function Dashboard() {
  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Teacher>("/me") });
  const data = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api<{ courses: CourseSummary[]; exams: ExamSummary[] }>("/dashboard"),
  });
  const [newCourse, setNewCourse] = useState(false);
  const [newExam, setNewExam] = useState(false);

  const first = (me.data?.full_name || "").split(" ")[0];
  const firstCourse = data.data?.courses[0];

  const actions = [
    {
      title: "Create a course",
      body: "Add a course and upload its lecture slides.",
      icon: BookOpen,
      tint: "bg-brand-soft text-brand",
      onClick: () => setNewCourse(true),
    },
    {
      title: "Check exam papers",
      body: "Upload a question paper, key and student papers.",
      icon: ClipboardCheck,
      tint: "bg-ok-soft text-ok",
      onClick: () => setNewExam(true),
    },
    {
      title: "Generate an assignment",
      body: "From your slides, on any topic, in seconds.",
      icon: PenLine,
      tint: "bg-violet-soft text-violet",
      href: firstCourse ? `/courses/${firstCourse.id}/assignment` : undefined,
      onClick: firstCourse ? undefined : () => setNewCourse(true),
    },
    {
      title: "Set a question paper",
      body: "Choose the syllabus range, get the paper and its key.",
      icon: FileQuestion,
      tint: "bg-warn-soft text-warn",
      href: firstCourse ? `/courses/${firstCourse.id}/paper` : undefined,
      onClick: firstCourse ? undefined : () => setNewCourse(true),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-[32px] font-normal tracking-[-0.015em] text-ink">
          {greeting()}
          {first ? `, ${first}` : ""}
        </h1>
        <p className="mt-1 text-[15px] text-muted">What would you like to get off your desk today?</p>
      </motion.div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((a, i) => {
          const inner = (
            <>
              <span className={`flex size-11 items-center justify-center rounded-2xl ${a.tint}`}>
                <a.icon className="size-5" />
              </span>
              <span className="mt-4 block text-[15px] font-medium text-ink">{a.title}</span>
              <span className="mt-1 block text-[13px] leading-relaxed text-muted">{a.body}</span>
              <ArrowRight className="absolute top-5 right-5 size-4 text-faint opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </>
          );
          const cls =
            "group relative block rounded-3xl border border-line-soft bg-surface p-5 text-left shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift";
          return (
            <motion.div key={a.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i + 0.1 }}>
              {a.href ? (
                <Link href={a.href} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button onClick={a.onClick} className={`${cls} w-full`}>
                  {inner}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-normal text-ink">Exams</h2>
          {!!data.data?.exams.length && (
            <Link href="/exams" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          )}
        </div>
        {data.isLoading ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : data.data?.exams.length ? (
          <div className="flex flex-col gap-3">
            {data.data.exams.slice(0, 4).map((e, i) => (
              <ExamRow key={e.id} exam={e} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-line-soft">
            <EmptyState
              icon={<ClipboardCheck className="size-6" />}
              title="No exams yet"
              body="Create an exam, upload its question paper and answer key, then let Deskwork check the students' papers."
            />
          </div>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-normal text-ink">Courses</h2>
          {!!data.data?.courses.length && (
            <Link href="/courses" className="text-sm font-medium text-brand hover:underline">
              View all
            </Link>
          )}
        </div>
        {data.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : data.data?.courses.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.data.courses.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-line-soft">
            <EmptyState
              icon={<BookOpen className="size-6" />}
              title="Start with your first course"
              body="Create a course and upload its lecture slides. Everything Deskwork generates will come from them."
            />
          </div>
        )}
      </section>

      <section className="mt-12">
        <h2 className="mb-4 text-lg font-normal text-ink">More tools</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ComingSoon variant="card" label="Plan a lesson" description="Lecture plans built from your slides." icon={<NotebookPen />} />
          <ComingSoon variant="card" label="Write student feedback" description="Personal feedback drafted from marks." icon={<Sparkles />} />
        </div>
      </section>

      <CreateCourseDialog open={newCourse} onOpenChange={setNewCourse} />
      <CreateExamDialog open={newExam} onOpenChange={setNewExam} />
    </div>
  );
}
