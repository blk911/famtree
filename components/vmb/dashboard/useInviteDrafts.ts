"use client";

import { useCallback, useEffect, useState } from "react";
import { buildInviteDraftRecords } from "@/lib/vmb/invite-drafts/build-invite-drafts";
import { friendlyInviteDraftError } from "@/lib/vmb/invite-drafts/invite-draft-storage-errors";
import type { VmbBookAnalysisResult } from "@/types/vmb/book-analysis";
import type { InviteDraftStatus, VmbInviteDraft } from "@/types/vmb/invite-draft";

type Options = {
  analysis: VmbBookAnalysisResult;
  isDemo?: boolean;
};

export function useInviteDrafts({ analysis, isDemo = false }: Options) {
  const [drafts, setDrafts] = useState<VmbInviteDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo) {
        setDrafts(buildInviteDraftRecords(analysis, "demo-trial"));
        return;
      }

      const params = new URLSearchParams({ analysisId: analysis.analysisId });
      const res = await fetch(`/api/vmb/invite-drafts?${params}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = (await res.json()) as { ok: boolean; data?: VmbInviteDraft[]; error?: string };

      if (!res.ok || !json.ok) {
        setError(friendlyInviteDraftError(json.error));
        setDrafts([]);
        return;
      }

      if (json.data && json.data.length > 0) {
        setDrafts(json.data);
        return;
      }

      const buildRes = await fetch("/api/vmb/invite-drafts/build", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisId: analysis.analysisId }),
      });
      const buildJson = (await buildRes.json()) as {
        ok: boolean;
        data?: VmbInviteDraft[];
        error?: string;
      };

      if (!buildRes.ok || !buildJson.ok || !buildJson.data) {
        setError(friendlyInviteDraftError(buildJson.error));
        setDrafts([]);
        return;
      }

      setDrafts(buildJson.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invite drafts");
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [analysis, isDemo]);

  useEffect(() => {
    loadDrafts();
  }, [loadDrafts]);

  const patchDraft = useCallback(
    async (draftId: string, patch: { status?: InviteDraftStatus; editableMessage?: string }) => {
      if (isDemo) {
        setDrafts((current) =>
          current.map((d) =>
            d.draftId === draftId
              ? {
                  ...d,
                  ...patch,
                  updatedAt: new Date().toISOString(),
                }
              : d,
          ),
        );
        return true;
      }

      setSaving(true);
      try {
        const res = await fetch(`/api/vmb/invite-drafts/${encodeURIComponent(draftId)}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const json = (await res.json()) as { ok: boolean; data?: VmbInviteDraft; error?: string };
        if (!res.ok || !json.ok || !json.data) {
          setError(friendlyInviteDraftError(json.error));
          return false;
        }
        setDrafts((current) =>
          current.map((d) => (d.draftId === draftId ? json.data! : d)),
        );
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to update draft");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [isDemo],
  );

  const approveAllDrafts = useCallback(async () => {
    const pending = drafts.filter((d) => d.status === "draft");
    for (const draft of pending) {
      const ok = await patchDraft(draft.draftId, { status: "approved" });
      if (!ok) return false;
    }
    return true;
  }, [drafts, patchDraft]);

  return {
    drafts,
    loading,
    saving,
    error,
    reload: loadDrafts,
    patchDraft,
    approveAllDrafts,
    readyThisWeek: drafts.filter((d) => d.status === "draft").length,
  };
}
