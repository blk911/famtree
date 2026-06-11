"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readActiveAnalysisId, writeActiveAnalysisId } from "@/lib/vmb/active-analysis";
import type { VmbSalonWorkspace } from "@/types/vmb/workspace";

function readAnalysisFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("analysis")?.trim() || undefined;
}

export function useVmbActiveAnalysis(initialAnalysisId?: string): string | undefined {
  const pathname = usePathname();
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | undefined>(
    () => initialAnalysisId?.trim() || readAnalysisFromUrl() || readActiveAnalysisId(),
  );

  useEffect(() => {
    let cancelled = false;

    const paramId = readAnalysisFromUrl();
    if (paramId) {
      writeActiveAnalysisId(paramId);
      setActiveAnalysisId(paramId);
      return;
    }
    if (initialAnalysisId?.trim()) {
      writeActiveAnalysisId(initialAnalysisId.trim());
      setActiveAnalysisId(initialAnalysisId.trim());
      return;
    }

    const sessionId = readActiveAnalysisId();
    if (sessionId) {
      setActiveAnalysisId(sessionId);
      return;
    }

    async function loadWorkspaceAnalysis() {
      try {
        const res = await fetch("/api/vmb/workspace", { cache: "no-store", credentials: "include" });
        const json = (await res.json()) as { ok: boolean; data?: VmbSalonWorkspace | null };
        if (cancelled || !json.ok || !json.data?.latestAnalysisId) return;
        if (!json.data.firstIngestCompleted) return;
        writeActiveAnalysisId(json.data.latestAnalysisId);
        setActiveAnalysisId(json.data.latestAnalysisId);
      } catch {
        // ignore — nav works without analysis param
      }
    }

    void loadWorkspaceAnalysis();
    return () => {
      cancelled = true;
    };
  }, [pathname, initialAnalysisId]);

  return activeAnalysisId;
}
