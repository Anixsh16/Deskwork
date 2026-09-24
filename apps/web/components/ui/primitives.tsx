"use client";

import { AlertCircle, CheckCircle2, Clock3, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { forwardRef } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-3xl border border-line-soft bg-surface shadow-card", className)} {...rest} />;
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow]",
        "placeholder:text-faint hover:border-[#c4c7c5] focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]",
        className,
      )}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...rest }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink outline-none transition-[border-color,box-shadow]",
          "placeholder:text-faint hover:border-[#c4c7c5] focus:border-brand focus:shadow-[0_0_0_3px_var(--color-brand-soft)]",
          className,
        )}
        {...rest}
      />
    );
  },
);

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-4 animate-spin text-brand", className)} />;
}

type Tone = "neutral" | "brand" | "ok" | "warn" | "bad" | "violet";
const tones: Record<Tone, string> = {
  neutral: "bg-hover text-ink-2",
  brand: "bg-brand-soft text-brand-strong",
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  violet: "bg-violet-soft text-violet",
};

export function Badge({
  tone = "neutral",
  className,
  children,
  icon,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function StatusPill({ status, labels }: { status: string; labels?: Partial<Record<string, string>> }) {
  const map: Record<string, { tone: Tone; icon: React.ReactNode; label: string }> = {
    queued: { tone: "neutral", icon: <Clock3 className="size-3" />, label: "Waiting" },
    processing: { tone: "brand", icon: <Loader2 className="size-3 animate-spin" />, label: "Reading" },
    reading: { tone: "brand", icon: <Loader2 className="size-3 animate-spin" />, label: "Reading" },
    checking: { tone: "violet", icon: <Loader2 className="size-3 animate-spin" />, label: "Checking" },
    ready: { tone: "ok", icon: <CheckCircle2 className="size-3" />, label: "Ready" },
    checked: { tone: "ok", icon: <CheckCircle2 className="size-3" />, label: "Checked" },
    failed: { tone: "bad", icon: <AlertCircle className="size-3" />, label: "Failed" },
    none: { tone: "neutral", icon: null, label: "Not added" },
  };
  const s = map[status] ?? map.none;
  return (
    <Badge tone={s.tone} icon={s.icon}>
      {labels?.[status] ?? s.label}
    </Badge>
  );
}

export function Progress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-brand-soft", className)}>
      <motion.div
        className="h-full rounded-full bg-brand"
        initial={false}
        animate={{ width: `${Math.max(4, Math.min(100, value))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
      />
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-xl", className)} />;
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex flex-col items-center px-6 py-12 text-center", className)}
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-soft text-brand">{icon}</div>
      <h3 className="text-base font-medium text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-[13px] text-muted">{eyebrow}</div>}
        <h1 className="text-[28px] leading-tight font-normal tracking-[-0.01em] text-ink text-balance">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
