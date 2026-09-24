"use client";

import { ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { IconButton } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function PageStrip({ urls, onOpen, highlight }: { urls: string[]; onOpen: (i: number) => void; highlight?: number[] }) {
  return (
    <div className="scroll-thin flex gap-2 overflow-x-auto pb-1">
      {urls.map((u, i) => (
        <button
          key={u}
          onClick={() => onOpen(i)}
          className={cn(
            "group relative h-24 w-[68px] shrink-0 overflow-hidden rounded-xl border bg-canvas transition-all hover:-translate-y-0.5 hover:shadow-card",
            highlight?.includes(i + 1) ? "border-brand ring-2 ring-brand-soft" : "border-line-soft",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={u} alt={`Page ${i + 1}`} className="size-full object-cover object-top" loading="lazy" />
          <span className="absolute right-1 bottom-1 rounded-md bg-black/55 px-1.5 text-[10px] font-medium text-white">{i + 1}</span>
        </button>
      ))}
    </div>
  );
}

export function PageViewer({
  urls,
  open,
  onOpenChange,
  start = 0,
  title,
}: {
  urls: string[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  start?: number;
  title: string;
}) {
  const [zoom, setZoom] = useState(1);
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => refs.current[start]?.scrollIntoView({ block: "start" }), 250);
    return () => clearTimeout(t);
  }, [open, start]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} className="max-w-4xl">
      <div className="mb-3 flex items-center justify-end gap-1">
        <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.6, z - 0.2))}>
          <ZoomOut className="size-4" />
        </IconButton>
        <span className="w-12 text-center text-xs text-muted tabular">{Math.round(zoom * 100)}%</span>
        <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2.4, z + 0.2))}>
          <ZoomIn className="size-4" />
        </IconButton>
      </div>
      <div className="scroll-thin max-h-[72vh] overflow-auto rounded-2xl bg-canvas p-3">
        <div className="mx-auto flex flex-col gap-3" style={{ width: `${zoom * 100}%` }}>
          {urls.map((u, i) => (
            <div key={u} ref={(el) => void (refs.current[i] = el)}>
              <div className="mb-1 text-xs text-muted">Page {i + 1}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Page ${i + 1}`} className="w-full rounded-xl border border-line-soft bg-surface shadow-card" />
            </div>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
