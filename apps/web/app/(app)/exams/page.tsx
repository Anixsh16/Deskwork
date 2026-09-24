"use client";

import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, Plus } from "lucide-react";
import { useState } from "react";

import { CreateExamDialog } from "@/components/create-exam-dialog";
import { ExamRow } from "@/components/exam-row";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { ExamSummary } from "@/lib/types";

export default function ExamsPage() {
  const exams = useQuery({ queryKey: ["exams"], queryFn: () => api<ExamSummary[]>("/exams") });
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Exams"
        subtitle="Upload a question paper and its key, then check every student's paper."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New exam
          </Button>
        }
      />
      <div className="mt-8 flex flex-col gap-3">
        {exams.isLoading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : exams.data?.length ? (
          exams.data.map((e, i) => <ExamRow key={e.id} exam={e} index={i} />)
        ) : (
          <EmptyState
            icon={<ClipboardCheck className="size-6" />}
            title="No exams yet"
            body="Create an exam to start checking handwritten papers."
            action={<Button onClick={() => setOpen(true)}>Create an exam</Button>}
          />
        )}
      </div>
      <CreateExamDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
