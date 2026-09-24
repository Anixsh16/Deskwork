"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUp,
  Check,
  Copy,
  FileDown,
  FileQuestion,
  FileText,
  History,
  Loader2,
  MessageCircleQuestion,
  Paperclip,
  PenLine,
  Plus,
  Printer,
  ScrollText,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Markdown } from "@/components/markdown";
import { Button, IconButton } from "@/components/ui/button";
import { api, download, streamChat, upload, type Source } from "@/lib/api";
import type { Bot, Chat, ChatMessage, ChatSummary } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const CONFIG: Record<
  Bot,
  { title: string; intro: string; placeholder: string; icon: typeof PenLine; tint: string; attach?: string; suggestions: string[] }
> = {
  assignment: {
    title: "Assignment generator",
    intro: "Tell me the topic, number of questions, difficulty and marks. I will write the assignment from your slides.",
    placeholder: "e.g. 8 questions on TCP congestion control, mix of numericals and theory, 5 marks each",
    icon: PenLine,
    tint: "bg-violet-soft text-violet",
    suggestions: [
      "8 questions on TCP flow and congestion control, mix of numericals and theory, 5 marks each",
      "5 numerical questions on IP fragmentation and IPv4 header fields",
      "An assignment on DNS and HTTP with 6 conceptual questions",
    ],
  },
  solution: {
    title: "Solution generator",
    intro: "Paste an assignment or attach its PDF. I will write complete, step-by-step solutions using your slides.",
    placeholder: "Paste the questions here, or attach the assignment and say 'solve it'",
    icon: ScrollText,
    tint: "bg-ok-soft text-ok",
    attach: ".pdf,.jpg,.jpeg,.png,.txt,.md",
    suggestions: [
      "Write complete step-by-step solutions for every question in the attached assignment",
      "Solve: A 5 Mbps link is shared by users who need 150 kbps each and are active 33% of the time. How many users can circuit switching support?",
    ],
  },
  paper: {
    title: "Question paper generator",
    intro: "Say which part of the syllabus to cover (or attach the syllabus), with marks and duration. Then ask for the answer key.",
    placeholder: "e.g. T2 paper, 20 marks, 1 hour, syllabus up to Transport Layer part 2",
    icon: FileQuestion,
    tint: "bg-warn-soft text-warn",
    attach: ".pdf,.jpg,.jpeg,.png,.txt,.md",
    suggestions: [
      "T2 paper, 20 marks, 1 hour, covering the syllabus up to Transport Layer part 2",
      "End semester paper, 35 marks, 2 hours, full syllabus",
      "T1 paper, 20 marks, first third of the syllabus",
    ],
  },
  ask: {
    title: "Ask your slides",
    intro: "Ask anything about this course. Answers come from your own lecture slides.",
    placeholder: "Ask a question about the course",
    icon: MessageCircleQuestion,
    tint: "bg-brand-soft text-brand",
    suggestions: ["What is the difference between Go-Back-N and Selective Repeat?", "Explain Nagle's algorithm with an example", "How does DNS resolve a name?"],
  },
};

type Pending = { user: ChatMessage | null; assistant: ChatMessage };

