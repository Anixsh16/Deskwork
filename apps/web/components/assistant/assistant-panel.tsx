"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
}

interface SourceInfo {
  title: string;
  unit: string;
  page_no: number;
  excerpt: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citation?: string;
  sources?: SourceInfo[];
  error?: boolean;
}

export function AssistantPanel({ isOpen, onClose }: AssistantPanelProps) {
  const pathname = usePathname() || "/dashboard";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Extract page context dynamically from route
  const isExamPage = pathname.includes("/exams/");
  const isCoursePage = pathname.includes("/courses/") && !isExamPage;
  const isDashboard = pathname === "/dashboard" || pathname === "/";

  // Derive courseId and examId from URL path
  let currentCourseId: string | undefined = undefined;
  let currentExamId: string | undefined = undefined;
  let currentPage = "dashboard";

  const segments = pathname.split("/").filter(Boolean);
  const courseIdx = segments.indexOf("courses");
  if (courseIdx !== -1 && segments[courseIdx + 1]) {
    currentCourseId = segments[courseIdx + 1];
  }
  const examIdx = segments.indexOf("exams");
  if (examIdx !== -1 && segments[examIdx + 1]) {
    currentExamId = segments[examIdx + 1];
  }

  if (pathname.includes("/rubric")) {
    currentPage = "rubric";
  } else if (pathname.includes("/review")) {
    currentPage = "review";
  } else if (pathname.includes("/scripts")) {
    currentPage = "scripts";
  } else if (pathname.includes("/results")) {
    currentPage = "results";
  } else if (isExamPage) {
    currentPage = "exam";
  } else if (isCoursePage) {
    currentPage = "course";
  }

  // Subtitle based on route context
  let contextLabel = "Academic Workspace";
  if (currentExamId) {
    contextLabel = currentExamId.includes("cs402")
      ? "Exam T2 (CS402)"
      : "Exam T1 (CS301)";
  } else if (currentCourseId) {
    contextLabel = currentCourseId.includes("cs402")
      ? "CS402: Operating Systems"
      : "CS301: Data Structures";
  }

  // Dynamic suggestion chips based on active page
  const suggestionChips = isExamPage
    ? [
        "What is the status of this exam?",
        "Is the rubric approved?",
        "How many questions are in this exam?",
        "What do I need to do next?",
      ]
    : isCoursePage
    ? [
        "Explain B-Trees using my Unit 3 slides",
        "What exams are in this course?",
        "What topics are covered in Unit 2?",
        "How many students are enrolled?",
      ]
    : [
        "What courses do I have?",
        "What exams are in progress?",
        "Explain B-Trees using my Unit 3 slides",
        "What can you help me with?",
      ];

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello Professor. I am your Deskwork assistant, grounded in your courses and uploaded slides. Ask about exam progress, questions, rubrics, or slide topics.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, loading]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setLastFailedMessage(null);

    // Prepare conversation history to send (last 8 turns)
    const historyPayload = messages.slice(-8).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: text,
          context: {
            route: pathname,
            page: currentPage,
            courseId: currentCourseId,
            examId: currentExamId,
          },
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      const replyMsg: Message = {
        role: "assistant",
        content: data.reply || "No response received.",
        citation: data.citation,
        sources: data.sources,
      };

      setMessages((prev) => [...prev, replyMsg]);
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Network error";
      setLastFailedMessage(text);

      const errorMsg: Message = {
        role: "assistant",
        content: `Error: Unable to complete request (${errText}). Please check your connection or retry.`,
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-[420px] bg-[#FFFFFF] dark:bg-[#171B24] border-l border-[#DCE0E8] dark:border-[#2C3342] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="h-14 px-5 border-b border-[#E9ECF2] dark:border-[#222835] flex items-center justify-between bg-[#F7F8FA] dark:bg-[#11141B]">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#1A2030] dark:text-[#E4E8F1]">Deskwork Assistant</h3>
            <p className="text-[10px] text-[#5A6377] dark:text-[#9AA3B6] truncate max-w-[220px]">
              {contextLabel}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#5A6377] hover:text-[#1A2030] dark:hover:text-[#E4E8F1] transition-colors"
          title="Close Assistant"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.error
                    ? "bg-[#FBEAE8] text-[#B8352A]"
                    : "bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]"
                }`}
              >
                {msg.error ? <AlertCircle className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#2A4A9A] text-white"
                  : msg.error
                  ? "bg-[#FBEAE8] dark:bg-[#341816] text-[#B8352A] dark:text-[#F29C95] border border-[#F5C2BE] dark:border-[#522320]"
                  : "bg-[#F7F8FA] dark:bg-[#222835] text-[#1A2030] dark:text-[#E4E8F1] border border-[#E9ECF2] dark:border-[#2C3342]"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>

              {/* Source Citation Badge */}
              {msg.citation && (
                <div className="mt-2.5 pt-2 border-t border-[#DCE0E8] dark:border-[#2C3342] flex items-center gap-1.5 text-[10px] font-semibold text-[#2A4A9A] dark:text-[#93AEF2]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Sources: {msg.citation}</span>
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-6 h-6 rounded-full bg-[#2A4A9A] text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-2.5 items-center text-xs text-[#5A6377] dark:text-[#9AA3B6] italic">
            <div className="w-6 h-6 rounded-full bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] flex items-center justify-center animate-spin">
              <RefreshCw className="w-3 h-3" />
            </div>
            <span>Consulting workspace records and slides...</span>
          </div>
        )}

        {/* Retry Button on Error */}
        {lastFailedMessage && !loading && (
          <div className="flex justify-start pl-8">
            <button
              type="button"
              onClick={() => handleSend(lastFailedMessage)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#B8352A] text-xs font-semibold text-[#B8352A] hover:bg-[#FBEAE8] dark:hover:bg-[#341816] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Retry last question</span>
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 border-t border-[#E9ECF2] dark:border-[#222835] bg-[#F7F8FA]/50 dark:bg-[#11141B]/50">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6] mb-1.5">
          Suggested for {isExamPage ? "This Exam" : isCoursePage ? "This Course" : "Workspace"}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {suggestionChips.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(chip)}
              disabled={loading}
              className="text-[11px] text-left px-2.5 py-1 rounded-md bg-[#FFFFFF] dark:bg-[#171B24] border border-[#DCE0E8] dark:border-[#2C3342] text-[#5A6377] dark:text-[#9AA3B6] hover:border-[#2A4A9A] hover:text-[#1A2030] dark:hover:text-[#E4E8F1] disabled:opacity-50 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about syllabus, criteria, or marks..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-[#2A4A9A] text-white hover:bg-[#2A4A9A]/90 disabled:opacity-50 transition-colors"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#5A6377] dark:text-[#9AA3B6]">
          <span>Grounded in workspace & slides</span>
          <span className="font-mono">Gemini 3.5 Flash-Lite</span>
        </div>
      </div>
    </div>
  );
}
