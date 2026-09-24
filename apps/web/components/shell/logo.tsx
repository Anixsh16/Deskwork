import Link from "next/link";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#1a73e8" />
      <rect x="9" y="6.5" width="15" height="19" rx="3" fill="#d3e3fd" transform="rotate(8 16.5 16)" />
      <rect x="8" y="7" width="15" height="19" rx="3" fill="#fff" />
      <path d="M11 11.5h7M11 14.5h9" stroke="#aecbfa" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m11.5 19.5 2.6 2.6 5.4-6" stroke="#1a73e8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/dashboard" className="flex items-center gap-2.5">
      <LogoMark />
      {!compact && <span className="text-[21px] font-normal tracking-[-0.01em] text-ink-2">Deskwork</span>}
    </Link>
  );
}
