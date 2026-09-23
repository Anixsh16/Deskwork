"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  FileCheck2,
  Sparkles,
  Calendar,
  Database,
  PenTool,
  Library,
  BarChart3,
  LogOut,
  GraduationCap
} from "lucide-react";
import { Feature } from "@/components/coming-soon";

const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];

const FUTURE_NAV = [
  { id: "lessonPlanner", label: "Lesson Planner", icon: Calendar, href: "/soon/lessonPlanner" },
  { id: "questionBank", label: "Question Bank", icon: Database, href: "/soon/questionBank" },
  { id: "feedbackWriter", label: "Feedback Writer", icon: PenTool, href: "/soon/feedbackWriter" },
  { id: "rubricLibrary", label: "Rubric Library", icon: Library, href: "/soon/rubricLibrary" },
  { id: "analytics", label: "Analytics", icon: BarChart3, href: "/soon/analytics" },
] as const;

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-[#E9ECF2] dark:border-[#222835]">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-[#2A4A9A] text-white flex items-center justify-center font-bold text-base shadow-xs">
              D
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="font-bold text-lg tracking-tight text-[#1A2030] dark:text-[#E4E8F1]">
                  Deskwork
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#B8352A]" />
              </div>
              <p className="text-[10px] text-[#5A6377] dark:text-[#9AA3B6] leading-none mt-0.5">
                Academic Workspace
              </p>
            </div>
          </Link>
        </div>

        {/* Navigation Section */}
        <div className="p-4 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
              Workspace
            </div>
            <nav className="space-y-1">
              {MAIN_NAV.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]"
                        : "text-[#5A6377] dark:text-[#9AA3B6] hover:bg-[#F7F8FA] dark:hover:bg-[#222835] hover:text-[#1A2030] dark:hover:text-[#E4E8F1]"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Quick Actions */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6]">
              Actions
            </div>
            <div className="space-y-1">
              <Link
                href="/dashboard#courses"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:bg-[#F7F8FA] dark:hover:bg-[#222835] hover:text-[#1A2030] dark:hover:text-[#E4E8F1]"
              >
                <BookOpen className="w-4 h-4 shrink-0 text-[#2A4A9A]" />
                <span>My Courses</span>
              </Link>
              <Link
                href="/dashboard#recent-exams"
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:bg-[#F7F8FA] dark:hover:bg-[#222835] hover:text-[#1A2030] dark:hover:text-[#E4E8F1]"
              >
                <FileCheck2 className="w-4 h-4 shrink-0 text-[#1F7A4D]" />
                <span>Check Papers</span>
              </Link>
            </div>
          </div>

          {/* Future Modules */}
          <div>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-[#5A6377] dark:text-[#9AA3B6] flex items-center justify-between">
              <span>Extended Tools</span>
              <span className="text-[10px] text-[#9A6700] bg-[#FBF1D9] dark:bg-[#342A14] dark:text-[#E8BE5C] px-1.5 py-0.2 rounded font-normal">
                Roadmap
              </span>
            </div>
            <nav className="space-y-1">
              {FUTURE_NAV.map((tool) => {
                const Icon = tool.icon;
                return (
                  <Link
                    key={tool.id}
                    href={tool.href}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:bg-[#F7F8FA] dark:hover:bg-[#222835] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 opacity-60" />
                      <span>{tool.label}</span>
                    </div>
                    <span className="text-[10px] text-[#5A6377] opacity-60 border border-dashed border-[#DCE0E8] dark:border-[#2C3342] px-1 rounded">
                      Soon
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-[#E9ECF2] dark:border-[#222835]">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#F7F8FA] dark:bg-[#222835]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2] flex items-center justify-center font-bold text-xs shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-semibold text-[#1A2030] dark:text-[#E4E8F1] truncate">
                Prof. Anish
              </div>
              <div className="text-[10px] text-[#5A6377] dark:text-[#9AA3B6] truncate">
                JIIT Noida
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              document.cookie = "deskwork_demo=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
              window.location.href = "/login";
            }}
            title="Sign out"
            className="p-1.5 text-[#5A6377] hover:text-[#B8352A] rounded-md transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
