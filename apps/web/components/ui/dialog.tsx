"use client";

import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { cn } from "@/lib/utils";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-[#202124]/40 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </D.Overlay>
            <D.Content asChild aria-describedby={undefined}>
              <div
                className="fixed inset-0 z-50 overflow-y-auto outline-none"
                onPointerDown={(e) => e.target === e.currentTarget && onOpenChange(false)}
              >
              <div
                className="flex min-h-full items-center justify-center p-4 sm:p-6"
                onPointerDown={(e) => e.target === e.currentTarget && onOpenChange(false)}
              >
                <motion.div
                  className={cn(
                    "relative w-full max-w-lg rounded-[28px] bg-surface p-6 shadow-pop outline-none sm:p-7",
                    className,
                  )}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: 6 }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                >
                  <D.Title className="pr-10 text-[22px] font-normal text-ink">{title}</D.Title>
                  {description ? (
                    <D.Description className="mt-1.5 text-sm text-muted">{description}</D.Description>
                  ) : (
                    <D.Description className="sr-only">{title}</D.Description>
                  )}
                  <D.Close
                    className="absolute top-5 right-5 inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-hover hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </D.Close>
                  <div className="mt-5">{children}</div>
                </motion.div>
              </div>
              </div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  );
}
