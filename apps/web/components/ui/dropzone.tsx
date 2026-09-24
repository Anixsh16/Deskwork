"use client";

import { UploadCloud } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

export function Dropzone({
  onFiles,
  accept,
  multiple = false,
  title,
  hint,
  disabled,
  compact,
  className,
  inputId,
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  title: string;
  hint: string;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  inputId?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <motion.button
      type="button"
      disabled={disabled}
      onClick={() => input.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        take(e.dataTransfer.files);
      }}
      animate={{ scale: over ? 1.01 : 1 }}
      className={cn(
        "group flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed text-center transition-colors",
        compact ? "gap-1.5 px-4 py-5" : "gap-2 px-6 py-9",
        over ? "border-brand bg-brand-soft" : "border-line bg-canvas hover:border-brand/50 hover:bg-brand-soft/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "flex items-center justify-center rounded-2xl bg-surface text-brand shadow-card transition-transform group-hover:-translate-y-0.5",
          compact ? "size-10" : "size-12",
        )}
      >
        <UploadCloud className={compact ? "size-5" : "size-6"} />
      </span>
      <span className="mt-1 text-sm font-medium text-ink">{title}</span>
      <span className="text-xs text-muted">{hint}</span>
      <input
        ref={input}
        id={inputId}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          take(e.target.files);
          e.target.value = "";
        }}
      />
    </motion.button>
  );
}
