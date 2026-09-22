"use client";

import React, { useState, useEffect } from "react";
import { AppSidebar } from "@/components/shell/sidebar";
import { AppHeader } from "@/components/shell/header";
import { AssistantPanel } from "@/components/assistant/assistant-panel";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+J or Cmd+J opens assistant
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAssistantOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#F7F8FA] dark:bg-[#11141B] text-[#1A2030] dark:text-[#E4E8F1]">
      {/* Sidebar */}
      <AppSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AppHeader onOpenAssistant={() => setAssistantOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Slide-out Assistant Panel */}
      <AssistantPanel
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
      />
    </div>
  );
}
