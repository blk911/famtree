"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AiosDraftCard } from "@/components/taikos/drafts/AiosDraftCard";
import { AiosDraftDetail } from "@/components/taikos/drafts/AiosDraftDetail";
import { SortableListHeader } from "@/components/vmb/SortableListHeader";
import { VmbPageEmpty, VmbPageFrame } from "@/components/vmb/VmbPageFrame";
import { countCampaignDebug, countDraftFetch } from "@/lib/taikos/debug/draft-fetch-count";
import { draftTypesForWorkspace } from "@/lib/taikos/drafts/draft-router";
import { fetchTaikosJson } from "@/lib/taikos/fetch-taikos-json";
import type { TaikosDraft } from "@/lib/taikos/drafts/types";
import { useSortableList } from "@/lib/vmb/useSortableList";

type Workspace = "invites" | "campaigns" | "service-cards";

type Props = {
  workspace: Workspace;
  title: string;
  subtitle: string;
  eyebrow?: string;
};

const DRAFTS_UNAVAILABLE = "Drafts unavailable. Please refresh or sign back in.";

type DraftSortKey = "title" | "type" | "updatedAt" | "value";

export function VmbTaikosDraftWorkspace({ workspace, title, subtitle, eyebrow }: Props) {
  if (workspace === "campaigns") {
    countCampaignDebug("render");
  }

  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const selectedDraftId = searchParams.get("draft")?.trim();
  const types = useMemo(() => draftTypesForWorkspace(workspace), [workspace]);
  const hasLoadedRef = useRef(false);

  const [drafts, setDrafts] = useState<TaikosDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const draftAccessors = useMemo(
    () => ({
      title: (d: TaikosDraft) => d.title,
      type: (d: TaikosDraft) => d.draftType,
      updatedAt: (d: TaikosDraft) => d.updatedAt,
      value: (d: TaikosDraft) => d.estimatedValue,
    }),
    [],
  );

  const { sortedItems: sortedDrafts, sortKey, sortDirection, setSort } = useSortableList(drafts, {
    defaultKey: "updatedAt",
    defaultDirection: "desc",
    accessors: draftAccessors,
  });

  const loadDrafts = useCallback(async () => {
    if (workspace === "campaigns") {
      countCampaignDebug("load");
    }
    setLoading(true);
    setFetchError(null);
    try {
      const results = await Promise.allSettled(
        types.map(async (type) => {
          if (workspace === "campaigns") {
            countCampaignDebug("fetch");
          }
          countDraftFetch();
          const outcome = await fetchTaikosJson<TaikosDraft[]>(
            `/api/taikos/drafts?type=${type}&limit=30`,
          );
          if (outcome.authBlocked) {
            return { blocked: true as const, drafts: [] as TaikosDraft[] };
          }
          return { blocked: false as const, drafts: outcome.ok && outcome.data ? outcome.data : [] };
        }),
      );

      let authBlocked = false;
      const merged = results.flatMap((result) => {
        if (result.status !== "fulfilled") return [];
        if (result.value.blocked) {
          authBlocked = true;
          return [];
        }
        return result.value.drafts;
      });

      if (authBlocked && merged.length === 0) {
        setFetchError(DRAFTS_UNAVAILABLE);
        setDrafts([]);
        return;
      }

      const open = merged
        .filter((d) => d.status !== "archived" && d.status !== "cancelled")
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setDrafts(open);
    } catch {
      setDrafts([]);
      setFetchError(DRAFTS_UNAVAILABLE);
    } finally {
      setLoading(false);
      hasLoadedRef.current = true;
    }
  }, [types, workspace]);

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
      ) : loading && !hasLoadedRef.current ? (
        <p className="vmb-page-state">Loading saved drafts…</p>
      ) : fetchError && drafts.length === 0 ? (
        <VmbPageEmpty message={fetchError} />
      ) : drafts.length === 0 ? (
        <VmbPageEmpty
          message="No saved drafts yet. Use tAIkOS to preview a move, then confirm to save a draft here."
        />
      ) : (
        <div className="vmb-taikos-draft-workspace__list">
          <SortableListHeader<DraftSortKey>
            columns={[
              { key: "title", label: "Title" },
              { key: "type", label: "Type" },
              { key: "updatedAt", label: "Updated" },
              { key: "value", label: "Value", align: "right" },
            ]}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSort={setSort}
            gridTemplateColumns="1.4fr 0.9fr 0.9fr 0.7fr"
          />
          <div className="vmb-taikos-draft-workspace__grid">
            {sortedDrafts.map((draft) => (
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
        </div>
      )}
    </VmbPageFrame>
  );
}
