"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardCheck,
  Home,
  LineChart,
  LogOut,
  Menu as MenuIcon,
  NotebookPen,
  Plus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreateCourseDialog } from "@/components/create-course-dialog";
import { CreateExamDialog } from "@/components/create-exam-dialog";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { ComingSoon } from "@/components/ui/coming-soon";
import { Menu, MenuItem } from "@/components/ui/menu";
import { api } from "@/lib/api";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { CourseSummary, Teacher } from "@/lib/types";
import { cn, initials } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/courses", label: "Courses", icon: BookOpen },
  { href: "/exams", label: "Exams", icon: ClipboardCheck },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [createCourse, setCreateCourse] = useState(false);
  const [createExam, setCreateExam] = useState(false);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const me = useQuery({ queryKey: ["me"], queryFn: () => api<Teacher>("/me") });
  const courses = useQuery({ queryKey: ["courses"], queryFn: () => api<CourseSummary[]>("/courses") });

  const signOut = async () => {
    await supabaseBrowser().auth.signOut();
    router.replace("/login");
  };

  const name = me.data?.full_name || me.data?.email?.split("@")[0] || "";
  const avatarText = name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar = (
    <div className="flex h-full flex-col gap-1 px-3 pt-4 pb-4">
      <div className="flex items-center justify-between px-3 pb-4">
        <Logo />
        <button className="rounded-full p-2 text-muted hover:bg-hover lg:hidden" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
          <X className="size-5" />
        </button>
      </div>

      <Menu
        align="start"
        trigger={
          <button className="mb-3 ml-1 inline-flex h-14 w-fit items-center gap-3 rounded-2xl bg-surface pr-6 pl-4 text-[15px] font-medium text-ink shadow-lift transition-shadow hover:shadow-pop">
            <Plus className="size-6 text-brand" strokeWidth={2.2} />
            New
          </button>
        }
      >
        <MenuItem icon={<BookOpen />} onSelect={() => setCreateCourse(true)}>
          New course
        </MenuItem>
        <MenuItem icon={<ClipboardCheck />} onSelect={() => setCreateExam(true)}>
          New exam
        </MenuItem>
      </Menu>

      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "relative flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-colors",
              active ? "text-brand-strong" : "text-ink-2 hover:bg-hover",
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-full bg-brand-tint"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <Icon className="relative size-[18px]" />
            <span className="relative">{label}</span>
          </Link>
        );
      })}

      {!!courses.data?.length && (
        <div className="mt-5">
          <div className="px-4 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Your courses</div>
          {courses.data.map((c) => {
            const active = pathname.startsWith(`/courses/${c.id}`);
            return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-full px-4 py-2 text-sm transition-colors",
                  active ? "bg-hover font-medium text-ink" : "text-ink-2 hover:bg-hover",
                )}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-[10px] font-semibold text-brand">
                  {initials(c.name)}
                </span>
                <span className="truncate">{c.name}</span>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-5">
        <div className="px-4 pb-1.5 text-[11px] font-medium tracking-[0.08em] text-muted uppercase">Next up</div>
        <ComingSoon
          variant="nav"
          label="Lesson planner"
          description="Turn a topic into a lecture plan from your slides."
          icon={<NotebookPen />}
        />
        <ComingSoon
          variant="nav"
          label="Class analytics"
          description="Weak topics and trends across all your exams."
          icon={<LineChart />}
        />
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 overflow-y-auto scroll-thin lg:block">{sidebar}</aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[280px] overflow-y-auto bg-canvas shadow-pop lg:hidden"
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", stiffness: 400, damping: 40 }}
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
          <button className="rounded-full p-2 text-muted hover:bg-hover lg:hidden" aria-label="Open menu" onClick={() => setMobileOpen(true)}>
            <MenuIcon className="size-5" />
          </button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => setCreateExam(true)}>
            Check papers
          </Button>
          <Menu
            trigger={
              <button className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-hover" aria-label="Account">
                {me.data?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={me.data.avatar_url} alt="" className="size-9 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-medium text-white">
                    {avatarText || "·"}
                  </span>
                )}
              </button>
            }
          >
            <div className="px-3 py-2">
              <div className="text-sm font-medium text-ink">{name}</div>
              <div className="text-xs text-muted">{me.data?.email}</div>
            </div>
            <div className="my-1 h-px bg-line-soft" />
            <MenuItem icon={<LogOut />} onSelect={signOut}>
              Sign out
            </MenuItem>
          </Menu>
        </header>

        <main className="flex-1 px-4 pb-16 sm:px-6 lg:pr-8 lg:pl-2">
          <div className="min-h-[calc(100vh-5rem)] rounded-[28px] bg-surface px-5 py-7 shadow-card sm:px-8 sm:py-8">
            {children}
          </div>
        </main>
      </div>

      <CreateCourseDialog open={createCourse} onOpenChange={setCreateCourse} />
      <CreateExamDialog open={createExam} onOpenChange={setCreateExam} />
    </div>
  );
}
