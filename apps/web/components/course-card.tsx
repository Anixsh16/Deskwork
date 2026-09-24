"use client";

import { ClipboardCheck, Layers } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import type { CourseSummary } from "@/lib/types";
import { initials } from "@/lib/utils";

const TINTS = [
  "from-[#e8f0fe] to-[#d3e3fd] text-[#1557b0]",
  "from-[#e6f4ea] to-[#ceead6] text-[#137333]",
  "from-[#f3e8fd] to-[#e9d2fd] text-[#8430ce]",
  "from-[#fef7e0] to-[#feefc3] text-[#b06000]",
];

export function CourseCard({ course, index = 0 }: { course: CourseSummary; index?: number }) {
  const tint = TINTS[index % TINTS.length];
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * index }}>
      <Link
        href={`/courses/${course.id}`}
        className="group block overflow-hidden rounded-3xl border border-line-soft bg-surface shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
      >
        <div className={`relative h-24 bg-gradient-to-br ${tint} px-5 pt-4`}>
          <div className="text-[13px] font-medium opacity-80">{course.code || "Course"}</div>
          <div className="absolute right-5 bottom-3 text-5xl font-semibold opacity-15 transition-transform duration-500 group-hover:scale-110">
            {initials(course.name)}
          </div>
        </div>
        <div className="px-5 pt-4 pb-5">
          <div className="line-clamp-2 min-h-[2.75rem] text-[16px] leading-snug font-medium text-ink">{course.name}</div>
          <div className="mt-3 flex items-center gap-4 text-[13px] text-muted">
            <span className="flex items-center gap-1.5">
              <Layers className="size-3.5" />
              {course.ready_files}/{course.file_count} slide files
            </span>
            <span className="flex items-center gap-1.5">
              <ClipboardCheck className="size-3.5" />
              {course.exam_count} exam{course.exam_count === 1 ? "" : "s"}
            </span>
          </div>
          {course.semester && <div className="mt-1 text-[13px] text-faint">{course.semester}</div>}
        </div>
      </Link>
    </motion.div>
  );
}
