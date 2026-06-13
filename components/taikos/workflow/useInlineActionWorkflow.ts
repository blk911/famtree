"use client";

import { useCallback, useState } from "react";
import { actionTypeCreatesDraft } from "@/lib/taikos/drafts/draft-router";
import type { TaikosActionPreviewResult } from "@/lib/taikos/actions/types";
import type { TaikosActionType } from "@/lib/taikos/types";
import type { QueuedInviteCardPayload } from "@/lib/vmb/cards/queued-invite-card-payload";

export type WorkflowState =
  | "detected"
  | "previewed"
  | "approved"
  | "queued"
  | "blocked"
  | "skipped";

/** @deprecated Use WorkflowState */
export type InlineWorkflowStage = WorkflowState;

type Options = {
  actionType: TaikosActionType;
  sourceId: string;
  pathname?: string;
  analysisId?: string;
  /** Called only after queue (or queue-without-draft) — never after preview/approve. */
  onRefresh?: () => void;
};

export function useInlineActionWorkflow({
  actionType,
  sourceId,
  pathname = "/vmb/today",
  analysisId,
  onRefresh,
}: Options) {
  const [stage, setStage] = useState<WorkflowState>("detected");
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
      setStage("previewed");
    } catch {
      setError("Preview failed");
    } finally {
      setBusy(false);
    }
  }, [actionType, pathname, analysisId, sourceId]);

  const runApprove = useCallback(async (inviteCard?: QueuedInviteCardPayload) => {
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
          inviteCard,
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
    } catch {
      setError("Approve failed");
    } finally {
      setBusy(false);
    }
  }, [preview, pathname, analysisId, sourceId]);

  const runQueue = useCallback(async () => {
    if (!draftId) {
      setStatusMessage("Recorded. No draft to queue for this action.");
      setStage("queued");
      onRefresh?.();
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
        setStage("blocked");
        return;
      }
      setStatusMessage(json.data?.message ?? "Added to queue. No message sent yet.");
      setStage("queued");
      onRefresh?.();
    } catch {
      setError("Queue failed");
      setStage("blocked");
    } finally {
      setBusy(false);
    }
  }, [draftId, onRefresh]);

  const skipQueue = useCallback(() => {
    setStatusMessage("Draft saved. Skipped queue for now.");
    setStage("skipped");
  }, []);

  const skipReject = useCallback(() => {
    setStatusMessage("Opportunity skipped.");
    setStage("skipped");
    setExpanded(false);
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
    skipReject,
    reset,
    collapse: () => setExpanded(false),
  };
}
