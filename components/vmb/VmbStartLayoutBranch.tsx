"use client";

import { Suspense, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { VmbSalonShell } from "@/components/vmb/VmbSalonShell";
import { VmbStartShell } from "@/components/vmb/VmbStartShell";
import { VMB_THEME } from "@/lib/vmb/theme";

function StartShellFallback({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: VMB_THEME.warmBg, color: VMB_THEME.ink }}>
      <main>{children}</main>
    </div>
  );
}

function VmbStartLayoutBranchInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const refreshMode = searchParams.get("mode") === "refresh";

  if (refreshMode) {
    return <VmbSalonShell>{children}</VmbSalonShell>;
  }

  return <VmbStartShell>{children}</VmbStartShell>;
}

/** /vmb/start uses minimal shell for first ingest; book refresh keeps salon rail + nav. */
export function VmbStartLayoutBranch({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<StartShellFallback>{children}</StartShellFallback>}>
      <VmbStartLayoutBranchInner>{children}</VmbStartLayoutBranchInner>
    </Suspense>
  );
}
