"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileText, Presentation, RotateCw, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import { IconButton } from "@/components/ui/button";
import { Dropzone } from "@/components/ui/dropzone";
import { Progress, StatusPill } from "@/components/ui/primitives";
import { api, upload } from "@/lib/api";
import type { CourseFile } from "@/lib/types";
import { fileSize } from "@/lib/utils";

export function SlideUploader({ courseId, compact }: { courseId: string; compact?: boolean }) {
  const qc = useQueryClient();
  const files = useQuery({
    queryKey: ["files", courseId],
    queryFn: () => api<CourseFile[]>(`/courses/${courseId}/files`),
    refetchInterval: (q) => (q.state.data?.some((f) => f.status === "queued" || f.status === "processing") ? 2000 : false),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["files", courseId] });
    qc.invalidateQueries({ queryKey: ["course", courseId] });
    qc.invalidateQueries({ queryKey: ["courses"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  };

  // When the last file finishes processing, the course and dashboard counts need to catch up.
  const busy = !!files.data?.some((f) => f.status === "queued" || f.status === "processing");
  const wasBusy = useRef(busy);
  useEffect(() => {
    if (wasBusy.current && !busy) {
      qc.invalidateQueries({ queryKey: ["course", courseId] });
      qc.invalidateQueries({ queryKey: ["courses"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    }
    wasBusy.current = busy;
  }, [busy, courseId, qc]);

  const send = useMutation({
    mutationFn: (list: File[]) => {
      const form = new FormData();
      list.forEach((f) => form.append("files", f));
      return upload(`/courses/${courseId}/files`, form);
    },
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const retry = useMutation({
    mutationFn: (id: string) => api(`/files/${id}/retry`, { method: "POST" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/files/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      refresh();
      toast("Slides removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex flex-col gap-3">
      <Dropzone
        multiple
        inputId="upload-slides"
        compact={compact}
        accept=".pdf,.pptx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        title={send.isPending ? "Uploading..." : "Drop slides here or click to browse"}
        hint="PDF or PowerPoint (.pptx), several files at once"
        disabled={send.isPending}
        onFiles={(f) => send.mutate(f)}
      />
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {files.data?.map((f) => (
            <motion.li
              key={f.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 rounded-2xl border border-line-soft bg-surface px-3.5 py-3"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                {f.filename.toLowerCase().endsWith(".pptx") ? <Presentation className="size-5" /> : <FileText className="size-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-ink" title={f.filename}>
                    {f.filename}
                  </span>
                </div>
                {f.status === "processing" || f.status === "queued" ? (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={f.progress} className="max-w-56" />
                    <span className="text-xs text-muted tabular">{f.progress}%</span>
                  </div>
                ) : (
                  <div className={compact ? "mt-0.5 truncate text-xs text-muted" : "mt-0.5 text-xs text-muted"}>
                    {f.status === "failed"
                      ? f.error
                      : compact
                        ? `${f.page_count ?? 0} slides · ${f.chunk_count ?? 0} sections`
                        : `${f.page_count ?? 0} slides · ${f.chunk_count ?? 0} sections indexed · ${fileSize(f.size_bytes)}`}
                  </div>
                )}
              </div>
              {compact && f.status === "ready" ? (
                <CheckCircle2 className="size-5 shrink-0 text-ok" aria-label="Indexed" />
              ) : (
                <StatusPill status={f.status} labels={{ ready: "Indexed" }} />
              )}
              {f.status === "failed" && (
                <IconButton label="Try again" onClick={() => retry.mutate(f.id)}>
                  <RotateCw className="size-4" />
                </IconButton>
              )}
              {(f.status === "ready" || f.status === "failed") && (
                <IconButton label="Remove" onClick={() => remove.mutate(f.id)}>
                  <Trash2 className="size-4" />
                </IconButton>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
