"use client";

import { useQuery } from "@tanstack/react-query";
import { FileQuestion, LayoutGrid, MessageCircleQuestion, PenLine, ScrollText } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Course } from "@/lib/types";
import { cn } from "@/lib/utils";

const TABS = [
  { seg: "", label: "Overview", icon: LayoutGrid },
  { seg: "assignment", label: "Assignments", icon: PenLine },
  { seg: "solution", label: "Solutions", icon: ScrollText },
  { seg: "paper", label: "Question papers", icon: FileQuestion },
  { seg: "ask", label: "Ask your slides", icon: MessageCircleQuestion },
];

export default function CourseLayout({ children }: { children: React.ReactNode }) {
  const { courseId } = useParams<{ courseId: string }>();
  const pathname = usePathname();
  const course = useQuery({ queryKey: ["course", courseId], queryFn: () => api<Course>(`/courses/${courseId}`) });
  const base = `/courses/${courseId}`;
  const current = pathname === base ? "" : pathname.slice(base.length + 1).split("/")[0];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="min-h-[68px]">
        {course.data ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-[13px] text-muted">
              <Link href="/courses" className="hover:text-ink">
                Courses
              </Link>
              {course.data.code && <span> · {course.data.code}</span>}
              {course.data.semester && <span> · {course.data.semester}</span>}
            </div>
            <h1 className="mt-1 text-[28px] leading-tight font-normal tracking-[-0.01em] text-ink">{course.data.name}</h1>
          </motion.div>
        ) : course.isError ? (
          <p className="text-muted">{(course.error as Error).message}</p>
        ) : (
          <>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="mt-2 h-8 w-96 max-w-full" />
          </>
        )}
      </div>

      <nav className="scroll-thin mt-5 -mx-1 flex gap-1 overflow-x-auto border-b border-line-soft px-1">
        {TABS.map(({ seg, label, icon: Icon }) => {
          const active = current === seg;
          return (
            <Link
              key={seg}
              href={seg ? `${base}/${seg}` : base}
              className={cn(
                "relative flex shrink-0 items-center gap-2 px-4 pt-2 pb-3 text-sm font-medium transition-colors",
                active ? "text-brand" : "text-muted hover:text-ink",
              )}
            >
              <Icon className="size-4" />
              {label}
              {active && (
                <motion.span
                  layoutId="course-tab"
                  className="absolute inset-x-2 -bottom-px h-[3px] rounded-t-full bg-brand"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="pt-7">{children}</div>
    </div>
  );
}
