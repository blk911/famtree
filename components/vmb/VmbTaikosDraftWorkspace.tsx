"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AiosDraftCard } from "@/components/taikos/drafts/AiosDraftCard";
import { AiosDraftDetail } from "@/components/taikos/drafts/AiosDraftDetail";
import { VmbPageEmpty, VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { draftTypesForWorkspace } from "@/lib/taikos/drafts/draft-router";
import type { TaikosDraft } from "@/lib/taikos/drafts/types";

type Workspace = "invites" | "campaigns" | "service-cards";

type Props = {
  workspace: Workspace;
  title: string;
  subtitle: string;
  eyebrow?: string;
};

export function VmbTaikosDraftWorkspace({ workspace, title, subtitle, eyebrow }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedDraftId = searchParams.get("draft")?.trim();
  const types = draftTypesForWorkspace(workspace);

  const [drafts, setDrafts] = useState<TaikosDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        types.map(async (type) => {
          const res = await fetch(`/api/taikos/drafts?type=${type}&limit=30`, {
            cache: "no-store",
            credentials: "include",
          });
          const json = (await res.json()) as { ok: boolean; data?: TaikosDraft[] };
          return res.ok && json.ok && json.data ? json.data : [];
        }),
      );
      const merged = results
        .flat()
        .filter((d) => d.status !== "archived" && d.status !== "cancelled")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setDrafts(merged);
    } catch {
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [types]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  function clearSelection() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("draft");
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <VmbPageFrame title={title} subtitle={subtitle} eyebrow={eyebrow}>
      {selectedDraftId ? (
        <div className="vmb-taikos-draft-workspace">
          <button type="button" className="vmb-taikos-draft-workspace__back" onClick={clearSelection}>
            ← Back to drafts
          </button>
          <AiosDraftDetail
            draftId={selectedDraftId}
            onArchived={() => {
              clearSelection();
              void loadDrafts();
            }}
          />
        </div>
      ) : loading ? (
        <p className="vmb-page-state">Loading saved drafts…</p>
      ) : drafts.length === 0 ? (
        <VmbPageEmpty
          message="No saved drafts yet. Use tAIkOS to preview a move, then confirm to save a draft here."
        />
      ) : (
        <div className="vmb-taikos-draft-workspace__grid">
          {drafts.map((draft) => (
            <AiosDraftCard
              key={draft.draftId}
              draft={{
                draftId: draft.draftId,
                title: draft.title,
                draftType: draft.draftType,
                status: draft.status,
                createdAt: draft.createdAt,
                estimatedValue: draft.estimatedValue,
              }}
            />
          ))}
        </div>
      )}
    </VmbPageFrame>
  );
}
