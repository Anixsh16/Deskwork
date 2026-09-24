"use client";

import { AlertTriangle, BookOpenCheck, ChevronDown, FileSearch, MessageSquarePlus, Minus, Plus, Scale, UserCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Markdown } from "@/components/markdown";
import { Badge, Card } from "@/components/ui/primitives";
import type { KeyItem, Mark } from "@/lib/types";
import { fmt, num } from "@/lib/types";
import { cn } from "@/lib/utils";

export type Draft = { marks: number | null; note: string };

const PARTIAL = /^\d*\.?\d?$/;

export function MarkCard({
  mark: m,
  question,
  keyItem,
  draft,
  onDraft,
  onJump,
}: {
  mark: Mark;
  question: string;
  keyItem?: KeyItem;
  draft?: Draft;
  onDraft: (d: Draft | null) => void;
  onJump: (page: number) => void;
}) {
  const [open, setOpen] = useState(m.flagged || m.final_marks === null);
  const [showKey, setShowKey] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [text, setText] = useState<string | null>(null);
  const max = Number(m.max_marks);
  const saved = num(m.final_marks);
  const savedNote = m.teacher_note ?? "";
  const value = draft ? draft.marks : saved;
  const note = draft ? draft.note : savedNote;
  const label = `Q${m.question_number}${m.part_label ? `(${m.part_label})` : ""}`;
  const a = num(m.marks_a);
  const b = num(m.marks_b);

  const update = (marks: number | null, nextNote: string) => {
    if (marks === saved && nextNote === savedNote) onDraft(null);
    else onDraft({ marks, note: nextNote });
  };
  const setMarks = (v: number | null) =>
    update(v === null ? null : Math.max(0, Math.min(max, Math.round(v * 2) / 2)), note);

  const ratio = value === null ? 0 : value / max;
  const tone =
    value === null ? "bg-hover text-muted" : ratio >= 0.999 ? "bg-ok-soft text-ok" : ratio === 0 ? "bg-bad-soft text-bad" : "bg-warn-soft text-warn";

  return (
    <Card className={cn("overflow-hidden transition-shadow", m.flagged && !draft && "ring-1 ring-warn/40")}>
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="rounded-xl bg-canvas px-2.5 py-1 text-sm font-semibold text-ink">{label}</span>
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            {!m.attempted && m.source === "ai" && <Badge>Not attempted</Badge>}
            {m.flagged && (
              <Badge tone="warn" icon={<AlertTriangle className="size-3" />}>
                Needs review
              </Badge>
            )}
            {m.source === "teacher" && m.final_marks !== null && (
              <Badge tone="brand" icon={<UserCheck className="size-3" />}>
                Your mark
              </Badge>
            )}
          </span>
        </button>
        {!!m.pages.length && (
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted sm:flex">
            page{m.pages.length > 1 ? "s" : ""}
            {m.pages.map((pg) => (
              <button key={pg} onClick={() => onJump(pg)} className="rounded px-0.5 text-brand hover:underline" aria-label={`Show page ${pg}`}>
                {pg}
              </button>
            ))}
          </span>
        )}
        <button onClick={() => setOpen((o) => !o)} aria-label={open ? "Hide details" : "Show details"} className="rounded-full p-1 text-muted hover:bg-hover">
          <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover disabled:opacity-30"
            disabled={value === null || value <= 0}
            onClick={() => setMarks((value ?? 0) - 0.5)}
            aria-label="Half a mark less"
          >
            <Minus className="size-4" />
          </button>
          <div className={cn("flex h-9 items-center rounded-xl px-2 text-sm font-semibold tabular transition-colors", tone, draft && "ring-2 ring-brand")}>
            <input
              aria-label={`Marks for ${label}`}
              value={text ?? (value === null ? "" : String(value))}
              placeholder="-"
              inputMode="decimal"
              onFocus={(e) => e.target.select()}
              onChange={(e) => {
                const t = e.target.value.trim();
                if (!PARTIAL.test(t)) return;
                setText(t);
                if (t === "") setMarks(null);
                else if (!t.endsWith(".")) setMarks(Number(t));
              }}
              onBlur={() => setText(null)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="w-9 bg-transparent text-right outline-none placeholder:text-current"
            />
            <span className="pl-0.5 font-normal opacity-70">/ {fmt(max)}</span>
          </div>
          <button
            className="flex size-8 items-center justify-center rounded-full text-muted hover:bg-hover disabled:opacity-30"
            disabled={value !== null && value >= max}
            onClick={() => setMarks((value ?? 0) + 0.5)}
            aria-label="Half a mark more"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="flex flex-col gap-3 border-t border-line-soft px-4 pt-3 pb-4">
              {question && <p className="line-clamp-3 text-[13px] text-muted">{question}</p>}

              {m.flag_reason && (
                <div className="flex gap-2 rounded-2xl bg-warn-soft px-3.5 py-2.5 text-[13px] text-warn">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {m.flag_reason}
                </div>
              )}

              {a !== null && b !== null && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted">
                  <Scale className="size-3.5" />
                  <span>
                    Checker 1 gave <b className="font-semibold text-ink tabular">{fmt(a)}</b>, checker 2 gave{" "}
                    <b className={cn("font-semibold tabular", a === b ? "text-ink" : "text-warn")}>{fmt(b)}</b>
                  </span>
                  {a !== b && (
                    <button
                      className="rounded-full bg-hover px-2 py-0.5 text-[11px] font-medium text-ink-2 hover:bg-brand-soft hover:text-brand"
                      onClick={() => setMarks(b)}
                    >
                      Use {fmt(b)}
                    </button>
                  )}
                </div>
              )}

              {m.student_answer && (
                <Section icon={<FileSearch className="size-3.5" />} title="What the student wrote">
                  <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink-2">{m.student_answer}</p>
                </Section>
              )}
              {m.reasoning && (
                <Section icon={<BookOpenCheck className="size-3.5" />} title="Why these marks">
                  <Markdown className="doc-sm">{m.reasoning}</Markdown>
                </Section>
              )}
              {!!m.mistakes.length && (
                <Section icon={<AlertTriangle className="size-3.5" />} title="Mistakes found">
                  <ul className="flex flex-col gap-1">
                    {m.mistakes.map((x, i) => (
                      <li key={i} className="flex gap-2 text-[13px] text-ink-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-bad" />
                        {x}
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
              {m.reasoning_b && a !== b && (
                <Section icon={<Scale className="size-3.5" />} title="Second checker's view">
                  <Markdown className="doc-sm">{m.reasoning_b}</Markdown>
                </Section>
              )}

              <div className="flex flex-wrap items-center gap-3">
                {keyItem && (
                  <button className="text-[12px] font-medium text-brand hover:underline" onClick={() => setShowKey((s) => !s)}>
                    {showKey ? "Hide" : "Show"} answer key
                  </button>
                )}
                {!noteOpen && !note && (
                  <button className="inline-flex items-center gap-1 text-[12px] font-medium text-brand hover:underline" onClick={() => setNoteOpen(true)}>
                    <MessageSquarePlus className="size-3.5" /> Add a note
                  </button>
                )}
              </div>
              {showKey && keyItem && (
                <div className="rounded-2xl bg-ok-soft/50 p-3.5">
                  <Markdown className="doc-sm">{keyItem.answer || "_No answer in the key._"}</Markdown>
                  <ul className="mt-2 flex flex-col gap-0.5 border-t border-ok/15 pt-2">
                    {keyItem.marking_points.map((p, i) => (
                      <li key={i} className="flex gap-3 text-[12px] text-ink-2">
                        <span className="flex-1">{p.point}</span>
                        <span className="font-medium tabular">{fmt(p.marks)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {(noteOpen || note || savedNote) && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] font-medium tracking-wide text-muted uppercase">Your note</span>
                  <input
                    value={note}
                    autoFocus={noteOpen && !note}
                    onChange={(e) => update(value, e.target.value)}
                    placeholder="Why you changed this mark (optional)"
                    className="h-10 rounded-xl border border-line bg-surface px-3 text-[13px] outline-none focus:border-brand"
                  />
                </label>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}
