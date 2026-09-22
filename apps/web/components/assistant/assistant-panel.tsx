"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Bot, User, BookOpen, AlertCircle } from "lucide-react";

interface AssistantPanelProps {
  isOpen: boolean;
  onClose: () => void;
  courseTitle?: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  citation?: string;
}

const SUGGESTION_CHIPS = [
  "How did the class perform on Question 2?",
  "Explain B-Trees using my Unit 3 slide definitions",
  "Which questions have the highest disagreement between graders?",
];

export function AssistantPanel({ isOpen, onClose, courseTitle = "General Academic Session" }: AssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello Professor. I am your Deskwork assistant, grounded in your course materials. How can I assist with your paper checking or slide analysis today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = textToSend || input;
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Contextual prototype reply with slide citation
    setTimeout(() => {
      let reply: Message;
      if (text.toLowerCase().includes("question") || text.toLowerCase().includes("perform")) {
        reply = {
          role: "assistant",
          content: "Across current submissions, Question 2 shows an average score of 2.5 / 4.0. Both Gemini 3.5 Flash-Lite and Gemini 3.1 Flash-Lite agreed on 88% of criterion marks, with 3 submissions flagged for teacher review due to alternative derivation steps.",
        };
      } else if (text.toLowerCase().includes("b-tree") || text.toLowerCase().includes("slide") || text.toLowerCase().includes("unit")) {
        reply = {
          role: "assistant",
          content: "According to your course slides, a B-Tree of order m satisfies: every node has at most m children, every non-leaf node (except root) has at least ceil(m/2) children, and all leaves appear at the same depth.",
          citation: "Unit 3 Slides, p. 18",
        };
      } else {
        reply = {
          role: "assistant",
          content: `I analyzed your inquiry against ${courseTitle}. In accordance with your approved rubric and course syllabus, all requirements have been verified.`,
        };
      }
      setMessages((prev) => [...prev, reply]);
      setLoading(false);
    }, 700);
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
              Grounded in {courseTitle}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-md text-[#5A6377] hover:text-[#1A2030] dark:hover:text-[#E4E8F1] transition-colors"
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
              <div className="w-6 h-6 rounded-full bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-[#2A4A9A] text-white"
                  : "bg-[#F7F8FA] dark:bg-[#222835] text-[#1A2030] dark:text-[#E4E8F1] border border-[#E9ECF2] dark:border-[#2C3342]"
              }`}
            >
              <p>{msg.content}</p>
              {msg.citation && (
                <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E6ECFA] text-[#2A4A9A] dark:bg-[#1E2A47] dark:text-[#93AEF2]">
                  <BookOpen className="w-3 h-3" />
                  <span>{msg.citation}</span>
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

        {loading && (
          <div className="flex gap-2.5 items-center text-xs text-[#5A6377] dark:text-[#9AA3B6] italic">
            <Bot className="w-3.5 h-3.5 text-[#2A4A9A]" />
            <span>Consulting course slides...</span>
          </div>
        )}
      </div>

      {/* Suggestion Chips */}
      <div className="px-4 py-2 border-t border-[#E9ECF2] dark:border-[#222835] bg-[#F7F8FA]/50 dark:bg-[#11141B]/50">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6] mb-1.5">
          Suggested Queries
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTION_CHIPS.map((chip, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSend(chip)}
              className="text-[11px] text-left px-2.5 py-1 rounded-md bg-[#FFFFFF] dark:bg-[#171B24] border border-[#DCE0E8] dark:border-[#2C3342] text-[#5A6377] dark:text-[#9AA3B6] hover:border-[#2A4A9A] hover:text-[#1A2030] dark:hover:text-[#E4E8F1] transition-colors"
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
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1] focus:outline-hidden focus:border-[#2A4A9A]"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 rounded-lg bg-[#2A4A9A] text-white hover:bg-[#2A4A9A]/90 disabled:opacity-50 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#5A6377] dark:text-[#9AA3B6]">
          <span>Grounded in uploaded slides</span>
          <span className="font-mono">Gemini 3.5 Flash-Lite</span>
        </div>
      </div>
    </div>
  );
}