export function ChatView({ courseId, bot }: { courseId: string; bot: Bot }) {
  const cfg = CONFIG[bot];
  const qc = useQueryClient();
  const [chatId, setChatId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<{ id: string; filename: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [streaming, setStreaming] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);

  const chats = useQuery({
    queryKey: ["chats", courseId, bot],
    queryFn: () => api<ChatSummary[]>(`/courses/${courseId}/chats?bot=${bot}`),
  });
  const chat = useQuery({
    queryKey: ["chat", chatId],
    queryFn: () => api<Chat>(`/chats/${chatId}`),
    enabled: !!chatId,
  });

  const messages: ChatMessage[] = [...(chat.data?.messages ?? [])];
  if (pending) {
    if (pending.user) messages.push(pending.user);
    messages.push(pending.assistant);
  }
  const attachmentNames = Object.fromEntries((chat.data?.attachments ?? []).concat(attachments).map((a) => [a.id, a.filename]));

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: streaming ? "auto" : "smooth", block: "end" });
  }, [messages.length, pending?.assistant.content, streaming]);

  const del = useMutation({
    mutationFn: (id: string) => api(`/chats/${id}`, { method: "DELETE" }),
    onSuccess: (_, id) => {
      if (id === chatId) setChatId(null);
      qc.invalidateQueries({ queryKey: ["chats", courseId, bot] });
    },
  });

  const attach = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of Array.from(files)) {
        const form = new FormData();
        form.append("file", f);
        const a = await upload<{ id: string; filename: string }>(`/courses/${courseId}/attachments`, form);
        setAttachments((list) => [...list, a]);
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const send = async (text: string, retry = false) => {
    const content = text.trim();
    if (!content || streaming || uploading) return;
    setStreaming(true);
    let id = chatId;
    const sentAttachments = retry ? [] : attachments;
    let received = false;
    try {
      if (!id) {
        const created = await api<ChatSummary>(`/courses/${courseId}/chats`, { method: "POST", body: JSON.stringify({ bot }) });
        id = created.id;
        // Seed the cache so the new chat does not also load the in-progress messages from the server.
        qc.setQueryData<Chat>(["chat", id], { ...created, messages: [], attachments: [] });
        setChatId(id);
      }
      const now = new Date().toISOString();
      const atts = sentAttachments.map((a) => a.id);
      if (retry) {
        // The interrupted answer is replaced; the original question stays where it is.
        qc.setQueryData<Chat>(["chat", id], (c) => (c ? { ...c, messages: c.messages.slice(0, -1) } : c));
      }
      setPending({
        user: retry ? null : { id: "pending-user", role: "user", content, sources: [], attachment_ids: atts, status: "done", created_at: now },
        assistant: { id: "pending-bot", role: "assistant", content: "", sources: [], attachment_ids: [], status: "streaming", created_at: now },
      });
      if (!retry) {
        setInput("");
        setAttachments([]);
      }
      await streamChat(id, content, atts, {
        onSources: (sources) =>
          setPending((p) => (p ? { ...p, assistant: { ...p.assistant, sources } } : p)),
        onDelta: (d) => {
          received = true;
          setPending((p) => (p ? { ...p, assistant: { ...p.assistant, content: p.assistant.content + d } } : p));
        },
        onError: (m) => toast.error(m),
      }, retry);
    } catch (e) {
      toast.error((e as Error).message);
      if (!received && !retry) {
        setInput(content);
        setAttachments(sentAttachments);
      }
    } finally {
      if (id) {
        await qc.invalidateQueries({ queryKey: ["chat", id] });
        qc.invalidateQueries({ queryKey: ["chats", courseId, bot] });
        qc.invalidateQueries({ queryKey: ["generated", courseId] });
      }
      setPending(null);
      setStreaming(false);
      textarea.current?.focus();
    }
  };

  const Icon = cfg.icon;
  const empty = !messages.length && !chat.isFetching;

  return (
    <div className="relative flex min-h-[calc(100vh-17rem)] gap-6">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("flex size-10 items-center justify-center rounded-2xl", cfg.tint)}>
              <Icon className="size-5" />
            </span>
            <div>
              <div className="text-[16px] font-medium text-ink">{cfg.title}</div>
              <div className="max-w-[18rem] truncate text-[13px] text-muted sm:max-w-md">{chat.data?.title && chatId ? chat.data.title : "New conversation"}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<History className="size-4" />} onClick={() => setShowHistory((v) => !v)}>
              History{chats.data?.length ? ` (${chats.data.length})` : ""}
            </Button>
            <Button
              variant="tonal"
              size="sm"
              icon={<Plus className="size-4" />}
              disabled={streaming}
              onClick={() => {
                setChatId(null);
                textarea.current?.focus();
              }}
            >
              New chat
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {empty ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <span className={cn("flex size-16 items-center justify-center rounded-3xl", cfg.tint)}>
                <Icon className="size-7" />
              </span>
              <p className="mt-5 max-w-lg text-[15px] text-ink-2">{cfg.intro}</p>
              <div className="mt-7 flex max-w-2xl flex-wrap justify-center gap-2">
                {cfg.suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s);
                      textarea.current?.focus();
                    }}
                    className="rounded-2xl border border-line bg-surface px-4 py-2.5 text-left text-[13px] text-ink-2 transition-all hover:border-brand-tint hover:bg-brand-soft/60"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col gap-6 pb-4">
              {messages.map((m, i) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  attachmentNames={attachmentNames}
                  onRetry={
                    m.status === "failed" && !streaming && i === messages.length - 1 && messages[i - 1]?.role === "user"
                      ? () => send(messages[i - 1].content, true)
                      : undefined
                  }
                />
              ))}
              <div ref={bottom} />
            </div>
          )}
        </div>

        <div className="sticky bottom-0 bg-gradient-to-t from-surface via-surface to-surface/0 pt-4 pb-1">
          <div className="rounded-[26px] border border-line bg-surface p-2 shadow-lift transition-shadow focus-within:border-brand-tint focus-within:shadow-pop">
            <AnimatePresence>
              {!!attachments.length && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="flex flex-wrap gap-2 px-2 pt-1 pb-2">
                  {attachments.map((a) => (
                    <span key={a.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft py-1 pr-1.5 pl-3 text-xs font-medium text-brand-strong">
                      <FileText className="size-3.5" />
                      <span className="max-w-56 truncate">{a.filename}</span>
                      <button className="rounded-full p-0.5 hover:bg-brand-tint" onClick={() => setAttachments((l) => l.filter((x) => x.id !== a.id))} aria-label="Remove file">
                        <X className="size-3.5" />
                      </button>
                    </span>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <div className="flex items-end gap-1">
              {cfg.attach && (
                <>
                  <IconButton label="Attach a file" disabled={uploading || streaming} onClick={() => fileInput.current?.click()}>
                    {uploading ? <Loader2 className="size-5 animate-spin" /> : <Paperclip className="size-5" />}
                  </IconButton>
                  <input ref={fileInput} id="chat-attach" type="file" hidden multiple accept={cfg.attach} onChange={(e) => { attach(e.target.files); e.target.value = ""; }} />
                </>
              )}
              <textarea
                ref={textarea}
                value={input}
                rows={1}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder={cfg.placeholder}
                aria-label={`Message the ${cfg.title.toLowerCase()}`}
                className="max-h-[200px] min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-ink outline-none placeholder:text-faint focus-visible:outline-none"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || streaming || uploading}
                aria-label="Send"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-all hover:bg-brand-strong active:scale-95 disabled:bg-hover disabled:text-faint"
              >
                {streaming ? <Loader2 className="size-5 animate-spin" /> : <ArrowUp className="size-5" />}
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-faint">Generated from your slides. Always review before sharing with students.</p>
        </div>
      </div>

      <AnimatePresence>
        {showHistory && (
          <motion.aside
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            className="absolute inset-y-0 right-0 z-20 w-72 shrink-0 rounded-3xl border border-line-soft bg-surface p-3 shadow-pop xl:static xl:shadow-none"
          >
            <div className="flex items-center justify-between px-2 pb-2">
              <span className="text-sm font-medium text-ink">Past conversations</span>
              <IconButton label="Close" onClick={() => setShowHistory(false)}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="scroll-thin flex max-h-[60vh] flex-col gap-1 overflow-y-auto">
              {chats.data?.length ? (
                chats.data.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors",
                      c.id === chatId ? "bg-brand-soft" : "hover:bg-hover",
                    )}
                  >
                    <button className="min-w-0 flex-1 text-left" disabled={streaming} onClick={() => setChatId(c.id)}>
                      <div className="truncate text-[13px] font-medium text-ink">{c.title}</div>
                      <div className="text-[11px] text-muted">{timeAgo(c.updated_at)}</div>
                    </button>
                    <button
                      className="rounded-full p-1.5 text-faint opacity-60 transition-opacity group-hover:opacity-100 hover:bg-surface hover:text-bad focus-visible:opacity-100"
                      onClick={() => del.mutate(c.id)}
                      aria-label="Delete conversation"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))
              ) : (
                <p className="px-3 py-6 text-center text-[13px] text-muted">No conversations yet.</p>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourceChips({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium tracking-wide text-muted uppercase">From your slides</span>
      {sources.slice(0, 6).map((s) => (
        <span key={`${s.file_id}-${s.page_start}`} className="inline-flex max-w-64 items-center gap-1 rounded-full border border-line-soft bg-canvas px-2.5 py-1 text-[11px] text-ink-2">
          <span className="truncate">{s.filename.replace(/\.(pdf|pptx)$/i, "")}</span>
          <span className="shrink-0 text-muted">{s.page_start === s.page_end ? `p. ${s.page_start}` : `pp. ${s.page_start}-${s.page_end}`}</span>
        </span>
      ))}
    </div>
  );
}

function MessageBubble({
  message: m,
  attachmentNames,
  onRetry,
}: {
  message: ChatMessage;
  attachmentNames: Record<string, string>;
  onRetry?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  if (m.role === "user") {
    return (
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-end gap-1.5">
        {m.attachment_ids.map((a) => (
          <span key={a} className="inline-flex items-center gap-1.5 rounded-full bg-hover px-3 py-1 text-xs text-ink-2">
            <FileText className="size-3.5" /> {attachmentNames[a] ?? "Attached file"}
          </span>
        ))}
        <div className="max-w-[80%] rounded-3xl rounded-tr-lg bg-brand-soft px-4 py-2.5 text-[15px] whitespace-pre-wrap text-ink">{m.content}</div>
      </motion.div>
    );
  }

  const waiting = m.status === "streaming" && !m.content;
  // Prints just this answer in a clean window, so the browser's "Save as PDF" gives a tidy document.
  const print = () => {
    const el = docRef.current;
    const win = window.open("", "_blank", "width=900,height=1000");
    if (!el || !win) return;
    const styles = [...document.querySelectorAll('link[rel="stylesheet"], style')].map((n) => n.outerHTML).join("");
    win.document.write(
      `<!doctype html><html class="${document.documentElement.className}"><head><title>Deskwork</title>${styles}<style>body{background:#fff;padding:32px 40px}</style></head><body><div class="doc">${el.querySelector(".doc")?.innerHTML ?? ""}</div></body></html>`,
    );
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  };

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-line-soft bg-surface px-5 pt-4 pb-3 shadow-card sm:px-6">
      {waiting ? (
        <div className="flex items-center gap-3 py-2 text-sm text-muted">
          <span className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="size-2 rounded-full bg-brand"
                animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </span>
          {m.sources.length ? "Writing from your slides..." : "Searching your slides..."}
        </div>
      ) : (
        <div ref={docRef}>
          <Markdown>{m.content || "_No answer was produced. Please try again._"}</Markdown>
        </div>
      )}
      {m.status === "failed" && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-bad">
          This answer was interrupted.
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}
      <SourceChips sources={m.sources} />
      {m.status === "done" && m.content && !m.id.startsWith("pending") && (
        <div className="mt-3 flex flex-wrap items-center gap-1 border-t border-line-soft pt-2">
          <Button
            variant="ghost"
            size="sm"
            icon={copied ? <Check className="size-4 text-ok" /> : <Copy className="size-4" />}
            onClick={async () => {
              await navigator.clipboard.writeText(m.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<FileDown className="size-4" />}
            onClick={() => download(`/messages/${m.id}/docx`, "deskwork.docx").catch((e) => toast.error(e.message))}
          >
            Word
          </Button>
          <Button variant="ghost" size="sm" icon={<Printer className="size-4" />} onClick={print}>
            Print or PDF
          </Button>
        </div>
      )}
    </motion.div>
  );
}
