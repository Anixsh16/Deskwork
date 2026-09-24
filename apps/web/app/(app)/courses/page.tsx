"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, Plus } from "lucide-react";
import { useState } from "react";

import { CourseCard } from "@/components/course-card";
import { CreateCourseDialog } from "@/components/create-course-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { CourseSummary } from "@/lib/types";

export default function CoursesPage() {
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => api<CourseSummary[]>("/courses") });
  const [open, setOpen] = useState(false);
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Courses"
        subtitle="Each course keeps its slides, generators and exams together."
        actions={
          <Button icon={<Plus className="size-4" />} onClick={() => setOpen(true)}>
            New course
          </Button>
        }
      />
      <div className="mt-8">
        {courses.isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </div>
        ) : courses.data?.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {courses.data.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<BookOpen className="size-6" />}
            title="No courses yet"
            body="Create your first course and upload its lecture slides."
            action={<Button onClick={() => setOpen(true)}>Create a course</Button>}
          />
        )}
      </div>
      <CreateCourseDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}
