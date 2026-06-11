"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readActiveAnalysisId } from "@/lib/vmb/active-analysis";
import { resolveActiveVmbAnalysisClient } from "@/lib/vmb/resolve-active-analysis-client";
import type { ActiveVmbAnalysisSource } from "@/lib/vmb/active-analysis-resolver";

function readAnalysisFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("analysis")?.trim() || undefined;
}

export type UseVmbActiveAnalysisState = {
  analysisId?: string;
  source: ActiveVmbAnalysisSource;
  resolving: boolean;
};

export function useVmbActiveAnalysis(initialAnalysisId?: string): string | undefined {
  const state = useVmbActiveAnalysisState(initialAnalysisId);
  return state.analysisId;
}

export function useVmbActiveAnalysisState(initialAnalysisId?: string): UseVmbActiveAnalysisState {
  const pathname = usePathname();
  const [state, setState] = useState<UseVmbActiveAnalysisState>(() => ({
    analysisId:
      initialAnalysisId?.trim() || readAnalysisFromUrl() || readActiveAnalysisId(),
    source: "none",
    resolving: true,
  }));

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setState((prev) => ({ ...prev, resolving: true }));
      const queryId = readAnalysisFromUrl() || initialAnalysisId?.trim();
      const sessionId = readActiveAnalysisId();
      const resolved = await resolveActiveVmbAnalysisClient({ queryId, sessionId });

      if (cancelled) return;
      setState({
        analysisId: resolved.analysisId,
        source: resolved.source,
        resolving: false,
      });
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [pathname, initialAnalysisId]);

  return state;
}
