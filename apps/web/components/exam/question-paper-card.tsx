"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Pencil, RotateCw, Sparkles, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { QuestionEditor } from "@/components/exam/question-editor";
import { PageStrip, PageViewer } from "@/components/exam/page-viewer";
import { UseGeneratedDialog } from "@/components/exam/use-generated";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Badge, Card, StatusPill } from "@/components/ui/primitives";
import { api, upload } from "@/lib/api";
import type { Exam } from "@/lib/types";
import { fmt } from "@/lib/types";

export const DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/*";

export function ReadingState({ what }: { what: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl bg-brand-soft/60 px-6 py-10 text-center">
      <div className="relative size-12">
        <motion.span
          className="absolute inset-0 rounded-2xl bg-brand/15"
          animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
          transition={{ duration: 1.8, repeat: Infinity }}
        />
        <span className="relative flex size-12 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
          <Sparkles className="size-5" />
        </span>
      </div>
      <div className="text-sm font-medium text-ink">Reading the {what} page by page</div>
      <div className="max-w-xs text-xs text-muted">Deskwork looks at every page image, including handwriting and diagrams. This takes about a minute.</div>
    </div>
  );
}

export function QuestionPaperCard({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [viewer, setViewer] = useState<number | null>(null);
  const [pick, setPick] = useState(false);
  const [editing, setEditing] = useState(false);
  const replaceInput = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["exam", exam.id] });

  const send = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return upload(`/exams/${exam.id}/paper`, form);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const fromChat = useMutation({
    mutationFn: (message_id: string) => api(`/exams/${exam.id}/paper-from-message`, { method: "POST", body: JSON.stringify({ message_id }) }),
    onSuccess: () => {
      setPick(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const retry = useMutation({
    mutationFn: () => api(`/exams/${exam.id}/reparse/paper`, { method: "POST" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const status = exam.paper_status;

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-brand-soft text-brand">
            <FileText className="size-5" />
          </span>
          <div>
            <h2 className="text-[16px] font-medium text-ink">Question paper</h2>
            <p className="max-w-60 truncate text-[13px] text-muted">{exam.paper_filename ?? "Scanned or digital, PDF or photos"}</p>
          </div>
        </div>
        <StatusPill status={status} labels={{ ready: `${exam.questions.length} questions` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col">
          {status === "none" && (
            <div className="flex flex-col gap-3">
              <Dropzone
                multiple
                inputId="upload-question-paper"
                accept={DOC_ACCEPT}
                title={send.isPending ? "Uploading..." : "Upload the question paper"}
                hint="PDF, or photos of each page in order"
                disabled={send.isPending}
                onFiles={(f) => send.mutate(f)}
              />
              <Button variant="ghost" size="sm" icon={<Sparkles className="size-4" />} className="self-center" onClick={() => setPick(true)}>
                Use a paper generated in Deskwork
              </Button>
            </div>
          )}

          {status === "processing" && <ReadingState what="question paper" />}

          {status === "failed" && (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-bad-soft/60 px-6 py-8 text-center">
              <p className="text-sm text-bad">{exam.paper_error || "The question paper could not be read."}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" icon={<RotateCw className="size-4" />} loading={retry.isPending} onClick={() => retry.mutate()}>
                  Try again
                </Button>
                <Button size="sm" variant="ghost" icon={<Upload className="size-4" />} onClick={() => replaceInput.current?.click()}>
                  Upload another file
                </Button>
              </div>
            </div>
          )}

          {status === "ready" && (
            <div className="flex flex-col gap-4">
              {!!exam.paper_page_urls.length && <PageStrip urls={exam.paper_page_urls} onOpen={setViewer} />}
              {exam.paper_notice && <p className="rounded-2xl bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">{exam.paper_notice}</p>}
              <ol className="scroll-thin flex max-h-[420px] flex-col gap-2.5 overflow-y-auto pr-1">
                {exam.questions.map((q) => (
                  <li key={q.number} className="rounded-2xl border border-line-soft p-3.5">
                    <div className="flex items-start gap-3">
                      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">{q.number}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="brand">{fmt(q.marks)} marks</Badge>
                          {q.co && <Badge>{q.co}</Badge>}
                          {q.has_figure && (
                            <Badge tone="violet" icon={<ImageIcon className="size-3" />}>
                              Has figure
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-3 text-[13px] leading-relaxed text-ink-2">{q.text}</p>
                        {!!q.parts.length && (
                          <ul className="mt-2 flex flex-col gap-1">
                            {q.parts.map((p) => (
                              <li key={p.label} className="flex gap-2 text-[13px] text-ink-2">
                                <span className="font-medium text-ink">({p.label})</span>
                                <span className="line-clamp-2 flex-1">{p.text}</span>
                                <span className="shrink-0 text-muted tabular">[{fmt(p.marks)}]</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                  Edit questions
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Upload className="size-4" />}
                  onClick={() => {
                    const checked = exam.papers.filter((p) => p.status === "checked").length;
                    if (checked && !window.confirm(`Replacing the paper clears the marks of ${checked} checked paper${checked > 1 ? "s" : ""}. Continue?`)) return;
                    replaceInput.current?.click();
                  }}
                >
                  Replace paper
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      <input
        ref={replaceInput}
        type="file"
        hidden
        multiple
        accept={DOC_ACCEPT}
        onChange={(e) => {
          if (e.target.files?.length) send.mutate(Array.from(e.target.files));
          e.target.value = "";
        }}
      />
      <PageViewer urls={exam.paper_page_urls} open={viewer !== null} onOpenChange={(v) => !v && setViewer(null)} start={viewer ?? 0} title="Question paper" />
      <UseGeneratedDialog courseId={exam.course_id} open={pick} onOpenChange={setPick} title="Use a generated question paper" busy={fromChat.isPending} onPick={(id) => fromChat.mutate(id)} />
      <QuestionEditor exam={exam} open={editing} onOpenChange={setEditing} />
    </Card>
  );
}
