"use client";

import React, { useState } from "react";
import { FEATURES, FeatureId } from "@/lib/features";
import { Sparkles, X } from "lucide-react";

interface FeatureProps {
  id: FeatureId;
  children: React.ReactNode;
  fallbackText?: string;
  className?: string;
}

export function Feature({ id, children, fallbackText, className = "" }: FeatureProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const feature = FEATURES[id];

  if (!feature || feature.status === "live") {
    return <>{children}</>;
  }

  const name = feature.name || id;
  const blurb = feature.blurb || "This capability is planned for the upcoming release.";

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-disabled="true"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDialogOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDialogOpen(true);
          }
        }}
        className={`relative inline-flex items-center opacity-65 cursor-pointer border border-dashed border-[#DCE0E8] dark:border-[#2C3342] rounded-md px-2.5 py-1 text-xs font-medium text-[#5A6377] dark:text-[#9AA3B6] hover:bg-[#E9ECF2]/60 dark:hover:bg-[#222835]/60 transition-colors ${className}`}
        title={`${name}: ${blurb} (Coming soon)`}
      >
        <span className="truncate">{fallbackText || children}</span>
        <span className="ml-1.5 px-1.5 py-0.5 text-[10px] uppercase font-semibold bg-[#E9ECF2] dark:bg-[#222835] text-[#5A6377] dark:text-[#9AA3B6] rounded">
          Soon
        </span>
      </div>

      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-[#DCE0E8] dark:border-[#2C3342] bg-[#FFFFFF] dark:bg-[#171B24] p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-[#E6ECFA] dark:bg-[#1E2A47] text-[#2A4A9A] dark:text-[#93AEF2]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#1A2030] dark:text-[#E4E8F1]">{name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="text-[#5A6377] hover:text-[#1A2030] dark:hover:text-[#E4E8F1]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-[#5A6377] dark:text-[#9AA3B6] leading-relaxed">
              {blurb}
            </p>
            <div className="mt-4 pt-3 border-t border-[#E9ECF2] dark:border-[#222835] flex justify-between items-center">
              <span className="text-[11px] text-[#9A6700] dark:text-[#E8BE5C] font-medium bg-[#FBF1D9] dark:bg-[#342A14] px-2 py-0.5 rounded">
                Scheduled for Final Milestone
              </span>
              <button
                type="button"
                onClick={() => setDialogOpen(false)}
                className="px-3 py-1 text-xs font-medium bg-[#2A4A9A] text-white rounded-md hover:bg-[#2A4A9A]/90"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
