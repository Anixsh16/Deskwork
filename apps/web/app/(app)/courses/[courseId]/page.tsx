"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, FileQuestion, MessageCircleQuestion, MoreVertical, PenLine, Plus, ScrollText, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { CreateExamDialog } from "@/components/create-exam-dialog";
import { ExamRow } from "@/components/exam-row";
import { SlideUploader } from "@/components/slide-uploader";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Menu, MenuItem } from "@/components/ui/menu";
import { Card, EmptyState } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Course, CourseFile } from "@/lib/types";

const BOTS = [
  { seg: "assignment", title: "Assignment generator", body: "Ask for questions on any topic from your slides.", icon: PenLine, tint: "bg-violet-soft text-violet" },
  { seg: "solution", title: "Solution generator", body: "Step-by-step solutions for any assignment you give it.", icon: ScrollText, tint: "bg-ok-soft text-ok" },
  { seg: "paper", title: "Question paper generator", body: "Pick the syllabus range, get the paper and its answer key.", icon: FileQuestion, tint: "bg-warn-soft text-warn" },
  { seg: "ask", title: "Ask your slides", body: "Quick answers about anything in your lectures.", icon: MessageCircleQuestion, tint: "bg-brand-soft text-brand" },
];

export default function CourseOverview() {
  const { courseId } = useParams<{ courseId: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const course = useQuery({ queryKey: ["course", courseId], queryFn: () => api<Course>(`/courses/${courseId}`) });
  const [newExam, setNewExam] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const del = useMutation({
    mutationFn: () => api(`/courses/${courseId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Course deleted");
      router.replace("/courses");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const files = useQuery({ queryKey: ["files", courseId], queryFn: () => api<CourseFile[]>(`/courses/${courseId}/files`) });
  const ready = (files.data ?? course.data?.files ?? []).filter((f) => f.status === "ready").length;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="flex min-w-0 flex-col gap-8">
        <section>
          <h2 className="mb-4 text-lg font-normal text-ink">Generate from your slides</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {BOTS.map((b, i) => (
              <motion.div key={b.seg} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                <Link
                  href={`/courses/${courseId}/${b.seg}`}
                  className="group flex h-full gap-4 rounded-3xl border border-line-soft bg-surface p-4 transition-all hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-2xl ${b.tint}`}>
                    <b.icon className="size-5" />
                  </span>
                  <span>
                    <span className="block text-[15px] font-medium text-ink">{b.title}</span>
                    <span className="mt-0.5 block text-[13px] leading-relaxed text-muted">{b.body}</span>
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
          {!ready && files.isSuccess && (
            <p className="mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
              Upload at least one set of lecture slides first. The generators only use your own material.
            </p>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-normal text-ink">Exams</h2>
            <Button variant="tonal" size="sm" icon={<Plus className="size-4" />} onClick={() => setNewExam(true)}>
              New exam
            </Button>
          </div>
          {course.data?.exams.length ? (
            <div className="flex flex-col gap-3">
              {course.data.exams.map((e, i) => (
                <ExamRow key={e.id} exam={e} index={i} showCourse={false} />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-line-soft">
              <EmptyState
                icon={<ClipboardCheck className="size-6" />}
                title="No exams in this course"
                body="Create an exam to check handwritten papers against your answer key."
              />
            </div>
          )}
        </section>
      </div>

      <aside className="flex flex-col gap-4">
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-2">
            <div>
              <h2 className="text-[16px] font-medium text-ink">Lecture slides</h2>
              <p className="mt-0.5 text-[13px] text-muted">
                {ready} file{ready === 1 ? "" : "s"} indexed and ready for the generators
              </p>
            </div>
            <Menu
              trigger={
                <IconButton label="Course options">
                  <MoreVertical className="size-4" />
                </IconButton>
              }
            >
              <MenuItem danger icon={<Trash2 />} onSelect={() => setConfirmDelete(true)}>
                Delete course
              </MenuItem>
            </Menu>
          </div>
          <SlideUploader courseId={courseId} compact />
        </Card>
        {course.data?.outcomes && (
          <Card className="p-5">
            <h2 className="text-[16px] font-medium text-ink">Course outcomes</h2>
            <p className="mt-2 text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{course.data.outcomes}</p>
          </Card>
        )}
      </aside>

      <CreateExamDialog open={newExam} onOpenChange={setNewExam} courseId={courseId} />
      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this course?"
        description="Its slides, chats, exams and checked papers will be permanently removed."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </Button>
          <Button variant="danger" loading={del.isPending} onClick={() => del.mutate()}>
            Delete course
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
