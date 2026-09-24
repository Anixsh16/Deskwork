"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  History,
  Pencil,
  RotateCcw,
  Sparkles,
  UserRound,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { MarkCard, type Draft } from "@/components/exam/mark-card";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Badge, Card, Field, Input, Skeleton, StatusPill } from "@/components/ui/primitives";
import { api } from "@/lib/api";
import type { PaperDetail } from "@/lib/types";
import { fmt, num } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const keyOf = (q: number, part: string) => `${q}|${part}`;

export default function PaperPage() {
  const { examId, paperId } = useParams<{ examId: string; paperId: string }>();
  // Remount per paper so unsaved edits never carry over to the next student.
  return <PaperView key={paperId} examId={examId} paperId={paperId} />;
}

function PaperView({ examId, paperId }: { examId: string; paperId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [zoom, setZoom] = useState(1);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editName, setEditName] = useState(false);
  const [confirmRecheck, setConfirmRecheck] = useState(false);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasDrafts = Object.keys(drafts).length > 0;

  useEffect(() => {
    if (!hasDrafts) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasDrafts]);

  const paper = useQuery({
    queryKey: ["paper", paperId],
    queryFn: () => api<PaperDetail>(`/papers/${paperId}`),
    refetchInterval: (q) => (q.state.data?.status === "checking" || q.state.data?.status === "reading" ? 2500 : false),
  });

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["paper", paperId] }),
      qc.invalidateQueries({ queryKey: ["exam", examId] }),
      qc.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  const save = useMutation({
    mutationFn: () =>
      api(`/papers/${paperId}/marks`, {
        method: "PATCH",
        body: JSON.stringify(
          Object.entries(drafts).map(([k, d]) => {
            const [q, part] = k.split("|");
            return { question_number: Number(q), part_label: part, marks: d.marks, note: d.note };
          }),
        ),
      }),
    onSuccess: async () => {
      await refresh();
      setDrafts({});
      toast("Marks saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const review = useMutation({
    mutationFn: () => api(`/papers/${paperId}/review`, { method: "POST" }),
    onSuccess: () => {
      refresh();
      toast("Marked as reviewed");
      if (paper.data?.next_id) router.push(`/exams/${examId}/papers/${paper.data.next_id}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const recheck = useMutation({
    mutationFn: async () => {
      setDrafts({});
      await api(`/papers/${paperId}/reset`, { method: "POST" });
      await api(`/papers/${paperId}/check`, { method: "POST" });
    },
    onSettled: () => {
      setConfirmRecheck(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const startCheck = useMutation({
    mutationFn: () => api(`/papers/${paperId}/check`, { method: "POST" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });
  const manual = useMutation({
    mutationFn: () => api(`/papers/${paperId}/manual`, { method: "POST" }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const p = paper.data;
  const questionText = useMemo(() => {
    const map: Record<string, string> = {};
    for (const q of p?.questions ?? []) {
      map[keyOf(q.number, "")] = q.text;
      for (const part of q.parts) map[keyOf(q.number, part.label)] = `${q.text}\n\n(${part.label}) ${part.text}`;
    }
    return map;
  }, [p?.questions]);
  const keyText = useMemo(() => Object.fromEntries((p?.key_items ?? []).map((k) => [keyOf(k.question_number, k.part_label), k])), [p?.key_items]);

  if (paper.isError) return <p className="text-muted">{(paper.error as Error).message}</p>;
  if (!p)
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[70vh]" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    );

  const dirty = Object.keys(drafts).length;
  const liveTotal = p.marks.reduce((s, m) => {
    const d = drafts[keyOf(m.question_number, m.part_label)];
    const v = d ? d.marks : num(m.final_marks);
    return s + (v ?? 0);
  }, 0);
  const missing = p.marks.filter((m) => {
    const d = drafts[keyOf(m.question_number, m.part_label)];
    return (d ? d.marks : m.final_marks) === null;
  }).length;
  const flagged = p.marks.filter((m) => m.flagged).length;

  const jump = (page: number) => pageRefs.current[page - 1]?.scrollIntoView({ behavior: "smooth", block: "start" });
  const go = (id: string | null) => {
    if (!id) return;
    if (dirty && !window.confirm("You have unsaved marks on this paper. Leave without saving?")) return;
    router.push(`/exams/${examId}/papers/${id}`);
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/exams/${examId}`}
          onClick={(e) => dirty && !window.confirm("You have unsaved marks on this paper. Leave without saving?") && e.preventDefault()}
          className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink"
        >
          <ChevronLeft className="size-4" />
          {p.exam.title}
        </Link>
        <div className="flex items-center gap-1">
          <IconButton label="Previous paper" disabled={!p.prev_id} onClick={() => go(p.prev_id)}>
            <ChevronLeft className="size-5" />
          </IconButton>
          <IconButton label="Next paper" disabled={!p.next_id} onClick={() => go(p.next_id)}>
            <ChevronRight className="size-5" />
          </IconButton>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-violet-soft text-violet">
            <UserRound className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-[26px] leading-tight font-normal text-ink">{p.student_name || p.filename}</h1>
              <IconButton label="Edit student details" onClick={() => setEditName(true)}>
                <Pencil className="size-4" />
              </IconButton>
            </div>
            <div className="text-[13px] text-muted">
              {[p.enrollment_no, p.batch, `${p.pages.length} pages`].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {p.status === "checked" && (
            <div className="text-right">
              <div className="text-[11px] font-medium tracking-wide text-muted uppercase">Total</div>
              <div className="text-[34px] leading-none font-normal text-ink tabular">
                {fmt(liveTotal)}
                <span className="text-lg text-faint"> / {fmt(p.exam.total_marks)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card className="overflow-hidden lg:sticky lg:top-20 lg:h-[calc(100vh-7rem)]">
          <div className="flex items-center justify-between border-b border-line-soft px-4 py-2">
            <span className="text-sm font-medium text-ink">Answer sheet</span>
            <div className="flex items-center gap-1">
              <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}>
                <ZoomOut className="size-4" />
              </IconButton>
              <span className="w-10 text-center text-xs text-muted tabular">{Math.round(zoom * 100)}%</span>
              <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}>
                <ZoomIn className="size-4" />
              </IconButton>
            </div>
          </div>
          <div className="scroll-thin h-[60vh] overflow-auto bg-canvas p-3 lg:h-[calc(100%-49px)]">
            <div className="mx-auto flex flex-col gap-3" style={{ width: `${zoom * 100}%` }}>
              {p.page_urls.map((u, i) => (
                <div key={u} ref={(el) => void (pageRefs.current[i] = el)}>
                  <div className="mb-1 text-xs text-muted">Page {i + 1}</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Page ${i + 1}`} className="w-full rounded-xl border border-line-soft bg-surface shadow-card" />
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          {p.status === "checking" || p.status === "reading" ? (
            <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center">
              <motion.span
                className="flex size-14 items-center justify-center rounded-2xl bg-violet-soft text-violet"
                animate={{ rotate: [0, 8, -8, 0] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <Sparkles className="size-6" />
              </motion.span>
              <div className="text-[15px] font-medium text-ink">{p.status === "reading" ? "Reading the first page" : "Two AI checkers are marking this paper"}</div>
              <div className="max-w-sm text-sm text-muted">Every page is compared with your answer key, question by question. This usually takes under a minute.</div>
            </Card>
          ) : p.status !== "checked" ? (
            <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
              <StatusPill status={p.status} labels={{ ready: "Not checked yet" }} />
              {p.error && <p className="text-sm text-bad">{p.error}</p>}
              <p className="max-w-sm text-sm text-muted">Let the AI check this paper against your key, or check it yourself.</p>
              <div className="flex gap-2">
                <Button icon={<Sparkles className="size-4" />} loading={startCheck.isPending} onClick={() => startCheck.mutate()}>
                  Check with AI
                </Button>
                <Button variant="outline" icon={<Pencil className="size-4" />} loading={manual.isPending} onClick={() => manual.mutate()}>
                  Check manually
                </Button>
              </div>
            </Card>
          ) : (
            <>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {p.checked_by === "teacher" ? <Badge tone="brand">Checked by you</Badge> : <Badge tone="violet" icon={<Sparkles className="size-3" />}>Checked by AI</Badge>}
                  {p.reviewed_at ? (
                    <Badge tone="ok" icon={<Check className="size-3" />}>
                      Reviewed {timeAgo(p.reviewed_at)}
                    </Badge>
                  ) : flagged ? (
                    <Badge tone="warn" icon={<AlertTriangle className="size-3" />}>
                      {flagged} answer{flagged > 1 ? "s" : ""} need your review
                    </Badge>
                  ) : p.checked_by === "ai" ? (
                    <Badge tone="ok">Both checkers agree on every answer</Badge>
                  ) : null}
                </div>
                {p.summary && <p className="mt-3 text-[14px] leading-relaxed text-ink-2">{p.summary}</p>}
              </Card>

              {p.marks.map((m) => {
                const k = keyOf(m.question_number, m.part_label);
                return (
                  <MarkCard
                    key={k}
                    mark={m}
                    question={questionText[k] ?? ""}
                    keyItem={keyText[k]}
                    draft={drafts[k]}
                    onDraft={(d) =>
                      setDrafts((all) => {
                        const next = { ...all };
                        if (d === null) delete next[k];
                        else next[k] = d;
                        return next;
                      })
                    }
                    onJump={jump}
                  />
                );
              })}

              {!!p.edits.length && (
                <Card className="p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium text-ink">
                    <History className="size-4 text-muted" /> Changes you made
                  </div>
                  <ul className="flex flex-col gap-2">
                    {p.edits.map((e, i) => (
                      <li key={i} className="text-[13px] text-ink-2">
                        <span className="font-medium text-ink">Q{e.question_number}{e.part_label ? `(${e.part_label})` : ""}</span>: {fmt(e.old_marks)} → {fmt(e.new_marks)}
                        {e.note && <span className="text-muted"> · {e.note}</span>}
                        <span className="text-faint"> · {timeAgo(e.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pb-24">
                {p.checked_by === "ai" ? (
                  <Button variant="ghost" icon={<RotateCcw className="size-4" />} disabled={!!dirty} onClick={() => setConfirmRecheck(true)}>
                    Check again with AI
                  </Button>
                ) : (
                  <span />
                )}
                <Button
                  variant={p.reviewed_at ? "outline" : "primary"}
                  icon={<Check className="size-4" />}
                  disabled={!!dirty || missing > 0}
                  loading={review.isPending}
                  onClick={() => review.mutate()}
                >
                  {p.reviewed_at ? "Reviewed" : missing ? `${missing} answer${missing > 1 ? "s" : ""} still need marks` : "Mark as reviewed"}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {dirty > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
          >
            <div className="flex items-center gap-4 rounded-full bg-[#303134] py-2 pr-2 pl-6 text-white shadow-pop">
              <span className="text-sm">
                {dirty} unsaved change{dirty > 1 ? "s" : ""} · new total {fmt(liveTotal)}
              </span>
              <button className="rounded-full px-3 py-2 text-sm text-white/80 hover:bg-white/10" onClick={() => setDrafts({})}>
                Discard
              </button>
              <Button size="sm" loading={save.isPending} onClick={() => save.mutate()} className="bg-[#8ab4f8] text-[#062e6f] hover:bg-[#aecbfa]">
                Save marks
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <EditStudent paper={p} open={editName} onOpenChange={setEditName} onSaved={refresh} />
      <Dialog
        open={confirmRecheck}
        onOpenChange={setConfirmRecheck}
        title="Check this paper again?"
        description="The AI will mark every answer from scratch. Any marks, notes or review you added on this paper will be replaced."
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmRecheck(false)}>
            Cancel
          </Button>
          <Button loading={recheck.isPending} icon={<RotateCcw className="size-4" />} onClick={() => recheck.mutate()}>
            Check again
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function EditStudent({ paper, open, onOpenChange, onSaved }: { paper: PaperDetail; open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Student details" description="Read automatically from the first page. Correct them if needed.">
      <StudentForm paper={paper} onDone={() => onOpenChange(false)} onSaved={onSaved} />
    </Dialog>
  );
}

function StudentForm({ paper, onDone, onSaved }: { paper: PaperDetail; onDone: () => void; onSaved: () => void }) {
  const [name, setName] = useState(paper.student_name ?? "");
  const [enr, setEnr] = useState(paper.enrollment_no ?? "");
  const save = useMutation({
    mutationFn: () => api(`/papers/${paper.id}`, { method: "PATCH", body: JSON.stringify({ student_name: name, enrollment_no: enr }) }),
    onSuccess: () => {
      onSaved();
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <Field label="Name" htmlFor="s-name">
          <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Enrollment number" htmlFor="s-enr">
          <Input id="s-enr" value={enr} onChange={(e) => setEnr(e.target.value)} />
        </Field>
        <div className={cn("flex justify-end gap-2")}>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
  );
}
