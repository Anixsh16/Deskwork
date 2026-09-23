"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Search, Sparkles } from "lucide-react";

interface HeaderProps {
  onOpenAssistant?: () => void;
}

function getBreadcrumbInfo(seg: string, path: string) {
  if (seg === "courses") {
    return { label: "Courses", href: "/dashboard#courses" };
  }
  if (seg === "exams") {
    return { label: "Exams", href: "/dashboard" };
  }
  if (seg === "c-cs301-2026") {
    return { label: "CS301", href: path };
  }
  if (seg === "c-cs402-2026") {
    return { label: "CS402", href: path };
  }
  if (seg === "exam-t1-cs301") {
    return { label: "T1 Exam", href: path };
  }
  if (seg === "exam-t2-cs301") {
    return { label: "T2 Exam", href: path };
  }
  if (seg === "exam-t2-cs402") {
    return { label: "T2 Exam", href: path };
  }
  if (seg === "exam-assign1-cs301") {
    return { label: "Assignment 1", href: path };
  }
  if (seg.startsWith("c-")) {
    const code = seg.split("-")[1]?.toUpperCase() || seg;
    return { label: code, href: path };
  }
  if (seg.startsWith("exam-")) {
    return { label: "Exam", href: path };
  }
  return {
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
    href: path,
  };
}

export function AppHeader({ onOpenAssistant }: HeaderProps) {
  const pathname = usePathname();

  // Generate breadcrumb segments from pathname
  const segments = pathname.split("/").filter(Boolean);

  return (
    <header className="h-14 border-b border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] px-6 flex items-center justify-between sticky top-0 z-30 shrink-0">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1.5 text-xs text-[#5A6377] dark:text-[#9AA3B6]" aria-label="Breadcrumb">
        <Link href="/dashboard" className="hover:text-[#1A2030] dark:hover:text-[#E4E8F1] font-medium transition-colors">
          Home
        </Link>
        {segments.map((seg, idx) => {
          if (seg === "dashboard" && segments.length === 1) return null;

          const rawPath = `/${segments.slice(0, idx + 1).join("/")}`;
          const isLast = idx === segments.length - 1;
          const { label, href } = getBreadcrumbInfo(seg, rawPath);

          return (
            <React.Fragment key={rawPath}>
              <ChevronRight className="w-3.5 h-3.5 text-[#5A6377]/50" />
              {isLast ? (
                <span className="font-semibold text-[#1A2030] dark:text-[#E4E8F1] truncate max-w-[180px]">
                  {label}
                </span>
              ) : (
                <Link href={href} className="hover:text-[#1A2030] dark:hover:text-[#E4E8F1] transition-colors truncate max-w-[120px]">
                  {label}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Global Actions: Search (Cmd+K) & Assistant (Cmd+J) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => {}}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#DCE0E8] dark:border-[#2C3342] bg-[#F7F8FA] dark:bg-[#11141B] text-xs text-[#5A6377] dark:text-[#9AA3B6] hover:border-[#2A4A9A] transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick find...</span>
          <kbd className="text-[10px] bg-[#FFFFFF] dark:bg-[#171B24] border border-[#DCE0E8] dark:border-[#2C3342] px-1.5 py-0.5 rounded shadow-2xs font-mono">
            Ctrl+K
          </kbd>
        </button>

        <button
          type="button"
          onClick={onOpenAssistant}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] text-xs font-semibold hover:bg-[#2A4A9A] hover:text-white dark:hover:bg-[#93AEF2] dark:hover:text-[#11141B] transition-colors shadow-2xs"
          title="Open Course Assistant (Ctrl+J)"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Assistant</span>
          <kbd className="hidden sm:inline-block text-[10px] opacity-75 font-mono ml-0.5">
            Ctrl+J
          </kbd>
        </button>
      </div>
    </header>
  );
}
