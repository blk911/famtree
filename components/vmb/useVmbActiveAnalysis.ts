"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readActiveAnalysisId, readLatestAnalysisId } from "@/lib/vmb/active-analysis";
import { resolveActiveVmbAnalysisClient } from "@/lib/vmb/resolve-active-analysis-client";
import type { ActiveVmbAnalysisSource } from "@/lib/vmb/active-analysis-resolver";

function readAnalysisFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get("analysis")?.trim() || undefined;
}

function pickAnalysisId(
  initialAnalysisId?: string,
  resolvedId?: string,
): string | undefined {
  return (
    readAnalysisFromUrl() ||
    initialAnalysisId?.trim() ||
    resolvedId ||
    readLatestAnalysisId() ||
    readActiveAnalysisId()
  );
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
    analysisId: pickAnalysisId(initialAnalysisId),
    source: initialAnalysisId?.trim() ? "query" : "none",
    resolving: true,
  }));

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      setState((prev) => ({ ...prev, resolving: true }));
      const queryId = readAnalysisFromUrl() || initialAnalysisId?.trim();
      const sessionId = readActiveAnalysisId() || readLatestAnalysisId();
      const resolved = await resolveActiveVmbAnalysisClient({
        queryId,
        sessionId,
        fallbackAnalysisId: initialAnalysisId?.trim(),
      });

      if (cancelled) return;
      setState({
        analysisId: pickAnalysisId(initialAnalysisId, resolved.analysisId),
        source: resolved.source === "none" && initialAnalysisId?.trim() ? "query" : resolved.source,
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
