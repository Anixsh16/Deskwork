"use client";

import { ChevronRight, ClipboardCheck } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";

import { Badge } from "@/components/ui/primitives";
import type { ExamSummary } from "@/lib/types";
import { fmt } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

function stage(e: ExamSummary): { label: string; tone: "neutral" | "brand" | "ok" | "warn" } {
  if (e.paper_status !== "ready") return { label: "Needs question paper", tone: "warn" };
  if (e.key_status !== "ready") return { label: "Needs answer key", tone: "warn" };
  if (!e.paper_count) return { label: "Ready for papers", tone: "brand" };
  if (e.checked_count < e.paper_count) return { label: `${e.checked_count}/${e.paper_count} checked`, tone: "brand" };
  return { label: `All ${e.paper_count} checked`, tone: "ok" };
}

export function ExamRow({ exam, index = 0, showCourse = true }: { exam: ExamSummary; index?: number; showCourse?: boolean }) {
  const s = stage(exam);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * index }}>
      <Link
        href={`/exams/${exam.id}`}
        className="group flex items-center gap-4 rounded-2xl border border-line-soft bg-surface px-4 py-3.5 transition-all hover:border-line hover:shadow-card"
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-ok-soft text-ok">
          <ClipboardCheck className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-medium text-ink">{exam.title}</div>
          <div className="mt-0.5 truncate text-[13px] text-muted">
            {[showCourse ? exam.course_name : null, exam.kind, exam.total_marks ? `${fmt(exam.total_marks)} marks` : null, timeAgo(exam.created_at)]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {!!exam.flagged_count && <Badge tone="warn">{exam.flagged_count} to review</Badge>}
        <Badge tone={s.tone}>{s.label}</Badge>
        <ChevronRight className="size-5 text-faint transition-transform group-hover:translate-x-0.5" />
      </Link>
    </motion.div>
  );
}
