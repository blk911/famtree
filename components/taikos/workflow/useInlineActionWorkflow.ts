"use client";

import { useCallback, useState } from "react";
import { actionTypeCreatesDraft } from "@/lib/taikos/drafts/draft-router";
import type { TaikosActionPreviewResult } from "@/lib/taikos/actions/types";
import type { TaikosActionType } from "@/lib/taikos/types";

export type InlineWorkflowStage = "detected" | "drafted" | "approved" | "queued";

type Options = {
  actionType: TaikosActionType;
  sourceId: string;
  pathname?: string;
  analysisId?: string;
  onRefresh?: () => void;
};

export function useInlineActionWorkflow({
  actionType,
  sourceId,
  pathname = "/vmb/today",
  analysisId,
  onRefresh,
}: Options) {
  const [stage, setStage] = useState<InlineWorkflowStage>("detected");
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<TaikosActionPreviewResult | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStage("detected");
    setExpanded(false);
    setPreview(null);
    setDraftId(null);
    setStatusMessage(null);
    setError(null);
    setBusy(false);
  }, []);

  const runPreview = useCallback(async () => {
    setBusy(true);
    setError(null);
    setExpanded(true);
    try {
      const res = await fetch("/api/taikos/actions/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType,
          pathname,
          analysisId,
          sourceRecommendationId: sourceId,
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: TaikosActionPreviewResult; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Preview failed");
        return;
      }
      setPreview(json.data);
      setStage("drafted");
    } catch {
      setError("Preview failed");
    } finally {
      setBusy(false);
    }
  }, [actionType, pathname, analysisId, sourceId]);

  const runApprove = useCallback(async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/taikos/actions/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actionType: preview.action.type,
          previewId: preview.previewId,
          pathname,
          analysisId,
          sourceRecommendationId: sourceId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { message: string; draftId?: string };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? "Approve failed");
        return;
      }
      setStatusMessage(json.data.message);
      if (json.data.draftId) setDraftId(json.data.draftId);
      setStage("approved");
      onRefresh?.();
    } catch {
      setError("Approve failed");
    } finally {
      setBusy(false);
    }
  }, [preview, pathname, analysisId, sourceId, onRefresh]);

  const runQueue = useCallback(async () => {
    if (!draftId) {
      setStatusMessage("Recorded. No draft to queue for this action.");
      setStage("queued");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/taikos/queue", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const json = (await res.json()) as { ok: boolean; data?: { message: string }; error?: string };
      if (!res.ok || !json.ok) {
        setError(json.error ?? "Queue failed");
        return;
      }
      setStatusMessage(json.data?.message ?? "Added to queue. No message sent yet.");
      setStage("queued");
      onRefresh?.();
    } catch {
      setError("Queue failed");
    } finally {
      setBusy(false);
    }
  }, [draftId, onRefresh]);

  const skipQueue = useCallback(() => {
    setStatusMessage((prev) => prev ?? "Draft saved. Skipped queue for now.");
    setStage("queued");
  }, []);

  const canQueue = !!draftId && actionTypeCreatesDraft(actionType);

  return {
    stage,
    expanded,
    busy,
    preview,
    draftId,
    statusMessage,
    error,
    canQueue,
    runPreview,
    runApprove,
    runQueue,
    skipQueue,
    reset,
    collapse: () => setExpanded(false),
  };
}
