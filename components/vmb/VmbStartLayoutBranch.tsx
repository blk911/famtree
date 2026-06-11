"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { VmbSalonShell } from "@/components/vmb/VmbSalonShell";
import { VmbStartShell } from "@/components/vmb/VmbStartShell";
import { VMB_THEME } from "@/lib/vmb/theme";

type Props = {
  children: ReactNode;
  /** Set server-side from vmb_trial_id cookie — durable even when /tmp workspace JSON is empty on Vercel. */
  hasTrialSession: boolean;
};

function StartShellFallback({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: VMB_THEME.warmBg, color: VMB_THEME.ink }}>
      <main>{children}</main>
    </div>
  );
}

function VmbStartLayoutBranchForNewSession({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const refreshMode = searchParams.get("mode") === "refresh";

  if (refreshMode) {
    return <VmbSalonShell>{children}</VmbSalonShell>;
  }

  return <VmbStartShell>{children}</VmbStartShell>;
}

/**
 * /vmb/start uses minimal shell for first ingest.
 * Returning salons (trial cookie) and book refresh keep salon rail + nav.
 */
export function VmbStartLayoutBranch({ children, hasTrialSession }: Props) {
  if (hasTrialSession) {
    return (
      <Suspense fallback={<StartShellFallback>{children}</StartShellFallback>}>
        <VmbSalonShell>{children}</VmbSalonShell>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<StartShellFallback>{children}</StartShellFallback>}>
      <VmbStartLayoutBranchForNewSession>{children}</VmbStartLayoutBranchForNewSession>
    </Suspense>
  );
}
