"use client";

import { BookOpenCheck, FileCheck2, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { LogoMark } from "@/components/shell/logo";
import { supabaseBrowser } from "@/lib/supabase/client";

function GoogleG() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}

const FEATURES = [
  { icon: FileCheck2, title: "Check handwritten papers", body: "Two AI checkers mark every answer against your key. You stay the examiner." },
  { icon: Sparkles, title: "Generate from your slides", body: "Assignments, solutions and question papers grounded in your own lectures." },
  { icon: BookOpenCheck, title: "One place for the course", body: "Slides, exams and results together, ready when you are." },
];

function LoginInner() {
  const params = useSearchParams();
  const [loading, setLoading] = useState(false);
  const failed = params.get("error") === "signin";

  const [error, setError] = useState(false);
  const signIn = async () => {
    setLoading(true);
    setError(false);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback`, queryParams: { prompt: "select_account" } },
    });
    if (error) {
      setLoading(false);
      setError(true);
    }
  };

  return (
    <div className="grid min-h-screen bg-surface lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-canvas lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="pointer-events-none absolute -top-40 -left-32 size-[520px] rounded-full bg-brand-soft blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-40 size-[460px] rounded-full bg-[#e6f4ea] blur-3xl" />
        <div className="relative flex items-center gap-2.5">
          <LogoMark />
          <span className="text-[21px] text-ink-2">Deskwork</span>
        </div>
        <div className="relative max-w-md">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-[40px] leading-[1.1] font-normal tracking-[-0.02em] text-ink"
          >
            Set the paper, check the papers, clear the desk.
          </motion.h2>
          <div className="mt-10 flex flex-col gap-5">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.5 }}
                className="flex gap-4"
              >
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-brand shadow-card">
                  <Icon className="size-5" />
                </span>
                <div>
                  <div className="text-[15px] font-medium text-ink">{title}</div>
                  <div className="text-sm text-muted">{body}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="relative text-xs text-faint">Built for teachers. Students never need an account.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm text-center"
        >
          <div className="mx-auto mb-6 flex justify-center lg:hidden">
            <LogoMark className="size-12" />
          </div>
          <h1 className="text-[32px] font-normal tracking-[-0.01em] text-ink">Sign in</h1>
          <p className="mt-2 text-[15px] text-muted">to continue to Deskwork</p>
          <button
            onClick={signIn}
            disabled={loading}
            className="mt-10 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-line bg-surface text-[15px] font-medium text-ink-2 transition-all hover:border-[#c4c7c5] hover:bg-canvas hover:shadow-card active:scale-[0.98] disabled:opacity-60"
          >
            <GoogleG />
            {loading ? "Opening Google..." : "Continue with Google"}
          </button>
          {(failed || error) && (
            <p className="mt-4 rounded-2xl bg-bad-soft px-4 py-3 text-sm text-bad">Sign-in did not finish. Please try again.</p>
          )}
          <p className="mt-8 text-xs leading-relaxed text-faint">
            Use your institution Google account. Access is limited to teachers who have been enabled.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
