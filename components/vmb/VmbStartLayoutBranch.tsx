"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { VmbSalonShell } from "@/components/vmb/VmbSalonShell";
import { VmbStartShell } from "@/components/vmb/VmbStartShell";
import { VMB_THEME } from "@/lib/vmb/theme";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

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
  const [useSalonShell, setUseSalonShell] = useState<boolean | null>(refreshMode ? true : null);

  useEffect(() => {
    if (refreshMode) return;

    let cancelled = false;
    async function resolveShell() {
      try {
        const res = await fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" });
        const json = (await res.json()) as { ok: boolean; data?: VmbSalonWorkspace | null };
        if (cancelled) return;
        const workspace = json.ok ? json.data : null;
        setUseSalonShell(!!workspace?.firstIngestCompleted);
      } catch {
        if (!cancelled) setUseSalonShell(false);
      }
    }
    void resolveShell();
    return () => {
      cancelled = true;
    };
  }, [refreshMode]);

  if (useSalonShell === null) {
    return <StartShellFallback>{children}</StartShellFallback>;
  }

  if (useSalonShell) {
    return <VmbSalonShell>{children}</VmbSalonShell>;
  }

  return <VmbStartShell>{children}</VmbStartShell>;
}

/** /vmb/start uses minimal shell for first ingest; returning salons keep salon rail + nav. */
export function VmbStartLayoutBranch({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<StartShellFallback>{children}</StartShellFallback>}>
      <VmbStartLayoutBranchInner>{children}</VmbStartLayoutBranchInner>
    </Suspense>
  );
}
