"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { readLatestAnalysisId, writeActiveBookSession } from "@/lib/vmb/active-analysis";

/**
 * Restores vmb_trial_id cookie from localStorage analysis hint when the browser lost the session cookie.
 */
export function VmbSessionRestore() {
  const router = useRouter();
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    async function restore() {
      const analysisId = readLatestAnalysisId();
      if (!analysisId) return;

      try {
        const params = new URLSearchParams({
          analysis: analysisId,
          restore: "1",
        });
        const res = await fetch(`/api/vmb/active-book?${params.toString()}`, {
          cache: "no-store",
          credentials: "include",
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok: boolean;
          data?: {
            hasActiveBook?: boolean;
            analysisId?: string;
            cookies?: { trialId?: string };
          };
        };
        if (!json.ok || !json.data?.hasActiveBook) return;

        writeActiveBookSession({
          analysisId: json.data.analysisId ?? analysisId,
          trialId: json.data.cookies?.trialId,
        });
        router.refresh();
      } catch {
        // ignore network errors
      }
    }

    void restore();
  }, [router]);

  return null;
}
