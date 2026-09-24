"use client";

import { useQuery } from "@tanstack/react-query";
import { FileQuestion, PenLine, ScrollText, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState, Spinner } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { Bot, Generated } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

const ICONS: Partial<Record<Bot, typeof PenLine>> = { assignment: PenLine, solution: ScrollText, paper: FileQuestion };
const NAMES: Partial<Record<Bot, string>> = { assignment: "Assignment", solution: "Solutions", paper: "Question paper" };

/** Lets the teacher reuse something Deskwork generated as the exam's question paper or answer key. */
export function UseGeneratedDialog({
  courseId,
  open,
  onOpenChange,
  title,
  onPick,
  busy,
}: {
  courseId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  onPick: (messageId: string) => void;
  busy?: boolean;
}) {
  const items = useQuery({
    queryKey: ["generated", courseId],
    queryFn: () => api<Generated[]>(`/courses/${courseId}/generated`),
    enabled: open,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description="Pick something you generated in this course's chatbots." className="max-w-2xl">
      {items.isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6" />
        </div>
      ) : items.data?.length ? (
        <div className="scroll-thin flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
          {items.data.map((g) => {
            const Icon = ICONS[g.bot] ?? Sparkles;
            return (
              <div key={g.id} className="flex gap-3 rounded-2xl border border-line-soft p-3.5 transition-colors hover:bg-canvas">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{g.title}</div>
                  <div className="text-xs text-muted">
                    {NAMES[g.bot]} · {timeAgo(g.created_at)}
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-xs text-ink-2">{g.preview}</p>
                </div>
                <Button size="sm" variant="tonal" loading={busy} onClick={() => onPick(g.id)}>
                  Use this
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="Nothing generated yet"
          body="Generate an assignment, solutions or a question paper in this course's chatbots first."
        />
      )}
    </Dialog>
  );
}
