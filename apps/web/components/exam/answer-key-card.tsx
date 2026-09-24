"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, KeyRound, Lock, Pencil, RotateCw, Sparkles, Upload } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { KeyEditor } from "@/components/exam/key-editor";
import { PageStrip, PageViewer } from "@/components/exam/page-viewer";
import { DOC_ACCEPT, ReadingState } from "@/components/exam/question-paper-card";
import { UseGeneratedDialog } from "@/components/exam/use-generated";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Card, StatusPill } from "@/components/ui/primitives";
import { api, upload } from "@/lib/api";
import type { Exam } from "@/lib/types";
import { fmt } from "@/lib/types";
import { cn } from "@/lib/utils";

export function itemLabel(q: number, part: string) {
  return `Q${q}${part ? `(${part})` : ""}`;
}

export function AnswerKeyCard({ exam }: { exam: Exam }) {
  const qc = useQueryClient();
  const [viewer, setViewer] = useState<number | null>(null);
  const [pick, setPick] = useState(false);
  const [editing, setEditing] = useState(false);
  const [openItem, setOpenItem] = useState<string | null>(null);
  const replaceInput = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["exam", exam.id] });
  const locked = exam.paper_status !== "ready";

  const send = useMutation({
    mutationFn: (files: File[]) => {
      const form = new FormData();
      files.forEach((f) => form.append("files", f));
      return upload(`/exams/${exam.id}/key`, form);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const fromChat = useMutation({
    mutationFn: (message_id: string) => api(`/exams/${exam.id}/key-from-message`, { method: "POST", body: JSON.stringify({ message_id }) }),
    onSuccess: () => {
      setPick(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const retry = useMutation({
    mutationFn: () => api(`/exams/${exam.id}/reparse/key`, { method: "POST" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const status = locked ? "locked" : exam.key_status;

  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-ok-soft text-ok">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h2 className="text-[16px] font-medium text-ink">Answer key</h2>
            <p className="max-w-60 truncate text-[13px] text-muted">{exam.key_filename ?? "Typed or handwritten, PDF or photos"}</p>
          </div>
        </div>
        {!locked && <StatusPill status={exam.key_status} labels={{ ready: `${exam.key_items.length} answers` }} />}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={status} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-1 flex-col">
          {status === "locked" && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-line-soft px-6 py-10 text-center">
              <Lock className="size-5 text-faint" />
              <p className="text-sm text-muted">Add the question paper first, so the key can be matched to its questions.</p>
            </div>
          )}

          {status === "none" && (
            <div className="flex flex-col gap-3">
              <Dropzone
                multiple
                inputId="upload-answer-key"
                accept={DOC_ACCEPT}
                title={send.isPending ? "Uploading..." : "Upload the answer key"}
                hint="Typed or handwritten, PDF or photos"
                disabled={send.isPending}
                onFiles={(f) => send.mutate(f)}
              />
              <Button variant="ghost" size="sm" icon={<Sparkles className="size-4" />} className="self-center" onClick={() => setPick(true)}>
                Use solutions generated in Deskwork
              </Button>
            </div>
          )}

          {status === "processing" && <ReadingState what="answer key" />}

          {status === "failed" && (
            <div className="flex flex-col items-center gap-3 rounded-3xl bg-bad-soft/60 px-6 py-8 text-center">
              <p className="text-sm text-bad">{exam.key_error || "The answer key could not be read."}</p>
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
              {!!exam.key_page_urls.length && <PageStrip urls={exam.key_page_urls} onOpen={setViewer} />}
              <div className="scroll-thin flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1">
                {exam.key_items.map((k) => {
                  const id = `${k.question_number}-${k.part_label}`;
                  const open = openItem === id;
                  const total = k.marking_points.reduce((s, p) => s + Number(p.marks), 0);
                  return (
                    <div key={id} className="rounded-2xl border border-line-soft">
                      <button className="flex w-full items-center gap-3 p-3.5 text-left" onClick={() => setOpenItem(open ? null : id)}>
                        <span className="rounded-lg bg-ok-soft px-2 py-0.5 text-xs font-semibold text-ok">{itemLabel(k.question_number, k.part_label)}</span>
                        <span className="line-clamp-1 flex-1 text-[13px] text-ink-2">{k.final_answer || k.answer.replace(/[#*|`]/g, " ").slice(0, 120)}</span>
                        <span className="text-xs text-muted tabular">{fmt(total)} m</span>
                        <ChevronDown className={cn("size-4 text-muted transition-transform", open && "rotate-180")} />
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="border-t border-line-soft px-4 pt-3 pb-4">
                              <Markdown className="doc-sm">{k.answer || "_No answer in the key._"}</Markdown>
                              <div className="mt-3 rounded-xl bg-canvas p-3">
                                <div className="mb-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">Marking scheme</div>
                                <ul className="flex flex-col gap-1">
                                  {k.marking_points.map((p, i) => (
                                    <li key={i} className="flex gap-3 text-[13px] text-ink-2">
                                      <span className="flex-1">{p.point}</span>
                                      <span className="shrink-0 font-medium text-ink tabular">{fmt(p.marks)}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" icon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                  Edit marking scheme
                </Button>
                <Button variant="ghost" size="sm" icon={<Upload className="size-4" />} onClick={() => replaceInput.current?.click()}>
                  Replace key
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
      <PageViewer urls={exam.key_page_urls} open={viewer !== null} onOpenChange={(v) => !v && setViewer(null)} start={viewer ?? 0} title="Answer key" />
      <UseGeneratedDialog courseId={exam.course_id} open={pick} onOpenChange={setPick} title="Use generated solutions as the key" busy={fromChat.isPending} onPick={(id) => fromChat.mutate(id)} />
      <KeyEditor exam={exam} open={editing} onOpenChange={setEditing} />
    </Card>
  );
}
