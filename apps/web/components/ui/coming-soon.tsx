"use client";

import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** A greyed-out control for a feature planned for the next version. */
export function ComingSoon({
  label,
  description,
  icon,
  className,
  variant = "button",
}: {
  label: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  variant?: "button" | "nav" | "card";
}) {
  const onClick = () => toast(`${label} is coming soon`, { description, icon: <Sparkles className="size-4" /> });
  if (variant === "nav") {
    return (
      <button
        type="button"
        onClick={onClick}
        title={description}
        className={cn(
          "flex w-full items-center gap-3 rounded-full px-4 py-2 text-left text-sm text-faint transition-colors hover:bg-hover",
          className,
        )}
      >
        <span className="opacity-60 [&>svg]:size-[18px]">{icon}</span>
        <span className="flex-1 truncate">{label}</span>
        <span className="rounded-full bg-hover px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted uppercase">Soon</span>
      </button>
    );
  }
  if (variant === "card") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-start gap-3 rounded-3xl border border-dashed border-line bg-surface/60 p-5 text-left transition-colors hover:bg-surface",
          className,
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-2xl bg-hover text-faint [&>svg]:size-5">{icon}</span>
        <span>
          <span className="block text-[15px] font-medium text-muted">{label}</span>
          <span className="mt-0.5 block text-[13px] text-faint">(Coming soon) {description}</span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={description}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-full border border-dashed border-line px-4 text-sm text-faint transition-colors hover:bg-hover",
        className,
      )}
    >
      <span className="[&>svg]:size-4">{icon}</span>
      {label}
      <span className="text-xs">(Coming soon)</span>
    </button>
  );
}
