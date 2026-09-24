"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Eye, Lock, PenLine, Sparkles, Trash2, Users } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { DOC_ACCEPT } from "@/components/exam/question-paper-card";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ComingSoon } from "@/components/ui/coming-soon";
import { Dropzone } from "@/components/ui/dropzone";
import { Card, Spinner, StatusPill } from "@/components/ui/primitives";
import { api, upload } from "@/lib/api";
import type { Exam, PaperRow } from "@/lib/types";
import { fmt } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PapersTable({ exam, ready }: { exam: Exam; ready: boolean }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [uploading, setUploading] = useState(0);
  const [removing, setRemoving] = useState<PaperRow | null>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["exam", exam.id] });

  const add = async (files: File[]) => {
    // Each PDF is one student's paper. Photos are grouped into one paper, in the order chosen.
    const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    const images = files.filter((f) => !pdfs.includes(f));
    const groups = [...pdfs.map((f) => [f]), ...(images.length ? [images] : [])];
    setUploading(groups.length);
    for (const g of groups) {
      try {
        const form = new FormData();
        g.forEach((f) => form.append("files", f));
        await upload(`/exams/${exam.id}/papers`, form);
        refresh();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  const check = useMutation({
    mutationFn: (id: string) => api(`/papers/${id}/check`, { method: "POST" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const checkAll = useMutation({
    mutationFn: () => api<{ started: string[] }>(`/exams/${exam.id}/check-all`, { method: "POST" }),
    onSuccess: (r) => {
      refresh();
      toast(r.started.length ? `Checking ${r.started.length} paper${r.started.length > 1 ? "s" : ""}` : "Nothing new to check");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const manual = useMutation({
    mutationFn: (id: string) => api(`/papers/${id}/manual`, { method: "POST" }),
    onSuccess: (_, id) => router.push(`/exams/${exam.id}/papers/${id}`),
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api(`/papers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setRemoving(null);
      refresh();
      toast("Paper removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const questions = exam.questions;
  const unchecked = exam.papers.filter((p) => p.status === "ready" || p.status === "failed").length;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-violet-soft text-violet">
            <Users className="size-5" />
          </span>
          <div>
            <h2 className="text-[16px] font-medium text-ink">Student papers</h2>
            <p className="text-[13px] text-muted">
              {ready ? "Upload each student's paper. Two AI checkers mark it against your key." : "Available once the question paper and answer key are ready."}
            </p>
          </div>
        </div>
        {ready && exam.papers.length > 0 && (
          <div className="flex items-center gap-2">
            <ComingSoon label="Check question-wise" description="Check one question across every paper at once." icon={<Sparkles />} className="hidden md:inline-flex" />
            <Button icon={<Sparkles className="size-4" />} disabled={!unchecked} loading={checkAll.isPending} onClick={() => checkAll.mutate()}>
              Check all{unchecked ? ` (${unchecked})` : ""}
            </Button>
          </div>
        )}
      </div>

      {!ready ? (
        <div className="mx-5 mb-6 flex flex-col items-center gap-2 rounded-3xl border-2 border-dashed border-line-soft px-6 py-10 text-center sm:mx-6">
          <Lock className="size-5 text-faint" />
          <p className="text-sm text-muted">Add the question paper and the answer key above to start checking.</p>
        </div>
      ) : (
        <>
          <div className="px-5 pb-4 sm:px-6">
            <Dropzone
              multiple
              compact
              inputId="upload-student-papers"
              accept={DOC_ACCEPT}
              title={uploading ? `Uploading ${uploading} paper${uploading > 1 ? "s" : ""}...` : "Add student papers"}
              hint="One PDF per student (drop several at once), or all photos of one student's paper"
              disabled={uploading > 0}
              onFiles={add}
            />
          </div>

          {exam.papers.length > 0 && (
            <div className="scroll-thin overflow-x-auto border-t border-line-soft">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="bg-canvas text-left text-[12px] font-medium text-muted">
                    <th className="py-3 pr-3 pl-6 font-medium">Student</th>
                    {questions.map((q) => (
                      <th key={q.number} className="px-2 py-3 text-center font-medium">
                        Q{q.number}
                        <div className="text-[10px] font-normal text-faint">/{fmt(q.marks)}</div>
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center font-medium">
                      Total
                      <div className="text-[10px] font-normal text-faint">/{fmt(exam.total_marks)}</div>
                    </th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="py-3 pr-6 pl-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {exam.papers.map((p) => (
                      <PaperRowView
                        key={p.id}
                        exam={exam}
                        paper={p}
                        onCheck={() => check.mutate(p.id)}
                        onManual={() => manual.mutate(p.id)}
                        onRemove={() => setRemoving(p)}
                        onOpen={() => router.push(`/exams/${exam.id}/papers/${p.id}`)}
                        busy={(check.isPending && check.variables === p.id) || (manual.isPending && manual.variables === p.id)}
                      />
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Remove this paper?"
        description={`${removing?.student_name || removing?.filename || "This paper"} and its marks will be permanently deleted.`}
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={remove.isPending} onClick={() => removing && remove.mutate(removing.id)}>
            Remove paper
          </Button>
        </div>
      </Dialog>
    </Card>
  );
}

function PaperRowView({
  exam,
  paper: p,
  onCheck,
  onManual,
  onRemove,
  onOpen,
  busy,
}: {
  exam: Exam;
  paper: PaperRow;
  onCheck: () => void;
  onManual: () => void;
  onRemove: () => void;
  onOpen: () => void;
  busy: boolean;
}) {
  const href = `/exams/${exam.id}/papers/${p.id}`;
  const checking = p.status === "checking";
  return (
    <motion.tr
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest("a,button")) onOpen();
      }}
      className={cn("group cursor-pointer border-t border-line-soft transition-colors hover:bg-canvas/70", checking && "bg-violet-soft/40")}
    >
      <td className="py-3 pr-3 pl-6">
        <Link href={href} className="block min-w-0">
          <div className="flex items-center gap-2">
            {p.status === "reading" ? (
              <span className="skeleton h-4 w-32 rounded-md" />
            ) : (
              <span className="truncate font-medium text-ink group-hover:text-brand">{p.student_name || p.filename}</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {p.enrollment_no ? `${p.enrollment_no} · ` : ""}
            {p.page_count} page{p.page_count === 1 ? "" : "s"}
          </div>
        </Link>
      </td>
      {exam.questions.map((q) => {
        const cell = p.question_marks?.[String(q.number)];
        return (
          <td key={q.number} className="px-2 py-3 text-center tabular">
            {checking ? (
              <span className="skeleton inline-block h-4 w-7 rounded-md" />
            ) : cell && cell.marks !== null ? (
              <span className={cn("inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5", cell.flagged ? "bg-warn-soft font-medium text-warn" : "text-ink")}>
                {fmt(cell.marks)}
                {cell.flagged && <AlertTriangle className="size-3" />}
              </span>
            ) : (
              <span className="text-faint">-</span>
            )}
          </td>
        );
      })}
      <td className="px-3 py-3 text-center tabular">
        {checking ? (
          <Spinner className="mx-auto text-violet" />
        ) : p.total_marks !== null ? (
          <span className="text-[15px] font-semibold text-ink">{fmt(p.total_marks)}</span>
        ) : (
          <span className="text-faint">-</span>
        )}
      </td>
      <td className="px-3 py-3">
        {p.status === "checked" ? (
          p.reviewed_at ? (
            <StatusPill status="checked" labels={{ checked: "Reviewed" }} />
          ) : p.flagged_count ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
              <AlertTriangle className="size-3" /> {p.flagged_count} to review
            </span>
          ) : (
            <StatusPill status="checked" labels={{ checked: p.checked_by === "teacher" ? "Checked by you" : "Checked" }} />
          )
        ) : (
          <StatusPill status={p.status} labels={{ ready: "Not checked" }} />
        )}
        {p.status === "failed" && p.error && <div className="mt-1 max-w-40 text-[11px] text-bad">{p.error}</div>}
      </td>
      <td className="py-3 pr-6 pl-3">
        <div className="flex items-center justify-end gap-1">
          {(p.status === "ready" || p.status === "failed") && (
            <>
              <Button size="sm" icon={<Sparkles className="size-3.5" />} loading={busy} onClick={onCheck}>
                Check
              </Button>
              <IconButton label="Check manually" onClick={onManual}>
                <PenLine className="size-4" />
              </IconButton>
            </>
          )}
          {p.status === "checked" && (
            <Link
              href={href}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[13px] font-medium text-brand-strong transition-colors hover:bg-brand-tint active:scale-[0.97]"
            >
              <Eye className="size-3.5" />
              View
            </Link>
          )}
          {checking && <span className="px-2 text-xs text-violet">Checking...</span>}
          {p.status !== "checking" && p.status !== "reading" && (
            <IconButton label="Remove paper" className="opacity-40 group-hover:opacity-100 focus-visible:opacity-100" onClick={onRemove}>
              <Trash2 className="size-4" />
            </IconButton>
          )}
        </div>
      </td>
    </motion.tr>
  );
}
