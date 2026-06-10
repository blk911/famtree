"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { readActiveAnalysisId, writeActiveAnalysisId } from "@/lib/vmb/active-analysis";

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
    setActiveAnalysisId(readActiveAnalysisId());
  }, [pathname, initialAnalysisId]);

  return activeAnalysisId;
}
