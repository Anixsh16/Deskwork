"use client";

import { ShieldAlert } from "lucide-react";

import { LogoMark } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function NotEnabled() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-6">
      <div className="max-w-md text-center">
        <LogoMark className="mx-auto size-12" />
        <div className="mx-auto mt-8 flex size-14 items-center justify-center rounded-2xl bg-warn-soft text-warn">
          <ShieldAlert className="size-7" />
        </div>
        <h1 className="mt-5 text-2xl font-normal text-ink">Your account is not enabled yet</h1>
        <p className="mt-2 text-[15px] text-muted">
          Deskwork is currently open to invited teachers only. Ask the administrator to add your Google account, then sign in again.
        </p>
        <Button
          className="mt-8"
          variant="outline"
          onClick={async () => {
            await supabaseBrowser().auth.signOut();
            window.location.href = "/login";
          }}
        >
          Use a different account
        </Button>
      </div>
    </div>
  );
}
