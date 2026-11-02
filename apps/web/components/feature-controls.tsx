"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CourseSummary } from "@/lib/types";
import { AlertCircle } from "lucide-react";
export const selectClass =
  "h-11 w-full rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand";
export function CourseSelect({
  value,
  onChange,
  all = false,
}: {
  value: string;
  onChange: (v: string) => void;
  all?: boolean;
}) {
  const q = useQuery({
    queryKey: ["courses"],
    queryFn: () => api<CourseSummary[]>("/courses"),
  });
  return (
    <select
      aria-label="Course"
      className={selectClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{all ? "All courses" : "Choose a course"}</option>
      {q.data?.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
export function ErrorNotice({ error }: { error: Error | null }) {
  return error ? (
    <div
      role="alert"
      className="my-4 flex items-center gap-2 rounded-2xl bg-bad-soft p-4 text-sm text-bad"
    >
      <AlertCircle className="size-4" />
      {error.message}
    </div>
  ) : null;
}
